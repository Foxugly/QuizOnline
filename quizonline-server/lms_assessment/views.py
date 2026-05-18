from rest_framework import viewsets

from lms_catalog.permissions import IsLmsInstructorOrReadOnly

from .models import LessonQuiz
from .serializers import LessonQuizSerializer


class LessonQuizViewSet(viewsets.ModelViewSet):
    serializer_class = LessonQuizSerializer
    permission_classes = [IsLmsInstructorOrReadOnly]
    queryset = LessonQuiz.objects.all().select_related("lesson", "course", "quiz_template")
