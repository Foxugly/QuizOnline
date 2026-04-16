from django.conf import settings

from ._common import format_datetime, frontend_url, render_html_email, send_user_email


def _quiz_copy(language_code: str) -> dict[str, str]:
    app_name = settings.NAME_APP
    if language_code == "fr":
        return {
            "greeting": "Bonjour",
            "assignment_subject": f"{app_name} - nouveau quiz a completer",
            "assignment_intro": "Un quiz vous a ete assigne",
            "deadline": "Deadline",
            "link": "Lien",
            "completed_subject": f"{app_name} - quiz cloture",
            "completed_intro": "a cloture le quiz",
        }
    if language_code == "nl":
        return {
            "greeting": "Hallo",
            "assignment_subject": f"{app_name} - nieuwe quiz om in te vullen",
            "assignment_intro": "Er werd een quiz aan u toegewezen",
            "deadline": "Deadline",
            "link": "Link",
            "completed_subject": f"{app_name} - quiz afgesloten",
            "completed_intro": "heeft de quiz afgesloten",
        }
    return {
        "greeting": "Hello",
        "assignment_subject": f"{app_name} - new quiz to complete",
        "assignment_intro": "A quiz has been assigned to you",
        "deadline": "Deadline",
        "link": "Link",
        "completed_subject": f"{app_name} - quiz completed",
        "completed_intro": "completed the quiz",
    }


def _build_quiz_assignment_body(quiz) -> str:
    user = quiz.user
    template = quiz.quiz_template
    copy = _quiz_copy(getattr(user, "language", None))
    deadline = template.ended_at or quiz.ended_at
    deadline_line = f"{copy['deadline']}: {format_datetime(deadline, getattr(user, 'language', None))}\n" if deadline else ""
    return (
        f"{copy['greeting']} {user.get_display_name()},\n\n"
        f"{copy['assignment_intro']}: {template.title}\n"
        f"{deadline_line}"
        f"{copy['link']}: {frontend_url(f'/quiz/{quiz.id}')}\n"
    )


def _build_quiz_assignment_html(quiz) -> str:
    user = quiz.user
    template = quiz.quiz_template
    copy = _quiz_copy(getattr(user, "language", None))
    deadline = template.ended_at or quiz.ended_at
    quiz_link = frontend_url(f"/quiz/{quiz.id}")
    blocks = [
        {"type": "text", "content": f"{copy['assignment_intro']}: <strong>{template.title}</strong>"},
    ]
    if deadline:
        blocks.append({"type": "text", "content": f"{copy['deadline']}: {format_datetime(deadline, getattr(user, 'language', None))}"})
    blocks.append({"type": "button", "content": quiz_link, "label": copy["link"]})
    return render_html_email(
        heading=f"{copy['greeting']} {user.get_display_name()},",
        blocks=blocks,
    )


def send_quiz_assignment_email(quiz) -> None:
    user = getattr(quiz, "user", None)
    template = getattr(quiz, "quiz_template", None)
    if not user or not template:
        return
    send_user_email(
        user=user,
        subject_builder=lambda u: _quiz_copy(getattr(u, "language", None))["assignment_subject"],
        body_builder=lambda _u: _build_quiz_assignment_body(quiz),
        html_builder=lambda _u: _build_quiz_assignment_html(quiz),
    )


def _build_quiz_completed_body(quiz) -> str:
    template = quiz.quiz_template
    creator = template.created_by
    user = quiz.user
    copy = _quiz_copy(getattr(creator, "language", None))
    return (
        f"{copy['greeting']} {creator.get_display_name()},\n\n"
        f"{user.get_display_name()} {copy['completed_intro']} \"{template.title}\".\n"
        f"{copy['link']}: {frontend_url(f'/quiz/{quiz.id}')}\n"
    )


def _build_quiz_completed_html(quiz) -> str:
    template = quiz.quiz_template
    creator = template.created_by
    user = quiz.user
    copy = _quiz_copy(getattr(creator, "language", None))
    quiz_link = frontend_url(f"/quiz/{quiz.id}")
    return render_html_email(
        heading=f"{copy['greeting']} {creator.get_display_name()},",
        blocks=[
            {"type": "text", "content": f"{user.get_display_name()} {copy['completed_intro']} <strong>\"{template.title}\"</strong>."},
            {"type": "button", "content": quiz_link, "label": copy["link"]},
        ],
    )


def send_quiz_completed_email(quiz) -> None:
    template = getattr(quiz, "quiz_template", None)
    creator = getattr(template, "created_by", None) if template else None
    user = getattr(quiz, "user", None)
    if not creator or not user or creator.id == user.id:
        return
    send_user_email(
        user=creator,
        subject_builder=lambda u: _quiz_copy(getattr(u, "language", None))["completed_subject"],
        body_builder=lambda _u: _build_quiz_completed_body(quiz),
        html_builder=lambda _u: _build_quiz_completed_html(quiz),
    )
