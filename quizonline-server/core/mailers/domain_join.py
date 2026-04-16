from django.conf import settings

from core.mailers._common import (
    render_html_email,
    send_user_email,
    user_language,
)


def _domain_join_copy(language_code: str) -> dict[str, str]:
    app = settings.NAME_APP
    if language_code == "fr":
        return {
            "greeting": "Bonjour",
            "request_subject": f"{app} - nouvelle demande d'acces a votre domaine",
            "request_intro": "Un utilisateur a demande a rejoindre votre domaine",
            "request_action": "Vous pouvez approuver ou refuser cette demande dans l'interface.",
            "approved_subject": f"{app} - votre demande d'acces a ete approuvee",
            "approved_body": 'Votre demande d\'acces au domaine "{domain}" a ete approuvee. Vous etes maintenant membre.',
            "rejected_subject": f"{app} - votre demande d'acces a ete refusee",
            "rejected_body": 'Votre demande d\'acces au domaine "{domain}" a ete refusee.',
            "rejected_reason_label": "Motif :",
        }
    if language_code == "nl":
        return {
            "greeting": "Hallo",
            "request_subject": f"{app} - nieuwe toegangsaanvraag voor uw domein",
            "request_intro": "Een gebruiker heeft toegang gevraagd tot uw domein",
            "request_action": "U kunt deze aanvraag goedkeuren of afwijzen in de interface.",
            "approved_subject": f"{app} - uw toegangsaanvraag is goedgekeurd",
            "approved_body": 'Uw toegangsaanvraag voor het domein "{domain}" is goedgekeurd. U bent nu lid.',
            "rejected_subject": f"{app} - uw toegangsaanvraag is afgewezen",
            "rejected_body": 'Uw toegangsaanvraag voor het domein "{domain}" is afgewezen.',
            "rejected_reason_label": "Reden:",
        }
    return {
        "greeting": "Hello",
        "request_subject": f"{app} - new join request on your domain",
        "request_intro": "A user has requested to join your domain",
        "request_action": "You can approve or reject this request from the interface.",
        "approved_subject": f"{app} - your join request was approved",
        "approved_body": 'Your join request on "{domain}" was approved. You are now a member.',
        "rejected_subject": f"{app} - your join request was rejected",
        "rejected_body": 'Your join request on "{domain}" was rejected.',
        "rejected_reason_label": "Reason:",
    }


def _domain_name_for(domain, recipient) -> str:
    return domain.safe_translation_getter(
        "name",
        language_code=user_language(recipient),
        any_language=True,
    ) or f"Domain#{domain.pk}"


def _build_request_body(recipient, *, requester, domain) -> str:
    copy = _domain_join_copy(user_language(recipient))
    domain_name = _domain_name_for(domain, recipient)
    requester_name = getattr(requester, "get_display_name", lambda: requester.username)()
    return (
        f"{copy['greeting']} {recipient.get_display_name()},\n\n"
        f"{copy['request_intro']} \"{domain_name}\" : {requester_name} ({requester.email}).\n"
        f"{copy['request_action']}\n"
    )


def _build_request_html(recipient, *, requester, domain) -> str:
    copy = _domain_join_copy(user_language(recipient))
    domain_name = _domain_name_for(domain, recipient)
    requester_name = getattr(requester, "get_display_name", lambda: requester.username)()
    return render_html_email(
        heading=f"{copy['greeting']} {recipient.get_display_name()},",
        blocks=[
            {"type": "text", "content": f"{copy['request_intro']} <strong>{domain_name}</strong> : {requester_name} ({requester.email})."},
            {"type": "text", "content": copy["request_action"]},
        ],
    )


def send_join_request_created_email(*, join_request, recipients) -> None:
    domain = join_request.domain
    requester = join_request.user
    for recipient in recipients:
        if not getattr(recipient, "email", ""):
            continue
        send_user_email(
            user=recipient,
            subject_builder=lambda u: _domain_join_copy(user_language(u))["request_subject"],
            body_builder=lambda u: _build_request_body(u, requester=requester, domain=domain),
            html_builder=lambda u: _build_request_html(u, requester=requester, domain=domain),
        )


def send_join_request_approved_email(*, join_request) -> None:
    domain = join_request.domain
    requester = join_request.user
    if not requester.email:
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
    domain = join_request.domain
    requester = join_request.user
    reason = (join_request.reject_reason or "").strip()
    if not requester.email:
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
