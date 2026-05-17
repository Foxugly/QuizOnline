from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils.translation import gettext_lazy as _


class LessonQuiz(models.Model):
    lesson = models.OneToOneField(
        "lms_catalog.Lesson", on_delete=models.CASCADE,
        related_name="validation_quiz", null=True, blank=True,
    )
    course = models.OneToOneField(
        "lms_catalog.Course", on_delete=models.CASCADE,
        related_name="final_quiz", null=True, blank=True,
    )
    quiz_template = models.ForeignKey(
        "quiz.QuizTemplate", on_delete=models.PROTECT, related_name="lesson_validations",
    )
    required_score_percent = models.PositiveSmallIntegerField(default=70)
    is_required = models.BooleanField(default=True)
    max_attempts = models.PositiveIntegerField(default=0, help_text=_("0 = unlimited."))
    unlock_next_lesson_on_success = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(lesson__isnull=False, course__isnull=True)
                    | Q(lesson__isnull=True, course__isnull=False)
                ),
                name="lessonquiz_exactly_one_target",
            ),
        ]

    def __str__(self) -> str:
        return f"LessonQuiz<lesson={self.lesson_id}, course={self.course_id}>"

    def clean(self) -> None:
        super().clean()
        has_lesson = bool(self.lesson_id)
        has_course = bool(self.course_id)
        if has_lesson == has_course:
            raise ValidationError(_("LessonQuiz must reference either a lesson or a course (exactly one)."))
        if has_lesson:
            target_domain_id = self.lesson.section.course.domain_id
        else:
            target_domain_id = self.course.domain_id
        if self.quiz_template_id and self.quiz_template.domain_id != target_domain_id:
            raise ValidationError({
                "quiz_template": _("Quiz must belong to the same domain as the target."),
            })
