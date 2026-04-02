from ._common import build_user_token_link, frontend_url, send_user_plaintext_email


def _registration_copy(language_code: str) -> dict[str, str]:
    if language_code == "fr":
        return {
            "greeting": "Bonjour",
            "registration_subject": "WpRef - confirmez votre inscription",
            "registration_intro": "Merci pour votre inscription sur WpRef.",
            "registration_action": "Confirmez votre adresse email",
            "password_subject": "WpRef - reinitialisation du mot de passe",
            "password_intro": "Vous avez demande la reinitialisation de votre mot de passe.",
            "password_action": "Reinitialisez votre mot de passe",
            "login_label": "Connexion",
        }
    if language_code == "nl":
        return {
            "greeting": "Hallo",
            "registration_subject": "WpRef - bevestig uw registratie",
            "registration_intro": "Bedankt voor uw registratie op WpRef.",
            "registration_action": "Bevestig uw e-mailadres",
            "password_subject": "WpRef - wachtwoord opnieuw instellen",
            "password_intro": "U hebt gevraagd om uw wachtwoord opnieuw in te stellen.",
            "password_action": "Stel uw wachtwoord opnieuw in",
            "login_label": "Aanmelden",
        }
    return {
        "greeting": "Hello",
        "registration_subject": "WpRef - confirm your registration",
        "registration_intro": "Thank you for registering on WpRef.",
        "registration_action": "Confirm your email address",
        "password_subject": "WpRef - password reset",
        "password_intro": "You requested a password reset.",
        "password_action": "Reset your password",
        "login_label": "Login",
    }


def build_registration_confirmation_body(user) -> str:
    copy = _registration_copy(getattr(user, "language", None))
    confirmation_link = build_user_token_link("/user/confirm-email", user)
    return (
        f"{copy['greeting']} {user.get_display_name()},\n\n"
        f"{copy['registration_intro']}\n"
        f"{copy['registration_action']}: {confirmation_link}\n\n"
        f"{copy['login_label']}: {frontend_url('/login')}\n"
    )


def send_registration_confirmation_email(user) -> None:
    send_user_plaintext_email(
        user=user,
        subject_builder=lambda current_user: _registration_copy(getattr(current_user, "language", None))["registration_subject"],
        body_builder=build_registration_confirmation_body,
    )


def build_password_reset_body(user) -> str:
    copy = _registration_copy(getattr(user, "language", None))
    reset_link = build_user_token_link("/user/reset-password", user)
    return (
        f"{copy['greeting']} {user.get_display_name()},\n\n"
        f"{copy['password_intro']}\n"
        f"{copy['password_action']}: {reset_link}\n\n"
        f"{copy['login_label']}: {frontend_url('/login')}\n"
    )


def send_password_reset_email(user) -> None:
    send_user_plaintext_email(
        user=user,
        subject_builder=lambda current_user: _registration_copy(getattr(current_user, "language", None))["password_subject"],
        body_builder=build_password_reset_body,
    )
