from django.conf import settings

from ._common import format_datetime, frontend_url, render_html_email, send_user_email


def _quiz_copy(language_code: str) -> dict[str, str]:
    app_name = settings.NAME_APP
    if language_code == "fr":
        return {
            "greeting": "Bonjour",
            "assignment_subject": f"{app_name} - nouveau quiz à compléter",
            "assignment_intro": "Un quiz vous a été assigné",
            "deadline": "Deadline",
            "link": "Lien",
            "completed_subject": f"{app_name} - quiz clôturé",
            "completed_intro": "a clôturé le quiz",
            "result_available_subject": f"{app_name} - votre résultat est disponible",
            "result_available_intro": "Votre résultat pour le quiz",
            "result_available_outro": "est désormais consultable",
            "detail_available_subject": f"{app_name} - le détail de vos réponses est disponible",
            "detail_available_intro": "Le détail de vos réponses pour le quiz",
            "detail_available_outro": "est désormais consultable",
            "view_result": "Voir mon résultat",
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
            "result_available_subject": f"{app_name} - uw resultaat is beschikbaar",
            "result_available_intro": "Uw resultaat voor de quiz",
            "result_available_outro": "is nu beschikbaar",
            "detail_available_subject": f"{app_name} - de details van uw antwoorden zijn beschikbaar",
            "detail_available_intro": "De details van uw antwoorden voor de quiz",
            "detail_available_outro": "zijn nu beschikbaar",
            "view_result": "Mijn resultaat bekijken",
        }
    if language_code == "it":
        return {
            "greeting": "Ciao",
            "assignment_subject": f"{app_name} - nuovo quiz da completare",
            "assignment_intro": "Ti è stato assegnato un quiz",
            "deadline": "Scadenza",
            "link": "Link",
            "completed_subject": f"{app_name} - quiz chiuso",
            "completed_intro": "ha chiuso il quiz",
            "result_available_subject": f"{app_name} - il tuo risultato è disponibile",
            "result_available_intro": "Il tuo risultato per il quiz",
            "result_available_outro": "è ora consultabile",
            "detail_available_subject": f"{app_name} - il dettaglio delle tue risposte è disponibile",
            "detail_available_intro": "Il dettaglio delle tue risposte per il quiz",
            "detail_available_outro": "è ora consultabile",
            "view_result": "Vedi il mio risultato",
        }
    if language_code == "es":
        return {
            "greeting": "Hola",
            "assignment_subject": f"{app_name} - nuevo cuestionario por completar",
            "assignment_intro": "Se te ha asignado un cuestionario",
            "deadline": "Fecha límite",
            "link": "Enlace",
            "completed_subject": f"{app_name} - cuestionario cerrado",
            "completed_intro": "ha cerrado el cuestionario",
            "result_available_subject": f"{app_name} - tu resultado está disponible",
            "result_available_intro": "Tu resultado para el cuestionario",
            "result_available_outro": "ya está disponible",
            "detail_available_subject": f"{app_name} - el detalle de tus respuestas está disponible",
            "detail_available_intro": "El detalle de tus respuestas para el cuestionario",
            "detail_available_outro": "ya está disponible",
            "view_result": "Ver mi resultado",
        }
    return {
        "greeting": "Hello",
        "assignment_subject": f"{app_name} - new quiz to complete",
        "assignment_intro": "A quiz has been assigned to you",
        "deadline": "Deadline",
        "link": "Link",
        "completed_subject": f"{app_name} - quiz completed",
        "completed_intro": "completed the quiz",
        "result_available_subject": f"{app_name} - your result is available",
        "result_available_intro": "Your result for the quiz",
        "result_available_outro": "is now available",
        "detail_available_subject": f"{app_name} - your answer detail is available",
        "detail_available_intro": "The detail of your answers for the quiz",
        "detail_available_outro": "is now available",
        "view_result": "View my result",
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
    from customuser.notifications import KIND_QUIZ_ASSIGNMENT, notify
    user = getattr(quiz, "user", None)
    template = getattr(quiz, "quiz_template", None)
    if not user or not template:
        return
    notify(
        user=user,
        kind=KIND_QUIZ_ASSIGNMENT,
        payload={
            "quiz_id": getattr(quiz, "id", None),
            "template_id": getattr(template, "id", None),
            "template_title": getattr(template, "title", ""),
        },
        domain=getattr(template, "domain", None),
        email_callable=lambda: send_user_email(
            user=user,
            subject_builder=lambda u: _quiz_copy(getattr(u, "language", None))["assignment_subject"],
            body_builder=lambda _u: _build_quiz_assignment_body(quiz),
            html_builder=lambda _u: _build_quiz_assignment_html(quiz),
        ),
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
    from customuser.notifications import KIND_QUIZ_COMPLETED, notify
    template = getattr(quiz, "quiz_template", None)
    creator = getattr(template, "created_by", None) if template else None
    user = getattr(quiz, "user", None)
    if not creator or not user or creator.id == user.id:
        return
    notify(
        user=creator,
        kind=KIND_QUIZ_COMPLETED,
        payload={
            "quiz_id": getattr(quiz, "id", None),
            "template_id": getattr(template, "id", None),
            "template_title": getattr(template, "title", ""),
            "user_id": getattr(user, "id", None),
            "user_name": user.get_display_name() if user else "",
        },
        domain=getattr(template, "domain", None),
        email_callable=lambda: send_user_email(
            user=creator,
            subject_builder=lambda u: _quiz_copy(getattr(u, "language", None))["completed_subject"],
            body_builder=lambda _u: _build_quiz_completed_body(quiz),
            html_builder=lambda _u: _build_quiz_completed_html(quiz),
        ),
    )


def _build_visibility_body(quiz, *, scope: str) -> str:
    """scope is 'result' or 'detail'."""
    user = quiz.user
    template = quiz.quiz_template
    copy = _quiz_copy(getattr(user, "language", None))
    return (
        f"{copy['greeting']} {user.get_display_name()},\n\n"
        f"{copy[f'{scope}_available_intro']} \"{template.title}\" {copy[f'{scope}_available_outro']}.\n"
        f"{copy['link']}: {frontend_url(f'/quiz/{quiz.id}')}\n"
    )


def _build_visibility_html(quiz, *, scope: str) -> str:
    user = quiz.user
    template = quiz.quiz_template
    copy = _quiz_copy(getattr(user, "language", None))
    quiz_link = frontend_url(f"/quiz/{quiz.id}")
    return render_html_email(
        heading=f"{copy['greeting']} {user.get_display_name()},",
        blocks=[
            {
                "type": "text",
                "content": (
                    f"{copy[f'{scope}_available_intro']} <strong>\"{template.title}\"</strong> "
                    f"{copy[f'{scope}_available_outro']}."
                ),
            },
            {"type": "button", "content": quiz_link, "label": copy["view_result"]},
        ],
    )


def send_result_available_email(quiz) -> None:
    from customuser.notifications import KIND_QUIZ_RESULT_AVAILABLE, notify
    user = getattr(quiz, "user", None)
    template = getattr(quiz, "quiz_template", None)
    if not user or not template:
        return
    notify(
        user=user,
        kind=KIND_QUIZ_RESULT_AVAILABLE,
        payload={
            "quiz_id": getattr(quiz, "id", None),
            "template_id": getattr(template, "id", None),
            "template_title": getattr(template, "title", ""),
        },
        domain=getattr(template, "domain", None),
        email_callable=lambda: send_user_email(
            user=user,
            subject_builder=lambda u: _quiz_copy(getattr(u, "language", None))["result_available_subject"],
            body_builder=lambda _u: _build_visibility_body(quiz, scope="result"),
            html_builder=lambda _u: _build_visibility_html(quiz, scope="result"),
        ),
    )


def send_detail_available_email(quiz) -> None:
    from customuser.notifications import KIND_QUIZ_DETAIL_AVAILABLE, notify
    user = getattr(quiz, "user", None)
    template = getattr(quiz, "quiz_template", None)
    if not user or not template:
        return
    notify(
        user=user,
        kind=KIND_QUIZ_DETAIL_AVAILABLE,
        payload={
            "quiz_id": getattr(quiz, "id", None),
            "template_id": getattr(template, "id", None),
            "template_title": getattr(template, "title", ""),
        },
        domain=getattr(template, "domain", None),
        email_callable=lambda: send_user_email(
            user=user,
            subject_builder=lambda u: _quiz_copy(getattr(u, "language", None))["detail_available_subject"],
            body_builder=lambda _u: _build_visibility_body(quiz, scope="detail"),
            html_builder=lambda _u: _build_visibility_html(quiz, scope="detail"),
        ),
    )
