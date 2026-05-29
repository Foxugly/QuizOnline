from django.db.models import Q
from rest_framework import viewsets

from course.models import Course
from course.permissions import IsLmsInstructorOrReadOnly

from .models import LessonQuiz
from .serializers import LessonQuizSerializer


class LessonQuizViewSet(viewsets.ModelViewSet):
    # Class-level ``none()`` so drf-spectacular can introspect the model
    # without firing the real query against an empty request.user.
    queryset = LessonQuiz.objects.none()
    serializer_class = LessonQuizSerializer
    permission_classes = [IsLmsInstructorOrReadOnly]

    def get_queryset(self):
        """Scope to LessonQuiz rows whose parent course is visible to
        the caller. A LessonQuiz binds either a course (final quiz) or
        a lesson — in which case it ladders up to ``lesson.section.course``.

        We anchor the scoping on ``Course.visible_to`` rather than
        ``Lesson.visible_to`` because the lesson-level visibility filters
        out drafts even for instructors of the parent course, whereas the
        course-level visibility correctly surfaces drafts to instructors.

        Without this filter the list endpoint leaked every LessonQuiz row
        to any authenticated user; ``IsLmsInstructorOrReadOnly`` only
        kicks in at the per-object permission gate on detail routes.
        """
        user = self.request.user
        if not user or not user.is_authenticated:
            return LessonQuiz.objects.none()
        visible_course_ids = Course.objects.visible_to(user).values_list("id", flat=True)
        return (
            LessonQuiz.objects
            .filter(
                Q(course_id__in=visible_course_ids)
                | Q(lesson__section__course_id__in=visible_course_ids)
            )
            .select_related("lesson", "course", "quiz_template")
            .order_by("id")
        )
