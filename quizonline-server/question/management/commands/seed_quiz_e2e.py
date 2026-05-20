"""Per-app Playwright fullstack seed for the quiz / question flow.

Idempotent. Creates the deterministic question + quiz template +
quiz session the ``quiz-fullstack.spec.ts`` Playwright spec drives.

Reuses :mod:`core.seed_e2e` to share the admin / testuser / domain
fixtures with the LMS seed so the two commands stay in sync.
"""

from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction

from django.contrib.contenttypes.models import ContentType

from block.models import Block
from core.seed_e2e import (
    MP4_PLACEHOLDER,
    PNG_1X1,
    ensure_e2e_admin,
    ensure_e2e_domain,
    ensure_e2e_languages,
    ensure_e2e_testuser,
    file_digest,
    upsert_translation,
)
from domain.models import Domain
from question.models import AnswerOption, MediaAsset, Question, QuestionMedia
from question.youtube import normalize_external_url
from quiz.constants import VISIBILITY_IMMEDIATE
from quiz.models import Quiz, QuizQuestion, QuizTemplate
from subject.models import Subject


def _seed_block(*, host, role: str, rich_text_by_lang: dict[str, str]) -> Block:
    """Helper for the Playwright seed: create one rich_text Block on
    the given host (Question or AnswerOption) under the given role,
    with the supplied per-language content. Replaces the legacy
    parler ``description`` / ``explanation`` / ``content`` writes.
    """
    host_ct = ContentType.objects.get_for_model(type(host))
    Block.objects.filter(
        target_content_type=host_ct,
        target_object_id=host.pk,
        block_role=role,
    ).delete()
    block = Block.objects.create(
        target_content_type=host_ct,
        target_object_id=host.pk,
        block_type=Block.TYPE_RICH_TEXT,
        block_role=role,
        order=0,
    )
    translation_model = block._parler_meta.root_model
    for lang_code, value in rich_text_by_lang.items():
        translation_model.objects.update_or_create(
            master_id=block.pk,
            language_code=lang_code,
            defaults={"title": "", "rich_text": value, "callout_text": ""},
        )
    return block


class Command(BaseCommand):
    help = "Seed quiz / question / quiz-session fixtures for Playwright full-stack tests."

    @transaction.atomic
    def handle(self, *args, **options):
        media_dir = Path(settings.MEDIA_ROOT) / "question_media"
        media_dir.mkdir(parents=True, exist_ok=True)

        ensure_e2e_languages()
        admin = ensure_e2e_admin()
        testuser = ensure_e2e_testuser()
        domain = ensure_e2e_domain(admin, testuser)

        subject_physics = self._upsert_subject(domain, "Physique", "Fysica", "Sujet seed.", "Seedonderwerp.")
        subject_astronomy = self._upsert_subject(
            domain, "Astronomie", "Sterrenkunde", "Sujet secondaire.", "Tweede onderwerp.",
        )

        question = self._upsert_question(domain=domain, index=1, allow_multiple_correct=False)
        question.subjects.set([subject_physics, subject_astronomy])
        upsert_translation(question, "fr", title="Question de seed")
        upsert_translation(question, "nl", title="Seedvraag")
        _seed_block(
            host=question, role=Block.ROLE_PROMPT,
            rich_text_by_lang={"fr": "<p>Description FR</p>", "nl": "<p>Beschrijving NL</p>"},
        )
        _seed_block(
            host=question, role=Block.ROLE_EXPLANATION,
            rich_text_by_lang={"fr": "<p>Explication FR</p>", "nl": "<p>Uitleg NL</p>"},
        )

        question.answer_options.all().delete()
        good_answer = AnswerOption.objects.create(question=question, is_correct=True, sort_order=1)
        _seed_block(
            host=good_answer, role=Block.ROLE_BODY,
            rich_text_by_lang={"fr": "<p>Bonne reponse</p>", "nl": "<p>Goed antwoord</p>"},
        )
        bad_answer = AnswerOption.objects.create(question=question, is_correct=False, sort_order=2)
        _seed_block(
            host=bad_answer, role=Block.ROLE_BODY,
            rich_text_by_lang={"fr": "<p>Mauvaise reponse</p>", "nl": "<p>Fout antwoord</p>"},
        )

        second_question = self._upsert_question(domain=domain, index=2, allow_multiple_correct=True)
        second_question.subjects.set([subject_physics])
        upsert_translation(second_question, "fr", title="Question de quiz 2")
        upsert_translation(second_question, "nl", title="Quizvraag 2")
        _seed_block(
            host=second_question, role=Block.ROLE_PROMPT,
            rich_text_by_lang={
                "fr": "<p>Description quiz 2 FR</p>",
                "nl": "<p>Beschrijving quiz 2 NL</p>",
            },
        )
        _seed_block(
            host=second_question, role=Block.ROLE_EXPLANATION,
            rich_text_by_lang={
                "fr": "<p>Explication quiz 2 FR</p>",
                "nl": "<p>Uitleg quiz 2 NL</p>",
            },
        )

        second_question.answer_options.all().delete()
        second_good_answer = AnswerOption.objects.create(
            question=second_question, is_correct=True, sort_order=1,
        )
        _seed_block(
            host=second_good_answer, role=Block.ROLE_BODY,
            rich_text_by_lang={
                "fr": "<p>Bonne reponse quiz 2</p>",
                "nl": "<p>Goed antwoord quiz 2</p>",
            },
        )
        second_bad_answer = AnswerOption.objects.create(
            question=second_question, is_correct=False, sort_order=2,
        )
        _seed_block(
            host=second_bad_answer, role=Block.ROLE_BODY,
            rich_text_by_lang={
                "fr": "<p>Mauvaise reponse quiz 2</p>",
                "nl": "<p>Fout antwoord quiz 2</p>",
            },
        )

        image_asset = self._upsert_file_asset(
            kind=MediaAsset.IMAGE, filename="fullstack-e2e-image.png", content=PNG_1X1,
        )
        video_asset = self._upsert_file_asset(
            kind=MediaAsset.VIDEO, filename="fullstack-e2e-video.mp4", content=MP4_PLACEHOLDER,
        )
        youtube_asset, _ = MediaAsset.objects.update_or_create(
            kind=MediaAsset.EXTERNAL,
            external_url=normalize_external_url("https://youtu.be/dQw4w9WgXcQ?t=43"),
            defaults={"sha256": None, "file": None},
        )

        QuestionMedia.objects.filter(question=question).delete()
        QuestionMedia.objects.bulk_create([
            QuestionMedia(question=question, asset=image_asset, sort_order=0),
            QuestionMedia(question=question, asset=video_asset, sort_order=1),
            QuestionMedia(question=question, asset=youtube_asset, sort_order=2),
        ])

        quiz_template = self._upsert_quiz_template(domain)
        QuizQuestion.objects.filter(quiz=quiz_template).exclude(
            question__in=[question, second_question],
        ).delete()
        QuizQuestion.objects.update_or_create(
            quiz=quiz_template, question=question,
            defaults={"sort_order": 1, "weight": 1},
        )
        QuizQuestion.objects.update_or_create(
            quiz=quiz_template, question=second_question,
            defaults={"sort_order": 2, "weight": 1},
        )

        quiz_session = self._upsert_quiz_session(quiz_template, admin, domain)

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded quiz e2e: question_id={question.id} quiz_id={quiz_session.id}",
            ),
        )

    def _upsert_subject(
        self, domain: Domain, fr_name: str, nl_name: str, fr_desc: str, nl_desc: str,
    ) -> Subject:
        subject = (
            Subject.objects.filter(
                domain=domain,
                translations__language_code="fr",
                translations__name=fr_name,
            )
            .distinct()
            .first()
        )
        if subject is None:
            subject = Subject.objects.create(domain=domain, active=True)
        else:
            subject.active = True
            subject.save(update_fields=["active"])
        upsert_translation(subject, "fr", name=fr_name, description=fr_desc)
        upsert_translation(subject, "nl", name=nl_name, description=nl_desc)
        return subject

    def _upsert_quiz_template(self, domain: Domain) -> QuizTemplate:
        quiz_template = (
            QuizTemplate.objects.filter(domain=domain, title="Quiz full-stack")
            .order_by("id")
            .first()
        )
        if quiz_template is None:
            quiz_template = QuizTemplate.objects.create(
                domain=domain,
                title="Quiz full-stack",
                mode=QuizTemplate.MODE_PRACTICE,
                description="Quiz seed pour Playwright.",
                max_questions=2,
                permanent=True,
                with_duration=True,
                duration=15,
                active=True,
                result_visibility=VISIBILITY_IMMEDIATE,
                detail_visibility=VISIBILITY_IMMEDIATE,
            )
        quiz_template.domain = domain
        quiz_template.mode = QuizTemplate.MODE_PRACTICE
        quiz_template.description = "Quiz seed pour Playwright."
        quiz_template.max_questions = 2
        quiz_template.permanent = True
        quiz_template.with_duration = True
        quiz_template.duration = 15
        quiz_template.active = True
        quiz_template.result_visibility = VISIBILITY_IMMEDIATE
        quiz_template.detail_visibility = VISIBILITY_IMMEDIATE
        quiz_template.save()
        return quiz_template

    def _upsert_quiz_session(self, quiz_template: QuizTemplate, admin, domain: Domain) -> Quiz:
        quiz_session = (
            Quiz.objects.filter(quiz_template=quiz_template, user=admin)
            .order_by("id")
            .first()
        )
        if quiz_session is None:
            quiz_session = Quiz.objects.create(
                quiz_template=quiz_template,
                user=admin,
                domain=domain,
                active=False,
                started_at=None,
                ended_at=None,
            )
        quiz_session.domain = domain
        quiz_session.active = False
        quiz_session.started_at = None
        quiz_session.ended_at = None
        quiz_session.save()
        quiz_session.answers.all().delete()
        return quiz_session

    def _upsert_file_asset(self, *, kind: str, filename: str, content: bytes) -> MediaAsset:
        digest = file_digest(content)
        asset = MediaAsset.objects.filter(kind=kind, sha256=digest).first()
        if asset:
            file_missing = not asset.file or not asset.file.name or not Path(asset.file.path).exists()
            if file_missing:
                asset.file.save(filename, ContentFile(content), save=False)
                asset.save(update_fields=["file", "updated_at"])
            return asset
        asset = MediaAsset(kind=kind, sha256=digest)
        asset.file.save(filename, ContentFile(content), save=False)
        asset.save()
        return asset

    def _upsert_question(self, *, domain: Domain, index: int, allow_multiple_correct: bool) -> Question:
        question = (
            Question.objects.filter(domain=domain)
            .order_by("id")
            .all()[index - 1:index]
            .first()
        )
        if question is None:
            question = Question.objects.create(
                domain=domain,
                active=True,
                is_mode_practice=True,
                is_mode_exam=True,
                allow_multiple_correct=allow_multiple_correct,
            )
        else:
            question.active = True
            question.is_mode_practice = True
            question.is_mode_exam = True
            question.allow_multiple_correct = allow_multiple_correct
            question.save(update_fields=[
                "active", "is_mode_practice", "is_mode_exam", "allow_multiple_correct",
            ])
        return question
