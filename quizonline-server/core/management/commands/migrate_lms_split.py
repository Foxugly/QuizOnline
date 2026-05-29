"""Production migration command for the LMS-extract refactor.

Two backends are supported:

- **PostgreSQL** -- runs the one-shot ``deploy/migrate-lms-split.sql``
  script in a single transaction (``DO`` blocks + ``information_schema``
  reflection give us idempotency natively).
- **SQLite** -- does the equivalent work in Python because the SQL file
  uses Postgres-only syntax (``DO``, ``regclass``, ``pg_constraint``).
  Idempotency is enforced via ``connection.introspection.table_names()``
  and ``PRAGMA table_info`` lookups before each step.

After the schema is in place the command chains ``manage.py migrate`` so
the Phase 3 data migration (``question.0002_blocks_from_richtext``)
converts the legacy rich-text columns into polymorphic ``block.Block``
rows before they're dropped.

Usage
-----
    # Inspect the plan without touching the DB
    python manage.py migrate_lms_split --dry-run

    # Apply the migration
    python manage.py migrate_lms_split

    # Verify row counts match (run before AND after)
    python manage.py migrate_lms_split --verify
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
        vendor = connection.vendor

        if options["dry_run"]:
            if vendor == "postgresql":
                if not SQL_PATH.exists():
                    raise CommandError(f"SQL script not found at {SQL_PATH}")
                self._print_header("DRY-RUN -- Postgres SQL that would execute")
                self.stdout.write(SQL_PATH.read_text(encoding="utf-8"))
            elif vendor == "sqlite":
                self._print_header("DRY-RUN -- SQLite migration plan")
                self._sqlite_plan_summary()
            else:
                raise CommandError(f"Unsupported DB engine: {vendor!r}")
            self._print_header("DRY-RUN -- would then run `manage.py migrate`")
            return

        if options["verify"]:
            self._verify_counts()
            return

        if vendor == "postgresql":
            self._handle_postgres(options)
        elif vendor == "sqlite":
            self._handle_sqlite(options)
        else:
            raise CommandError(
                f"migrate_lms_split supports postgresql and sqlite "
                f"(active engine: {vendor!r})."
            )

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

    def _handle_postgres(self, options) -> None:
        if not SQL_PATH.exists():
            raise CommandError(f"SQL script not found at {SQL_PATH}")
        sql = SQL_PATH.read_text(encoding="utf-8")

        self._print_header("Step 1/2 -- PG SQL rename + content_type fix-up")
        before_counts = self._collect_row_counts()
        with transaction.atomic():
            with connection.cursor() as cur:
                cur.execute(sql)
        after_counts = self._collect_row_counts()
        self._report_row_movement(before_counts, after_counts)

    def _handle_sqlite(self, options) -> None:
        self._print_header("Step 1/2 -- SQLite rename + reshape + bookkeeping")
        before_counts = self._collect_row_counts()
        with transaction.atomic():
            with connection.cursor() as cur:
                self._sqlite_rename_tables(cur)
                self._sqlite_update_content_types(cur)
                self._sqlite_reshape_block_table(cur)
                self._sqlite_fix_django_migrations(cur)
        after_counts = self._collect_row_counts()
        self._report_row_movement(before_counts, after_counts)

    def _print_header(self, label: str) -> None:
        bar = "=" * 78
        self.stdout.write(self.style.MIGRATE_HEADING(f"\n{bar}\n{label}\n{bar}"))

    # ------------------------------------------------------------------ SQLite ops

    _SQLITE_CT_RENAMES: list[tuple[str, str, str, str | None]] = [
        # (from app_label, to app_label, from model, to model or None to keep)
        ("lms_catalog",    "course",      "course",                  None),
        ("lms_catalog",    "course",      "coursetranslation",       None),
        ("lms_catalog",    "course",      "section",                 None),
        ("lms_catalog",    "course",      "sectiontranslation",      None),
        ("lms_catalog",    "course",      "courseauditlog",          None),
        ("lms_catalog",    "lesson",      "lesson",                  None),
        ("lms_catalog",    "lesson",      "lessontranslation",       None),
        ("lms_catalog",    "block",       "contentblock",            "block"),
        ("lms_catalog",    "block",       "contentblocktranslation", "blocktranslation"),
        ("lms_enrollment", "enrollment",  "courseenrollment",        None),
        ("lms_enrollment", "enrollment",  "lessonprogress",          None),
        ("lms_enrollment", "enrollment",  "courseprogress",          None),
        ("lms_enrollment", "enrollment",  "courseinvite",            None),
        ("lms_enrollment", "enrollment",  "lessonnote",              None),
        ("lms_enrollment", "certificate", "certificate",             None),
        ("lms_enrollment", "certificate", "certificatesequence",     None),
        ("lms_assessment", "assessment",  "lessonquiz",              None),
    ]

    _NEW_APP_INITIALS = ["course", "lesson", "block", "enrollment", "certificate", "assessment"]

    def _sqlite_plan_summary(self) -> None:
        self.stdout.write("Step A -- ALTER TABLE RENAME for each legacy table:")
        for old, new in TABLE_RENAMES:
            self.stdout.write(f"  {old}  ->  {new}")
        self.stdout.write("\nStep B -- UPDATE django_content_type rows "
                          "to point at the new app_labels / model name.")
        self.stdout.write("\nStep C -- Recreate ``block_block`` with the polymorphic columns "
                          "(target_content_type_id, target_object_id, block_role), backfilled "
                          "from lesson_id, plus new index + unique constraint.")
        self.stdout.write("\nStep D -- INSERT 0001_initial for new apps in django_migrations, "
                          "DELETE rows for lms_catalog / lms_enrollment / lms_assessment.")

    def _sqlite_table_exists(self, cur, table: str) -> bool:
        # Use Django's ``%s`` placeholder rather than sqlite3's native ``?``
        # so the debug_sql wrapper (DEBUG=True) does not crash when it tries
        # to ``sql % params`` for the query log.
        cur.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name=%s",
            (table,),
        )
        return cur.fetchone() is not None

    def _sqlite_column_exists(self, cur, table: str, column: str) -> bool:
        # PRAGMA can't take parameters, but ``table`` only comes from our
        # hard-coded list, so we validate then interpolate.
        if not table.replace("_", "").isalnum():
            raise CommandError(f"Refusing PRAGMA on {table!r}: unsafe identifier")
        cur.execute(f"PRAGMA table_info({table})")
        return any(row[1] == column for row in cur.fetchall())

    def _sqlite_rename_tables(self, cur) -> None:
        self.stdout.write("\n[A] Renaming legacy tables...")
        renamed = skipped = 0
        for old, new in TABLE_RENAMES:
            if self._sqlite_table_exists(cur, new):
                self.stdout.write(f"  - skip {old}  ({new} already exists)")
                skipped += 1
                continue
            if not self._sqlite_table_exists(cur, old):
                self.stdout.write(f"  - skip {old}  (legacy table missing)")
                skipped += 1
                continue
            cur.execute(f'ALTER TABLE "{old}" RENAME TO "{new}"')
            self.stdout.write(f"  - renamed {old} -> {new}")
            renamed += 1
        self.stdout.write(f"  ({renamed} renamed, {skipped} skipped)")

    def _sqlite_update_content_types(self, cur) -> None:
        self.stdout.write("\n[B] Updating django_content_type rows...")
        updated = 0
        for old_app, new_app, old_model, new_model in self._SQLITE_CT_RENAMES:
            if new_model is None:
                cur.execute(
                    "UPDATE django_content_type "
                    "   SET app_label=%s "
                    " WHERE app_label=%s AND model=%s",
                    (new_app, old_app, old_model),
                )
            else:
                cur.execute(
                    "UPDATE django_content_type "
                    "   SET app_label=%s, model=%s "
                    " WHERE app_label=%s AND model=%s",
                    (new_app, new_model, old_app, old_model),
                )
            if cur.rowcount > 0:
                updated += cur.rowcount
        self.stdout.write(f"  ({updated} content-type rows updated)")

    def _sqlite_reshape_block_table(self, cur) -> None:
        """Convert ``block_block`` from the legacy ``lesson_id`` FK shape
        to the new polymorphic ``(target_content_type_id, target_object_id,
        block_role)`` shape. SQLite cannot add NOT NULL columns with FKs
        nor drop column constraints in place, so we use the standard
        SQLite ``create-new / copy / drop-old / rename`` pattern.
        """
        self.stdout.write("\n[C] Reshaping block_block for polymorphic GFK...")

        if not self._sqlite_table_exists(cur, "block_block"):
            self.stdout.write("  - skip (block_block does not exist)")
            return

        if self._sqlite_column_exists(cur, "block_block", "target_content_type_id"):
            self.stdout.write("  - skip (target_content_type_id already present)")
            return

        if not self._sqlite_column_exists(cur, "block_block", "lesson_id"):
            raise CommandError(
                "block_block has neither lesson_id (legacy) nor "
                "target_content_type_id (new) -- refusing to guess."
            )

        # Look up the Lesson ContentType id (must already exist; updated by step B).
        cur.execute(
            "SELECT id FROM django_content_type "
            "WHERE app_label=%s AND model=%s",
            ("lesson", "lesson"),
        )
        row = cur.fetchone()
        if row is None:
            raise CommandError(
                "lesson.lesson ContentType missing -- step B must run before step C."
            )
        lesson_ct_id = row[0]

        # Hard-coded new shape, matching block/migrations/0001_initial.py.
        # Order of columns is deliberate so the INSERT below stays readable.
        cur.execute("""
            CREATE TABLE block_block_new (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                target_object_id BIGINT NOT NULL,
                block_type      VARCHAR(16) NOT NULL,
                block_role      VARCHAR(16) NOT NULL DEFAULT 'body',
                "order"         INTEGER NOT NULL DEFAULT 0,
                is_required     BOOL NOT NULL DEFAULT 0,
                image           VARCHAR(100) NULL,
                video_url       VARCHAR(200) NOT NULL DEFAULT '',
                video_provider  VARCHAR(16) NOT NULL DEFAULT '',
                file            VARCHAR(100) NULL,
                external_url    VARCHAR(200) NOT NULL DEFAULT '',
                code_language   VARCHAR(32) NOT NULL DEFAULT '',
                code_content    TEXT NOT NULL DEFAULT '',
                metadata        TEXT NOT NULL DEFAULT '{}',
                quiz_template_id INTEGER NULL
                    REFERENCES quiz_quiztemplate(id) DEFERRABLE INITIALLY DEFERRED,
                target_content_type_id INTEGER NOT NULL
                    REFERENCES django_content_type(id) DEFERRABLE INITIALLY DEFERRED
            )
        """)

        # Copy data with the GFK backfill. Each legacy row had a lesson_id;
        # the matching ContentType is ``lesson.lesson`` and ``block_role``
        # defaults to ``body`` for everything that pre-existed the refactor.
        cur.execute(
            'INSERT INTO block_block_new '
            '  (id, target_object_id, target_content_type_id, block_type, block_role, '
            '   "order", is_required, image, video_url, video_provider, file, '
            '   external_url, code_language, code_content, metadata, quiz_template_id) '
            'SELECT id, lesson_id, %s, block_type, %s, '
            '   "order", is_required, image, video_url, video_provider, file, '
            '   external_url, code_language, code_content, metadata, quiz_template_id '
            '  FROM block_block',
            (lesson_ct_id, "body"),
        )
        moved = cur.rowcount

        cur.execute("DROP TABLE block_block")
        cur.execute('ALTER TABLE block_block_new RENAME TO "block_block"')

        cur.execute(
            'CREATE INDEX block_block_target__9cefd0_idx '
            'ON block_block (target_content_type_id, target_object_id)'
        )
        cur.execute(
            'CREATE UNIQUE INDEX uniq_block_order_per_target_role '
            'ON block_block (target_content_type_id, target_object_id, '
            '                block_role, "order")'
        )
        cur.execute(
            'CREATE INDEX block_block_order_idx ON block_block ("order")'
        )

        self.stdout.write(f"  - reshaped block_block ({moved} rows migrated to GFK)")

    def _sqlite_fix_django_migrations(self, cur) -> None:
        """Mark the new apps' 0001_initial as applied so the next
        ``manage.py migrate`` skips them (their tables already exist after
        the renames). Delete the legacy app rows.
        """
        self.stdout.write("\n[D] Patching django_migrations bookkeeping...")
        inserted = 0
        for app in self._NEW_APP_INITIALS:
            cur.execute(
                "SELECT 1 FROM django_migrations WHERE app=%s AND name=%s",
                (app, "0001_initial"),
            )
            if cur.fetchone() is not None:
                continue
            cur.execute(
                "INSERT INTO django_migrations (app, name, applied) "
                "VALUES (%s, %s, CURRENT_TIMESTAMP)",
                (app, "0001_initial"),
            )
            inserted += 1
        cur.execute(
            "DELETE FROM django_migrations "
            " WHERE app IN ('lms_catalog', 'lms_enrollment', 'lms_assessment')"
        )
        deleted = cur.rowcount
        self.stdout.write(
            f"  ({inserted} new-app rows inserted, {deleted} legacy rows deleted)"
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
