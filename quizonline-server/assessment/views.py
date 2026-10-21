from django.db.models import Q
from rest_framework import viewsets

from course.models import Course
from course.permissions import IsLmsInstructorOrReadOnly
from lesson.models import Lesson

from .models import LessonQuiz
from .serializers import LessonQuizSerializer


class LessonQuizViewSet(viewsets.ModelViewSet):
    # Class-level ``none()`` so drf-spectacular can introspect the model
    # without firing the real query against an empty request.user.
    queryset = LessonQuiz.objects.none()
    serializer_class = LessonQuizSerializer
    permission_classes = [IsLmsInstructorOrReadOnly]

    def get_queryset(self):
        """Scope to LessonQuiz rows whose content the caller may read. A
        LessonQuiz binds either a course (final quiz) or a lesson — in
        which case it ladders up to ``lesson.section.course``.

        Both querysets keep drafts for the domain instructors (owner /
        manager) and hide them from learners; on an ``approval`` /
        ``invite`` course a learner also needs an active or completed
        enrollment (``content_readable_by``).

        Without this filter the list endpoint leaked every LessonQuiz row
        to any authenticated user; ``IsLmsInstructorOrReadOnly`` only
        kicks in at the per-object permission gate on detail routes.
        """
        user = self.request.user
        if not user or not user.is_authenticated:
            return LessonQuiz.objects.none()
        # Content gate: a course-level quiz needs the course content to be
        # readable, a lesson quiz the lesson content (enrollment required
        # on approval / invite courses, see ``content_readable_by``).
        readable_course_ids = Course.objects.content_readable_by(user).values("id")
        readable_lesson_ids = Lesson.objects.content_readable_by(user).values("id")
        return (
            LessonQuiz.objects
            .filter(
                Q(lesson__isnull=True, course_id__in=readable_course_ids)
                | Q(lesson_id__in=readable_lesson_ids)
            )
            .select_related("lesson", "course", "quiz_template")
            .order_by("id")
        )
