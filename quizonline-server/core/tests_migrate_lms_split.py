"""Smoke tests for the ``migrate_lms_split`` management command.

These tests assert the static surface of the command (it loads, the SQL
file is reachable, ``--dry-run`` prints SQL without touching the DB, the
SQL contains the expected operations). They intentionally do **not** run
the destructive path — for that you need a Postgres dump of the
pre-migration schema, which is best executed on a staging clone.

End-to-end test plan (documented but not automated)
---------------------------------------------------
1. Take a recent pg_dump of prod (no PII required — schema + a sample of
   rows is enough).
2. Restore onto a fresh Postgres DB.
3. Deploy the branch's code onto a staging VM pointed at that DB.
4. ``python manage.py migrate_lms_split --dry-run``  - eyeball the plan.
5. ``python manage.py migrate_lms_split --verify``   - capture row counts.
6. ``python manage.py migrate_lms_split``            - apply.
7. ``python manage.py migrate_lms_split --verify``   - confirm row counts
   preserved on the new tables.
8. Run the full backend test suite (``pytest``).
9. Browse the staging UI through the smoke-test scenarios in
   ``deploy/MIGRATE-LMS-SPLIT.md``.
"""

from __future__ import annotations

from io import StringIO
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase


REPO_ROOT = Path(__file__).resolve().parents[2]
SQL_PATH = REPO_ROOT / "deploy" / "migrate-lms-split.sql"


class MigrateLmsSplitArtifactsTests(TestCase):
    def test_sql_file_exists(self) -> None:
        self.assertTrue(SQL_PATH.exists(), f"missing {SQL_PATH}")

    def test_sql_contains_every_expected_table_rename(self) -> None:
        sql = SQL_PATH.read_text(encoding="utf-8")
        expected_renames = [
            ("lms_catalog_course", "course_course"),
            ("lms_catalog_course_translation", "course_course_translation"),
            ("lms_catalog_section", "course_section"),
            ("lms_catalog_section_translation", "course_section_translation"),
            ("lms_catalog_courseauditlog", "course_courseauditlog"),
            ("lms_catalog_lesson", "lesson_lesson"),
            ("lms_catalog_lesson_translation", "lesson_lesson_translation"),
            ("lms_catalog_contentblock", "block_block"),
            (
                "lms_catalog_contentblock_translation",
                "block_block_translation",
            ),
            ("lms_enrollment_courseenrollment", "enrollment_courseenrollment"),
            ("lms_enrollment_lessonprogress", "enrollment_lessonprogress"),
            ("lms_enrollment_courseprogress", "enrollment_courseprogress"),
            ("lms_enrollment_courseinvite", "enrollment_courseinvite"),
            ("lms_enrollment_lessonnote", "enrollment_lessonnote"),
            ("lms_enrollment_certificate", "certificate_certificate"),
            (
                "lms_enrollment_certificatesequence",
                "certificate_certificatesequence",
            ),
            ("lms_assessment_lessonquiz", "assessment_lessonquiz"),
        ]
        for old, new in expected_renames:
            self.assertIn(
                f"RENAME TO {new}",
                sql,
                msg=f"SQL is missing the rename {old} -> {new}",
            )
            self.assertIn(
                old,
                sql,
                msg=f"SQL is missing a reference to the legacy table {old}",
            )

    def test_sql_handles_block_polymorphic_reshape(self) -> None:
        sql = SQL_PATH.read_text(encoding="utf-8")
        # Phase 2 column adds / drops on block_block
        for fragment in (
            "ADD COLUMN IF NOT EXISTS target_content_type_id",
            "ADD COLUMN IF NOT EXISTS target_object_id",
            "ADD COLUMN IF NOT EXISTS block_role",
            "DROP COLUMN IF EXISTS lesson_id",
            "uniq_block_order_per_target_role",
            "DROP CONSTRAINT IF EXISTS uniq_block_order_per_lesson",
        ):
            self.assertIn(fragment, sql, msg=f"missing fragment {fragment!r}")

    def test_sql_fixes_up_content_types(self) -> None:
        sql = SQL_PATH.read_text(encoding="utf-8")
        for fragment in (
            "UPDATE django_content_type",
            "app_label = 'course'",
            "app_label = 'lesson'",
            "app_label = 'block', model = 'block'",
            "app_label = 'enrollment'",
            "app_label = 'certificate'",
            "app_label = 'assessment'",
            # parler translation models too
            "'coursetranslation'",
            "'sectiontranslation'",
            "'lessontranslation'",
            "'blocktranslation'",
        ):
            self.assertIn(fragment, sql, msg=f"missing fragment {fragment!r}")

    def test_sql_marks_new_migrations_as_applied(self) -> None:
        sql = SQL_PATH.read_text(encoding="utf-8")
        self.assertIn("INSERT INTO django_migrations", sql)
        self.assertIn("ON CONFLICT DO NOTHING", sql)
        # Normalise whitespace so column alignment in the SQL doesn't
        # leak into the test.
        sql_compact = " ".join(sql.split())
        for app in (
            "course",
            "lesson",
            "block",
            "enrollment",
            "certificate",
            "assessment",
        ):
            self.assertIn(
                f"('{app}',",
                sql_compact,
                msg=f"missing 0001_initial INSERT row for {app}",
            )
        # And the legacy app rows are deleted
        self.assertIn("DELETE FROM django_migrations", sql)
        for app in ("lms_catalog", "lms_enrollment", "lms_assessment"):
            self.assertIn(f"'{app}'", sql, msg=f"missing legacy app {app}")

    def test_dry_run_prints_sql_without_executing(self) -> None:
        # Capture stdout and assert the SQL header + body land there.
        buf = StringIO()
        call_command("migrate_lms_split", "--dry-run", stdout=buf)
        out = buf.getvalue()
        self.assertIn("DRY-RUN", out)
        self.assertIn("RENAME TO course_course", out)
        self.assertIn(
            "DRY-RUN -- would then run `manage.py migrate`",
            out,
        )

    def test_verify_reports_row_counts_on_dev_db(self) -> None:
        # Verifies the --verify path doesn't crash on the active DB
        # (SQLite in tests). The legacy tables don't exist, so the column
        # should print "--". The new tables exist but are empty.
        buf = StringIO()
        call_command("migrate_lms_split", "--verify", stdout=buf)
        out = buf.getvalue()
        self.assertIn("lms_catalog_course", out)
        self.assertIn("course_course", out)
        self.assertIn("Applied migrations", out)
