# LMS authoring editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an instructor build a course (sections, lessons, content) from one two-pane editor, with inline creation and machine-translated titles, instead of dialogs and page round-trips.

**Architecture:** Server adds a `move` action for lessons and a Celery task that fills empty translations after create. The Angular `course-edit` page keeps its tabs (state in `?tab=`); its "content" tab becomes a two-pane editor: a `CourseOutline` (inline create / rename / "⋯" menu) on the left and a `LessonContentEditor` (extracted from `lesson-edit`) on the right, selected through `?lesson=`.

**Tech Stack:** Django 6 + DRF + Celery + django-parler, drf-spectacular 0.30.0; Angular 21 (signals, OnPush, standalone), PrimeNG, `@angular/cdk/drag-drop`, Vitest unit tests, Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-10-15-lms-authoring-editor-design.md`

## Global Constraints

- Work in the worktree `D:\Projects\PycharmProjects\QuizOnline-wt-editor`, branch `feat/lms-authoring-editor` (one branch per PR: see "Delivery" at the end).
- Python: `D:\Projects\PycharmProjects\QuizOnline\.venv\Scripts\python.exe` (drf-spectacular **0.30.0**). Tests: `DJANGO_ENV=test python -m pytest … -p no:cacheprovider --basetemp=<scratch dir>` from `quizonline-server/`.
- OpenAPI regen after any serializer / URL change: `python manage.py spectacular --file openapi.yaml`, copy to `quizonline-frontend/openapi.yaml`, then the `openapi-generator-cli` command from `scripts/sync-openapi.ps1`. Commit only files whose content really changed (`git diff --ignore-cr-at-eol --numstat`).
- Frontend conventions (`CLAUDE.md`): OnPush, `inject()`, signals, `input()` / `output()`, no `standalone: true`, `<app-status-badge>` for every state, row-action buttons `size="small"` + `tooltipPosition="top"`.
- Every new UI label in FR, EN, NL, IT, ES (`public/i18n/*.json`); new page dictionaries registered in `scripts/check-i18n.ts`; `npm run check:i18n` must report `0 missing`.
- Sections and lessons are still created as **drafts** (publication model unchanged).
- Machine translation fills **only empty** values and never blocks a create.

## Review Focus

- **Inline create with Enter pressed twice fast** → one request only (input disabled while in flight). Test in Task 6.
- **`?lesson=` pointing at a lesson of another course or a deleted lesson** → empty state + toast, no crash. Test in Task 7.
- **Course language not among the domain's allowed languages / domain with a single language** → translation task is a no-op, no DeepL call. Test in Task 3.
- **Moving a lesson to the end (`position` > length) or to position 0** → clamped, orders dense. Test in Task 1.
- **Renaming to an empty / whitespace title** → no request, original title restored. Test in Task 6.

---

## PR 1 — Server

### Task 1: `move_lesson` service

**Files:**
- Modify: `quizonline-server/lesson/services.py`
- Modify: `quizonline-server/lesson/serializers.py` (import the slug helpers from services instead of defining them)
- Test: `quizonline-server/lesson/tests/test_services_move.py`

**Interfaces:**
- Produces: `lesson.services.unique_lesson_slug(section, base: str) -> str`, `lesson.services.lesson_slug_base(slug: str | None, translations: dict, course) -> str` (moved from `lesson/serializers.py`, renamed without the leading underscore), `lesson.services.move_lesson(*, lesson: Lesson, section: Section, position: int) -> Lesson`.

- [ ] **Step 1: Write the failing tests**

```python
# quizonline-server/lesson/tests/test_services_move.py
import pytest
from django.core.exceptions import ValidationError

from block.models import Block
from course.models import Course, Section
from lesson.models import Lesson
from lesson.services import move_lesson


def _lessons(section):
    return list(section.lessons.order_by("order").values_list("slug", "order"))


@pytest.fixture
def two_sections(course):
    s1 = Section.objects.create(course=course, order=0)
    s2 = Section.objects.create(course=course, order=1)
    for i, slug in enumerate(["a", "b", "c"]):
        Lesson.objects.create(section=s1, slug=slug, order=i)
    for i, slug in enumerate(["x", "y"]):
        Lesson.objects.create(section=s2, slug=slug, order=i)
    return s1, s2


@pytest.mark.django_db
def test_move_across_sections_keeps_blocks_and_densifies(two_sections):
    s1, s2 = two_sections
    b = Lesson.objects.get(section=s1, slug="b")
    Block.objects.create(host=b, type="rich_text", order=0)
    move_lesson(lesson=b, section=s2, position=1)
    assert _lessons(s1) == [("a", 0), ("c", 1)]
    assert _lessons(s2) == [("x", 0), ("b", 1), ("y", 2)]
    assert Block.objects.filter(object_id=b.id).count() == 1


@pytest.mark.django_db
@pytest.mark.parametrize("position,expected", [
    (0, [("b", 0), ("x", 1), ("y", 2)]),
    (99, [("x", 0), ("y", 1), ("b", 2)]),
])
def test_move_position_is_clamped(two_sections, position, expected):
    s1, s2 = two_sections
    move_lesson(lesson=Lesson.objects.get(section=s1, slug="b"), section=s2, position=position)
    assert _lessons(s2) == expected


@pytest.mark.django_db
def test_move_makes_slug_unique_in_target(two_sections):
    s1, s2 = two_sections
    Lesson.objects.create(section=s2, slug="a", order=2)
    move_lesson(lesson=Lesson.objects.get(section=s1, slug="a"), section=s2, position=3)
    assert [slug for slug, _ in _lessons(s2)] == ["x", "y", "a", "a-2"]


@pytest.mark.django_db
def test_move_within_same_section_reorders(two_sections):
    s1, _ = two_sections
    move_lesson(lesson=Lesson.objects.get(section=s1, slug="a"), section=s1, position=2)
    assert _lessons(s1) == [("b", 0), ("c", 1), ("a", 2)]


@pytest.mark.django_db
def test_move_to_other_course_is_rejected(two_sections, domain, fr_lang):
    s1, _ = two_sections
    other = Course(domain=domain, slug="other", language=fr_lang, level=Course.LEVEL_BEGINNER)
    other.set_current_language("fr")
    other.title = "Other"
    other.save()
    foreign = Section.objects.create(course=other, order=0)
    with pytest.raises(ValidationError):
        move_lesson(lesson=Lesson.objects.get(section=s1, slug="a"), section=foreign, position=0)
```

Check the `Block` generic-FK field names in `block/models.py` before running (`host` / `object_id` are the expected names; adjust the two `Block` lines to the real field names if they differ). Fixtures `course`, `domain`, `fr_lang` come from `lesson/tests/conftest.py` (same as `course/tests/conftest.py`; copy them there if missing).

- [ ] **Step 2: Run to verify failure**

Run: `DJANGO_ENV=test python -m pytest lesson/tests/test_services_move.py -q -p no:cacheprovider`
Expected: FAIL — `ImportError: cannot import name 'move_lesson'`.

- [ ] **Step 3: Implement**

Move `_SLUG_BASE_MAX`, `_lesson_slug_base` and `_unique_lesson_slug` from `lesson/serializers.py` into `lesson/services.py` as `lesson_slug_base` / `unique_lesson_slug` (same bodies), import them in `lesson/serializers.py`, then add:

```python
# quizonline-server/lesson/services.py
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.utils.translation import gettext_lazy as _

from core.services import compact, two_phase_reorder


@transaction.atomic
def move_lesson(*, lesson: Lesson, section, position: int) -> Lesson:
    """Move ``lesson`` into ``section`` at ``position`` (clamped to the end).

    Blocks, progress and quiz bindings stay attached (FKs unchanged). The
    slug is made unique in the target section, and both sections end up
    with dense 0..N-1 orders."""
    source = lesson.section
    if section.course_id != source.course_id:
        raise ValidationError(_("A lesson can only move within its course."))
    section_model = type(section)
    # Lock both parents in a stable order to avoid deadlocks.
    for pk in sorted({source.pk, section.pk}):
        section_model.objects.select_for_update().filter(pk=pk).first()
    target_ids = list(
        Lesson.objects.filter(section=section).exclude(pk=lesson.pk)
        .order_by("order", "id").values_list("id", flat=True)
    )
    position = max(0, min(int(position), len(target_ids)))
    if section.pk != source.pk:
        lesson.slug = unique_lesson_slug(section, lesson.slug)
        lesson.section = section
        lesson.order = 2_000_000 + lesson.pk  # out of the way of UNIQUE(section, order)
        lesson.save(update_fields=["section", "slug", "order"])
        compact(Lesson, Q(section=source))
    target_ids.insert(position, lesson.pk)
    two_phase_reorder(Lesson, Q(section=section), target_ids)
    lesson.refresh_from_db()
    return lesson
```

Note: `unique_lesson_slug(section, lesson.slug)` must not count the lesson itself — it does not, since the lesson is still in the source section at that point.

- [ ] **Step 4: Run to verify pass**

Run: `DJANGO_ENV=test python -m pytest lesson course -q -p no:cacheprovider`
Expected: PASS (new tests + the #185 structure tests that use the moved helpers).

- [ ] **Step 5: Commit**

```bash
git add quizonline-server/lesson
git commit -m "feat(lms): service move_lesson (déplacement entre sections, slug unique, ordres compacts)"
```

### Task 2: `POST /api/v1/lesson/{id}/move/`

**Files:**
- Modify: `quizonline-server/lesson/views.py` (new `move` action on `LessonViewSet`)
- Modify: `quizonline-server/lesson/serializers.py` (new `LessonMoveSerializer`)
- Test: `quizonline-server/lesson/tests/test_api_move.py`
- Regen: `quizonline-server/openapi.yaml`, `quizonline-frontend/openapi.yaml`, `quizonline-frontend/src/app/api/generated/**`

**Interfaces:**
- Consumes: `move_lesson` (Task 1).
- Produces: `POST /api/v1/lesson/{id}/move/` body `{section: int, position: int}` → 200 `{lesson: LessonSummary, source_section: Section, target_section: Section}`; generated client method `LessonService.lessonMoveCreate` (check the exact generated name after regen) — the front (Task 9) calls it through `CatalogService.moveLesson(id, section, position)`.

- [ ] **Step 1: Write the failing tests**

```python
# quizonline-server/lesson/tests/test_api_move.py
import pytest
from rest_framework.test import APIClient

from course.models import Section
from customuser.models import CustomUser
from lesson.models import Lesson


def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def setup(course):
    s1 = Section.objects.create(course=course, order=0)
    s2 = Section.objects.create(course=course, order=1)
    lesson = Lesson.objects.create(section=s1, slug="l", order=0)
    return s1, s2, lesson


@pytest.mark.django_db
def test_owner_moves_lesson(owner, setup):
    s1, s2, lesson = setup
    resp = _auth(owner).post(f"/api/v1/lesson/{lesson.id}/move/", {"section": s2.id, "position": 0}, format="json")
    assert resp.status_code == 200, resp.content
    body = resp.json()
    assert body["lesson"]["section"] == s2.id
    assert body["source_section"]["id"] == s1.id and body["source_section"]["lessons"] == []
    assert [x["id"] for x in body["target_section"]["lessons"]] == [lesson.id]


@pytest.mark.django_db
def test_member_cannot_move(course, setup):
    _s1, s2, lesson = setup
    member = CustomUser.objects.create_user(email="m@example.test", password="x")
    course.domain.members.add(member)
    resp = _auth(member).post(f"/api/v1/lesson/{lesson.id}/move/", {"section": s2.id, "position": 0}, format="json")
    assert resp.status_code in (403, 404)
    lesson.refresh_from_db()
    assert lesson.section_id != s2.id


@pytest.mark.django_db
def test_negative_position_is_400(owner, setup):
    _s1, s2, lesson = setup
    resp = _auth(owner).post(f"/api/v1/lesson/{lesson.id}/move/", {"section": s2.id, "position": -1}, format="json")
    assert resp.status_code == 400
```

- [ ] **Step 2: Run to verify failure**

Run: `DJANGO_ENV=test python -m pytest lesson/tests/test_api_move.py -q -p no:cacheprovider`
Expected: FAIL — 404/405 on `/move/`.

- [ ] **Step 3: Implement**

```python
# quizonline-server/lesson/serializers.py
class LessonMoveSerializer(serializers.Serializer):
    section = serializers.IntegerField(min_value=1)
    position = serializers.IntegerField(min_value=0)
```

```python
# quizonline-server/lesson/views.py  (inside LessonViewSet)
    @extend_schema(request=LessonMoveSerializer, responses=inline_serializer(
        name="LessonMoveResult",
        fields={
            "lesson": LessonSummarySerializer(),
            "source_section": SectionSerializer(),
            "target_section": SectionSerializer(),
        },
    ))
    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        lesson = self.get_object()  # object permission: instructor only for writes
        payload = LessonMoveSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        target = Section.objects.filter(pk=payload.validated_data["section"]).first()
        if target is None:
            raise serializers.ValidationError({"section": _("Unknown section.")})
        source_id = lesson.section_id
        try:
            lesson = move_lesson(lesson=lesson, section=target, position=payload.validated_data["position"])
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"section": exc.messages}) from exc
        ctx = {"request": request}
        return Response({
            "lesson": LessonSummarySerializer(lesson, context=ctx).data,
            "source_section": SectionSerializer(Section.objects.get(pk=source_id), context=ctx).data,
            "target_section": SectionSerializer(target, context=ctx).data,
        })
```

Imports to add in `lesson/views.py`: `from django.core.exceptions import ValidationError as DjangoValidationError`, `from django.utils.translation import gettext_lazy as _`, `from drf_spectacular.utils import extend_schema, inline_serializer`, `from rest_framework import serializers`, `from course.models import Section`, `from course.serializers import SectionSerializer`, `from .serializers import LessonMoveSerializer, LessonSummarySerializer`, `from .services import move_lesson`. Confirm `IsLmsInstructorOrReadOnly` (or the viewset's existing permission) denies POST to members; `get_object()` applies it. Add the two new msgids ("A lesson can only move within its course.", "Unknown section.") to the 5 `locale/*/LC_MESSAGES/django.po` files with translations.

- [ ] **Step 4: Run, then regen OpenAPI**

Run: `DJANGO_ENV=test python -m pytest lesson course enrollment -q -p no:cacheprovider` → PASS.
Then regen (Global Constraints). Expected: new `LessonMoveRequest` / `LessonMoveResult` schemas and a `move` method in `lesson.service.ts`.

- [ ] **Step 5: Commit**

```bash
git add quizonline-server/lesson quizonline-server/locale quizonline-server/openapi.yaml quizonline-frontend/openapi.yaml <changed generated files>
git commit -m "feat(lms): endpoint POST lesson/{id}/move/"
```

### Task 3: Machine translation after create

**Files:**
- Create: `quizonline-server/course/tasks.py`
- Modify: `quizonline-server/course/serializers.py` (`SectionSerializer.create`), `quizonline-server/lesson/serializers.py` (`LessonDetailSerializer.create`)
- Test: `quizonline-server/course/tests/test_tasks_translations.py`

**Interfaces:**
- Produces: `course.tasks.fill_missing_translations(model_label: str, pk: int) -> list[str]` (returns the language codes it filled; `"course.section"` / `"lesson.lesson"`).

- [ ] **Step 1: Write the failing tests**

```python
# quizonline-server/course/tests/test_tasks_translations.py
from unittest import mock

import pytest
from django.test import override_settings

from course.models import Section
from course.tasks import fill_missing_translations
from language.models import Language
from lesson.models import Lesson

DEEPL = "course.tasks.deepl_translate_many"


@pytest.fixture
def bilingual(course):
    en = Language.objects.get_or_create(code="en", defaults={"name": "English"})[0]
    nl = Language.objects.get_or_create(code="nl", defaults={"name": "Dutch"})[0]
    course.domain.allowed_languages.add(en, nl)
    return course


def _section(course, **titles):
    s = Section.objects.create(course=course, order=0)
    for lang, title in titles.items():
        s.set_current_language(lang)
        s.title = title
        s.save()
    return s


@pytest.mark.django_db
@override_settings(USE_DEEPL=True, DEEPL_AUTH_KEY="k")
def test_fills_only_empty_languages(bilingual):
    s = _section(bilingual, fr="Introduction", en="Hand-written")
    with mock.patch(DEEPL, side_effect=lambda texts, source, target, fmt="text": [f"{target}:{t}" for t in texts]) as m:
        filled = fill_missing_translations("course.section", s.pk)
    assert filled == ["nl"]
    assert m.call_count == 1
    s.refresh_from_db()
    assert s.safe_translation_getter("title", language_code="en") == "Hand-written"
    assert s.safe_translation_getter("title", language_code="nl") == "nl:Introduction"


@pytest.mark.django_db
@override_settings(USE_DEEPL=False, DEEPL_AUTH_KEY="")
def test_noop_without_deepl(bilingual):
    s = _section(bilingual, fr="Intro")
    with mock.patch(DEEPL) as m:
        assert fill_missing_translations("course.section", s.pk) == []
    m.assert_not_called()


@pytest.mark.django_db
@override_settings(USE_DEEPL=True, DEEPL_AUTH_KEY="k")
def test_single_language_domain_is_noop(course):
    s = _section(course, fr="Intro")
    with mock.patch(DEEPL) as m:
        assert fill_missing_translations("course.section", s.pk) == []
    m.assert_not_called()


@pytest.mark.django_db
@override_settings(USE_DEEPL=True, DEEPL_AUTH_KEY="k")
def test_deepl_error_is_swallowed(bilingual):
    from translation.services.deepl import DeepLError
    s = _section(bilingual, fr="Intro")
    with mock.patch(DEEPL, side_effect=DeepLError("boom")):
        assert fill_missing_translations("course.section", s.pk) == []


@pytest.mark.django_db
@override_settings(USE_DEEPL=True, DEEPL_AUTH_KEY="k")
def test_lesson_title_is_translated(bilingual):
    section = Section.objects.create(course=bilingual, order=0)
    lesson = Lesson.objects.create(section=section, slug="l", order=0)
    lesson.set_current_language("fr")
    lesson.title = "Bonjour"
    lesson.save()
    with mock.patch(DEEPL, side_effect=lambda texts, source, target, fmt="text": [f"{target}:{t}" for t in texts]):
        assert sorted(fill_missing_translations("lesson.lesson", lesson.pk)) == ["en", "nl"]


@pytest.mark.django_db
def test_enqueued_on_create_not_on_update(owner, course, django_capture_on_commit_callbacks):
    from rest_framework.test import APIClient
    client = APIClient()
    client.force_authenticate(user=owner)
    with mock.patch("course.tasks.fill_missing_translations.delay") as delay:
        with django_capture_on_commit_callbacks(execute=True):
            resp = client.post("/api/v1/section/", {"course": course.id, "translations": {"fr": {"title": "S"}}}, format="json")
        assert resp.status_code == 201
        delay.assert_called_once_with("course.section", resp.json()["id"])
        with django_capture_on_commit_callbacks(execute=True):
            client.patch(f"/api/v1/section/{resp.json()['id']}/", {"translations": {"fr": {"title": "S2"}}}, format="json")
        assert delay.call_count == 1
```

Before running, check `Course.language` is `fr_lang` in the `course` fixture (it is in `course/tests/conftest.py`) and that the settings names are `USE_DEEPL` / `DEEPL_AUTH_KEY` (`config/settings_base.py:33,447`).

- [ ] **Step 2: Run to verify failure**

Run: `DJANGO_ENV=test python -m pytest course/tests/test_tasks_translations.py -q -p no:cacheprovider`
Expected: FAIL — `ModuleNotFoundError: course.tasks`.

- [ ] **Step 3: Implement**

```python
# quizonline-server/course/tasks.py
"""Fill a section's / lesson's empty translations by machine translation."""

from __future__ import annotations

import logging

from celery import shared_task
from django.apps import apps
from django.conf import settings

from translation.services.deepl import DeepLError, deepl_translate_many

logger = logging.getLogger(__name__)

# model label -> {field: DeepL format}
_FIELDS = {
    "course.section": {"title": "text", "description": "html"},
    "lesson.lesson": {"title": "text"},
}


def _course_of(obj):
    return obj.course if hasattr(obj, "course") else obj.section.course


@shared_task
def fill_missing_translations(model_label: str, pk: int) -> list[str]:
    """Translate the course-language values of ``obj`` into every other
    allowed language of its domain, filling ONLY empty values. Never
    raises: no DeepL configured, or a DeepL error, leaves languages empty."""
    if not (getattr(settings, "USE_DEEPL", False) and getattr(settings, "DEEPL_AUTH_KEY", "")):
        return []
    fields = _FIELDS.get(model_label)
    obj = apps.get_model(model_label).objects.filter(pk=pk).first()
    if fields is None or obj is None:
        return []
    course = _course_of(obj)
    source = course.language.code
    targets = [c for c in course.domain.allowed_languages.values_list("code", flat=True) if c != source]
    sources = {f: obj.safe_translation_getter(f, language_code=source, any_language=False) or "" for f in fields}
    if not any(sources.values()):
        return []
    filled: list[str] = []
    for target in targets:
        missing = [
            f for f in fields
            if sources[f] and not (obj.safe_translation_getter(f, language_code=target, any_language=False) or "")
        ]
        if not missing:
            continue
        try:
            values = {}
            for fmt in sorted({fields[f] for f in missing}):
                batch = [f for f in missing if fields[f] == fmt]
                out = deepl_translate_many([sources[f] for f in batch], source, target, fmt=fmt)
                values.update(dict(zip(batch, out, strict=True)))
        except DeepLError:
            logger.exception("Machine translation failed", extra={"model": model_label, "pk": pk, "target": target})
            continue
        obj.set_current_language(target)
        for f, v in values.items():
            setattr(obj, f, v)
        obj.save()
        filled.append(target)
    return filled
```

Hook into both creates, inside the existing `with transaction.atomic():` block, right after `self._apply(instance, tr)`:

```python
            instance = self._apply(instance, tr)
            from course.tasks import fill_missing_translations
            transaction.on_commit(
                lambda pk=instance.pk: fill_missing_translations.delay("course.section", pk)  # "lesson.lesson" in LessonDetailSerializer
            )
            return instance
```

If a sanitizer applies to section `description` on save (check `course/models.py`), the translated HTML goes through it the same way — no extra code.

- [ ] **Step 4: Run to verify pass**

Run: `DJANGO_ENV=test python -m pytest course lesson -q -p no:cacheprovider` → PASS. Then the full backend suite → PASS.

- [ ] **Step 5: Commit, open PR 1**

```bash
git add quizonline-server/course quizonline-server/lesson
git commit -m "feat(lms): traduction automatique des titres après création (Celery, DeepL)"
```

Push the branch and open PR 1 (`feat(lms): déplacement de leçon et traduction automatique`). Merge before PR 2.

---

## PR 2 — Two-pane editor

Branch `feat/lms-authoring-editor-ui` from `main` after PR 1 is merged.

### Task 4: Tab in the URL, "Content" label, post-create landing

**Files:**
- Modify: `quizonline-frontend/src/app/pages/course-edit/course-edit.ts`, `course-edit.html`
- Modify: `quizonline-frontend/src/app/app.routes-paths.ts`
- Modify: `quizonline-frontend/src/app/pages/course-create/course-create.ts:400`
- Modify: `quizonline-frontend/public/i18n/{fr,en,nl,it,es}.json` (`pages.courseEdit.tabStructure` → "Contenu" / "Content" / "Inhoud" / "Contenuto" / "Contenido"; check the exact key path in `course-edit.i18n.ts`)
- Test: `quizonline-frontend/src/app/pages/course-edit/course-edit-tab.util.spec.ts`

**Interfaces:**
- Produces: `app.routes-paths.ts` → `export type CourseEditTab = 'info' | 'content' | 'enrollment' | 'analytics'`, `export const COURSE_EDIT_TAB = (id: number, tab: CourseEditTab, lesson?: number) => string` (returns `/course/${id}/edit?tab=${tab}` plus `&lesson=${lesson}` when given); `course-edit-tab.util.ts` → `parseCourseEditTab(raw: string | null): CourseEditTab`.

- [ ] **Step 1: Write the failing test**

```ts
// quizonline-frontend/src/app/pages/course-edit/course-edit-tab.util.spec.ts
import {describe, expect, it} from 'vitest';
import {parseCourseEditTab} from './course-edit-tab.util';
import {COURSE_EDIT_TAB} from '../../app.routes-paths';

describe('parseCourseEditTab', () => {
  it('accepts known tabs', () => {
    for (const t of ['info', 'content', 'enrollment', 'analytics'] as const) {
      expect(parseCourseEditTab(t)).toBe(t);
    }
  });
  it('maps the legacy "structure" value to content', () => {
    expect(parseCourseEditTab('structure')).toBe('content');
  });
  it('falls back to info', () => {
    expect(parseCourseEditTab(null)).toBe('info');
    expect(parseCourseEditTab('nope')).toBe('info');
  });
});

describe('COURSE_EDIT_TAB', () => {
  it('builds the url', () => {
    expect(COURSE_EDIT_TAB(4, 'content')).toBe('/course/4/edit?tab=content');
    expect(COURSE_EDIT_TAB(4, 'content', 9)).toBe('/course/4/edit?tab=content&lesson=9');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run (from `quizonline-frontend/`): `npx ng test --watch=false --include='src/app/pages/course-edit/course-edit-tab.util.spec.ts'`
Expected: FAIL — module not found. (First run may need `npx playwright install chromium`.)

- [ ] **Step 3: Implement**

```ts
// quizonline-frontend/src/app/pages/course-edit/course-edit-tab.util.ts
import {CourseEditTab} from '../../app.routes-paths';

const TABS: readonly CourseEditTab[] = ['info', 'content', 'enrollment', 'analytics'];

export function parseCourseEditTab(raw: string | null): CourseEditTab {
  if (raw === 'structure') {
    return 'content';
  }
  return (TABS as readonly string[]).includes(raw ?? '') ? (raw as CourseEditTab) : 'info';
}
```

```ts
// quizonline-frontend/src/app/app.routes-paths.ts (next to COURSE_EDIT)
export type CourseEditTab = 'info' | 'content' | 'enrollment' | 'analytics';
export const COURSE_EDIT_TAB = (id: number, tab: CourseEditTab, lesson?: number) =>
  `/course/${id}/edit?tab=${tab}${lesson ? `&lesson=${lesson}` : ''}`;
```

In `course-edit.ts`: add `protected readonly activeTab = toSignal(this.route.queryParamMap.pipe(map((q) => parseCourseEditTab(q.get('tab')))), {initialValue: 'info' as CourseEditTab});` and

```ts
  protected onTabChange(tab: string | number | undefined): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {tab: parseCourseEditTab(String(tab ?? 'info')), lesson: null},
      queryParamsHandling: 'merge',
    });
  }
```

In `course-edit.html`: `<p-tabs [value]="activeTab()" (valueChange)="onTabChange($event)" …>`, and rename the `structure` tab/panel value to `content` (keep `<app-course-edit-structure-tab>` for now — Task 7 replaces it). In `course-create.ts:400`: `this.router.navigateByUrl(COURSE_EDIT_TAB(created.id, 'content'));` (check `created` carries `id`; it is the `POST /course/` response).

- [ ] **Step 4: Run to verify pass**

Run the spec again → PASS. Run `npm run -s typecheck`, `npx ng build` → OK.

- [ ] **Step 5: Commit**

```bash
git add quizonline-frontend/src/app quizonline-frontend/public/i18n
git commit -m "feat(lms): onglet de l'éditeur de cours dans l'URL, onglet Contenu, arrivée sur Contenu après création"
```

### Task 5: `LessonContentEditor` + `/lesson/{id}/edit` redirect

**Files:**
- Create: `quizonline-frontend/src/app/shared/learning/lesson-content-editor/lesson-content-editor.ts`, `.html`, `.scss`, `.i18n.ts`
- Modify: `quizonline-frontend/src/app/pages/lesson-edit/lesson-edit.ts`, `lesson-edit.html` (become a redirect)
- Modify: `quizonline-frontend/scripts/check-i18n.ts` (register the new dictionary), `public/i18n/*.json`
- Test: `quizonline-frontend/src/app/shared/learning/lesson-content-editor/lesson-content-editor.spec.ts`

**Interfaces:**
- Produces: `<app-lesson-content-editor [lessonId]="number" (titleChanged)="{id:number,title:string}" (navigate)="number" />`. Inputs: `lessonId = input.required<number>()`, `courseLanguage = input<string>('fr')`. Outputs: `titleChanged`, `navigate` (prev/next lesson id). Public method `hasUnsavedChanges(): boolean` (returns `false` until Task 10).

- [ ] **Step 1: Write the failing test**

```ts
// lesson-content-editor.spec.ts
import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {describe, expect, it, beforeEach} from 'vitest';
import {LessonContentEditor} from './lesson-content-editor';

describe('LessonContentEditor', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LessonContentEditor],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  it('loads the lesson for the given id and reloads when the id changes', () => {
    const fixture = TestBed.createComponent(LessonContentEditor);
    fixture.componentRef.setInput('lessonId', 5);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/lesson/5/')).flush({id: 5, blocks: [], translations: {fr: {title: 'A'}}});
    fixture.componentRef.setInput('lessonId', 6);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/lesson/6/')).flush({id: 6, blocks: [], translations: {fr: {title: 'B'}}});
    http.verify();
  });

  it('emits navigate with the next lesson id', () => {
    const fixture = TestBed.createComponent(LessonContentEditor);
    fixture.componentRef.setInput('lessonId', 5);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/lesson/5/')).flush({id: 5, blocks: [], next_lesson: {id: 7, title: 'N'}});
    let navigated = 0;
    fixture.componentInstance.navigate.subscribe((id: number) => (navigated = id));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[data-testid="next-lesson"]') as HTMLButtonElement).click();
    expect(navigated).toBe(7);
  });
});
```

If the project's existing specs need extra providers (UiTextService catalog registration, `provideRouter([])`), copy the `TestBed` setup from `src/app/pages/auth/preferences/preferences.spec.ts`.

- [ ] **Step 2: Run to verify failure** — `npx ng test --watch=false --include='src/app/shared/learning/lesson-content-editor/**'` → FAIL (module not found).

- [ ] **Step 3: Implement**

Move the logic of `pages/lesson-edit/lesson-edit.ts` (signals `blocks`, `availableLangs`, `domainId`, `previewMode`, `reload()`, `onBlocksChanged()`, `onBlockUpdated()`) into `LessonContentEditor`, replacing the `paramMap` subscription by an `effect(() => { const id = this.lessonId(); if (id > 0) this.reload(id); })`. Keep the `LessonDetailDto` interface, extended with `translations`, `is_published`, `is_preview`, `prev_lesson`, `next_lesson` (`{id:number,title:string} | null`).

Template header (replaces `<app-page-header>`):

```html
<div class="lesson-pane__header">
  <h2 class="lesson-pane__title">{{ title() }}</h2>
  <app-status-badge [state]="lesson()?.is_published ? 'published' : 'draft'" />
  <span class="lesson-pane__spacer"></span>
  <p-button type="button" icon="pi pi-chevron-left" [text]="true" size="small"
    data-testid="prev-lesson" [disabled]="!lesson()?.prev_lesson"
    [pTooltip]="ui().previousLesson" tooltipPosition="bottom"
    (onClick)="navigate.emit(lesson()!.prev_lesson!.id)" />
  <p-button type="button" icon="pi pi-chevron-right" [text]="true" size="small"
    data-testid="next-lesson" [disabled]="!lesson()?.next_lesson"
    [pTooltip]="ui().nextLesson" tooltipPosition="bottom"
    (onClick)="navigate.emit(lesson()!.next_lesson!.id)" />
  <p-button type="button" [outlined]="true"
    [severity]="previewMode() ? 'info' : 'success'"
    [icon]="previewMode() ? 'pi pi-pencil' : 'pi pi-eye'"
    [label]="previewMode() ? ui().editModeButton : ui().previewButton"
    (onClick)="togglePreview()" />
</div>
```

Inline rename of the header title (spec §4): double-click on the `<h2>` swaps it for an `<input pInputText>` prefilled with `title()`; **Enter** with a non-blank value → `CatalogService.updateLesson(id, {translations: {[courseLanguage()]: {title}}})`, then update `lesson()` from the response and `titleChanged.emit({id, title})`; blank or **Escape** → restore without request. Add a spec case: rename emits `titleChanged` with the trimmed title; blank sends nothing.

followed by the current `lesson-edit.html` body (empty state, `<app-lesson-reader>` / `<app-block-list-editor>`). `title()` = `lesson()?.translations?.[courseLanguage()]?.title` falling back to the first non-empty title. Check `<app-status-badge>`'s input name in `shared/components/status-badge/status-badge.ts` and use it. Labels `previousLesson`, `nextLesson`, `previewButton`, `editModeButton`, `emptyTitle`, `emptyHint`, `blockErrorToast` live in the new dictionary `getLessonContentEditorUiText` (slug `lessonContentEditor`), copied from `lessonEdit` for the existing ones, with the two new keys in 5 languages (FR "Leçon précédente" / "Leçon suivante", EN "Previous lesson" / "Next lesson", NL "Vorige les" / "Volgende les", IT "Lezione precedente" / "Lezione successiva", ES "Lección anterior" / "Lección siguiente"). Register `{name: 'shared/lesson-content-editor', get: getLessonContentEditorUiText as Getter}` in `scripts/check-i18n.ts`.

`lesson-edit.ts` becomes a redirect:

```ts
  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.router.navigateByUrl(CATALOG, {replaceUrl: true});
      return;
    }
    this.http.get<{course_id?: number}>(`${this.apiBaseUrl}/lesson/${id}/`).subscribe({
      next: (l) => this.router.navigateByUrl(
        l.course_id ? COURSE_EDIT_TAB(l.course_id, 'content', id) : CATALOG, {replaceUrl: true}),
      error: (err: unknown) => {
        logApiError('lms.lesson-edit.redirect', err);
        this.router.navigateByUrl(CATALOG, {replaceUrl: true});
      },
    });
  }
```

with a template that only shows a loading line. Remove the now-unused `lesson-edit` i18n keys only if `check:i18n` and the build stay green.

- [ ] **Step 4: Run** the spec → PASS; `npm run -s typecheck`, `npm run -s check:i18n`, `npx ng build` → OK.

- [ ] **Step 5: Commit**

```bash
git add quizonline-frontend
git commit -m "feat(lms): composant LessonContentEditor, /lesson/{id}/edit redirige vers l'éditeur de cours"
```

### Task 6: `CourseOutline` (inline create / rename, "⋯" menu, missing languages)

**Files:**
- Create: `quizonline-frontend/src/app/pages/course-edit/tabs/content-tab/course-outline/course-outline.ts`, `.html`, `.scss`, `.i18n.ts`
- Create: `quizonline-frontend/src/app/pages/course-edit/tabs/content-tab/course-outline/outline.util.ts`
- Modify: `quizonline-frontend/scripts/check-i18n.ts`, `public/i18n/*.json`
- Test: `course-outline.spec.ts`, `outline.util.spec.ts` (same folder)

**Interfaces:**
- Consumes: `CatalogService.createSection/createLesson/updateSection/updateLesson/publish*/unpublish*/delete*` (existing, `services/catalog/catalog.service.ts:167-215`); `SectionDto`, `LessonSummaryDto` (generated).
- Produces: `<app-course-outline [course]="CourseDetailDto" [selectedLessonId]="number|null" (select)="number" (courseChange)="CourseDetailDto" (openTranslations)="{kind:'section'|'lesson', id:number}" />`. `outline.util.ts` → `missingLanguages(translations: Record<string, Record<string,string>> | undefined, langs: string[]): string[]`, `insertSorted<T extends {order:number}>(list: T[], item: T): T[]`, `titleIn(translations, lang): string`.

- [ ] **Step 1: Write the failing tests**

```ts
// outline.util.spec.ts
import {describe, expect, it} from 'vitest';
import {insertSorted, missingLanguages, titleIn} from './outline.util';

describe('outline utils', () => {
  it('lists languages whose title is empty', () => {
    expect(missingLanguages({fr: {title: 'A'}, en: {title: ' '}}, ['fr', 'en', 'nl'])).toEqual(['en', 'nl']);
  });
  it('inserts by order', () => {
    expect(insertSorted([{order: 0}, {order: 2}], {order: 1}).map((x) => x.order)).toEqual([0, 1, 2]);
  });
  it('falls back to any title', () => {
    expect(titleIn({en: {title: 'Hello'}}, 'fr')).toBe('Hello');
  });
});
```

```ts
// course-outline.spec.ts
import {TestBed} from '@angular/core/testing';
import {of, Subject, throwError} from 'rxjs';
import {describe, expect, it, beforeEach, vi} from 'vitest';
import {CourseOutline} from './course-outline';
import {CatalogService} from '../../../../../services/catalog/catalog.service';

const course = {
  id: 1, language_code: 'fr', available_lang_codes: ['fr', 'en'],
  sections: [{id: 10, order: 0, is_published: false, translations: {fr: {title: 'S1'}}, lessons: []}],
} as never;

describe('CourseOutline', () => {
  const catalog = {createLesson: vi.fn(), createSection: vi.fn(), updateLesson: vi.fn(), updateSection: vi.fn()};
  beforeEach(() => {
    Object.values(catalog).forEach((f) => f.mockReset());
    TestBed.configureTestingModule({imports: [CourseOutline], providers: [{provide: CatalogService, useValue: catalog}]});
  });

  function render() {
    const f = TestBed.createComponent(CourseOutline);
    f.componentRef.setInput('course', course);
    f.componentRef.setInput('selectedLessonId', null);
    f.detectChanges();
    return f;
  }

  function typeAndPress(f: ReturnType<typeof render>, testId: string, text: string, key: string) {
    (f.nativeElement.querySelector(`[data-testid="${testId}-open"]`) as HTMLButtonElement).click();
    f.detectChanges();
    const input = f.nativeElement.querySelector(`[data-testid="${testId}-input"]`) as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', {key}));
    f.detectChanges();
  }

  it('Enter creates the lesson in the course language and selects it', () => {
    catalog.createLesson.mockReturnValue(of({id: 99, section: 10, order: 0, is_published: false, is_preview: false, translations: {fr: {title: 'L1'}}}));
    const f = render();
    let selected = 0;
    f.componentInstance.select.subscribe((id: number) => (selected = id));
    typeAndPress(f, 'add-lesson-10', '  L1 ', 'Enter');
    expect(catalog.createLesson).toHaveBeenCalledWith({section: 10, translations: {fr: {title: 'L1'}}});
    expect(selected).toBe(99);
  });

  it('Escape cancels and empty titles send nothing', () => {
    const f = render();
    typeAndPress(f, 'add-lesson-10', 'X', 'Escape');
    typeAndPress(f, 'add-lesson-10', '   ', 'Enter');
    expect(catalog.createLesson).not.toHaveBeenCalled();
  });

  it('a second Enter while the first create is in flight sends nothing', () => {
    const pending = new Subject<unknown>();
    catalog.createLesson.mockReturnValue(pending);
    const f = render();
    typeAndPress(f, 'add-lesson-10', 'L1', 'Enter');
    const input = f.nativeElement.querySelector('[data-testid="add-lesson-10-input"]') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
    expect(catalog.createLesson).toHaveBeenCalledTimes(1);
  });

  it('keeps the typed text when the create fails', () => {
    catalog.createLesson.mockReturnValue(throwError(() => ({error: {detail: 'nope'}})));
    const f = render();
    typeAndPress(f, 'add-lesson-10', 'L1', 'Enter');
    const input = f.nativeElement.querySelector('[data-testid="add-lesson-10-input"]') as HTMLInputElement;
    expect(input.value).toBe('L1');
  });

  it('rename with a blank title sends nothing', () => {
    const f = render();
    (f.nativeElement.querySelector('[data-testid="rename-section-10"]') as HTMLElement).dispatchEvent(new Event('dblclick'));
    f.detectChanges();
    const input = f.nativeElement.querySelector('[data-testid="rename-section-10-input"]') as HTMLInputElement;
    input.value = '  ';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
    expect(catalog.updateSection).not.toHaveBeenCalled();
  });
});
```

Add `AppToastService` / `ConfirmationService` / i18n providers as the existing specs do if the component injects them.

- [ ] **Step 2: Run to verify failure** — `npx ng test --watch=false --include='src/app/pages/course-edit/tabs/content-tab/**'` → FAIL.

- [ ] **Step 3: Implement**

`outline.util.ts`:

```ts
type Tr = Record<string, Record<string, string>> | undefined;

export function titleIn(tr: Tr, lang: string): string {
  const own = tr?.[lang]?.['title']?.trim();
  if (own) return own;
  for (const v of Object.values(tr ?? {})) {
    const t = v?.['title']?.trim();
    if (t) return t;
  }
  return '';
}

export function missingLanguages(tr: Tr, langs: string[]): string[] {
  return langs.filter((l) => !tr?.[l]?.['title']?.trim());
}

export function insertSorted<T extends {order: number}>(list: T[], item: T): T[] {
  return [...list.filter((x) => x !== item), item].sort((a, b) => a.order - b.order);
}
```

`CourseOutline` state: `addingLessonIn = signal<number | null>(null)`, `addingSection = signal(false)`, `renaming = signal<{kind:'section'|'lesson', id:number} | null>(null)`, `draft = signal('')`, `busy = signal(false)`. Core methods:

```ts
  protected submitLesson(sectionId: number): void {
    const title = this.draft().trim();
    if (!title || this.busy()) return;
    this.busy.set(true);
    this.catalog.createLesson({section: sectionId, translations: {[this.lang()]: {title}}})
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (created) => {
          const lesson = created as LessonSummaryDto;
          this.patchSection(sectionId, (s) => ({...s, lessons: insertSorted([...(s.lessons ?? [])], lesson)}));
          this.addingLessonIn.set(null);
          this.draft.set('');
          this.select.emit(lesson.id);
        },
        error: (err: unknown) => {
          logApiError('lms.outline.create-lesson', err);
          this.toast.addApiError(err, this.ui().actionFailedToast);
        },
      });
  }
```

`submitSection()` mirrors it with `createSection({course: this.course().id, translations: {[lang]: {title}}})`, inserts the section (`lessons: []`), then `this.addingLessonIn.set(created.id)`. `submitRename()` sends `updateSection(id, {translations: {[lang]: {title}}})` / `updateLesson(...)` and patches the row from the response; blank → cancel without request. `patchSection` / `patchCourse` emit `courseChange` with the updated `CourseDetailDto` (immutable copy). `lang()` = `course().language_code`; `langs()` = `course().available_lang_codes`.

The "⋯" menu uses PrimeNG `<p-menu [popup]="true">` with items Publish/Unpublish (calls `publishSection/unpublishSection/publishLesson/unpublishLesson`, patches `is_published` from the response, server error → toast with its detail), Free preview (lessons: `updateLesson(id, {is_preview: !x})`), Translations… (`openTranslations.emit`), Delete (`ConfirmationService.confirm`, then `deleteSection/deleteLesson`, remove the row; if the deleted lesson is selected emit `select` with `0`).

Template per section (lessons the same, with `[class.is-selected]="lesson.id === selectedLessonId()"` and `(click)="select.emit(lesson.id)"`):

```html
<div class="outline-row outline-row--section">
  @if (isRenaming('section', section.id)) {
    <input pInputText data-testid="rename-section-{{section.id}}-input" [value]="draft()"
      (input)="draft.set($any($event.target).value)"
      (keydown)="onKey($event, () => submitRename(), () => renaming.set(null))" />
  } @else {
    <span class="outline-row__title" data-testid="rename-section-{{section.id}}"
      (dblclick)="startRename('section', section.id, section.translations)">{{ titleOf(section) }}</span>
  }
  <app-status-badge … />
  @if (missing(section.translations).length) {
    <small class="outline-row__missing">{{ ui().missingLanguages }} {{ missing(section.translations).join(', ').toUpperCase() }}</small>
  }
  <p-button icon="pi pi-ellipsis-h" [text]="true" size="small" (onClick)="openMenu($event, 'section', section)" />
</div>
… lessons …
@if (addingLessonIn() === section.id) {
  <input pInputText data-testid="add-lesson-{{section.id}}-input" [disabled]="busy()" [value]="draft()"
    [placeholder]="ui().newLessonPlaceholder"
    (input)="draft.set($any($event.target).value)"
    (keydown)="onKey($event, () => submitLesson(section.id), () => addingLessonIn.set(null))" />
} @else {
  <p-button data-testid="add-lesson-{{section.id}}-open" icon="pi pi-plus" [text]="true" size="small"
    [label]="ui().addLesson" (onClick)="openAddLesson(section.id)" />
}
```

`onKey(e, enter, escape)`: `Enter` → `e.preventDefault(); enter()`; `Escape` → `escape(); this.draft.set('')`. Note: the input's `[disabled]="busy()"` is applied on the next change detection; the `busy()` guard in `submitLesson` is what makes the double-Enter test pass. Inputs get `autofocus` via a small `afterNextRender` focus in `openAddLesson` / `startRename`.

Labels (5 languages): `addLesson` ("Leçon" / "Lesson" / "Les" / "Lezione" / "Lección"), `addSection` ("Section" / "Section" / "Sectie" / "Sezione" / "Sección"), `newLessonPlaceholder` ("Titre de la leçon, Entrée pour créer" / "Lesson title, Enter to create" / "Titel van de les, Enter om te maken" / "Titolo della lezione, Invio per creare" / "Título de la lección, Intro para crear"), `newSectionPlaceholder` (same pattern with "section"), `missingLanguages` ("Manquant :" / "Missing:" / "Ontbreekt:" / "Mancante:" / "Falta:"), `menuPublish`, `menuUnpublish`, `menuPreviewOn`, `menuPreviewOff`, `menuTranslations`, `menuDelete`, `confirmDeleteSection`, `confirmDeleteLesson`, `actionFailedToast` — reuse the existing FR/EN/… wording from `pages.structureTab` where it exists. Register `{name: 'pages/course-edit/course-outline', get: getCourseOutlineUiText as Getter}`.

- [ ] **Step 4: Run** the two specs → PASS; typecheck, `check:i18n`, build → OK.

- [ ] **Step 5: Commit**

```bash
git add quizonline-frontend
git commit -m "feat(lms): plan du cours avec création et renommage sur place"
```

### Task 7: Content tab (two panes, `?lesson=`), replacing the structure tab

**Files:**
- Create: `quizonline-frontend/src/app/pages/course-edit/tabs/content-tab/content-tab.ts`, `.html`, `.scss`, `.i18n.ts`
- Modify: `quizonline-frontend/src/app/pages/course-edit/course-edit.ts`, `.html` (use `<app-course-edit-content-tab>` in the `content` panel)
- Modify: `quizonline-frontend/src/app/pages/course-edit/tabs/structure-tab/*` → keep only the multilingual **edit** dialogs, extracted as `translations-dialog/` (create mode removed); delete the rest.
- Modify: `scripts/check-i18n.ts`, `public/i18n/*.json`
- Test: `content-tab.spec.ts`

**Interfaces:**
- Consumes: `CourseOutline` (Task 6), `LessonContentEditor` (Task 5), `COURSE_EDIT_TAB` (Task 4).
- Produces: `<app-course-edit-content-tab [course]="CourseDetailDto|null" (courseChange)="CourseDetailDto" />`; `CourseEdit` updates its `course` signal from `courseChange` (no refetch) — the publish toggle reads it.

- [ ] **Step 1: Write the failing test**

```ts
// content-tab.spec.ts
import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, Router} from '@angular/router';
import {BehaviorSubject} from 'rxjs';
import {describe, expect, it, beforeEach, vi} from 'vitest';
import {CourseEditContentTab} from './content-tab';

const course = {id: 1, language_code: 'fr', available_lang_codes: ['fr'],
  sections: [{id: 10, order: 0, translations: {fr: {title: 'S'}}, lessons: [
    {id: 5, section: 10, order: 0, is_published: false, is_preview: false, translations: {fr: {title: 'L'}}}]}]} as never;

describe('CourseEditContentTab', () => {
  const query = new BehaviorSubject(convertToParamMap({tab: 'content'}));
  const router = {navigate: vi.fn()};
  beforeEach(() => {
    router.navigate.mockReset();
    TestBed.configureTestingModule({
      imports: [CourseEditContentTab],
      providers: [{provide: ActivatedRoute, useValue: {queryParamMap: query}}, {provide: Router, useValue: router}],
    });
    TestBed.overrideComponent(CourseEditContentTab, {set: {imports: [], template: '<div></div>'}});
  });

  it('reads the selected lesson from ?lesson=', () => {
    query.next(convertToParamMap({tab: 'content', lesson: '5'}));
    const f = TestBed.createComponent(CourseEditContentTab);
    f.componentRef.setInput('course', course);
    f.detectChanges();
    expect(f.componentInstance['selectedLessonId']()).toBe(5);
  });

  it('ignores a lesson that is not in the course', () => {
    query.next(convertToParamMap({tab: 'content', lesson: '999'}));
    const f = TestBed.createComponent(CourseEditContentTab);
    f.componentRef.setInput('course', course);
    f.detectChanges();
    expect(f.componentInstance['selectedLessonId']()).toBeNull();
  });

  it('selecting a lesson writes ?lesson= without reloading', () => {
    const f = TestBed.createComponent(CourseEditContentTab);
    f.componentRef.setInput('course', course);
    f.detectChanges();
    f.componentInstance['onSelect'](5);
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: {lesson: 5}, queryParamsHandling: 'merge'}));
  });
});
```

Add a toast provider mock if the component injects `AppToastService` (unknown lesson → toast).

- [ ] **Step 2: Run to verify failure** → FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// content-tab.ts (core)
  readonly course = input<CourseDetailDto | null>(null);
  readonly courseChange = output<CourseDetailDto>();
  private readonly requestedLesson = toSignal(
    this.route.queryParamMap.pipe(map((q) => Number(q.get('lesson')) || null)), {initialValue: null});
  private readonly lessonIds = computed(() =>
    new Set((this.course()?.sections ?? []).flatMap((s) => (s.lessons ?? []).map((l) => l.id))));
  protected readonly selectedLessonId = computed(() => {
    const id = this.requestedLesson();
    return id !== null && this.lessonIds().has(id) ? id : null;
  });
  constructor() {
    effect(() => {
      const id = this.requestedLesson();
      if (id !== null && this.course() && !this.lessonIds().has(id)) {
        untracked(() => this.toast.add({severity: 'warn', summary: this.ui().unknownLessonToast}));
      }
    });
  }
  protected onSelect(id: number): void {
    this.router.navigate([], {relativeTo: this.route, queryParams: {lesson: id || null}, queryParamsHandling: 'merge'});
  }
```

Note: `onSelect(5)` must call `navigate` with exactly `{lesson: 5}`; for `0` it passes `{lesson: null}`.

Template:

```html
<div class="content-tab">
  <aside class="content-tab__outline" [class.is-collapsed]="outlineCollapsed()">
    <button type="button" class="content-tab__outline-toggle" (click)="outlineCollapsed.update(v => !v)">
      {{ ui().outlineToggle }}
    </button>
    @if (course(); as c) {
      <app-course-outline [course]="c" [selectedLessonId]="selectedLessonId()"
        (select)="onSelect($event)" (courseChange)="courseChange.emit($event)"
        (openTranslations)="translations.set($event)" />
    }
  </aside>
  <section class="content-tab__lesson">
    @if (selectedLessonId(); as lessonId) {
      <app-lesson-content-editor [lessonId]="lessonId" [courseLanguage]="course()?.language_code ?? 'fr'"
        (navigate)="onSelect($event)" (titleChanged)="onTitleChanged($event)" />
    } @else {
      <app-empty-state [title]="ui().emptyTitle" [message]="ui().emptyHint" icon="pi pi-file-edit" />
    }
  </section>
</div>
@if (translations(); as t) {
  <app-translations-dialog [course]="course()!" [target]="t" (closed)="translations.set(null)"
    (saved)="courseChange.emit($event)" />
}
```

SCSS: `.content-tab { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 1rem; }`, `.content-tab__outline { position: sticky; top: 1rem; max-height: calc(100vh - 2rem); overflow: auto; }`, toggle hidden above 900 px; `@media (max-width: 900px) { .content-tab { grid-template-columns: 1fr; } .content-tab__outline.is-collapsed app-course-outline { display: none; } }`. Check `<app-empty-state>` input names in `shared/components/empty-state/`.

`onTitleChanged({id, title})` patches the lesson's course-language title in `course()` and emits `courseChange`.

The translations dialog = the existing section/lesson **edit** dialogs of `structure-tab` (multilingual tabs + translate button + publish/preview toggles) moved into `translations-dialog/`, opened for `{kind, id}`, emitting the patched course on save. Delete `structure-tab.ts/.html/.scss` once nothing imports them, and their `check-i18n.ts` entry; keep the `pages.structureTab.sectionDialog/lessonDialog` labels the dialog still uses (move them under the new dictionary slug `translationsDialog`).

In `course-edit.html` panel `content`: `<app-course-edit-content-tab [course]="course()" (courseChange)="onCourseChange($event)" />`; in `course-edit.ts`: `protected onCourseChange(c: CourseDetailDto) { this.course.set(c); this.publishToggle.set(c.is_published === true); }`.

New labels (5 languages): `emptyTitle` ("Sélectionnez ou créez une leçon" / "Select or create a lesson" / "Selecteer of maak een les" / "Seleziona o crea una lezione" / "Selecciona o crea una lección"), `emptyHint`, `outlineToggle` ("Plan du cours" / "Course outline" / "Cursusoverzicht" / "Struttura del corso" / "Esquema del curso"), `unknownLessonToast` ("Cette leçon n'existe pas dans ce cours." / "This lesson is not part of this course." / "Deze les hoort niet bij deze cursus." / "Questa lezione non fa parte di questo corso." / "Esta lección no forma parte de este curso.").

- [ ] **Step 4: Run** all course-edit specs → PASS; typecheck, `check:i18n`, `npx ng build`, `npx eslint src/app/pages/course-edit src/app/shared/learning` → OK.

- [ ] **Step 5: Commit**

```bash
git add quizonline-frontend
git commit -m "feat(lms): onglet Contenu en deux panneaux (plan + contenu de la leçon)"
```

### Task 8: E2E — build a course without a dialog

**Files:**
- Create: `quizonline-frontend/e2e/fullstack/course-authoring.spec.ts`

- [ ] **Step 1: Write the test**

```ts
import {expect, test} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.addInitScript(() => {
    (window as Window & {__QUIZONLINE_API_BASE_URL?: string}).__QUIZONLINE_API_BASE_URL = 'http://127.0.0.1:8001';
  });
});

test('instructor builds a section and a lesson with content, no dialog', async ({page}) => {
  await page.goto('/login');
  await page.locator('#email').fill('admin@example.test');
  await page.locator('input[type="password"]').fill('secret123');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto('/course/create');
  await page.locator('input[formControlName="title"]').first().fill('E2E authoring');
  await page.getByRole('button', {name: /créer|create/i}).last().click();
  await expect(page).toHaveURL(/\/course\/\d+\/edit\?tab=content/);

  await page.getByTestId('add-section-open').click();
  await page.getByTestId('add-section-input').fill('Chapitre 1');
  await page.getByTestId('add-section-input').press('Enter');

  const lessonInput = page.locator('[data-testid^="add-lesson-"][data-testid$="-input"]');
  await lessonInput.fill('Leçon 1');
  await lessonInput.press('Enter');
  await expect(page).toHaveURL(/lesson=\d+/);

  await page.getByRole('button', {name: /texte|text/i}).first().click();   // add a rich-text block
  await page.locator('.ql-editor').first().fill('Contenu E2E');
  await page.getByRole('button', {name: /enregistrer|save/i}).first().click();

  await page.reload();
  await expect(page).toHaveURL(/lesson=\d+/);
  await expect(page.getByText('Contenu E2E')).toBeVisible();
  await expect(page.locator('.p-dialog')).toHaveCount(0);
});
```

Check the "add block" and "save" button labels in `block-list-editor.html` / the FR catalog and the course-create submit label before running, and adjust the two `getByRole` names; the section create button in the outline must carry `data-testid="add-section-open"` / `add-section-input`.

- [ ] **Step 2: Run** `npm run test:e2e:fullstack -- course-authoring.spec.ts` (needs the fullstack backend on :8001 as in CI; locally rely on the CI job `e2e-fullstack`) → PASS.

- [ ] **Step 3: Commit, open PR 2**

```bash
git add quizonline-frontend/e2e/fullstack/course-authoring.spec.ts
git commit -m "test(lms): e2e création d'un cours sans fenêtre"
```

Push and open PR 2 (`feat(lms): éditeur de cours en deux panneaux`). Merge before PR 3.

---

## PR 3 — Reordering and safety

Branch `feat/lms-authoring-editor-dnd` from `main` after PR 2 is merged.

### Task 9: Drag and drop within and across sections

**Files:**
- Modify: `quizonline-frontend/src/app/services/catalog/catalog.service.ts` (add `moveLesson`)
- Modify: `course-outline.ts/.html`
- Modify: `outline.util.ts` (+ `applyLessonDrop`)
- Test: `outline.util.spec.ts`, `course-outline.spec.ts`

**Interfaces:**
- Consumes: `POST /lesson/{id}/move/` (Task 2), existing `reorderSections`, `reorderLessons`.
- Produces: `CatalogService.moveLesson(id: number, section: number, position: number): Observable<{lesson: LessonSummaryDto, source_section: SectionDto, target_section: SectionDto}>`; `applyLessonDrop(sections: SectionDto[], lessonId: number, toSection: number, toIndex: number): SectionDto[]` (pure, optimistic).

- [ ] **Step 1: Write the failing tests**

```ts
// outline.util.spec.ts (append)
import {applyLessonDrop} from './outline.util';

describe('applyLessonDrop', () => {
  const sections = [
    {id: 1, order: 0, lessons: [{id: 11, order: 0}, {id: 12, order: 1}]},
    {id: 2, order: 1, lessons: [{id: 21, order: 0}]},
  ] as never[];
  it('moves across sections and renumbers both', () => {
    const out = applyLessonDrop(sections as never, 12, 2, 0) as unknown as {id: number, lessons: {id: number, order: number}[]}[];
    expect(out[0].lessons.map((l) => [l.id, l.order])).toEqual([[11, 0]]);
    expect(out[1].lessons.map((l) => [l.id, l.order])).toEqual([[12, 0], [21, 1]]);
  });
  it('reorders within a section', () => {
    const out = applyLessonDrop(sections as never, 11, 1, 1) as unknown as {lessons: {id: number}[]}[];
    expect(out[0].lessons.map((l) => l.id)).toEqual([12, 11]);
  });
});
```

```ts
// course-outline.spec.ts (append)
it('a cross-section drop calls move and rolls back on error', () => {
  catalog.moveLesson = vi.fn().mockReturnValue(throwError(() => ({error: {detail: 'x'}})));
  // render a course with two sections, call the drop handler directly:
  // f.componentInstance['onLessonDrop']({previousContainer: {data: {sectionId: 10}}, container: {data: {sectionId: 20}}, previousIndex: 0, currentIndex: 0, item: {data: 5}} as never)
  // expect(catalog.moveLesson).toHaveBeenCalledWith(5, 20, 0); expect the outline back to its original sections.
});
```

Write that second test out fully with a two-section `course` fixture (sections `10` with lesson `5`, `20` empty), asserting `moveLesson` was called with `(5, 20, 0)` and that the last emitted `courseChange` equals the original sections after the error.

- [ ] **Step 2: Run to verify failure** → FAIL.

- [ ] **Step 3: Implement**

```ts
// outline.util.ts
export function applyLessonDrop<S extends {id: number; lessons?: L[]}, L extends {id: number; order: number}>(
  sections: S[], lessonId: number, toSection: number, toIndex: number): S[] {
  const lesson = sections.flatMap((s) => s.lessons ?? []).find((l) => l.id === lessonId);
  if (!lesson) return sections;
  const stripped = sections.map((s) => ({...s, lessons: (s.lessons ?? []).filter((l) => l.id !== lessonId)}));
  return stripped.map((s) => {
    if (s.id !== toSection) return {...s, lessons: s.lessons.map((l, i) => ({...l, order: i}))};
    const list = [...s.lessons];
    list.splice(Math.max(0, Math.min(toIndex, list.length)), 0, lesson);
    return {...s, lessons: list.map((l, i) => ({...l, order: i}))};
  });
}
```

```ts
// catalog.service.ts
  moveLesson(id: number, section: number, position: number) {
    return this.http.post<{lesson: LessonSummaryDto; source_section: SectionDto; target_section: SectionDto}>(
      `${this.baseUrl}/lesson/${id}/move/`, {section, position});
  }
```

In the outline: wrap the sections in `cdkDropListGroup`; each section's lesson list is a `cdkDropList` with `[cdkDropListData]="{sectionId: section.id}"`, each lesson `cdkDrag [cdkDragData]="lesson.id"` with a `cdkDragHandle`. `onLessonDrop(e)`: keep `before = course()`; emit `courseChange` with `applyLessonDrop(...)` (optimistic); same section → `reorderLessons(sectionId, ids)`, other section → `moveLesson(id, toSection, currentIndex)` and patch both sections from the response; on error → emit `before` and toast. Sections keep their own `cdkDropList` (vertical) with `reorderSections`.

- [ ] **Step 4: Run** specs → PASS; typecheck, build → OK.

- [ ] **Step 5: Commit**

```bash
git add quizonline-frontend
git commit -m "feat(lms): glisser-déposer des leçons entre sections"
```

### Task 10: Unsaved-work guard

**Files:**
- Modify: `quizonline-frontend/src/app/shared/learning/block-list-editor/block-list-editor.ts` (expose `hasUnsavedChanges()`)
- Modify: `lesson-content-editor.ts` (forward it), `content-tab.ts` (confirm before switching lesson), `course-edit.ts` (confirm before switching tab)
- Create: `quizonline-frontend/src/app/pages/course-edit/unsaved-changes.guard.ts`; register it on the `course/:id/edit` route in `app.routes.ts` (`canDeactivate`)
- Test: `block-list-editor.spec.ts` (create if absent), `unsaved-changes.guard.spec.ts`

**Interfaces:**
- Produces: `BlockListEditor.hasUnsavedChanges(): boolean` — `true` when `editingIds()` is non-empty; `LessonContentEditor.hasUnsavedChanges()` returns the child's value (via `viewChild(BlockListEditor)`); `CourseEditContentTab.hasUnsavedChanges()`; `CourseEdit.hasUnsavedChanges()`; `unsavedChangesGuard: CanDeactivateFn<{hasUnsavedChanges(): boolean}>`.

- [ ] **Step 1: Write the failing tests**

```ts
// unsaved-changes.guard.spec.ts
import {describe, expect, it, vi} from 'vitest';
import {unsavedChangesGuard} from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  it('lets through when nothing is unsaved', () => {
    expect(unsavedChangesGuard({hasUnsavedChanges: () => false}, {} as never, {} as never, {} as never)).toBe(true);
  });
  it('asks when something is unsaved', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(unsavedChangesGuard({hasUnsavedChanges: () => true}, {} as never, {} as never, {} as never)).toBe(false);
    expect(confirm).toHaveBeenCalled();
  });
});
```

```ts
// block-list-editor.spec.ts (append or create)
it('reports unsaved changes while a block is in edit mode', () => {
  // render BlockListEditor with one block, call component['startEdit'](blockId) (use the real method name
  // that adds to editingIds), then expect(component.hasUnsavedChanges()).toBe(true);
  // call the cancel method, expect false.
});
```

Write the second test fully with the real method names from `block-list-editor.ts` (the ones that `editingIds.update(...)` add / remove, lines ~236 and ~332).

In `content-tab.spec.ts` add: with `hasUnsavedChanges` returning `true` and `window.confirm` mocked to `false`, `onSelect(6)` does **not** call `router.navigate`.

- [ ] **Step 2: Run to verify failure** → FAIL.

- [ ] **Step 3: Implement**

```ts
// unsaved-changes.guard.ts
import {CanDeactivateFn} from '@angular/router';
import {inject} from '@angular/core';
import {UiTextService} from '../../shared/i18n/ui-text.service';

export interface HasUnsavedChanges { hasUnsavedChanges(): boolean; }

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) return true;
  return window.confirm(unsavedMessage());
};

function unsavedMessage(): string {
  try {
    return inject(UiTextService).editor().common.unsavedChangesConfirm;
  } catch {
    return 'Unsaved changes will be lost. Continue?';
  }
}
```

(Add `common.unsavedChangesConfirm` to the editor catalog in 5 languages: "Les modifications non enregistrées seront perdues. Continuer ?" / "Unsaved changes will be lost. Continue?" / "Niet-opgeslagen wijzigingen gaan verloren. Doorgaan?" / "Le modifiche non salvate andranno perse. Continuare?" / "Los cambios no guardados se perderán. ¿Continuar?". If `editor()` is not where `common` lives, put the key wherever `editorUi().common.back` comes from.)

`BlockListEditor`: `hasUnsavedChanges(): boolean { return this.editingIds().size > 0; }`. `content-tab.ts` `onSelect(id)`: `if (this.editor()?.hasUnsavedChanges() && !window.confirm(msg)) return;` before navigating (`editor = viewChild(LessonContentEditor)`). `course-edit.ts` `onTabChange`: same check via `viewChild(CourseEditContentTab)`. Route: `canDeactivate: [unsavedChangesGuard]` on `course/:id/edit`; `CourseEdit` implements `HasUnsavedChanges`.

- [ ] **Step 4: Run** specs → PASS; typecheck, `check:i18n`, build → OK.

- [ ] **Step 5: Commit, open PR 3**

```bash
git add quizonline-frontend
git commit -m "feat(lms): confirmation avant de quitter un bloc non enregistré"
```

Push and open PR 3 (`feat(lms): glisser-déposer entre sections et protection du travail`).

---

## Delivery

| PR | Branch | Tasks | Depends on |
|---|---|---|---|
| 1 | `feat/lms-authoring-editor` (carries the spec + plan commits) | 1–3 | — |
| 2 | `feat/lms-authoring-editor-ui` | 4–8 | PR 1 merged (generated client, `move` endpoint not used yet) |
| 3 | `feat/lms-authoring-editor-dnd` | 9–10 | PR 2 merged |

Before each PR: full backend suite (`1234+` passing), `npm run -s typecheck`, `npm run -s check:i18n` (0 missing), `npx eslint` on touched folders, `npx ng build`; CI jobs `backend`, `backend-quality`, `frontend`, `contract`, `e2e-fullstack` green.
