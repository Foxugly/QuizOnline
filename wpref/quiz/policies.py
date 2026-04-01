from __future__ import annotations

from quiz.models import Quiz, QuizTemplate


ANSWER_CORRECTNESS_FULL = "full"
ANSWER_CORRECTNESS_UNKNOWN = "unknown"
ANSWER_CORRECTNESS_HIDDEN = "hidden"


def is_quiz_admin(user) -> bool:
    return bool(user and (user.is_staff or user.is_superuser))


def can_show_quiz_result(*, quiz: Quiz, user) -> bool:
    return is_quiz_admin(user) or bool(quiz.quiz_template.can_show_result())


def can_show_quiz_details(*, quiz: Quiz, user) -> bool:
    return is_quiz_admin(user) or bool(quiz.quiz_template.can_show_details())


def answer_correctness_state(*, quiz: Quiz, user) -> str:
    if is_quiz_admin(user):
        return ANSWER_CORRECTNESS_FULL

    if quiz.quiz_template.mode == QuizTemplate.MODE_PRACTICE:
        return ANSWER_CORRECTNESS_FULL

    if quiz.can_answer:
        return ANSWER_CORRECTNESS_UNKNOWN

    if quiz.quiz_template.can_show_details():
        return ANSWER_CORRECTNESS_FULL

    return ANSWER_CORRECTNESS_UNKNOWN
