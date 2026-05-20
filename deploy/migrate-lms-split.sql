-- =============================================================================
-- LMS-extract refactor -- one-shot production schema migration
-- =============================================================================
--
-- Context
-- -------
-- Branch ``refactor/extract-lms-apps`` reshuffles three legacy Django apps
-- into six narrower ones. The branch ships fresh migrations that assume an
-- empty database; production has real data in the old tables, so we cannot
-- simply ``manage.py migrate`` after the merge.
--
-- This script renames the old tables to match the new app namespace, updates
-- ``django_content_type``, fixes up ``django_migrations`` so Django thinks the
-- new initial migrations are already applied, and prepares the polymorphic
-- ``block.Block`` schema (Phase 2 of the refactor).
--
-- IMPORTANT EXECUTION SEQUENCE
-- ----------------------------
--   1. STOP gunicorn + Celery (no writes during the swap)
--   2. Take a fresh DB backup
--   3. Run THIS SQL FILE inside one transaction (the
--      ``migrate_lms_split`` management command wraps it for you)
--   4. Run ``python manage.py migrate``
--        - course / lesson / block / enrollment / certificate / assessment
--          are already marked applied (step G below), so their CreateModel
--          operations are a no-op
--        - ``question.0002_blocks_from_richtext`` runs its RunPython data
--          conversion (QuestionTranslation.description/explanation +
--          AnswerOptionTranslation.content -> Block rows) THEN drops the
--          now-unused rich-text columns. This step REQUIRES the rich-text
--          columns still being present, which is why steps A-G come first
--          and the column drop is delegated to Django.
--   5. Smoke-test, then restart services.
--
-- IDEMPOTENCY
-- -----------
-- Every statement uses ``IF EXISTS`` / ``IF NOT EXISTS`` /
-- ``ON CONFLICT DO NOTHING`` so re-running the script after a partial run
-- is safe. The whole thing is wrapped in a transaction by the management
-- command -- partial failure rolls back to pre-migration state.
--
-- ASSUMPTIONS (verified against the original migration files)
-- -----------------------------------------------------------
-- Old table names (as created by ``lms_catalog`` / ``lms_enrollment`` /
-- ``lms_assessment`` migrations on main):
--   - lms_catalog_course
--   - lms_catalog_course_translation         (parler db_table override)
--   - lms_catalog_section
--   - lms_catalog_section_translation        (parler db_table override)
--   - lms_catalog_lesson
--   - lms_catalog_lesson_translation         (parler db_table override)
--   - lms_catalog_contentblock
--   - lms_catalog_contentblock_translation   (parler db_table override)
--   - lms_catalog_courseauditlog
--   - lms_enrollment_courseenrollment
--   - lms_enrollment_lessonprogress
--   - lms_enrollment_courseprogress
--   - lms_enrollment_courseinvite
--   - lms_enrollment_lessonnote
--   - lms_enrollment_certificate
--   - lms_enrollment_certificatesequence
--   - lms_assessment_lessonquiz
--
-- New table names (per ``course/migrations/0001_initial.py``,
-- ``lesson/migrations/0001_initial.py``, etc):
--   - course_course        / course_course_translation
--   - course_section       / course_section_translation
--   - course_courseauditlog
--   - lesson_lesson        / lesson_lesson_translation
--   - block_block          / block_block_translation
--   - enrollment_courseenrollment
--   - enrollment_lessonprogress
--   - enrollment_courseprogress
--   - enrollment_courseinvite
--   - enrollment_lessonnote
--   - certificate_certificate
--   - certificate_certificatesequence
--   - assessment_lessonquiz
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Step A -- rename tables (data + structure preserved; only the name changes)
-- -----------------------------------------------------------------------------
--
-- ``ALTER TABLE ... RENAME TO ...`` keeps every constraint, index and trigger;
-- only the table name changes. Sequences are renamed afterwards because
-- Django generates ``<table>_id_seq`` and the foreign-key targets follow.

-- course app ------------------------------------------------------------------
ALTER TABLE IF EXISTS lms_catalog_course                   RENAME TO course_course;
ALTER TABLE IF EXISTS lms_catalog_course_translation       RENAME TO course_course_translation;
ALTER TABLE IF EXISTS lms_catalog_section                  RENAME TO course_section;
ALTER TABLE IF EXISTS lms_catalog_section_translation      RENAME TO course_section_translation;
ALTER TABLE IF EXISTS lms_catalog_courseauditlog           RENAME TO course_courseauditlog;

ALTER SEQUENCE IF EXISTS lms_catalog_course_id_seq                   RENAME TO course_course_id_seq;
ALTER SEQUENCE IF EXISTS lms_catalog_course_translation_id_seq       RENAME TO course_course_translation_id_seq;
ALTER SEQUENCE IF EXISTS lms_catalog_section_id_seq                  RENAME TO course_section_id_seq;
ALTER SEQUENCE IF EXISTS lms_catalog_section_translation_id_seq      RENAME TO course_section_translation_id_seq;
ALTER SEQUENCE IF EXISTS lms_catalog_courseauditlog_id_seq           RENAME TO course_courseauditlog_id_seq;

-- lesson app ------------------------------------------------------------------
ALTER TABLE IF EXISTS lms_catalog_lesson                   RENAME TO lesson_lesson;
ALTER TABLE IF EXISTS lms_catalog_lesson_translation       RENAME TO lesson_lesson_translation;

ALTER SEQUENCE IF EXISTS lms_catalog_lesson_id_seq                   RENAME TO lesson_lesson_id_seq;
ALTER SEQUENCE IF EXISTS lms_catalog_lesson_translation_id_seq       RENAME TO lesson_lesson_translation_id_seq;

-- block app -------------------------------------------------------------------
-- Note: the model was renamed ``ContentBlock`` -> ``Block`` in Phase 2, so the
-- table goes from ``lms_catalog_contentblock`` to ``block_block`` (not
-- ``block_contentblock``).
ALTER TABLE IF EXISTS lms_catalog_contentblock             RENAME TO block_block;
ALTER TABLE IF EXISTS lms_catalog_contentblock_translation RENAME TO block_block_translation;

ALTER SEQUENCE IF EXISTS lms_catalog_contentblock_id_seq             RENAME TO block_block_id_seq;
ALTER SEQUENCE IF EXISTS lms_catalog_contentblock_translation_id_seq RENAME TO block_block_translation_id_seq;

-- enrollment app --------------------------------------------------------------
ALTER TABLE IF EXISTS lms_enrollment_courseenrollment      RENAME TO enrollment_courseenrollment;
ALTER TABLE IF EXISTS lms_enrollment_lessonprogress        RENAME TO enrollment_lessonprogress;
ALTER TABLE IF EXISTS lms_enrollment_courseprogress        RENAME TO enrollment_courseprogress;
ALTER TABLE IF EXISTS lms_enrollment_courseinvite          RENAME TO enrollment_courseinvite;
ALTER TABLE IF EXISTS lms_enrollment_lessonnote            RENAME TO enrollment_lessonnote;

ALTER SEQUENCE IF EXISTS lms_enrollment_courseenrollment_id_seq      RENAME TO enrollment_courseenrollment_id_seq;
ALTER SEQUENCE IF EXISTS lms_enrollment_lessonprogress_id_seq        RENAME TO enrollment_lessonprogress_id_seq;
ALTER SEQUENCE IF EXISTS lms_enrollment_courseprogress_id_seq        RENAME TO enrollment_courseprogress_id_seq;
ALTER SEQUENCE IF EXISTS lms_enrollment_courseinvite_id_seq          RENAME TO enrollment_courseinvite_id_seq;
ALTER SEQUENCE IF EXISTS lms_enrollment_lessonnote_id_seq            RENAME TO enrollment_lessonnote_id_seq;

-- certificate app -------------------------------------------------------------
ALTER TABLE IF EXISTS lms_enrollment_certificate           RENAME TO certificate_certificate;
ALTER TABLE IF EXISTS lms_enrollment_certificatesequence   RENAME TO certificate_certificatesequence;

ALTER SEQUENCE IF EXISTS lms_enrollment_certificate_id_seq           RENAME TO certificate_certificate_id_seq;
-- certificatesequence uses ``year`` as primary key (no SERIAL), no sequence to rename.

-- assessment app --------------------------------------------------------------
ALTER TABLE IF EXISTS lms_assessment_lessonquiz            RENAME TO assessment_lessonquiz;
ALTER SEQUENCE IF EXISTS lms_assessment_lessonquiz_id_seq            RENAME TO assessment_lessonquiz_id_seq;


-- -----------------------------------------------------------------------------
-- Step B -- update django_content_type rows
-- -----------------------------------------------------------------------------
--
-- ContentTypes are matched by (app_label, model). After the rename, the
-- ``model`` column is unchanged for everything except ``contentblock``
-- which becomes ``block``. Parler translation models live as their own
-- ContentType rows (``coursetranslation``, ``sectiontranslation``, ...) and
-- must be updated identically.
--
-- We must update from most-specific to least-specific to avoid an UPDATE
-- catching rows that have already been moved.

-- course --------------------------------------------------------------------
UPDATE django_content_type
SET app_label = 'course'
WHERE app_label = 'lms_catalog'
  AND model IN ('course', 'coursetranslation',
                'section', 'sectiontranslation',
                'courseauditlog');

-- lesson --------------------------------------------------------------------
UPDATE django_content_type
SET app_label = 'lesson'
WHERE app_label = 'lms_catalog'
  AND model IN ('lesson', 'lessontranslation');

-- block (note: ``contentblock`` -> ``block`` model rename too) -----------------
UPDATE django_content_type
SET app_label = 'block', model = 'block'
WHERE app_label = 'lms_catalog' AND model = 'contentblock';

UPDATE django_content_type
SET app_label = 'block', model = 'blocktranslation'
WHERE app_label = 'lms_catalog' AND model = 'contentblocktranslation';

-- enrollment ----------------------------------------------------------------
UPDATE django_content_type
SET app_label = 'enrollment'
WHERE app_label = 'lms_enrollment'
  AND model IN ('courseenrollment', 'lessonprogress', 'courseprogress',
                'courseinvite', 'lessonnote');

-- certificate ---------------------------------------------------------------
UPDATE django_content_type
SET app_label = 'certificate'
WHERE app_label = 'lms_enrollment'
  AND model IN ('certificate', 'certificatesequence');

-- assessment ----------------------------------------------------------------
UPDATE django_content_type
SET app_label = 'assessment'
WHERE app_label = 'lms_assessment' AND model = 'lessonquiz';


-- -----------------------------------------------------------------------------
-- Step C/D -- reshape block_block for the new polymorphic schema
-- -----------------------------------------------------------------------------
--
-- Original prod shape (legacy ContentBlock):
--   id, block_type, order, is_required, image, video_url, video_provider,
--   file, external_url, code_language, code_content, metadata, lesson_id,
--   quiz_template_id
-- Constraints: UNIQUE(lesson, order)  -> name ``uniq_block_order_per_lesson``
-- Foreign key: lesson_id -> lms_catalog_lesson(id) (now lesson_lesson(id))
--
-- Target shape (block.Block from block/migrations/0001_initial.py):
--   id, target_object_id BIGINT NOT NULL,
--   block_type, block_role VARCHAR(16) NOT NULL DEFAULT 'body',
--   order, is_required, image, video_url, video_provider, file,
--   external_url, code_language, code_content, metadata,
--   quiz_template_id, target_content_type_id BIGINT NOT NULL FK->contenttypes
-- Constraints: UNIQUE(target_content_type_id, target_object_id, block_role, order)
--              -> ``uniq_block_order_per_target_role``
-- Index: (target_content_type_id, target_object_id) -> ``block_block_target__9cefd0_idx``

-- C.1 add the new columns (nullable for now so the backfill can run)
ALTER TABLE block_block
    ADD COLUMN IF NOT EXISTS target_content_type_id BIGINT NULL,
    ADD COLUMN IF NOT EXISTS target_object_id       BIGINT NULL,
    ADD COLUMN IF NOT EXISTS block_role             VARCHAR(16) NOT NULL DEFAULT 'body';

-- C.2 backfill target_content_type_id / target_object_id from lesson_id
-- We use a DO block so we can look up the Lesson ContentType id once and
-- bail out if it is missing (which would indicate the steps above did not
-- run on this DB).
DO $migrate_block_target$
DECLARE
    lesson_ct_id INTEGER;
    has_lesson_column BOOLEAN;
BEGIN
    SELECT id INTO lesson_ct_id
      FROM django_content_type
     WHERE app_label = 'lesson' AND model = 'lesson';

    IF lesson_ct_id IS NULL THEN
        RAISE EXCEPTION 'lesson.lesson ContentType missing -- step B must run before step C';
    END IF;

    SELECT EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_name = 'block_block'
           AND column_name = 'lesson_id'
    ) INTO has_lesson_column;

    IF has_lesson_column THEN
        UPDATE block_block
           SET target_content_type_id = lesson_ct_id,
               target_object_id = lesson_id
         WHERE target_object_id IS NULL;
    END IF;
END
$migrate_block_target$;

-- C.3 drop the legacy FK constraint + index + column on lesson_id
-- Django auto-names FK constraints; query the catalog to find them.
DO $drop_lesson_fk$
DECLARE
    cons_name TEXT;
BEGIN
    FOR cons_name IN
        SELECT conname
          FROM pg_constraint
         WHERE conrelid = 'block_block'::regclass
           AND contype = 'f'
           AND conkey @> ARRAY[(
               SELECT attnum FROM pg_attribute
                WHERE attrelid = 'block_block'::regclass
                  AND attname = 'lesson_id'
           )::SMALLINT]
    LOOP
        EXECUTE format('ALTER TABLE block_block DROP CONSTRAINT IF EXISTS %I', cons_name);
    END LOOP;
END
$drop_lesson_fk$;

-- drop legacy uniqueness constraint (lesson, order) - it was unique-named
ALTER TABLE block_block DROP CONSTRAINT IF EXISTS uniq_block_order_per_lesson;
-- and the auto-generated index on lesson_id, if any
DROP INDEX IF EXISTS lms_catalog_contentblock_lesson_id_idx;
DROP INDEX IF EXISTS block_block_lesson_id_idx;

-- finally drop the column itself (data is now in target_object_id)
ALTER TABLE block_block DROP COLUMN IF EXISTS lesson_id;

-- C.4 lock the new columns down (NOT NULL after backfill) + add FK
ALTER TABLE block_block
    ALTER COLUMN target_content_type_id SET NOT NULL,
    ALTER COLUMN target_object_id       SET NOT NULL;

DO $add_target_fk$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'block_block'::regclass
           AND conname  = 'block_block_target_content_type_id_fk_django_content_type_id'
    ) THEN
        ALTER TABLE block_block
            ADD CONSTRAINT block_block_target_content_type_id_fk_django_content_type_id
            FOREIGN KEY (target_content_type_id)
            REFERENCES django_content_type(id)
            DEFERRABLE INITIALLY DEFERRED;
    END IF;
END
$add_target_fk$;

-- C.5 add the new index + uniqueness constraint
CREATE INDEX IF NOT EXISTS block_block_target__9cefd0_idx
    ON block_block (target_content_type_id, target_object_id);

DO $add_uniq_constraint$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'uniq_block_order_per_target_role'
    ) THEN
        ALTER TABLE block_block
            ADD CONSTRAINT uniq_block_order_per_target_role
            UNIQUE (target_content_type_id, target_object_id, block_role, "order");
    END IF;
END
$add_uniq_constraint$;


-- -----------------------------------------------------------------------------
-- Step E -- Phase 3 data migration (Question / AnswerOption rich-text -> Block)
-- -----------------------------------------------------------------------------
--
-- This is intentionally NOT done in SQL. The Phase 3 migration
-- ``question/migrations/0002_blocks_from_richtext.py`` carries the data
-- conversion as a Django RunPython step + the column drops. Running it from
-- Python keeps the conversion logic (which has to handle empty translations,
-- mixed-language source rows, etc) in one place and guarantees the
-- ``block_block`` rows it creates honour every model-level validation
-- (length limits, choices, JSON shapes...).
--
-- Trigger the data migration with ``python manage.py migrate`` AFTER this
-- SQL script has finished running. The ``migrate_lms_split`` management
-- command does that automatically.


-- -----------------------------------------------------------------------------
-- Step F -- drop old rich-text columns (handled by Django, not here)
-- -----------------------------------------------------------------------------
--
-- ``question.0002_blocks_from_richtext`` runs:
--   - RemoveField QuestionTranslation.description
--   - RemoveField QuestionTranslation.explanation
--   - DeleteModel  AnswerOptionTranslation
-- after its RunPython data conversion. Don't replicate this here -- Django
-- needs the columns to still exist while RunPython reads them.


-- -----------------------------------------------------------------------------
-- Step G -- fix up django_migrations
-- -----------------------------------------------------------------------------
--
-- Mark the new apps' initial migrations as already applied so ``migrate``
-- doesn't try to re-create the (now-renamed) tables.
INSERT INTO django_migrations (app, name, applied) VALUES
    ('course',      '0001_initial', NOW()),
    ('lesson',      '0001_initial', NOW()),
    ('block',       '0001_initial', NOW()),
    ('enrollment',  '0001_initial', NOW()),
    ('certificate', '0001_initial', NOW()),
    ('assessment',  '0001_initial', NOW())
ON CONFLICT DO NOTHING;

-- Remove the old app entries entirely -- those Django apps no longer exist.
DELETE FROM django_migrations
 WHERE app IN ('lms_catalog', 'lms_enrollment', 'lms_assessment');

-- =============================================================================
-- End of one-shot script. Next, run:
--     python manage.py migrate
-- which will execute ``question.0002_blocks_from_richtext`` (the data
-- migration + column drops for Question rich-text -> Block).
-- =============================================================================
