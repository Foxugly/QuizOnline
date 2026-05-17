# LMS Apps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Domain-scoped Learning Management System into QuizOnline (3 Django apps + DRF API + Angular pages) so instructors can author structured courses with ordered content blocks, learners can enroll and progress, and Celery delivers reportlab-rendered verifiable certificates.

**Architecture:** Three new Django apps under `/api/lms/`: `lms_catalog` (Course/Section/Lesson/ContentBlock), `lms_assessment` (LessonQuiz bridging to `quiz.QuizTemplate`), `lms_enrollment` (CourseEnrollment/LessonProgress/CourseProgress/Certificate). Content uses `django-parler` constrained to `Domain.allowed_languages`. Roles map directly to Domain owner/manager/member — no new role tables. Angular pages live under `pages/lms/`, sharing PrimeNG widgets and a strict no-hardcoded-strings i18n rule (5 languages).

**Tech Stack:** Django 6, DRF, django-parler, Celery + Redis, reportlab, nh3 (HTML sanitizer), Angular 21, PrimeNG 21, `@angular/cdk/drag-drop`, drf-spectacular.

**Spec:** [docs/superpowers/specs/2026-05-18-lms-app-design.md](../specs/2026-05-18-lms-app-design.md) (commit `4fff365`)

---

## Phases overview

| Phase | Theme | Tasks |
|-------|-------|-------|
| 1 | App skeletons + settings | T1–T6 |
| 2 | Catalog models + admin | T7–T13 |
| 3 | Assessment model + admin | T14–T15 |
| 4 | Enrollment models + admin | T16–T19 |
| 5 | Services (catalog + enrollment + assessment) | T20–T27 |
| 6 | Celery + reportlab PDF | T28–T29 |
| 7 | Backend i18n + notifications + emails | T30–T33 |
| 8 | Permissions + querysets | T34–T36 |
| 9 | Serializers + ViewSets + URLs + throttles | T37–T47 |
| 10 | HTML sanitization + SSM + seed demo | T48–T51 |
| 11 | OpenAPI resync | T52 |
| 12 | Frontend foundation (shared/lms + routes) | T53–T55 |
| 13 | Frontend learner pages | T56–T63 |
| 14 | Frontend instructor pages | T64–T70 |
| 15 | End-to-end smoke + docs | T71–T73 |

---

## Phase 1 — App skeletons and global settings

### Task 1: Create `lms_catalog` app skeleton

**Files:**
- Create: `quizonline-server/lms_catalog/__init__.py` (empty)
- Create: `quizonline-server/lms_catalog/apps.py`
- Create: `quizonline-server/lms_catalog/models.py` (empty placeholder)
- Create: `quizonline-server/lms_catalog/admin.py` (empty placeholder)
- Create: `quizonline-server/lms_catalog/tests/__init__.py` (empty)

- [ ] **Step 1: Create the package files**

`quizonline-server/lms_catalog/apps.py`:

```python
from django.apps import AppConfig


class LmsCatalogConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "lms_catalog"
    verbose_name = "LMS — Catalog"

    def ready(self):
        # Signals registered explicitly later (Phase 5 task)
        pass
```

`quizonline-server/lms_catalog/models.py`:

```python
# Populated in Phase 2.
```

`quizonline-server/lms_catalog/admin.py`:

```python
# Populated in Phase 2.
```

- [ ] **Step 2: Verify Python can import the app**

Run: `cd quizonline-server && python -c "from lms_catalog.apps import LmsCatalogConfig; print(LmsCatalogConfig.name)"`
Expected: prints `lms_catalog`

- [ ] **Step 3: Commit**

```bash
git add quizonline-server/lms_catalog/
git commit -m "feat(lms_catalog): create app skeleton"
```

---

### Task 2: Create `lms_assessment` app skeleton

**Files:**
- Create: `quizonline-server/lms_assessment/__init__.py`
- Create: `quizonline-server/lms_assessment/apps.py`
- Create: `quizonline-server/lms_assessment/models.py`
- Create: `quizonline-server/lms_assessment/admin.py`
- Create: `quizonline-server/lms_assessment/tests/__init__.py`

- [ ] **Step 1: Create files** (same pattern as Task 1)

`quizonline-server/lms_assessment/apps.py`:

```python
from django.apps import AppConfig


class LmsAssessmentConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "lms_assessment"
    verbose_name = "LMS — Assessment"

    def ready(self):
        # Signals connected in Phase 5.
        from . import signals  # noqa: F401
```

`quizonline-server/lms_assessment/models.py`:
```python
# Populated in Phase 3.
```

`quizonline-server/lms_assessment/admin.py`:
```python
# Populated in Phase 3.
```

`quizonline-server/lms_assessment/signals.py`:
```python
# Receivers connected in Phase 5 — placeholder so apps.ready() does not fail.
```

- [ ] **Step 2: Verify the import**

Run: `cd quizonline-server && python -c "from lms_assessment.apps import LmsAssessmentConfig; print(LmsAssessmentConfig.name)"`
Expected: prints `lms_assessment`

- [ ] **Step 3: Commit**

```bash
git add quizonline-server/lms_assessment/
git commit -m "feat(lms_assessment): create app skeleton"
```

---

### Task 3: Create `lms_enrollment` app skeleton

**Files:**
- Create: `quizonline-server/lms_enrollment/__init__.py`
- Create: `quizonline-server/lms_enrollment/apps.py`
- Create: `quizonline-server/lms_enrollment/models.py`
- Create: `quizonline-server/lms_enrollment/admin.py`
- Create: `quizonline-server/lms_enrollment/tests/__init__.py`

- [ ] **Step 1: Create files**

`quizonline-server/lms_enrollment/apps.py`:
```python
from django.apps import AppConfig


class LmsEnrollmentConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "lms_enrollment"
    verbose_name = "LMS — Enrollment"
```

`quizonline-server/lms_enrollment/models.py`:
```python
# Populated in Phase 4.
```

`quizonline-server/lms_enrollment/admin.py`:
```python
# Populated in Phase 4.
```

- [ ] **Step 2: Commit**

```bash
git add quizonline-server/lms_enrollment/
git commit -m "feat(lms_enrollment): create app skeleton"
```

---

### Task 4: Register apps in `INSTALLED_APPS`

**Files:**
- Modify: `quizonline-server/config/settings_base.py`

- [ ] **Step 1: Add three lines to `INSTALLED_APPS`**

Locate `INSTALLED_APPS` (around line 99-123). After the `"translation.apps.TranslationConfig",` line, append:

```python
    "lms_catalog.apps.LmsCatalogConfig",
    "lms_assessment.apps.LmsAssessmentConfig",
    "lms_enrollment.apps.LmsEnrollmentConfig",
```

Order matters: `lms_catalog` first (models referenced by the other two), `lms_assessment` before `lms_enrollment` (so signals are registered before enrollment runs).

- [ ] **Step 2: Run Django check**

Run: `cd quizonline-server && python manage.py check`
Expected: `System check identified no issues (0 silenced).`

- [ ] **Step 3: Commit**

```bash
git add quizonline-server/config/settings_base.py
git commit -m "feat(lms): register lms_catalog/lms_assessment/lms_enrollment in INSTALLED_APPS"
```

---

### Task 5: Verify and complete `PARLER_LANGUAGES` config + add LMS throttle env vars

**Files:**
- Modify: `quizonline-server/config/settings_base.py`

- [ ] **Step 1: Check current PARLER_LANGUAGES**

Run: `grep -n "PARLER" quizonline-server/config/settings_base.py`

If `PARLER_LANGUAGES` is absent or incomplete, add this block right after the `LANGUAGES = (...)` declaration:

```python
PARLER_LANGUAGES = {
    None: (
        {"code": "fr"},
        {"code": "en"},
        {"code": "nl"},
        {"code": "it"},
        {"code": "es"},
    ),
    "default": {
        "fallback": "fr",
        "hide_untranslated": False,
    },
}
```

- [ ] **Step 2: Add three LMS throttle env vars in the `env = environ.Env(...)` constructor**

Locate the `env = environ.Env(...)` call (around line 11-75). Add these three lines next to the other `THROTTLE_*` entries:

```python
    THROTTLE_LMS_ENROLL=(str, "20/min"),
    THROTTLE_LMS_BLOCK_WRITE=(str, "120/min"),
    THROTTLE_LMS_CERT_VERIFY=(str, "60/min"),
```

- [ ] **Step 3: Register them in `DEFAULT_THROTTLE_RATES`**

Locate the `"DEFAULT_THROTTLE_RATES": { ... }` dict (around line 211-224). Add three entries:

```python
        "lms_enroll": env("THROTTLE_LMS_ENROLL"),
        "lms_block_write": env("THROTTLE_LMS_BLOCK_WRITE"),
        "lms_cert_verify": env("THROTTLE_LMS_CERT_VERIFY"),
```

- [ ] **Step 4: Update `.env.example`**

`quizonline-server/.env.example` — append:

```
# LMS throttles
THROTTLE_LMS_ENROLL=20/min
THROTTLE_LMS_BLOCK_WRITE=120/min
THROTTLE_LMS_CERT_VERIFY=60/min
```

- [ ] **Step 5: Update `deploy/env.production.example`**

Append the same three lines under a `# LMS throttles` comment.

- [ ] **Step 6: Run Django check**

Run: `cd quizonline-server && python manage.py check`
Expected: no issues.

- [ ] **Step 7: Commit**

```bash
git add quizonline-server/config/settings_base.py quizonline-server/.env.example deploy/env.production.example
git commit -m "feat(lms): parler 5 langs + LMS throttle scopes (env-overridable, SSM-seedable)"
```

---

### Task 6: Wire `/api/lms/` in `config/api_urls.py`

**Files:**
- Modify: `quizonline-server/config/api_urls.py`
- Create: `quizonline-server/lms_catalog/api_urls.py`
- Create: `quizonline-server/lms_assessment/api_urls.py`
- Create: `quizonline-server/lms_enrollment/api_urls.py`

- [ ] **Step 1: Create empty url modules**

Each of the three new `api_urls.py` should start as:

```python
from django.urls import path

app_name = "lms_catalog-api"  # adjust per app

urlpatterns = [
    # Populated in Phase 9.
]
```

- [ ] **Step 2: Add the include block in `config/api_urls.py`**

After the existing `path("translate/", ...)` line, add:

```python
    path("lms/", include([
        path("", include(("lms_catalog.api_urls", "lms_catalog"), namespace="lms-catalog-api")),
        path("", include(("lms_assessment.api_urls", "lms_assessment"), namespace="lms-assessment-api")),
        path("", include(("lms_enrollment.api_urls", "lms_enrollment"), namespace="lms-enrollment-api")),
    ])),
```

- [ ] **Step 3: Verify**

Run: `cd quizonline-server && python manage.py check`
Expected: no issues. (No URL is registered yet — empty `urlpatterns` is fine.)

- [ ] **Step 4: Commit**

```bash
git add quizonline-server/config/api_urls.py quizonline-server/lms_catalog/api_urls.py quizonline-server/lms_assessment/api_urls.py quizonline-server/lms_enrollment/api_urls.py
git commit -m "feat(lms): wire /api/lms/ namespace and per-app url modules"
```

---

## Phase 2 — Catalog models and admin

### Task 7: `Course` model (TDD)

**Files:**
- Modify: `quizonline-server/lms_catalog/models.py`
- Create: `quizonline-server/lms_catalog/tests/test_models_course.py`

- [ ] **Step 1: Write the failing tests**

`quizonline-server/lms_catalog/tests/test_models_course.py`:

```python
import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from customuser.models import CustomUser
from domain.models import Domain
from language.models import Language
from lms_catalog.models import Course


@pytest.fixture
def fr_lang(db):
    return Language.objects.create(code="fr", name="French")


@pytest.fixture
def en_lang(db):
    return Language.objects.create(code="en", name="English")


@pytest.fixture
def owner(db):
    return CustomUser.objects.create_user(username="owner", email="owner@example.com", password="x")


@pytest.fixture
def domain(db, owner, fr_lang):
    d = Domain.objects.create(owner=owner)
    d.set_current_language("fr")
    d.name = "Test Domain"
    d.save()
    d.allowed_languages.add(fr_lang)
    return d


@pytest.mark.django_db
def test_course_create_with_valid_language(domain, fr_lang):
    course = Course(
        domain=domain,
        slug="intro-python",
        language=fr_lang,
        level=Course.LEVEL_BEGINNER,
        enrollment_mode=Course.ENROLL_OPEN,
    )
    course.set_current_language("fr")
    course.title = "Introduction au Python"
    course.full_clean()
    course.save()
    assert course.pk is not None


@pytest.mark.django_db
def test_course_rejects_language_outside_domain_allowed(domain, en_lang):
    # en_lang is NOT in domain.allowed_languages
    course = Course(
        domain=domain,
        slug="intro-python",
        language=en_lang,
        level=Course.LEVEL_BEGINNER,
        enrollment_mode=Course.ENROLL_OPEN,
    )
    course.set_current_language("fr")
    course.title = "X"
    with pytest.raises(ValidationError) as exc:
        course.full_clean()
    assert "language" in exc.value.message_dict


@pytest.mark.django_db
def test_course_publish_requires_published_at(domain, fr_lang):
    course = Course(
        domain=domain,
        slug="x",
        language=fr_lang,
        is_published=True,
        published_at=None,
    )
    course.set_current_language("fr")
    course.title = "X"
    with pytest.raises(ValidationError):
        course.full_clean()


@pytest.mark.django_db
def test_course_rejects_when_domain_has_no_allowed_languages(owner, fr_lang):
    bare = Domain.objects.create(owner=owner)  # no allowed_languages
    bare.set_current_language("fr")
    bare.name = "Bare"
    bare.save()
    course = Course(domain=bare, slug="x", language=fr_lang)
    course.set_current_language("fr")
    course.title = "X"
    with pytest.raises(ValidationError):
        course.full_clean()
```

- [ ] **Step 2: Run the tests — they must fail**

Run: `cd quizonline-server && pytest lms_catalog/tests/test_models_course.py -v`
Expected: ImportError or ModuleNotFoundError on `from lms_catalog.models import Course` (Course not defined yet).

- [ ] **Step 3: Implement `Course` model**

`quizonline-server/lms_catalog/models.py`:

```python
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _
from parler.models import TranslatableModel, TranslatedFields

from config.models import AuditMixin


class Course(AuditMixin, TranslatableModel):
    LEVEL_BEGINNER = "beginner"
    LEVEL_INTERMEDIATE = "intermediate"
    LEVEL_ADVANCED = "advanced"
    LEVEL_CHOICES = [
        (LEVEL_BEGINNER, _("Beginner")),
        (LEVEL_INTERMEDIATE, _("Intermediate")),
        (LEVEL_ADVANCED, _("Advanced")),
    ]

    ENROLL_OPEN = "open"
    ENROLL_APPROVAL = "approval"
    ENROLL_INVITE = "invite"
    ENROLLMENT_MODE_CHOICES = [
        (ENROLL_OPEN, _("Open enrollment")),
        (ENROLL_APPROVAL, _("Requires approval")),
        (ENROLL_INVITE, _("Invite-only")),
    ]

    domain = models.ForeignKey(
        "domain.Domain", on_delete=models.PROTECT, related_name="courses",
    )
    slug = models.SlugField(max_length=220, unique=True)
    cover_image = models.ImageField(upload_to="lms/covers/", blank=True, null=True)
    level = models.CharField(max_length=16, choices=LEVEL_CHOICES, default=LEVEL_BEGINNER)
    language = models.ForeignKey(
        "language.Language", on_delete=models.PROTECT, related_name="courses",
        help_text=_("Primary language of the course."),
    )
    estimated_duration = models.PositiveIntegerField(
        default=0, help_text=_("Total expected duration in minutes."),
    )
    enrollment_mode = models.CharField(
        max_length=16, choices=ENROLLMENT_MODE_CHOICES, default=ENROLL_OPEN,
    )
    is_published = models.BooleanField(default=False, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    translations = TranslatedFields(
        title=models.CharField(_("title"), max_length=200),
        description=models.TextField(_("description"), blank=True),
        learning_objectives=models.TextField(_("learning objectives"), blank=True),
    )

    class Meta:
        ordering = ["-published_at", "-created_at"]
        indexes = [
            models.Index(fields=["domain", "is_published"]),
            models.Index(fields=["slug"]),
        ]

    def __str__(self) -> str:
        return self.safe_translation_getter("title", any_language=True) or f"Course #{self.pk}"

    def clean(self) -> None:
        super().clean()
        if self.is_published and not self.published_at:
            raise ValidationError(_("Published courses must have published_at set."))
        if self.domain_id and self.language_id:
            allowed_ids = set(self.domain.allowed_languages.values_list("id", flat=True))
            if not allowed_ids:
                raise ValidationError(_("Configure allowed_languages on the domain before creating courses."))
            if self.language_id not in allowed_ids:
                raise ValidationError({
                    "language": _("Course primary language must be one of the domain's allowed languages."),
                })
```

- [ ] **Step 4: Generate migration**

Run: `cd quizonline-server && python manage.py makemigrations lms_catalog`
Expected: creates `lms_catalog/migrations/0001_initial.py` with `Course` and `CourseTranslation`.

- [ ] **Step 5: Run the tests — they must pass**

Run: `cd quizonline-server && pytest lms_catalog/tests/test_models_course.py -v`
Expected: 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add quizonline-server/lms_catalog/models.py quizonline-server/lms_catalog/migrations/ quizonline-server/lms_catalog/tests/test_models_course.py
git commit -m "feat(lms_catalog): Course model with parler i18n + domain-allowed-language constraint"
```

---

### Task 8: `Section` model (TDD)

**Files:**
- Modify: `quizonline-server/lms_catalog/models.py`
- Create: `quizonline-server/lms_catalog/tests/test_models_section.py`

- [ ] **Step 1: Write failing tests**

```python
import pytest
from django.db import IntegrityError
from lms_catalog.models import Section
# Reuse fixtures from conftest — see Step 3 of Task 7 for fixtures location.


@pytest.mark.django_db
def test_section_create_under_course(course):
    s = Section.objects.create(course=course, order=0, is_published=False)
    s.set_current_language("fr")
    s.title = "Module 1"
    s.save()
    assert s.pk is not None


@pytest.mark.django_db
def test_section_order_unique_per_course(course):
    Section.objects.create(course=course, order=0)
    with pytest.raises(IntegrityError):
        Section.objects.create(course=course, order=0)
```

Also create `quizonline-server/lms_catalog/tests/conftest.py` with fixtures shared by all `lms_catalog/tests/test_models_*.py`:

```python
import pytest
from customuser.models import CustomUser
from domain.models import Domain
from language.models import Language
from lms_catalog.models import Course


@pytest.fixture
def fr_lang(db):
    return Language.objects.create(code="fr", name="French")


@pytest.fixture
def owner(db):
    return CustomUser.objects.create_user(username="owner", email="owner@example.com", password="x")


@pytest.fixture
def domain(db, owner, fr_lang):
    d = Domain.objects.create(owner=owner)
    d.set_current_language("fr")
    d.name = "Test Domain"
    d.save()
    d.allowed_languages.add(fr_lang)
    return d


@pytest.fixture
def course(db, domain, fr_lang):
    c = Course(domain=domain, slug="c1", language=fr_lang, level=Course.LEVEL_BEGINNER)
    c.set_current_language("fr")
    c.title = "C1"
    c.save()
    return c
```

Remove the inline fixtures from `test_models_course.py` and import from conftest.

- [ ] **Step 2: Run tests — they must fail (no Section model)**

Run: `cd quizonline-server && pytest lms_catalog/tests/test_models_section.py -v`

- [ ] **Step 3: Implement `Section` model — append to `lms_catalog/models.py`**

```python
class Section(TranslatableModel):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="sections")
    order = models.PositiveIntegerField(default=0, db_index=True)
    is_published = models.BooleanField(default=False)

    translations = TranslatedFields(
        title=models.CharField(_("title"), max_length=200),
        description=models.TextField(_("description"), blank=True),
    )

    class Meta:
        ordering = ["course", "order"]
        constraints = [
            models.UniqueConstraint(fields=["course", "order"], name="uniq_section_order_per_course"),
        ]

    def __str__(self) -> str:
        return self.safe_translation_getter("title", any_language=True) or f"Section #{self.pk}"
```

- [ ] **Step 4: Generate migration**

Run: `cd quizonline-server && python manage.py makemigrations lms_catalog`

- [ ] **Step 5: Run tests — they must pass**

Run: `cd quizonline-server && pytest lms_catalog/tests/test_models_section.py -v`

- [ ] **Step 6: Commit**

```bash
git add quizonline-server/lms_catalog/
git commit -m "feat(lms_catalog): Section model with uniq order per course"
```

---

### Task 9: `Lesson` model (TDD)

**Files:**
- Modify: `quizonline-server/lms_catalog/models.py`
- Create: `quizonline-server/lms_catalog/tests/test_models_lesson.py`

- [ ] **Step 1: Write failing tests**

```python
import pytest
from django.db import IntegrityError
from lms_catalog.models import Lesson, Section


@pytest.fixture
def section(db, course):
    return Section.objects.create(course=course, order=0)


@pytest.mark.django_db
def test_lesson_create_under_section(section):
    l = Lesson(section=section, slug="intro", order=0, estimated_duration=15)
    l.set_current_language("fr")
    l.title = "Introduction"
    l.save()
    assert l.pk is not None


@pytest.mark.django_db
def test_lesson_slug_unique_per_section(section):
    Lesson.objects.create(section=section, slug="intro", order=0)
    with pytest.raises(IntegrityError):
        Lesson.objects.create(section=section, slug="intro", order=1)


@pytest.mark.django_db
def test_lesson_order_unique_per_section(section):
    Lesson.objects.create(section=section, slug="a", order=0)
    with pytest.raises(IntegrityError):
        Lesson.objects.create(section=section, slug="b", order=0)
```

- [ ] **Step 2: Run — must fail**

- [ ] **Step 3: Append `Lesson` model**

```python
class Lesson(TranslatableModel):
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name="lessons")
    slug = models.SlugField(max_length=220)
    order = models.PositiveIntegerField(default=0, db_index=True)
    is_preview = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False)
    estimated_duration = models.PositiveIntegerField(default=0)

    translations = TranslatedFields(
        title=models.CharField(_("title"), max_length=200),
        short_description=models.TextField(_("short description"), blank=True),
    )

    class Meta:
        ordering = ["section", "order"]
        constraints = [
            models.UniqueConstraint(fields=["section", "slug"], name="uniq_lesson_slug_per_section"),
            models.UniqueConstraint(fields=["section", "order"], name="uniq_lesson_order_per_section"),
        ]

    def __str__(self) -> str:
        return self.safe_translation_getter("title", any_language=True) or f"Lesson #{self.pk}"
```

- [ ] **Step 4: makemigrations + run tests**

Run: `cd quizonline-server && python manage.py makemigrations lms_catalog && pytest lms_catalog/tests/test_models_lesson.py -v`

- [ ] **Step 5: Commit**

```bash
git add quizonline-server/lms_catalog/
git commit -m "feat(lms_catalog): Lesson model with uniq slug+order per section"
```

---

### Task 10: `ContentBlock` model with per-type `.clean()` validation (TDD)

**Files:**
- Modify: `quizonline-server/lms_catalog/models.py`
- Create: `quizonline-server/lms_catalog/tests/test_models_block.py`

- [ ] **Step 1: Write failing tests — 8 happy paths + 8 failures + cross-domain quiz_template check**

```python
import pytest
from django.core.exceptions import ValidationError
from quiz.models import QuizTemplate

from lms_catalog.models import ContentBlock, Lesson, Section


@pytest.fixture
def lesson(db, course):
    s = Section.objects.create(course=course, order=0)
    return Lesson.objects.create(section=s, slug="l1", order=0)


@pytest.fixture
def quiz_template(db, domain, owner):
    qt = QuizTemplate(domain=domain, title="Q1", created_by=owner)
    qt.save()
    return qt


def _block(lesson, block_type, **kwargs):
    b = ContentBlock(lesson=lesson, block_type=block_type, order=0, **kwargs)
    b.set_current_language("fr")
    return b


@pytest.mark.django_db
def test_block_rich_text_valid(lesson):
    b = _block(lesson, ContentBlock.TYPE_RICH_TEXT)
    b.rich_text = "<p>Hello</p>"
    b.full_clean()


@pytest.mark.django_db
def test_block_rich_text_missing_text_raises(lesson):
    b = _block(lesson, ContentBlock.TYPE_RICH_TEXT)
    with pytest.raises(ValidationError):
        b.full_clean()


@pytest.mark.django_db
def test_block_image_requires_image(lesson):
    b = _block(lesson, ContentBlock.TYPE_IMAGE)
    with pytest.raises(ValidationError):
        b.full_clean()


@pytest.mark.django_db
def test_block_video_requires_url_and_provider(lesson):
    b = _block(lesson, ContentBlock.TYPE_VIDEO, video_url="https://youtu.be/x")
    with pytest.raises(ValidationError):
        b.full_clean()  # provider missing
    b.video_provider = "youtube"
    b.full_clean()  # now ok


@pytest.mark.django_db
def test_block_file_requires_file(lesson):
    b = _block(lesson, ContentBlock.TYPE_FILE)
    with pytest.raises(ValidationError):
        b.full_clean()


@pytest.mark.django_db
def test_block_quiz_requires_template(lesson):
    b = _block(lesson, ContentBlock.TYPE_QUIZ)
    with pytest.raises(ValidationError):
        b.full_clean()


@pytest.mark.django_db
def test_block_quiz_template_domain_must_match(lesson, owner, fr_lang):
    from domain.models import Domain
    other = Domain.objects.create(owner=owner)
    other.set_current_language("fr"); other.name = "Other"; other.save()
    other.allowed_languages.add(fr_lang)
    qt = QuizTemplate(domain=other, title="QT", created_by=owner); qt.save()
    b = _block(lesson, ContentBlock.TYPE_QUIZ, quiz_template=qt)
    with pytest.raises(ValidationError):
        b.full_clean()


@pytest.mark.django_db
def test_block_callout_requires_text(lesson):
    b = _block(lesson, ContentBlock.TYPE_CALLOUT)
    with pytest.raises(ValidationError):
        b.full_clean()
    b.callout_text = "Note"
    b.full_clean()


@pytest.mark.django_db
def test_block_code_requires_content(lesson):
    b = _block(lesson, ContentBlock.TYPE_CODE)
    with pytest.raises(ValidationError):
        b.full_clean()
    b.code_content = "print('hi')"
    b.full_clean()


@pytest.mark.django_db
def test_block_embed_requires_external_url(lesson):
    b = _block(lesson, ContentBlock.TYPE_EMBED)
    with pytest.raises(ValidationError):
        b.full_clean()
    b.external_url = "https://example.com/x"
    b.full_clean()


@pytest.mark.django_db
def test_block_order_unique_per_lesson(lesson):
    b1 = _block(lesson, ContentBlock.TYPE_CODE, code_content="a")
    b1.save()
    from django.db import IntegrityError
    with pytest.raises(IntegrityError):
        ContentBlock.objects.create(lesson=lesson, block_type=ContentBlock.TYPE_CODE, order=0, code_content="b")
```

- [ ] **Step 2: Run — must fail (model not defined)**

- [ ] **Step 3: Append `ContentBlock` model**

```python
class ContentBlock(TranslatableModel):
    TYPE_RICH_TEXT = "rich_text"
    TYPE_IMAGE = "image"
    TYPE_VIDEO = "video"
    TYPE_FILE = "file"
    TYPE_QUIZ = "quiz"
    TYPE_CALLOUT = "callout"
    TYPE_CODE = "code"
    TYPE_EMBED = "embed"
    TYPE_CHOICES = [
        (TYPE_RICH_TEXT, _("Rich text")),
        (TYPE_IMAGE, _("Image")),
        (TYPE_VIDEO, _("Video")),
        (TYPE_FILE, _("File")),
        (TYPE_QUIZ, _("Quiz")),
        (TYPE_CALLOUT, _("Callout")),
        (TYPE_CODE, _("Code")),
        (TYPE_EMBED, _("Embed")),
    ]
    VIDEO_PROVIDER_CHOICES = [
        ("youtube", "YouTube"),
        ("vimeo", "Vimeo"),
        ("upload", _("Self-hosted")),
    ]

    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="blocks")
    block_type = models.CharField(max_length=16, choices=TYPE_CHOICES)
    order = models.PositiveIntegerField(default=0, db_index=True)
    is_required = models.BooleanField(default=False)

    image = models.ImageField(upload_to="lms/blocks/img/", blank=True, null=True)
    video_url = models.URLField(blank=True)
    video_provider = models.CharField(max_length=16, choices=VIDEO_PROVIDER_CHOICES, blank=True)
    file = models.FileField(upload_to="lms/blocks/file/", blank=True, null=True)
    external_url = models.URLField(blank=True)
    code_language = models.CharField(max_length=32, blank=True)
    code_content = models.TextField(blank=True)
    quiz_template = models.ForeignKey(
        "quiz.QuizTemplate", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="content_blocks",
    )
    metadata = models.JSONField(default=dict, blank=True)

    translations = TranslatedFields(
        title=models.CharField(_("title"), max_length=200, blank=True),
        rich_text=models.TextField(_("rich text"), blank=True),
        callout_text=models.TextField(_("callout text"), blank=True),
    )

    class Meta:
        ordering = ["lesson", "order"]
        constraints = [
            models.UniqueConstraint(fields=["lesson", "order"], name="uniq_block_order_per_lesson"),
        ]

    def clean(self) -> None:
        super().clean()
        validators = {
            self.TYPE_RICH_TEXT: lambda: bool(self.safe_translation_getter("rich_text", any_language=True)),
            self.TYPE_IMAGE: lambda: bool(self.image),
            self.TYPE_VIDEO: lambda: bool(self.video_url) and bool(self.video_provider),
            self.TYPE_FILE: lambda: bool(self.file),
            self.TYPE_QUIZ: lambda: self.quiz_template_id is not None,
            self.TYPE_CALLOUT: lambda: bool(self.safe_translation_getter("callout_text", any_language=True)),
            self.TYPE_CODE: lambda: bool(self.code_content),
            self.TYPE_EMBED: lambda: bool(self.external_url),
        }
        check = validators.get(self.block_type)
        if check and not check():
            raise ValidationError({
                "block_type": _("ContentBlock of type %(t)s is missing its required payload.") % {"t": self.block_type},
            })
        if self.block_type == self.TYPE_QUIZ and self.quiz_template_id and self.lesson_id:
            course_domain_id = self.lesson.section.course.domain_id
            if self.quiz_template.domain_id != course_domain_id:
                raise ValidationError({
                    "quiz_template": _("Quiz must belong to the same domain as the course."),
                })
```

- [ ] **Step 4: makemigrations + run tests**

Run: `cd quizonline-server && python manage.py makemigrations lms_catalog && pytest lms_catalog/tests/test_models_block.py -v`
Expected: all 11 tests pass.

- [ ] **Step 5: Commit**

```bash
git add quizonline-server/lms_catalog/
git commit -m "feat(lms_catalog): ContentBlock with per-type .clean() validation + cross-domain quiz guard"
```

---

### Task 11: `CourseQuerySet.visible_to(user)` + `LessonQuerySet.visible_to(user)`

**Files:**
- Create: `quizonline-server/lms_catalog/querysets.py`
- Modify: `quizonline-server/lms_catalog/models.py` (attach `objects` manager)
- Create: `quizonline-server/lms_catalog/tests/test_querysets.py`

- [ ] **Step 1: Write failing tests**

```python
import pytest
from lms_catalog.models import Course, Lesson, Section


@pytest.mark.django_db
def test_visible_to_anonymous_returns_empty(course):
    from django.contrib.auth.models import AnonymousUser
    assert Course.objects.visible_to(AnonymousUser()).count() == 0


@pytest.mark.django_db
def test_visible_to_member_only_sees_published(domain, course, fr_lang):
    from customuser.models import CustomUser
    learner = CustomUser.objects.create_user(username="learner", email="l@x.com", password="x")
    domain.members.add(learner)
    # Unpublished course → not visible
    assert Course.objects.visible_to(learner).count() == 0
    # Publish it
    from django.utils import timezone
    course.is_published = True
    course.published_at = timezone.now()
    course.save()
    assert Course.objects.visible_to(learner).count() == 1


@pytest.mark.django_db
def test_visible_to_owner_sees_unpublished(domain, course, owner):
    # owner has not been added as a member but is the domain owner
    assert Course.objects.visible_to(owner).filter(pk=course.pk).exists()


@pytest.mark.django_db
def test_visible_to_superuser_sees_all(course):
    from customuser.models import CustomUser
    su = CustomUser.objects.create_superuser(username="su", email="su@x.com", password="x")
    assert Course.objects.visible_to(su).count() == 1
```

- [ ] **Step 2: Run — must fail (`.visible_to` not defined)**

- [ ] **Step 3: Create `lms_catalog/querysets.py`**

```python
from django.db import models
from django.db.models import Q

from config.permissions import is_authenticated_user, is_django_admin


class CourseQuerySet(models.QuerySet):
    def visible_to(self, user):
        if not is_authenticated_user(user):
            return self.none()
        if is_django_admin(user):
            return self.all()
        managed = Q(domain__owner=user) | Q(domain__managers=user)
        member = Q(domain__members=user) | Q(domain__owner=user) | Q(domain__managers=user)
        return self.filter(managed | (member & Q(is_published=True))).distinct()


class SectionQuerySet(models.QuerySet):
    def visible_to(self, user):
        from .models import Course
        visible_courses = Course.objects.visible_to(user).values("id")
        return self.filter(course_id__in=visible_courses)


class LessonQuerySet(models.QuerySet):
    def visible_to(self, user):
        from .models import Course
        if not is_authenticated_user(user):
            return self.none()
        visible_courses = Course.objects.visible_to(user).values("id")
        qs = self.filter(section__course_id__in=visible_courses)
        if is_django_admin(user):
            return qs
        # learners: only published OR preview
        return qs.filter(Q(is_published=True) | Q(is_preview=True))


class ContentBlockQuerySet(models.QuerySet):
    def visible_to(self, user):
        from .models import Lesson
        visible_lessons = Lesson.objects.visible_to(user).values("id")
        return self.filter(lesson_id__in=visible_lessons)
```

- [ ] **Step 4: Attach the querysets to the models (top of `models.py` imports)**

```python
from parler.managers import TranslatableManager
from .querysets import CourseQuerySet, SectionQuerySet, LessonQuerySet, ContentBlockQuerySet
```

Inside each model, add an `objects` manager:

```python
class Course(...):
    ...
    objects = TranslatableManager.from_queryset(CourseQuerySet)()


class Section(...):
    ...
    objects = TranslatableManager.from_queryset(SectionQuerySet)()


class Lesson(...):
    ...
    objects = TranslatableManager.from_queryset(LessonQuerySet)()


class ContentBlock(...):
    ...
    objects = TranslatableManager.from_queryset(ContentBlockQuerySet)()
```

- [ ] **Step 5: Run tests**

Run: `cd quizonline-server && pytest lms_catalog/tests/test_querysets.py -v`
Expected: 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add quizonline-server/lms_catalog/
git commit -m "feat(lms_catalog): querysets.visible_to for Course/Section/Lesson/ContentBlock"
```

---

### Task 12: Apply migration locally + smoke check admin

**Files:** none — runtime check.

- [ ] **Step 1: Apply migrations on the dev DB**

Run: `cd quizonline-server && python manage.py migrate lms_catalog`
Expected: applies the initial migration without errors.

- [ ] **Step 2: Smoke-check admin loads**

Run: `cd quizonline-server && python manage.py runserver` (then `Ctrl+C` after confirming `/admin/` does not crash).
Or run: `python manage.py check`

- [ ] **Step 3: Commit any committed migration file changes**

(If `makemigrations` produced multiple files, ensure all are committed.)

```bash
git add quizonline-server/lms_catalog/migrations/
git status   # should be clean apart from this
```

If there is nothing new, skip the commit.

---

### Task 13: Admin classes for `lms_catalog`

**Files:**
- Modify: `quizonline-server/lms_catalog/admin.py`

- [ ] **Step 1: Write the admin**

```python
from django.contrib import admin
from parler.admin import (
    TranslatableAdmin,
    TranslatableStackedInline,
    TranslatableTabularInline,
)

from .models import Course, Section, Lesson, ContentBlock


class ContentBlockInline(TranslatableStackedInline):
    model = ContentBlock
    extra = 0
    ordering = ("order",)
    fieldsets = (
        (None, {"fields": ("block_type", "order", "is_required", "title", "metadata")}),
        ("Rich text", {"fields": ("rich_text",), "classes": ("collapse",)}),
        ("Image", {"fields": ("image",), "classes": ("collapse",)}),
        ("Video", {"fields": ("video_url", "video_provider"), "classes": ("collapse",)}),
        ("File", {"fields": ("file",), "classes": ("collapse",)}),
        ("Quiz", {"fields": ("quiz_template",), "classes": ("collapse",)}),
        ("Callout", {"fields": ("callout_text",), "classes": ("collapse",)}),
        ("Code", {"fields": ("code_language", "code_content"), "classes": ("collapse",)}),
        ("Embed", {"fields": ("external_url",), "classes": ("collapse",)}),
    )


class LessonInline(TranslatableTabularInline):
    model = Lesson
    extra = 0
    ordering = ("order",)
    fields = ("order", "title", "slug", "is_preview", "is_published", "estimated_duration")
    show_change_link = True


class SectionInline(TranslatableTabularInline):
    model = Section
    extra = 0
    ordering = ("order",)
    fields = ("order", "title", "is_published")
    show_change_link = True


@admin.register(Course)
class CourseAdmin(TranslatableAdmin):
    list_display = ("id", "__str__", "domain", "level", "language", "is_published", "published_at", "updated_at")
    list_filter = ("is_published", "level", "domain", "language", "enrollment_mode")
    search_fields = ("translations__title", "translations__description", "slug")
    list_select_related = ("domain", "language")
    autocomplete_fields = ("domain", "language", "created_by", "updated_by")
    readonly_fields = ("created_at", "updated_at", "created_by", "updated_by", "published_at")
    inlines = [SectionInline]
    fieldsets = (
        (None, {"fields": ("domain", "slug", "language", "level", "enrollment_mode", "cover_image")}),
        ("Translations", {"fields": ("title", "description", "learning_objectives")}),
        ("Status", {"fields": ("is_published", "published_at", "estimated_duration")}),
        ("Audit", {"fields": ("created_at", "created_by", "updated_at", "updated_by"), "classes": ("collapse",)}),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Section)
class SectionAdmin(TranslatableAdmin):
    list_display = ("id", "course", "order", "__str__", "is_published")
    list_filter = ("is_published", "course__domain")
    list_select_related = ("course",)
    autocomplete_fields = ("course",)
    inlines = [LessonInline]
    ordering = ("course", "order")


@admin.register(Lesson)
class LessonAdmin(TranslatableAdmin):
    list_display = ("id", "section", "order", "__str__", "is_preview", "is_published")
    list_filter = ("is_published", "is_preview", "section__course__domain")
    search_fields = ("translations__title", "slug")
    list_select_related = ("section", "section__course")
    autocomplete_fields = ("section",)
    inlines = [ContentBlockInline]
    ordering = ("section", "order")
```

- [ ] **Step 2: Smoke check admin URLs do not raise**

Run: `cd quizonline-server && python manage.py check`

- [ ] **Step 3: Commit**

```bash
git add quizonline-server/lms_catalog/admin.py
git commit -m "feat(lms_catalog): admin with Course/Section/Lesson + nested inlines"
```

---

## Phase 3 — Assessment model and admin

### Task 14: `LessonQuiz` model with CheckConstraint (TDD)

**Files:**
- Modify: `quizonline-server/lms_assessment/models.py`
- Create: `quizonline-server/lms_assessment/tests/test_models.py`
- Create: `quizonline-server/lms_assessment/tests/conftest.py`

- [ ] **Step 1: Write failing tests**

`conftest.py` mirrors the catalog conftest plus fixtures for `lesson` and `quiz_template` (copy from Task 10 conftest). Then `test_models.py`:

```python
import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from lms_assessment.models import LessonQuiz


@pytest.mark.django_db
def test_lessonquiz_must_have_exactly_one_target(lesson, course, quiz_template):
    # Both set → fail
    lq = LessonQuiz(lesson=lesson, course=course, quiz_template=quiz_template)
    with pytest.raises((ValidationError, IntegrityError)):
        lq.full_clean()
        lq.save()


@pytest.mark.django_db
def test_lessonquiz_lesson_bound_ok(lesson, quiz_template):
    lq = LessonQuiz(lesson=lesson, quiz_template=quiz_template, required_score_percent=70)
    lq.full_clean()
    lq.save()
    assert lq.pk is not None


@pytest.mark.django_db
def test_lessonquiz_course_bound_ok(course, quiz_template):
    lq = LessonQuiz(course=course, quiz_template=quiz_template, required_score_percent=80)
    lq.full_clean()
    lq.save()
    assert lq.pk is not None


@pytest.mark.django_db
def test_lessonquiz_quiz_template_domain_must_match(lesson, owner, fr_lang):
    from domain.models import Domain
    from quiz.models import QuizTemplate
    other = Domain.objects.create(owner=owner)
    other.set_current_language("fr"); other.name = "X"; other.save()
    other.allowed_languages.add(fr_lang)
    other_qt = QuizTemplate(domain=other, title="OT", created_by=owner); other_qt.save()

    lq = LessonQuiz(lesson=lesson, quiz_template=other_qt)
    with pytest.raises(ValidationError):
        lq.full_clean()
```

- [ ] **Step 2: Run — must fail**

- [ ] **Step 3: Implement `LessonQuiz`**

`quizonline-server/lms_assessment/models.py`:

```python
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils.translation import gettext_lazy as _


class LessonQuiz(models.Model):
    lesson = models.OneToOneField(
        "lms_catalog.Lesson", on_delete=models.CASCADE,
        related_name="validation_quiz", null=True, blank=True,
    )
    course = models.OneToOneField(
        "lms_catalog.Course", on_delete=models.CASCADE,
        related_name="final_quiz", null=True, blank=True,
    )
    quiz_template = models.ForeignKey(
        "quiz.QuizTemplate", on_delete=models.PROTECT, related_name="lesson_validations",
    )
    required_score_percent = models.PositiveSmallIntegerField(default=70)
    is_required = models.BooleanField(default=True)
    max_attempts = models.PositiveIntegerField(default=0, help_text=_("0 = unlimited."))
    unlock_next_lesson_on_success = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(
                    Q(lesson__isnull=False, course__isnull=True)
                    | Q(lesson__isnull=True, course__isnull=False)
                ),
                name="lessonquiz_exactly_one_target",
            ),
        ]

    def __str__(self) -> str:
        return f"LessonQuiz<lesson={self.lesson_id}, course={self.course_id}>"

    def clean(self) -> None:
        super().clean()
        has_lesson = bool(self.lesson_id)
        has_course = bool(self.course_id)
        if has_lesson == has_course:
            raise ValidationError(_("LessonQuiz must reference either a lesson or a course (exactly one)."))
        if has_lesson:
            target_domain_id = self.lesson.section.course.domain_id
        else:
            target_domain_id = self.course.domain_id
        if self.quiz_template_id and self.quiz_template.domain_id != target_domain_id:
            raise ValidationError({
                "quiz_template": _("Quiz must belong to the same domain as the target."),
            })
```

- [ ] **Step 4: makemigrations + tests**

Run: `cd quizonline-server && python manage.py makemigrations lms_assessment && pytest lms_assessment/tests/test_models.py -v`

- [ ] **Step 5: Commit**

```bash
git add quizonline-server/lms_assessment/
git commit -m "feat(lms_assessment): LessonQuiz model with exactly-one-target check + domain match"
```

---

### Task 15: Admin for `LessonQuiz`

**Files:**
- Modify: `quizonline-server/lms_assessment/admin.py`

- [ ] **Step 1: Write admin**

```python
from django.contrib import admin

from .models import LessonQuiz


@admin.register(LessonQuiz)
class LessonQuizAdmin(admin.ModelAdmin):
    list_display = ("id", "target_display", "quiz_template", "required_score_percent", "is_required", "max_attempts")
    list_filter = ("is_required", "lesson__section__course__domain")
    autocomplete_fields = ("lesson", "course", "quiz_template")

    @admin.display(description="Target")
    def target_display(self, obj):
        if obj.lesson_id:
            return f"Lesson:{obj.lesson_id}"
        return f"Course:{obj.course_id} (final)"
```

- [ ] **Step 2: Check + commit**

Run: `python manage.py check`
```bash
git add quizonline-server/lms_assessment/admin.py
git commit -m "feat(lms_assessment): admin for LessonQuiz"
```

---

## Phase 4 — Enrollment models and admin

### Task 16: `CourseEnrollment` + `LessonProgress` + `CourseProgress` models (TDD)

**Files:**
- Modify: `quizonline-server/lms_enrollment/models.py`
- Create: `quizonline-server/lms_enrollment/tests/test_models.py`
- Create: `quizonline-server/lms_enrollment/tests/conftest.py` (mirrors prior conftests)

- [ ] **Step 1: Write failing tests**

```python
import pytest
from django.db import IntegrityError

from lms_enrollment.models import CourseEnrollment, LessonProgress, CourseProgress


@pytest.mark.django_db
def test_enrollment_unique_per_user_course(course, learner):
    CourseEnrollment.objects.create(user=learner, course=course)
    with pytest.raises(IntegrityError):
        CourseEnrollment.objects.create(user=learner, course=course)


@pytest.mark.django_db
def test_lesson_progress_unique_per_user_lesson(lesson, learner):
    LessonProgress.objects.create(user=learner, lesson=lesson)
    with pytest.raises(IntegrityError):
        LessonProgress.objects.create(user=learner, lesson=lesson)


@pytest.mark.django_db
def test_course_progress_unique_per_user_course(course, learner):
    CourseProgress.objects.create(user=learner, course=course)
    with pytest.raises(IntegrityError):
        CourseProgress.objects.create(user=learner, course=course)
```

The `learner` fixture lives in `lms_enrollment/tests/conftest.py`:

```python
import pytest
from customuser.models import CustomUser


@pytest.fixture
def learner(db, domain):
    u = CustomUser.objects.create_user(username="learner", email="learner@x.com", password="x")
    domain.members.add(u)
    return u
```

(Plus the same `domain`, `course`, `lesson`, `fr_lang`, `owner` fixtures already defined in catalog/assessment conftests — copy or move to a top-level `quizonline-server/conftest.py` if you prefer DRY.)

- [ ] **Step 2: Run — must fail**

- [ ] **Step 3: Implement models**

```python
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from config.models import AuditMixin


class CourseEnrollment(AuditMixin, models.Model):
    STATUS_PENDING = "pending"
    STATUS_ACTIVE = "active"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_PENDING, _("Pending approval")),
        (STATUS_ACTIVE, _("Active")),
        (STATUS_COMPLETED, _("Completed")),
        (STATUS_CANCELLED, _("Cancelled")),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="course_enrollments")
    course = models.ForeignKey("lms_catalog.Course", on_delete=models.CASCADE, related_name="enrollments")
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "course"], name="uniq_enrollment_per_user_course"),
        ]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["course", "status"]),
        ]


class LessonProgress(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lesson_progress")
    lesson = models.ForeignKey("lms_catalog.Lesson", on_delete=models.CASCADE, related_name="user_progress")
    is_started = models.BooleanField(default=False)
    is_completed = models.BooleanField(default=False)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_seen_at = models.DateTimeField(auto_now=True)
    progress_percent = models.PositiveSmallIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "lesson"], name="uniq_progress_per_user_lesson"),
        ]
        indexes = [models.Index(fields=["user", "is_completed"])]


class CourseProgress(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="course_progress")
    course = models.ForeignKey("lms_catalog.Course", on_delete=models.CASCADE, related_name="user_progress")
    completed_lessons_count = models.PositiveIntegerField(default=0)
    total_lessons_count = models.PositiveIntegerField(default=0)
    progress_percent = models.PositiveSmallIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "course"], name="uniq_course_progress_per_user_course"),
        ]
```

- [ ] **Step 4: makemigrations + tests**

Run: `cd quizonline-server && python manage.py makemigrations lms_enrollment && pytest lms_enrollment/tests/test_models.py -v`

- [ ] **Step 5: Commit**

```bash
git add quizonline-server/lms_enrollment/
git commit -m "feat(lms_enrollment): CourseEnrollment, LessonProgress, CourseProgress models"
```

---

### Task 17: `CertificateSequence` + `Certificate` models (TDD)

**Files:**
- Modify: `quizonline-server/lms_enrollment/models.py`
- Create: `quizonline-server/lms_enrollment/tests/test_certificate.py`

- [ ] **Step 1: Write failing tests**

```python
import pytest

from lms_enrollment.models import Certificate, CertificateSequence


@pytest.mark.django_db
def test_certificate_sequence_increment():
    s1 = CertificateSequence.objects.create(year=2026, counter=0)
    s1.counter = 5
    s1.save()
    assert CertificateSequence.objects.get(year=2026).counter == 5


@pytest.mark.django_db
def test_two_active_certificates_same_user_course_forbidden(course, learner):
    Certificate.objects.create(
        user=learner, course=course,
        certificate_number="QO-2026-0001", verification_token="t1",
    )
    from django.db import IntegrityError
    with pytest.raises(IntegrityError):
        Certificate.objects.create(
            user=learner, course=course,
            certificate_number="QO-2026-0002", verification_token="t2",
        )


@pytest.mark.django_db
def test_revoked_certificate_allows_reissue(course, learner):
    from django.utils import timezone
    Certificate.objects.create(
        user=learner, course=course,
        certificate_number="QO-2026-0001", verification_token="t1",
        revoked_at=timezone.now(),
    )
    # Should not violate the partial unique constraint
    Certificate.objects.create(
        user=learner, course=course,
        certificate_number="QO-2026-0002", verification_token="t2",
    )
```

- [ ] **Step 2: Run — must fail**

- [ ] **Step 3: Append models**

```python
from django.db.models import Q


class CertificateSequence(models.Model):
    year = models.PositiveSmallIntegerField(primary_key=True)
    counter = models.PositiveIntegerField(default=0)


class Certificate(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="certificates")
    course = models.ForeignKey("lms_catalog.Course", on_delete=models.PROTECT, related_name="certificates")
    issued_at = models.DateTimeField(auto_now_add=True)
    certificate_number = models.CharField(max_length=32, unique=True)
    verification_token = models.CharField(max_length=64, unique=True, db_index=True)
    pdf = models.FileField(upload_to="lms/certificates/", blank=True, null=True)
    pdf_rendered_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoke_reason = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "course"],
                condition=Q(revoked_at__isnull=True),
                name="uniq_active_cert_per_user_course",
            ),
        ]

    def __str__(self) -> str:
        return self.certificate_number
```

- [ ] **Step 4: makemigrations + tests**

Run: `cd quizonline-server && python manage.py makemigrations lms_enrollment && pytest lms_enrollment/tests/test_certificate.py -v`

- [ ] **Step 5: Commit**

```bash
git add quizonline-server/lms_enrollment/
git commit -m "feat(lms_enrollment): Certificate + CertificateSequence with reissue-after-revoke"
```

---

### Task 18: Admin for enrollment / progress / certificate

**Files:**
- Modify: `quizonline-server/lms_enrollment/admin.py`

- [ ] **Step 1: Write admin**

```python
from django.contrib import admin

from .models import Certificate, CourseEnrollment, CourseProgress, LessonProgress


@admin.register(CourseEnrollment)
class CourseEnrollmentAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "course", "status", "enrolled_at", "completed_at")
    list_filter = ("status", "course__domain")
    search_fields = ("user__email", "user__username", "course__translations__title")
    list_select_related = ("user", "course")
    autocomplete_fields = ("user", "course")
    readonly_fields = ("enrolled_at", "completed_at", "created_by", "updated_by")


@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "lesson", "is_started", "is_completed", "progress_percent", "last_seen_at")
    list_filter = ("is_completed", "is_started", "lesson__section__course__domain")
    search_fields = ("user__email", "lesson__translations__title")
    list_select_related = ("user", "lesson")
    autocomplete_fields = ("user", "lesson")
    readonly_fields = ("started_at", "completed_at", "last_seen_at")


@admin.register(CourseProgress)
class CourseProgressAdmin(admin.ModelAdmin):
    list_display = ("user", "course", "progress_percent", "completed_lessons_count", "total_lessons_count", "updated_at")
    list_filter = ("course__domain",)
    list_select_related = ("user", "course")
    readonly_fields = ("updated_at",)


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ("certificate_number", "user", "course", "issued_at", "pdf_rendered_at", "revoked_at")
    list_filter = ("course__domain", "revoked_at")
    search_fields = ("certificate_number", "user__email")
    readonly_fields = ("certificate_number", "verification_token", "pdf", "pdf_rendered_at", "issued_at")
```

The `approve_selected`, `regenerate_pdf` and `revoke_selected` actions will be added once their services exist (Tasks 22 / 28).

- [ ] **Step 2: Commit**

```bash
git add quizonline-server/lms_enrollment/admin.py
git commit -m "feat(lms_enrollment): admin for enrollments, progress, certificates"
```

---

### Task 19: Apply all migrations + smoke check

- [ ] **Step 1: Apply**

Run: `cd quizonline-server && python manage.py migrate`
Expected: all three apps (`lms_catalog`, `lms_assessment`, `lms_enrollment`) apply cleanly.

- [ ] **Step 2: Run the full test suite so far**

Run: `cd quizonline-server && pytest lms_catalog lms_assessment lms_enrollment -v`
Expected: all tests pass (models + querysets).

- [ ] **Step 3: No commit needed** (nothing changed).

---

## Phase 5 — Services

### Task 20: `lms_catalog/services.py` — `allowed_lang_codes_for_course`, `publish_course`, `unpublish_course`

**Files:**
- Create: `quizonline-server/lms_catalog/services.py`
- Create: `quizonline-server/lms_catalog/tests/test_services_publish.py`

- [ ] **Step 1: Write failing tests**

```python
import pytest
from django.core.exceptions import ValidationError

from lms_catalog.models import Course, Section, Lesson
from lms_catalog.services import publish_course, unpublish_course, allowed_lang_codes_for_course


@pytest.mark.django_db
def test_allowed_lang_codes_returns_domain_languages(course, fr_lang):
    codes = allowed_lang_codes_for_course(course)
    assert codes == {"fr"}


@pytest.mark.django_db
def test_publish_course_rejects_empty_course(course, owner):
    with pytest.raises(ValidationError):
        publish_course(course=course, by_user=owner)


@pytest.mark.django_db
def test_publish_course_succeeds_with_published_content(course, owner):
    s = Section.objects.create(course=course, order=0, is_published=True)
    l = Lesson.objects.create(section=s, slug="l", order=0, is_published=True)
    out = publish_course(course=course, by_user=owner)
    assert out.is_published is True
    assert out.published_at is not None


@pytest.mark.django_db
def test_unpublish_course(course, owner):
    s = Section.objects.create(course=course, order=0, is_published=True)
    Lesson.objects.create(section=s, slug="l", order=0, is_published=True)
    publish_course(course=course, by_user=owner)
    unpublish_course(course=course, by_user=owner)
    course.refresh_from_db()
    assert course.is_published is False
```

- [ ] **Step 2: Run — must fail (no services module)**

- [ ] **Step 3: Implement**

`quizonline-server/lms_catalog/services.py`:

```python
from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .models import Course, Section, Lesson, ContentBlock


def allowed_lang_codes_for_course(course: Course) -> set[str]:
    codes = set(course.domain.allowed_languages.values_list("code", flat=True))
    return codes or {settings.LANGUAGE_CODE}


@transaction.atomic
def publish_course(*, course: Course, by_user) -> Course:
    has_content = Section.objects.filter(
        course=course, is_published=True, lessons__is_published=True,
    ).exists()
    if not has_content:
        raise ValidationError(_("Cannot publish a course with no published content."))
    course.is_published = True
    course.published_at = timezone.now()
    course.updated_by = by_user
    course.save(update_fields=["is_published", "published_at", "updated_by"])
    return course


@transaction.atomic
def unpublish_course(*, course: Course, by_user) -> Course:
    course.is_published = False
    course.updated_by = by_user
    course.save(update_fields=["is_published", "updated_by"])
    return course
```

- [ ] **Step 4: Run tests**

Run: `cd quizonline-server && pytest lms_catalog/tests/test_services_publish.py -v`

- [ ] **Step 5: Commit**

```bash
git add quizonline-server/lms_catalog/services.py quizonline-server/lms_catalog/tests/test_services_publish.py
git commit -m "feat(lms_catalog): publish_course / unpublish_course / allowed_lang_codes_for_course"
```

---

### Task 21: `reorder_blocks` + `reorder_sections` + `reorder_lessons`

**Files:**
- Modify: `quizonline-server/lms_catalog/services.py`
- Create: `quizonline-server/lms_catalog/tests/test_services_reorder.py`

- [ ] **Step 1: Write failing tests**

```python
import pytest

from lms_catalog.models import ContentBlock, Lesson, Section
from lms_catalog.services import reorder_blocks, reorder_sections, reorder_lessons


@pytest.mark.django_db
def test_reorder_blocks_swaps_two(lesson):
    a = ContentBlock.objects.create(lesson=lesson, block_type=ContentBlock.TYPE_CODE, code_content="A", order=0)
    b = ContentBlock.objects.create(lesson=lesson, block_type=ContentBlock.TYPE_CODE, code_content="B", order=1)
    reorder_blocks(lesson=lesson, block_ids_in_order=[b.id, a.id])
    a.refresh_from_db(); b.refresh_from_db()
    assert (a.order, b.order) == (1, 0)


@pytest.mark.django_db
def test_reorder_blocks_rejects_unknown_id(lesson):
    a = ContentBlock.objects.create(lesson=lesson, block_type=ContentBlock.TYPE_CODE, code_content="A", order=0)
    from django.core.exceptions import ValidationError
    with pytest.raises(ValidationError):
        reorder_blocks(lesson=lesson, block_ids_in_order=[a.id, 999999])


@pytest.mark.django_db
def test_reorder_sections(course):
    s1 = Section.objects.create(course=course, order=0)
    s2 = Section.objects.create(course=course, order=1)
    reorder_sections(course=course, section_ids_in_order=[s2.id, s1.id])
    s1.refresh_from_db(); s2.refresh_from_db()
    assert (s1.order, s2.order) == (1, 0)


@pytest.mark.django_db
def test_reorder_lessons(course):
    s = Section.objects.create(course=course, order=0)
    l1 = Lesson.objects.create(section=s, slug="a", order=0)
    l2 = Lesson.objects.create(section=s, slug="b", order=1)
    reorder_lessons(section=s, lesson_ids_in_order=[l2.id, l1.id])
    l1.refresh_from_db(); l2.refresh_from_db()
    assert (l1.order, l2.order) == (1, 0)
```

- [ ] **Step 2: Run — must fail**

- [ ] **Step 3: Append to `lms_catalog/services.py`**

```python
def _two_phase_reorder(model, parent_filter, ids_in_order):
    """
    Generic two-phase reorder: push (+1_000_000) then re-assign, inside a
    transaction holding select_for_update on the candidate rows. Avoids
    transient unique-constraint violations.
    """
    rows = list(model.objects.select_for_update().filter(parent_filter, id__in=ids_in_order))
    if len(rows) != len(ids_in_order):
        raise ValidationError(_("ID mismatch in reorder payload."))
    model.objects.filter(parent_filter, id__in=ids_in_order).update(
        order=models.F("order") + 1_000_000,
    )
    for new_order, pk in enumerate(ids_in_order):
        model.objects.filter(pk=pk).update(order=new_order)
    return list(model.objects.filter(parent_filter).order_by("order"))


@transaction.atomic
def reorder_blocks(*, lesson: Lesson, block_ids_in_order: list[int]) -> list[ContentBlock]:
    from django.db import models as _models
    return _two_phase_reorder(ContentBlock, _models.Q(lesson=lesson), block_ids_in_order)


@transaction.atomic
def reorder_sections(*, course: Course, section_ids_in_order: list[int]) -> list[Section]:
    from django.db import models as _models
    return _two_phase_reorder(Section, _models.Q(course=course), section_ids_in_order)


@transaction.atomic
def reorder_lessons(*, section: Section, lesson_ids_in_order: list[int]) -> list[Lesson]:
    from django.db import models as _models
    return _two_phase_reorder(Lesson, _models.Q(section=section), lesson_ids_in_order)
```

Also `from django.db import models` at the top.

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add quizonline-server/lms_catalog/services.py quizonline-server/lms_catalog/tests/test_services_reorder.py
git commit -m "feat(lms_catalog): two-phase reorder for blocks/sections/lessons (concurrency-safe)"
```

---

### Task 22: `clone_course` service

**Files:**
- Modify: `quizonline-server/lms_catalog/services.py`
- Create: `quizonline-server/lms_catalog/tests/test_services_clone.py`

- [ ] **Step 1: Write failing test**

```python
import pytest

from lms_catalog.models import Course, Section, Lesson, ContentBlock
from lms_catalog.services import clone_course


@pytest.mark.django_db
def test_clone_course_duplicates_structure(course, owner):
    s = Section.objects.create(course=course, order=0, is_published=True)
    s.set_current_language("fr"); s.title = "S1"; s.save()
    l = Lesson.objects.create(section=s, slug="l1", order=0)
    l.set_current_language("fr"); l.title = "L1"; l.save()
    ContentBlock.objects.create(lesson=l, block_type=ContentBlock.TYPE_CODE, code_content="A", order=0)

    cloned = clone_course(source=course, by_user=owner)

    assert cloned.pk != course.pk
    assert cloned.sections.count() == 1
    assert cloned.sections.first().lessons.count() == 1
    assert cloned.sections.first().lessons.first().blocks.count() == 1
    # Cloned course should not be published
    assert cloned.is_published is False
```

- [ ] **Step 2: Run — must fail**

- [ ] **Step 3: Append `clone_course`**

```python
import copy


@transaction.atomic
def clone_course(*, source: Course, by_user, target_domain=None) -> Course:
    new_domain = target_domain or source.domain
    new = Course.objects.create(
        domain=new_domain,
        slug=_unique_clone_slug(source.slug),
        language=source.language,
        level=source.level,
        estimated_duration=source.estimated_duration,
        enrollment_mode=source.enrollment_mode,
        cover_image=source.cover_image,
        is_published=False,
        created_by=by_user,
        updated_by=by_user,
    )
    # parler translations
    for tr in source.translations.all():
        new.set_current_language(tr.language_code)
        new.title = tr.title + " (copy)"
        new.description = tr.description
        new.learning_objectives = tr.learning_objectives
        new.save()

    for old_section in source.sections.all():
        new_section = Section.objects.create(
            course=new, order=old_section.order, is_published=old_section.is_published,
        )
        for tr in old_section.translations.all():
            new_section.set_current_language(tr.language_code)
            new_section.title = tr.title
            new_section.description = tr.description
            new_section.save()
        for old_lesson in old_section.lessons.all():
            new_lesson = Lesson.objects.create(
                section=new_section, slug=old_lesson.slug, order=old_lesson.order,
                is_preview=old_lesson.is_preview, is_published=old_lesson.is_published,
                estimated_duration=old_lesson.estimated_duration,
            )
            for tr in old_lesson.translations.all():
                new_lesson.set_current_language(tr.language_code)
                new_lesson.title = tr.title
                new_lesson.short_description = tr.short_description
                new_lesson.save()
            for old_block in old_lesson.blocks.all():
                fields = {f.name: getattr(old_block, f.name) for f in ContentBlock._meta.concrete_fields if f.name != "id"}
                fields["lesson"] = new_lesson
                new_block = ContentBlock.objects.create(**fields)
                for tr in old_block.translations.all():
                    new_block.set_current_language(tr.language_code)
                    new_block.title = tr.title
                    new_block.rich_text = tr.rich_text
                    new_block.callout_text = tr.callout_text
                    new_block.save()
    return new


def _unique_clone_slug(base_slug: str) -> str:
    candidate = f"{base_slug}-copy"
    n = 1
    while Course.objects.filter(slug=candidate).exists():
        n += 1
        candidate = f"{base_slug}-copy-{n}"
    return candidate
```

- [ ] **Step 4: Run tests, commit**

```bash
git add quizonline-server/lms_catalog/
git commit -m "feat(lms_catalog): clone_course duplicates structure and parler translations"
```

---

### Task 23: `lms_enrollment/services.py` — enroll + approve + reject (TDD)

**Files:**
- Create: `quizonline-server/lms_enrollment/services.py`
- Create: `quizonline-server/lms_enrollment/tests/test_services_enroll.py`

- [ ] **Step 1: Write failing tests**

```python
import pytest
from django.core.exceptions import PermissionDenied, ValidationError

from lms_catalog.models import Course
from lms_enrollment.models import CourseEnrollment
from lms_enrollment.services import enroll_user_to_course, approve_enrollment, reject_enrollment


@pytest.mark.django_db
def test_enroll_open_creates_active(course, learner):
    course.enrollment_mode = Course.ENROLL_OPEN
    course.save()
    e = enroll_user_to_course(user=learner, course=course)
    assert e.status == CourseEnrollment.STATUS_ACTIVE


@pytest.mark.django_db
def test_enroll_approval_creates_pending(course, learner):
    course.enrollment_mode = Course.ENROLL_APPROVAL
    course.save()
    e = enroll_user_to_course(user=learner, course=course)
    assert e.status == CourseEnrollment.STATUS_PENDING


@pytest.mark.django_db
def test_enroll_invite_blocks_self_signup(course, learner):
    course.enrollment_mode = Course.ENROLL_INVITE
    course.save()
    with pytest.raises(PermissionDenied):
        enroll_user_to_course(user=learner, course=course)


@pytest.mark.django_db
def test_enroll_invite_allows_instructor_to_add(course, learner, owner):
    course.enrollment_mode = Course.ENROLL_INVITE
    course.save()
    e = enroll_user_to_course(user=learner, course=course, requested_by=owner)
    assert e.status == CourseEnrollment.STATUS_ACTIVE


@pytest.mark.django_db
def test_enroll_is_idempotent(course, learner):
    e1 = enroll_user_to_course(user=learner, course=course)
    e2 = enroll_user_to_course(user=learner, course=course)
    assert e1.pk == e2.pk


@pytest.mark.django_db
def test_approve_enrollment_flips_to_active(course, learner, owner):
    course.enrollment_mode = Course.ENROLL_APPROVAL
    course.save()
    e = enroll_user_to_course(user=learner, course=course)
    approve_enrollment(enrollment=e, decided_by=owner)
    e.refresh_from_db()
    assert e.status == CourseEnrollment.STATUS_ACTIVE


@pytest.mark.django_db
def test_approve_enrollment_rejects_non_instructor(course, learner):
    from customuser.models import CustomUser
    intruder = CustomUser.objects.create_user(username="x", email="x@x.com", password="x")
    course.enrollment_mode = Course.ENROLL_APPROVAL
    course.save()
    e = enroll_user_to_course(user=learner, course=course)
    with pytest.raises(PermissionDenied):
        approve_enrollment(enrollment=e, decided_by=intruder)


@pytest.mark.django_db
def test_reject_enrollment_marks_cancelled(course, learner, owner):
    course.enrollment_mode = Course.ENROLL_APPROVAL
    course.save()
    e = enroll_user_to_course(user=learner, course=course)
    reject_enrollment(enrollment=e, decided_by=owner)
    e.refresh_from_db()
    assert e.status == CourseEnrollment.STATUS_CANCELLED
```

- [ ] **Step 2: Run — must fail**

- [ ] **Step 3: Implement `services.py`**

```python
from __future__ import annotations

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from lms_catalog.models import Course, Lesson
from .models import CourseEnrollment, CourseProgress, LessonProgress


def _is_instructor(user, course: Course) -> bool:
    if user is None:
        return False
    if user.is_superuser:
        return True
    return user.can_manage_domain(course.domain)


@transaction.atomic
def enroll_user_to_course(*, user, course: Course, requested_by=None) -> CourseEnrollment:
    existing = CourseEnrollment.objects.select_for_update().filter(user=user, course=course).first()
    if existing:
        return existing

    if course.enrollment_mode == Course.ENROLL_INVITE:
        if not _is_instructor(requested_by, course):
            raise PermissionDenied(_("Course is invite-only."))
        status = CourseEnrollment.STATUS_ACTIVE
    elif course.enrollment_mode == Course.ENROLL_APPROVAL:
        status = CourseEnrollment.STATUS_PENDING
    else:
        status = CourseEnrollment.STATUS_ACTIVE

    enrollment = CourseEnrollment.objects.create(
        user=user, course=course, status=status,
        created_by=requested_by or user,
    )
    _ensure_course_progress(user, course)
    return enrollment


@transaction.atomic
def approve_enrollment(*, enrollment: CourseEnrollment, decided_by) -> CourseEnrollment:
    if not _is_instructor(decided_by, enrollment.course):
        raise PermissionDenied()
    if enrollment.status != CourseEnrollment.STATUS_PENDING:
        raise ValidationError(_("Enrollment is not pending."))
    enrollment.status = CourseEnrollment.STATUS_ACTIVE
    enrollment.updated_by = decided_by
    enrollment.save(update_fields=["status", "updated_by"])
    return enrollment


@transaction.atomic
def reject_enrollment(*, enrollment: CourseEnrollment, decided_by, reason: str = "") -> CourseEnrollment:
    if not _is_instructor(decided_by, enrollment.course):
        raise PermissionDenied()
    if enrollment.status != CourseEnrollment.STATUS_PENDING:
        raise ValidationError(_("Enrollment is not pending."))
    enrollment.status = CourseEnrollment.STATUS_CANCELLED
    enrollment.updated_by = decided_by
    enrollment.save(update_fields=["status", "updated_by"])
    return enrollment


def _ensure_course_progress(user, course: Course) -> CourseProgress:
    total = Lesson.objects.filter(
        section__course=course, section__is_published=True, is_published=True,
    ).count()
    cp, _ = CourseProgress.objects.get_or_create(
        user=user, course=course,
        defaults={"total_lessons_count": total},
    )
    return cp
```

- [ ] **Step 4: Run tests + commit**

```bash
git add quizonline-server/lms_enrollment/services.py quizonline-server/lms_enrollment/tests/test_services_enroll.py
git commit -m "feat(lms_enrollment): enroll_user_to_course (3 modes) + approve/reject (instructor-gated)"
```

---

### Task 24: `mark_lesson_started` / `mark_lesson_completed` / `calculate_course_progress`

**Files:**
- Modify: `quizonline-server/lms_enrollment/services.py`
- Create: `quizonline-server/lms_enrollment/tests/test_services_progress.py`

- [ ] **Step 1: Write failing tests**

```python
import pytest

from lms_catalog.models import Lesson, Section
from lms_enrollment.models import CourseEnrollment, CourseProgress, LessonProgress
from lms_enrollment.services import (
    enroll_user_to_course,
    mark_lesson_started,
    mark_lesson_completed,
    calculate_course_progress,
)


@pytest.fixture
def published_course_with_two_lessons(course):
    s = Section.objects.create(course=course, order=0, is_published=True)
    l1 = Lesson.objects.create(section=s, slug="l1", order=0, is_published=True)
    l2 = Lesson.objects.create(section=s, slug="l2", order=1, is_published=True)
    return course, l1, l2


@pytest.mark.django_db
def test_mark_started_creates_progress(published_course_with_two_lessons, learner):
    _, l1, _ = published_course_with_two_lessons
    p = mark_lesson_started(user=learner, lesson=l1)
    assert p.is_started is True


@pytest.mark.django_db
def test_mark_completed_updates_course_progress(published_course_with_two_lessons, learner):
    course, l1, l2 = published_course_with_two_lessons
    enroll_user_to_course(user=learner, course=course)
    mark_lesson_completed(user=learner, lesson=l1)
    cp = CourseProgress.objects.get(user=learner, course=course)
    assert cp.completed_lessons_count == 1
    assert cp.total_lessons_count == 2
    assert cp.progress_percent == 50


@pytest.mark.django_db
def test_complete_all_lessons_completes_enrollment(published_course_with_two_lessons, learner):
    course, l1, l2 = published_course_with_two_lessons
    enroll_user_to_course(user=learner, course=course)
    mark_lesson_completed(user=learner, lesson=l1)
    mark_lesson_completed(user=learner, lesson=l2)
    course_enr = CourseEnrollment.objects.get(user=learner, course=course)
    assert course_enr.status == CourseEnrollment.STATUS_COMPLETED


@pytest.mark.django_db
def test_mark_completed_is_idempotent(published_course_with_two_lessons, learner):
    course, l1, _ = published_course_with_two_lessons
    enroll_user_to_course(user=learner, course=course)
    mark_lesson_completed(user=learner, lesson=l1)
    mark_lesson_completed(user=learner, lesson=l1)  # second call
    cp = CourseProgress.objects.get(user=learner, course=course)
    assert cp.completed_lessons_count == 1
```

- [ ] **Step 2: Run — must fail**

- [ ] **Step 3: Append to `services.py`**

```python
@transaction.atomic
def mark_lesson_started(*, user, lesson: Lesson) -> LessonProgress:
    progress, _ = LessonProgress.objects.select_for_update().get_or_create(
        user=user, lesson=lesson,
        defaults={"is_started": True, "started_at": timezone.now()},
    )
    if not progress.is_started:
        progress.is_started = True
        progress.started_at = timezone.now()
        progress.save(update_fields=["is_started", "started_at", "last_seen_at"])
    return progress


@transaction.atomic
def mark_lesson_completed(*, user, lesson: Lesson, progress_percent: int = 100) -> LessonProgress:
    progress, _ = LessonProgress.objects.select_for_update().get_or_create(user=user, lesson=lesson)
    was_completed = progress.is_completed
    progress.is_started = True
    progress.is_completed = True
    progress.progress_percent = max(progress.progress_percent, progress_percent)
    progress.started_at = progress.started_at or timezone.now()
    progress.completed_at = progress.completed_at or timezone.now()
    progress.save()

    course = lesson.section.course
    cp = calculate_course_progress(user=user, course=course)

    if not was_completed and cp.progress_percent == 100:
        from .services import issue_certificate_if_eligible  # defined in Task 25
        issue_certificate_if_eligible(user=user, course=course)
    return progress


@transaction.atomic
def calculate_course_progress(*, user, course: Course) -> CourseProgress:
    total = Lesson.objects.filter(
        section__course=course, section__is_published=True, is_published=True,
    ).count()
    completed = LessonProgress.objects.filter(
        user=user, lesson__section__course=course,
        lesson__section__is_published=True, lesson__is_published=True,
        is_completed=True,
    ).count()
    percent = int((completed / total) * 100) if total else 0
    cp, _ = CourseProgress.objects.select_for_update().get_or_create(user=user, course=course)
    cp.total_lessons_count = total
    cp.completed_lessons_count = completed
    cp.progress_percent = percent
    cp.save()
    if percent == 100:
        CourseEnrollment.objects.filter(
            user=user, course=course, status=CourseEnrollment.STATUS_ACTIVE,
        ).update(status=CourseEnrollment.STATUS_COMPLETED, completed_at=timezone.now())
    return cp
```

- [ ] **Step 4: Run tests (will fail on `issue_certificate_if_eligible` import) — make it tolerant for now**

Wrap the import in a try/except or define a stub returning `None`:

```python
def issue_certificate_if_eligible(*, user, course):  # real impl in Task 25
    return None
```

- [ ] **Step 5: Run tests + commit**

```bash
git add quizonline-server/lms_enrollment/
git commit -m "feat(lms_enrollment): mark_lesson_started/completed + calculate_course_progress (idempotent)"
```

---

### Task 25: `issue_certificate_if_eligible` + certificate number sequence

**Files:**
- Modify: `quizonline-server/lms_enrollment/services.py`
- Create: `quizonline-server/lms_enrollment/tests/test_services_certificate.py`

- [ ] **Step 1: Write failing tests**

```python
import pytest
from datetime import datetime, timezone as dt_tz

from lms_catalog.models import Lesson, Section
from lms_enrollment.models import Certificate
from lms_enrollment.services import enroll_user_to_course, mark_lesson_completed, issue_certificate_if_eligible


@pytest.fixture
def fully_completable_course(course):
    s = Section.objects.create(course=course, order=0, is_published=True)
    Lesson.objects.create(section=s, slug="l", order=0, is_published=True)
    return course


@pytest.mark.django_db
def test_certificate_issued_after_all_lessons_completed(fully_completable_course, learner):
    enroll_user_to_course(user=learner, course=fully_completable_course)
    lesson = fully_completable_course.sections.first().lessons.first()
    mark_lesson_completed(user=learner, lesson=lesson)
    cert = Certificate.objects.filter(user=learner, course=fully_completable_course).first()
    assert cert is not None
    assert cert.certificate_number.startswith("QO-")


@pytest.mark.django_db
def test_certificate_issuance_idempotent(fully_completable_course, learner):
    enroll_user_to_course(user=learner, course=fully_completable_course)
    lesson = fully_completable_course.sections.first().lessons.first()
    mark_lesson_completed(user=learner, lesson=lesson)
    mark_lesson_completed(user=learner, lesson=lesson)
    assert Certificate.objects.filter(user=learner, course=fully_completable_course).count() == 1


@pytest.mark.django_db
def test_certificate_reissue_after_revoke(fully_completable_course, learner):
    from django.utils import timezone
    enroll_user_to_course(user=learner, course=fully_completable_course)
    lesson = fully_completable_course.sections.first().lessons.first()
    mark_lesson_completed(user=learner, lesson=lesson)
    cert = Certificate.objects.get(user=learner, course=fully_completable_course)
    cert.revoked_at = timezone.now(); cert.save()
    # Re-trigger eligibility check
    new_cert = issue_certificate_if_eligible(user=learner, course=fully_completable_course)
    assert new_cert is not None
    assert new_cert.pk != cert.pk
```

- [ ] **Step 2: Run — must fail**

- [ ] **Step 3: Replace the stub `issue_certificate_if_eligible` with the real one**

```python
import secrets

from .models import Certificate, CertificateSequence


def _course_completed(user, course: Course) -> bool:
    cp = CourseProgress.objects.filter(user=user, course=course).first()
    return bool(cp and cp.progress_percent == 100)


def _final_quiz_passed(user, course: Course) -> bool:
    # Bridge to lms_assessment; if no final quiz, treat as passed.
    from lms_assessment.models import LessonQuiz
    final = LessonQuiz.objects.filter(course=course).first()
    if final is None:
        return True
    # Real evaluation happens via the post_save signal; here we just check
    # that there is at least one quiz.Quiz session for this user/template
    # with score >= required_score_percent. Service stub in tests can short-circuit.
    from quiz.models import Quiz
    sessions = Quiz.objects.filter(
        user=user, quiz_template=final.quiz_template, active=False,
    )
    # Best score so far
    from lms_assessment.services import compute_score_percent
    return any(compute_score_percent(s) >= final.required_score_percent for s in sessions)


def _generate_certificate_number() -> str:
    from django.utils import timezone
    year = timezone.now().year
    with transaction.atomic():
        seq, _ = CertificateSequence.objects.select_for_update().get_or_create(year=year)
        seq.counter += 1
        seq.save()
        return f"QO-{year}-{seq.counter:04d}"


@transaction.atomic
def issue_certificate_if_eligible(*, user, course: Course) -> Certificate | None:
    if not _course_completed(user, course):
        return None
    if not _final_quiz_passed(user, course):
        return None
    existing = Certificate.objects.filter(user=user, course=course, revoked_at__isnull=True).first()
    if existing:
        return existing
    cert = Certificate.objects.create(
        user=user, course=course,
        certificate_number=_generate_certificate_number(),
        verification_token=secrets.token_urlsafe(32),
    )
    # PDF rendering scheduled in Task 28.
    from .tasks import render_certificate_pdf
    transaction.on_commit(lambda: render_certificate_pdf.delay(cert.id))
    return cert
```

The `compute_score_percent` helper lives in `lms_assessment/services.py` (Task 26).

- [ ] **Step 4: Run tests**

This task depends on `lms_assessment.services.compute_score_percent` and `lms_enrollment.tasks.render_certificate_pdf`. Stub both as no-ops in this task if needed (real impls in Task 26 + Task 28); replace later.

- [ ] **Step 5: Commit**

```bash
git add quizonline-server/lms_enrollment/
git commit -m "feat(lms_enrollment): issue_certificate_if_eligible + QO-YYYY-NNNN sequence"
```

---

### Task 26: `lms_assessment/services.py` — score computation + `evaluate_lesson_quiz_attempt`

**Files:**
- Create: `quizonline-server/lms_assessment/services.py`
- Create: `quizonline-server/lms_assessment/tests/test_services.py`

- [ ] **Step 1: Write failing tests**

```python
import pytest

from lms_assessment.models import LessonQuiz
from lms_assessment.services import compute_score_percent, evaluate_lesson_quiz_attempt
from lms_enrollment.models import LessonProgress
from quiz.models import Quiz, QuizQuestion, QuizQuestionAnswer
from question.models import Question, AnswerOption


@pytest.fixture
def quiz_session(db, quiz_template, learner):
    return Quiz.objects.create(domain=quiz_template.domain, quiz_template=quiz_template, user=learner, active=False)


@pytest.mark.django_db
def test_compute_score_percent_zero_when_no_questions(quiz_session):
    assert compute_score_percent(quiz_session) == 0


@pytest.mark.django_db
def test_evaluate_lesson_quiz_marks_lesson_completed(lesson, quiz_template, learner):
    LessonQuiz.objects.create(lesson=lesson, quiz_template=quiz_template, required_score_percent=50)
    # Force the score to 100 via monkeypatch
    import lms_assessment.services as svc
    original = svc.compute_score_percent
    svc.compute_score_percent = lambda s: 100
    try:
        session = Quiz.objects.create(domain=quiz_template.domain, quiz_template=quiz_template, user=learner, active=False)
        evaluate_lesson_quiz_attempt(quiz_session=session)
        assert LessonProgress.objects.filter(user=learner, lesson=lesson, is_completed=True).exists()
    finally:
        svc.compute_score_percent = original
```

- [ ] **Step 2: Run — must fail**

- [ ] **Step 3: Implement services**

```python
from __future__ import annotations

from django.db import transaction

from .models import LessonQuiz


def compute_score_percent(quiz_session) -> int:
    """
    Compute % of correctly-answered QuizQuestions in a session.
    Uses quiz.session_integrity helpers if available; otherwise a simple
    correct/total ratio across QuizQuestionAnswer.
    """
    answers = list(quiz_session.questionanswers.all())
    if not answers:
        return 0
    correct = sum(1 for a in answers if getattr(a, "is_correct", False))
    return int((correct / len(answers)) * 100)


@transaction.atomic
def evaluate_lesson_quiz_attempt(*, quiz_session) -> None:
    bindings = LessonQuiz.objects.filter(quiz_template=quiz_session.quiz_template).select_related("lesson", "course")
    if not bindings.exists():
        return
    score = compute_score_percent(quiz_session)
    for binding in bindings:
        if score < binding.required_score_percent:
            continue
        if binding.lesson_id:
            from lms_enrollment.services import mark_lesson_completed
            mark_lesson_completed(user=quiz_session.user, lesson=binding.lesson)
        elif binding.course_id:
            from lms_enrollment.services import issue_certificate_if_eligible
            issue_certificate_if_eligible(user=quiz_session.user, course=binding.course)
```

Note: the exact related_name of `quiz_session.questionanswers` depends on `quiz.models.QuizQuestionAnswer.quiz` — confirm with `Quiz._meta.get_fields()` and adjust if needed.

- [ ] **Step 4: Run tests + commit**

```bash
git add quizonline-server/lms_assessment/services.py quizonline-server/lms_assessment/tests/test_services.py
git commit -m "feat(lms_assessment): score computation + evaluate_lesson_quiz_attempt"
```

---

### Task 27: Wire `lms_assessment` signal on `quiz.Quiz` post_save

**Files:**
- Modify: `quizonline-server/lms_assessment/signals.py`

- [ ] **Step 1: Replace the placeholder with the receiver**

```python
from django.apps import apps
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=None, dispatch_uid="lms_assessment.quiz_post_save")
def _on_quiz_saved(sender, instance, created, **kwargs):
    Quiz = apps.get_model("quiz", "Quiz")
    if sender is not Quiz:
        return
    if instance.active is True:
        return  # not finished yet
    from .services import evaluate_lesson_quiz_attempt
    evaluate_lesson_quiz_attempt(quiz_session=instance)


def _connect():
    Quiz = apps.get_model("quiz", "Quiz")
    post_save.connect(_on_quiz_saved, sender=Quiz, dispatch_uid="lms_assessment.quiz_post_save")
```

- [ ] **Step 2: Call `_connect()` in apps.ready**

`quizonline-server/lms_assessment/apps.py` — replace `ready()`:

```python
def ready(self):
    from .signals import _connect
    _connect()
```

- [ ] **Step 3: Test the signal end-to-end**

`quizonline-server/lms_assessment/tests/test_signals.py`:

```python
import pytest
from quiz.models import Quiz
from lms_assessment.models import LessonQuiz
from lms_enrollment.models import LessonProgress


@pytest.mark.django_db
def test_quiz_close_propagates_to_lesson_progress(lesson, quiz_template, learner, monkeypatch):
    LessonQuiz.objects.create(lesson=lesson, quiz_template=quiz_template, required_score_percent=50)
    # Force score
    import lms_assessment.services as svc
    monkeypatch.setattr(svc, "compute_score_percent", lambda s: 100)
    q = Quiz.objects.create(domain=quiz_template.domain, quiz_template=quiz_template, user=learner, active=True)
    q.active = False
    q.save()  # triggers signal
    assert LessonProgress.objects.filter(user=learner, lesson=lesson, is_completed=True).exists()
```

- [ ] **Step 4: Run + commit**

```bash
git add quizonline-server/lms_assessment/
git commit -m "feat(lms_assessment): post_save signal on quiz.Quiz → mark lesson completed when score passes"
```

---

## Phase 6 — Celery task and reportlab PDF

### Task 28: `render_certificate_pdf` Celery task + `build_certificate_pdf`

**Files:**
- Create: `quizonline-server/lms_enrollment/pdf_export.py`
- Create: `quizonline-server/lms_enrollment/tasks.py`
- Create: `quizonline-server/lms_enrollment/tests/test_pdf.py`

- [ ] **Step 1: Write failing test**

```python
import pytest

from lms_enrollment.models import Certificate
from lms_enrollment.tasks import render_certificate_pdf


@pytest.mark.django_db
def test_render_certificate_pdf_creates_non_empty_file(course, learner):
    cert = Certificate.objects.create(
        user=learner, course=course,
        certificate_number="QO-TEST-0001", verification_token="tok-test",
    )
    render_certificate_pdf(cert.id)
    cert.refresh_from_db()
    assert cert.pdf is not None
    assert cert.pdf.size > 100
    assert cert.pdf_rendered_at is not None
```

- [ ] **Step 2: Run — must fail**

- [ ] **Step 3: Implement `pdf_export.py`**

```python
import io
from datetime import datetime

from django.utils import translation
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


def build_certificate_pdf(cert) -> bytes:
    course = cert.course
    user = cert.user
    lang = user.language or "fr"
    with translation.override(lang):
        title = course.safe_translation_getter("title", language_code=lang, any_language=True) or course.slug

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=landscape(A4),
        leftMargin=30 * mm, rightMargin=30 * mm,
        topMargin=30 * mm, bottomMargin=30 * mm,
    )
    styles = getSampleStyleSheet()
    big = ParagraphStyle("big", parent=styles["Title"], fontSize=36, leading=42, alignment=1, textColor=colors.HexColor("#0f172a"))
    medium = ParagraphStyle("med", parent=styles["Normal"], fontSize=18, leading=24, alignment=1)
    small = ParagraphStyle("small", parent=styles["Normal"], fontSize=11, leading=14, alignment=1, textColor=colors.grey)

    story = [
        Spacer(1, 20 * mm),
        Paragraph("Certificate of Completion", big),
        Spacer(1, 15 * mm),
        Paragraph(user.get_display_name(), medium),
        Spacer(1, 5 * mm),
        Paragraph(f"has completed the course", styles["Normal"]),
        Paragraph(f"<b>{title}</b>", medium),
        Spacer(1, 15 * mm),
        Paragraph(f"Issued on {cert.issued_at.strftime('%Y-%m-%d')}", small),
        Paragraph(f"Certificate №: {cert.certificate_number}", small),
        Paragraph(f"Verification token: {cert.verification_token}", small),
    ]
    doc.build(story)
    return buf.getvalue()
```

The labels here ("Certificate of Completion", "has completed the course", "Issued on", "Certificate №", "Verification token") MUST be wrapped in `gettext` and rendered inside `translation.override(lang)`. Update to:

```python
from django.utils.translation import gettext as _

# inside translation.override(lang):
title_label = _("Certificate of Completion")
verb = _("has completed the course")
issued_on = _("Issued on %(date)s") % {"date": cert.issued_at.strftime("%Y-%m-%d")}
cert_no = _("Certificate №: %(num)s") % {"num": cert.certificate_number}
token_line = _("Verification token: %(t)s") % {"t": cert.verification_token}
```

Then build `story` with those localized variables.

- [ ] **Step 4: Implement `tasks.py`**

```python
from celery import shared_task
from django.core.files.base import ContentFile
from django.utils import timezone

from .models import Certificate
from .pdf_export import build_certificate_pdf


@shared_task
def render_certificate_pdf(cert_id: int) -> None:
    cert = Certificate.objects.get(pk=cert_id)
    payload = build_certificate_pdf(cert)
    cert.pdf.save(f"{cert.certificate_number}.pdf", ContentFile(payload), save=False)
    cert.pdf_rendered_at = timezone.now()
    cert.save(update_fields=["pdf", "pdf_rendered_at"])
```

- [ ] **Step 5: Run test**

For tests, ensure `CELERY_TASK_ALWAYS_EAGER=True` is in `settings_test.py` (it likely is — verify with `grep -n EAGER quizonline-server/config/settings_test.py`).

Run: `cd quizonline-server && pytest lms_enrollment/tests/test_pdf.py -v`
Expected: pass; `cert.pdf` size > 100.

- [ ] **Step 6: Commit**

```bash
git add quizonline-server/lms_enrollment/pdf_export.py quizonline-server/lms_enrollment/tasks.py quizonline-server/lms_enrollment/tests/test_pdf.py
git commit -m "feat(lms_enrollment): reportlab certificate PDF + Celery render task"
```

---

### Task 29: Wire admin actions (regenerate_pdf, revoke, approve_selected)

**Files:**
- Modify: `quizonline-server/lms_enrollment/admin.py`

- [ ] **Step 1: Add `approve_selected` to `CourseEnrollmentAdmin`**

```python
from django.core.exceptions import PermissionDenied, ValidationError

from .services import approve_enrollment


class CourseEnrollmentAdmin(admin.ModelAdmin):
    # ... existing config ...
    actions = ("approve_selected_action",)

    @admin.action(description="Approve selected pending enrollments")
    def approve_selected_action(self, request, queryset):
        ok, skipped = 0, 0
        for e in queryset.filter(status=CourseEnrollment.STATUS_PENDING):
            try:
                approve_enrollment(enrollment=e, decided_by=request.user)
                ok += 1
            except (ValidationError, PermissionDenied) as exc:
                skipped += 1
                self.message_user(request, f"#{e.id} skipped: {exc}", level="warning")
        self.message_user(request, f"Approved {ok}, skipped {skipped}.")
```

- [ ] **Step 2: Add `regenerate_pdf` + `revoke_selected` to `CertificateAdmin`**

```python
from django.utils import timezone

from .tasks import render_certificate_pdf


class CertificateAdmin(admin.ModelAdmin):
    # ... existing config ...
    actions = ("regenerate_pdf_action", "revoke_selected_action")

    @admin.action(description="Re-render PDF (Celery)")
    def regenerate_pdf_action(self, request, queryset):
        for cert in queryset:
            render_certificate_pdf.delay(cert.id)
        self.message_user(request, f"{queryset.count()} re-render jobs queued.")

    @admin.action(description="Revoke selected certificates")
    def revoke_selected_action(self, request, queryset):
        queryset.filter(revoked_at__isnull=True).update(
            revoked_at=timezone.now(),
            revoke_reason="Revoked via admin",
        )
```

- [ ] **Step 3: Commit**

```bash
git add quizonline-server/lms_enrollment/admin.py
git commit -m "feat(lms_enrollment): admin actions for approve, revoke, regenerate PDF"
```

---

## Phase 7 — Backend i18n: emails + notifications

### Task 30: Notification helpers (on-commit pattern)

**Files:**
- Create: `quizonline-server/lms_enrollment/notifications.py`
- Modify: `quizonline-server/lms_enrollment/services.py` to call them

- [ ] **Step 1: Implement `notifications.py`**

```python
from django.db import transaction
from django.utils import translation
from django.utils.translation import gettext as _
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings


def _send_html_email(*, to_email: str, subject: str, template_base: str, context: dict, lang: str) -> None:
    if not to_email:
        return
    with translation.override(lang):
        html_body = render_to_string(f"emails/lms/{template_base}.html", context)
        text_body = render_to_string(f"emails/lms/{template_base}.txt", context)
        send_mail(
            subject=subject,
            message=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to_email],
            html_message=html_body,
        )


def notify_enrollment_created_on_commit(enrollment) -> None:
    def _send():
        lang = enrollment.user.language or "fr"
        with translation.override(lang):
            subject = _("Welcome to %(course)s") % {
                "course": enrollment.course.safe_translation_getter("title", language_code=lang),
            }
        _send_html_email(
            to_email=enrollment.user.email,
            subject=subject,
            template_base="enrollment-created",
            context={"enrollment": enrollment},
            lang=lang,
        )
    transaction.on_commit(_send)


def notify_enrollment_approved_on_commit(enrollment) -> None:
    def _send():
        lang = enrollment.user.language or "fr"
        with translation.override(lang):
            subject = _("Your enrollment to %(course)s was approved") % {
                "course": enrollment.course.safe_translation_getter("title", language_code=lang),
            }
        _send_html_email(
            to_email=enrollment.user.email, subject=subject,
            template_base="enrollment-approved", context={"enrollment": enrollment}, lang=lang,
        )
    transaction.on_commit(_send)


def notify_course_completed_on_commit(*, user, course) -> None:
    def _send():
        lang = user.language or "fr"
        with translation.override(lang):
            subject = _("You completed %(course)s") % {
                "course": course.safe_translation_getter("title", language_code=lang),
            }
        _send_html_email(
            to_email=user.email, subject=subject,
            template_base="course-completed", context={"user": user, "course": course}, lang=lang,
        )
    transaction.on_commit(_send)


def notify_certificate_issued_on_commit(cert) -> None:
    def _send():
        lang = cert.user.language or "fr"
        with translation.override(lang):
            subject = _("Your certificate for %(course)s is ready") % {
                "course": cert.course.safe_translation_getter("title", language_code=lang),
            }
        _send_html_email(
            to_email=cert.user.email, subject=subject,
            template_base="certificate-issued", context={"cert": cert}, lang=lang,
        )
    transaction.on_commit(_send)
```

- [ ] **Step 2: Hook calls in `services.py`**

In `enroll_user_to_course` after `create`: `notify_enrollment_created_on_commit(enrollment)`.
In `approve_enrollment` after save: `notify_enrollment_approved_on_commit(enrollment)`.
In `calculate_course_progress` at the 100% branch: `notify_course_completed_on_commit(user=user, course=course)`.
In `issue_certificate_if_eligible` after create: `notify_certificate_issued_on_commit(cert)`.

Import all four at the top of `services.py`:

```python
from .notifications import (
    notify_enrollment_created_on_commit,
    notify_enrollment_approved_on_commit,
    notify_course_completed_on_commit,
    notify_certificate_issued_on_commit,
)
```

- [ ] **Step 3: Commit**

```bash
git add quizonline-server/lms_enrollment/
git commit -m "feat(lms_enrollment): on-commit notifications for enrollment / completion / certificate"
```

---

### Task 31: Email templates (5 templates × html/txt)

**Files:** create all under `quizonline-server/templates/emails/lms/`

- Create: `enrollment-created.html`, `enrollment-created.txt`
- Create: `enrollment-approved.html`, `enrollment-approved.txt`
- Create: `enrollment-rejected.html`, `enrollment-rejected.txt`
- Create: `course-completed.html`, `course-completed.txt`
- Create: `certificate-issued.html`, `certificate-issued.txt`

- [ ] **Step 1: Example template `enrollment-created.html`**

```html
{% load i18n %}
<p>{% blocktrans with name=enrollment.user.get_display_name %}Hello {{ name }},{% endblocktrans %}</p>

<p>{% blocktrans with course=enrollment.course %}You have been enrolled in <strong>{{ course }}</strong>.{% endblocktrans %}</p>

{% if enrollment.status == 'pending' %}
<p>{% trans "Your enrollment is awaiting approval from an instructor." %}</p>
{% else %}
<p>{% trans "You can start the course right away." %}</p>
{% endif %}

<p>{% trans "Best regards," %}<br>QuizOnline</p>
```

- [ ] **Step 2: `.txt` equivalent**

```
{% load i18n %}{% blocktrans with name=enrollment.user.get_display_name %}Hello {{ name }},{% endblocktrans %}

{% blocktrans with course=enrollment.course %}You have been enrolled in {{ course }}.{% endblocktrans %}

{% if enrollment.status == 'pending' %}{% trans "Your enrollment is awaiting approval from an instructor." %}
{% else %}{% trans "You can start the course right away." %}
{% endif %}
{% trans "Best regards," %}
QuizOnline
```

- [ ] **Step 3: Repeat the same shape for the other four templates**

Each template uses `{% trans %}` / `{% blocktrans %}` for every visible string. No hardcoded UI text. Context provides `enrollment` / `user` / `course` / `cert`.

- [ ] **Step 4: Commit**

```bash
git add quizonline-server/templates/emails/lms/
git commit -m "feat(lms): email templates (html+txt) for enrollment / completion / certificate"
```

---

### Task 32: `makemessages` for all 5 languages

**Files:** generated by Django.

- [ ] **Step 1: Generate `.po` files**

Run:
```powershell
cd quizonline-server
python manage.py makemessages -l fr -l en -l nl -l it -l es --no-obsolete
```

This creates / updates `locale/<lang>/LC_MESSAGES/django.po` for each language with all `_()` strings introduced by Tasks 7-30.

- [ ] **Step 2: Translate the new entries** (paste of French strings + English fallbacks already in code; fill `nl`, `it`, `es` translations).

Suggested translations table for the most common new entries:

| msgid (en) | fr | nl | it | es |
|------------|----|----|----|----|
| `Beginner` | Débutant | Beginner | Principiante | Principiante |
| `Intermediate` | Intermédiaire | Gevorderd | Intermedio | Intermedio |
| `Advanced` | Avancé | Geavanceerd | Avanzato | Avanzado |
| `Open enrollment` | Inscription libre | Open inschrijving | Iscrizione aperta | Inscripción abierta |
| `Requires approval` | Validation requise | Vereist goedkeuring | Richiede approvazione | Requiere aprobación |
| `Invite-only` | Sur invitation | Alleen op uitnodiging | Solo su invito | Solo por invitación |
| `Rich text` | Texte enrichi | Opgemaakte tekst | Testo formattato | Texto enriquecido |
| `Image` | Image | Afbeelding | Immagine | Imagen |
| `Video` | Vidéo | Video | Video | Vídeo |
| `File` | Fichier | Bestand | File | Archivo |
| `Quiz` | Quiz | Quiz | Quiz | Cuestionario |
| `Callout` | Encadré | Aandachtsblok | Riquadro | Recuadro |
| `Code` | Code | Code | Codice | Código |
| `Embed` | Intégration | Insluiting | Incorporazione | Inserción |
| `Certificate of Completion` | Certificat de réussite | Certificaat van voltooiing | Certificato di completamento | Certificado de finalización |
| `Pending approval` | En attente d'approbation | In afwachting van goedkeuring | In attesa di approvazione | Pendiente de aprobación |
| `Active` | Actif | Actief | Attivo | Activo |
| `Completed` | Terminé | Voltooid | Completato | Completado |
| `Cancelled` | Annulé | Geannuleerd | Annullato | Cancelado |

- [ ] **Step 3: Compile**

Run: `python manage.py compilemessages`
Expected: produces `.mo` files alongside the `.po`.

- [ ] **Step 4: Commit**

```bash
git add quizonline-server/locale/
git commit -m "i18n(lms): .po translations for fr/en/nl/it/es (LMS strings)"
```

---

### Task 33: Add `parler-rest` check or skip (decision)

The spec said: do NOT add `parler-rest`. Use a custom `TranslationsField` (Task 37). This task is a placeholder to remind the implementer not to accidentally add `parler-rest` to requirements.txt.

- [ ] **Step 1: Verify `parler-rest` is NOT in requirements.txt**

Run: `grep parler-rest quizonline-server/requirements.txt`
Expected: no output.

- [ ] **Step 2: No commit needed.**

---

## Phase 8 — Permissions

### Task 34: Permission helpers + classes (TDD)

**Files:**
- Create: `quizonline-server/lms_catalog/permissions.py`
- Create: `quizonline-server/lms_catalog/tests/test_permissions_unit.py`

- [ ] **Step 1: Write failing tests**

```python
import pytest
from django.contrib.auth.models import AnonymousUser

from lms_catalog.permissions import is_lms_instructor, is_lms_learner


@pytest.mark.django_db
def test_is_lms_instructor_owner(course, owner):
    assert is_lms_instructor(owner, course) is True


@pytest.mark.django_db
def test_is_lms_instructor_anonymous(course):
    assert is_lms_instructor(AnonymousUser(), course) is False


@pytest.mark.django_db
def test_is_lms_instructor_random_user(course):
    from customuser.models import CustomUser
    u = CustomUser.objects.create_user(username="rnd", email="rnd@x.com", password="x")
    assert is_lms_instructor(u, course) is False


@pytest.mark.django_db
def test_is_lms_learner_member(course, learner):
    assert is_lms_learner(learner, course) is True
```

- [ ] **Step 2: Run — must fail**

- [ ] **Step 3: Implement**

```python
from rest_framework.permissions import SAFE_METHODS, BasePermission

from config.permissions import is_authenticated_user, is_django_admin


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


def _course_of(obj):
    """Navigate any LMS object up to its Course parent."""
    from .models import Course, Section, Lesson, ContentBlock
    if isinstance(obj, Course):
        return obj
    if isinstance(obj, Section):
        return obj.course
    if isinstance(obj, Lesson):
        return obj.section.course
    if isinstance(obj, ContentBlock):
        return obj.lesson.section.course
    raise TypeError(f"_course_of: unsupported {type(obj).__name__}")


def _is_published_chain(obj) -> bool:
    from .models import Course, Section, Lesson, ContentBlock
    course = _course_of(obj)
    if not course.is_published:
        return False
    if isinstance(obj, Section):
        return obj.is_published
    if isinstance(obj, Lesson):
        return obj.section.is_published and (obj.is_published or obj.is_preview)
    if isinstance(obj, ContentBlock):
        lesson = obj.lesson
        return lesson.section.is_published and (lesson.is_published or lesson.is_preview)
    return True  # Course itself: already covered by course.is_published


class IsLmsInstructorOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        return is_authenticated_user(request.user)

    def has_object_permission(self, request, view, obj):
        course = _course_of(obj)
        if request.method in SAFE_METHODS:
            if is_lms_instructor(request.user, course):
                return True
            return is_lms_learner(request.user, course) and _is_published_chain(obj)
        return is_lms_instructor(request.user, course)
```

- [ ] **Step 4: Run + commit**

```bash
git add quizonline-server/lms_catalog/permissions.py quizonline-server/lms_catalog/tests/test_permissions_unit.py
git commit -m "feat(lms_catalog): permission helpers + IsLmsInstructorOrReadOnly"
```

---

### Task 35: `IsEnrollmentOwnerOrInstructor` and `CanVerifyCertificate`

**Files:**
- Create: `quizonline-server/lms_enrollment/permissions.py`

- [ ] **Step 1: Implement**

```python
from rest_framework.permissions import AllowAny, BasePermission

from config.permissions import is_authenticated_user, is_django_admin
from lms_catalog.permissions import is_lms_instructor


class IsEnrollmentOwnerOrInstructor(BasePermission):
    def has_permission(self, request, view):
        return is_authenticated_user(request.user)

    def has_object_permission(self, request, view, obj):
        if is_django_admin(request.user):
            return True
        # obj may be CourseEnrollment, LessonProgress, CourseProgress, Certificate
        owner_id = getattr(obj, "user_id", None)
        if owner_id == request.user.id:
            return True
        course = getattr(obj, "course", None) or getattr(obj.lesson.section, "course", None)
        if course is None:
            return False
        return is_lms_instructor(request.user, course)


class CanVerifyCertificate(AllowAny):
    """Token IS the authorization. Throttled separately."""
    pass
```

- [ ] **Step 2: Commit**

```bash
git add quizonline-server/lms_enrollment/permissions.py
git commit -m "feat(lms_enrollment): IsEnrollmentOwnerOrInstructor + CanVerifyCertificate"
```

---

### Task 36: Permission matrix tests (API-level, deferred to Task 47)

This task is a placeholder reminder: the full permission matrix tests (learner / instructor / admin / non-member × CRUD) will be written once ViewSets exist (Task 47). Don't write them now.

- [ ] No action. Skip.

---

## Phase 9 — Serializers, ViewSets, URLs, throttles

### Task 37: `TranslationsField` helper

**Files:**
- Create: `quizonline-server/lms_catalog/serializers.py`
- Create: `quizonline-server/lms_catalog/tests/test_translations_field.py`

- [ ] **Step 1: Write failing test**

```python
import pytest
from lms_catalog.models import Course


@pytest.mark.django_db
def test_translations_field_serializes_existing_translations(course):
    course.set_current_language("fr"); course.title = "T-FR"; course.description = "D-FR"; course.save()
    from lms_catalog.serializers import TranslationsField
    field = TranslationsField()
    out = field.to_representation(course)
    assert out["fr"]["title"] == "T-FR"
    assert out["fr"]["description"] == "D-FR"
```

- [ ] **Step 2: Implement**

```python
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from drf_spectacular.types import OpenApiTypes


@extend_schema_field({
    "type": "object",
    "additionalProperties": {"type": "object", "additionalProperties": {"type": "string"}},
    "example": {"fr": {"title": "Bonjour"}, "en": {"title": "Hello"}},
})
class TranslationsField(serializers.Field):
    def to_representation(self, value):
        instance = value if hasattr(value, "translations") else self.parent.instance
        result = {}
        for tr in instance.translations.all():
            row = {}
            for field in tr._meta.get_fields():
                if field.name in {"id", "master", "language_code"}:
                    continue
                row[field.name] = getattr(tr, field.name)
            result[tr.language_code] = row
        return result

    def to_internal_value(self, data):
        if not isinstance(data, dict):
            raise serializers.ValidationError("Expected a dict of {lang_code: {field: value}}.")
        return data
```

The serializer that USES `TranslationsField` is responsible for applying it via `instance.set_current_language(lang); instance.<field> = value; instance.save()` in its `create()` / `update()`. Tasks 38+ show the pattern.

- [ ] **Step 3: Run + commit**

```bash
git add quizonline-server/lms_catalog/serializers.py quizonline-server/lms_catalog/tests/test_translations_field.py
git commit -m "feat(lms_catalog): TranslationsField (DRF Field) + drf-spectacular schema hint"
```

---

### Task 38: Catalog serializers (Course list / detail / write, Section, Lesson, ContentBlock)

**Files:**
- Modify: `quizonline-server/lms_catalog/serializers.py`

- [ ] **Step 1: Append serializers**

```python
from language.models import Language

from .models import Course, Section, Lesson, ContentBlock


def _filter_allowed_lang_codes(data: dict, course: Course) -> dict:
    allowed = set(course.domain.allowed_languages.values_list("code", flat=True))
    if not allowed:
        raise serializers.ValidationError("Domain has no allowed_languages configured.")
    return {k: v for k, v in data.items() if k in allowed}


class ContentBlockSerializer(serializers.ModelSerializer):
    translations = TranslationsField()

    class Meta:
        model = ContentBlock
        fields = [
            "id", "lesson", "block_type", "order", "is_required",
            "image", "video_url", "video_provider", "file", "external_url",
            "code_language", "code_content", "quiz_template",
            "metadata", "translations",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        instance = self.instance or ContentBlock(**{k: v for k, v in attrs.items() if k != "translations"})
        for k, v in attrs.items():
            if k != "translations":
                setattr(instance, k, v)
        instance.full_clean(exclude=["lesson"] if not getattr(instance, "lesson_id", None) else None)
        return attrs

    def create(self, validated_data):
        tr = validated_data.pop("translations", {})
        instance = ContentBlock.objects.create(**validated_data)
        return self._apply_translations(instance, tr)

    def update(self, instance, validated_data):
        tr = validated_data.pop("translations", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if tr is not None:
            self._apply_translations(instance, tr)
        return instance

    def _apply_translations(self, instance, tr_dict):
        course = instance.lesson.section.course
        tr_dict = _filter_allowed_lang_codes(tr_dict, course)
        for lang, fields in tr_dict.items():
            instance.set_current_language(lang)
            for k, v in fields.items():
                setattr(instance, k, v)
            instance.save()
        return instance


class LessonDetailSerializer(serializers.ModelSerializer):
    translations = TranslationsField()
    blocks = ContentBlockSerializer(many=True, read_only=True)
    available_lang_codes = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            "id", "section", "slug", "order", "is_preview", "is_published",
            "estimated_duration", "translations", "blocks", "available_lang_codes",
        ]
        read_only_fields = ["id", "blocks"]

    def get_available_lang_codes(self, obj):
        return sorted(obj.section.course.domain.allowed_languages.values_list("code", flat=True))

    def create(self, validated_data):
        tr = validated_data.pop("translations", {})
        instance = Lesson.objects.create(**validated_data)
        return self._apply(instance, tr)

    def update(self, instance, validated_data):
        tr = validated_data.pop("translations", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if tr is not None:
            self._apply(instance, tr)
        return instance

    def _apply(self, instance, tr_dict):
        course = instance.section.course
        tr_dict = _filter_allowed_lang_codes(tr_dict, course)
        for lang, fields in tr_dict.items():
            instance.set_current_language(lang)
            for k, v in fields.items():
                setattr(instance, k, v)
            instance.save()
        return instance


class SectionSerializer(serializers.ModelSerializer):
    translations = TranslationsField()
    available_lang_codes = serializers.SerializerMethodField()
    lessons = LessonDetailSerializer(many=True, read_only=True)

    class Meta:
        model = Section
        fields = ["id", "course", "order", "is_published", "translations", "available_lang_codes", "lessons"]
        read_only_fields = ["id", "lessons"]

    def get_available_lang_codes(self, obj):
        return sorted(obj.course.domain.allowed_languages.values_list("code", flat=True))

    def create(self, validated_data):
        tr = validated_data.pop("translations", {})
        instance = Section.objects.create(**validated_data)
        return self._apply(instance, tr)

    def update(self, instance, validated_data):
        tr = validated_data.pop("translations", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if tr is not None:
            self._apply(instance, tr)
        return instance

    def _apply(self, instance, tr_dict):
        tr_dict = _filter_allowed_lang_codes(tr_dict, instance.course)
        for lang, fields in tr_dict.items():
            instance.set_current_language(lang)
            for k, v in fields.items():
                setattr(instance, k, v)
            instance.save()
        return instance


class CourseListSerializer(serializers.ModelSerializer):
    translations = TranslationsField()
    language_code = serializers.SlugRelatedField(source="language", slug_field="code", read_only=True)

    class Meta:
        model = Course
        fields = [
            "id", "slug", "level", "language_code", "estimated_duration",
            "enrollment_mode", "is_published", "published_at",
            "cover_image", "translations", "domain",
        ]


class CourseDetailSerializer(CourseListSerializer):
    sections = SectionSerializer(many=True, read_only=True)
    available_lang_codes = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()

    class Meta(CourseListSerializer.Meta):
        fields = CourseListSerializer.Meta.fields + [
            "sections", "available_lang_codes", "can_manage", "created_at", "updated_at",
        ]

    def get_available_lang_codes(self, obj):
        return sorted(obj.domain.allowed_languages.values_list("code", flat=True))

    def get_can_manage(self, obj):
        from .permissions import is_lms_instructor
        request = self.context.get("request")
        return bool(request and is_lms_instructor(request.user, obj))


class CourseWriteSerializer(serializers.ModelSerializer):
    translations = TranslationsField()
    language_code = serializers.SlugRelatedField(queryset=Language.objects.all(), source="language", slug_field="code")

    class Meta:
        model = Course
        fields = [
            "id", "slug", "level", "language_code", "estimated_duration",
            "enrollment_mode", "cover_image", "domain", "translations",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        tr = validated_data.pop("translations", {})
        instance = Course(**validated_data)
        instance.full_clean()
        instance.save()
        return self._apply(instance, tr)

    def update(self, instance, validated_data):
        tr = validated_data.pop("translations", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.full_clean()
        instance.save()
        if tr is not None:
            self._apply(instance, tr)
        return instance

    def _apply(self, instance, tr_dict):
        tr_dict = _filter_allowed_lang_codes(tr_dict, instance)
        for lang, fields in tr_dict.items():
            instance.set_current_language(lang)
            for k, v in fields.items():
                setattr(instance, k, v)
            instance.save()
        return instance
```

- [ ] **Step 2: Commit**

```bash
git add quizonline-server/lms_catalog/serializers.py
git commit -m "feat(lms_catalog): Course/Section/Lesson/ContentBlock serializers with translations + allowed-lang filter"
```

---

### Task 39: Enrollment + Progress + Certificate serializers

**Files:**
- Create: `quizonline-server/lms_enrollment/serializers.py`

- [ ] **Step 1: Write**

```python
from rest_framework import serializers

from .models import Certificate, CourseEnrollment, CourseProgress, LessonProgress


class CourseEnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseEnrollment
        fields = ["id", "user", "course", "status", "enrolled_at", "completed_at"]
        read_only_fields = ["id", "user", "enrolled_at", "completed_at", "status"]


class LessonProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonProgress
        fields = ["id", "user", "lesson", "is_started", "is_completed", "progress_percent",
                  "started_at", "completed_at", "last_seen_at"]
        read_only_fields = ["id", "user", "started_at", "completed_at", "last_seen_at"]


class CourseProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseProgress
        fields = ["id", "user", "course", "completed_lessons_count", "total_lessons_count",
                  "progress_percent", "updated_at"]
        read_only_fields = "__all__"


class CertificateSerializer(serializers.ModelSerializer):
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = ["id", "user", "course", "certificate_number", "issued_at",
                  "pdf_url", "revoked_at"]
        read_only_fields = "__all__"

    def get_pdf_url(self, obj):
        if obj.pdf:
            return obj.pdf.url
        return None


class CertificateVerifySerializer(serializers.Serializer):
    """Public verify endpoint payload — minimal."""
    valid = serializers.BooleanField()
    certificate_number = serializers.CharField()
    course_title = serializers.CharField()
    user_display_name = serializers.CharField()
    issued_at = serializers.DateTimeField()
    revoked = serializers.BooleanField()
```

- [ ] **Step 2: Commit**

```bash
git add quizonline-server/lms_enrollment/serializers.py
git commit -m "feat(lms_enrollment): serializers for enrollment, progress, certificate, verify"
```

---

### Task 40: LessonQuiz serializer

**Files:**
- Create: `quizonline-server/lms_assessment/serializers.py`

- [ ] **Step 1: Write**

```python
from rest_framework import serializers

from .models import LessonQuiz


class LessonQuizSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonQuiz
        fields = [
            "id", "lesson", "course", "quiz_template",
            "required_score_percent", "is_required", "max_attempts",
            "unlock_next_lesson_on_success", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        instance = self.instance or LessonQuiz(**attrs)
        for k, v in attrs.items():
            setattr(instance, k, v)
        instance.full_clean()
        return attrs
```

- [ ] **Step 2: Commit**

```bash
git add quizonline-server/lms_assessment/serializers.py
git commit -m "feat(lms_assessment): LessonQuiz serializer with .clean() forwarding"
```

---

### Task 41: Catalog ViewSets + URLs

**Files:**
- Create: `quizonline-server/lms_catalog/views.py`
- Modify: `quizonline-server/lms_catalog/api_urls.py`

- [ ] **Step 1: Write ViewSets**

```python
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .models import Course, Section, Lesson, ContentBlock
from .permissions import IsLmsInstructorOrReadOnly, is_lms_instructor
from .serializers import (
    CourseDetailSerializer, CourseListSerializer, CourseWriteSerializer,
    SectionSerializer, LessonDetailSerializer, ContentBlockSerializer,
)
from .services import publish_course, unpublish_course, reorder_blocks, reorder_sections, reorder_lessons, clone_course


class CourseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsLmsInstructorOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["translations__title", "translations__description", "slug"]
    ordering_fields = ["published_at", "created_at", "level"]
    lookup_field = "pk"

    def get_queryset(self):
        return Course.objects.visible_to(self.request.user).select_related("domain", "language").prefetch_related("translations")

    def get_serializer_class(self):
        if self.action == "list":
            return CourseListSerializer
        if self.action in ("create", "update", "partial_update"):
            return CourseWriteSerializer
        return CourseDetailSerializer

    @action(detail=False, methods=["get"], url_path=r"by-slug/(?P<slug>[^/]+)")
    def by_slug(self, request, slug=None):
        course = self.get_queryset().filter(slug=slug).first()
        if not course:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(CourseDetailSerializer(course, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        course = self.get_object()
        publish_course(course=course, by_user=request.user)
        return Response(CourseDetailSerializer(course, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def unpublish(self, request, pk=None):
        course = self.get_object()
        unpublish_course(course=course, by_user=request.user)
        return Response(CourseDetailSerializer(course, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def clone(self, request, pk=None):
        source = self.get_object()
        new = clone_course(source=source, by_user=request.user)
        return Response(CourseDetailSerializer(new, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="section/reorder")
    def reorder_sections_action(self, request, pk=None):
        course = self.get_object()
        ids = request.data.get("ids", [])
        reorder_sections(course=course, section_ids_in_order=ids)
        return Response(CourseDetailSerializer(course, context={"request": request}).data)


class SectionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsLmsInstructorOrReadOnly]
    serializer_class = SectionSerializer

    def get_queryset(self):
        return Section.objects.visible_to(self.request.user).select_related("course")

    @action(detail=True, methods=["post"], url_path="lesson/reorder")
    def reorder_lessons_action(self, request, pk=None):
        section = self.get_object()
        ids = request.data.get("ids", [])
        reorder_lessons(section=section, lesson_ids_in_order=ids)
        return Response(SectionSerializer(section).data)


class LessonViewSet(viewsets.ModelViewSet):
    permission_classes = [IsLmsInstructorOrReadOnly]
    serializer_class = LessonDetailSerializer

    def get_queryset(self):
        return Lesson.objects.visible_to(self.request.user).select_related("section", "section__course")

    @action(detail=True, methods=["post"], url_path="block/reorder")
    def reorder_blocks_action(self, request, pk=None):
        lesson = self.get_object()
        ids = request.data.get("ids", [])
        reorder_blocks(lesson=lesson, block_ids_in_order=ids)
        return Response(LessonDetailSerializer(lesson).data)


class ContentBlockViewSet(viewsets.ModelViewSet):
    permission_classes = [IsLmsInstructorOrReadOnly]
    serializer_class = ContentBlockSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "lms_block_write"

    def get_queryset(self):
        return ContentBlock.objects.visible_to(self.request.user).select_related("lesson", "lesson__section", "lesson__section__course")

    def get_throttles(self):
        # Only throttle writes
        if self.request.method in ("POST", "PUT", "PATCH", "DELETE"):
            return [ScopedRateThrottle()]
        return []
```

- [ ] **Step 2: Wire URLs**

`quizonline-server/lms_catalog/api_urls.py`:

```python
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ContentBlockViewSet, CourseViewSet, LessonViewSet, SectionViewSet

app_name = "lms_catalog-api"

router = DefaultRouter()
router.register(r"course", CourseViewSet, basename="course")
router.register(r"section", SectionViewSet, basename="section")
router.register(r"lesson", LessonViewSet, basename="lesson")
router.register(r"block", ContentBlockViewSet, basename="block")

urlpatterns = router.urls
```

- [ ] **Step 3: Verify**

Run: `cd quizonline-server && python manage.py check && python manage.py runserver`
Hit `http://127.0.0.1:8000/api/lms/course/` — should return 401 (auth required), confirming registration.

- [ ] **Step 4: Commit**

```bash
git add quizonline-server/lms_catalog/views.py quizonline-server/lms_catalog/api_urls.py
git commit -m "feat(lms_catalog): Course/Section/Lesson/Block ViewSets with reorder & publish actions"
```

---

### Task 42: Enrollment + Progress + Certificate ViewSets

**Files:**
- Create: `quizonline-server/lms_enrollment/views.py`
- Modify: `quizonline-server/lms_enrollment/api_urls.py`

- [ ] **Step 1: Write ViewSets**

```python
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle

from lms_catalog.models import Course, Lesson
from .models import Certificate, CourseEnrollment, CourseProgress, LessonProgress
from .permissions import IsEnrollmentOwnerOrInstructor
from .serializers import (
    CertificateSerializer, CertificateVerifySerializer,
    CourseEnrollmentSerializer, CourseProgressSerializer, LessonProgressSerializer,
)
from .services import (
    approve_enrollment, enroll_user_to_course, mark_lesson_completed, mark_lesson_started,
    reject_enrollment,
)


class CourseEnrollmentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CourseEnrollmentSerializer
    permission_classes = [IsEnrollmentOwnerOrInstructor]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return CourseEnrollment.objects.all().select_related("user", "course")
        return CourseEnrollment.objects.filter(user=user).select_related("course")

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        enrollment = self.get_object()
        enrollment.status = CourseEnrollment.STATUS_CANCELLED
        enrollment.save(update_fields=["status"])
        return Response(CourseEnrollmentSerializer(enrollment).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        enrollment = self.get_object()
        approve_enrollment(enrollment=enrollment, decided_by=request.user)
        return Response(CourseEnrollmentSerializer(enrollment).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        enrollment = self.get_object()
        reject_enrollment(enrollment=enrollment, decided_by=request.user, reason=request.data.get("reason", ""))
        return Response(CourseEnrollmentSerializer(enrollment).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([ScopedRateThrottle])
def enroll_to_course(request, course_id: int):
    enroll_to_course.throttle_scope = "lms_enroll"
    course = Course.objects.filter(pk=course_id).first()
    if not course:
        return Response(status=status.HTTP_404_NOT_FOUND)
    enrollment = enroll_user_to_course(user=request.user, course=course)
    return Response(CourseEnrollmentSerializer(enrollment).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_lesson(request, lesson_id: int):
    lesson = Lesson.objects.filter(pk=lesson_id).first()
    if not lesson:
        return Response(status=status.HTTP_404_NOT_FOUND)
    p = mark_lesson_started(user=request.user, lesson=lesson)
    return Response(LessonProgressSerializer(p).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def complete_lesson(request, lesson_id: int):
    lesson = Lesson.objects.filter(pk=lesson_id).first()
    if not lesson:
        return Response(status=status.HTTP_404_NOT_FOUND)
    percent = int(request.data.get("progress_percent", 100))
    p = mark_lesson_completed(user=request.user, lesson=lesson, progress_percent=percent)
    return Response(LessonProgressSerializer(p).data)


class CourseProgressViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CourseProgressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CourseProgress.objects.filter(user=self.request.user).select_related("course")


class CertificateViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CertificateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Certificate.objects.filter(user=self.request.user).select_related("course")

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        cert = self.get_object()
        if not cert.pdf:
            return Response({"detail": "PDF not ready yet."}, status=status.HTTP_202_ACCEPTED)
        from django.http import FileResponse
        return FileResponse(cert.pdf.open("rb"), as_attachment=True, filename=f"{cert.certificate_number}.pdf")

    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        from django.utils import timezone
        cert = self.get_object()
        cert.revoked_at = timezone.now()
        cert.revoke_reason = request.data.get("reason", "")
        cert.save(update_fields=["revoked_at", "revoke_reason"])
        return Response(CertificateSerializer(cert).data)


@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([AnonRateThrottle])
def verify_certificate(request, token: str):
    verify_certificate.throttle_scope = "lms_cert_verify"
    cert = Certificate.objects.filter(verification_token=token).select_related("user", "course").first()
    if not cert:
        return Response({"valid": False}, status=status.HTTP_404_NOT_FOUND)
    course_title = cert.course.safe_translation_getter("title", any_language=True) or cert.course.slug
    payload = {
        "valid": cert.revoked_at is None,
        "certificate_number": cert.certificate_number,
        "course_title": course_title,
        "user_display_name": cert.user.get_display_name(),
        "issued_at": cert.issued_at,
        "revoked": cert.revoked_at is not None,
    }
    return Response(CertificateVerifySerializer(payload).data)
```

- [ ] **Step 2: URLs**

`quizonline-server/lms_enrollment/api_urls.py`:

```python
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CertificateViewSet, CourseEnrollmentViewSet, CourseProgressViewSet,
    complete_lesson, enroll_to_course, start_lesson, verify_certificate,
)

app_name = "lms_enrollment-api"

router = DefaultRouter()
router.register(r"enrollment", CourseEnrollmentViewSet, basename="enrollment")
router.register(r"progress", CourseProgressViewSet, basename="progress")
router.register(r"certificate", CertificateViewSet, basename="certificate")

urlpatterns = router.urls + [
    path("course/<int:course_id>/enroll/", enroll_to_course, name="enroll"),
    path("lesson/<int:lesson_id>/start/", start_lesson, name="start-lesson"),
    path("lesson/<int:lesson_id>/complete/", complete_lesson, name="complete-lesson"),
    path("verify/<str:token>/", verify_certificate, name="verify"),
]
```

- [ ] **Step 3: Commit**

```bash
git add quizonline-server/lms_enrollment/views.py quizonline-server/lms_enrollment/api_urls.py
git commit -m "feat(lms_enrollment): viewsets + enroll/start/complete + verify (anon throttled)"
```

---

### Task 43: LessonQuiz ViewSet + URLs

**Files:**
- Create: `quizonline-server/lms_assessment/views.py`
- Modify: `quizonline-server/lms_assessment/api_urls.py`

- [ ] **Step 1: Write**

```python
from rest_framework import viewsets

from lms_catalog.permissions import IsLmsInstructorOrReadOnly
from .models import LessonQuiz
from .serializers import LessonQuizSerializer


class LessonQuizViewSet(viewsets.ModelViewSet):
    serializer_class = LessonQuizSerializer
    permission_classes = [IsLmsInstructorOrReadOnly]
    queryset = LessonQuiz.objects.all().select_related("lesson", "course", "quiz_template")
```

`api_urls.py`:

```python
from rest_framework.routers import DefaultRouter

from .views import LessonQuizViewSet

app_name = "lms_assessment-api"

router = DefaultRouter()
router.register(r"validation-quiz", LessonQuizViewSet, basename="validation-quiz")

urlpatterns = router.urls
```

- [ ] **Step 2: Commit**

```bash
git add quizonline-server/lms_assessment/views.py quizonline-server/lms_assessment/api_urls.py
git commit -m "feat(lms_assessment): LessonQuiz ViewSet under /api/lms/validation-quiz/"
```

---

### Task 44: Permission matrix API tests

**Files:**
- Create: `quizonline-server/lms_catalog/tests/test_api_permissions.py`

- [ ] **Step 1: Write a representative subset (12 cases)**

```python
import pytest
from rest_framework.test import APIClient


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.mark.django_db
def test_non_member_cannot_list_course(course):
    from customuser.models import CustomUser
    intruder = CustomUser.objects.create_user(username="x", email="x@x.com", password="x")
    r = _auth(intruder).get("/api/lms/course/")
    assert r.status_code == 200
    assert r.data["count"] == 0  # filtered out


@pytest.mark.django_db
def test_member_sees_published_course_only(course, learner):
    r = _auth(learner).get("/api/lms/course/")
    assert r.status_code == 200
    assert r.data["count"] == 0  # course is not published
    from django.utils import timezone
    course.is_published = True; course.published_at = timezone.now(); course.save()
    r = _auth(learner).get("/api/lms/course/")
    assert r.data["count"] == 1


@pytest.mark.django_db
def test_member_cannot_create_course(domain, fr_lang, learner):
    r = _auth(learner).post("/api/lms/course/", {
        "slug": "x", "level": "beginner",
        "language_code": "fr", "domain": domain.id,
        "translations": {"fr": {"title": "X"}},
    }, format="json")
    assert r.status_code in (403, 400)  # instructor only


@pytest.mark.django_db
def test_owner_can_create_course(domain, fr_lang, owner):
    r = _auth(owner).post("/api/lms/course/", {
        "slug": "x", "level": "beginner",
        "language_code": "fr", "domain": domain.id,
        "translations": {"fr": {"title": "X"}},
    }, format="json")
    assert r.status_code == 201


@pytest.mark.django_db
def test_owner_can_publish_course(course, owner):
    from lms_catalog.models import Section, Lesson
    s = Section.objects.create(course=course, order=0, is_published=True)
    Lesson.objects.create(section=s, slug="l", order=0, is_published=True)
    r = _auth(owner).post(f"/api/lms/course/{course.id}/publish/")
    assert r.status_code == 200


@pytest.mark.django_db
def test_learner_cannot_publish_course(course, learner):
    r = _auth(learner).post(f"/api/lms/course/{course.id}/publish/")
    assert r.status_code in (403, 404)


@pytest.mark.django_db
def test_verify_anonymous_works(course, learner):
    from lms_enrollment.models import Certificate
    cert = Certificate.objects.create(user=learner, course=course, certificate_number="QO-T-1", verification_token="abc")
    r = APIClient().get(f"/api/lms/verify/abc/")
    assert r.status_code == 200
    assert r.data["valid"] is True


@pytest.mark.django_db
def test_verify_invalid_token_404(course, learner):
    r = APIClient().get("/api/lms/verify/nope/")
    assert r.status_code == 404
```

- [ ] **Step 2: Run + commit**

```bash
git add quizonline-server/lms_catalog/tests/test_api_permissions.py
git commit -m "test(lms): permission matrix at the API level (representative subset)"
```

---

### Task 45: throttle scope smoke test

**Files:**
- Create: `quizonline-server/lms_enrollment/tests/test_throttle.py`

- [ ] **Step 1: Write a smoke test**

```python
import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_verify_endpoint_uses_anon_throttle(course, learner, settings):
    settings.REST_FRAMEWORK = {
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_RATES": {**settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"], "lms_cert_verify": "1/min"},
    }
    from lms_enrollment.models import Certificate
    Certificate.objects.create(user=learner, course=course, certificate_number="QO-T-2", verification_token="tok2")
    c = APIClient()
    r1 = c.get("/api/lms/verify/tok2/")
    r2 = c.get("/api/lms/verify/tok2/")
    assert r1.status_code == 200
    assert r2.status_code == 429
```

- [ ] **Step 2: Run + commit**

```bash
git add quizonline-server/lms_enrollment/tests/test_throttle.py
git commit -m "test(lms): verify endpoint anon throttle reaches 429 after limit"
```

---

### Task 46: Final cross-app integration test (signal → completion → certificate)

**Files:**
- Create: `quizonline-server/lms_enrollment/tests/test_integration_full.py`

- [ ] **Step 1: Write**

```python
import pytest

from lms_assessment.models import LessonQuiz
from lms_catalog.models import Lesson, Section
from lms_enrollment.models import Certificate
from lms_enrollment.services import enroll_user_to_course
from quiz.models import Quiz


@pytest.mark.django_db
def test_full_path_with_final_quiz(course, quiz_template, learner, monkeypatch):
    s = Section.objects.create(course=course, order=0, is_published=True)
    l = Lesson.objects.create(section=s, slug="l", order=0, is_published=True)
    LessonQuiz.objects.create(course=course, quiz_template=quiz_template, required_score_percent=70)

    enroll_user_to_course(user=learner, course=course)

    # complete the lesson (no validation quiz on lesson)
    from lms_enrollment.services import mark_lesson_completed
    mark_lesson_completed(user=learner, lesson=l)

    # no final quiz session yet → no certificate
    assert Certificate.objects.filter(user=learner, course=course).count() == 0

    # simulate final quiz pass
    import lms_assessment.services as svc
    monkeypatch.setattr(svc, "compute_score_percent", lambda s: 80)
    q = Quiz.objects.create(domain=quiz_template.domain, quiz_template=quiz_template, user=learner, active=True)
    q.active = False; q.save()  # signal fires evaluate_lesson_quiz_attempt

    assert Certificate.objects.filter(user=learner, course=course).count() == 1
```

- [ ] **Step 2: Run + commit**

```bash
git add quizonline-server/lms_enrollment/tests/test_integration_full.py
git commit -m "test(lms): full path lesson-complete → final-quiz-pass → certificate issued"
```

---

### Task 47: Full backend test run gate

- [ ] **Step 1: Run everything**

Run: `cd quizonline-server && pytest lms_catalog lms_assessment lms_enrollment -v`
Expected: all tests pass.

- [ ] **Step 2: Run the existing project tests to catch regressions**

Run: `cd quizonline-server && pytest -q`
Expected: existing pre-LMS tests still pass.

- [ ] **Step 3: No commit needed unless flake fixes are required.**

---

## Phase 10 — HTML sanitization, SSM, seed demo

### Task 48: HTML sanitization on `ContentBlock.save()`

**Files:**
- Modify: `quizonline-server/requirements.txt`
- Modify: `quizonline-server/lms_catalog/models.py`
- Create: `quizonline-server/lms_catalog/sanitizer.py`
- Create: `quizonline-server/lms_catalog/tests/test_sanitizer.py`

- [ ] **Step 1: Add dependency**

Append to `quizonline-server/requirements.txt`:
```
nh3==0.2.18
```

Then: `pip install -r quizonline-server/requirements.txt`

- [ ] **Step 2: Write the sanitizer**

`quizonline-server/lms_catalog/sanitizer.py`:

```python
import nh3

ALLOWED_TAGS = {
    "p", "br", "strong", "em", "u", "a", "ul", "ol", "li",
    "h2", "h3", "h4", "blockquote", "code", "pre", "img",
}
ALLOWED_ATTRS = {
    "a": {"href", "title", "rel", "target"},
    "img": {"src", "alt", "title"},
}


def sanitize_rich_text(html: str) -> str:
    if not html:
        return ""
    return nh3.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        link_rel="noopener noreferrer",
        strip_comments=True,
    )
```

- [ ] **Step 3: Hook in `ContentBlock`**

Add to `ContentBlock` model:

```python
def save(self, *args, **kwargs):
    from .sanitizer import sanitize_rich_text
    if self.block_type == self.TYPE_RICH_TEXT:
        # sanitize parler translation field for current language
        try:
            current = self.safe_translation_getter("rich_text", any_language=True) or ""
            for tr in self.translations.all() if self.pk else []:
                tr.rich_text = sanitize_rich_text(tr.rich_text or "")
                tr.save(update_fields=["rich_text"])
        except Exception:
            pass
    super().save(*args, **kwargs)
```

For a fresh block being created (no translations yet), sanitization happens on the serializer's `_apply_translations` after `set_current_language`. Update `ContentBlockSerializer._apply_translations` to call `sanitize_rich_text` on the `rich_text` key before assigning.

- [ ] **Step 4: Test**

`tests/test_sanitizer.py`:

```python
from lms_catalog.sanitizer import sanitize_rich_text


def test_strips_script_tag():
    out = sanitize_rich_text('<p>hi</p><script>alert(1)</script>')
    assert "script" not in out.lower()
    assert "hi" in out


def test_allows_safe_tags():
    out = sanitize_rich_text('<p><strong>bold</strong></p>')
    assert "<strong>" in out
```

- [ ] **Step 5: Run + commit**

```bash
git add quizonline-server/requirements.txt quizonline-server/lms_catalog/sanitizer.py quizonline-server/lms_catalog/models.py quizonline-server/lms_catalog/serializers.py quizonline-server/lms_catalog/tests/test_sanitizer.py
git commit -m "feat(lms_catalog): sanitize ContentBlock.rich_text via nh3 (XSS hardening)"
```

---

### Task 49: SSM seeding documentation + env templates updated (cross-check Task 5)

**Files:**
- Modify: `deploy/README.md` (section: "Adding a new env var")

- [ ] **Step 1: Append a note to `deploy/README.md`**

Locate the section about env vars and append:

```markdown
### LMS throttles

After deploying the LMS, seed the three rate-limit parameters into AWS SSM Parameter Store:

```bash
cat > /tmp/lms-throttles.env <<EOF
THROTTLE_LMS_ENROLL=20/min
THROTTLE_LMS_BLOCK_WRITE=120/min
THROTTLE_LMS_CERT_VERIFY=60/min
EOF
bash deploy/seed-parameter-store.sh --prefix /quizonline/prod /tmp/lms-throttles.env
rm /tmp/lms-throttles.env
sudo systemctl restart quizonline-env-fetch.service quizonline-gunicorn.service
```

The parameters are non-secret (operational tunables) — `String` type is sufficient, `SecureString` is overkill.
```

- [ ] **Step 2: Commit**

```bash
git add deploy/README.md
git commit -m "docs(deploy): SSM seeding procedure for LMS throttle scopes"
```

---

### Task 50: `seed_lms_demo` management command

**Files:**
- Create: `quizonline-server/lms_catalog/management/__init__.py`
- Create: `quizonline-server/lms_catalog/management/commands/__init__.py`
- Create: `quizonline-server/lms_catalog/management/commands/seed_lms_demo.py`

- [ ] **Step 1: Write the command**

```python
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from domain.models import Domain
from language.models import Language
from lms_catalog.models import ContentBlock, Course, Lesson, Section


User = get_user_model()


class Command(BaseCommand):
    help = "Seed an LMS demo dataset (idempotent)."

    def handle(self, *args, **options):
        fr, _ = Language.objects.get_or_create(code="fr", defaults={"name": "French"})
        en, _ = Language.objects.get_or_create(code="en", defaults={"name": "English"})

        owner, _ = User.objects.get_or_create(
            username="lms-demo-owner",
            defaults={"email": "lms-demo@example.com"},
        )

        domain = Domain.objects.filter(owner=owner).first()
        if not domain:
            domain = Domain.objects.create(owner=owner)
            domain.set_current_language("fr"); domain.name = "Demo Domain"; domain.save()
            domain.allowed_languages.add(fr, en)

        course = Course.objects.filter(slug="demo-python").first()
        if not course:
            course = Course(
                domain=domain, slug="demo-python", language=fr,
                level=Course.LEVEL_BEGINNER, enrollment_mode=Course.ENROLL_OPEN,
                is_published=True, published_at=timezone.now(),
                created_by=owner,
            )
            course.set_current_language("fr"); course.title = "Introduction à Python"; course.save()
            course.set_current_language("en"); course.title = "Introduction to Python"; course.save()

            s1 = Section.objects.create(course=course, order=0, is_published=True)
            s1.set_current_language("fr"); s1.title = "Module 1 — Bases"; s1.save()

            l1 = Lesson.objects.create(section=s1, slug="hello-world", order=0, is_published=True, estimated_duration=10)
            l1.set_current_language("fr"); l1.title = "Bonjour, le monde"; l1.save()

            ContentBlock.objects.create(
                lesson=l1, block_type=ContentBlock.TYPE_CODE,
                order=0, code_language="python", code_content="print('Bonjour!')",
            )

        self.stdout.write(self.style.SUCCESS(f"Seeded demo course #{course.id}"))
```

- [ ] **Step 2: Test**

Run: `cd quizonline-server && python manage.py seed_lms_demo`
Expected: prints `Seeded demo course #N`. Idempotent.

- [ ] **Step 3: Commit**

```bash
git add quizonline-server/lms_catalog/management/
git commit -m "feat(lms_catalog): seed_lms_demo management command (idempotent)"
```

---

### Task 51: `pytest -q` smoke run

- [ ] **Step 1: Full suite**

Run: `cd quizonline-server && pytest -q`
Expected: all green.

- [ ] **Step 2: No commit unless fixes are required.**

---

## Phase 11 — OpenAPI resync

### Task 52: Regenerate OpenAPI schema and TypeScript client

**Files:**
- Modify: `quizonline-server/openapi.yaml` (regenerated)
- Modify: many files under `quizonline-frontend/src/app/api/generated/`

- [ ] **Step 1: Resync**

From the project root, in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-openapi.ps1
```

This regenerates `openapi.yaml` from the live Django schema and rebuilds the TS client.

- [ ] **Step 2: Verify the LMS endpoints appear**

Run: `grep -c "lms" quizonline-server/openapi.yaml`
Expected: a substantial number (≥ 30 lines) referencing LMS.

- [ ] **Step 3: Commit**

```bash
git add quizonline-server/openapi.yaml quizonline-frontend/src/app/api/generated/
git commit -m "chore(openapi): regenerate schema and TS client for LMS endpoints"
```

---

## Phase 12 — Frontend foundation

### Task 53: Shared LMS module (i18n + helpers + types)

**Files:**
- Create: `quizonline-frontend/src/app/shared/lms/lms-translations.ts`
- Create: `quizonline-frontend/src/app/shared/lms/lms-common.i18n.ts`
- Create: `quizonline-frontend/src/app/shared/lms/block-icons.ts`
- Create: `quizonline-frontend/src/app/shared/lms/content-block.types.ts`

- [ ] **Step 1: `lms-translations.ts` — helper to pick a translated field**

```typescript
import { SupportedLang } from '../i18n/ui-text';

export interface TranslationsMap {
  [lang: string]: Record<string, string>;
}

export function pickTranslation(
  translations: TranslationsMap | undefined | null,
  lang: SupportedLang,
  field: string,
): string {
  if (!translations) {
    return '';
  }
  const order: SupportedLang[] = [lang, 'fr', 'en'];
  for (const code of order) {
    const value = translations[code]?.[field];
    if (value) {
      return value;
    }
  }
  for (const payload of Object.values(translations)) {
    if (payload[field]) {
      return payload[field];
    }
  }
  return '';
}
```

- [ ] **Step 2: `lms-common.i18n.ts` — shared enum labels in 5 languages**

```typescript
import { SupportedLang } from '../i18n/ui-text';

export type BlockType =
  | 'rich_text' | 'image' | 'video' | 'file'
  | 'quiz' | 'callout' | 'code' | 'embed';

export type EnrollmentStatus = 'pending' | 'active' | 'completed' | 'cancelled';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type VideoProvider = 'youtube' | 'vimeo' | 'upload';

export interface LmsCommonUiText {
  blockTypeLabels: Record<BlockType, string>;
  enrollmentStatusLabels: Record<EnrollmentStatus, string>;
  levelLabels: Record<CourseLevel, string>;
  videoProviderLabels: Record<VideoProvider, string>;
}

export function getLmsCommonUiText(lang: SupportedLang): LmsCommonUiText {
  switch (lang) {
    case 'fr':
      return {
        blockTypeLabels: {
          rich_text: 'Texte enrichi', image: 'Image', video: 'Vidéo', file: 'Fichier',
          quiz: 'Quiz', callout: 'Encadré', code: 'Code', embed: 'Intégration',
        },
        enrollmentStatusLabels: {
          pending: 'En attente', active: 'Actif', completed: 'Terminé', cancelled: 'Annulé',
        },
        levelLabels: { beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé' },
        videoProviderLabels: { youtube: 'YouTube', vimeo: 'Vimeo', upload: 'Hébergé localement' },
      };
    case 'en':
      return {
        blockTypeLabels: {
          rich_text: 'Rich text', image: 'Image', video: 'Video', file: 'File',
          quiz: 'Quiz', callout: 'Callout', code: 'Code', embed: 'Embed',
        },
        enrollmentStatusLabels: {
          pending: 'Pending', active: 'Active', completed: 'Completed', cancelled: 'Cancelled',
        },
        levelLabels: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' },
        videoProviderLabels: { youtube: 'YouTube', vimeo: 'Vimeo', upload: 'Self-hosted' },
      };
    case 'nl':
      return {
        blockTypeLabels: {
          rich_text: 'Opgemaakte tekst', image: 'Afbeelding', video: 'Video', file: 'Bestand',
          quiz: 'Quiz', callout: 'Aandachtsblok', code: 'Code', embed: 'Insluiting',
        },
        enrollmentStatusLabels: {
          pending: 'In afwachting', active: 'Actief', completed: 'Voltooid', cancelled: 'Geannuleerd',
        },
        levelLabels: { beginner: 'Beginner', intermediate: 'Gevorderd', advanced: 'Geavanceerd' },
        videoProviderLabels: { youtube: 'YouTube', vimeo: 'Vimeo', upload: 'Lokaal gehost' },
      };
    case 'it':
      return {
        blockTypeLabels: {
          rich_text: 'Testo formattato', image: 'Immagine', video: 'Video', file: 'File',
          quiz: 'Quiz', callout: 'Riquadro', code: 'Codice', embed: 'Incorporazione',
        },
        enrollmentStatusLabels: {
          pending: 'In attesa', active: 'Attivo', completed: 'Completato', cancelled: 'Annullato',
        },
        levelLabels: { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzato' },
        videoProviderLabels: { youtube: 'YouTube', vimeo: 'Vimeo', upload: 'Self-hosted' },
      };
    case 'es':
      return {
        blockTypeLabels: {
          rich_text: 'Texto enriquecido', image: 'Imagen', video: 'Vídeo', file: 'Archivo',
          quiz: 'Cuestionario', callout: 'Recuadro', code: 'Código', embed: 'Inserción',
        },
        enrollmentStatusLabels: {
          pending: 'Pendiente', active: 'Activo', completed: 'Completado', cancelled: 'Cancelado',
        },
        levelLabels: { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' },
        videoProviderLabels: { youtube: 'YouTube', vimeo: 'Vimeo', upload: 'Alojado localmente' },
      };
  }
}
```

- [ ] **Step 3: `block-icons.ts`**

```typescript
import { BlockType } from './lms-common.i18n';

export const BLOCK_ICONS: Record<BlockType, string> = {
  rich_text: 'pi pi-align-left',
  image: 'pi pi-image',
  video: 'pi pi-video',
  file: 'pi pi-file',
  quiz: 'pi pi-question-circle',
  callout: 'pi pi-info-circle',
  code: 'pi pi-code',
  embed: 'pi pi-external-link',
};
```

- [ ] **Step 4: `content-block.types.ts` — TS types narrower than the generated client**

```typescript
import { TranslationsMap } from './lms-translations';
import { BlockType, VideoProvider } from './lms-common.i18n';

export interface ContentBlock {
  id: number;
  lesson: number;
  block_type: BlockType;
  order: number;
  is_required: boolean;
  image: string | null;
  video_url: string;
  video_provider: VideoProvider | '';
  file: string | null;
  external_url: string;
  code_language: string;
  code_content: string;
  quiz_template: number | null;
  metadata: Record<string, unknown>;
  translations: TranslationsMap;
}
```

- [ ] **Step 5: Commit**

```bash
git add quizonline-frontend/src/app/shared/lms/
git commit -m "feat(frontend/lms): shared module (translations, common i18n, block icons, types)"
```

---

### Task 54: Add LMS routes

**Files:**
- Modify: `quizonline-frontend/src/app/app.routes.ts`
- Modify: `quizonline-frontend/src/app/app.routes-paths.ts`

- [ ] **Step 1: Add routes to `app.routes.ts` (before the last `};` closing the array)**

```typescript
  {
    path: 'lms/catalog',
    loadComponent: () => import('./pages/lms/catalog/catalog').then((m) => m.LmsCatalog),
    canActivate: [authGuard],
  },
  {
    path: 'lms/course/:slug',
    loadComponent: () => import('./pages/lms/course-detail/course-detail').then((m) => m.LmsCourseDetail),
    canActivate: [authGuard],
  },
  {
    path: 'lms/course/:id/edit',
    loadComponent: () => import('./pages/lms/course-edit/course-edit').then((m) => m.LmsCourseEdit),
    canActivate: [authGuard, domainAccessGuard],
  },
  {
    path: 'lms/lesson/:id',
    loadComponent: () => import('./pages/lms/lesson-view/lesson-view').then((m) => m.LmsLessonView),
    canActivate: [authGuard],
  },
  {
    path: 'lms/lesson/:id/edit',
    loadComponent: () => import('./pages/lms/lesson-edit/lesson-edit').then((m) => m.LmsLessonEdit),
    canActivate: [authGuard, domainAccessGuard],
  },
  {
    path: 'lms/me/progress',
    loadComponent: () => import('./pages/lms/progress/progress').then((m) => m.LmsProgress),
    canActivate: [authGuard],
  },
  {
    path: 'lms/me/certificates',
    loadComponent: () => import('./pages/lms/certificate-list/certificate-list').then((m) => m.LmsCertificateList),
    canActivate: [authGuard],
  },
  {
    path: 'lms/certificate/:id',
    loadComponent: () => import('./pages/lms/certificate-view/certificate-view').then((m) => m.LmsCertificateView),
    canActivate: [authGuard],
  },
  {
    path: 'lms/verify/:token',
    loadComponent: () => import('./pages/lms/certificate-verify/certificate-verify').then((m) => m.LmsCertificateVerify),
  },
```

- [ ] **Step 2: Add path constants to `app.routes-paths.ts`**

```typescript
export const LMS_CATALOG = '/lms/catalog';
export const LMS_COURSE_DETAIL = (slug: string) => `/lms/course/${slug}`;
export const LMS_COURSE_EDIT = (id: number) => `/lms/course/${id}/edit`;
export const LMS_LESSON_VIEW = (id: number) => `/lms/lesson/${id}`;
export const LMS_LESSON_EDIT = (id: number) => `/lms/lesson/${id}/edit`;
export const LMS_ME_PROGRESS = '/lms/me/progress';
export const LMS_ME_CERTIFICATES = '/lms/me/certificates';
export const LMS_CERTIFICATE_VIEW = (id: number) => `/lms/certificate/${id}`;
export const LMS_CERTIFICATE_VERIFY = (token: string) => `/lms/verify/${token}`;
```

- [ ] **Step 3: Commit**

```bash
git add quizonline-frontend/src/app/app.routes.ts quizonline-frontend/src/app/app.routes-paths.ts
git commit -m "feat(frontend/lms): register LMS routes and path constants"
```

---

### Task 55: Stub page components (so routes don't 404 during development)

**Files:** create empty TS shells for each route target so `app.routes.ts` lazy-load resolves while subsequent tasks flesh them out.

For each route, create:
- `quizonline-frontend/src/app/pages/lms/<page>/<page>.ts`
- `quizonline-frontend/src/app/pages/lms/<page>/<page>.html`
- `quizonline-frontend/src/app/pages/lms/<page>/<page>.scss` (empty)
- `quizonline-frontend/src/app/pages/lms/<page>/<page>.i18n.ts` (empty stub)

- [ ] **Step 1: Stub example — `pages/lms/catalog/catalog.ts`**

```typescript
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UiTextService } from '../../../shared/i18n/ui-text.service';
import { getLmsCatalogUiText } from './catalog.i18n';

@Component({
  selector: 'app-lms-catalog',
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCatalog {
  protected ui = inject(UiTextService).localized(getLmsCatalogUiText);
}
```

`catalog.html`:
```html
<h1>{{ ui().pageTitle }}</h1>
```

`catalog.i18n.ts`:
```typescript
import { SupportedLang } from '../../../shared/i18n/ui-text';

export interface LmsCatalogUiText {
  pageTitle: string;
}

export function getLmsCatalogUiText(lang: SupportedLang): LmsCatalogUiText {
  switch (lang) {
    case 'fr': return { pageTitle: 'Catalogue des cours' };
    case 'en': return { pageTitle: 'Course catalog' };
    case 'nl': return { pageTitle: 'Cursuscatalogus' };
    case 'it': return { pageTitle: 'Catalogo dei corsi' };
    case 'es': return { pageTitle: 'Catálogo de cursos' };
  }
}
```

- [ ] **Step 2: Repeat for the other 8 pages** with the same scaffold (class name, file names follow the route target). Use placeholder `pageTitle` text translated in all 5 languages.

| Route | Class | i18n key example |
|-------|-------|------------------|
| `lms/catalog` | `LmsCatalog` | `Course catalog` |
| `lms/course/:slug` | `LmsCourseDetail` | `Course` |
| `lms/course/:id/edit` | `LmsCourseEdit` | `Edit course` |
| `lms/lesson/:id` | `LmsLessonView` | `Lesson` |
| `lms/lesson/:id/edit` | `LmsLessonEdit` | `Edit lesson` |
| `lms/me/progress` | `LmsProgress` | `My progress` |
| `lms/me/certificates` | `LmsCertificateList` | `My certificates` |
| `lms/certificate/:id` | `LmsCertificateView` | `Certificate` |
| `lms/verify/:token` | `LmsCertificateVerify` | `Verify certificate` |

- [ ] **Step 3: Run the dev server**

Run: `cd quizonline-frontend && npm start`
Visit each route → page renders its title in the current language → no 404.

- [ ] **Step 4: Commit**

```bash
git add quizonline-frontend/src/app/pages/lms/
git commit -m "feat(frontend/lms): stub components for all 9 LMS pages with i18n shells"
```

---

## Phase 13 — Frontend learner pages

### Task 56: Catalog page (list + filters)

**Files:**
- Modify: `quizonline-frontend/src/app/pages/lms/catalog/catalog.ts`
- Modify: `quizonline-frontend/src/app/pages/lms/catalog/catalog.html`
- Modify: `quizonline-frontend/src/app/pages/lms/catalog/catalog.i18n.ts`

- [ ] **Step 1: Expand the i18n file**

```typescript
import { SupportedLang } from '../../../shared/i18n/ui-text';

export interface LmsCatalogUiText {
  pageTitle: string;
  filterByLevelLabel: string;
  filterByLanguageLabel: string;
  filterByDomainLabel: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyMessage: string;
  durationLabel: string;     // "{n} min"
  enrollmentBadge: Record<'open' | 'approval' | 'invite', string>;
  viewButton: string;
}

export function getLmsCatalogUiText(lang: SupportedLang): LmsCatalogUiText {
  switch (lang) {
    case 'fr': return {
      pageTitle: 'Catalogue des cours',
      filterByLevelLabel: 'Niveau',
      filterByLanguageLabel: 'Langue',
      filterByDomainLabel: 'Domaine',
      searchPlaceholder: 'Rechercher un cours…',
      emptyTitle: 'Aucun cours disponible',
      emptyMessage: 'Aucun cours publié ne correspond à votre sélection.',
      durationLabel: '{n} min',
      enrollmentBadge: { open: 'Libre', approval: 'Sur validation', invite: 'Sur invitation' },
      viewButton: 'Voir',
    };
    case 'en': return {
      pageTitle: 'Course catalog',
      filterByLevelLabel: 'Level',
      filterByLanguageLabel: 'Language',
      filterByDomainLabel: 'Domain',
      searchPlaceholder: 'Search a course…',
      emptyTitle: 'No course available',
      emptyMessage: 'No published course matches your filters.',
      durationLabel: '{n} min',
      enrollmentBadge: { open: 'Open', approval: 'Approval', invite: 'Invite-only' },
      viewButton: 'View',
    };
    case 'nl': return {
      pageTitle: 'Cursuscatalogus',
      filterByLevelLabel: 'Niveau', filterByLanguageLabel: 'Taal', filterByDomainLabel: 'Domein',
      searchPlaceholder: 'Zoek een cursus…',
      emptyTitle: 'Geen cursus beschikbaar', emptyMessage: 'Geen gepubliceerde cursus komt overeen met uw selectie.',
      durationLabel: '{n} min',
      enrollmentBadge: { open: 'Open', approval: 'Goedkeuring', invite: 'Op uitnodiging' },
      viewButton: 'Bekijken',
    };
    case 'it': return {
      pageTitle: 'Catalogo dei corsi',
      filterByLevelLabel: 'Livello', filterByLanguageLabel: 'Lingua', filterByDomainLabel: 'Dominio',
      searchPlaceholder: 'Cerca un corso…',
      emptyTitle: 'Nessun corso disponibile', emptyMessage: 'Nessun corso pubblicato corrisponde alla selezione.',
      durationLabel: '{n} min',
      enrollmentBadge: { open: 'Aperto', approval: 'Approvazione', invite: 'Solo invito' },
      viewButton: 'Visualizza',
    };
    case 'es': return {
      pageTitle: 'Catálogo de cursos',
      filterByLevelLabel: 'Nivel', filterByLanguageLabel: 'Idioma', filterByDomainLabel: 'Dominio',
      searchPlaceholder: 'Buscar un curso…',
      emptyTitle: 'Sin cursos disponibles', emptyMessage: 'Ningún curso publicado coincide con su selección.',
      durationLabel: '{n} min',
      enrollmentBadge: { open: 'Libre', approval: 'Aprobación', invite: 'Por invitación' },
      viewButton: 'Ver',
    };
  }
}
```

- [ ] **Step 2: Implement the component**

```typescript
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DataViewModule } from 'primeng/dataview';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';

import { UiTextService } from '../../../shared/i18n/ui-text.service';
import { LmsCatalogService } from '../../../services/lms/lms-catalog.service'; // see Task 57
import { pickTranslation } from '../../../shared/lms/lms-translations';
import { getLmsCommonUiText } from '../../../shared/lms/lms-common.i18n';
import { LMS_COURSE_DETAIL } from '../../../app.routes-paths';
import { getLmsCatalogUiText } from './catalog.i18n';

@Component({
  selector: 'app-lms-catalog',
  imports: [CommonModule, RouterLink, DataViewModule, ButtonModule, SelectModule, InputTextModule, TagModule, CardModule],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCatalog {
  private uiSvc = inject(UiTextService);
  private catalog = inject(LmsCatalogService);
  private router = inject(Router);

  protected ui = this.uiSvc.localized(getLmsCatalogUiText);
  protected common = this.uiSvc.localized(getLmsCommonUiText);
  protected currentLang = this.uiSvc.currentLang;

  protected courses = signal<any[]>([]);
  protected search = signal('');
  protected levelFilter = signal<string | null>(null);

  constructor() {
    this.refresh();
  }

  protected levelOptions = computed(() => {
    const labels = this.common().levelLabels;
    return [
      { value: null, label: this.ui().filterByLevelLabel },
      { value: 'beginner', label: labels.beginner },
      { value: 'intermediate', label: labels.intermediate },
      { value: 'advanced', label: labels.advanced },
    ];
  });

  protected title(course: any): string {
    return pickTranslation(course.translations, this.currentLang(), 'title');
  }

  protected description(course: any): string {
    return pickTranslation(course.translations, this.currentLang(), 'description');
  }

  private refresh(): void {
    this.catalog.list({ search: this.search(), level: this.levelFilter() ?? undefined }).subscribe((r) => {
      this.courses.set(r.results ?? r);
    });
  }

  protected onFilterChange(): void { this.refresh(); }

  protected open(course: any): void {
    this.router.navigateByUrl(LMS_COURSE_DETAIL(course.slug));
  }

  protected toCourseHref = (course: any) => LMS_COURSE_DETAIL(course.slug);
}
```

- [ ] **Step 3: Template `catalog.html`**

```html
<div class="lms-catalog">
  <h1>{{ ui().pageTitle }}</h1>

  <div class="filters">
    <input pInputText
           [placeholder]="ui().searchPlaceholder"
           [ngModel]="search()"
           (ngModelChange)="search.set($event); onFilterChange()" />
    <p-select [options]="levelOptions()"
              optionLabel="label" optionValue="value"
              [ngModel]="levelFilter()"
              (ngModelChange)="levelFilter.set($event); onFilterChange()" />
  </div>

  <p-dataview [value]="courses()" layout="grid">
    <ng-template pTemplate="grid" let-items>
      <div class="grid">
        @for (course of items; track course.id) {
          <p-card class="course-card">
            <ng-template pTemplate="title">{{ title(course) }}</ng-template>
            <ng-template pTemplate="subtitle">
              <p-tag [value]="ui().enrollmentBadge[course.enrollment_mode]" />
              <span class="level">{{ common().levelLabels[course.level] }}</span>
            </ng-template>
            <p>{{ description(course) }}</p>
            <ng-template pTemplate="footer">
              <p-button [routerLink]="toCourseHref(course)" [label]="ui().viewButton" />
            </ng-template>
          </p-card>
        }
      </div>
    </ng-template>
    <ng-template pTemplate="empty">
      <div class="empty-state">
        <h3>{{ ui().emptyTitle }}</h3>
        <p>{{ ui().emptyMessage }}</p>
      </div>
    </ng-template>
  </p-dataview>
</div>
```

The exact PrimeNG `<p-dataview>` API (templates, `layout`) is version-sensitive — adjust to match the installed PrimeNG 21 (cross-check at implementation time).

- [ ] **Step 4: Commit**

```bash
git add quizonline-frontend/src/app/pages/lms/catalog/
git commit -m "feat(frontend/lms): catalog page (list + level/search filters, PrimeNG dataview)"
```

---

### Task 57: `LmsCatalogService` (frontend wrapper around generated API)

**Files:**
- Create: `quizonline-frontend/src/app/services/lms/lms-catalog.service.ts`

- [ ] **Step 1: Implement**

```typescript
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LmsCatalogService {
  private http = inject(HttpClient);
  private base = `${environment.apiBase}/api/lms`;

  list(params: { search?: string; level?: string } = {}) {
    return this.http.get<{ count: number; results: any[] }>(`${this.base}/course/`, { params: params as any });
  }

  detailBySlug(slug: string) {
    return this.http.get<any>(`${this.base}/course/by-slug/${slug}/`);
  }

  detailById(id: number) {
    return this.http.get<any>(`${this.base}/course/${id}/`);
  }

  publish(id: number) {
    return this.http.post<any>(`${this.base}/course/${id}/publish/`, {});
  }

  unpublish(id: number) {
    return this.http.post<any>(`${this.base}/course/${id}/unpublish/`, {});
  }

  clone(id: number) {
    return this.http.post<any>(`${this.base}/course/${id}/clone/`, {});
  }

  reorderSections(courseId: number, ids: number[]) {
    return this.http.post<any>(`${this.base}/course/${courseId}/section/reorder/`, { ids });
  }

  reorderLessons(sectionId: number, ids: number[]) {
    return this.http.post<any>(`${this.base}/section/${sectionId}/lesson/reorder/`, { ids });
  }

  reorderBlocks(lessonId: number, ids: number[]) {
    return this.http.post<any>(`${this.base}/lesson/${lessonId}/block/reorder/`, { ids });
  }
}
```

If the generated API client (Task 52) exposes typed methods covering these calls, prefer using them and remove the equivalents above. The service then just becomes a thin adapter for cleaner imports.

- [ ] **Step 2: Companion services**

```typescript
// services/lms/lms-enrollment.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';


@Injectable({ providedIn: 'root' })
export class LmsEnrollmentService {
  private http = inject(HttpClient);
  private base = `${environment.apiBase}/api/lms`;

  myEnrollments(params: { status?: string } = {}) {
    return this.http.get<{ results: any[] }>(`${this.base}/enrollment/`, { params: params as any });
  }
  enroll(courseId: number) {
    return this.http.post<any>(`${this.base}/course/${courseId}/enroll/`, {});
  }
  startLesson(lessonId: number) {
    return this.http.post<any>(`${this.base}/lesson/${lessonId}/start/`, {});
  }
  completeLesson(lessonId: number, progress = 100) {
    return this.http.post<any>(`${this.base}/lesson/${lessonId}/complete/`, { progress_percent: progress });
  }
  myProgress() {
    return this.http.get<{ results: any[] }>(`${this.base}/progress/`);
  }
  myCertificates() {
    return this.http.get<{ results: any[] }>(`${this.base}/certificate/`);
  }
  verify(token: string) {
    return this.http.get<any>(`${this.base}/verify/${token}/`);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add quizonline-frontend/src/app/services/lms/
git commit -m "feat(frontend/lms): catalog + enrollment services wrapping /api/lms"
```

---

### Task 58: Course-detail page (toc + enroll button)

**Files:**
- Modify: `quizonline-frontend/src/app/pages/lms/course-detail/course-detail.{ts,html,scss,i18n.ts}`

- [ ] **Step 1: Expand i18n file**

```typescript
import { SupportedLang } from '../../../shared/i18n/ui-text';

export interface LmsCourseDetailUiText {
  loading: string;
  sectionsHeading: string;
  lessonsLabel: string;
  durationLabel: string;        // "{n} min"
  enrollButton: string;
  enrolledBadge: string;
  pendingBadge: string;
  cancelEnrollment: string;
  startLessonButton: string;
  continueLessonButton: string;
  completedLessonBadge: string;
  previewBadge: string;
  inviteOnlyMessage: string;
  approvalPendingMessage: string;
  // … (provide all five languages)
}
export function getLmsCourseDetailUiText(lang: SupportedLang): LmsCourseDetailUiText { /* 5 langs */ }
```

- [ ] **Step 2: Component**

```typescript
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';

import { LmsCatalogService } from '../../../services/lms/lms-catalog.service';
import { LmsEnrollmentService } from '../../../services/lms/lms-enrollment.service';
import { UiTextService } from '../../../shared/i18n/ui-text.service';
import { AppToastService } from '../../../shared/toast/app-toast.service';
import { pickTranslation } from '../../../shared/lms/lms-translations';
import { getLmsCourseDetailUiText } from './course-detail.i18n';
import { getLmsCommonUiText } from '../../../shared/lms/lms-common.i18n';
import { LMS_LESSON_VIEW } from '../../../app.routes-paths';

@Component({
  selector: 'app-lms-course-detail',
  imports: [CommonModule, RouterLink, ButtonModule, TagModule, ProgressBarModule],
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCourseDetail {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private catalog = inject(LmsCatalogService);
  private enrollment = inject(LmsEnrollmentService);
  private uiSvc = inject(UiTextService);
  private toast = inject(AppToastService);

  protected ui = this.uiSvc.localized(getLmsCourseDetailUiText);
  protected common = this.uiSvc.localized(getLmsCommonUiText);
  protected currentLang = this.uiSvc.currentLang;
  protected course = signal<any>(null);

  constructor() {
    this.route.paramMap.subscribe((p) => {
      const slug = p.get('slug')!;
      this.catalog.detailBySlug(slug).subscribe((c) => this.course.set(c));
    });
  }

  protected title = computed(() => pickTranslation(this.course()?.translations, this.currentLang(), 'title'));
  protected description = computed(() => pickTranslation(this.course()?.translations, this.currentLang(), 'description'));

  protected enroll(): void {
    const c = this.course();
    if (!c) return;
    this.enrollment.enroll(c.id).subscribe({
      next: () => { this.toast.success(this.ui().enrolledBadge); this.refresh(); },
      error: () => this.toast.error(this.ui().inviteOnlyMessage),
    });
  }

  protected openLesson(lessonId: number): void {
    this.router.navigateByUrl(LMS_LESSON_VIEW(lessonId));
  }

  private refresh(): void {
    const c = this.course();
    if (!c) return;
    this.catalog.detailBySlug(c.slug).subscribe((next) => this.course.set(next));
  }
}
```

- [ ] **Step 3: Template** — sketch a section/lesson tree using `<p-progressBar>` and `<p-tag>`. No raw text outside `{{ ui()... }}` / `title()` / etc.

```html
@if (course(); as c) {
  <header class="course-header">
    <h1>{{ title() }}</h1>
    <p>{{ description() }}</p>
    <p-button (onClick)="enroll()" [label]="ui().enrollButton" />
  </header>

  @for (section of c.sections; track section.id) {
    <section class="course-section">
      <h2>{{ section.translations[currentLang()]?.title || section.translations.fr?.title }}</h2>
      <ul>
        @for (lesson of section.lessons; track lesson.id) {
          <li>
            <a (click)="openLesson(lesson.id)">{{ lesson.translations[currentLang()]?.title }}</a>
            @if (lesson.is_preview) { <p-tag [value]="ui().previewBadge" severity="info" /> }
          </li>
        }
      </ul>
    </section>
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add quizonline-frontend/src/app/pages/lms/course-detail/
git commit -m "feat(frontend/lms): course-detail page with toc + enroll button"
```

---

### Task 59: Lesson-view page (renders blocks)

**Files:**
- Modify: `quizonline-frontend/src/app/pages/lms/lesson-view/lesson-view.{ts,html,scss,i18n.ts}`
- Create: `quizonline-frontend/src/app/pages/lms/lesson-view/block-renderers/` (8 components)

- [ ] **Step 1: i18n file** — strings for "Start lesson", "Mark as completed", "Next lesson", "Validation quiz", etc., in all 5 langs.

- [ ] **Step 2: Component shell**

```typescript
@Component({
  selector: 'app-lms-lesson-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // imports: 8 block-renderer components + AppQuizPlayComponent for quiz blocks
  templateUrl: './lesson-view.html',
})
export class LmsLessonView {
  private route = inject(ActivatedRoute);
  private enrollment = inject(LmsEnrollmentService);
  private http = inject(HttpClient);
  protected ui = inject(UiTextService).localized(getLmsLessonViewUiText);
  protected currentLang = inject(UiTextService).currentLang;
  protected lesson = signal<any>(null);

  constructor() {
    this.route.paramMap.subscribe((p) => {
      const id = Number(p.get('id'));
      this.http.get(`/api/lms/lesson/${id}/`).subscribe((l: any) => {
        this.lesson.set(l);
        this.enrollment.startLesson(id).subscribe();
      });
    });
  }

  protected completeLesson(): void {
    const l = this.lesson();
    if (!l) return;
    this.enrollment.completeLesson(l.id, 100).subscribe();
  }
}
```

- [ ] **Step 3: Block-renderers** — 8 small OnPush components, all taking `input<ContentBlock>('block')`.

**`rich-text-block-renderer.ts`:**
```typescript
@Component({
  selector: 'app-block-rich-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div [innerHTML]="safeHtml()"></div>`,
})
export class RichTextBlockRenderer {
  private sanitizer = inject(DomSanitizer);
  private lang = inject(UiTextService).currentLang;
  block = input.required<ContentBlock>();
  protected safeHtml = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(
      pickTranslation(this.block().translations, this.lang(), 'rich_text')
    )
  );
}
```

The backend already sanitized this on save (Task 48) — `bypassSecurityTrustHtml` is safe here.

**`image-block-renderer.ts`:**
```typescript
@Component({
  selector: 'app-block-image',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<img [src]="block().image" [alt]="alt()" />`,
})
export class ImageBlockRenderer {
  private lang = inject(UiTextService).currentLang;
  block = input.required<ContentBlock>();
  protected alt = computed(() => pickTranslation(this.block().translations, this.lang(), 'title'));
}
```

**`video-block-renderer.ts`:**
```typescript
@Component({
  selector: 'app-block-video',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (block().video_provider) {
      @case ('youtube') { <iframe [src]="embedUrl()" frameborder="0" allowfullscreen></iframe> }
      @case ('vimeo')   { <iframe [src]="embedUrl()" frameborder="0" allowfullscreen></iframe> }
      @case ('upload')  { <video controls [src]="block().video_url"></video> }
    }
  `,
})
export class VideoBlockRenderer {
  private sanitizer = inject(DomSanitizer);
  block = input.required<ContentBlock>();
  protected embedUrl = computed(() => {
    const b = this.block();
    // Naive YouTube/Vimeo embed URL builder — refine at implementation time.
    return this.sanitizer.bypassSecurityTrustResourceUrl(b.video_url);
  });
}
```

**`file-block-renderer.ts`:**
```typescript
@Component({
  selector: 'app-block-file',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<a [href]="block().file" download><i class="pi pi-download"></i> {{ label() }}</a>`,
})
export class FileBlockRenderer {
  private lang = inject(UiTextService).currentLang;
  private ui = inject(UiTextService).localized(getLmsLessonViewUiText);
  block = input.required<ContentBlock>();
  protected label = computed(() =>
    pickTranslation(this.block().translations, this.lang(), 'title') || this.ui().downloadFileFallback
  );
}
```

**`quiz-block-renderer.ts`:**
```typescript
@Component({
  selector: 'app-block-quiz',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-quiz-play [templateId]="block().quiz_template!" />`,
})
export class QuizBlockRenderer {
  block = input.required<ContentBlock>();
}
```

(Reuse the existing `<app-quiz-play>` from `components/quiz-play/quiz-play`.)

**`callout-block-renderer.ts`:**
```typescript
@Component({
  selector: 'app-block-callout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<aside class="callout"><strong>{{ title() }}</strong><p>{{ body() }}</p></aside>`,
})
export class CalloutBlockRenderer {
  private lang = inject(UiTextService).currentLang;
  block = input.required<ContentBlock>();
  protected title = computed(() => pickTranslation(this.block().translations, this.lang(), 'title'));
  protected body = computed(() => pickTranslation(this.block().translations, this.lang(), 'callout_text'));
}
```

**`code-block-renderer.ts`:**
```typescript
@Component({
  selector: 'app-block-code',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<pre><code [attr.data-language]="block().code_language">{{ block().code_content }}</code></pre>`,
})
export class CodeBlockRenderer {
  block = input.required<ContentBlock>();
}
```

**`embed-block-renderer.ts`:**
```typescript
@Component({
  selector: 'app-block-embed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<iframe [src]="safeUrl()" frameborder="0"></iframe>`,
})
export class EmbedBlockRenderer {
  private sanitizer = inject(DomSanitizer);
  block = input.required<ContentBlock>();
  protected safeUrl = computed(() => this.sanitizer.bypassSecurityTrustResourceUrl(this.block().external_url));
}
```

- [ ] **Step 4: Template `lesson-view.html`**

```html
@if (lesson(); as l) {
  <h1>{{ title() }}</h1>
  @for (block of l.blocks; track block.id) {
    @switch (block.block_type) {
      @case ('rich_text') { <app-block-rich-text [block]="block" /> }
      @case ('image')     { <app-block-image [block]="block" /> }
      @case ('video')     { <app-block-video [block]="block" /> }
      @case ('file')      { <app-block-file [block]="block" /> }
      @case ('quiz')      { <app-block-quiz [block]="block" /> }
      @case ('callout')   { <app-block-callout [block]="block" /> }
      @case ('code')      { <app-block-code [block]="block" /> }
      @case ('embed')     { <app-block-embed [block]="block" /> }
    }
  }
  <p-button (onClick)="completeLesson()" [label]="ui().markCompletedButton" />
}
```

- [ ] **Step 5: Commit**

```bash
git add quizonline-frontend/src/app/pages/lms/lesson-view/
git commit -m "feat(frontend/lms): lesson-view + 8 block-renderers (rich_text/image/video/file/quiz/callout/code/embed)"
```

---

### Task 60: Progress page (table of my courses)

**Files:**
- Modify: `quizonline-frontend/src/app/pages/lms/progress/progress.{ts,html,i18n.ts}`

- [ ] **Step 1: i18n file** — column headers "Course", "Domain", "Progress", "Last activity", "Status", empty state, all 5 langs.

- [ ] **Step 2: Component**

```typescript
@Component({
  selector: 'app-lms-progress',
  imports: [CommonModule, TableModule, ProgressBarModule, TagModule, RouterLink, DatePipe],
  templateUrl: './progress.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsProgress {
  private enrollment = inject(LmsEnrollmentService);
  private uiSvc = inject(UiTextService);
  protected ui = this.uiSvc.localized(getLmsProgressUiText);
  protected common = this.uiSvc.localized(getLmsCommonUiText);
  protected rows = signal<any[]>([]);

  constructor() {
    this.enrollment.myProgress().subscribe((r) => this.rows.set(r.results ?? r));
  }
}
```

- [ ] **Step 3: Template** — `<p-table>` with `[value]="rows()"` rendering progress bar in cell + `| relativeDate` + status badge.

- [ ] **Step 4: Commit**

```bash
git add quizonline-frontend/src/app/pages/lms/progress/
git commit -m "feat(frontend/lms): progress page (my courses with progress bars)"
```

---

### Task 61: Certificate-list + certificate-view + certificate-verify pages

**Files:**
- Modify: `pages/lms/certificate-list/certificate-list.{ts,html,i18n.ts}`
- Modify: `pages/lms/certificate-view/certificate-view.{ts,html,i18n.ts}`
- Modify: `pages/lms/certificate-verify/certificate-verify.{ts,html,i18n.ts}`

- [ ] **Step 1: certificate-list — `<p-table>` listing certificates with "Download PDF" + "Public link" actions.** i18n strings for all column headers and buttons in 5 langs.

- [ ] **Step 2: certificate-view — show certificate number, issue date (exact, NOT relativeDate, per CLAUDE.md exception), download button.**

- [ ] **Step 3: certificate-verify — public page (no `authGuard`). Reads `:token` from URL, calls `LmsEnrollmentService.verify(token)`, displays:**

```html
@if (result(); as r) {
  @if (r.valid) {
    <p-card>
      <h1>{{ ui().validHeading }}</h1>
      <p>{{ ui().issuedTo }}: <strong>{{ r.user_display_name }}</strong></p>
      <p>{{ ui().course }}: <strong>{{ r.course_title }}</strong></p>
      <p>{{ ui().issuedOn }}: {{ r.issued_at | date:'medium' }}</p>
      <p>{{ ui().certificateNumber }}: {{ r.certificate_number }}</p>
    </p-card>
  } @else {
    <p-card><h1>{{ ui().invalidHeading }}</h1><p>{{ ui().invalidMessage }}</p></p-card>
  }
}
```

All strings in `certificate-verify.i18n.ts` in 5 langs.

- [ ] **Step 4: Commit**

```bash
git add quizonline-frontend/src/app/pages/lms/certificate-list/ quizonline-frontend/src/app/pages/lms/certificate-view/ quizonline-frontend/src/app/pages/lms/certificate-verify/
git commit -m "feat(frontend/lms): certificate-list + view + public verify pages"
```

---

### Task 62: Add LMS entries in main navigation menu

**Files:**
- Modify: the existing top-nav / sidebar component (find via `grep -rn "domain-list\|user-list" quizonline-frontend/src/app/components/ quizonline-frontend/src/app/app.html` — locate the nav block) and append LMS entries.

- [ ] **Step 1: Locate the nav file**

Run: `grep -rn "domain/list" quizonline-frontend/src/app/components/ quizonline-frontend/src/app/`

- [ ] **Step 2: Add four nav links**

```html
<a [routerLink]="LMS_CATALOG"      [routerLinkActive]="'active'">{{ nav().lmsCatalog }}</a>
<a [routerLink]="LMS_ME_PROGRESS"  [routerLinkActive]="'active'">{{ nav().lmsMyProgress }}</a>
<a [routerLink]="LMS_ME_CERTIFICATES" [routerLinkActive]="'active'">{{ nav().lmsMyCertificates }}</a>
```

Add the matching i18n keys to the nav's i18n file (5 langs).

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(frontend): expose LMS catalog/progress/certificates in main navigation"
```

---

### Task 63: Frontend learner-side smoke check

- [ ] **Step 1: Start dev server**

```powershell
cd quizonline-frontend
npm start
```

- [ ] **Step 2: Manual smoke test (with `python manage.py seed_lms_demo` data)**

1. Log in as a member of "Demo Domain"
2. `/lms/catalog` → see "Introduction to Python"
3. Click → `/lms/course/demo-python` → see one lesson
4. Click "Enroll" → toast OK
5. Click lesson → `/lms/lesson/N` → see the rich-text block
6. Click "Mark completed" → progress 100%
7. Visit `/lms/me/progress` → row at 100%
8. Visit `/lms/me/certificates` → see the certificate
9. Open the public `/lms/verify/<token>` in an incognito window → valid

- [ ] **Step 3: No commit unless fixes were needed.**

---

## Phase 14 — Frontend instructor pages

### Task 64: Course-edit shell with tabs

**Files:**
- Modify: `quizonline-frontend/src/app/pages/lms/course-edit/course-edit.{ts,html,scss,i18n.ts}`
- Create: `pages/lms/course-edit/tabs/info-tab/info-tab.{ts,html,i18n.ts}`
- Create: `pages/lms/course-edit/tabs/structure-tab/structure-tab.{ts,html,i18n.ts}`
- Create: `pages/lms/course-edit/tabs/enrollment-tab/enrollment-tab.{ts,html,i18n.ts}`
- Create: `pages/lms/course-edit/tabs/analytics-tab/analytics-tab.{ts,html,i18n.ts}`

- [ ] **Step 1: Shell with `<p-tabs>`**

```typescript
@Component({
  selector: 'app-lms-course-edit',
  imports: [CommonModule, TabsModule, RouterOutlet, /* the 4 tab components */],
  templateUrl: './course-edit.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCourseEdit {
  private route = inject(ActivatedRoute);
  protected ui = inject(UiTextService).localized(getLmsCourseEditUiText);
  protected courseId = signal<number>(0);

  constructor() {
    this.route.paramMap.subscribe((p) => this.courseId.set(Number(p.get('id'))));
  }
}
```

`course-edit.html`:

```html
<h1>{{ ui().pageTitle }}</h1>
<p-tabs>
  <p-tabPanel [header]="ui().tabInfo"><app-info-tab [courseId]="courseId()" /></p-tabPanel>
  <p-tabPanel [header]="ui().tabStructure"><app-structure-tab [courseId]="courseId()" /></p-tabPanel>
  <p-tabPanel [header]="ui().tabEnrollment"><app-enrollment-tab [courseId]="courseId()" /></p-tabPanel>
  <p-tabPanel [header]="ui().tabAnalytics"><app-analytics-tab [courseId]="courseId()" /></p-tabPanel>
</p-tabs>
```

`course-edit.i18n.ts` provides `pageTitle`, `tabInfo`, `tabStructure`, `tabEnrollment`, `tabAnalytics` in 5 langs.

- [ ] **Step 2: Info tab** — form for slug, level, language, enrollment_mode, cover_image, AND translation tabs (one `<p-tabs>` of FR/EN/NL/IT/ES filtered to `available_lang_codes`) for title/description/learning_objectives. On submit → `LmsCatalogService.update(id, payload)`.

- [ ] **Step 3: Structure tab** — render sections + lessons as `<p-orderList>` with drag handles. Reorder calls `reorderSections` / `reorderLessons`. Add "+ New section" / "+ New lesson" buttons. Each lesson has a "Edit content" link to `/lms/lesson/:id/edit`.

- [ ] **Step 4: Enrollment tab** — `<p-table>` of enrollments with status filter (`<p-select>`), bulk approve/reject actions calling the API. i18n strings for column headers and dialogs.

- [ ] **Step 5: Analytics tab** — basic stats: counts of enrollments / completions / average score / completion rate. Read from `/api/lms/course/{id}/` (extend serializer to compute these if not already; otherwise compute via DB annotate in `CourseDetailSerializer`).

- [ ] **Step 6: Commit**

```bash
git add quizonline-frontend/src/app/pages/lms/course-edit/
git commit -m "feat(frontend/lms): course-edit shell with 4 tabs (info / structure / enrollment / analytics)"
```

---

### Task 65: Lesson-edit shell + block list with cdk-drag-drop

**Files:**
- Modify: `pages/lms/lesson-edit/lesson-edit.{ts,html,scss,i18n.ts}`
- Create: `pages/lms/lesson-edit/block-editors/` (8 components, Task 66)

- [ ] **Step 1: Shell**

```typescript
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ButtonModule } from 'primeng/button';
import { HttpClient } from '@angular/common/http';

import { LmsCatalogService } from '../../../services/lms/lms-catalog.service';
import { UiTextService } from '../../../shared/i18n/ui-text.service';
import { getLmsLessonEditUiText } from './lesson-edit.i18n';
import { getLmsCommonUiText, BlockType } from '../../../shared/lms/lms-common.i18n';
import { BLOCK_ICONS } from '../../../shared/lms/block-icons';
// + import each *-block-editor

@Component({
  selector: 'app-lms-lesson-edit',
  imports: [CommonModule, DragDropModule, ButtonModule, /* 8 block-editor components */],
  templateUrl: './lesson-edit.html',
  styleUrl: './lesson-edit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsLessonEdit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private catalog = inject(LmsCatalogService);
  protected ui = inject(UiTextService).localized(getLmsLessonEditUiText);
  protected common = inject(UiTextService).localized(getLmsCommonUiText);

  protected lessonId = signal(0);
  protected blocks = signal<any[]>([]);

  constructor() {
    this.route.paramMap.subscribe((p) => {
      this.lessonId.set(Number(p.get('id')));
      this.reload();
    });
  }

  protected blockTypes: { value: BlockType; icon: string }[] = [
    { value: 'rich_text', icon: BLOCK_ICONS.rich_text },
    { value: 'image',     icon: BLOCK_ICONS.image },
    { value: 'video',     icon: BLOCK_ICONS.video },
    { value: 'file',      icon: BLOCK_ICONS.file },
    { value: 'quiz',      icon: BLOCK_ICONS.quiz },
    { value: 'callout',   icon: BLOCK_ICONS.callout },
    { value: 'code',      icon: BLOCK_ICONS.code },
    { value: 'embed',     icon: BLOCK_ICONS.embed },
  ];

  protected reload(): void {
    this.http.get(`/api/lms/lesson/${this.lessonId()}/`).subscribe((l: any) => this.blocks.set(l.blocks));
  }

  protected addBlock(type: BlockType): void {
    const order = this.blocks().length;
    this.http.post('/api/lms/block/', {
      lesson: this.lessonId(),
      block_type: type,
      order,
      translations: {},
    }).subscribe(() => this.reload());
  }

  protected deleteBlock(id: number): void {
    this.http.delete(`/api/lms/block/${id}/`).subscribe(() => this.reload());
  }

  protected onDrop(event: CdkDragDrop<any[]>): void {
    const list = [...this.blocks()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.blocks.set(list);
    this.catalog.reorderBlocks(this.lessonId(), list.map((b) => b.id)).subscribe();
  }

  protected onBlockChanged(blockId: number, patch: Partial<any>): void {
    this.http.patch(`/api/lms/block/${blockId}/`, patch).subscribe();
  }
}
```

- [ ] **Step 2: Template `lesson-edit.html`**

```html
<h1>{{ ui().pageTitle }}</h1>

<div cdkDropList (cdkDropListDropped)="onDrop($event)">
  @for (block of blocks(); track block.id) {
    <div cdkDrag class="block-card">
      <p-button icon="pi pi-arrows-v" cdkDragHandle severity="secondary" />
      <span><i [class]="block.block_type | blockIcon"></i> {{ common().blockTypeLabels[block.block_type] }}</span>

      @switch (block.block_type) {
        @case ('rich_text') { <app-rich-text-block-editor [block]="block" (changed)="onBlockChanged(block.id, $event)" /> }
        @case ('image')     { <app-image-block-editor     [block]="block" (changed)="onBlockChanged(block.id, $event)" /> }
        @case ('video')     { <app-video-block-editor     [block]="block" (changed)="onBlockChanged(block.id, $event)" /> }
        @case ('file')      { <app-file-block-editor      [block]="block" (changed)="onBlockChanged(block.id, $event)" /> }
        @case ('quiz')      { <app-quiz-block-editor      [block]="block" (changed)="onBlockChanged(block.id, $event)" /> }
        @case ('callout')   { <app-callout-block-editor   [block]="block" (changed)="onBlockChanged(block.id, $event)" /> }
        @case ('code')      { <app-code-block-editor      [block]="block" (changed)="onBlockChanged(block.id, $event)" /> }
        @case ('embed')     { <app-embed-block-editor     [block]="block" (changed)="onBlockChanged(block.id, $event)" /> }
      }

      <p-button icon="pi pi-trash" severity="danger" size="small" (onClick)="deleteBlock(block.id)"
                [attr.aria-label]="ui().deleteBlockAria" />
    </div>
  }
</div>

<div class="add-block-bar" [attr.aria-label]="ui().addBlockBarLabel">
  @for (t of blockTypes; track t.value) {
    <p-button [label]="common().blockTypeLabels[t.value]" [icon]="t.icon"
              severity="secondary" (onClick)="addBlock(t.value)" />
  }
</div>
```

- [ ] **Step 3: i18n file** — `pageTitle`, `addBlockBarLabel`, `deleteBlockAria`, `reorderToastSuccess`, etc., in 5 langs.

- [ ] **Step 4: Commit** (will fail to compile until Task 66 ships the editors — keep this commit on its own branch or merge together)

```bash
git add quizonline-frontend/src/app/pages/lms/lesson-edit/
git commit -m "feat(frontend/lms): lesson-edit shell + cdk-drag-drop block list"
```

---

### Task 66: Eight block-editor components

**Files:** create 8 components under `pages/lms/lesson-edit/block-editors/`. Each is OnPush with `input.required<ContentBlock>('block')` and `output<Partial<ContentBlock>>('changed')`. Each emits via a debounced subject (500 ms).

- [ ] **Step 1: `rich-text-block-editor` (the reference implementation)**

```typescript
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorModule } from 'primeng/editor';
import { TabsModule } from 'primeng/tabs';
import { Subject, debounceTime } from 'rxjs';

import { ContentBlock } from '../../../../shared/lms/content-block.types';
import { UiTextService } from '../../../../shared/i18n/ui-text.service';
import { getLmsLessonEditUiText } from '../lesson-edit.i18n';

@Component({
  selector: 'app-rich-text-block-editor',
  imports: [CommonModule, FormsModule, EditorModule, TabsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-tabs>
      @for (lang of availableLangs(); track lang) {
        <p-tabPanel [header]="lang.toUpperCase()">
          <p-editor [ngModel]="bodyFor(lang)"
                    (ngModelChange)="onChange(lang, $event)"
                    [style]="{height: '200px'}" />
        </p-tabPanel>
      }
    </p-tabs>
  `,
})
export class RichTextBlockEditor implements OnInit {
  block = input.required<ContentBlock>();
  changed = output<Partial<ContentBlock>>();
  protected ui = inject(UiTextService).localized(getLmsLessonEditUiText);

  // available langs come from the parent course's allowed_lang_codes, passed via a separate input
  // (refactor lesson-edit to fetch lesson.available_lang_codes and forward to each editor).
  availableLangs = input<string[]>(['fr', 'en']);

  private debouncer$ = new Subject<Partial<ContentBlock>>();
  ngOnInit() {
    this.debouncer$.pipe(debounceTime(500)).subscribe((patch) => this.changed.emit(patch));
  }

  protected bodyFor(lang: string): string {
    return this.block().translations?.[lang]?.['rich_text'] ?? '';
  }

  protected onChange(lang: string, value: string): void {
    const tr = { ...(this.block().translations ?? {}) };
    tr[lang] = { ...(tr[lang] ?? {}), rich_text: value };
    this.debouncer$.next({ translations: tr });
  }
}
```

- [ ] **Step 2: Seven more editors** — each follows the same shell, with these specifics:

| Block type | Editable fields | PrimeNG widget |
|------------|-----------------|----------------|
| image | `image` (file upload) + `title` per lang | `<p-fileUpload mode="advanced" accept="image/*">` |
| video | `video_url`, `video_provider`, `title` per lang | `<input pInputText>` for URL + `<p-select>` for provider |
| file | `file` (file upload) + `title` per lang | `<p-fileUpload mode="basic">` |
| quiz | `quiz_template` (FK pick) | `<p-select [options]="quizTemplates">` (load via `/api/quiz/template/`) |
| callout | `title` + `callout_text` per lang | `<input>` + `<textarea>` |
| code | `code_language`, `code_content` (not translated) | `<p-select>` + `<textarea>` |
| embed | `external_url` (not translated) + `title` per lang | `<input>` |

For each, the component:
1. Takes `block` (input) and emits `changed` (output) — same Subject + debounce pattern.
2. Renders editable inputs for its type-specific fields.
3. If translatable fields exist, wraps in `<p-tabs>` keyed by `availableLangs()`.
4. Uses i18n labels for placeholders and aria-labels — extend `lesson-edit.i18n.ts` with all of them in 5 langs.

- [ ] **Step 3: Wire the editors in `lesson-edit.ts` imports** (already templated in Task 65).

- [ ] **Step 4: Commit**

```bash
git add quizonline-frontend/src/app/pages/lms/lesson-edit/block-editors/
git commit -m "feat(frontend/lms): 8 block-editor components with per-lang translation tabs"
```

---

### Task 67: File upload helper for image / file block-editors

**Files:**
- Create: `quizonline-frontend/src/app/services/lms/lms-upload.service.ts`

- [ ] **Step 1: Service**

```typescript
@Injectable({ providedIn: 'root' })
export class LmsUploadService {
  private http = inject(HttpClient);
  uploadImageForBlock(blockId: number, file: File) {
    const fd = new FormData();
    fd.append('image', file);
    return this.http.patch(`/api/lms/block/${blockId}/`, fd);
  }
  uploadFileForBlock(blockId: number, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.patch(`/api/lms/block/${blockId}/`, fd);
  }
}
```

- [ ] **Step 2: Wire into image and file block-editors** so the `<p-fileUpload>` `onSelect` handler calls the service and emits `changed` with the resulting URL.

- [ ] **Step 3: Commit**

```bash
git add quizonline-frontend/src/app/services/lms/lms-upload.service.ts
git commit -m "feat(frontend/lms): upload helper for image/file block fields"
```

---

### Task 68: Instructor smoke test

- [ ] **Step 1: Manual flow**

1. Log in as `lms-demo-owner` (domain owner)
2. `/lms/course/demo-python/edit`
3. Info tab: change title in FR → save → toast OK
4. Structure tab: add a section, add a lesson, click "Edit content"
5. `/lms/lesson/N/edit` → add a `rich_text` block, write content → save → reload page → block persists
6. Drag a second block above the first → order persists after reload
7. Add a `quiz` block linking to an existing QuizTemplate of the same domain → save
8. Publish the course from the Info tab → status badge updates

- [ ] **Step 2: No commit unless fixes needed.**

---

### Task 69: Frontend "no hardcoded strings" check (CI grep)

**Files:**
- Modify: any existing CI script (e.g. `package.json` `scripts.test` or `pre-commit`) to add a grep guard

- [ ] **Step 1: Add a grep guard**

Inside `quizonline-frontend/package.json`, add to `scripts`:

```json
"check-i18n-lms": "node scripts/check-no-hardcoded-strings.mjs"
```

Create `quizonline-frontend/scripts/check-no-hardcoded-strings.mjs`:

```javascript
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src/app/pages/lms';
const BAD = /label="[A-Z][a-zà-ÿ ]{2,}"|>\s*[A-Z][a-zà-ÿ ]{2,}\s*</g;
let bad = 0;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (p.endsWith('.html')) {
      const content = readFileSync(p, 'utf8');
      const matches = content.match(BAD);
      if (matches) {
        console.error(`[!] ${p}:`, matches);
        bad++;
      }
    }
  }
}
walk(ROOT);
if (bad > 0) {
  console.error(`Found hardcoded strings in ${bad} LMS templates.`);
  process.exit(1);
}
console.log('No hardcoded user-facing strings detected.');
```

- [ ] **Step 2: Run + fix any false positives**

```powershell
cd quizonline-frontend
node scripts/check-no-hardcoded-strings.mjs
```

- [ ] **Step 3: Commit**

```bash
git add quizonline-frontend/scripts/ quizonline-frontend/package.json
git commit -m "ci(frontend/lms): grep guard for hardcoded user-facing strings in LMS pages"
```

---

### Task 70: TypeScript + lint clean run

- [ ] **Step 1: Type check**

Run: `cd quizonline-frontend && npm run typecheck` (or `tsc --noEmit` per existing scripts)
Expected: no errors.

- [ ] **Step 2: Lint**

Run: `cd quizonline-frontend && npm run lint`
Expected: no LMS-related errors.

- [ ] **Step 3: Build**

Run: `cd quizonline-frontend && npm run build`
Expected: successful production build, LMS chunks visible in output.

- [ ] **Step 4: No commit unless fixes needed.**

---

## Phase 15 — End-to-end smoke and docs

### Task 71: Full end-to-end smoke test (manual, scripted)

- [ ] **Step 1: Reset DB to a fresh state**

```powershell
cd quizonline-server
python manage.py migrate
python manage.py seed_lms_demo
python manage.py createsuperuser   # or reuse the demo owner
```

- [ ] **Step 2: Run servers**

```powershell
# terminal 1
cd quizonline-server
python manage.py runserver

# terminal 2
cd quizonline-frontend
npm start
```

- [ ] **Step 3: Execute the full path**

1. Log in as the demo owner
2. `/lms/catalog` → see the demo course
3. `/lms/course/demo-python/edit` → publish (if not already)
4. Log out, log in as a new learner (member of the demo domain)
5. `/lms/catalog` → see the demo course; click → enroll
6. Open the lesson → mark complete
7. `/lms/me/progress` → 100 %
8. `/lms/me/certificates` → certificate listed; copy the verify link
9. Open verify link in a private window (no auth) → page renders "Valid certificate"
10. As owner, revoke the certificate from the admin → re-open the verify link → page renders "Revoked"

- [ ] **Step 4: No commit unless fixes needed.**

---

### Task 72: Update `CLAUDE.md` with LMS section

**Files:**
- Modify: `CLAUDE.md` (root)

- [ ] **Step 1: Append a section right after the Phase D block**

```markdown
## Domain features (Phase E — LMS)

LMS lives in three split apps:

- `lms_catalog/` : Course / Section / Lesson / ContentBlock (parler-translated). All content scoped to a Domain. ContentBlock has 8 types (rich_text / image / video / file / quiz / callout / code / embed) validated by `.clean()`.
- `lms_enrollment/` : CourseEnrollment / LessonProgress / CourseProgress / Certificate. Services handle the lifecycle: `enroll_user_to_course` (3 modes), `mark_lesson_completed`, `calculate_course_progress`, `issue_certificate_if_eligible`. Celery + reportlab render the certificate PDF.
- `lms_assessment/` : LessonQuiz bridge to `quiz.QuizTemplate`. `post_save` signal on `quiz.Quiz` propagates passing scores to `lms_enrollment.mark_lesson_completed`.

Rôles : superuser = admin ; Domain owner/manager = instructor ; Domain member = learner. Aucune nouvelle table de permission.

Toutes les traductions de contenu (Course/Section/Lesson/ContentBlock) sont contraintes aux `Domain.allowed_languages`.

Endpoints clés sous `/api/lms/` :
- `course/`, `section/`, `lesson/`, `block/` (CRUD + reorder + publish/clone)
- `enrollment/`, `course/{id}/enroll/`, `lesson/{id}/start/`, `lesson/{id}/complete/`
- `progress/`, `me/progress/`
- `certificate/`, `certificate/{id}/pdf/`, `verify/{token}/` (publique)
- `validation-quiz/`

Frontend pages sous `pages/lms/`. Lesson builder = `cdk-drag-drop` ; reorder Section/Lesson = `<p-orderList>`. Block renderers et editors séparés sous `lesson-view/block-renderers/` et `lesson-edit/block-editors/`.

Throttle scopes env-overridable et seedés via SSM : `THROTTLE_LMS_ENROLL`, `THROTTLE_LMS_BLOCK_WRITE`, `THROTTLE_LMS_CERT_VERIFY`.

Spec : [docs/superpowers/specs/2026-05-18-lms-app-design.md](docs/superpowers/specs/2026-05-18-lms-app-design.md).
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(lms): add Phase E LMS section to root CLAUDE.md"
```

---

### Task 73: Final cross-check + PR opening

- [ ] **Step 1: Full backend test run**

Run: `cd quizonline-server && pytest -q`

- [ ] **Step 2: Full frontend build**

Run: `cd quizonline-frontend && npm run build`

- [ ] **Step 3: OpenAPI sync up to date**

Run:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-openapi.ps1
git diff --exit-code  # should be clean
```

- [ ] **Step 4: Open PR**

Push the branch and open a PR. PR description points to the spec + this plan. Add a checklist of the 73 tasks with the ones marked completed.

---

## Definition of done

- All three apps installed, migrations applied
- Models pass `python manage.py makemigrations --dry-run --check`
- DRF endpoints documented in the spec implemented, OpenAPI regenerated, TS client used in Angular
- Permission matrix tests pass (T44)
- ContentBlock `.clean()` covers all 8 types — happy + failure paths (T10)
- Certificate PDF rendering works in dev (T28) and via Celery in prod
- Frontend pages render in all 5 languages with no hardcoded user-facing strings (`check-no-hardcoded-strings.mjs` passes)
- `seed_lms_demo` produces a coherent demo dataset
- `CLAUDE.md`, `deploy/README.md`, both `.env.example` updated
- SSM keys seeded in production (T49 procedure)
- Manual smoke test (T71) green

## Deferred decisions (per spec)

1. Code-block syntax highlighting (reportlab/`<p-editor>` first, highlight.js only if insufficient)
2. Bleach vs nh3 — `nh3` chosen (Task 48)
3. Final quiz order vs lesson order — final last (current behaviour)
4. Certificate auto-reissue after revocation — yes (partial unique constraint permits it)
5. `Lesson.is_required` flag — deferred to a v2 LMS plan

