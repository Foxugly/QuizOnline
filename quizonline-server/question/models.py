# question/models.py
import os
import uuid

from django.contrib.contenttypes.fields import GenericRelation
from django.db import models
from django.db.models import UniqueConstraint
from django.utils.translation import gettext_lazy as _
from parler.models import TranslatedFields, TranslatableModel
from config.models import ActivatableMixin, AuditMixin
from subject.models import Subject


# Retained for migration history only — the ``MediaAsset`` / ``QuestionMedia``
# models that used it were dropped when image / video / file content
# moved to content blocks. Don't call from new code; ``Block`` writes
# its own upload paths.
MAX_MEDIA_FILENAME_LENGTH = 16


def media_asset_upload_to(_instance, filename: str) -> str:
    ext = os.path.splitext(filename or "")[1].lower()
    if len(ext) >= MAX_MEDIA_FILENAME_LENGTH:
        ext = ""
    stem_length = max(1, MAX_MEDIA_FILENAME_LENGTH - len(ext))
    unique_name = f"{uuid.uuid4().hex[:stem_length]}{ext}"
    return f"question_media/{unique_name}"


class Question(AuditMixin, ActivatableMixin, TranslatableModel):
    """A multilingual question. The question prompt and the answer
    explanation used to live as parler-translated rich-text fields
    (``description`` / ``explanation``). Phase 3 of the LMS refactor
    replaced both with two polymorphic block lists hosted via
    GenericRelation to :class:`block.Block`:

    - ``prompt_blocks()`` — the question prompt (text, media, code, …)
    - ``explanation_blocks()`` — the answer rationale

    The short identifier ``title`` translation stays as a regular
    parler field.
    """
    domain = models.ForeignKey(
        "domain.Domain",
        on_delete=models.PROTECT,
        related_name="questions", null=False)
    translations = TranslatedFields(
        title=models.CharField(_("title"), max_length=250),
    )
    allow_multiple_correct = models.BooleanField(
        "Plusieurs bonnes réponses ?", default=False
    )
    active = models.BooleanField(default=True)
    is_mode_practice = models.BooleanField("Pour s'exercer", default=True)
    is_mode_exam = models.BooleanField("Pour les examens", default=False)
    subjects = models.ManyToManyField(Subject, related_name="questions", through="QuestionSubject")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Polymorphic block host. A Question carries TWO disjoint block
    # lists discriminated by ``Block.block_role`` (``prompt`` vs
    # ``explanation``).
    blocks = GenericRelation(
        "block.Block",
        content_type_field="target_content_type",
        object_id_field="target_object_id",
        related_query_name="question",
    )

    class Meta:
        ordering = ["-pk"]
        indexes = [
            models.Index(fields=["domain", "active"], name="question_domain_active_idx"),
        ]

    def __str__(self):
        title = self.safe_translation_getter("title", any_language=True)
        return title or f"Question#{self.pk}"

    def prompt_blocks(self):
        from block.models import Block
        return self.blocks.filter(block_role=Block.ROLE_PROMPT).order_by("order")

    def explanation_blocks(self):
        from block.models import Block
        return self.blocks.filter(block_role=Block.ROLE_EXPLANATION).order_by("order")


class QuestionSubject(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "id"]
        constraints = [
            UniqueConstraint(fields=["question", "subject"], name="uniq_question_subject")
        ]

    def __str__(self):
        subj = self.subject.safe_translation_getter("name", any_language=True) or f"Subject#{self.subject_id}"
        return f"Q{self.question_id}↔{subj}(ord:{self.sort_order})"



class AnswerOption(models.Model):
    """A single answer choice. Phase 3 of the LMS refactor dropped the
    parler ``content`` rich-text field in favour of a polymorphic block
    list — every option hosts its own ``blocks`` (typically a single
    rich_text block, but any block type now works).

    The model is no longer a :class:`TranslatableModel` because the only
    translated field (``content``) has migrated to the block list.
    """
    question = models.ForeignKey(Question, related_name="answer_options", on_delete=models.CASCADE)
    is_correct = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Polymorphic block host. AnswerOption uses the default
    # ``Block.block_role = 'body'`` since there is no semantic split.
    blocks = GenericRelation(
        "block.Block",
        content_type_field="target_content_type",
        object_id_field="target_object_id",
        related_query_name="answer_option",
    )

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"Option(Q{self.question_id}) [{'✔' if self.is_correct else '✗'}]"
