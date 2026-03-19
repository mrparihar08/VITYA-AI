from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.database import get_db
from api.models.vitya import User
from api.auth import token_required
from chats.chatbot import chatbot_reply   # 👈 import your logic


class ChatRequest(BaseModel):
    message: str

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/")
def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),              # ✅ DB added
    current_user: User = Depends(token_required)
):
    user_message = request.message

    # ✅ Call your chatbot logic
    reply = chatbot_reply(user_message, db, current_user)

    return {
        "user_message": user_message,
        "bot_reply": reply
    }