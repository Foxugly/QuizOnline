# Extract LMS apps — implementation plan

**Branch :** `refactor/extract-lms-apps`

**Goal :** Remove the ``lms_`` prefix from apps, URLs, frontend modules, and let ``Block`` become a generic, reusable building unit shared by ``Lesson``, ``Question`` and ``AnswerOption``.

## Target structure

### Django apps (currently → target)

| Current | Target | Models moved |
|---------|--------|--------------|
| `lms_catalog/` | `course/` | `Course`, `Section`, `CourseAuditLog` |
| `lms_catalog/` | `lesson/` | `Lesson` |
| `lms_catalog/` | `block/` | `ContentBlock` → renamed `Block`, polymorphic via GenericFK |
| `lms_enrollment/` | `enrollment/` | `CourseEnrollment`, `LessonProgress`, `CourseProgress`, `CourseInvite`, `LessonNote` |
| `lms_enrollment/` | `certificate/` | `CertificateSequence`, `Certificate` |
| `lms_assessment/` | `assessment/` | `LessonQuiz` |

### Backend URLs (currently → target)

| Current | Target |
|---------|--------|
| `/api/lms/course/` | `/api/course/` |
| `/api/lms/section/` | `/api/section/` |
| `/api/lms/lesson/` | `/api/lesson/` |
| `/api/lms/block/` | `/api/block/` |
| `/api/lms/enrollment/` | `/api/enrollment/` |
| `/api/lms/certificate/` | `/api/certificate/` |
| `/api/lms/me/...` | `/api/me/...` |

### Frontend routes (currently → target)

| Current | Target |
|---------|--------|
| `/lms/catalog` | `/catalog` |
| `/lms/course/list` | `/course/list` |
| `/lms/course/new` | `/course/new` |
| `/lms/course/<slug>` | `/course/<slug>` |
| `/lms/course/<id>/edit` | `/course/<id>/edit` |
| `/lms/lesson/<id>` | `/lesson/<id>` |
| `/lms/lesson/<id>/edit` | `/lesson/<id>/edit` |
| `/lms/me/progress` | `/me/progress` |
| `/lms/me/certificates` | `/me/certificates` |
| `/lms/me/invitations` | `/me/invitations` |
| `/lms/course-invite/<token>` | `/course-invite/<token>` |
| `/lms/certificate/<id>` | `/certificate/<id>` |
| `/lms/verify/<token>` | `/verify/<token>` |

## Phases

### Phase 1 — Backend app split + rename (without behavioral changes)

The goal of Phase 1 is to move the code structurally without changing how Block works (still FK to Lesson) and without modifying Question / AnswerOption yet.

**1.1 — Move ``lms_catalog`` → ``course`` + ``lesson`` + ``block``**

- Move ``Course``, ``Section``, ``CourseAuditLog`` into ``course/models.py``
- Move ``Lesson`` into ``lesson/models.py`` (FK to ``"course.Section"`` as string)
- Move ``ContentBlock`` into ``block/models.py`` (FK to ``"lesson.Lesson"`` as string)
- Split ``querysets.py``, ``services.py``, ``serializers.py``, ``views.py``, ``permissions.py``, ``admin.py``, ``api_urls.py``, ``sanitizer.py``, ``tests/`` accordingly
- Update every cross-app import throughout the project (search for ``lms_catalog``)
- ``INSTALLED_APPS`` swaps ``lms_catalog`` for the three new apps
- Generate fresh migrations on a clean DB (branch is allowed to break prod data — see migration strategy below)

**1.2 — Move ``lms_enrollment`` → ``enrollment`` + ``certificate``**

- Move ``CourseEnrollment``, ``LessonProgress``, ``CourseProgress``, ``CourseInvite``, ``LessonNote`` into ``enrollment/``
- Move ``CertificateSequence``, ``Certificate`` into ``certificate/``
- Split services / serializers / views / api_urls / admin / notifications / tasks / pdf_export / tests
- Update imports

**1.3 — Rename ``lms_assessment`` → ``assessment``**

- Single-app rename, ``LessonQuiz`` stays
- Update imports + the on-quiz-pass signal

### Phase 2 — Block becomes polymorphic

- Rename ``ContentBlock`` → ``Block``
- Replace ``lesson`` FK with ``content_type`` (FK to ContentType) + ``object_id`` (BigIntegerField) + ``target`` (GenericForeignKey)
- Add a ``BlockedHostMixin`` or similar marker so models that host blocks (Lesson, Question, AnswerOption) get a ``blocks = GenericRelation("block.Block")`` accessor
- Drop the per-host ``order`` uniqueness constraint, replace with ``(content_type, object_id, order)`` uniqueness
- Data migration: every existing ``ContentBlock`` row gets ``content_type=Lesson, object_id=lesson_id``
- Block.clean() loses the lesson-specific quiz-domain check (moves into a host-level validation since each host enforces its own rules)

### Phase 3 — Question + AnswerOption use blocks

- Drop ``Question.description``, ``Question.explanation`` rich-text fields (TranslatedFields)
- Drop ``AnswerOption.content`` rich-text field
- Add ``blocks = GenericRelation("block.Block")`` on both Question and AnswerOption
- Data migration:
  - For each Question: create one ``rich_text`` block per non-empty translation of description + explanation
  - For each AnswerOption: create one ``rich_text`` block per non-empty translation of content
- Update serializers (Question + AnswerOption) to read/write block lists instead of single rich-text fields
- Update the frontend question editor UI (separate UI ticket — out of this branch's first pass)

### Phase 4 — Backend URLs flat

- ``config/api_urls.py``: remove the ``/api/lms/`` prefix wrapper; each app's ``api_urls.py`` mounted under ``/api/``
- Update drf-spectacular schema generation
- Update tests that hit hardcoded ``/api/lms/...`` URLs
- Regenerate OpenAPI client (frontend ``LmsCatalogService`` etc. switch endpoints)

### Phase 5 — Frontend rename + routes flat

- Move ``pages/lms/catalog/`` → ``pages/catalog/`` (or directly into ``pages/course/``)
- Move ``pages/lms/course-*/`` → ``pages/course/*/``
- Move ``pages/lms/lesson-*/`` → ``pages/lesson/*/``
- Move ``pages/lms/certificate-*/`` → ``pages/certificate/*/``
- Move ``pages/lms/my-*/`` and ``pages/lms/progress/`` → ``pages/me/`` family
- Move ``pages/lms/course-invite-accept/`` → ``pages/course-invite-accept/``
- Update ``app.routes.ts`` route paths (drop ``/lms`` prefix)
- Update ``app.routes-paths.ts`` constants (``LMS_*`` → no prefix)
- Update ``check-i18n.ts`` registration paths
- Rename services: ``LmsCatalogService`` → ``CatalogService``, ``LmsEnrollmentService`` → ``EnrollmentService``
- Rename components: ``LmsCourseDetail`` → ``CourseDetail``, ``LmsLessonView`` → ``LessonView``, ...
- Rename i18n functions: ``getLmsCatalogUiText`` → ``getCatalogUiText``, ...
- Update every ``[routerLink]`` and ``[routerLinkActive]`` reference

## Migration strategy

Because the branch can break local / dev DBs without consequence, **all phases generate fresh Django migrations on an empty database**. The branch's migrations file each have ``initial=True`` for the new apps.

For the eventual merge to ``main``:
- Write a one-shot ``deploy/migrate-lms-split.sql`` (or Django management command) that renames the existing prod tables to match the new app namespace (``ALTER TABLE lms_catalog_course RENAME TO course_course``, …) and inserts matching rows into ``django_migrations``
- This runs ONCE on prod during the deploy window; after that prod is on the new schema

The data migration for Phase 3 (Question rich-text → blocks) is part of the normal Django migration chain — it runs both on branch DBs (where there are no existing questions to convert) and on prod (where it converts real data).

## Estimated effort

| Phase | Backend changes | Frontend changes | Tests touched | Hours |
|-------|----------------|------------------|---------------|-------|
| 1.1 | ~15 files | 0 | ~20 files | 2-3h |
| 1.2 | ~12 files | 0 | ~15 files | 1.5-2h |
| 1.3 | ~6 files | 0 | ~5 files | 30min |
| 2 | ~6 files (+ migration) | ~8 files (block editors) | ~10 files | 2-3h |
| 3 | ~8 files (+ migration) | ~15 files (question editor) | ~10 files | 2-3h |
| 4 | ~10 files | OpenAPI regen | ~5 files | 1h |
| 5 | 0 | ~80 files | 0 | 2-3h |
| **Total** | | | | **~12-15h** |

## Acceptance

A phase is done when:
- All backend tests pass (``pytest``, full suite)
- Frontend production build passes (``ng build --configuration=production``)
- i18n completeness check passes (``check-i18n.ts``)
- OpenAPI sync hook passes
- A manual smoke test on the affected flow does not regress (login → dashboard → catalog → course detail → lesson view → quiz)
