import re
from sqlalchemy import func
from api.models.vitya import Expense, Income
from datetime import datetime
from chats.categories import CATEGORY_KEYWORDS

# ---------------- PARSER ---------------- #
def parse_message(message: str):
    msg = message.lower()

    # ✅ ADD NORMALIZATION HERE
    NORMALIZATION_MAP = {
        "kharida": "buy",
        "liya": "buy",
        "diya": "paid",
        "aaya": "received",
        "khana": "food",
        "dawai": "medicine"
    }

    for k, v in NORMALIZATION_MAP.items():
        msg = msg.replace(k, v)

    # ---------------- amount ----------------
    amount_match = re.search(r'(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)', msg)
    amount = float(amount_match.group(1)) if amount_match else None

    # ---------------- txn type ----------------
    INCOME_WORDS = ["salary", "income", "credited", "received", "earn"]
    EXPENSE_WORDS = ["spent", "buy", "paid", "expense"]

    income_score = sum(1 for w in INCOME_WORDS if w in msg)
    expense_score = sum(1 for w in EXPENSE_WORDS if w in msg)

    if income_score > expense_score:
        txn_type = "income"
    elif expense_score > income_score:
        txn_type = "expense"
    else:
        txn_type = None

    # ---------------- category ----------------
    category = detect_category(msg)

    return amount, category, txn_type

def detect_category(msg: str):
    scores = {}

    for category, keywords in CATEGORY_KEYWORDS.items():
        score = 0

        for word, weight in keywords.items():
            if re.search(rf"\b{re.escape(word)}\b", msg):
                score += weight

        if score > 0:
            scores[category] = score

    if not scores:
        return "other"

    return max(scores, key=scores.get)

# ---------------- CHATBOT ---------------- #
def chatbot_reply(message: str, db, current_user):
    msg = message.lower()

    amount, category, txn_type = parse_message(message)

    # ✅ EXPENSE
    if amount is not None and txn_type == "expense":
        entry = Expense(
            amount=amount,
            category=category,
            description="",
            date=datetime.utcnow(),
            user_id=current_user.id
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)

        return f"Expense of ₹{amount} added under {category}"

    # ✅ INCOME
    if amount is not None and txn_type == "income":
        entry = Income(
            amount=amount,
            source=category,
            date=datetime.utcnow(),
            user_id=current_user.id
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)

        return f"Income of ₹{amount} added as {category}"

    # ✅ TOTAL EXPENSE
    if "total" in msg and "expense" in msg:
        total = db.query(func.sum(Expense.amount))\
                  .filter(Expense.user_id == current_user.id)\
                  .scalar() or 0

        return f"Your total expenses are ₹{total}"

    # ✅ TOTAL INCOME
    if "total" in msg and "income" in msg:
        total = db.query(func.sum(Income.amount))\
                  .filter(Income.user_id == current_user.id)\
                  .scalar() or 0

        return f"Your total income is ₹{total}"
    
    if "recent transactions" in msg:
        expenses = db.query(Expense).filter(Expense.user_id == current_user.id).order_by(Expense.date.desc()).limit(5).all()
        incomes = db.query(Income).filter(Income.user_id == current_user.id).order_by(Income.date.desc()).limit(5).all()

        response = "Recent Transactions:\n\nExpenses:\n"
        for e in expenses:
            response += f"- ₹{e.amount} on {e.category} at {e.date.strftime('%Y-%m-%d')}\n"

        response += "\nIncomes:\n"
        for i in incomes:
            response += f"- ₹{i.amount} from {i.source} at {i.date.strftime('%Y-%m-%d')}\n"

        return response
    if "budget" in msg:
        return "Budget feature is coming soon!"
    if "report" in msg:
        return "Report feature is coming soon!"
    if "advice" in msg:
        return "Financial advice feature is coming soon!"
    if "help" in msg:
        return "You can tell me things like 'I spent 200 on food' or 'I earned 5000 salary'. You can also ask for totals like 'What is my total expense?'"
    if "category" in msg:
        return "I can categorize your transactions into Food, Transport, Entertainment, Utilities, Health, Salary, Shopping, and Housing based on keywords in your message."
    if "feedback" in msg:
        return "We value your feedback! Please email us at feedback@finbot.com"
    if "contact" in msg:
        return "You can contact our support team at support@finbot.com"
    if "about" in msg:
        return "FinBot is your personal finance assistant. I can help you track your expenses and income just by chatting with me!"
    if "thanks" in msg or "thank you" in msg:
        return "You're welcome! I'm here to help you manage your finances."
    if "greet" in msg or "hello" in msg or "hi" in msg:
        return "Hello! I'm FinBot, your personal finance assistant. How can I help you today?"
    if "bye" in msg or "goodbye" in msg:
        return "Goodbye! Have a great day managing your finances!"
    if "joke" in msg:
        return "Why don't scientists trust atoms? Because they make up everything!"
    if "quote" in msg:
        return "The best way to get started is to quit talking and begin doing. - Walt Disney"
    if "motivation" in msg:
        return "Don't watch the clock; do what it does. Keep going. - Sam Levenson"
    if "weather" in msg:
        return "I can't check the weather yet, but I hope it's sunny where you are!"
    if "news" in msg:
        return "I can't fetch news yet, but I hope you have a great day!"
    if "holiday" in msg:
        return "I hope you have a wonderful holiday! Remember to budget for it!"
    if "goal" in msg:
        return "Setting financial goals is a great way to stay motivated! What are your goals?"
    if "challenge" in msg:
        return "Here's a financial challenge for you: Try to save 10% of your income this month!"

    # ✅ FALLBACK
    return "Try: 'I spent 200 on food' or 'I earned 5000 salary'"