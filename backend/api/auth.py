

from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.api.database import get_db
from backend.api.models.vitya import User

SECRET_KEY = "supersecret"
ALGORITHM = "HS256"

security = HTTPBearer()

# ✅ CREATE TOKEN
def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(hours=24)  # 24h expiry
    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ✅ VERIFY TOKEN
def token_required(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # ✅ IMPORTANT: same key everywhere
        user_id = payload.get("user_id")

        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        current_user = db.query(User).filter(User.id == user_id).first()

        if current_user is None:
            raise HTTPException(status_code=401, detail="User not found")

        return current_user

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Token is invalid or expired"
        )