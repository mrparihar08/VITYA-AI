from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from sqlalchemy.exc import IntegrityError
from jose import jwt
from passlib.context import CryptContext

from api.database import get_db
from api.models.vitya import User
from api.schemas.vitya import Register, Login
from api.auth import SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/users", tags=["users"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# -------------------------
# REGISTER
# -------------------------
@router.get("/register")
def get_reguster():
    return{"massage":"i am pass"}
@router.post("/register")
def register(data: Register, db: Session = Depends(get_db)):

    # check username
    existing_user = db.query(User).filter(User.username == data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # check email
    existing_email = db.query(User).filter(User.email == data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already taken"
        )

    hashed_password = pwd_context.hash(data.password)

    user = User(
        username=data.username,
        email=data.email,
        password=hashed_password
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists"
        )

    payload = {
        "user_id": user.id,
        "exp": datetime.utcnow() + timedelta(hours=48)
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    return {
        "message": "User registered successfully",
        "token": token
    }


# -------------------------
# LOGIN
# -------------------------
@router.post("/login")
def login(data: Login, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.username == data.username).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    if not pwd_context.verify(data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    payload = {
        "user_id": user.id,
        "exp": datetime.utcnow() + timedelta(hours=48)
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    return {
        "message": "Login successful",
        "token": token
    }