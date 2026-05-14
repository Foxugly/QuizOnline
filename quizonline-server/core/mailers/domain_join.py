from django.conf import settings

from core.mailers._common import (
    frontend_url,
    render_html_email,
    send_user_email,
    user_language,
)
from core.mailers._localized_copy import pick_copy
from domain.decision_token import make_decision_token


def _build_warning_copy_catalog() -> dict[str, dict[str, str]]:
    app = settings.NAME_APP
    return {
        "fr": {
            "greeting": "Bonjour",
            "subject": f"{app} - votre demande d'accès va expirer",
            "body": 'Votre demande d\'accès au domaine "{domain}" va expirer dans {days} jour(s) faute de décision. Si elle reste en attente, elle sera automatiquement annulée.',
            "outro": "Vous pouvez la maintenir en attente en attendant ou contacter le propriétaire du domaine.",
        },
        "nl": {
            "greeting": "Hallo",
            "subject": f"{app} - uw toegangsaanvraag zal verlopen",
            "body": 'Uw toegangsaanvraag voor het domein "{domain}" verloopt over {days} dag(en) bij gebrek aan beslissing. Wordt deze niet beslist, dan wordt zij automatisch geannuleerd.',
            "outro": "U kunt afwachten of contact opnemen met de eigenaar van het domein.",
        },
        "it": {
            "greeting": "Ciao",
            "subject": f"{app} - la tua richiesta di accesso sta per scadere",
            "body": 'La tua richiesta di accesso al dominio "{domain}" scadrà tra {days} giorno(i) in mancanza di una decisione. Se rimane in sospeso, sarà annullata automaticamente.',
            "outro": "Puoi attendere o contattare il proprietario del dominio.",
        },
        "es": {
            "greeting": "Hola",
            "subject": f"{app} - tu solicitud de acceso está por expirar",
            "body": 'Tu solicitud de acceso al dominio "{domain}" expirará en {days} día(s) si no se toma una decisión. Si permanece pendiente, se cancelará automáticamente.',
            "outro": "Puedes esperar o contactar al propietario del dominio.",
        },
        "en": {
            "greeting": "Hello",
            "subject": f"{app} - your join request is about to expire",
            "body": 'Your join request on "{domain}" will expire in {days} day(s) without a decision. If still pending, it will be cancelled automatically.',
            "outro": "You can wait it out or contact the domain owner.",
        },
    }


def _warning_copy(language_code: str) -> dict[str, str]:
    return pick_copy(catalog=_build_warning_copy_catalog(), language_code=language_code)


def send_join_request_expiry_warning_email(*, join_request, days_left: int) -> None:
    """
    Heads-up to the requester that their pending join request is on
    the verge of being auto-cancelled. Sent by the daily Celery beat
    job; the row's ``expiry_warning_sent_at`` is bumped by the caller
    so we never re-fire on the same row.
    """
    from customuser.notifications import (
        KIND_JOIN_REQUEST_EXPIRY, emit_notification, notification_enabled,
    )
    user = join_request.user
    emit_notification(
        user=user,
        kind=KIND_JOIN_REQUEST_EXPIRY,
        payload={
            "domain_id": join_request.domain_id,
            "domain_name": _domain_name_for(join_request.domain, user),
            "days_left": days_left,
            "join_request_id": join_request.id,
        },
    )
    if not getattr(user, "email", ""):
        return
    if not notification_enabled(user, KIND_JOIN_REQUEST_EXPIRY):
        return
    domain = join_request.domain

    def body_builder(u):
        copy = _warning_copy(user_language(u))
        return (
            f"{copy['greeting']} {u.get_display_name()},\n\n"
            + copy["body"].format(domain=_domain_name_for(domain, u), days=days_left) + "\n\n"
            + copy["outro"] + "\n"
        )

    def html_builder(u):
        copy = _warning_copy(user_language(u))
        return render_html_email(
            heading=f"{copy['greeting']} {u.get_display_name()},",
            blocks=[
                {"type": "text", "content": copy["body"].format(domain=_domain_name_for(domain, u), days=days_left)},
                {"type": "text", "content": copy["outro"]},
            ],
        )

    send_user_email(
        user=user,
        subject_builder=lambda u: _warning_copy(user_language(u))["subject"],
        body_builder=body_builder,
        html_builder=html_builder,
    )


def _build_copy_catalog() -> dict[str, dict[str, str]]:
    """Catalog evaluated lazily to honour ``settings.NAME_APP`` at first use."""
    app = settings.NAME_APP
    return {
        "fr": {
            "greeting": "Bonjour",
            "request_subject": f"{app} - nouvelle demande d'accès à votre domaine",
            "request_intro": "Un utilisateur a demandé à rejoindre votre domaine",
            "request_action": "Vous pouvez approuver ou refuser cette demande directement depuis les boutons ci-dessous, ou via l'interface.",
            "approve_label": "Approuver",
            "reject_label": "Refuser",
            "approved_subject": f"{app} - votre demande d'accès a été approuvée",
            "approved_body": 'Votre demande d\'accès au domaine "{domain}" a été approuvée. Vous êtes maintenant membre.',
            "rejected_subject": f"{app} - votre demande d'accès a été refusée",
            "rejected_body": 'Votre demande d\'accès au domaine "{domain}" a été refusée.',
            "rejected_reason_label": "Motif :",
        },
        "nl": {
            "greeting": "Hallo",
            "request_subject": f"{app} - nieuwe toegangsaanvraag voor uw domein",
            "request_intro": "Een gebruiker heeft toegang gevraagd tot uw domein",
            "request_action": "U kunt deze aanvraag goedkeuren of afwijzen via de knoppen hieronder of via de interface.",
            "approve_label": "Goedkeuren",
            "reject_label": "Afwijzen",
            "approved_subject": f"{app} - uw toegangsaanvraag is goedgekeurd",
            "approved_body": 'Uw toegangsaanvraag voor het domein "{domain}" is goedgekeurd. U bent nu lid.',
            "rejected_subject": f"{app} - uw toegangsaanvraag is afgewezen",
            "rejected_body": 'Uw toegangsaanvraag voor het domein "{domain}" is afgewezen.',
            "rejected_reason_label": "Reden:",
        },
        "it": {
            "greeting": "Ciao",
            "request_subject": f"{app} - nuova richiesta di accesso al tuo dominio",
            "request_intro": "Un utente ha chiesto di unirsi al tuo dominio",
            "request_action": "Puoi approvare o rifiutare questa richiesta tramite i pulsanti qui sotto o dall'interfaccia.",
            "approve_label": "Approva",
            "reject_label": "Rifiuta",
            "approved_subject": f"{app} - la tua richiesta di accesso è stata approvata",
            "approved_body": 'La tua richiesta di accesso al dominio "{domain}" è stata approvata. Ora sei un membro.',
            "rejected_subject": f"{app} - la tua richiesta di accesso è stata rifiutata",
            "rejected_body": 'La tua richiesta di accesso al dominio "{domain}" è stata rifiutata.',
            "rejected_reason_label": "Motivo:",
        },
        "es": {
            "greeting": "Hola",
            "request_subject": f"{app} - nueva solicitud de acceso a tu dominio",
            "request_intro": "Un usuario ha solicitado unirse a tu dominio",
            "request_action": "Puedes aprobar o rechazar esta solicitud con los botones siguientes o desde la interfaz.",
            "approve_label": "Aprobar",
            "reject_label": "Rechazar",
            "approved_subject": f"{app} - tu solicitud de acceso ha sido aprobada",
            "approved_body": 'Tu solicitud de acceso al dominio "{domain}" ha sido aprobada. Ahora eres miembro.',
            "rejected_subject": f"{app} - tu solicitud de acceso ha sido rechazada",
            "rejected_body": 'Tu solicitud de acceso al dominio "{domain}" ha sido rechazada.',
            "rejected_reason_label": "Motivo:",
        },
        "en": {
            "greeting": "Hello",
            "request_subject": f"{app} - new join request on your domain",
            "request_intro": "A user has requested to join your domain",
            "request_action": "You can approve or reject this request from the buttons below or from the interface.",
            "approve_label": "Approve",
            "reject_label": "Reject",
            "approved_subject": f"{app} - your join request was approved",
            "approved_body": 'Your join request on "{domain}" was approved. You are now a member.',
            "rejected_subject": f"{app} - your join request was rejected",
            "rejected_body": 'Your join request on "{domain}" was rejected.',
            "rejected_reason_label": "Reason:",
        },
    }


def _domain_join_copy(language_code: str) -> dict[str, str]:
    return pick_copy(catalog=_build_copy_catalog(), language_code=language_code)


def _domain_name_for(domain, recipient) -> str:
    return domain.safe_translation_getter(
        "name",
        language_code=user_language(recipient),
        any_language=True,
    ) or f"Domain#{domain.pk}"


def _decision_urls(*, join_request, recipient) -> tuple[str, str]:
    """Build (approve_url, reject_url) signed for a specific recipient."""
    approve_token = make_decision_token(
        request_id=join_request.id,
        recipient_user_id=recipient.id,
        action="approve",
    )
    reject_token = make_decision_token(
        request_id=join_request.id,
        recipient_user_id=recipient.id,
        action="reject",
    )
    return (
        frontend_url(f"join-request/decide/{approve_token}"),
        frontend_url(f"join-request/decide/{reject_token}"),
    )


def _build_request_body(recipient, *, join_request, requester, domain) -> str:
    copy = _domain_join_copy(user_language(recipient))
    domain_name = _domain_name_for(domain, recipient)
    requester_name = getattr(requester, "get_display_name", lambda: requester.username)()
    approve_url, reject_url = _decision_urls(join_request=join_request, recipient=recipient)
    return (
        f"{copy['greeting']} {recipient.get_display_name()},\n\n"
        f"{copy['request_intro']} \"{domain_name}\" : {requester_name} ({requester.email}).\n"
        f"{copy['request_action']}\n\n"
        f"{copy['approve_label']}: {approve_url}\n"
        f"{copy['reject_label']}: {reject_url}\n"
    )


def _build_request_html(recipient, *, join_request, requester, domain) -> str:
    copy = _domain_join_copy(user_language(recipient))
    domain_name = _domain_name_for(domain, recipient)
    requester_name = getattr(requester, "get_display_name", lambda: requester.username)()
    approve_url, reject_url = _decision_urls(join_request=join_request, recipient=recipient)
    return render_html_email(
        heading=f"{copy['greeting']} {recipient.get_display_name()},",
        blocks=[
            {"type": "text", "content": f"{copy['request_intro']} <strong>{domain_name}</strong> : {requester_name} ({requester.email})."},
            {"type": "text", "content": copy["request_action"]},
            {"type": "button", "content": approve_url, "label": copy["approve_label"]},
            {"type": "button", "content": reject_url, "label": copy["reject_label"]},
        ],
    )


def send_join_request_created_email(*, join_request, recipients) -> None:
    from customuser.notifications import (
        KIND_JOIN_REQUEST_CREATED, emit_notification, notification_enabled,
    )
    domain = join_request.domain
    requester = join_request.user
    for recipient in recipients:
        emit_notification(
            user=recipient,
            kind=KIND_JOIN_REQUEST_CREATED,
            payload={
                "domain_id": domain.id,
                "domain_name": _domain_name_for(domain, recipient),
                "requester_id": getattr(requester, "id", None),
                "requester_username": getattr(requester, "username", ""),
                "requester_email": getattr(requester, "email", ""),
                "join_request_id": join_request.id,
            },
        )
        if not getattr(recipient, "email", ""):
            continue
        if not notification_enabled(recipient, KIND_JOIN_REQUEST_CREATED):
            continue
        send_user_email(
            user=recipient,
            subject_builder=lambda u: _domain_join_copy(user_language(u))["request_subject"],
            body_builder=lambda u: _build_request_body(
                u, join_request=join_request, requester=requester, domain=domain,
            ),
            html_builder=lambda u: _build_request_html(
                u, join_request=join_request, requester=requester, domain=domain,
            ),
        )


def send_join_request_approved_email(*, join_request) -> None:
    from customuser.notifications import (
        KIND_JOIN_REQUEST_DECIDED, emit_notification, notification_enabled,
    )
    domain = join_request.domain
    requester = join_request.user
    emit_notification(
        user=requester,
        kind=KIND_JOIN_REQUEST_DECIDED,
        payload={
            "domain_id": domain.id,
            "domain_name": _domain_name_for(domain, requester),
            "outcome": "approved",
            "join_request_id": join_request.id,
        },
    )
    if not requester.email:
        return
    if not notification_enabled(requester, KIND_JOIN_REQUEST_DECIDED):
        return

    def body_builder(u):
        copy = _domain_join_copy(user_language(u))
        return (
            f"{copy['greeting']} {u.get_display_name()},\n\n"
            + copy["approved_body"].format(domain=_domain_name_for(domain, u)) + "\n"
        )

    def html_builder(u):
        copy = _domain_join_copy(user_language(u))
        return render_html_email(
            heading=f"{copy['greeting']} {u.get_display_name()},",
            blocks=[{"type": "text", "content": copy["approved_body"].format(domain=_domain_name_for(domain, u))}],
        )

    send_user_email(
        user=requester,
        subject_builder=lambda u: _domain_join_copy(user_language(u))["approved_subject"],
        body_builder=body_builder,
        html_builder=html_builder,
    )


def send_join_request_rejected_email(*, join_request) -> None:
    from customuser.notifications import (
        KIND_JOIN_REQUEST_DECIDED, emit_notification, notification_enabled,
    )
    domain = join_request.domain
    requester = join_request.user
    reason = (join_request.reject_reason or "").strip()
    emit_notification(
        user=requester,
        kind=KIND_JOIN_REQUEST_DECIDED,
        payload={
            "domain_id": domain.id,
            "domain_name": _domain_name_for(domain, requester),
            "outcome": "rejected",
            "reason": reason,
            "join_request_id": join_request.id,
        },
    )
    if not requester.email:
        return
    if not notification_enabled(requester, KIND_JOIN_REQUEST_DECIDED):
        return

    def body_builder(u):
        copy = _domain_join_copy(user_language(u))
        body = (
            f"{copy['greeting']} {u.get_display_name()},\n\n"
            + copy["rejected_body"].format(domain=_domain_name_for(domain, u))
        )
        if reason:
            body += f"\n\n{copy['rejected_reason_label']} {reason}"
        return body + "\n"

    def html_builder(u):
        copy = _domain_join_copy(user_language(u))
        blocks = [{"type": "text", "content": copy["rejected_body"].format(domain=_domain_name_for(domain, u))}]
        if reason:
            blocks.append({"type": "text", "content": f"<em>{copy['rejected_reason_label']}</em> {reason}"})
        return render_html_email(
            heading=f"{copy['greeting']} {u.get_display_name()},",
            blocks=blocks,
        )

    send_user_email(
        user=requester,
        subject_builder=lambda u: _domain_join_copy(user_language(u))["rejected_subject"],
        body_builder=body_builder,
        html_builder=html_builder,
    )
