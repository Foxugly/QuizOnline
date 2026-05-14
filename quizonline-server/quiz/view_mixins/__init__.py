"""
Per-feature mixin classes for the quiz viewsets.

Each module owns one logical slice as a small mixin that contributes
its own ``@action`` methods, helpers and OpenAPI schemas. The host
viewsets in ``quiz/views.py`` compose them:

- ``QuizTemplateViewSet`` (sessions, generate-from-subjects, question CRUD)

Re-exporting from this package keeps ``views.py`` imports tidy.
"""

from .template_generate import TemplateGenerateFromSubjectsMixin
from .template_questions import TemplateQuestionActionsMixin
from .template_sessions import TemplateSessionsMixin

__all__ = [
    "TemplateGenerateFromSubjectsMixin",
    "TemplateQuestionActionsMixin",
    "TemplateSessionsMixin",
]
