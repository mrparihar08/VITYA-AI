from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
from sklearn.linear_model import LinearRegression
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})
models = {}

def train_model(df: pd.DataFrame):
    global models
    models.clear()
    required_cols = {"category", "amount", "date"}
    if not required_cols.issubset(df.columns):
        raise ValueError(f"Data must contain columns: {required_cols}")
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date", "amount", "category"])
    df = df.groupby(["category", pd.Grouper(key="date", freq="ME")])["amount"].sum().reset_index()
    for category in df["category"].unique():
        category_df = df[df["category"] == category].copy()
        if len(category_df) < 2:
            continue
        category_df["month_index"] = (category_df["date"].dt.to_period("M") -
                                      category_df["date"].dt.to_period("M").min()).apply(lambda x: x.n)
        X = category_df[["month_index"]]
        y = category_df["amount"]
        model = LinearRegression()
        model.fit(X, y)
        models[category] = {
            "model": model,
            "start_date": category_df["date"].min()
        }

def run_prediction_logic_from_df(df: pd.DataFrame):
    if not models:
        raise ValueError("Models are not trained yet. Call /train/ first.")
    required_cols = {"category", "amount", "date"}
    if not required_cols.issubset(df.columns):
        raise ValueError(f"Data must contain columns: {required_cols}")
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date", "amount", "category"])
    df = df.groupby(["category", pd.Grouper(key="date", freq="ME")])["amount"].sum().reset_index()
    recommendations = []
    for category in df["category"].unique():
        category_df = df[df["category"] == category].copy()
        if category not in models:
            recommendations.append({
                "category": category,
                "message": "No model available for this category"
            })
            continue
        model_data = models[category]
        model = model_data["model"]
        start_date = model_data["start_date"]
        last_month = category_df["date"].max().to_period("M")
        next_month_index = (last_month + 1 - start_date.to_period("M")).n
        predicted_spending = float(model.predict(pd.DataFrame({"month_index": [next_month_index]}))[0])
        latest_amount = float(category_df[category_df["date"] == category_df["date"].max()]["amount"].values[0])
        advice = "Reduce spending" if predicted_spending > latest_amount * 1.2 else "Good spending habit"
        recommendations.append({
            "category": category,
            "last_actual": latest_amount,
            "predicted_next_month": predicted_spending,
            "advice": advice
        })
    return recommendations

@app.route('/train/', methods=['POST'])
def train_from_json():
    try:
        data = request.get_json()
        if not data or "expenses" not in data:
            return jsonify({"error": "Invalid or missing 'expenses' data"}), 400
        df = pd.DataFrame(data["expenses"])
        train_model(df)
        return jsonify({"message": "Models trained successfully", "categories": list(models.keys())})
    except Exception as e:
        print("Train Error:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/predict/', methods=['POST'])
def predict_from_json():
    try:
        data = request.get_json()
        if not data or "expenses" not in data:
            return jsonify({"error": "Invalid or missing 'expenses' data"}), 400
        df = pd.DataFrame(data["expenses"])
        recommendations = run_prediction_logic_from_df(df)
        return jsonify({"recommendations": recommendations})
    except Exception as e:
        print("Prediction Error:", str(e))
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True,host='0.0.0.0', port=8080)
