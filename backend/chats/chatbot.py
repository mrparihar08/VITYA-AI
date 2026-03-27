import os
import re
from fastapi import  Query, HTTPException
from dotenv import load_dotenv
from datetime import datetime
from urllib.parse import quote
import requests
from sqlalchemy import func
from backend.api.models.vitya import Expense, Income
from backend.api.routes.ai import budget_plan, monthly_trend
from backend.api.routes.vitya import (
    get_expense_graph,
    get_expense_income_trend,
    get_expenses_chart,
)
from backend.chats.categories import CATEGORY_KEYWORDS
from backend.chats.FileCreator import generate_qr, generate_barcode

# ---------------- NORMALIZATION ---------------- #
NORMALIZATION_MAP = {
    "kharida": "buy",
    "liya": "buy",
    "diya": "paid",
    "aaya": "received",
    "khana": "food",
    "dawai": "medicine",
}

NEWS_API_KEY = os.getenv("NEWS_API_KEY")

BASE_TOP = "https://newsapi.org/v2/top-headlines"
BASE_SEARCH = "https://newsapi.org/v2/everything"

def fetch_news_data(category="general", q="", limit=5):
    try:
        if not NEWS_API_KEY:
            raise Exception("NEWS_API_KEY missing")

        # Decide endpoint
        if q.strip():
            response = requests.get(
                BASE_SEARCH,
                params={
                    "q": q.strip(),
                    "language": "en",
                    "sortBy": "publishedAt",
                    "apiKey": NEWS_API_KEY
                },
                timeout=10
            )
        else:
            response = requests.get(
                BASE_TOP,
                params={
                    "country": "in",
                    "category": category,
                    "apiKey": NEWS_API_KEY
                },
                timeout=10
            )

        data = response.json()

        if response.status_code != 200:
            raise Exception(data.get("message", "News API error"))

        articles = data.get("articles", [])

        # Clean output (important)
        news_list = []
        for a in articles[:limit]:
            news_list.append({
                "title": a.get("title"),
                "description": a.get("description"),
                "url": a.get("url"),
                "image": a.get("urlToImage"),
                "source": a.get("source", {}).get("name"),
                "publishedAt": a.get("publishedAt"),
            })

        return news_list

    except Exception as e:
        print("NEWS ERROR:", e)
        return []


import wikipedia
import requests
from urllib.parse import quote

wikipedia.set_lang("en")


def fetch_wikipedia(query: str):
    try:
        if not query or not query.strip():
            return None

        query = query.strip()

        # ---------------- TRY 1: wikipedia library ---------------- #
        try:
            summary = wikipedia.summary(query, sentences=3)
            page = wikipedia.page(query)

            return {
                "title": page.title,
                "summary": summary,
                "url": page.url,
                "image": page.images[0] if page.images else None,
                "source": "library"
            }

        except wikipedia.exceptions.DisambiguationError as e:
            # pick first option automatically
            try:
                option = e.options[0]
                summary = wikipedia.summary(option, sentences=3)
                page = wikipedia.page(option)

                return {
                    "title": page.title,
                    "summary": summary,
                    "url": page.url,
                    "image": page.images[0] if page.images else None,
                    "source": "library_disambiguation"
                }
            except Exception:
                pass

        except wikipedia.exceptions.PageError:
            pass

        # ---------------- TRY 2: API FALLBACK ---------------- #
        safe_query = quote(query)
        url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{safe_query}"

        res = requests.get(url, timeout=10)

        if res.status_code != 200:
            print("WIKI HTTP ERROR:", res.status_code, res.text[:200])
            return None

        data = res.json()

        if data.get("type") == "https://mediawiki.org/wiki/HyperSwitch/errors/not_found":
            return None

        return {
            "title": data.get("title"),
            "summary": data.get("extract"),
            "url": data.get("content_urls", {}).get("desktop", {}).get("page"),
            "image": data.get("thumbnail", {}).get("source"),
            "source": "api"
        }

    except requests.RequestException as e:
        print("WIKI REQUEST ERROR:", e)
        return None

    except Exception as e:
        print("WIKI ERROR:", e)
        return None

import re

def clean_wiki_query(text: str):
    text = text.lower()

    text = re.sub(
        r"(wiki|wikipedia|tell me about|who is|what is|info about|information on)",
        "",
        text
    )

    return text.strip()

def normalize(text: str):
    text = (text or "").lower()
    for k, v in NORMALIZATION_MAP.items():
        text = re.sub(rf"\b{re.escape(k)}\b", v, text)
    return text


def contains_any(text: str, words):
    return any(word in text for word in words)


# ---------------- PARSER ---------------- #
def extract_amount(text: str):
    match = re.search(r"(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)", text)
    return float(match.group(1)) if match else None


def detect_txn_type(text: str):
    income_words = ["salary", "income", "credited", "received", "earn"]
    expense_words = ["spent", "buy", "paid", "expense"]

    income_score = sum(word in text for word in income_words)
    expense_score = sum(word in text for word in expense_words)

    if income_score > expense_score:
        return "income"
    if expense_score > income_score:
        return "expense"
    return None


def detect_category(text: str):
    if "salary" in text:
        return "salary"

    scores = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(
            weight
            for word, weight in keywords.items()
            if re.search(rf"\b{re.escape(word)}\b", text)
        )
        if score:
            scores[category] = score

    return max(scores, key=scores.get) if scores else "other"


# ---------------- CUSTOM DATA ---------------- #
def extract_chart_data(text: str):
    pairs = re.findall(
        r'\b([a-zA-Z]+)\b\s*[:=]?\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)',
        text,
    )
    return [
        {"category": category.capitalize(), "amount": float(amount)}
        for category, amount in pairs
    ]


# ---------------- CHART TYPE ---------------- #
def detect_chart_type(text: str):
    # More specific patterns first
    if "multi line" in text or "compare" in text or "vs" in text:
        return "multi_line"
    if "composed" in text or "combined" in text or "mix" in text:
        return "composed"
    if "stack" in text:
        return "stacked"
    if "pie" in text:
        return "pie"
    if "donut" in text:
        return "donut"
    if "line" in text:
        return "line_chart"
    if "area" in text:
        return "area"
    if "scatter" in text:
        return "scatter"
    if "radar" in text:
        return "radar"
    if "heatmap" in text:
        return "heatmap"
    if "waterfall" in text:
        return "waterfall"
    return "bar"


def build_trend_chart_data(current_user, db):
    data = get_expense_income_trend(current_user=current_user, db=db)
    return data or []


# ---------------- MAIN CHATBOT ---------------- #
def chatbot_reply(message: str, db, current_user):
    text = normalize(message)

    amount = extract_amount(text)
    txn_type = detect_txn_type(text)
    category = detect_category(text)

    # ================= TRANSACTIONS ================= #
    if amount is not None and txn_type == "expense":
        db.add(
            Expense(
                amount=amount,
                category=category,
                date=datetime.utcnow(),
                user_id=current_user.id,
            )
        )
        db.commit()
        return {"type": "text", "content": f"Expense ₹{amount} added in {category}"}

    if amount is not None and txn_type == "income":
        db.add(
            Income(
                amount=amount,
                source=category,
                date=datetime.utcnow(),
                user_id=current_user.id,
            )
        )
        db.commit()
        return {"type": "text", "content": f"Income ₹{amount} added as {category}"}

    # ================= PRIORITY 1 → CUSTOM DATA ================= #
    custom_data = extract_chart_data(text)
    if len(custom_data) >= 2:
        return {
            "type": detect_chart_type(text),
            "content": custom_data,
        }

    # ================= PRIORITY 2 → SPECIFIC CHARTS ================= #
    if "scatter" in text:
        trend = build_trend_chart_data(current_user, db)
        scatter_data = [
            {
                "x": item.get("income", 0),
                "y": item.get("expense", 0),
                "name": item.get("month") or item.get("date") or "",
            }
            for item in trend
        ]
        return {"type": "scatter", "content": scatter_data}

    if "radar" in text:
        data = get_expense_graph(current_user=current_user, db=db)
        return {"type": "radar", "content": data or []}

    if "heatmap" in text:
        data = get_expenses_chart(current_user=current_user, db=db)
        return {"type": "heatmap", "content": data or []}

    if "waterfall" in text:
        income = (
            db.query(func.sum(Income.amount))
            .filter(Income.user_id == current_user.id)
            .scalar()
            or 0
        )

        expense = (
            db.query(func.sum(Expense.amount))
            .filter(Expense.user_id == current_user.id)
            .scalar()
            or 0
        )

        data = [
            {"name": "Income", "amount": income},
            {"name": "Expense", "amount": -expense},
            {"name": "Savings", "amount": income - expense},
        ]

        return {"type": "waterfall", "content": data}

    if "area" in text:
        data = build_trend_chart_data(current_user, db)
        return {"type": "area", "content": data}

    if "stack" in text:
        data = build_trend_chart_data(current_user, db)
        return {"type": "stacked", "content": data}

    if "composed" in text or "combined" in text or "mix" in text:
        data = build_trend_chart_data(current_user, db)
        return {"type": "composed", "content": data}

    if "compare" in text or "vs" in text or "multi line" in text:
        data = build_trend_chart_data(current_user, db)
        return {"type": "multi_line", "content": data}

    # ================= DATABASE CHARTS ================= #
    if "pie" in text or "donut" in text:
        data = get_expense_graph(current_user=current_user, db=db)
        return {"type": detect_chart_type(text), "content": data or []}

    if "line" in text or "trend" in text:
        data = get_expense_income_trend(current_user=current_user, db=db)
        return {"type": "line_chart", "content": data or []}

    if "chart" in text or "graph" in text:
        data = get_expenses_chart(current_user=current_user, db=db)
        return {"type": "bar", "content": data or []}

    # ================= QR CODE ================= #
    if "qr" in text or "qr code" in text:
        qr_text = re.sub(r"\b(qr|code)\b", "", text).strip()
        if not qr_text:
            qr_text = "Hello from Vitya"

        img = generate_qr(qr_text)
        return {"type": "qr", "content": img}

    # ================= BARCODE ================= #
    if "barcode" in text or "barcodes" in text:
        barcode_text = re.sub(r"\b(barcode|barcodes)\b", "", text).strip()
        if not barcode_text:
            barcode_text = "123456789"

        img = generate_barcode(barcode_text)
        return {"type": "barcode", "content": img}

    # ================= TOTAL ================= #
    if "total expense" in text:
        total = (
            db.query(func.sum(Expense.amount))
            .filter(Expense.user_id == current_user.id)
            .scalar()
            or 0
        )
        return {"type": "text", "content": f"Total expense: ₹{total}"}

    if "total income" in text:
        total = (
            db.query(func.sum(Income.amount))
            .filter(Income.user_id == current_user.id)
            .scalar()
            or 0
        )
        return {"type": "text", "content": f"Total income: ₹{total}"}

    # ================= BUDGET ================= #
    if "budget" in text:
        data = budget_plan(current_user=current_user, db=db)
        summary = data.get("summary", {})

        return {
            "type": "text",
            "content": (
                f"Income: {summary.get('total_income', 0)}\n"
                f"Expense: {summary.get('total_expenses', 0)}\n"
                f"Savings: {summary.get('suggested_savings', 0)}"
            ),
        }

    # ================= MONTHLY REPORT ================= #
    if "monthly" in text and ("report" in text or "trend" in text):
        data = monthly_trend(current_user=current_user, db=db)

        if not data:
            return {"type": "text", "content": "No data available 📊"}

        try:
            valid_items = []

            for item in data:
                try:
                    date_obj = datetime.strptime(item["month"], "%Y-%m")
                    amount_val = float(item["amount"])
                    valid_items.append((date_obj, amount_val))
                except Exception:
                    continue

            if not valid_items:
                return {"type": "text", "content": "No valid monthly data available 📊"}

            valid_items.sort(key=lambda x: x[0])

            response = "📊 Monthly Expense Report\n--------------------------\n"

            total = 0
            highest = ("", float("-inf"))
            lowest = ("", float("inf"))

            for date_obj, amount_val in valid_items:
                month_name = date_obj.strftime("%b %Y")
                total += amount_val

                if amount_val > highest[1]:
                    highest = (month_name, amount_val)

                if amount_val < lowest[1]:
                    lowest = (month_name, amount_val)

                response += f"{month_name}: ₹{amount_val}\n"

            avg = total / len(valid_items)

            response += "--------------------------\n"
            response += f"Total: ₹{round(total, 2)}\n"
            response += f"Average: ₹{round(avg, 2)}\n"
            response += f"\n📈 Highest: {highest[0]} (₹{highest[1]})"
            response += f"\n📉 Lowest: {lowest[0]} (₹{lowest[1]})"

            return {"type": "text", "content": response}

        except Exception as e:
            print("MONTHLY REPORT ERROR:", e)
            return {"type": "text", "content": "Error generating report ❌"}

    # ================= NEWS ================= #
    if "news" in text:
        category_name = "general"
        query = ""

        # 🔹 Category detection
        if "tech" in text or "technology" in text:
            category_name = "technology"
        elif "sports" in text:
            category_name = "sports"
        elif "business" in text:
            category_name = "business"
        elif "health" in text:
            category_name = "health"
        elif "entertainment" in text or "movie" in text:
            category_name = "entertainment"

        # 🔹 Query extraction (important improvement)
        # Example: "bitcoin news", "ai news"
        words = text.split()
        if "news" in words:
            idx = words.index("news")
            if idx > 0:
                query = words[idx - 1]   # last word before "news"

        # 🔹 Fetch news
        news_data = fetch_news_data(category=category_name, q=query, limit=5)

        if not news_data:
            return {
                "type": "text",
                "content": "News fetch nahi ho paayi 😢 (check API key or try again)"
            }

        return {
            "type": "news",
            "content": news_data
        }

    # ================= WIKIPEDIA ================= #
    if any(word in text for word in ["wiki", "wikipedia", "who is", "what is", "tell me about"]):

        query = clean_wiki_query(message)

        if not query:
            return {
                "type": "text",
                "content": "Kya search karna hai Wikipedia par? 🤔"
            }

        wiki_data = fetch_wikipedia(query)

        if not wiki_data:
            return {
                "type": "text",
                "content": f"'{query}' ke liye Wikipedia data nahi mila 😢"
            }

        return {
            "type": "wiki",
            "content": {
                "title": wiki_data.get("title"),
                "summary": wiki_data.get("summary"),
                "image": wiki_data.get("image"),
                "url": wiki_data.get("url")
            }
        }

    # ================= HELP / INFO ================= #
    if "report" in text:
        return {"type": "text", "content": "Report feature is coming soon!"}

    if "advice" in text:
        return {"type": "text", "content": "Financial advice feature is coming soon!"}

    if "help" in text:
        return {
            "type": "text",
            "content": (
                "You can tell me things like 'I spent 200 on food' or "
                "'I earned 5000 salary'. You can also ask for totals like "
                "'What is my total expense?'"
            ),
        }

    if "category" in text:
        return {
            "type": "text",
            "content": (
                "I can categorize your transactions into Food, Transport, "
                "Entertainment, Utilities, Health, Salary, Shopping, and Housing "
                "based on keywords in your message."
            ),
        }

    if "feedback" in text:
        return {
            "type": "text",
            "content": "We value your feedback! Please email us at feedback@vitya.com",
        }

    if "contact" in text:
        return {
            "type": "text",
            "content": "You can contact our support team at support@vitya.com",
        }

    if "about" in text:
        return {
            "type": "text",
            "content": (
                "vitya is your personal finance assistant. I can help you track "
                "your expenses and income just by chatting with me!"
            ),
        }

    if "thanks" in text or "thank you" in text:
        return {
            "type": "text",
            "content": "You're welcome! I'm here to help you manage your finances.",
        }

    if "greet" in text or "hello" in text or "hi" in text:
        return {
            "type": "text",
            "content": "Hello! I'm vitya, your personal finance assistant. How can I help you today?",
        }

    if "bye" in text or "goodbye" in text:
        return {
            "type": "text",
            "content": "Goodbye! Have a great day managing your finances!",
        }

    if "joke" in text:
        return {
            "type": "text",
            "content": "Why don't scientists trust atoms? Because they make up everything!",
        }

    if "quote" in text:
        return {
            "type": "text",
            "content": "The best way to get started is to quit talking and begin doing. - Walt Disney",
        }

    if "motivation" in text:
        return {
            "type": "text",
            "content": "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
        }

    if "weather" in text:
        return {
            "type": "text",
            "content": "I can't check the weather yet, but I hope it's sunny where you are!",
        }

    if "holiday" in text:
        return {
            "type": "text",
            "content": "I hope you have a wonderful holiday! Remember to budget for it!",
        }

    if "goal" in text:
        return {
            "type": "text",
            "content": "Setting financial goals is a great way to stay motivated! What are your goals?",
        }

    if "challenge" in text:
        return {
            "type": "text",
            "content": "Here's a financial challenge for you: Try to save 10% of your income this month!",
        }

    # ✅ FALLBACK
    return {
        "type": "text",
        "content": "Sorry, I didn't understand that. You can tell me about your expenses and income, or ask for reports and advice!",
    }