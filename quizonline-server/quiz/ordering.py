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
    template = quiz.quiz_template
    qquestions = list(
        template.quiz_questions.all().order_by("sort_order", "id")
    )
    if template.shuffle_questions:
        random.Random(quiz.id).shuffle(qquestions)
    # Honour ``QuizTemplate.max_questions``: the session presents (and
    # scores) only the configured subset of the pool. The cap is applied
    # AFTER the deterministic shuffle so which questions are picked is
    # stable per session yet varies across sessions of the same template.
    max_questions = template.max_questions
    if max_questions and max_questions > 0:
        qquestions = qquestions[:max_questions]
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
