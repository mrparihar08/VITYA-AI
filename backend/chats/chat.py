from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.api.database import get_db
from backend.api.models.vitya import User
from backend.api.auth import token_required

from backend.chats.news import (
    fetch_news,
    extract_news_query,
    extract_wiki_title,
    detect_news_category,
)

from backend.chats.rules import get_reply
from backend.chats.chatbot import chatbot_reply
from backend.chats.services import wikipedia_service

from backend.api.routes.vitya import (
    download_expenses_csv,
    download_incomes_csv,
)

from backend.chats.FileCreator import (
    generate_csv_from_text,
    generate_doc_from_text,
    generate_pdf_from_text,
    generate_ppt_from_text,
)

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


@router.post("/")
def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(token_required),
):
    user_message = request.message
    msg = user_message.lower().strip()
    title = user_message[:50]

    # ================= CSV ================= #
    if any(word in msg for word in ["csv", "excel"]):
        if any(word in msg for word in ["expense", "expenses"]):
            return download_expenses_csv(current_user)

        elif any(word in msg for word in ["income", "revenues"]):
            return download_incomes_csv(current_user)

        csv_file = generate_csv_from_text(user_message, user_title=title)
        return StreamingResponse(
            csv_file,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=chat_data.csv"},
        )

    # ================= DOC ================= #
    elif any(word in msg for word in ["doc", "word", "document"]):
        doc_file = generate_doc_from_text(user_message, user_title=title)
        return StreamingResponse(
            doc_file,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": "attachment; filename=chat_data.docx"},
        )

    # ================= PDF ================= #
    elif "pdf" in msg:
        pdf_file = generate_pdf_from_text(user_message, user_title=title)
        return StreamingResponse(
            pdf_file,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=chat_data.pdf"},
        )

    # ================= PPT ================= #
    elif any(word in msg for word in ["ppt", "powerpoint", "slides"]):
        ppt_file = generate_ppt_from_text(user_message, user_title=title)
        return StreamingResponse(
            ppt_file,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            headers={"Content-Disposition": "attachment; filename=chat_data.pptx"},
        )

    # ================= NEWS ================= #
    elif "news" in msg:
        category_name = detect_news_category(user_message)
        query = extract_news_query(user_message)

        try:
            news_data = fetch_news(category=category_name, q=query, limit=5)
        except HTTPException:
            raise
        except Exception:
            return {
                "type": "text",
                "content": "News fetch error 😢",
            }

        if not news_data:
            return {
                "type": "text",
                "content": "News nahi mili 😢",
            }

        return {
            "type": "news",
            "category": category_name,
            "query": query,
            "content": news_data,
        }

    # ================= WIKI ================= #
    elif any(word in msg for word in ["wiki", "wikipedia", "who is", "what is", "tell me about"]):
        try:
            wiki_title = extract_wiki_title(user_message)

            if not wiki_title:
                return {
                    "type": "text",
                    "content": "Wikipedia ke liye query do 🤔",
                }

            data = wikipedia_service.get_complete(wiki_title)

            if not data or data.get("error"):
                return {
                    "type": "text",
                    "content": f"'{wiki_title}' ke liye Wikipedia data nahi mila 😢",
                }

            return {
                "type": "wiki",
                "content": {
                    "title": data.get("title"),
                    "summary": data.get("summary"),
                    "image": data.get("image"),
                    "images": data.get("images", []),
                    "url": data.get("url"),
                },
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # ================= CHATBOT ================= #
    reply = chatbot_reply(user_message, db, current_user)

    if not reply:
        reply = get_reply(user_message)

    return {
        "type": "chat",
        "reply": reply if isinstance(reply, str) else reply,
    }