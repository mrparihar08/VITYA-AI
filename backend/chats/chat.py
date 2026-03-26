from fastapi import APIRouter, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.api.database import get_db
from backend.api.models.vitya import User
from backend.api.auth import token_required

from backend.chats.rules import get_reply
from backend.chats.chatbot import chatbot_reply

from backend.api.routes.vitya import (
    download_expenses_csv,
    download_incomes_csv
)

from backend.chats.FileCreator import (
    generate_csv_from_text,
    generate_doc_from_text,
    generate_pdf_from_text,
    generate_ppt_from_text
)

# ✅ Proper Request Model
class ChatRequest(BaseModel):
    message: str


router = APIRouter()


# ---------------- MAIN CHAT ---------------- #
@router.post("/")
def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(token_required)
):
    user_message = request.message
    msg = user_message.lower().strip()

    # ✅ Title auto (first sentence)
    title = user_message[:50]

    # ================= CSV ================= #
    if any(word in msg for word in ["csv", "excel"]):

        if any(word in msg for word in ["expense", "expenses", "cost"]):
            return download_expenses_csv(current_user)

        elif any(word in msg for word in ["income", "revenue", "incomes"]):
            return download_incomes_csv(current_user)

        csv_file = generate_csv_from_text(user_message, user_title=title)

        return StreamingResponse(
            csv_file,
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=chat_data.csv"
            }
        )

    # ================= DOC ================= #
    elif any(word in msg for word in ["doc", "word", "document"]):

        doc_file = generate_doc_from_text(user_message, user_title=title)

        return StreamingResponse(
            doc_file,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": "attachment; filename=chat_data.docx"
            }
        )

    # ================= PDF ================= #
    elif "pdf" in msg:

        pdf_file = generate_pdf_from_text(user_message, user_title=title)

        return StreamingResponse(
            pdf_file,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=chat_data.pdf"
            }
        )

    # ================= PPT ================= #
    elif any(word in msg for word in ["ppt", "powerpoint", "slides"]):

        ppt_file = generate_ppt_from_text(user_message, user_title=title)

        return StreamingResponse(
            ppt_file,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            headers={
                "Content-Disposition": "attachment; filename=chat_data.pptx"
            }
        )

    # ================= CHATBOT ================= #
    reply = chatbot_reply(user_message, db, current_user, background_tasks)

    if not reply:
        reply = get_reply(user_message)

    return {"reply": reply} if isinstance(reply, str) else reply