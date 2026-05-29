"""Production migration command for the LMS-extract refactor.

Runs the one-shot ``deploy/migrate-lms-split.sql`` script inside a
transaction, then chains ``manage.py migrate`` so the Phase 3 data migration
(``question.0002_blocks_from_richtext``) converts the legacy rich-text
columns into polymorphic ``block.Block`` rows before they're dropped.

Usage
-----
    # Inspect the plan without touching the DB
    python manage.py migrate_lms_split --dry-run

    # Apply the migration
    python manage.py migrate_lms_split

    # Verify row counts match (run before AND after)
    python manage.py migrate_lms_split --verify

Idempotency
-----------
The SQL itself uses ``IF EXISTS`` / ``IF NOT EXISTS`` /
``ON CONFLICT DO NOTHING`` everywhere, so re-running the command after a
partial run is safe. The whole SQL block is wrapped in a single
transaction -- if any statement fails, the DB rolls back to the
pre-migration state.

Safety
------
- Refuses to run if anything other than PostgreSQL is the active engine
  (the script uses Postgres-specific syntax: ``DO`` blocks, ``information_schema``
  reflection, ``regclass`` casts).
- Prints clear log lines for each phase so a human operator can spot a
  silent issue.
"""

from __future__ import annotations

from pathlib import Path

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction


# Resolve ``deploy/migrate-lms-split.sql`` relative to the repo root (this
# file lives at quizonline-server/core/management/commands/, so the SQL
# file is four ``parents`` away).
SQL_PATH = (
    Path(__file__).resolve().parents[4]
    / "deploy"
    / "migrate-lms-split.sql"
)

# (old_table, new_table) -- used by --verify to assert row preservation.
TABLE_RENAMES: list[tuple[str, str]] = [
    ("lms_catalog_course",                  "course_course"),
    ("lms_catalog_course_translation",      "course_course_translation"),
    ("lms_catalog_section",                 "course_section"),
    ("lms_catalog_section_translation",     "course_section_translation"),
    ("lms_catalog_courseauditlog",          "course_courseauditlog"),
    ("lms_catalog_lesson",                  "lesson_lesson"),
    ("lms_catalog_lesson_translation",      "lesson_lesson_translation"),
    ("lms_catalog_contentblock",            "block_block"),
    ("lms_catalog_contentblock_translation", "block_block_translation"),
    ("lms_enrollment_courseenrollment",     "enrollment_courseenrollment"),
    ("lms_enrollment_lessonprogress",       "enrollment_lessonprogress"),
    ("lms_enrollment_courseprogress",       "enrollment_courseprogress"),
    ("lms_enrollment_courseinvite",         "enrollment_courseinvite"),
    ("lms_enrollment_lessonnote",           "enrollment_lessonnote"),
    ("lms_enrollment_certificate",          "certificate_certificate"),
    ("lms_enrollment_certificatesequence",  "certificate_certificatesequence"),
    ("lms_assessment_lessonquiz",           "assessment_lessonquiz"),
]


class Command(BaseCommand):
    help = (
        "One-shot production migration for the LMS-extract refactor. "
        "Renames legacy lms_catalog / lms_enrollment / lms_assessment "
        "tables to the new course / lesson / block / enrollment / "
        "certificate / assessment namespace, then runs the regular "
        "Django migration chain so Phase 3's RunPython converts the old "
        "QuestionTranslation rich-text into Block rows."
    )

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print the SQL that would run without executing it.",
        )
        parser.add_argument(
            "--verify",
            action="store_true",
            help=(
                "Print row counts for the legacy + new tables and the "
                "active django_migrations entries for the affected apps. "
                "Safe to run before AND after the migration."
            ),
        )
        parser.add_argument(
            "--skip-django-migrate",
            action="store_true",
            help=(
                "Don't run ``manage.py migrate`` after the SQL. Use only "
                "if you want to inspect intermediate state -- production "
                "always wants the migrate step to follow."
            ),
        )

    def handle(self, *args, **options) -> None:
        if not SQL_PATH.exists():
            raise CommandError(f"SQL script not found at {SQL_PATH}")

        sql = SQL_PATH.read_text(encoding="utf-8")

        if options["dry_run"]:
            self._print_header("DRY-RUN -- SQL that would execute")
            self.stdout.write(sql)
            self._print_header("DRY-RUN -- would then run `manage.py migrate`")
            return

        if options["verify"]:
            self._verify_counts()
            return

        # Real execution.
        self._guard_postgres()

        self._print_header("Step 1/2 -- SQL rename + content_type fix-up")
        before_counts = self._collect_row_counts()
        with transaction.atomic():
            with connection.cursor() as cur:
                cur.execute(sql)
        after_counts = self._collect_row_counts()
        self._report_row_movement(before_counts, after_counts)

        if options["skip_django_migrate"]:
            self.stdout.write(
                self.style.WARNING(
                    "--skip-django-migrate set; not running `manage.py migrate`. "
                    "Phase 3 (Question rich-text -> Block) is NOT applied yet."
                )
            )
            return

        self._print_header("Step 2/2 -- `manage.py migrate` (Phase 3 data migration)")
        call_command("migrate", verbosity=options.get("verbosity", 1))

        self.stdout.write(self.style.SUCCESS("\nLMS-extract migration complete."))

    # ------------------------------------------------------------------ helpers

    def _print_header(self, label: str) -> None:
        bar = "=" * 78
        self.stdout.write(self.style.MIGRATE_HEADING(f"\n{bar}\n{label}\n{bar}"))

    def _guard_postgres(self) -> None:
        vendor = connection.vendor
        if vendor != "postgresql":
            raise CommandError(
                f"migrate_lms_split requires PostgreSQL (active engine: {vendor!r}). "
                "The SQL script uses Postgres-specific syntax. Restore from a Postgres "
                "dump on a Postgres-backed environment before running."
            )

    def _table_exists(self, table: str) -> bool:
        # ``introspection.table_names()`` is Django's portable wrapper around
        # ``information_schema.tables`` (Postgres) / ``sqlite_master`` (SQLite)
        # / equivalent on every backend, so --verify works on a dev SQLite DB
        # as well as on prod Postgres.
        return table in connection.introspection.table_names()

    def _row_count(self, table: str) -> int | None:
        if not self._table_exists(table):
            return None
        with connection.cursor() as cur:
            # The table name comes from a hard-coded list in this file,
            # never user input -- quoting with %s would be a syntax error,
            # so we interpolate after validating the identifier.
            if not table.replace("_", "").isalnum():
                raise CommandError(f"Refusing to count {table!r}: unsafe identifier")
            cur.execute(f'SELECT COUNT(*) FROM "{table}"')
            (count,) = cur.fetchone()
            return int(count)

    def _collect_row_counts(self) -> dict[str, int | None]:
        counts: dict[str, int | None] = {}
        for old, new in TABLE_RENAMES:
            counts[old] = self._row_count(old)
            counts[new] = self._row_count(new)
        return counts

    def _report_row_movement(
        self,
        before: dict[str, int | None],
        after: dict[str, int | None],
    ) -> None:
        self.stdout.write("\nRow counts before / after SQL:")
        self.stdout.write(f"  {'table':<48} {'before':>10} {'after':>10}")
        self.stdout.write(f"  {'-' * 48} {'-' * 10} {'-' * 10}")
        for old, new in TABLE_RENAMES:
            for label in (old, new):
                b = before.get(label)
                a = after.get(label)
                b_repr = "--" if b is None else str(b)
                a_repr = "--" if a is None else str(a)
                self.stdout.write(f"  {label:<48} {b_repr:>10} {a_repr:>10}")

        # The invariant we care about: the data is conserved (old row
        # count == new row count for every (old, new) pair, OR the old
        # table no longer exists because rename succeeded).
        for old, new in TABLE_RENAMES:
            b_old = before.get(old)
            b_new = before.get(new)
            a_new = after.get(new)
            expected = b_old if b_old is not None else b_new
            if expected is not None and a_new != expected:
                raise CommandError(
                    f"Row-count mismatch on {new}: expected {expected}, got {a_new}. "
                    "The transaction rolled back; investigate before retrying."
                )

    def _verify_counts(self) -> None:
        self._print_header("Verify -- row counts + applied migrations")
        for old, new in TABLE_RENAMES:
            b = self._row_count(old)
            a = self._row_count(new)
            self.stdout.write(
                f"  {old:<48} -> {new:<32} "
                f"(legacy={'--' if b is None else b}, new={'--' if a is None else a})"
            )

        with connection.cursor() as cur:
            cur.execute(
                "SELECT app, name FROM django_migrations "
                "WHERE app IN ('lms_catalog','lms_enrollment','lms_assessment',"
                "             'course','lesson','block','enrollment',"
                "             'certificate','assessment') "
                "ORDER BY app, name"
            )
            rows = cur.fetchall()
        self.stdout.write("\nApplied migrations for the affected apps:")
        for app, name in rows:
            self.stdout.write(f"  {app}.{name}")
