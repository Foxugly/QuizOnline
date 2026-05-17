# LMS Apps — Design Spec

**Status:** Draft, awaiting review
**Author:** brainstorming session 2026-05-18
**Scope:** Three new Django apps (`lms_catalog`, `lms_enrollment`, `lms_assessment`) + DRF API + Angular frontend (catalog, course/lesson builder, learner views, certificates) + admin Django + Celery PDF rendering. Big-bang scope: ships all 14 sections of the original brief in one cycle.

## Goal

Bring a Learning Management System (LMS) capability into QuizOnline so each `Domain` can publish structured trainings (course → section → lesson → ordered content blocks), enroll members, track per-user progression, gate progression behind validation quizzes (reusing the existing `quiz.QuizTemplate`), and deliver verifiable PDF certificates.

## Foundational decisions (locked during brainstorming)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Tenancy | `Course.domain` FK PROTECT — every course belongs to a Domain (same model as `quiz.QuizTemplate`) |
| 2 | Role mapping | `admin` = `is_superuser`; `instructor` = Domain owner OR manager; `learner` = Domain member. No new role model. |
| 3 | Content i18n | `django-parler` `TranslatableModel` on `Course`, `Section`, `Lesson`, `ContentBlock` |
| 4 | ContentBlock modelling | Single table + `block_type` + nullable type-specific fields + `.clean()` validation |
| 5 | Quiz integration | Both `ContentBlock(block_type="quiz")` (in-line formative) **and** `LessonQuiz` (validation, with required_score_percent / max_attempts / unlock_next_lesson_on_success) |
| 6 | Scope | Big-bang single phase — full spec ships at once |
| 7 | Certificate rendering | `reportlab` + Celery + local/S3 storage (NOT WeasyPrint — reportlab matches the existing `quiz/pdf_export.py` stack) |
| 8 | Lesson builder | Drag-and-drop block editor via `@angular/cdk/drag-drop` (PrimeNG `<p-orderList>` for simpler section/lesson reorder) |
| 9 | Catalog access | Authentication required; no anonymous catalog. `Lesson.is_preview` is a UI flag only — auth still required |
| 10 | Enrollment | `Course.enrollment_mode = open | approval | invite` |
| 11 | Progress cache | Persistent `CourseProgress` model recomputed by `mark_lesson_completed` |
| 12 | App layout | Split into three apps (`lms_catalog`, `lms_enrollment`, `lms_assessment`) instead of one monolith |
| 13 | Allowed languages | A Course's primary `language` and its parler translations are constrained to `course.domain.allowed_languages` |
| 14 | UI library | PrimeNG widgets first; `cdk-drag-drop` only where `<p-orderList>` is too constrained |
| 15 | i18n hardcoded strings | Zero hardcoded user-facing strings — page i18n files (5 languages simultaneously) or DB parler translations |

## 1. Architecture & app layout

```
quizonline-server/
├── lms_catalog/          # Authoring: Course / Section / Lesson / ContentBlock
├── lms_enrollment/       # Runtime: CourseEnrollment / LessonProgress / CourseProgress / Certificate
└── lms_assessment/       # Link LMS ↔ quiz.QuizTemplate: LessonQuiz validation
```

Each app contains: `models.py`, `serializers.py`, `views.py`, `permissions.py`, `services.py`, `querysets.py`, `admin.py`, `api_urls.py`, `signals.py`, `notifications.py`, `tasks.py` (where Celery is needed), `pdf_export.py` (lms_enrollment), `tests/`, `migrations/`.

**Dependency graph (acyclic):**

```
lms_assessment ──► lms_catalog
                       ▲
lms_enrollment ────────┘
                       ▲
                       └── quiz  (only via lms_assessment.LessonQuiz.quiz_template)
```

`lms_enrollment` does NOT import `lms_assessment` directly; it consumes the signal `lesson_quiz_passed` (sent from `lms_assessment`) to trigger `mark_lesson_completed`.

**URL registration** (`config/api_urls.py`):

```python
path("lms/", include([
    path("", include(("lms_catalog.api_urls", "lms_catalog"), namespace="lms-catalog-api")),
    path("", include(("lms_enrollment.api_urls", "lms_enrollment"), namespace="lms-enrollment-api")),
    path("", include(("lms_assessment.api_urls", "lms_assessment"), namespace="lms-assessment-api")),
])),
```

`INSTALLED_APPS` order in `config/settings_base.py`:

```python
"lms_catalog.apps.LmsCatalogConfig",
"lms_assessment.apps.LmsAssessmentConfig",
"lms_enrollment.apps.LmsEnrollmentConfig",
```

## 2. Models

### 2.1 `lms_catalog.Course` (parler TranslatableModel + AuditMixin)

Fields:
- `domain` FK `domain.Domain` (PROTECT, related_name="courses")
- `slug` SlugField max_length=220 unique
- `cover_image` ImageField (upload_to="lms/covers/")
- `level` choices: `beginner | intermediate | advanced`
- `language` FK `language.Language` (PROTECT) — primary language
- `estimated_duration` PositiveIntegerField (minutes)
- `enrollment_mode` choices: `open | approval | invite`
- `is_published` BooleanField db_index=True
- `published_at` DateTimeField nullable
- `created_at`, `updated_at` (auto)
- `translations = TranslatedFields(title, description, learning_objectives)`

`Meta.ordering = ["-published_at", "-created_at"]`
`Meta.indexes` on `(domain, is_published)` and `(slug,)`.

`Course.clean()`:
- If `is_published=True` then `published_at` must be set
- `language` must belong to `domain.allowed_languages` (else ValidationError on `language`)
- Domain must have non-empty `allowed_languages` (else ValidationError, "Configure allowed_languages on the domain first.")

### 2.2 `lms_catalog.Section` (parler)

Fields:
- `course` FK CASCADE related_name="sections"
- `order` PositiveIntegerField db_index=True
- `is_published` Boolean
- `translations = TranslatedFields(title, description)`

`Meta.constraints`: `UniqueConstraint(fields=["course", "order"], name="uniq_section_order_per_course")`

### 2.3 `lms_catalog.Lesson` (parler)

Fields:
- `section` FK CASCADE related_name="lessons"
- `slug` SlugField max_length=220
- `order` PositiveIntegerField db_index=True
- `is_preview` Boolean (UI flag)
- `is_published` Boolean
- `estimated_duration` PositiveIntegerField (minutes)
- `translations = TranslatedFields(title, short_description)`

`Meta.constraints`:
- `UniqueConstraint(fields=["section", "slug"], name="uniq_lesson_slug_per_section")`
- `UniqueConstraint(fields=["section", "order"], name="uniq_lesson_order_per_section")`

### 2.4 `lms_catalog.ContentBlock` (parler)

Single table, all type-specific fields nullable. Validation centralised in `.clean()` so admin and DRF use the same rules.

Fields:
- `lesson` FK CASCADE related_name="blocks"
- `block_type` choices: `rich_text | image | video | file | quiz | callout | code | embed`
- `order` PositiveIntegerField db_index=True
- `is_required` Boolean
- `image` ImageField (upload_to="lms/blocks/img/") nullable
- `video_url` URLField blank
- `video_provider` choices: `youtube | vimeo | upload` blank
- `file` FileField (upload_to="lms/blocks/file/") nullable
- `external_url` URLField blank
- `code_language` CharField max_length=32 blank
- `code_content` TextField blank
- `quiz_template` FK `quiz.QuizTemplate` SET_NULL nullable
- `metadata` JSONField default=dict
- `translations = TranslatedFields(title, rich_text, callout_text)`

`Meta.constraints`: `UniqueConstraint(fields=["lesson", "order"], name="uniq_block_order_per_lesson")`

`ContentBlock.clean()` (per-type validators):
- `rich_text` → at least one translation has non-empty `rich_text`
- `image` → `image` populated
- `video` → both `video_url` and `video_provider` populated
- `file` → `file` populated
- `quiz` → `quiz_template_id` set AND `quiz_template.domain_id == lesson.section.course.domain_id`
- `callout` → at least one translation has non-empty `callout_text`
- `code` → `code_content` populated
- `embed` → `external_url` populated

### 2.5 `lms_enrollment.CourseEnrollment` (AuditMixin)

Fields:
- `user` FK CASCADE related_name="course_enrollments"
- `course` FK `lms_catalog.Course` CASCADE related_name="enrollments"
- `status` choices: `pending | active | completed | cancelled`
- `enrolled_at` (auto_now_add), `completed_at` nullable

`Meta.constraints`: `UniqueConstraint(fields=["user", "course"], name="uniq_enrollment_per_user_course")`
`Meta.indexes`: `(user, status)`, `(course, status)`

### 2.6 `lms_enrollment.LessonProgress`

Fields:
- `user` FK CASCADE related_name="lesson_progress"
- `lesson` FK `lms_catalog.Lesson` CASCADE related_name="user_progress"
- `is_started`, `is_completed` Boolean
- `started_at`, `completed_at` nullable; `last_seen_at` auto_now
- `progress_percent` PositiveSmallIntegerField (0..100)

`Meta.constraints`: `UniqueConstraint(fields=["user", "lesson"], name="uniq_progress_per_user_lesson")`
`Meta.indexes`: `(user, is_completed)`

### 2.7 `lms_enrollment.CourseProgress`

Fields:
- `user` FK CASCADE
- `course` FK `lms_catalog.Course` CASCADE
- `completed_lessons_count`, `total_lessons_count` PositiveIntegerField
- `progress_percent` PositiveSmallIntegerField
- `updated_at` auto_now

`Meta.constraints`: `UniqueConstraint(fields=["user", "course"], name="uniq_course_progress_per_user_course")`

### 2.8 `lms_enrollment.Certificate`

Fields:
- `user` FK PROTECT related_name="certificates"
- `course` FK `lms_catalog.Course` PROTECT related_name="certificates"
- `issued_at` auto_now_add
- `certificate_number` CharField max_length=32 unique
- `verification_token` CharField max_length=64 unique db_index=True
- `pdf` FileField (upload_to="lms/certificates/") nullable
- `pdf_rendered_at` DateTimeField nullable
- `revoked_at` DateTimeField nullable
- `revoke_reason` TextField blank

`Meta.constraints`: partial unique constraint allowing re-issue after revocation:
```python
UniqueConstraint(
    fields=["user", "course"],
    condition=Q(revoked_at__isnull=True),
    name="uniq_active_cert_per_user_course",
)
```

`certificate_number` format: `QO-{year}-{seq}` with `CertificateSequence(year, counter)` table guarded by `select_for_update`.
`verification_token` = `secrets.token_urlsafe(32)` — distinct from PK; powers the public `/api/lms/verify/{token}/` endpoint.

### 2.9 `lms_assessment.LessonQuiz`

Either bound to a `Lesson` (per-lesson validation) OR to a `Course` (final exam) — never both. Enforced via CheckConstraint.

Fields:
- `lesson` OneToOne `lms_catalog.Lesson` CASCADE related_name="validation_quiz" (nullable)
- `course` OneToOne `lms_catalog.Course` CASCADE related_name="final_quiz" (nullable)
- `quiz_template` FK `quiz.QuizTemplate` PROTECT related_name="lesson_validations"
- `required_score_percent` PositiveSmallIntegerField default=70
- `is_required` Boolean default=True
- `max_attempts` PositiveIntegerField default=0 (0 = unlimited)
- `unlock_next_lesson_on_success` Boolean default=True
- `created_at` auto_now_add

`Meta.constraints`:
```python
CheckConstraint(
    check=(
        Q(lesson__isnull=False, course__isnull=True)
        | Q(lesson__isnull=True, course__isnull=False)
    ),
    name="lessonquiz_exactly_one_target",
)
```

`LessonQuiz.clean()`:
- Exactly one of (`lesson`, `course`) must be set
- `quiz_template.domain_id` must equal the target's course.domain_id

**No** `LessonQuizAttempt` model — we reuse `quiz.Quiz` (existing session model) and a `post_save` signal on it triggers `evaluate_lesson_quiz_attempt`.

## 3. Services

All business logic lives in `services.py`. Views and signals only orchestrate. All multi-table operations are wrapped in `@transaction.atomic`.

### 3.1 `lms_enrollment/services.py`

- `enroll_user_to_course(*, user, course, requested_by=None) -> CourseEnrollment`
  - Idempotent (returns existing enrollment if any)
  - Branches on `course.enrollment_mode`:
    - `open` → status=`active` immediately
    - `approval` → status=`pending`, waiting for `approve_enrollment`
    - `invite` → `PermissionDenied` unless `requested_by` is an instructor of `course` (then `active`)
  - Calls `_ensure_course_progress(user, course)` and `notify_enrollment_created_on_commit`

- `approve_enrollment(*, enrollment, decided_by) -> CourseEnrollment`
- `reject_enrollment(*, enrollment, decided_by, reason="") -> CourseEnrollment`

- `mark_lesson_started(*, user, lesson) -> LessonProgress` — idempotent
- `mark_lesson_completed(*, user, lesson, progress_percent=100) -> LessonProgress`
  - Marks the lesson complete with `select_for_update`
  - Recomputes `CourseProgress`
  - If `progress_percent == 100` AND was not previously completed → calls `issue_certificate_if_eligible`

- `calculate_course_progress(*, user, course) -> CourseProgress`
  - Counts published lessons under published sections, only
  - Updates `total_lessons_count`, `completed_lessons_count`, `progress_percent`
  - At 100%: flips `CourseEnrollment.status` to `completed`, sets `completed_at`, fires `notify_course_completed_on_commit`

- `issue_certificate_if_eligible(*, user, course) -> Certificate | None`
  - Returns existing active certificate if any (idempotent)
  - Requires all published lessons completed AND final quiz passed (if any)
  - Creates certificate with `certificate_number` + `verification_token`
  - Schedules `render_certificate_pdf.delay(cert.id)` on commit

### 3.2 `lms_catalog/services.py`

- `publish_course(*, course, by_user) -> Course` — sanity check (at least one published section with at least one published lesson) then flip + stamp `published_at`
- `unpublish_course(*, course, by_user) -> Course`
- `reorder_blocks(*, lesson, block_ids_in_order) -> list[ContentBlock]`
  - Two-phase update inside `select_for_update`: push offset (+1_000_000) then assign final orders → avoids transient violations of `uniq_block_order_per_lesson`
- `reorder_sections(*, course, section_ids_in_order)` (same pattern)
- `reorder_lessons(*, section, lesson_ids_in_order)` (same pattern)
- `clone_course(*, source, by_user, target_domain=None) -> Course` — duplicates sections, lessons, blocks and translations; no enrollments/progress copied

### 3.3 `lms_assessment/services.py`

- `evaluate_lesson_quiz_attempt(*, quiz_session)` — called from the `quiz.Quiz` `post_save` signal when `active=False`. For each `LessonQuiz` referencing `quiz_session.quiz_template`:
  - Compute score%
  - If `score_percent >= required_score_percent`:
    - lesson-bound binding → `mark_lesson_completed(user=..., lesson=...)`
    - course-bound binding → `issue_certificate_if_eligible(user=..., course=...)`

### 3.4 Helpers

- `lms_catalog/services.py::allowed_lang_codes_for_course(course) -> set[str]`
- `lms_assessment/signals.py::receiver(post_save, sender=quiz.Quiz)` calling `evaluate_lesson_quiz_attempt`
- `lms_enrollment/tasks.py::render_certificate_pdf(cert_id)` (Celery shared_task) — reportlab build, write to `cert.pdf`, stamp `pdf_rendered_at`
- `lms_enrollment/pdf_export.py::build_certificate_pdf(cert) -> bytes` — uses `SimpleDocTemplate` + Platypus, mirrors `quiz/pdf_export.py` style

### 3.5 Idempotency & concurrency guarantees

- `select_for_update()` on `LessonProgress` and `CourseProgress` before `get_or_create`
- `was_completed` captured before save to avoid double certificate emission
- `UniqueConstraint(condition=Q(revoked_at__isnull=True))` belt-and-suspenders at DB level
- Services raise `django.core.exceptions.ValidationError` / `rest_framework.exceptions.PermissionDenied`; views let DRF map to 400/403

## 4. Serializers & API endpoints

### 4.1 Conventions

- All endpoints under `/api/lms/`
- `IsAuthenticated` default; only `/api/lms/verify/{token}/` is anonymous
- Pagination = PageNumberPagination (inherited from global REST_FRAMEWORK config)
- OpenAPI regenerated by `.\scripts\sync-openapi.ps1` after each backend PR
- Throttle scopes: `lms_enroll`, `lms_block_write`, `lms_cert_verify` (env-overridable, see §9.5)

### 4.2 `TranslationsField` helper

Custom DRF Field that:
- Serializes a parler-translated object's translations into `{lang_code: {field: value}}` dict (same shape as the legacy QuizTemplate `translations` JSONField)
- On write, validates that all `lang_code` keys belong to `course.domain.allowed_languages` (per §8.7), then assigns via `instance.set_current_language(lang); instance.<field> = value; instance.save()`
- `@extend_schema_field` typed as `{lang_code: object}` for drf-spectacular

Lives in `lms_catalog/serializers.py`, imported elsewhere.

### 4.3 Catalog endpoints

```
GET    /api/lms/course/                          List visible courses (filters: ?level=&language=&domain=&q=)
POST   /api/lms/course/                          Create (instructor)
GET    /api/lms/course/{id}/                     Detail (sections+lessons, no blocks)
PUT    /api/lms/course/{id}/                     Update (instructor)
PATCH  /api/lms/course/{id}/
DELETE /api/lms/course/{id}/
POST   /api/lms/course/{id}/publish/             Service: publish_course
POST   /api/lms/course/{id}/unpublish/
POST   /api/lms/course/{id}/clone/

GET    /api/lms/course/{id}/section/             List
POST   /api/lms/course/{id}/section/             Create
PATCH  /api/lms/section/{id}/
DELETE /api/lms/section/{id}/
POST   /api/lms/course/{id}/section/reorder/     Body: [section_id, ...]

GET    /api/lms/section/{id}/lesson/
POST   /api/lms/section/{id}/lesson/
GET    /api/lms/lesson/{id}/                     Detail with blocks (learner view)
PATCH  /api/lms/lesson/{id}/
DELETE /api/lms/lesson/{id}/
POST   /api/lms/section/{id}/lesson/reorder/

GET    /api/lms/lesson/{id}/block/
POST   /api/lms/lesson/{id}/block/
PATCH  /api/lms/block/{id}/
DELETE /api/lms/block/{id}/
POST   /api/lms/lesson/{id}/block/reorder/       Body: [block_id, ...]
```

### 4.4 Enrollment & progress endpoints

```
GET    /api/lms/enrollment/                       My enrollments (?status=)
POST   /api/lms/course/{id}/enroll/               Service: enroll_user_to_course
POST   /api/lms/enrollment/{id}/cancel/
GET    /api/lms/course/{id}/enrollment/           (instructor) list enrollments
POST   /api/lms/enrollment/{id}/approve/          (instructor)
POST   /api/lms/enrollment/{id}/reject/           (instructor)

POST   /api/lms/lesson/{id}/start/                Service: mark_lesson_started
POST   /api/lms/lesson/{id}/complete/             Service: mark_lesson_completed
GET    /api/lms/course/{id}/progress/             My CourseProgress for one course
GET    /api/lms/me/progress/                      All my CourseProgress entries
```

### 4.5 Assessment endpoints

```
GET    /api/lms/lesson/{id}/validation-quiz/      Read
POST   /api/lms/lesson/{id}/validation-quiz/      (instructor) create/replace
PATCH  /api/lms/validation-quiz/{id}/             (instructor)
DELETE /api/lms/validation-quiz/{id}/             (instructor)
GET    /api/lms/course/{id}/final-quiz/
POST   /api/lms/course/{id}/final-quiz/
```

No "validation quiz session" endpoint — sessions are created via existing `/api/quiz/` flow; the `post_save` signal links the attempt.

### 4.6 Certificate endpoints

```
GET    /api/lms/certificate/                      My certificates (learner)
GET    /api/lms/certificate/{id}/                 Detail + download URL
GET    /api/lms/certificate/{id}/pdf/             Download PDF (authenticated)
GET    /api/lms/verify/{verification_token}/      Public, no auth, AnonRateThrottle
POST   /api/lms/certificate/{id}/revoke/          (instructor / admin)
```

`/api/lms/verify/{token}/` returns minimal `{valid, certificate_number, course_title, user_display_name, issued_at, revoked}` — no enumeration surface.

### 4.7 Filtering & search

- `django-filter` on `CourseList`: `?level=`, `?language=`, `?domain=`, `?q=` (search on `translations__title__icontains` + `.distinct()`)
- Ordering: `published_at`, `created_at`, `level`

### 4.8 SerializerMethodField guidance

- `CourseDetailSerializer.can_manage` → boolean from `is_lms_instructor(request.user, course)`
- `CourseDetailSerializer.enrollment_status` → status of current user's CourseEnrollment (or null) — must come from a `prefetch_related` to avoid N+1
- `CourseDetailSerializer.progress_percent` → from `CourseProgress` annotation
- `CourseDetailSerializer.available_lang_codes` → `sorted(course.domain.allowed_languages.values_list("code", flat=True))`

## 5. Permissions

### 5.1 Role helpers (`lms_catalog/permissions.py`)

```python
def is_lms_instructor(user, course) -> bool:
    if not is_authenticated_user(user):
        return False
    if is_django_admin(user):
        return True
    return user.can_manage_domain(course.domain)


def is_lms_learner(user, course) -> bool:
    if not is_authenticated_user(user):
        return False
    domain = course.domain
    return (
        domain.owner_id == user.pk
        or domain.managers.filter(pk=user.pk).exists()
        or domain.members.filter(pk=user.pk).exists()
    )
```

### 5.2 Permission classes

- `IsLmsInstructorOrReadOnly` — read allowed to learners IF the publication chain is OK (course / section / lesson all `is_published=True` OR `lesson.is_preview=True`); write reserved to instructors
- `IsEnrollmentOwnerOrInstructor` — owner of enrollment OR instructor of course
- `CanVerifyCertificate` — anonymous allowed (token IS the authorization)

`_course_of(obj)` helper navigates Section→course, Lesson→section.course, ContentBlock→lesson.section.course.
`_is_published_chain(obj)` enforces full chain `is_published`.

### 5.3 Queryset-level visibility

`lms_catalog/querysets.py::CourseQuerySet.visible_to(user)`:
- superuser → all
- otherwise → courses where user is owner/manager (any state) OR member AND `is_published=True`
- `.distinct()` mandatory due to M2M joins

`LessonQuerySet.visible_to(user)`:
- Lessons whose course is in `Course.objects.visible_to(user)`
- If learner (not instructor): only `is_published=True OR is_preview=True`

### 5.4 Endpoint permission matrix

| Endpoint | Permission |
|----------|-----------|
| `GET /api/lms/course/` | `IsAuthenticated` + queryset filter |
| `POST /api/lms/course/` | `IsAuthenticated` + instructor of target domain |
| `POST /api/lms/course/{id}/publish/` | `IsLmsInstructorOrReadOnly` |
| `POST /api/lms/lesson/{id}/block/reorder/` | `IsLmsInstructorOrReadOnly` |
| `POST /api/lms/course/{id}/enroll/` | `IsAuthenticated` + `is_lms_learner` |
| `POST /api/lms/enrollment/{id}/approve/` | `IsLmsInstructorOrReadOnly` |
| `POST /api/lms/lesson/{id}/complete/` | `IsAuthenticated` + enrolled |
| `GET /api/lms/me/progress/` | `IsAuthenticated` + `filter(user=request.user)` |
| `GET /api/lms/certificate/{id}/pdf/` | owner OR instructor |
| `GET /api/lms/verify/{token}/` | `AllowAny` + `AnonRateThrottle` scope `lms_cert_verify` |

### 5.5 Non-revealing 404s

Non-member learners get `404` (not `403`) on private resources to avoid revealing existence — implemented by queryset filtering, not by raising 403 in `has_object_permission`.

## 6. Admin Django

### 6.1 `lms_catalog/admin.py`

`CourseAdmin(TranslatableAdmin)`:
- `list_display = ("id", "title", "domain", "level", "language", "is_published", "published_at", "updated_at")`
- `list_filter = ("is_published", "level", "domain", "language", "enrollment_mode")`
- `search_fields = ("translations__title", "translations__description", "slug")`
- `autocomplete_fields = ("domain", "language", "created_by", "updated_by")`
- `inlines = [SectionInline]`
- `save_model` stamps `created_by` / `updated_by` from `request.user`
- Slug populated by `Course.save()` (cannot use `prepopulated_fields` with parler-translated source)
- Override `get_language_tabs()` to restrict to `obj.domain.allowed_languages`

`SectionAdmin(TranslatableAdmin)`:
- `inlines = [LessonInline]`
- `autocomplete_fields = ("course",)`
- `ordering = ("course", "order")`

`LessonAdmin(TranslatableAdmin)`:
- `inlines = [ContentBlockInline]`
- `autocomplete_fields = ("section",)`
- `ordering = ("section", "order")`

`ContentBlockInline(TranslatableStackedInline)`:
- Stacked (not Tabular) because too many per-type fields
- Fieldsets group per block_type (collapsed except `(None,)` block)

`SectionInline(TranslatableTabularInline)`, `LessonInline(TranslatableTabularInline)`: compact listings with `show_change_link=True` to reach the dedicated admin.

### 6.2 `lms_enrollment/admin.py`

- `CourseEnrollmentAdmin` with actions `approve_selected`, `reject_selected` (calls the services so validation is consistent)
- `LessonProgressAdmin` (mostly read)
- `CourseProgressAdmin` (read-only)
- `CertificateAdmin` with action `regenerate_pdf` (enqueues Celery), `revoke_selected`

### 6.3 `lms_assessment/admin.py`

- `LessonQuizAdmin` with computed `target_display` (`Lesson:N` or `Course:N (final)`)
- `autocomplete_fields = ("lesson", "course", "quiz_template")`

### 6.4 `list_select_related` everywhere it matters to avoid N+1.

### 6.5 No new admin permission classes — Django `is_staff` + `is_superuser` are sufficient; admin actions reuse services, so the same checks apply.

## 7. Frontend (Angular 21 + PrimeNG 21)

### 7.1 Directory structure

```
quizonline-frontend/src/app/
├── pages/lms/
│   ├── catalog/
│   ├── course-detail/
│   ├── course-edit/
│   │   └── tabs/{info-tab,structure-tab,enrollment-tab,analytics-tab}/
│   ├── lesson-edit/
│   │   └── block-editors/{rich-text,image,video,file,quiz,callout,code,embed}-block-editor/
│   ├── lesson-view/
│   │   └── block-renderers/{rich-text,image,video,file,quiz,callout,code,embed}-block-renderer/
│   ├── progress/
│   ├── certificate-list/
│   ├── certificate-view/
│   └── certificate-verify/
└── shared/lms/
    ├── lms-translations.ts          # pickTranslation helper
    ├── block-icons.ts               # block_type → PrimeIcon mapping
    ├── progress-bar.component.ts
    ├── content-block.types.ts
    └── lms-common.i18n.ts           # shared block-type/status/level labels
```

### 7.2 Routes (added in `app.routes.ts`, paths centralised in `app.routes-paths.ts`)

```typescript
{ path: 'lms/catalog',             loadComponent: ..., canActivate: [authGuard] }
{ path: 'lms/course/:slug',        loadComponent: ..., canActivate: [authGuard] }
{ path: 'lms/course/:id/edit',     loadComponent: ..., canActivate: [authGuard, domainAccessGuard] }
// Note: read URLs use the slug for SEO/sharing; edit URLs use numeric id.
// CourseViewSet exposes BOTH /api/lms/course/{id}/ (PK lookup, default) and
// /api/lms/course/by-slug/{slug}/ (a list_route action) so the catalog page
// can resolve the route param to a course without a second hop.
{ path: 'lms/lesson/:id',          loadComponent: ..., canActivate: [authGuard] }
{ path: 'lms/lesson/:id/edit',     loadComponent: ..., canActivate: [authGuard, domainAccessGuard] }
{ path: 'lms/me/progress',         loadComponent: ..., canActivate: [authGuard] }
{ path: 'lms/me/certificates',     loadComponent: ..., canActivate: [authGuard] }
{ path: 'lms/verify/:token',       loadComponent: ... }   // PUBLIC — no authGuard
```

### 7.3 Technical patterns (CLAUDE.md compliance)

- `OnPush` change detection on every component
- `inject()` DI everywhere (no constructor injection)
- Signals for state (`signal`, `computed`)
- `input()`/`output()` functions (no decorators)
- No `standalone: true` (Angular 21 default)
- Generated API client from `quizonline-frontend/src/app/api/generated` (regenerated by `sync-openapi.ps1`)
- Button sizing: `size="small"` for row-actions and tightly-coupled table toolbars; default for page CTAs (form submit, page hero, dialog footer); never `size="large"`
- Empty states: `<app-empty-state density="compact">` in tables, default density on page sections
- Dates: `| relativeDate` with `[attr.title]="value | date:'medium'"`. Exception: `Certificate.issued_at` rendered as exact date in PDF and `/verify/:token` page (legal context)
- Skeletons (`<p-skeleton>`) for loading; no global spinners

### 7.4 Block builder (lesson-edit)

`@angular/cdk/drag-drop` for block reordering (`<p-orderList>` too constrained for heterogeneous inline items). Each `*-block-editor` is OnPush, takes `input<ContentBlock>('block')`, emits `output<Partial<ContentBlock>>('changed')` after debounce 500 ms, handles its own translation tabs (filtered to `available_lang_codes`).

### 7.5 Block renderers (lesson-view)

- `rich-text-block-renderer` — renders sanitized HTML (backend-sanitized; see §10.3.4)
- `quiz-block-renderer` — embeds existing `<app-quiz-play>` component with the bound `quiz_template`
- `video-block-renderer` — `<iframe>` for youtube/vimeo, `<video controls>` for upload
- `code-block-renderer` — `<pre><code>` minimally styled; highlight.js considered only if PrimeNG `<p-editor>` read-only proves insufficient (decision deferred to plan)

### 7.6 PrimeNG widgets mapping

| Use | Widget |
|-----|--------|
| Catalog cards | `<p-dataView>` + `<p-card>` |
| Filters | `<p-select>` (single) / `<p-multiSelect>` (multi) |
| Enrollment / progress / certificate tables | `<p-table>` (`lazy`, `paginator`) |
| Status badges | `<p-tag>` with dynamic severity |
| Course edit tabs | `<p-tabs>` |
| Progression bar | `<p-progressBar>` |
| File / image upload in blocks | `<p-fileUpload>` (`advanced` for image, `basic` for file) |
| Rich-text editor | `<p-editor>` (Quill-based, bundled) |
| Section/Lesson reorder (titles only) | `<p-orderList>` |
| Block reorder (heterogeneous inline) | `cdk-drag-drop` (exception, documented) |
| Confirm dialogs | `<p-confirmDialog>` |
| Toast | `AppToastService` wrapping `MessageService` |
| Loading skeletons | `<p-skeleton>` |
| Translation tabs in builder | `<p-tabs>` filtered by `available_lang_codes` |

Rule: before introducing a third-party UI lib (Quill direct, TipTap, prismjs, etc.) check PrimeNG first.

### 7.7 i18n strict rule — zero hardcoded strings

Two — and only two — sources for visible text:

1. **Static UI labels** (buttons, titles, placeholders, empty-states, toasts, aria-labels, `title=` attrs, column headers, tab labels, enum labels like block types and statuses, validation error messages, action labels) → `pages/lms/<page>/<page>.i18n.ts` with all 5 languages provided simultaneously
2. **Dynamic pedagogical content** (`Course.title`, `Lesson.title`, `ContentBlock.rich_text`, `learning_objectives`, etc.) → `translations` field returned by API, read via `pickTranslation(translations, lang)` (fallback `<lang> → fr → en → first-available`)

Required i18n files:
```
pages/lms/catalog/catalog.i18n.ts
pages/lms/course-detail/course-detail.i18n.ts
pages/lms/course-edit/course-edit.i18n.ts
pages/lms/lesson-view/lesson-view.i18n.ts
pages/lms/lesson-edit/lesson-edit.i18n.ts
pages/lms/progress/progress.i18n.ts
pages/lms/certificate-list/certificate-list.i18n.ts
pages/lms/certificate-view/certificate-view.i18n.ts
pages/lms/certificate-verify/certificate-verify.i18n.ts
shared/lms/lms-common.i18n.ts    # block-type / status / level / video-provider labels
```

Anti-patterns to reject in review:
- `pageTitle = "Mes cours"` in `.ts`
- `<h1>Catalogue</h1>` in `.html`
- `this.toast.success("Cours créé")` instead of `this.toast.success(this.ui().toastCourseCreated)`
- `<p-button label="Publier">` instead of `[label]="ui().publishButton"`

### 7.8 Security

- Show instructor-only buttons only when `course.can_manage === true` (returned by `CourseDetailSerializer`)
- Rich-text sanitization happens server-side at save time (`bleach` or `nh3`) — never trust frontend sanitization
- `DomSanitizer.bypassSecurityTrustHtml` only on rich_text that has been backend-sanitized

## 8. i18n backend

### 8.1 Two i18n mechanisms

| Category | Mechanism | Storage |
|----------|-----------|---------|
| Technical strings (errors, email subjects, choices labels, audit, admin verbose names) | `gettext_lazy as _` + `.po` files | `locale/<lang>/LC_MESSAGES/django.po` |
| Pedagogical content (course/lesson titles, descriptions, rich_text, callout_text, learning_objectives) | `parler` `TranslatedFields` | `*_translation` tables |

No user-visible Python string in clear text, anywhere.

### 8.2 `.po` files

5 languages mandatory: `fr / en / nl / it / es`. Build via:
```powershell
python manage.py makemessages -l fr -l en -l nl -l it -l es --no-obsolete
python manage.py compilemessages
```
Documented in `deploy/README.md` as a post-merge step.

### 8.3 Choices use `_()`

Example:
```python
LEVEL_CHOICES = [
    (LEVEL_BEGINNER, _("Beginner")),
    (LEVEL_INTERMEDIATE, _("Intermediate")),
    (LEVEL_ADVANCED, _("Advanced")),
]
```
The frontend receives raw values (`"beginner"`) and uses its own i18n mapping (`shared/lms/lms-common.i18n.ts`). The `.po` translations serve Django admin and server-sent emails.

### 8.4 Email templates

```
templates/emails/lms/
├── enrollment-created.{html,txt}
├── enrollment-approved.{html,txt}
├── enrollment-rejected.{html,txt}
├── course-completed.{html,txt}
└── certificate-issued.{html,txt}
```
Use `{% load i18n %}` + `{% trans %}` / `{% blocktrans %}`. Subjects rendered via:
```python
with translation.override(recipient.language):
    subject = _("Your certificate for %(course_title)s is ready") % {
        "course_title": course.safe_translation_getter("title", language_code=recipient.language),
    }
```

### 8.5 Parler config (`config/settings_base.py`)

Verify `PARLER_LANGUAGES` contains all five languages. If not present:
```python
PARLER_LANGUAGES = {
    None: ({"code": "fr"}, {"code": "en"}, {"code": "nl"}, {"code": "it"}, {"code": "es"}),
    "default": {"fallback": "fr", "hide_untranslated": False},
}
```

### 8.6 Language constraint propagation

A Course's primary `language` and parler translations are constrained to `course.domain.allowed_languages`:

- `Course.clean()` validates `language ∈ domain.allowed_languages`
- `TranslationsField.to_internal_value()` filters/rejects entries with `lang_code` outside `course.domain.allowed_languages.values_list("code", flat=True)`
- Same enforcement for `Section`, `Lesson`, `ContentBlock` (navigate to course → domain)
- `available_lang_codes` (read-only field) exposed on every detail serializer for the frontend to render only allowed translation tabs
- Admin: override `get_language_tabs()` per `*Admin` to filter tabs by the parent course's domain
- If `domain.allowed_languages` is empty → `Course.clean()` raises ValidationError with `_("Configure allowed_languages on the domain first.")`

## 9. Migrations & seed

### 9.1 Generation order

```powershell
python manage.py makemigrations lms_catalog
python manage.py makemigrations lms_assessment
python manage.py makemigrations lms_enrollment
python manage.py makemigrations --dry-run --check
```

Parler auto-generates `*_translation` table migrations.

### 9.2 No data migration required (new app)

But three operational notes:
1. Each `Domain` must have non-empty `allowed_languages` before any Course can be created
2. `CourseProgress` is created at `enroll` time — no backfill
3. `CertificateSequence(year, counter)` table: first year starts at 1

### 9.3 Dev seed command

`quizonline-server/lms_catalog/management/commands/seed_lms_demo.py` — idempotent; creates a demo Domain + 2 Courses (one published, one draft) × 2 Sections × 2 Lessons × 3 mixed ContentBlocks + 1 LessonQuiz validation + 1 final course quiz. Run manually in dev, not from migrations.

### 9.4 Throttle env vars

Add to `config/settings_base.py` env reader:
```python
THROTTLE_LMS_ENROLL=(str, "20/min"),
THROTTLE_LMS_BLOCK_WRITE=(str, "120/min"),
THROTTLE_LMS_CERT_VERIFY=(str, "60/min"),
```

And to `DEFAULT_THROTTLE_RATES` dict.

### 9.5 SSM seeding (production)

All env vars stored in AWS SSM Parameter Store under `/quizonline/prod/<KEY>`. Materialised at boot by `quizonline-env-fetch.service` → `/run/quizonline/env`.

Seed the three new keys via:
```bash
bash deploy/seed-parameter-store.sh --prefix /quizonline/prod ./lms-throttles.env
# where lms-throttles.env contains:
#   THROTTLE_LMS_ENROLL=20/min
#   THROTTLE_LMS_BLOCK_WRITE=120/min
#   THROTTLE_LMS_CERT_VERIFY=60/min
```

Not secrets → `String` type is fine (no `SecureString` needed).

Also add the three keys to:
- `deploy/env.production.example` (template for fresh-EC2 bootstrap)
- `quizonline-server/.env.example` (dev parity)

### 9.6 Rollback strategy

- Code: revert + push main; GH Actions redeploys; `redeploy.sh` keeps `browser.prev/`
- Schema: `migrate lms_enrollment zero && migrate lms_assessment zero && migrate lms_catalog zero` undoes cleanly (FK PROTECT prevents wrong order). Documented in `deploy/README.md`. Do NOT migrate to zero if enrollments/certificates exist — data loss

### 9.7 Critical tests (must be in the PR)

- `lms_catalog/tests/test_models.py` — ContentBlock.clean per `block_type` (8 valid + 8 invalid)
- `lms_catalog/tests/test_permissions.py` — matrix learner / instructor / admin / non-member × Course / Section / Lesson / ContentBlock × GET / POST / PATCH / DELETE
- `lms_catalog/tests/test_i18n_constraint.py` — Course.clean rejects language outside domain.allowed_languages
- `lms_enrollment/tests/test_services.py` — `enroll_user_to_course` × 3 modes; `mark_lesson_completed` idempotent; `calculate_course_progress` 0/50/100%; `issue_certificate_if_eligible` with/without final quiz, with/without prior revocation
- `lms_assessment/tests/test_signals.py` — `quiz.Quiz post_save` propagates to `mark_lesson_completed` when score ≥ required
- `lms_enrollment/tests/test_pdf.py` — `render_certificate_pdf` writes a non-empty PDF and stamps `pdf_rendered_at`

## 10. Ops, pitfalls, documentation

### 10.1 SSM keys recap

| Key | Default | Use |
|-----|---------|-----|
| `/quizonline/prod/THROTTLE_LMS_ENROLL` | `20/min` | `/api/lms/course/{id}/enroll/` |
| `/quizonline/prod/THROTTLE_LMS_BLOCK_WRITE` | `120/min` | block write endpoints |
| `/quizonline/prod/THROTTLE_LMS_CERT_VERIFY` | `60/min` | anon `/api/lms/verify/{token}/` |

### 10.2 Media storage

Local disk via Django `FileField` / `ImageField`. Already served by nginx at `/media/` in prod. S3 + django-storages explicitly out-of-scope for v1; revisit if self-hosted video uploads become significant.

### 10.3 Pitfalls to avoid (explicitly)

1. Parler + signal import cycle — use `apps.get_model("lms_catalog", "Lesson")` inside `lms_assessment/signals.py` connector; never import the model at module top-level
2. N+1 on listings — every `ViewSet.get_queryset()` `prefetch_related("translations", "sections__lessons__blocks__translations")` where applicable
3. Search on parler translations — `filter(translations__title__icontains=q).distinct()` (the `.distinct()` is mandatory)
4. Rich-text sanitization — use `bleach` or `nh3` in `ContentBlock.save()` with a strict allowlist (`<p>, <strong>, <em>, <a>, <ul>, <ol>, <li>, <h2>, <h3>, <code>, <pre>, <img src=internal-only, <br>`). XSS via `<script>` must never reach the DB
5. `SerializerMethodField` running ORM queries — use `annotate` / `prefetch_related` at queryset level, not per-object
6. `UniqueConstraint(condition=Q(...))` on Certificate — works on PostgreSQL and SQLite. Production DB engine is assumed to be PostgreSQL (per `DATABASE_URL`); verify before implementing this constraint
7. `select_for_update()` on SQLite (dev) — no-op silently. Concurrency tests, if added, must run against PostgreSQL — SQLite would give a false-pass
8. Cascade delete: `Course → Section → Lesson → ContentBlock` are CASCADE. `CourseEnrollment.course` / `LessonProgress.lesson` CASCADE → deleting a course erases progressions. `Certificate.course = PROTECT` → cannot delete a course that has issued certificates. Communicate this in the instructor UI (delete button shows the protected reason).
9. No soft delete in v1 — deprecated courses are `is_published=False`; hard delete is protected by `Certificate.PROTECT`. Revisit later if needed.
10. `reorder_blocks` concurrency — two parallel drag-drops on the same lesson could corrupt order. `select_for_update` on all blocks of the lesson inside one transaction serialises them.
11. Parler + Django admin — `prepopulated_fields={"slug": ("title",)}` does NOT work on parler-translated fields; slug is generated in `Course.save()` (pattern from QuizTemplate)
12. Celery `render_certificate_pdf` is idempotent — re-render overwrites the PDF file; the certificate remains valid via `verification_token`
13. `AnonRateThrottle` on `/verify/` — DRF reads `REMOTE_ADDR`; verify nginx forwards `X-Forwarded-For` properly so the throttle keys on the real visitor IP, not 127.0.0.1
14. `drf-spectacular` + parler — `TranslationsField` must use `@extend_schema_field` to declare its OpenAPI shape (`{lang_code: object}`); otherwise the generated TS client types it as `unknown`
15. CORS — no new origins; new endpoints inherit existing CORS config

### 10.4 Documentation to update

- `CLAUDE.md` (root) — add "## Domain features (Phase E — LMS)" subsection with Course/Section/Lesson/ContentBlock model summary, the key endpoints, and the role mapping
- `deploy/README.md` — SSM seeding of LMS throttles + `seed_lms_demo` command + parler `compilemessages` reminder
- `deploy/env.production.example` — 3 new lines
- `quizonline-server/.env.example` — 3 new lines
- `deploy/SECRETS-ROTATION.md` — no change (no secret introduced)

### 10.5 Observability

- Sentry catches DRF / Celery exceptions via existing config — no new setup
- Per-course KPIs (enrollments / completions / average score / completion rate) surfaced in the `analytics-tab` of `course-edit` (basic counters in v1; no Grafana board)

## Open questions / deferred decisions

These should be answered during plan-writing or first implementation pass, not now:

1. **Code-block syntax highlighting** — try PrimeNG `<p-editor>` read-only first; fall back to highlight.js only if needed
2. **Backend HTML sanitizer choice** — `bleach` vs `nh3` (Rust-backed, faster). Default: `bleach` (already common); upgrade to `nh3` if a perf issue surfaces
3. **Final quiz vs lesson quizzes order** — when a final course quiz exists, does it need to be passed last, or can it be retaken after additional lessons? Default: passed last, recomputed at each lesson completion
4. **Certificate revocation re-issue grace period** — when a revoked certificate's blocking conditions are met again, do we re-issue automatically or require manual action? Default: re-issue automatically (the partial UniqueConstraint allows it)
5. **`Lesson.is_required` flag** — currently all published lessons count toward `CourseProgress`. If the user wants optional lessons later, add an `is_required` field and filter in `calculate_course_progress`. Deferred to v2.

## Definition of done

- All three apps installed, migrations applied, models pass `python manage.py makemigrations --dry-run --check`
- DRF endpoints listed in §4.3-4.6 implemented, OpenAPI schema regenerated (`scripts/sync-openapi.ps1`), generated TS client used in the frontend
- All permission matrix entries (§5.4) covered by tests
- ContentBlock `.clean()` covers all 8 types with happy-path + failure tests
- Certificate PDF rendering works in dev (asserted by `test_pdf.py`) and via Celery in prod
- Frontend pages render in all 5 languages with no hardcoded strings (grep check in CI)
- `seed_lms_demo` produces a coherent demo dataset
- `CLAUDE.md`, `deploy/README.md`, both `.env.example` updated
- SSM keys seeded in production
- Manual smoke test: instructor creates → publishes → enrolls a learner → learner completes all lessons → final quiz passed → certificate issued → PDF downloads → `/verify/{token}` confirms it
