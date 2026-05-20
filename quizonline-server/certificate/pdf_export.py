"""ReportLab-based PDF generation for LMS certificates."""

import io

from django.utils import translation
from django.utils.translation import gettext as _
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


def build_certificate_pdf(cert) -> bytes:
    course = cert.course
    user = cert.user
    lang = user.language or "fr"
    with translation.override(lang):
        title = course.safe_translation_getter("title", language_code=lang, any_language=True) or course.slug
        title_label = _("Certificate of Completion")
        verb = _("has completed the course")
        issued_on = _("Issued on %(date)s") % {"date": cert.issued_at.strftime("%Y-%m-%d")}
        cert_no = _("Certificate №: %(num)s") % {"num": cert.certificate_number}
        token_line = _("Verification token: %(t)s") % {"t": cert.verification_token}

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=landscape(A4),
        leftMargin=30 * mm, rightMargin=30 * mm,
        topMargin=30 * mm, bottomMargin=30 * mm,
    )
    styles = getSampleStyleSheet()
    big = ParagraphStyle(
        "big", parent=styles["Title"],
        fontSize=36, leading=42, alignment=1,
        textColor=colors.HexColor("#0f172a"),
    )
    medium = ParagraphStyle("med", parent=styles["Normal"], fontSize=18, leading=24, alignment=1)
    small = ParagraphStyle("small", parent=styles["Normal"], fontSize=11, leading=14, alignment=1, textColor=colors.grey)

    story = [
        Spacer(1, 20 * mm),
        Paragraph(title_label, big),
        Spacer(1, 15 * mm),
        Paragraph(user.get_display_name(), medium),
        Spacer(1, 5 * mm),
        Paragraph(verb, styles["Normal"]),
        Paragraph(f"<b>{title}</b>", medium),
        Spacer(1, 15 * mm),
        Paragraph(issued_on, small),
        Paragraph(cert_no, small),
        Paragraph(token_line, small),
    ]
    doc.build(story)
    return buf.getvalue()
