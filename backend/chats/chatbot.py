from os import link
import re
from fastapi.responses import StreamingResponse
from requests import request
from sqlalchemy import func
from datetime import datetime

from backend.api.models.vitya import Expense, Income
from backend.api.routes.ai import budget_plan,monthly_trend
from backend.api.routes.vitya import (
    get_expense_graph,
    get_expense_income_trend,
    get_expenses_chart, 
)

from chats.categories import CATEGORY_KEYWORDS


# ---------------- NORMALIZATION ---------------- #
NORMALIZATION_MAP = {
    "kharida": "buy",
    "liya": "buy",
    "diya": "paid",
    "aaya": "received",
    "khana": "food",
    "dawai": "medicine"
}


# ---------------- PARSER ---------------- #
def normalize(msg: str):
    msg = msg.lower()
    for k, v in NORMALIZATION_MAP.items():
        msg = msg.replace(k, v)
    return msg


def extract_amount(msg: str):
    match = re.search(r'(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)', msg)
    return float(match.group(1)) if match else None


def detect_txn_type(msg: str):
    income_words = ["salary", "income", "credited", "received", "earn"]
    expense_words = ["spent", "buy", "paid", "expense"]

    income_score = sum(w in msg for w in income_words)
    expense_score = sum(w in msg for w in expense_words)

    if income_score > expense_score:
        return "income"
    if expense_score > income_score:
        return "expense"
    return None


def detect_category(msg: str):
    scores = {}

    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(
            weight for word, weight in keywords.items()
            if re.search(rf"\b{re.escape(word)}\b", msg)
        )

        if score:
            scores[category] = score

    return max(scores, key=scores.get) if scores else "other"


def extract_chart_data(msg):
    pairs = re.findall(r'([a-zA-Z]+)\s*(\d+)', msg)
    return [{"category": k.capitalize(), "amount": float(v)} for k, v in pairs]


# ---------------- CHART DETECTOR ---------------- #
def detect_chart_type(msg, data):
    msg = request.msg.lower()

    # explicit user choice
    if "pie" in msg:
        return "pie"
    if "line" in msg or "trend" in msg:
        return "line_chart"
    if "area" in msg:
        return "area"
    if "compare" in msg or "vs" in msg:
        return "multi_line"

    # auto detection
    if isinstance(data, dict) and "income" in data:
        return "multi_line"

    if isinstance(data, list):
        if data and "month" in data[0]:
            return "line_chart"
        if len(data) <= 5:
            return "pie"
        return "bar"

    return "bar"


# ---------------- MAIN CHATBOT ---------------- #
def chatbot_reply(message: str, db, current_user):
    msg = normalize(message)

    amount = extract_amount(msg)
    txn_type = detect_txn_type(msg)
    category = detect_category(msg)

    # ================= TRANSACTIONS ================= #

    if amount and txn_type == "expense":
        entry = Expense(
            amount=amount,
            category=category,
            date=datetime.utcnow(),
            user_id=current_user.id
        )
        db.add(entry)
        db.commit()

        return {
            "type": "text",
            "content": f"Expense ₹{amount} added in {category}"
        }

    if amount and txn_type == "income":
        entry = Income(
            amount=amount,
            source=category,
            date=datetime.utcnow(),
            user_id=current_user.id
        )
        db.add(entry)
        db.commit()

        return {
            "type": "text",
            "content": f"Income ₹{amount} added as {category}"
        }

    # ================= CUSTOM CHART ================= #

    custom_data = extract_chart_data(msg)
    if custom_data:
        chart_type = detect_chart_type(msg, custom_data)

        return {
            "type": chart_type,
            "content": custom_data
        }

    # ================= TOTAL ================= #

    if "total expense" in msg:
        total = db.query(func.sum(Expense.amount))\
            .filter(Expense.user_id == current_user.id).scalar() or 0

        return {"type": "text", "content": f"Total expense: ₹{total}"}

    if "total income" in msg:
        total = db.query(func.sum(Income.amount))\
            .filter(Income.user_id == current_user.id).scalar() or 0

        return {"type": "text", "content": f"Total income: ₹{total}"}

    # ================= CHART APIs ================= #

    if "chart" in msg:
        data = get_expenses_chart(current_user=current_user, db=db)
        if not data:
            return {"type": "text", "content": "No data 📊"}

        return {
            "type": detect_chart_type(msg, data),
            "content": data
        }

    if "pie graph" in msg:
        data = get_expense_graph(current_user=current_user, db=db)

        return {
            "type": "pie",
            "content": data or []
        }

    if "trends" in msg:
        data = get_expense_income_trend(current_user=current_user, db=db)

        return {
            "type": "multi_line",
            "content": data
        }

    # ================= BUDGET ================= #

    if "budget" in msg:
        data = budget_plan(current_user=current_user, db=db)

        return {
            "type": "text",
            "content": f"""
Income: {data['summary']['total_income']}
Expense: {data['summary']['total_expenses']}
Savings: {data['summary']['suggested_savings']}
"""
        }

    # ================= DEFAULT ================= #
    if "monthly trend" in msg or "monthly report" in msg:
        data = monthly_trend(current_user=current_user, db=db)

        if not data:
            return {
                "type": "text",
               "content": "No data available 📊"
             }

    # ✅ sort by month
        data.sort(key=lambda x: x["month"])

        response = "📊 Monthly Expense Report\n"
        response += "--------------------------\n"

        total = 0
        highest = ("", 0)
        lowest = ("", float("inf"))

        for item in data:
        # ✅ format month
            date_obj = datetime.strptime(item["month"], "%Y-%m")
            month_name = date_obj.strftime("%b %Y")

            amount = float(item["amount"])
            total += amount

        # ✅ track highest & lowest
            if amount > highest[1]:
               highest = (month_name, amount)

            if amount < lowest[1]:
                lowest = (month_name, amount)

            response += f"{month_name}: ₹{amount}\n"

            response += "--------------------------\n"
            response += f"Total: ₹{round(total,2)}\n"

    # ✅ safe average
            avg = total / len(data) if data else 0
            response += f"Average: ₹{round(avg,2)}\n"

    # ✅ insights (🔥 powerful feature)
            response += f"\n📈 Highest: {highest[0]} (₹{highest[1]})"
            response += f"\n📉 Lowest: {lowest[0]} (₹{lowest[1]})"

        return {
            "type": "text",
            "content": response
        }
    
        
    if "report" in msg:
        return {"type": "text",
                "content": "Report feature is coming soon!"}
    if "advice" in msg:
        return {"type": "text",
                "content": "Financial advice feature is coming soon!"}
    if "help" in msg:
        return {"type": "text",
                "content":"You can tell me things like 'I spent 200 on food' or 'I earned 5000 salary'. You can also ask for totals like 'What is my total expense?'"}
    if "category" in msg:
        return {"type": "text",
                "content": "I can categorize your transactions into Food, Transport, Entertainment, Utilities, Health, Salary, Shopping, and Housing based on keywords in your message."}
    if "feedback" in msg:
        return {"type": "text",
                "content": "We value your feedback! Please email us at feedback@vitya.com"}
    if "contact" in msg:
        return {"type": "text",
                "content": "You can contact our support team at support@vitya.com"}
    if "about" in msg:
        return {"type": "text",
                "content": "vitya is your personal finance assistant. I can help you track your expenses and income just by chatting with me!"}
    if "thanks" in msg or "thank you" in msg:
        return {"type": "text",
                "content": "You're welcome! I'm here to help you manage your finances."}
    if "greet" in msg or "hello" in msg or "hi" in msg:
        return {"type": "text",
                "content": "Hello! I'm vitya, your personal finance assistant. How can I help you today?"}
    if "bye" in msg or "goodbye" in msg:
        return {"type": "text",
                "content": "Goodbye! Have a great day managing your finances!"}
    if "joke" in msg:
        return {"type": "text",
                "content": "Why don't scientists trust atoms? Because they make up everything!"}
    if "quote" in msg:
        return {"type": "text",
                "content": "The best way to get started is to quit talking and begin doing. - Walt Disney"}
    if "motivation" in msg:
        return {"type": "text",
                "content": "Don't watch the clock; do what it does. Keep going. - Sam Levenson"}
    if "weather" in msg:
        return {"type": "text",
                "content": "I can't check the weather yet, but I hope it's sunny where you are!"}
    if "news" in msg:
        return {"type": "text",
                "content": "I can't fetch news yet, but I hope you have a great day!"}
    if "holiday" in msg:
        return {"type": "text",
                "content": "I hope you have a wonderful holiday! Remember to budget for it!"}
    if "goal" in msg:
        return {"type": "text",
                "content": "Setting financial goals is a great way to stay motivated! What are your goals?"}
    if "challenge" in msg:
        return {"type": "text",
                "content": "Here's a financial challenge for you: Try to save 10% of your income this month!"}

    # ✅ FALLBACK
    return {
        "type": "text",
        "content": "Try: 'I spent 200 on food' or 'I earned 5000 salary'"
      }