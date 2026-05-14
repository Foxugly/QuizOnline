from django.conf import settings

from core.mailers._common import (
    frontend_url,
    queue_email,
    render_html_email,
    user_language,
)
from core.mailers._localized_copy import pick_copy
from domain.transfer_token import make_transfer_token


def _build_transfer_copy_catalog() -> dict[str, dict[str, str]]:
    app = settings.NAME_APP
    return {
        "fr": {
            "greeting": "Bonjour",
            "subject": f"{app} - on vous propose la propriété d'un domaine",
            "intro": "L'utilisateur",
            "wants_to_transfer": "souhaite vous transférer la propriété du domaine",
            "action": "Pour accepter le transfert, cliquez sur le bouton ci-dessous.",
            "accept_label": "Accepter le transfert",
            "expiry_note": "Ce lien expire dans 7 jours.",
            "no_action_note": "Si vous ne cliquez pas, l'actuel propriétaire reste propriétaire.",
        },
        "nl": {
            "greeting": "Hallo",
            "subject": f"{app} - u krijgt het eigenaarschap van een domein aangeboden",
            "intro": "De gebruiker",
            "wants_to_transfer": "wil u het eigenaarschap overdragen van het domein",
            "action": "Klik op de knop hieronder om de overdracht te aanvaarden.",
            "accept_label": "Overdracht aanvaarden",
            "expiry_note": "Deze link vervalt over 7 dagen.",
            "no_action_note": "Als u niet klikt, blijft de huidige eigenaar in functie.",
        },
        "it": {
            "greeting": "Ciao",
            "subject": f"{app} - ti viene proposta la proprietà di un dominio",
            "intro": "L'utente",
            "wants_to_transfer": "vuole trasferirti la proprietà del dominio",
            "action": "Per accettare il trasferimento, clicca sul pulsante qui sotto.",
            "accept_label": "Accetta il trasferimento",
            "expiry_note": "Questo link scade tra 7 giorni.",
            "no_action_note": "Se non clicchi, il proprietario attuale resta in carica.",
        },
        "es": {
            "greeting": "Hola",
            "subject": f"{app} - se te propone la propiedad de un dominio",
            "intro": "El usuario",
            "wants_to_transfer": "quiere transferirte la propiedad del dominio",
            "action": "Para aceptar la transferencia, haz clic en el botón siguiente.",
            "accept_label": "Aceptar la transferencia",
            "expiry_note": "Este enlace expira en 7 días.",
            "no_action_note": "Si no haces clic, el propietario actual sigue siéndolo.",
        },
        "en": {
            "greeting": "Hello",
            "subject": f"{app} - you have been offered the ownership of a domain",
            "intro": "User",
            "wants_to_transfer": "wants to transfer to you the ownership of the domain",
            "action": "To accept the transfer, click the button below.",
            "accept_label": "Accept transfer",
            "expiry_note": "This link expires in 7 days.",
            "no_action_note": "If you do not click, the current owner stays.",
        },
    }


def _transfer_copy(language_code: str) -> dict[str, str]:
    return pick_copy(catalog=_build_transfer_copy_catalog(), language_code=language_code)


def _domain_name_for(domain) -> str:
    return domain.safe_translation_getter("name", any_language=True) or f"Domain#{domain.pk}"


def send_domain_transfer_email(*, domain, initiator, future_owner) -> None:
    """
    Email the proposed future owner with a signed transfer link.
    Bound to ``future_owner.email`` — the accept endpoint will refuse
    any other authenticated user.
    """
    from customuser.notifications import (
        KIND_TRANSFER_RECEIVED, emit_notification, notification_enabled,
    )
    emit_notification(
        user=future_owner,
        kind=KIND_TRANSFER_RECEIVED,
        payload={
            "domain_id": domain.id,
            "domain_name": _domain_name_for(domain),
            "initiator_id": getattr(initiator, "id", None),
            "initiator_username": getattr(initiator, "username", ""),
        },
    )
    if not getattr(future_owner, "email", ""):
        return
    if not notification_enabled(future_owner, KIND_TRANSFER_RECEIVED):
        return
    token = make_transfer_token(
        domain_id=domain.id,
        future_owner_id=future_owner.id,
        initiator_id=initiator.id,
    )
    accept_url = frontend_url(f"transfer/accept/{token}")
    domain_name = _domain_name_for(domain)
    initiator_name = getattr(initiator, "get_display_name", lambda: initiator.username)()

    copy = _transfer_copy(user_language(future_owner))
    subject = copy["subject"]
    body = (
        f"{copy['greeting']} {future_owner.get_display_name()},\n\n"
        f"{copy['intro']} {initiator_name} {copy['wants_to_transfer']} "
        f"\"{domain_name}\".\n{copy['action']}\n\n"
        f"{copy['accept_label']}: {accept_url}\n\n"
        f"{copy['expiry_note']}\n{copy['no_action_note']}\n"
    )
    html = render_html_email(
        heading=f"{copy['greeting']} {future_owner.get_display_name()},",
        blocks=[
            {
                "type": "text",
                "content": (
                    f"{copy['intro']} <strong>{initiator_name}</strong> "
                    f"{copy['wants_to_transfer']} <strong>{domain_name}</strong>."
                ),
            },
            {"type": "text", "content": copy["action"]},
            {"type": "button", "content": accept_url, "label": copy["accept_label"]},
            {"type": "text", "content": f"<em>{copy['expiry_note']}</em>"},
            {"type": "text", "content": copy["no_action_note"]},
        ],
    )
    queue_email(subject=subject, body=body, recipients=[future_owner.email], html_body=html)
