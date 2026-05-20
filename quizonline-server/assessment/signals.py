from django.apps import apps
from django.db.models.signals import post_save


def _on_quiz_saved(sender, instance, created, **kwargs):
    if instance.active is True:
        return  # session not finished yet
    from .services import evaluate_lesson_quiz_attempt
    evaluate_lesson_quiz_attempt(quiz_session=instance)


def _connect():
    Quiz = apps.get_model("quiz", "Quiz")
    post_save.connect(
        _on_quiz_saved,
        sender=Quiz,
        dispatch_uid="assessment.quiz_post_save",
    )
