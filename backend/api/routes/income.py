from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from api.database import get_db
from api.models.vitya import Income, User
from api.schemas.vitya import IncomeCreate
from api.auth import token_required
from datetime import datetime

router = APIRouter(prefix="/income", tags=["income"])


@router.post("/")
def add_income(
    data: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(token_required)
):

    date_value = data.date if data.date else datetime.utcnow()

    try:
        inc = Income(
            amount=data.amount,
            source=data.source,
            date=date_value,
            user_id=current_user.id
        )

        db.add(inc)
        db.commit()
        db.refresh(inc)

        return {
            "message": "Income added successfully",
            "income_id": inc.id
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Income creation failed: {str(e)}"
        )