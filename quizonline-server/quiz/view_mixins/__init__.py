"""
Per-feature mixin classes for the quiz viewsets.

Each module owns one logical slice as a small mixin that contributes
its own ``@action`` methods, helpers and OpenAPI schemas. The host
viewsets in ``quiz/views.py`` compose them:

- ``QuizTemplateViewSet`` (sessions, generate-from-subjects, question CRUD)
- ``QuizViewSet`` (bulk-create-from-template, start, close)
- ``QuizAlertThreadViewSet`` (close, reopen, message, unread-count)

Re-exporting from this package keeps ``views.py`` imports tidy.
"""

from .alert_thread_lifecycle import AlertThreadLifecycleMixin
from .alert_thread_messaging import AlertThreadMessagingMixin
from .quiz_bulk_create import QuizBulkCreateMixin
from .quiz_lifecycle import QuizLifecycleMixin
from .template_generate import TemplateGenerateFromSubjectsMixin
from .template_questions import TemplateQuestionActionsMixin
from .template_sessions import TemplateSessionsMixin

__all__ = [
    "AlertThreadLifecycleMixin",
    "AlertThreadMessagingMixin",
    "QuizBulkCreateMixin",
    "QuizLifecycleMixin",
    "TemplateGenerateFromSubjectsMixin",
    "TemplateQuestionActionsMixin",
    "TemplateSessionsMixin",
]
