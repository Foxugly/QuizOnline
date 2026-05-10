"""Per-session question ordering.

When the template's `shuffle_questions` flag is set, each Quiz session gets
its own deterministic ordering seeded by `Quiz.id`. The order is stable for
a given session (no per-request reshuffle), and `Quiz.id` being a primary
key guarantees two sessions of the same template see different orders.

Anywhere we used to rely on `QuizQuestion.sort_order` directly to position
a question in a session, we should use these helpers instead so the player
view, the answer pad, the review screen, and the reconcile step all agree.
"""

from __future__ import annotations

import random
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from quiz.models import Quiz, QuizQuestion


def session_quiz_questions(quiz: "Quiz") -> list["QuizQuestion"]:
    """Return the template's QuizQuestions in the order they should appear
    for this specific session.
    """
    qquestions = list(
        quiz.quiz_template.quiz_questions.all().order_by("sort_order", "id")
    )
    if quiz.quiz_template.shuffle_questions:
        random.Random(quiz.id).shuffle(qquestions)
    return qquestions


def session_position_for(quiz: "Quiz", quizquestion: "QuizQuestion") -> int:
    """1-indexed position of `quizquestion` in the session's display order.

    Falls back to the QuizQuestion's `sort_order` if the question is not
    found in the template's ordered list (shouldn't happen in normal flow).
    """
    ordered = session_quiz_questions(quiz)
    for idx, qq in enumerate(ordered, start=1):
        if qq.id == quizquestion.id:
            return idx
    return quizquestion.sort_order
