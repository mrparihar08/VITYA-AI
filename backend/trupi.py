from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
from sklearn.linear_model import LinearRegression
import os
import pickle
import logging

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "https://vitya-ai-re.com"}})
models = {}
MODEL_FILE = "models.pkl"

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

def save_models_to_disk(filename=MODEL_FILE):
    with open(filename, 'wb') as f:
        pickle.dump(models, f)

def load_models_from_disk(filename=MODEL_FILE):
    global models
    if os.path.exists(filename):
        with open(filename, 'rb') as f:
            models = pickle.load(f)
        logging.info(f"Models loaded from {filename}")
    else:
        logging.info(f"No model file found at {filename}")

def train_model(df: pd.DataFrame):
    global models
    models.clear()
    required_cols = {"category", "amount", "date"}
    if not required_cols.issubset(df.columns):
        raise ValueError(f"Data must contain columns: {required_cols}")
    
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date", "amount", "category"])
    df = df.groupby(["category", pd.Grouper(key="date", freq="ME")])["amount"].sum().reset_index()
    
    skipped = []
    for category in df["category"].unique():
        category_df = df[df["category"] == category].copy()
        if len(category_df) < 2:
            skipped.append(category)
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
    save_models_to_disk()
    return skipped

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

        if next_month_index < 0:
            recommendations.append({
                "category": category,
                "message": "Invalid prediction date range"
            })
            continue

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
        skipped = train_model(df)
        return jsonify({
            "message": "Models trained and saved successfully",
            "categories_trained": list(models.keys()),
            "categories_skipped": skipped
        })
    except Exception as e:
        logging.exception("Train Error")
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
        logging.exception("Prediction Error")
        return jsonify({"error": str(e)}), 500

@app.route('/status/', methods=['GET'])
def status():
    try:
        return jsonify({
            "trained_categories": list(models.keys()),
            "model_count": len(models)
        })
    except Exception as e:
        logging.exception("Status Error")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    debug_mode = os.environ.get("FLASK_ENV") != "production"
    load_models_from_disk()
    app.run(debug=debug_mode, host="0.0.0.0")

