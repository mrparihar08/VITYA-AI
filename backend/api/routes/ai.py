from unittest import result
from fastapi import APIRouter, Depends, HTTPException
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func
import numpy as np
from sklearn.linear_model import LinearRegression
from api.database import get_db
from api.models.vitya import Expense ,Income
from api.schemas.ai_schema import TrainRequest
from api.auth import token_required


router = APIRouter(prefix="/ai", tags=["AI"])

@router.get("/predict/{category}")
def predict_expense(category: str, 
                    current_user = Depends(token_required), 
                    db: Session = Depends(get_db)):

    expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        Expense.category == category
    ).order_by(Expense.date).all()

    if len (expenses)<3:
        raise HTTPException(status_code=400, detail="Not enough data for prediction..")
    amounts = [e.amount for e in expenses]

    X = np.array(range(len(amounts))).reshape(-1,1)
    y = np.array(amounts)
    model = LinearRegression()
    model.fit(X,y)
    next_mouth = model.predict([[len(amounts)]])

    return {"category": category,
            "predicted_next_month_expense": float(next_mouth[0])}


@router.get("/overspending/{category}")
def detect_overspending(category: str, 
                    current_user = Depends(token_required), 
                    db: Session = Depends(get_db)):

    expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        Expense.category == category
    ).order_by(Expense.date).all()

    if len (expenses)<3:
        raise HTTPException(status_code=404, detail="Not expense data..")
    amounts = [e.amount for e in expenses]

    avg = sum(amounts)/len(amounts)
    last = amounts[-1]

    return {"average_spending " : avg,
            "last_spending":last,
            "overspending": last>avg*1.5}

@router.get("/waste-analysis")
def waste_analysis(current_user = Depends(token_required), db: Session = Depends(get_db)):

    expenses = db.query(Expense.category, func.sum(Expense.amount).label("total")).filter(
        Expense.user_id == current_user.id
    ).group_by(Expense.category).all()
    
    totals = [total for _, total in expenses]
    avg = sum(totals)/len(totals)
    result = []
    for category, total in expenses:
        status = "normal"

        if total > avg*1.5:
            status = "high_spending"
        result.append({"category": category, "total_spent": total, "status": status})
    
    return result

@router.get("/budget-plan")
def budget_plan(current_user = Depends(token_required), db: Session = Depends(get_db)):

    income = db.query(func.sum(Income.amount)).filter(
        Income.user_id == current_user.id
    ).scalar() or 0

    if not income:
        raise HTTPException(status_code=404, detail="No income data..")
    
    expenses = db.query(Expense.category, func.sum(Expense.amount).label("total")).filter(
        Expense.user_id == current_user.id
    ).group_by(Expense.category).all()

    if not expenses:
        raise HTTPException(status_code=404, detail="No expense data..")

    total_expenses = sum(total for _, total in expenses)
    savings = income * 0.2
    usable = income - savings

    plan = []

    for category, amount in expenses:
        share = amount / total_expenses if total_expenses > 0 else 0
        budget = share * usable
        plan.append({"category": category, 
                     "previous_spending": amount,
                     "suggested_budget": round(budget, 2)
                     })
    
    return {
        "total_income": income,
        "total_expenses": total_expenses,
        "usable_funds": round(usable, 2),
        "suggested_savings": round(savings, 2),
        "budget_plan": plan
    }
@router.get("/advisor/{category}")
def financial_advisor(category: str, db: Session = Depends(get_db)):

    expenses = db.query(Expense).filter(
        Expense.category == category
    ).order_by(Expense.date).all()

    if len(expenses) < 3:
        return {"message": "Not enough data"}

    amounts = [e.amount for e in expenses]

    avg = sum(amounts) / len(amounts)
    last = amounts[-1]

    if last > avg:
        advice = "Your spending is increasing. Try reducing expenses."
    elif last < avg:
        advice = "Good job! Spending is under control."
    else:
        advice = "Spending is stable."

    return {
        "category": category,
        "average_spending": avg,
        "last_expense": last,
        "recommended_budget": avg * 1.2,
        "advice": advice
    }
from sqlalchemy import func

@router.get("/monthly-trend")
def monthly_trend(db: Session = Depends(get_db)):

    data = db.query(
        func.strftime("%Y-%m", Expense.date).label("month"),
        func.sum(Expense.amount),
    ).group_by("month").all()

    result = []

    for month, total in data:
        result.append({
            "month": month,
            "total_expense": total
        })

    return result

@router.get("/anomaly/{category}")
def anomaly_detection(category: str, db: Session = Depends(get_db)):

    expenses = db.query(Expense).filter(
        Expense.category == category
    ).all()

    amounts = [e.amount for e in expenses]

    if len(amounts) < 5:
        return {"message": "Not enough data"}

    avg = sum(amounts) / len(amounts)

    anomalies = []

    for e in expenses:
        if e.amount > avg * 2:
            anomalies.append({
                "amount": e.amount,
                "date": e.date
            })

    return {
        "average_expense": avg,
        "anomalies": anomalies
    }