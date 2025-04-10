from flask import Flask, request, jsonify
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

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///vitya.db'
app.config['SECRET_KEY'] = 'machebox@0810#2000$nature'
db = SQLAlchemy(app)

# -------------------------------
# MODELS
# -------------------------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    expenses = db.relationship('Expense', backref='user')
    income = db.relationship('Income', backref='user')

class Income(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, default=0.0)
    source = db.Column(db.String(100))
    note = db.Column(db.String(100))
    date = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, default=0.0)
    category = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(200))
    date = db.Column(db.DateTime, default=datetime.utcnow)
    payment_type = db.Column(db.String(200))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

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
# AUTH ROUTES
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
        password=generate_password_hash(data['password'])
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
    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({'error': 'Invalid username or password'}), 401
    payload = {
        'user_id': user.id,
        'exp': datetime.utcnow() + timedelta(hours=48)
    }
    token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')
    return jsonify({'token': token}), 200

# -------------------------------
# SET INCOME
# -------------------------------
@app.route('/api/incomes', methods=['POST'])
@token_required
def set_income(current_user):
    data = request.json
    if not data or 'amount' not in data or 'source' not in data:
        return jsonify({"error": "Amount and source are required"}), 400
    try:
        expense_date = datetime.strptime(data['date'], '%d-%m-%Y') if 'date' in data else datetime.utcnow()
    except ValueError:
        return jsonify({"error": "Incorrect date format. Use DD-MM-YYYY."}), 400
    new_income = Income(
        amount=data['amount'],
        source=data['source'],
        note=data.get('note', ''),
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
        expense_date = datetime.strptime(data['date'], '%d-%m-%Y') if 'date' in data else datetime.utcnow()
    except ValueError:
        return jsonify({"error": "Incorrect date format. Use DD-MM-YYYY."}), 400
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

@app.route('/api/analytics_overview', methods=['GET'])
@token_required
def get_financial_overview(current_user):
    total_income = sum(inc.amount for inc in current_user.income)
    total_expenses = sum(e.amount for e in current_user.expenses)
    dist = {}
    for e in current_user.expenses:
        dist[e.category] = dist.get(e.category, 0) + e.amount
    return jsonify({
        "total_expenses": total_expenses,
        "expense_distribution": dist,
        "available_balance": total_income - total_expenses
    }), 200

@app.route('/api/expenses/graph', methods=['GET'])
@token_required
def get_expense_graph(current_user):
    exps = current_user.expenses
    if not exps:
        return jsonify({"message": "No expenses found!"}), 404
    dist = {}
    for e in exps:
        dist[e.category] = dist.get(e.category, 0) + e.amount
    plt.figure(figsize=(6,6))
    plt.pie(dist.values(), labels=dist.keys(), autopct='%1.1f%%')
    plt.title("Expense Distribution")
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    plt.close()
    buf.seek(0)
    graph_b64 = base64.b64encode(buf.getvalue()).decode()
    return jsonify({"graph": graph_b64}), 200

@app.route('/api/expenses_income_trend', methods=['GET'])
@token_required
def get_expense_income_trend(current_user):
    # Step 1: Prepare data
    income_data = [{
        'amount': inc.amount,
        'date': inc.date
    } for inc in current_user.income]
    expense_data = [{
        'amount': exp.amount,
        'date': exp.date
    } for exp in current_user.expenses]
    # Step 2: Create pandas DataFrames
    income_df = pd.DataFrame(income_data)
    expense_df = pd.DataFrame(expense_data)
    if income_df.empty and expense_df.empty:
        return jsonify({"message": "No data to show"}), 404
    # Step 3: Convert date to datetime and extract month
    if not income_df.empty:
        income_df['date'] = pd.to_datetime(income_df['date'])
        income_df['month'] = income_df['date'].dt.to_period('M')
        monthly_income = income_df.groupby('month')['amount'].sum()
    else:
        monthly_income = pd.Series()
    if not expense_df.empty:
        expense_df['date'] = pd.to_datetime(expense_df['date'])
        expense_df['month'] = expense_df['date'].dt.to_period('M')
        monthly_expenses = expense_df.groupby('month')['amount'].sum()
    else:
        monthly_expenses = pd.Series()
    # Step 4: Merge both trends
    df = pd.DataFrame({
        'Income': monthly_income,
        'Expenses': monthly_expenses
    }).fillna(0)
    df.sort_index(inplace=True)
    # Step 5: Plotting
    plt.figure(figsize=(12, 6))
    df.plot(kind='line', marker='o')
    plt.title("Monthly Income vs Expenses")
    plt.xlabel("Month")
    plt.ylabel("Amount (₹)")
    plt.grid(True)
    plt.xticks(rotation=45)
    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    plt.close()
    buf.seek(0)
    graph_b64 = base64.b64encode(buf.getvalue()).decode()
    return jsonify({"graph": graph_b64}), 200

# -------------------------------
# ML-BASED ADVICE
# -------------------------------
@app.route('/api/advice', methods=['GET'])
@token_required
def get_expense_advice(current_user):
    try:
        # Optionally, trigger training first (if needed):
        train_resp = requests.post("http://localhost:8080/train/")
        if train_resp.status_code != 200:
            return jsonify({"error": "Training failed"}), 500
        # Now trigger prediction
        predict_resp = requests.post("http://localhost:8080/predict/")
        if predict_resp.status_code != 200:
            return jsonify({"error": "Prediction failed"}), 500
        # Assume ML service returns JSON with {"recommendations": [...]}
        return jsonify(predict_resp.json()), 200
    except Exception as e:
        return jsonify({"error": f"Internal error: {str(e)}"}), 500
# -------------------------------
# TAX ADVISOR
# -------------------------------
@app.route('/api/tax_advice', methods=['GET'])
@token_required
def get_tax_advice(current_user):
    incomes = Income.query.filter_by(user_id=current_user.id).all()
    total_income = sum(i.amount for i in incomes)

    STANDARD_DEDUCTION = 50000 
    taxable_income = max(total_income - STANDARD_DEDUCTION, 0)
    # Function to calculate tax liability based on the new tax slabs
    def calculate_tax(amount):
        tax = 0
        if amount <= 300000:
            tax = 0
        elif amount <= 700000:
            tax = (amount - 300000) * 0.05
        elif amount <= 1000000:
            tax = ((700000 - 300000) * 0.05) + ((amount - 700000) * 0.10)
        elif amount <= 1200000:
            tax = ((700000 - 300000) * 0.05) + ((1000000 - 700000) * 0.10) + ((amount - 1000000) * 0.15)
        elif amount <= 1500000:
            tax = ((700000 - 300000) * 0.05) + ((1000000 - 700000) * 0.10) + ((1200000 - 1000000) * 0.15) + ((amount - 1200000) * 0.20)
        else:
            tax = ((700000 - 300000) * 0.05) + ((1000000 - 700000) * 0.10) + ((1200000 - 1000000) * 0.15) + ((1500000 - 1200000) * 0.20) + ((amount - 1500000) * 0.30)
        return tax
    # Calculate the estimated tax liability based on taxable income
    tax_liability = calculate_tax(taxable_income)
    # Tax-saving tips for the user
    tips = [
        "Claim the Standard Deduction of ₹50,000 under Section 16.",
        "Invest up to ₹1,50,000 under Section 80C (e.g., PPF, ELSS, EPF, etc.).",
        "Claim health insurance premium deduction under Section 80D.",
        "Consider HRA (House Rent Allowance) exemption if you live in a rented house."
    ]
    return jsonify({
        "total_income": total_income,
        "standard_deduction": STANDARD_DEDUCTION,
        "taxable_income_estimate": taxable_income,
        "tax_liability_estimate": tax_liability,
        "tips": tips
    }), 200
# -------------------------------
# INVESTMENT ADVISOR
# -------------------------------
@app.route('/api/investment_advice', methods=['GET'])
@token_required  
def get_investment_advice(current_user):
    total_income = sum(i.amount for i in current_user.income)
    total_expenses = sum(e.amount for e in current_user.expenses)
    savings = max(total_income - total_expenses, 0)
    risk = request.args.get('risk', 'medium').lower()
        # risk
    if risk == 'low':
        # Low risk:
        allocations = {"FD": 0.6, "PPF": 0.3, "Debt MF": 0.1}
    elif risk == 'high':
        # High risk: 
        allocations = {"Equity MF": 0.6, "Gold": 0.2, "PPF": 0.2}
    else:
        # Medium or default risk: 
        allocations = {"Equity MF": 0.4, "PPF": 0.3, "FD": 0.3}
    # Prepare investment suggestions by applying the allocation percentages to the available savings.
    suggestions = {instrument: round(percentage * savings, 2) 
                   for instrument, percentage in allocations.items()}
    # Return the calculated investment advice as JSON.
    return jsonify({
        "total_income": total_income,
        "total_expenses": total_expenses,
        "savings": savings,
        "risk_profile": risk,
        "suggestions": suggestions
    }), 200
# -------------------------------
# FIX EXPENSE DATES (one‑time)
# -------------------------------
def fix_expense_dates():
    rows = db.session.execute(text("SELECT id, date FROM expense")).fetchall()
    fixed = 0
    skipped = 0
    for eid, date_val in rows:
        if isinstance(date_val, str):
            for fmt in ('%m-%d-%Y', '%m/%d/%Y'):
                try:
                    parsed_date = datetime.strptime(date_val, fmt)
                    # Update the record with the correctly parsed date
                    db.session.execute(text("UPDATE expense SET date=:date WHERE id=:id"),{"date": parsed_date, "id": eid})
                    fixed += 1
                    break
                except ValueError:
                    continue
            else:
                skipped += 1
    db.session.commit()
    print(f"Fixed: {fixed}, Skipped: {skipped}")

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        fix_expense_dates()
    app.run(port=5000, debug=True)