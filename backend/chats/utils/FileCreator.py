import csv
import io
import re
import base64
from typing import Dict, List, Tuple, Optional, Iterable

import qrcode
import barcode
from barcode.writer import ImageWriter

from docx import Document
from docx.shared import Pt
from pptx import Presentation
from pptx.util import Inches, Pt as PPTPt
from pptx.dml.color import RGBColor

from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
)
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER


# =========================================================
# Generic helpers
# =========================================================

def normalize_text(text: Optional[str]) -> str:
    return (text or "").strip()


def extract_title(text: str, user_title: Optional[str] = None) -> str:
    """
    Title priority:
    1) user_title if provided
    2) first sentence from input text
    3) first non-empty line
    4) default title
    """
    if user_title and user_title.strip():
        return user_title.strip()[:120]

    text = normalize_text(text)
    if not text:
        return "Chat Data Report"

    # First sentence
    sentence_match = re.search(r"(.+?[\.\!\?])(\s|$)", text, flags=re.S)
    if sentence_match:
        return sentence_match.group(1).strip()[:120]

    # First line
    first_line = next((line.strip() for line in text.splitlines() if line.strip()), "")
    return first_line[:120] if first_line else "Chat Data Report"


def make_safe_filename(title: str, default: str = "chat_data") -> str:
    title = normalize_text(title)
    if not title:
        return default

    title = re.sub(r"[^\w\s\-]", "", title, flags=re.UNICODE)
    title = re.sub(r"\s+", "_", title).strip("_")
    return title[:60] if title else default


def is_bullet_line(line: str) -> bool:
    return bool(re.match(r"^\s*[-*•]\s+", line or ""))


def split_cell_values(raw_value: str) -> List[str]:
    """
    Split on strong separators only.
    Example:
      "a, b, c" -> ["a", "b", "c"]
      "John Doe" -> ["John Doe"]
    """
    raw_value = normalize_text(raw_value)
    if not raw_value:
        return [""]

    parts = re.split(r"\s*[,;\n|]\s*", raw_value)
    parts = [p.strip() for p in parts if p.strip()]
    return parts if parts else [raw_value]


def split_text_into_chunks(text: str, max_chars: int = 350) -> List[str]:
    """
    Split long text into readable chunks by paragraph and sentence.
    """
    text = normalize_text(text)
    if not text:
        return []

    paragraphs = [p.strip() for p in text.splitlines() if p.strip()]
    chunks: List[str] = []

    for para in paragraphs:
        if len(para) <= max_chars:
            chunks.append(para)
            continue

        sentences = re.split(r"(?<=[.!?])\s+", para)
        current = ""

        for sent in sentences:
            sent = sent.strip()
            if not sent:
                continue

            if not current:
                current = sent
                continue

            if len(current) + len(sent) + 1 <= max_chars:
                current = f"{current} {sent}"
            else:
                chunks.append(current.strip())
                current = sent

        if current.strip():
            chunks.append(current.strip())

    return chunks


def text_to_bullets(text: str) -> List[str]:
    lines = [line.strip() for line in (text or "").splitlines() if line.strip()]
    bullets: List[str] = []

    for line in lines:
        if is_bullet_line(line):
            bullets.append(re.sub(r"^\s*[-*•]\s+", "", line).strip())
        else:
            bullets.append(line)

    return bullets


def safe_placeholder_text(slide, index: int, value: str) -> bool:
    try:
        if len(slide.placeholders) > index:
            slide.placeholders[index].text = value
            return True
    except Exception:
        pass
    return False


def _looks_like_key_value_text(text: str) -> bool:
    """
    Avoid false positives on ordinary sentences that contain a colon.
    We treat text as structured when there are 2+ key:value lines.
    """
    lines = [line.strip() for line in normalize_text(text).splitlines() if line.strip()]
    key_value_lines = 0

    for line in lines:
        if re.match(r"^[^:\n]{1,80}\s*:\s*.+$", line):
            key_value_lines += 1

    return key_value_lines >= 2


def get_table_header_and_rows(text: str) -> Tuple[List[str], List[List[str]]]:
    """
    Parse:
    - key:value structured text into table headers + rows
    - otherwise fallback to single-column content rows
    """
    text = normalize_text(text)
    if not text:
        return ["Content"], [[""]]

    if _looks_like_key_value_text(text):
        pattern = re.compile(
            r"([^\n:]+?)\s*:\s*(.*?)(?=(?:\n\s*[^\n:]+?\s*:)|\Z)",
            flags=re.S,
        )
        matches = list(pattern.finditer(text))

        if matches:
            data: Dict[str, List[str]] = {}
            max_len = 0

            for match in matches:
                key = match.group(1).strip()
                value = match.group(2).strip()
                values = split_cell_values(value)
                data[key] = values
                max_len = max(max_len, len(values))

            headers = list(data.keys())
            rows: List[List[str]] = []

            for i in range(max_len):
                row = []
                for key in headers:
                    values = data.get(key, [])
                    row.append(values[i] if i < len(values) else "")
                rows.append(row)

            return headers, rows

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return ["Content"], [[""]]

    # One paragraph -> split into sentences for better readability
    if len(lines) == 1:
        parts = re.split(r"(?<=[.!?])\s+", lines[0])
        parts = [p.strip() for p in parts if p.strip()]
        if not parts:
            parts = [lines[0]]
        return ["Content"], [[p] for p in parts]

    return ["Content"], [[line] for line in lines]


# =========================================================
# CSV
# =========================================================

def generate_csv_from_text(text: str, user_title: Optional[str] = None):
    headers, rows = get_table_header_and_rows(text)
    title = extract_title(text, user_title)

    # utf-8-sig works better in Excel
    output = io.StringIO(newline="")
    writer = csv.writer(output)

    writer.writerow([title])
    writer.writerow([])
    writer.writerow(headers)

    for row in rows:
        writer.writerow(row)

    output.seek(0)
    return output


# =========================================================
# DOCX
# =========================================================

def generate_doc_from_text(text: str, user_title: Optional[str] = None):
    headers, rows = get_table_header_and_rows(text)
    title = extract_title(text, user_title)

    document = Document()

    heading = document.add_heading(title, 0)
    heading.alignment = 1

    subtitle = document.add_paragraph("Generated from user text")
    subtitle.alignment = 1

    if headers == ["Content"]:
        for row in rows:
            p = document.add_paragraph()
            run = p.add_run(row[0] if row else "")
            run.font.size = Pt(11)
    else:
        table = document.add_table(rows=1 + len(rows), cols=len(headers))
        table.style = "Table Grid"

        header_cells = table.rows[0].cells
        for col, key in enumerate(headers):
            header_cells[col].text = str(key)

        for i, row in enumerate(rows, start=1):
            for col in range(len(headers)):
                value = row[col] if col < len(row) else ""
                table.rows[i].cells[col].text = str(value)

    file_stream = io.BytesIO()
    document.save(file_stream)
    file_stream.seek(0)
    return file_stream


# =========================================================
# PDF
# =========================================================

def _build_pdf_styles():
    styles = getSampleStyleSheet()

    if "CenterTitle" not in styles:
        styles.add(
            ParagraphStyle(
                name="CenterTitle",
                parent=styles["Title"],
                alignment=TA_CENTER,
                fontSize=18,
                leading=22,
                spaceAfter=12,
            )
        )

    if "SmallBody" not in styles:
        styles.add(
            ParagraphStyle(
                name="SmallBody",
                parent=styles["BodyText"],
                fontSize=9,
                leading=11,
                spaceAfter=4,
                alignment=TA_LEFT,
            )
        )

    if "SmallBullet" not in styles:
        styles.add(
            ParagraphStyle(
                name="SmallBullet",
                parent=styles["BodyText"],
                fontSize=10,
                leading=12,
                leftIndent=12,
                firstLineIndent=-8,
                spaceAfter=3,
            )
        )

    return styles


def generate_pdf_from_text(text: str, user_title: Optional[str] = None):
    headers, rows = get_table_header_and_rows(text)
    title = extract_title(text, user_title)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        leftMargin=24,
        rightMargin=24,
        topMargin=24,
        bottomMargin=24,
    )

    styles = _build_pdf_styles()
    elements = []

    elements.append(Paragraph(title, styles["CenterTitle"]))
    elements.append(Paragraph("Generated from user text", styles["BodyText"]))
    elements.append(Spacer(1, 12))

    if headers == ["Content"]:
        for row in rows:
            text_line = row[0] if row else ""
            if is_bullet_line(text_line):
                text_line = re.sub(r"^\s*[-*•]\s+", "", text_line).strip()
            elements.append(Paragraph(text_line, styles["SmallBody"]))
            elements.append(Spacer(1, 4))

        doc.build(elements)
        buffer.seek(0)
        return buffer

    table_data = []
    table_data.append([Paragraph(str(h), styles["Heading5"]) for h in headers])

    for row in rows:
        row_cells = []
        for cell in row:
            row_cells.append(Paragraph(str(cell), styles["SmallBody"]))
        table_data.append(row_cells)

    table = Table(table_data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4B5563")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("GRID", (0, 0), (-1, -1), 0.75, colors.black),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("LEADING", (0, 0), (-1, -1), 11),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )

    elements.append(table)
    doc.build(elements)
    buffer.seek(0)
    return buffer


# =========================================================
# PPTX
# =========================================================

def set_slide_background(slide, rgb_hex: str = "F8FAFC"):
    try:
        fill = slide.background.fill
        fill.solid()
        fill.fore_color.rgb = RGBColor.from_string(rgb_hex)
    except Exception:
        pass


def _safe_set_shape_text(shape, text: str, font_size: int = 24, bold: bool = False, color=(17, 24, 39)):
    try:
        if not shape:
            return
        if not getattr(shape, "has_text_frame", False):
            return

        tf = shape.text_frame
        tf.clear()
        p = tf.paragraphs[0]
        p.text = text
        p.font.size = PPTPt(font_size)
        p.font.bold = bold
        p.font.color.rgb = RGBColor(*color)
    except Exception:
        pass


def _find_body_placeholder(slide):
    for ph in slide.placeholders:
        try:
            if ph.placeholder_format.idx == 1:
                return ph
        except Exception:
            continue
    return None


def add_footer(slide, footer_text: str, slide_no: Optional[int] = None):
    try:
        left = Inches(0.4)
        top = Inches(6.85)
        width = Inches(9.0)
        height = Inches(0.3)

        tx = slide.shapes.add_textbox(left, top, width, height)
        tf = tx.text_frame
        p = tf.paragraphs[0]
        p.text = footer_text + (f"  |  Slide {slide_no}" if slide_no is not None else "")
        p.font.size = PPTPt(10)
        p.font.color.rgb = RGBColor(100, 116, 139)
    except Exception:
        pass


def add_title_slide(prs: Presentation, title: str, subtitle: str = "Generated from user text"):
    slide = prs.slides.add_slide(prs.slide_layouts[0])
    set_slide_background(slide)

    if slide.shapes.title:
        _safe_set_shape_text(slide.shapes.title, title, font_size=24, bold=True)

    # Subtitle placeholder may not exist in every template
    safe_placeholder_text(slide, 1, subtitle)
    return slide


def add_bullet_slide(prs: Presentation, slide_title: str, bullets: List[str], footer_text: str = ""):
    slide = prs.slides.add_slide(prs.slide_layouts[1])
    set_slide_background(slide)

    if slide.shapes.title:
        _safe_set_shape_text(slide.shapes.title, slide_title, font_size=22, bold=True)

    body = _find_body_placeholder(slide)
    if body:
        tf = body.text_frame
        tf.clear()
        tf.word_wrap = True

        for i, bullet in enumerate(bullets):
            bullet = normalize_text(bullet)
            if not bullet:
                continue
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.text = bullet
            p.level = 0
            p.font.size = PPTPt(18)
            p.font.color.rgb = RGBColor(31, 41, 55)

    if footer_text:
        add_footer(slide, footer_text)

    return slide


def add_text_slide(prs: Presentation, slide_title: str, text: str, footer_text: str = ""):
    slide = prs.slides.add_slide(prs.slide_layouts[1])
    set_slide_background(slide)

    if slide.shapes.title:
        _safe_set_shape_text(slide.shapes.title, slide_title, font_size=22, bold=True)

    body = _find_body_placeholder(slide)
    if body:
        tf = body.text_frame
        tf.clear()
        tf.word_wrap = True

        lines = [line.strip() for line in (text or "").splitlines() if line.strip()]
        if len(lines) > 1:
            for i, line in enumerate(lines):
                p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
                p.text = re.sub(r"^\s*[-*•]\s+", "", line).strip()
                p.level = 0
                p.font.size = PPTPt(16)
                p.font.color.rgb = RGBColor(31, 41, 55)
        else:
            p = tf.paragraphs[0]
            p.text = text or ""
            p.font.size = PPTPt(16)
            p.font.color.rgb = RGBColor(31, 41, 55)

    if footer_text:
        add_footer(slide, footer_text)

    return slide


def add_row_slide(prs: Presentation, slide_title: str, headers: List[str], row: List[str], footer_text: str = ""):
    slide = prs.slides.add_slide(prs.slide_layouts[1])
    set_slide_background(slide)

    if slide.shapes.title:
        _safe_set_shape_text(slide.shapes.title, slide_title, font_size=22, bold=True)

    body = _find_body_placeholder(slide)
    if body:
        tf = body.text_frame
        tf.clear()
        tf.word_wrap = True

        for i, key in enumerate(headers):
            value = row[i] if i < len(row) else ""
            line = f"{key}: {value}".strip()
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.text = line
            p.level = 0
            p.font.size = PPTPt(16)
            p.font.color.rgb = RGBColor(31, 41, 55)

    if footer_text:
        add_footer(slide, footer_text)

    return slide


def generate_ppt_from_text(
    text: str,
    user_title: Optional[str] = None,
    max_chars: int = 350,
    add_summary_slide: bool = True,
    add_closing_slide: bool = True,
):
    headers, rows = get_table_header_and_rows(text)
    title = extract_title(text, user_title)

    prs = Presentation()

    add_title_slide(prs, title)

    if add_summary_slide:
        summary_lines = [
            f"Total content rows: {len(rows)}",
            f"Mode: {'Plain text' if headers == ['Content'] else 'Structured data'}",
            f"Source length: {len(normalize_text(text))} characters",
        ]
        add_bullet_slide(prs, "Overview", summary_lines, footer_text="Auto-generated presentation")

    if headers == ["Content"]:
        chunks = split_text_into_chunks(text, max_chars=max_chars)
        if not chunks:
            chunks = ["No content provided."]

        for i, chunk in enumerate(chunks, start=1):
            lines = [line.strip() for line in chunk.splitlines() if line.strip()]
            if len(lines) > 1 and any(is_bullet_line(line) for line in lines):
                bullets = text_to_bullets(chunk)
                add_bullet_slide(prs, f"Point {i}", bullets, footer_text="Generated from user text")
            else:
                add_text_slide(prs, f"Point {i}", chunk, footer_text="Generated from user text")
    else:
        for i, row in enumerate(rows, start=1):
            add_row_slide(prs, f"Row {i}", headers, row, footer_text="Generated from user text")

    if add_closing_slide:
        # Use a safe default blank slide instead of depending too much on layout 5 naming.
        slide = prs.slides.add_slide(prs.slide_layouts[5]) if len(prs.slide_layouts) > 5 else prs.slides.add_slide(prs.slide_layouts[1])
        set_slide_background(slide)
        if slide.shapes.title:
            _safe_set_shape_text(slide.shapes.title, "Thank You", font_size=24, bold=True)
        add_footer(slide, "Generated from user text")

    buffer = io.BytesIO()
    prs.save(buffer)
    buffer.seek(0)
    return buffer


# =========================================================
# QR and Barcode
# =========================================================

def generate_qr(data: str) -> str:
    qr = qrcode.make(data)
    buffer = io.BytesIO()
    qr.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def generate_barcode(data: str) -> str:
    CODE128 = barcode.get_barcode_class("code128")
    code = CODE128(data, writer=ImageWriter())
    buffer = io.BytesIO()
    code.write(buffer)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


# =========================================================
# Combined generator
# =========================================================

def generate_all_files(text: str, user_title: Optional[str] = None):
    return {
        "csv": generate_csv_from_text(text, user_title=user_title),
        "docx": generate_doc_from_text(text, user_title=user_title),
        "pdf": generate_pdf_from_text(text, user_title=user_title),
        "pptx": generate_ppt_from_text(text, user_title=user_title),
    }
