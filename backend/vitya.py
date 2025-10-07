# app.py (fixed)
from flask import Flask, request, jsonify, current_app
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from functools import wraps
from flask_cors import CORS
import io
import jwt
import base64
import requests
import matplotlib.pyplot as plt
import pandas as pd
import os
from dotenv import load_dotenv
from passlib.context import CryptContext


app = Flask(__name__)
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "https://vitya-ai-re.onrender.com"}})

load_dotenv()
raw_db_url = os.environ.get('DATABASE_URL')
if raw_db_url and raw_db_url.startswith("postgres://"):
    raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = raw_db_url
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'fallback-dev-secret')

ML_API_BASE = os.environ.get("ML_API_BASE")
db = SQLAlchemy(app)
pwd_context = CryptContext(schemes=["pbkdf2_sha256", "scrypt"], deprecated="auto")




# -------------------------------
# MODELS
# -------------------------------
class User(db.Model):
    __tablename__ ='vitya_user'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(500), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)
    email = db.Column(db.String(320), unique=True, nullable=False)
    expenses = db.relationship('Expense', backref='user', lazy=True)
    incomes = db.relationship('Income', backref='user', lazy=True)


class Income(db.Model):
    __tablename__ = 'incomes'
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, default=0.0)
    source = db.Column(db.String(1000))
    city = db.Column(db.String(1000))
    date = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('vitya_user.id'), nullable=False)


class Expense(db.Model):
    __tablename__ = 'expenses'
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, default=0.0)
    category = db.Column(db.String(500), nullable=False)
    description = db.Column(db.String(2000))
    date = db.Column(db.DateTime, default=datetime.utcnow)
    payment_type = db.Column(db.String(2000))
    user_id = db.Column(db.Integer, db.ForeignKey('vitya_user.id'), nullable=False)


# -------------------------------
# DEFAULT ROOT URL
# -------------------------------
@app.route("/", methods=["GET"])
def index():
    return jsonify({"message": "Welcome to VITYA-AI backend!"}), 200


# -------------------------------
# TOKEN REQUIRED DECORATOR
# -------------------------------
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return jsonify({'message': 'Token is missing or invalid format!'}), 401
        token = auth.split(' ')[1]
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = db.session.get(User, data['user_id'])
            if not current_user:
                raise RuntimeError("User not found")
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except Exception as e:
            return jsonify({'message': 'Invalid Token!', 'error': str(e)}), 401
        return f(current_user, *args, **kwargs)
    return decorated



# -------------------------------
# REGISTER AND login
# -------------------------------
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    if not all(k in data for k in ('username', 'email', 'password')):
        return jsonify({'error': 'username, email, and password are required'}), 400
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already taken'}), 400
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already taken'}), 400

    user = User(
        username=data['username'],
        email=data['email'],
        password=pwd_context.hash(data['password'])
    )
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Username or email already exists'}), 400
    return jsonify({'message': 'User registered successfully!'}), 201


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    if not all(k in data for k in ('username', 'password')):
        return jsonify({'error': 'Username and password are required'}), 400
    user = User.query.filter_by(username=data['username']).first()
    if not user or not pwd_context.verify(data['password'], user.password):
        return jsonify({'error': 'Invalid username or password'}), 401
    payload = {
        'user_id': user.id,
        'exp': datetime.utcnow() + timedelta(hours=48)
    }
    token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')
    return jsonify({'token': token}), 200


# -------------------------------
# PROFILE ROUTES
# -------------------------------
@app.route('/api/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    return jsonify({
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email
    }), 200

# -------------------------------
# INCOME ROUTES
# -------------------------------
@app.route('/api/incomes', methods=['POST'])
@token_required
def set_income(current_user):
    data = request.json
    if not data or 'amount' not in data or 'source' not in data:
        return jsonify({"error": "Amount and source are required"}), 400
    try:
        expense_date = datetime.strptime(data['date'], '%Y-%m-%d') if 'date' in data else datetime.utcnow()
    except ValueError:
        return jsonify({"error": "Incorrect date format. Use YYYY-MM-DD."}), 400

    new_income = Income(
        amount=data['amount'],
        source=data['source'],
        city=data.get('city', ''),
        date=expense_date,
        user_id=current_user.id
    )
    db.session.add(new_income)
    db.session.commit()
    return jsonify({"message": "Income added successfully!"}), 201
# -------------------------------
# EXPENSE ROUTES
# -------------------------------
@app.route('/api/expenses', methods=['POST'])
@token_required
def add_expense(current_user):
    data = request.get_json() or {}
    if 'amount' not in data or 'payment_type' not in data:
        return jsonify({"error": "Amount and payment_type are required"}), 400
    try:
        expense_date = datetime.strptime(data['date'], '%Y-%m-%d') if 'date' in data else datetime.utcnow()
    except ValueError:
        return jsonify({"error": "Incorrect date format. Use YYYY-MM-DD."}), 400

    exp = Expense(
        amount=data['amount'],
        category=data.get('category', 'Uncategorized'),
        description=data.get('description', ''),
        date=expense_date,
        payment_type=data['payment_type'],
        user_id=current_user.id
    )
    db.session.add(exp)
    db.session.commit()
    return jsonify({"message": "Expense added successfully!"}), 201

# -------------------------------
# ANALYTICS OVERVIEW
# -------------------------------
@app.route('/api/analytics_overview', methods=['GET'])
@token_required
def get_financial_overview(current_user):
    try:
         total_income = sum(inc.amount for inc in current_user.incomes)
         total_expenses = sum(e.amount for e in current_user.expenses)
         dist = {}
         for e in current_user.expenses:
             dist[e.category] = dist.get(e.category, 0) + e.amount
         return jsonify({
             "total_income": total_income,
             "total_expenses": total_expenses,
             "expense_distribution": dist,
             "available_balance": total_income - total_expenses
       }), 200
    except Exception as e:
        # isse aapko Render logs me full traceback mil jaayega
        current_app.logger.exception("analytics_overview failed")
        return jsonify(error=str(e)), 500
    
# -------------------------------
# EXPENSE PIE GRAPH
# -------------------------------
@app.route('/api/expenses/graph', methods=['GET'])
@token_required
def get_expense_graph(current_user):
    expenses = Expense.query.filter_by(user_id=current_user.id).all()
    if not expenses:
        return jsonify({"message": "No expenses found!"}), 404
    categories = {}
    for exp in expenses:
        categories[exp.category] = categories.get(exp.category, 0) + exp.amount
    plt.figure(figsize=(5, 5))
    plt.pie(categories.values(), labels=categories.keys(), autopct='%1.1f%%')
    plt.title("Expense Distribution")
    img = io.BytesIO()
    plt.savefig(img, format='png')
    plt.close()
    img.seek(0)
    img_base64 = base64.b64encode(img.getvalue()).decode()
    return jsonify({"graph": img_base64}), 200


# -------------------------------
# TREND GRAPH (INCOME & EXPENSE)
# -------------------------------
@app.route('/api/expenses_income_trend', methods=['GET'])
@token_required
def get_expense_income_trend(current_user):

    income_data = [{'amount': inc.amount, 'date': inc.date} for inc in current_user.incomes]
    expense_data = [{'amount': exp.amount, 'date': exp.date} for exp in current_user.expenses]

    income_df = pd.DataFrame(income_data)
    expense_df = pd.DataFrame(expense_data)

    if income_df.empty and expense_df.empty:
        return jsonify({"message": "No data to show"}), 404

    if not income_df.empty:
        income_df['date'] = pd.to_datetime(income_df['date'])
        income_df['month'] = income_df['date'].dt.to_period('M')
        monthly_income = income_df.groupby('month')['amount'].sum()
        monthly_income.index = monthly_income.index.to_timestamp()
    else:
        monthly_income = pd.Series(dtype='float64')

    if not expense_df.empty:
        expense_df['date'] = pd.to_datetime(expense_df['date'])
        expense_df['month'] = expense_df['date'].dt.to_period('M')
        monthly_expenses = expense_df.groupby('month')['amount'].sum()
        monthly_expenses.index = monthly_expenses.index.to_timestamp()
    else:
        monthly_expenses = pd.Series(dtype='float64')

    df = pd.DataFrame({
        'Income': monthly_income,
        'Expenses': monthly_expenses
    }).fillna(0)
    df.sort_index(inplace=True)

    buf_income = io.BytesIO()
    plt.figure(figsize=(12, 5))
    plt.plot(df.index, df['Income'], marker='o', color='green')
    plt.title("Monthly Income")
    plt.xlabel("Month")
    plt.ylabel("Income (₹)")
    plt.grid(True)
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig(buf_income, format='png')
    plt.close()
    buf_income.seek(0)
    graph_income_b64 = base64.b64encode(buf_income.getvalue()).decode()

    buf_expense = io.BytesIO()
    plt.figure(figsize=(12, 5))
    plt.plot(df.index, df['Expenses'], marker='o', color='red')
    plt.title("Monthly Expenses")
    plt.xlabel("Month")
    plt.ylabel("Expenses (₹)")
    plt.grid(True)
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig(buf_expense, format='png')
    plt.close()
    buf_expense.seek(0)
    graph_expense_b64 = base64.b64encode(buf_expense.getvalue()).decode()

    return jsonify({
        "income_graph": graph_income_b64,
        "expense_graph": graph_expense_b64
    }), 200


# -------------------------------
# ML-BASED ADVICE
# -------------------------------
@app.route('/api/advice', methods=['GET'])
@token_required
def get_expense_advice(current_user):
    try:
        user_data = {
            "user_id": current_user.id,
            "income": [
                {
                    "amount": inc.amount,
                    "source": inc.source,
                    "city": inc.city,
                    "date": inc.date.strftime('%Y-%m-%d')
                } for inc in current_user.incomes
           ],
            "expenses": [
                {
                    "amount": exp.amount,
                    "category": exp.category,
                    "description": exp.description,
                    "payment_type": exp.payment_type,
                    "date": exp.date.strftime('%Y-%m-%d')
                } for exp in current_user.expenses
            ]
        }
        train_resp = requests.post(f"{ML_API_BASE}/train/", json=user_data)
        if train_resp.status_code != 200:
            return jsonify({"error": "Training failed"}), 500
        predict_resp = requests.post(f"{ML_API_BASE}/predict/", json=user_data)
        if predict_resp.status_code != 200:
            return jsonify({"error": "Prediction failed"}), 500
        return jsonify(predict_resp.json()), 200
    except Exception as e:
        return jsonify({"error": f"Internal error: {str(e)}"}), 500


# -------------------------------
# RECENT TRANSACTIONS (combined)
# -------------------------------
@app.route('/api/transactions/recent', methods=['GET'])
@token_required
def get_recent_transactions(current_user):
    items = []
    for e in current_user.expenses:
        items.append({
            '_id': e.id,
            'type': 'expense',
            'amount': float(e.amount),
            'date': e.date.isoformat(),
            'category': e.category,
            'description': e.description
        })
    for i in current_user.incomes:
        items.append({
            '_id': i.id,
            'type': 'income',
            'amount': float(i.amount),
            'date': i.date.isoformat(),
            'category': i.source
        })
    items.sort(key=lambda x: x['date'], reverse=True)
    return jsonify(items[:10]), 200


# -------------------------------
# ONE-TIME FIX FOR BAD DATES
# -------------------------------
def fix_expense_dates():
    rows = db.session.execute(text("SELECT id, date FROM expense")).fetchall()
    fixed = 0
    skipped = 0
    possible_formats = ['%d-%m-%Y', '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y']

    for eid, date_val in rows:
        if isinstance(date_val, str):
            for fmt in possible_formats:
                try:
                    parsed_date = datetime.strptime(date_val, fmt)
                    db.session.execute(
                        text("UPDATE expense SET date = :date WHERE id = :id"),
                        {"date": parsed_date, "id": eid}
                    )
                    fixed += 1
                    break
                except ValueError:
                    continue
            else:
                skipped += 1
    db.session.commit()
    print(f" Fixed: {fixed},  Skipped (unrecognized format): {skipped}")

# -------------------------------
# ENTRY POINT
# -------------------------------
if __name__ == '__main__':
    debug_mode = os.environ.get("FLASK_ENV") != "production"

    with app.app_context():
        if debug_mode:
            db.create_all()
            fix_expense_dates()

    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port, debug=debug_mode)