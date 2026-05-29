# Phase 3 of the LMS refactor — convert legacy ``Question.description``,
# ``Question.explanation`` and ``AnswerOption.content`` rich-text fields
# into polymorphic block rows hosted on the corresponding Question /
# AnswerOption via the ``Block.target`` GenericForeignKey.
#
# Migration order:
#  1. ``RunPython`` — for every existing ``QuestionTranslation`` /
#     ``AnswerOptionTranslation`` row with non-empty content, create one
#     ``Block`` (+ ``BlockTranslation`` rows). Question uses two roles
#     (``prompt`` for description, ``explanation`` for explanation);
#     AnswerOption uses the default ``body`` role.
#  2. ``RemoveField`` / ``DeleteModel`` — drop the now-empty rich-text
#     columns from the translation tables.
#
# Branch DB note: this file runs on a fresh, empty database when the
# branch is being developed, so the ``RunPython`` step is a no-op
# there. On prod (after ``manage.py migrate_lms_split`` has renamed
# the legacy tables into the split apps — see deploy/MIGRATE-LMS-SPLIT.md),
# this same migration carries the real data conversion.

from django.db import migrations


def _forward(apps, schema_editor):
    Block = apps.get_model("block", "Block")
    BlockTranslation = apps.get_model("block", "BlockTranslation")
    Question = apps.get_model("question", "Question")
    QuestionTranslation = apps.get_model("question", "QuestionTranslation")
    AnswerOption = apps.get_model("question", "AnswerOption")
    ContentType = apps.get_model("contenttypes", "ContentType")

    # Ensure ContentType rows for the freshly-registered models exist
    # before we try to look them up — on a brand-new DB the post-migrate
    # signal hasn't run yet for these app labels.
    question_ct, _ = ContentType.objects.get_or_create(
        app_label="question", model="question",
    )
    option_ct, _ = ContentType.objects.get_or_create(
        app_label="question", model="answeroption",
    )

    # ── Question.description / Question.explanation → prompt / explanation blocks ──
    question_buckets: dict[int, dict[str, dict[str, str]]] = {}
    # QuestionTranslation may not exist on a fresh DB if the historical
    # model was already mutated — guard with try/except via ``hasattr``.
    qt_fields = {f.name for f in QuestionTranslation._meta.get_fields()}
    has_description = "description" in qt_fields
    has_explanation = "explanation" in qt_fields
    if has_description or has_explanation:
        for tr in QuestionTranslation.objects.all():
            buckets = question_buckets.setdefault(tr.master_id, {"prompt": {}, "explanation": {}})
            if has_description:
                desc = (getattr(tr, "description", "") or "").strip()
                if desc:
                    buckets["prompt"][tr.language_code] = desc
            if has_explanation:
                expl = (getattr(tr, "explanation", "") or "").strip()
                if expl:
                    buckets["explanation"][tr.language_code] = expl

    for question_id, role_payloads in question_buckets.items():
        for role, payload_by_lang in role_payloads.items():
            if not payload_by_lang:
                continue
            block = Block.objects.create(
                target_content_type=question_ct,
                target_object_id=question_id,
                block_type="rich_text",
                block_role=role,
                order=0,
            )
            for lang_code, value in payload_by_lang.items():
                BlockTranslation.objects.create(
                    master=block,
                    language_code=lang_code,
                    title="",
                    rich_text=value,
                    callout_text="",
                )

    # ── AnswerOption.content → body block ──
    # AnswerOptionTranslation may already be gone if the historical
    # state had it deleted; guard accordingly.
    try:
        AnswerOptionTranslation = apps.get_model("question", "AnswerOptionTranslation")
    except LookupError:
        AnswerOptionTranslation = None

    if AnswerOptionTranslation is not None:
        option_buckets: dict[int, dict[str, str]] = {}
        for tr in AnswerOptionTranslation.objects.all():
            content = (getattr(tr, "content", "") or "").strip()
            if not content:
                continue
            option_buckets.setdefault(tr.master_id, {})[tr.language_code] = content
        for option_id, payload_by_lang in option_buckets.items():
            if not payload_by_lang:
                continue
            block = Block.objects.create(
                target_content_type=option_ct,
                target_object_id=option_id,
                block_type="rich_text",
                block_role="body",
                order=0,
            )
            for lang_code, value in payload_by_lang.items():
                BlockTranslation.objects.create(
                    master=block,
                    language_code=lang_code,
                    title="",
                    rich_text=value,
                    callout_text="",
                )


class Migration(migrations.Migration):

    dependencies = [
        ('question', '0001_initial'),
        ('block', '0001_initial'),
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [
        migrations.RunPython(_forward, reverse_code=migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='questiontranslation',
            name='description',
        ),
        migrations.RemoveField(
            model_name='questiontranslation',
            name='explanation',
        ),
        migrations.DeleteModel(
            name='AnswerOptionTranslation',
        ),
    ]
