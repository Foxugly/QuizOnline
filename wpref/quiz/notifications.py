from __future__ import annotations

from collections.abc import Iterable

from core.emailing import send_quiz_assignment_email, send_quiz_completed_email


def notify_quiz_assigned(quiz) -> None:
    send_quiz_assignment_email(quiz)


def notify_quizzes_assigned(quizzes: Iterable) -> None:
    for quiz in quizzes:
        notify_quiz_assigned(quiz)


def notify_quiz_completed(quiz) -> None:
    send_quiz_completed_email(quiz)
