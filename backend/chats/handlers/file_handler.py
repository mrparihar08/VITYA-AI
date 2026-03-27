from fastapi.responses import StreamingResponse

from backend.api.routes.vitya import (
    download_expenses_csv,
    download_incomes_csv,
)

from backend.chats.utils.FileCreator import (
    generate_csv_from_text,
    generate_doc_from_text,
    generate_pdf_from_text,
    generate_ppt_from_text,
)


def handle_file_request(msg, user_message, current_user):
    title = user_message[:50] if user_message else "chat_data"

    # CSV
    if any(word in msg for word in ["csv", "excel"]):
        if any(word in msg for word in ["expense", "expenses"]):
            return download_expenses_csv(current_user)

        if any(word in msg for word in ["income", "revenues"]):
            return download_incomes_csv(current_user)

        file = generate_csv_from_text(user_message, user_title=title)
        return StreamingResponse(
            file,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=chat_data.csv"},
        )

    # DOC
    if any(word in msg for word in ["doc", "word", "document"]):
        file = generate_doc_from_text(user_message, user_title=title)
        return StreamingResponse(
            file,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": "attachment; filename=chat_data.docx"},
        )

    # PDF
    if "pdf" in msg:
        file = generate_pdf_from_text(user_message, user_title=title)
        return StreamingResponse(
            file,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=chat_data.pdf"},
        )

    # PPT
    if any(word in msg for word in ["ppt", "powerpoint", "slides"]):
        file = generate_ppt_from_text(user_message, user_title=title)
        return StreamingResponse(
            file,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            headers={"Content-Disposition": "attachment; filename=chat_data.pptx"},
        )

    return None