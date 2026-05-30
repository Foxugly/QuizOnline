"""ReportLab-based PDF generation for LMS certificates."""

import io

from django.utils import translation
from django.utils.translation import gettext as _
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer


def build_certificate_pdf(cert) -> bytes:
    course = cert.course
    user = cert.user
    domain = course.domain
    lang = user.language or "fr"
    with translation.override(lang):
        title = course.safe_translation_getter("title", language_code=lang, any_language=True) or course.slug
        title_label = _("Certificate of Completion")
        verb = _("has completed the course")
        issued_on = _("Issued on %(date)s") % {"date": cert.issued_at.strftime("%Y-%m-%d")}
        cert_no = _("Certificate №: %(num)s") % {"num": cert.certificate_number}
        token_line = _("Verification token: %(t)s") % {"t": cert.verification_token}
        expires_on = (
            _("Valid until %(date)s") % {"date": cert.expires_at.strftime("%Y-%m-%d")}
            if cert.expires_at else None
        )
        signatory_title = domain.safe_translation_getter(
            "certificate_signatory_title", language_code=lang, any_language=True
        ) or ""

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
    signatory_name_style = ParagraphStyle(
        "sig_name", parent=styles["Normal"], fontSize=14, leading=18, alignment=1,
        textColor=colors.HexColor("#0f172a"),
    )

    story = []
    # Optional per-domain logo. Pinned to a fixed height (~22 mm) so it
    # always renders proportionally without overflowing the top margin
    # — the rest of the layout follows below regardless of the source
    # image dimensions.
    logo = _logo_flowable(domain)
    if logo is not None:
        story.append(logo)
        story.append(Spacer(1, 8 * mm))
    else:
        story.append(Spacer(1, 20 * mm))
    story += [
        Paragraph(title_label, big),
        Spacer(1, 15 * mm),
        Paragraph(user.get_display_name(), medium),
        Spacer(1, 5 * mm),
        Paragraph(verb, styles["Normal"]),
        Paragraph(f"<b>{title}</b>", medium),
        Spacer(1, 12 * mm),
    ]
    # Signatory block (name + role title) — only rendered when the
    # domain configured at least the name; the role title alone without
    # a person is meaningless on a certificate.
    if domain.certificate_signatory_name:
        story.append(Paragraph(domain.certificate_signatory_name, signatory_name_style))
        if signatory_title:
            story.append(Paragraph(signatory_title, small))
        story.append(Spacer(1, 8 * mm))
    story += [
        Paragraph(issued_on, small),
        Paragraph(cert_no, small),
    ]
    if expires_on:
        story.append(Paragraph(expires_on, small))
    story.append(Paragraph(token_line, small))
    doc.build(story)
    return buf.getvalue()


def _logo_flowable(domain) -> Image | None:
    """Return a ReportLab ``Image`` flowable for the domain's certificate
    logo, or ``None`` when no logo is configured or the file is
    unreachable. Defensive against missing storage / deleted blob so a
    transient infra hiccup never blocks certificate emission — the PDF
    just renders without the logo."""
    logo_file = getattr(domain, "certificate_logo", None)
    if not logo_file:
        return None
    try:
        # ImageField stores a path; ``open`` accesses the underlying
        # storage backend, which may be S3 or local depending on env.
        with logo_file.open("rb") as fh:
            data = fh.read()
    except (FileNotFoundError, OSError, ValueError):
        return None
    if not data:
        return None
    img = Image(io.BytesIO(data))
    # Constrain to a fixed height; aspect ratio preserved by ReportLab.
    target_h = 22 * mm
    if img.imageHeight:
        scale = target_h / img.imageHeight
        img.drawHeight = target_h
        img.drawWidth = img.imageWidth * scale
    img.hAlign = "CENTER"
    return img
