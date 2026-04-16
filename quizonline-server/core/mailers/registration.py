from django.conf import settings

from ._common import build_user_token_link, frontend_url, render_html_email, send_user_email


def _registration_copy(language_code: str) -> dict[str, str]:
    app_name = settings.NAME_APP
    if language_code == "fr":
        return {
            "greeting": "Bonjour",
            "registration_subject": f"{app_name} - confirmez votre inscription",
            "registration_intro": f"Merci pour votre inscription sur {app_name}.",
            "registration_action": "Confirmez votre adresse email",
            "password_subject": f"{app_name} - reinitialisation du mot de passe",
            "password_intro": "Vous avez demande la reinitialisation de votre mot de passe.",
            "password_action": "Reinitialisez votre mot de passe",
            "login_label": "Connexion",
        }
    if language_code == "nl":
        return {
            "greeting": "Hallo",
            "registration_subject": f"{app_name} - bevestig uw registratie",
            "registration_intro": f"Bedankt voor uw registratie op {app_name}.",
            "registration_action": "Bevestig uw e-mailadres",
            "password_subject": f"{app_name} - wachtwoord opnieuw instellen",
            "password_intro": "U hebt gevraagd om uw wachtwoord opnieuw in te stellen.",
            "password_action": "Stel uw wachtwoord opnieuw in",
            "login_label": "Aanmelden",
        }
    return {
        "greeting": "Hello",
        "registration_subject": f"{app_name} - confirm your registration",
        "registration_intro": f"Thank you for registering on {app_name}.",
        "registration_action": "Confirm your email address",
        "password_subject": f"{app_name} - password reset",
        "password_intro": "You requested a password reset.",
        "password_action": "Reset your password",
        "login_label": "Login",
    }


def _build_registration_body(user) -> str:
    copy = _registration_copy(getattr(user, "language", None))
    confirmation_link = build_user_token_link("/user/confirm-email", user)
    return (
        f"{copy['greeting']} {user.get_display_name()},\n\n"
        f"{copy['registration_intro']}\n"
        f"{copy['registration_action']}: {confirmation_link}\n\n"
        f"{copy['login_label']}: {frontend_url('/login')}\n"
    )


def _build_registration_html(user) -> str:
    copy = _registration_copy(getattr(user, "language", None))
    confirmation_link = build_user_token_link("/user/confirm-email", user)
    login_link = frontend_url("/login")
    return render_html_email(
        heading=f"{copy['greeting']} {user.get_display_name()},",
        blocks=[
            {"type": "text", "content": copy["registration_intro"]},
            {"type": "button", "content": confirmation_link, "label": copy["registration_action"]},
            {"type": "link", "content": login_link, "label": copy["login_label"]},
        ],
    )


def send_registration_confirmation_email(user) -> None:
    send_user_email(
        user=user,
        subject_builder=lambda u: _registration_copy(getattr(u, "language", None))["registration_subject"],
        body_builder=_build_registration_body,
        html_builder=_build_registration_html,
    )


def _build_password_reset_body(user) -> str:
    copy = _registration_copy(getattr(user, "language", None))
    reset_link = build_user_token_link("/user/reset-password", user)
    return (
        f"{copy['greeting']} {user.get_display_name()},\n\n"
        f"{copy['password_intro']}\n"
        f"{copy['password_action']}: {reset_link}\n\n"
        f"{copy['login_label']}: {frontend_url('/login')}\n"
    )


def _build_password_reset_html(user) -> str:
    copy = _registration_copy(getattr(user, "language", None))
    reset_link = build_user_token_link("/user/reset-password", user)
    login_link = frontend_url("/login")
    return render_html_email(
        heading=f"{copy['greeting']} {user.get_display_name()},",
        blocks=[
            {"type": "text", "content": copy["password_intro"]},
            {"type": "button", "content": reset_link, "label": copy["password_action"]},
            {"type": "link", "content": login_link, "label": copy["login_label"]},
        ],
    )


def send_password_reset_email(user) -> None:
    send_user_email(
        user=user,
        subject_builder=lambda u: _registration_copy(getattr(u, "language", None))["password_subject"],
        body_builder=_build_password_reset_body,
        html_builder=_build_password_reset_html,
    )
