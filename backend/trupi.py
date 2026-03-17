# -------------------------------
# Flask & utilities
# -------------------------------
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

# Data & ML
import pandas as pd
from sklearn.linear_model import LinearRegression

# System
import os
import pickle
import logging
from datetime import datetime

# -------------------------------
# APP SETUP
# -------------------------------
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "https://vitya-ai-re.onrender.com"}})

models = {}
MODEL_FILE = "models.pkl"
REPORT_DIR = "reports"
os.makedirs(REPORT_DIR, exist_ok=True)

logging.basicConfig(level=logging.INFO)

# -------------------------------
# SAVE / LOAD MODELS
# -------------------------------
def save_models_to_disk():
    with open(MODEL_FILE, "wb") as f:
        pickle.dump(models, f)

def load_models_from_disk():
    global models
    if os.path.exists(MODEL_FILE):
        with open(MODEL_FILE, "rb") as f:
            models = pickle.load(f)

# -------------------------------
# TRAIN MODEL
# -------------------------------
def train_model(df: pd.DataFrame):
    models.clear()

    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date", "amount", "category"])

    df = df.groupby(
        ["category", pd.Grouper(key="date", freq="ME")]
    )["amount"].sum().reset_index()

    skipped = []

    for category in df["category"].unique():
        cat_df = df[df["category"] == category].copy()
        if len(cat_df) < 2:
            skipped.append(category)
            continue

        cat_df["month_index"] = (
            cat_df["date"].dt.to_period("M") -
            cat_df["date"].dt.to_period("M").min()
        ).apply(lambda x: x.n)

        model = LinearRegression()
        model.fit(cat_df[["month_index"]], cat_df["amount"])

        models[category] = {
            "model": model,
            "start_date": cat_df["date"].min()
        }

    save_models_to_disk()
    return skipped

# -------------------------------
# PREDICTION LOGIC
# -------------------------------
def run_prediction_logic(df: pd.DataFrame):
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date", "amount", "category"])

    df_monthly = df.groupby(
        ["category", pd.Grouper(key="date", freq="ME")]
    )["amount"].sum().reset_index()

    recommendations = []

    for category in df_monthly["category"].unique():
        if category not in models:
            continue

        cat_df = df_monthly[df_monthly["category"] == category]
        model_data = models[category]

        last_month = cat_df["date"].max().to_period("M")
        next_index = (last_month + 1 - model_data["start_date"].to_period("M")).n

        predicted = float(
            model_data["model"].predict(
                pd.DataFrame({"month_index": [next_index]})
            )[0]
        )

        latest = float(cat_df["amount"].iloc[-1])

        advice = "Reduce spending" if predicted > latest * 1.2 else "Good spending habit"

        recommendations.append({
            "category": category,
            "last_actual": latest,
            "predicted_next_month": round(predicted, 2),
            "advice": advice
        })

    return recommendations

# -------------------------------
# HUMAN-LIKE PARAGRAPH GENERATOR
# -------------------------------
def generate_paragraph(total_income, total_expense, top_categories):
    savings = total_income - total_expense
    rate = round((savings / total_income) * 100, 1) if total_income else 0

    para = []
    para.append("Dekhiye, agar hum aapki financial situation ko shaanti se samjhein,")

    para.append(f"aapki monthly income lagbhag ₹{int(total_income)} hai, jo ek stable base deti hai.")
    para.append(f"aapke monthly expenses kareeb ₹{int(total_expense)} ke aas-paas ja rahe hain.")

    if rate < 10:
        para.append(f"Is wajah se aap sirf {rate}% hi save kar pa rahe ho, jo thoda risky ho sakta hai.")
    elif rate < 20:
        para.append(f"Aap abhi around {rate}% save kar pa rahe ho, lekin 20% tak pahunchna better hoga.")
    else:
        para.append(f"Achhi baat ye hai ki aap {rate}% savings kar pa rahe ho, jo financially healthy sign hai.")

    if top_categories:
        para.append(
            f"Thoda dhyan dene wali baat ye hai ki {', '.join(top_categories)} category me kharcha zyada dikh raha hai."
        )
        para.append(
            "Agar aap yahan thoda control karte ho, to bina lifestyle compromise kiye savings improve ho sakti hai."
        )

    para.append(
        "Overall, aap sahi direction me ho. Thodi si planning aur awareness se aap apni financial position kaafi strong bana sakte ho."
    )

    return " ".join(para)

# -------------------------------
# EXCEL REPORT GENERATOR
# -------------------------------
def generate_excel_report(df, summary, recommendations):
    filename = f"finance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    path = os.path.join(REPORT_DIR, filename)

    with pd.ExcelWriter(path, engine="xlsxwriter") as writer:
        # Summary
        pd.DataFrame([summary]).to_excel(writer, sheet_name="Summary", index=False)

        # Expenses
        df.to_excel(writer, sheet_name="Expenses", index=False)

        # Advice
        pd.DataFrame(recommendations).to_excel(writer, sheet_name="Advice", index=False)

    return path

# -------------------------------
# TRAIN API
# -------------------------------
@app.route("/train/", methods=["POST"])
def train_api():
    data = request.get_json()
    df = pd.DataFrame(data["expenses"])
    skipped = train_model(df)
    return jsonify({"trained": list(models.keys()), "skipped": skipped})

# -------------------------------
# PREDICT API (🔥 ALL FEATURES)
# -------------------------------
@app.route("/predict/", methods=["POST"])
def predict_api():
    data = request.get_json()
    df = pd.DataFrame(data["expenses"])

    recommendations = run_prediction_logic(df)

    total_expense = df["amount"].sum()
    total_income = data.get("total_income", total_expense * 1.25)

    # Top categories
    cat_summary = df.groupby("category")["amount"].sum().sort_values(ascending=False)
    top_categories = list(cat_summary.head(2).index)

    paragraph = generate_paragraph(total_income, total_expense, top_categories)

    # Chart data
    charts = {
        "expense_breakdown": cat_summary.to_dict(),
        "income_vs_expense": {
            "income": total_income,
            "expense": total_expense
        }
    }

    summary = {
        "income": int(total_income),
        "expense": int(total_expense),
        "savings": int(total_income - total_expense),
        "savings_rate": round((total_income - total_expense) / total_income * 100, 1)
    }

    excel_path = generate_excel_report(df, summary, recommendations)

    return jsonify({
        "summary_paragraph": paragraph,
        "numbers": summary,
        "charts": charts,
        "recommendations": recommendations,
        "excel_report": excel_path
    })

# -------------------------------
# STATUS API
# -------------------------------
@app.route("/status/")
def status():
    return jsonify({"models": list(models.keys())})

# -------------------------------
# START
# -------------------------------
if __name__ == "__main__":
    load_models_from_disk()
    app.run(host="0.0.0.0", debug=True)
