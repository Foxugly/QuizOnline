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
    # While the user is still answering — regardless of who they are
    # (regular user, manager, superuser) — the correct/incorrect
    # markers must stay hidden so they don't act as a hint mid-attempt.
    # Admins used to flip to FULL unconditionally; that meant a
    # manager who started their own quiz saw the green highlights
    # before clicking an answer.
    if quiz.can_answer:
        return ANSWER_CORRECTNESS_UNKNOWN

    if is_quiz_admin(user):
        return ANSWER_CORRECTNESS_FULL

    # A quiz that has been created but NOT yet started (started_at is None) is
    # also "can_answer == False", which would otherwise fall through to the
    # practice branch below and reveal every correct answer BEFORE the taker
    # begins. The correction only teaches once an attempt has actually run, so
    # keep it hidden until the quiz is started.
    if quiz.started_at is None:
        return ANSWER_CORRECTNESS_UNKNOWN

    # Once the attempt is closed (submitted, time's up, deactivated…)
    # practice mode is meant to teach: surface the correction.
    if quiz.quiz_template.mode == QuizTemplate.MODE_PRACTICE:
        return ANSWER_CORRECTNESS_FULL

    if quiz.quiz_template.can_show_details():
        return ANSWER_CORRECTNESS_FULL

    return ANSWER_CORRECTNESS_UNKNOWN
