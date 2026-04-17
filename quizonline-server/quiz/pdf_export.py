# quiz/pdf_export.py
"""
PDF export for quiz results.

Endpoint: GET /api/quiz/{quiz_id}/export-pdf/
Generates a formatted PDF report of a user's quiz attempt.
"""

import io
import re
from html.parser import HTMLParser

from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from .models import Quiz


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class _HTMLStripper(HTMLParser):
    """Minimal HTML tag stripper."""

    def __init__(self):
        super().__init__()
        self._parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self._parts.append(data)

    def get_text(self) -> str:
        return "".join(self._parts)


def strip_html(value: str) -> str:
    """Remove HTML tags from *value*, returning plain text."""
    if not value:
        return ""
    stripper = _HTMLStripper()
    stripper.feed(value)
    return stripper.get_text().strip()


def _get_translation(obj, field: str, language: str) -> str:
    """
    Retrieve a translated field from a django-parler TranslatableModel.
    Falls back to any available language.
    """
    text = obj.safe_translation_getter(field, language_code=language, any_language=True)
    return strip_html(text or "")


def _fmt_datetime(dt) -> str:
    if dt is None:
        return "-"
    return timezone.localtime(dt).strftime("%Y-%m-%d %H:%M")


# ---------------------------------------------------------------------------
# PDF generation
# ---------------------------------------------------------------------------

# Colour palette
_HEADER_BG = colors.HexColor("#1a237e")
_HEADER_FG = colors.white
_ROW_ALT = colors.HexColor("#f5f5f5")
_CORRECT_COLOR = colors.HexColor("#2e7d32")
_WRONG_COLOR = colors.HexColor("#c62828")


def generate_quiz_pdf(quiz: Quiz, language: str = "en") -> bytes:
    """
    Build a PDF report for *quiz* and return the raw bytes.

    Parameters
    ----------
    quiz : Quiz
        A fully-loaded Quiz instance (with related quiz_template, user, answers).
    language : str
        ISO language code used to pick translations for questions / answers.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()

    style_title = ParagraphStyle(
        "PDFTitle",
        parent=styles["Title"],
        fontSize=20,
        textColor=_HEADER_BG,
        spaceAfter=4 * mm,
    )
    style_subtitle = ParagraphStyle(
        "PDFSubtitle",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=colors.HexColor("#37474f"),
        spaceAfter=2 * mm,
    )
    style_body = styles["BodyText"]
    style_small = ParagraphStyle(
        "SmallBody",
        parent=style_body,
        fontSize=8,
        leading=10,
    )

    elements: list = []
    template = quiz.quiz_template
    mode_label = "Exam" if template.mode == template.MODE_EXAM else "Practice"

    # --- Header ---
    elements.append(Paragraph("QuizOnline", style_title))
    localized = template.get_localized_content(language)
    elements.append(Paragraph(f"{localized['title']}  &mdash;  {mode_label}", style_subtitle))
    elements.append(Spacer(1, 4 * mm))

    # --- User info ---
    username = quiz.user.get_full_name() or quiz.user.username if quiz.user else "-"
    info_data = [
        ["User", username],
        ["Started", _fmt_datetime(quiz.started_at)],
        ["Ended", _fmt_datetime(quiz.ended_at)],
    ]
    info_table = Table(info_data, colWidths=[35 * mm, 120 * mm])
    info_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6 * mm))

    # --- Score summary ---
    answers = list(
        quiz.answers
        .select_related("quizquestion__question")
        .prefetch_related("selected_options", "selected_options__translations")
        .order_by("question_order")
    )

    total_earned = sum(a.earned_score for a in answers)
    total_max = sum(a.max_score for a in answers)
    correct_count = sum(1 for a in answers if a.is_correct)
    total_count = len(answers)

    score_data = [
        ["Score", f"{total_earned:g} / {total_max:g}"],
        ["Correct answers", f"{correct_count} / {total_count}"],
    ]
    score_table = Table(score_data, colWidths=[45 * mm, 110 * mm])
    score_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
    ]))
    elements.append(score_table)
    elements.append(Spacer(1, 8 * mm))

    # --- Per-question table ---
    header = ["#", "Question", "Your answer(s)", "Result", "Points"]
    col_widths = [10 * mm, 70 * mm, 60 * mm, 16 * mm, 20 * mm]

    table_data = [header]

    for answer in answers:
        question = answer.quizquestion.question
        q_title = _get_translation(question, "title", language) or f"Question #{answer.question_order}"

        # Gather selected answer texts
        selected_texts = []
        for opt in answer.selected_options.all():
            txt = _get_translation(opt, "content", language)
            selected_texts.append(txt or "?")
        selected_str = "; ".join(selected_texts) if selected_texts else (answer.given_answer or "-")

        result_mark = "\u2713" if answer.is_correct else "\u2717"
        points = f"{answer.earned_score:g} / {answer.max_score:g}"

        table_data.append([
            Paragraph(str(answer.question_order), style_small),
            Paragraph(q_title, style_small),
            Paragraph(selected_str, style_small),
            Paragraph(result_mark, style_small),
            Paragraph(points, style_small),
        ])

    q_table = Table(table_data, colWidths=col_widths, repeatRows=1)

    # Build style commands
    table_style_cmds = [
        # Header row
        ("BACKGROUND", (0, 0), (-1, 0), _HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), _HEADER_FG),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 5),
        ("TOPPADDING", (0, 0), (-1, 0), 5),
        # Body defaults
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#bdbdbd")),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 1), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 3),
    ]

    # Alternating row colours
    for i in range(1, len(table_data)):
        if i % 2 == 0:
            table_style_cmds.append(("BACKGROUND", (0, i), (-1, i), _ROW_ALT))

    q_table.setStyle(TableStyle(table_style_cmds))
    elements.append(q_table)

    # Build PDF
    doc.build(elements)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# DRF view
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
@throttle_classes([ScopedRateThrottle])
def export_quiz_pdf(request, quiz_id: int):
    """
    GET /api/quiz/{quiz_id}/export-pdf/

    Returns a PDF report of the quiz results.
    The caller must be the quiz owner or a superuser.
    The quiz template's result visibility rules are respected.
    """
    try:
        quiz = (
            Quiz.objects
            .select_related("quiz_template", "user")
            .get(pk=quiz_id)
        )
    except Quiz.DoesNotExist:
        return HttpResponse("Quiz not found.", status=404, content_type="text/plain")

    # --- Permission check: owner or superuser ---
    user = request.user
    is_owner = quiz.user_id is not None and quiz.user_id == user.id
    is_super = user.is_superuser
    if not (is_owner or is_super):
        return HttpResponse("Forbidden.", status=403, content_type="text/plain")

    # --- Visibility check ---
    template = quiz.quiz_template
    now = timezone.now()
    if not template.can_show_result(now):
        return HttpResponse(
            "Results are not yet available for this quiz.",
            status=403,
            content_type="text/plain",
        )

    # --- Determine language ---
    language = "en"
    if quiz.user and getattr(quiz.user, "language", None):
        language = quiz.user.language

    # --- Generate PDF ---
    pdf_bytes = generate_quiz_pdf(quiz, language=language)

    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    safe_title = re.sub(r"[^\w\s-]", "", template.title or "quiz").strip().replace(" ", "_")
    filename = f"quiz_{quiz.pk}_{safe_title}.pdf"
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
