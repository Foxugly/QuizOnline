from django.conf import settings

from core.mailers._common import (
    frontend_url,
    queue_email,
    render_html_email,
    user_language,
)
from core.mailers._localized_copy import pick_copy
from customuser.magic_link_token import make_magic_link_token


def _build_copy_catalog() -> dict[str, dict[str, str]]:
    app = settings.NAME_APP
    return {
        "fr": {
            "greeting": "Bonjour",
            "subject": f"{app} - votre lien de connexion",
            "intro": "Cliquez sur le bouton ci-dessous pour vous connecter sans mot de passe.",
            "cta": "Se connecter",
            "expiry_note": "Ce lien expire dans 15 minutes et ne peut être utilisé qu'une fois.",
            "safety_note": "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.",
        },
        "nl": {
            "greeting": "Hallo",
            "subject": f"{app} - uw aanmeldlink",
            "intro": "Klik op de knop hieronder om u zonder wachtwoord aan te melden.",
            "cta": "Aanmelden",
            "expiry_note": "Deze link verloopt over 15 minuten en kan slechts één keer worden gebruikt.",
            "safety_note": "Hebt u deze aanvraag niet gedaan? Negeer dan deze e-mail.",
        },
        "it": {
            "greeting": "Ciao",
            "subject": f"{app} - il tuo link di accesso",
            "intro": "Clicca sul pulsante qui sotto per accedere senza password.",
            "cta": "Accedi",
            "expiry_note": "Questo link scade tra 15 minuti e può essere utilizzato una sola volta.",
            "safety_note": "Se non hai richiesto questo accesso, ignora questa e-mail.",
        },
        "es": {
            "greeting": "Hola",
            "subject": f"{app} - tu enlace de acceso",
            "intro": "Haz clic en el botón siguiente para iniciar sesión sin contraseña.",
            "cta": "Iniciar sesión",
            "expiry_note": "Este enlace expira en 15 minutos y solo puede usarse una vez.",
            "safety_note": "Si no solicitaste este acceso, ignora este correo.",
        },
        "en": {
            "greeting": "Hello",
            "subject": f"{app} - your sign-in link",
            "intro": "Click the button below to sign in without a password.",
            "cta": "Sign in",
            "expiry_note": "This link expires in 15 minutes and can be used only once.",
            "safety_note": "If you did not request this, simply ignore this email.",
        },
    }


def _magic_link_copy(language_code: str) -> dict[str, str]:
    return pick_copy(catalog=_build_copy_catalog(), language_code=language_code)


def send_magic_link_email(*, user) -> None:
    """
    Mail the user a one-shot magic-link to sign in. Idempotent: each
    call mints a fresh token (the TTL is the only one-shot guarantee
    — see ``customuser.services.exchange_magic_link`` for the
    server-side enforcement).
    """
    if not getattr(user, "email", ""):
        return
    token = make_magic_link_token(user_id=user.id)
    link = frontend_url(f"auth/magic/{token}")
    copy = _magic_link_copy(user_language(user))

    body = (
        f"{copy['greeting']} {user.get_display_name()},\n\n"
        f"{copy['intro']}\n\n"
        f"{copy['cta']}: {link}\n\n"
        f"{copy['expiry_note']}\n{copy['safety_note']}\n"
    )
    html = render_html_email(
        heading=f"{copy['greeting']} {user.get_display_name()},",
        blocks=[
            {"type": "text", "content": copy["intro"]},
            {"type": "button", "content": link, "label": copy["cta"]},
            {"type": "text", "content": f"<em>{copy['expiry_note']}</em>"},
            {"type": "text", "content": copy["safety_note"]},
        ],
    )
    queue_email(subject=copy["subject"], body=body, recipients=[user.email], html_body=html)
