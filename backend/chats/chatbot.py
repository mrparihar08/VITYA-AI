import re
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from datetime import datetime

from backend.api.models.vitya import Expense, Income
from backend.api.routes.ai import budget_plan, monthly_trend
from backend.api.routes.vitya import (
    get_expense_graph,
    get_expense_income_trend,
    get_expenses_chart,
)

from backend.chats.categories import CATEGORY_KEYWORDS


# ---------------- NORMALIZATION ---------------- #
NORMALIZATION_MAP = {
    "kharida": "buy",
    "liya": "buy",
    "diya": "paid",
    "aaya": "received",
    "khana": "food",
    "dawai": "medicine"
}


def normalize(msg: str):
    msg = msg.lower()
    for k, v in NORMALIZATION_MAP.items():
        msg = msg.replace(k, v)
    return msg


# ---------------- PARSER ---------------- #
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
    if "salary" in msg:
        return "salary"

    scores = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(
            weight for word, weight in keywords.items()
            if re.search(rf"\b{re.escape(word)}\b", msg)
        )
        if score:
            scores[category] = score

    return max(scores, key=scores.get) if scores else "other"


# ---------------- CUSTOM DATA ---------------- #
def extract_chart_data(msg):
    pairs = re.findall(r'([a-zA-Z]+)\s*[:=]?\s*(\d+)', msg)
    return [{"category": k.capitalize(), "amount": float(v)} for k, v in pairs]


# ---------------- CHART TYPE ---------------- #
def detect_chart_type(msg):
    if "pie" in msg: return "pie"
    if "donut" in msg: return "donut"
    if "line" in msg: return "line_chart"
    if "area" in msg: return "area"
    if "scatter" in msg: return "scatter"
    if "radar" in msg: return "radar"
    if "heatmap" in msg: return "heatmap"
    if "waterfall" in msg: return "waterfall"
    if "stack" in msg: return "stacked"
    if "compare" in msg or "vs" in msg: return "multi_line"
    if "mix" in msg or "combined" in msg: return "composed"
    return "bar"


# ---------------- MAIN CHATBOT ---------------- #
def chatbot_reply(message: str, db, current_user):
    msg = normalize(message)

    amount = extract_amount(msg)
    txn_type = detect_txn_type(msg)
    category = detect_category(msg)

    # ================= TRANSACTIONS ================= #
    if amount is not None and txn_type == "expense":
        db.add(Expense(amount=amount, category=category,
               date=datetime.utcnow(), user_id=current_user.id))
        db.commit()
        return {"type": "text", "content": f"Expense ₹{amount} added in {category}"}

    if amount is not None and txn_type == "income":
        db.add(Income(amount=amount, source=category,
               date=datetime.utcnow(), user_id=current_user.id))
        db.commit()
        return {"type": "text", "content": f"Income ₹{amount} added as {category}"}
    # ================= PRIORITY 1 → CUSTOM DATA ================= #
    custom_data = extract_chart_data(msg)

    if len(custom_data) >= 2:
        return {
            "type": detect_chart_type(msg),
            "content": custom_data
        }


    # ================= PRIORITY 2 → DATABASE ================= #

    # 🔥 PIE / DONUT
    if "pie" in msg or "donut" in msg:
        data = get_expense_graph(current_user=current_user, db=db)
        return {"type": detect_chart_type(msg), "content": data or []}

    # 🔥 LINE / TREND
    if "line" in msg or "trend" in msg:
        data = get_expense_income_trend(current_user=current_user, db=db)
        return {"type": "line_chart", "content": data}

    # 🔥 BAR / GENERAL
    if "chart" in msg or "graph" in msg:
        data = get_expenses_chart(current_user=current_user, db=db)
        return {"type": "bar", "content": data or []}

    # 🔥 SCATTER
    if "scatter" in msg:
        trend = get_expense_income_trend(current_user=current_user, db=db)
        scatter_data = [{"x": i["income"], "y": i["expense"]} for i in trend]
        return {"type": "scatter", "content": scatter_data}

    # 🔥 RADAR
    if "radar" in msg:
        data = get_expense_graph(current_user=current_user, db=db)
        return {"type": "radar", "content": data}

    # 🔥 HEATMAP
    if "heatmap" in msg:
        data = get_expenses_chart(current_user=current_user, db=db)
        return {"type": "heatmap", "content": data}

    # 🔥 WATERFALL
    if "waterfall" in msg:
        income = db.query(func.sum(Income.amount)).filter(
            Income.user_id == current_user.id).scalar() or 0

        expense = db.query(func.sum(Expense.amount)).filter(
            Expense.user_id == current_user.id).scalar() or 0

        data = [
            {"name": "Income", "amount": income},
            {"name": "Expense", "amount": -expense},
            {"name": "Savings", "amount": income - expense}
        ]

        return {"type": "waterfall", "content": data}


    # ================= TOTAL ================= #
    if "total expense" in msg:
        total = db.query(func.sum(Expense.amount)).filter(
            Expense.user_id == current_user.id).scalar() or 0
        return {"type": "text", "content": f"Total expense: ₹{total}"}

    if "total income" in msg:
        total = db.query(func.sum(Income.amount)).filter(
            Income.user_id == current_user.id).scalar() or 0
        return {"type": "text", "content": f"Total income: ₹{total}"}

    # ================= BUDGET ================= #
    if "budget" in msg:
        data = budget_plan(current_user=current_user, db=db)

        return {
            "type": "text",
            "content": f"Income: {data['summary']['total_income']}\n"
                       f"Expense: {data['summary']['total_expenses']}\n"
                       f"Savings: {data['summary']['suggested_savings']}"
        }

    # ================= MONTHLY REPORT ================= #
    if "monthly" in msg and ("report" in msg or "trend" in msg):
        data = monthly_trend(current_user=current_user, db=db)

        if not data:
            return {"type": "text", "content": "No data available 📊"}

        try:
            data.sort(key=lambda x: x["month"])

            response = "📊 Monthly Expense Report\n--------------------------\n"

            total = 0
            highest = ("", 0)
            lowest = ("", float("inf"))

            for item in data:
                try:
                    date_obj = datetime.strptime(item["month"], "%Y-%m")
                except:
                    continue

                month_name = date_obj.strftime("%b %Y")
                amount = float(item["amount"])

                total += amount

                if amount > highest[1]:
                    highest = (month_name, amount)

                if amount < lowest[1]:
                    lowest = (month_name, amount)

                response += f"{month_name}: ₹{amount}\n"

            avg = total / len(data) if data else 0

            response += "--------------------------\n"
            response += f"Total: ₹{round(total,2)}\n"
            response += f"Average: ₹{round(avg,2)}\n"
            response += f"\n📈 Highest: {highest[0]} (₹{highest[1]})"
            response += f"\n📉 Lowest: {lowest[0]} (₹{lowest[1]})"

            return {"type": "text", "content": response}

        except Exception as e:
            print("MONTHLY REPORT ERROR:", e)
            return {"type": "text", "content": "Error generating report ❌"}

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
        "content": " Sorry, I didn't understand that. You can tell me about your expenses and income, or ask for reports and advice!"
      }