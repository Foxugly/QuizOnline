from __future__ import annotations

from quiz.models import Quiz, QuizQuestionAnswer
from quiz.scoring import compute_answer_score


def _answers_queryset(quiz):
    return (
        quiz.answers
        .select_related("quizquestion__question")
        .prefetch_related(
            "selected_options",
            "quizquestion__question__answer_options",
        )
    )


def reconcile_quiz_answers(quiz: Quiz) -> None:
    """
    Crée les réponses manquantes et recalcule les scores pour un quiz fermé.
    Modifie les objets en base via bulk_create / bulk_update.
    Invalide le prefetch cache du quiz en fin d'opération.
    """
    quiz_questions = list(
        quiz.quiz_template.quiz_questions
        .select_related("question")
        .prefetch_related("question__answer_options")
        .order_by("sort_order", "id")
    )

    existing_answers = list(_answers_queryset(quiz))
    existing_answer_ids = {a.quizquestion_id for a in existing_answers}

    missing = []
    for qq in quiz_questions:
        if qq.id not in existing_answer_ids:
            answer = QuizQuestionAnswer(quiz=quiz, quizquestion=qq, question_order=qq.sort_order)
            answer._skip_answer_validation = True
            missing.append(answer)
    if missing:
        QuizQuestionAnswer.objects.bulk_create(missing)
        existing_answers = list(_answers_queryset(quiz))

    to_update = []
    for answer in existing_answers:
        earned, max_score, is_correct = compute_answer_score(answer)
        if (
            float(answer.max_score or 0) != max_score
            or float(answer.earned_score or 0) != earned
            or answer.is_correct != is_correct
        ):
            answer.max_score = max_score
            answer.earned_score = earned
            answer.is_correct = is_correct
            to_update.append(answer)

    if to_update:
        QuizQuestionAnswer.objects.bulk_update(
            to_update,
            ["earned_score", "max_score", "is_correct"],
        )

    if hasattr(quiz, "_prefetched_objects_cache"):
        quiz._prefetched_objects_cache = {}
    if hasattr(quiz, "_answers_cache"):
        delattr(quiz, "_answers_cache")


def synchronize_closed_quiz_answers(quiz: Quiz) -> Quiz:
    if quiz.started_at is None or quiz.active:
        return quiz
    reconcile_quiz_answers(quiz)
    return quiz
