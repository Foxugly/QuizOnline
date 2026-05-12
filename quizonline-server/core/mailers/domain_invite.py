from django.conf import settings

from core.mailers._common import (
    frontend_url,
    queue_email,
    render_html_email,
    user_language,
)
from domain.invite_token import make_invite_token


def _invite_copy(language_code: str) -> dict[str, str]:
    app = settings.NAME_APP
    if language_code == "fr":
        return {
            "greeting": "Bonjour",
            "subject": f"{app} - vous êtes invité à rejoindre un domaine",
            "intro": "Vous avez été invité à rejoindre le domaine",
            "by_inviter": "par",
            "action": "Pour accepter cette invitation, cliquez sur le bouton ci-dessous.",
            "accept_label": "Accepter l'invitation",
            "expiry_note": "Ce lien expire dans 7 jours.",
        }
    if language_code == "nl":
        return {
            "greeting": "Hallo",
            "subject": f"{app} - u bent uitgenodigd om een domein te vervoegen",
            "intro": "U bent uitgenodigd om het domein te vervoegen",
            "by_inviter": "door",
            "action": "Klik op de knop hieronder om de uitnodiging te aanvaarden.",
            "accept_label": "Uitnodiging aanvaarden",
            "expiry_note": "Deze link vervalt over 7 dagen.",
        }
    if language_code == "it":
        return {
            "greeting": "Ciao",
            "subject": f"{app} - sei invitato a unirti a un dominio",
            "intro": "Sei stato invitato a unirti al dominio",
            "by_inviter": "da",
            "action": "Per accettare questo invito, clicca sul pulsante qui sotto.",
            "accept_label": "Accetta l'invito",
            "expiry_note": "Questo link scade tra 7 giorni.",
        }
    if language_code == "es":
        return {
            "greeting": "Hola",
            "subject": f"{app} - estás invitado a unirte a un dominio",
            "intro": "Has sido invitado a unirte al dominio",
            "by_inviter": "por",
            "action": "Para aceptar esta invitación, haz clic en el botón siguiente.",
            "accept_label": "Aceptar la invitación",
            "expiry_note": "Este enlace expira en 7 días.",
        }
    return {
        "greeting": "Hello",
        "subject": f"{app} - you have been invited to join a domain",
        "intro": "You have been invited to join the domain",
        "by_inviter": "by",
        "action": "To accept this invitation, click the button below.",
        "accept_label": "Accept invitation",
        "expiry_note": "This link expires in 7 days.",
    }


def _domain_display_name(domain, language_code: str) -> str:
    return domain.safe_translation_getter(
        "name", language_code=language_code, any_language=True
    ) or f"Domain#{domain.pk}"


def _inviter_display_name(inviter) -> str:
    return getattr(inviter, "get_display_name", lambda: inviter.username)()


def _build_invite_body(*, recipient_email, domain, inviter, copy, accept_url) -> str:
    return (
        f"{copy['greeting']},\n\n"
        f"{copy['intro']} \"{_domain_display_name(domain, 'en')}\" "
        f"{copy['by_inviter']} {_inviter_display_name(inviter)}.\n"
        f"{copy['action']}\n\n"
        f"{copy['accept_label']}: {accept_url}\n\n"
        f"{copy['expiry_note']}\n"
    )


def _build_invite_html(*, recipient_email, domain, inviter, copy, accept_url) -> str:
    return render_html_email(
        heading=f"{copy['greeting']},",
        blocks=[
            {
                "type": "text",
                "content": (
                    f"{copy['intro']} <strong>{_domain_display_name(domain, 'en')}</strong> "
                    f"{copy['by_inviter']} {_inviter_display_name(inviter)}."
                ),
            },
            {"type": "text", "content": copy["action"]},
            {"type": "button", "content": accept_url, "label": copy["accept_label"]},
            {"type": "text", "content": f"<em>{copy['expiry_note']}</em>"},
        ],
    )


def send_domain_invite_email(*, email: str, domain, inviter, language: str = "en") -> None:
    """
    Queue one invitation mail for ``email`` with a freshly signed token.

    ``email`` is the raw string (the invitee may not yet have a user
    account); we do not assume a User row exists. Language defaults to
    English when we cannot guess the recipient's preference (no profile
    to read from yet).
    """
    if not email:
        return
    copy = _invite_copy(user_language(type("_U", (), {"language": language})()))
    token = make_invite_token(domain_id=domain.id, email=email, inviter_id=inviter.id)
    accept_url = frontend_url(f"invite/accept/{token}")

    subject = copy["subject"]
    body = _build_invite_body(
        recipient_email=email, domain=domain, inviter=inviter, copy=copy, accept_url=accept_url,
    )
    html = _build_invite_html(
        recipient_email=email, domain=domain, inviter=inviter, copy=copy, accept_url=accept_url,
    )
    queue_email(subject=subject, body=body, recipients=[email], html_body=html)
