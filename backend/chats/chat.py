from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
import io
import csv

from api.database import get_db
from api.models.vitya import User
from api.auth import token_required
from chats.rules import get_reply
from chats.chatbot import chatbot_reply
from api.routes.vitya import download_expenses_csv
class ChatRequest(BaseModel):
    message: str

router = APIRouter(prefix="/chat", tags=["chat"])


# ✅ CSV Generator
def generate_csv_from_text(text: str):
    import io, csv, re

    output = io.StringIO()
    writer = csv.writer(output)

    data = {}

    # 🔥 सही parsing (key:value)
    matches = re.findall(r'(\w+)\s*:\s*(.*?)(?=\s+\w+\s*:|$)', text)

    max_len = 0

    for key, value in matches:
        values = re.findall(r'[A-Za-z0-9]+', value)
        data[key] = values
        max_len = max(max_len, len(values))

    # ✅ Header (keys as columns)
    headers = list(data.keys())
    writer.writerow(headers)

    # ✅ Rows बनाओ (transpose)
    for i in range(max_len):
        row = []
        for key in headers:
            row.append(data[key][i] if i < len(data[key]) else "")
        writer.writerow(row)

    output.seek(0)
    return output

# ---------------- MAIN CHAT ---------------- #
@router.post("/")
def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(token_required)
):
    user_message = request.message
    msg = user_message.lower()

    # ✅ CSV trigger
    if "create csv file of" in msg or "generate csv of" in msg or "export csv of" in msg or "download csv of" in msg or "give me csv of" in msg:
        if "my expense csv" in msg or "my expenses download" in msg or "my expenses" in msg:
            return download_expenses_csv(current_user)

        csv_file = generate_csv_from_text(user_message)

        return StreamingResponse(
                csv_file,
             media_type="text/csv",
             headers={
            "Content-Disposition": "attachment; filename=chat_data.csv"
        }
    )

    # ✅ chatbot logic
    reply = chatbot_reply(user_message, db, current_user)

    if not reply:
        reply = get_reply(user_message)

    return {"reply": reply} if isinstance(reply, str) else reply