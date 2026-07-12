# question/tests/test_views.py
import json
import uuid

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from domain.models import Domain
from language.models import Language
from subject.models import Subject
from question.models import Question

User = get_user_model()


class QuestionViewSetTests(APITestCase):
    # -------------------------
    # URL helpers
    # -------------------------
    def _list_url(self):
        return reverse("api:question-api:question-list")

    def _detail_url(self, q: Question):
        # ViewSet lookup_url_kwarg="question_id"
        return reverse("api:question-api:question-detail", kwargs={"question_id": q.pk})

    # -------------------------
    # builders
    # -------------------------
    def _mk_user(self, *, is_staff: bool) -> User:
        return User.objects.create_user(
            email=f"u_{uuid.uuid4().hex[:8]}@example.test",
            password="pass",
            is_staff=is_staff,
        )

    def _mk_language(self, code: str) -> Language:
        obj, _ = Language.objects.get_or_create(code=code)
        return obj

    def _mk_domain(self, owner: User, allowed_codes=("fr", "nl")) -> Domain:
        d = Domain.objects.create(owner=owner, active=True)

        # parler translations
        d.set_current_language("fr")
        d.name = "Domain FR"
        d.description = ""
        d.save()

        langs = [self._mk_language(c) for c in allowed_codes]
        d.allowed_languages.set(langs)
        return d

    def _mk_subject(self, domain: Domain, *, name_fr="Math") -> Subject:
        s = Subject.objects.create(domain=domain, active=True)
        s.set_current_language("fr")
        s.name = name_fr
        s.description = ""
        s.save()
        return s

    def _set_question_translation(self, question: Question, language_code: str, *, title: str) -> Question:
        # Phase 3 LMS refactor: only ``title`` remains as a parler field
        # on Question. ``description`` / ``explanation`` migrated to
        # block rows under the ``prompt`` / ``explanation`` roles —
        # tests that need them build blocks explicitly.
        translation_model = question._parler_meta.root_model
        translation_model.objects.update_or_create(
            master_id=question.pk,
            language_code=language_code,
            defaults={"title": title},
        )
        question.refresh_from_db()
        return question

    def _payload_create(self, domain: Domain, *, subject_ids=None):
        subject_ids = subject_ids or []

        return {
            "domain": domain.pk,
            "translations": {
                "fr": {"title": "Titre FR"},
                "nl": {"title": "Titel NL"},
            },
            "allow_multiple_correct": False,
            "active": True,
            "is_mode_practice": True,
            "is_mode_exam": True,
            "subject_ids": subject_ids,
            "answer_options": [
                {
                    "is_correct": True,
                    "sort_order": 1,
                    "blocks": [{
                        "block_type": "rich_text",
                        "translations": {"fr": {"rich_text": "A"}, "nl": {"rich_text": "A"}},
                    }],
                },
                {
                    "is_correct": False,
                    "sort_order": 2,
                    "blocks": [{
                        "block_type": "rich_text",
                        "translations": {"fr": {"rich_text": "B"}, "nl": {"rich_text": "B"}},
                    }],
                },
            ],
        }

    def _payload_to_multipart(self, payload: dict) -> dict:
        out = dict(payload)

        if isinstance(out.get("translations"), dict):
            out["translations"] = json.dumps(out["translations"])
        if isinstance(out.get("answer_options"), list):
            out["answer_options"] = json.dumps(out["answer_options"])

        out["domain"] = str(out["domain"])
        out["subject_ids"] = [str(x) for x in out.get("subject_ids", [])]

        return out

    # -------------------------
    # setup
    # -------------------------
    def setUp(self):
        self.staff = self._mk_user(is_staff=True)
        self.user = self._mk_user(is_staff=False)
        self.domain_owner = self._mk_user(is_staff=False)
        self.domain_staff = self._mk_user(is_staff=False)
        self.domain_member = self._mk_user(is_staff=False)
        self.outsider = self._mk_user(is_staff=False)
        self.domain = self._mk_domain(self.staff, allowed_codes=("fr", "nl"))
        self.other_domain = self._mk_domain(self.staff, allowed_codes=("fr", "nl"))
        self.domain.owner = self.domain_owner
        self.domain.save(update_fields=["owner"])
        self.domain.managers.add(self.domain_staff)
        self.domain.members.add(self.domain_member)
        self.domain_owner.current_domain = self.domain
        self.domain_owner.save(update_fields=["current_domain"])
        self.domain_staff.current_domain = self.domain
        self.domain_staff.save(update_fields=["current_domain"])
        self.domain_member.current_domain = self.domain
        self.domain_member.save(update_fields=["current_domain"])

    # =========================================================
    # Permissions
    # =========================================================
    def test_permissions_list_forbidden_for_anonymous(self):
        resp = self.client.get(self._list_url())
        self.assertIn(resp.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_permissions_list_returns_empty_for_user_without_visible_domain(self):
        self.client.force_authenticate(self.outsider)
        resp = self.client.get(self._list_url())
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        items = data["results"] if isinstance(data, dict) and "results" in data else data
        self.assertEqual(items, [])

    def test_permissions_list_ok_for_domain_owner(self):
        self.client.force_authenticate(self.domain_owner)
        resp = self.client.get(self._list_url())
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_permissions_list_ok_for_domain_staff(self):
        self.client.force_authenticate(self.domain_staff)
        resp = self.client.get(self._list_url())
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_member_cannot_list_questions(self):
        """Security regression (P1): the /api/question/ editor endpoint exposes
        is_correct, so it must be scoped to MANAGEABLE domains (owner/managers),
        NOT visible (which also includes members/learners). A domain member must
        get an empty list; a manager of the same domain still sees the question."""
        q = Question.objects.create(
            domain=self.domain, active=True, is_mode_practice=True, is_mode_exam=True
        )
        q.set_current_language("fr")
        q.title = "Secret"
        q.save()

        self.client.force_authenticate(self.domain_member)
        resp = self.client.get(self._list_url())
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        items = data["results"] if isinstance(data, dict) and "results" in data else data
        self.assertEqual(items, [])

        self.client.force_authenticate(self.domain_staff)
        resp = self.client.get(self._list_url())
        data = resp.json()
        items = data["results"] if isinstance(data, dict) and "results" in data else data
        self.assertIn(q.id, {it["id"] for it in items})

    def test_list_ignores_empty_subject_ids_query_param(self):
        visible = Question.objects.create(domain=self.domain, active=True, is_mode_practice=True, is_mode_exam=True)
        visible.set_current_language("fr")
        visible.title = "Visible"
        visible.save()

        self.client.force_authenticate(self.domain_staff)
        resp = self.client.get(f"{self._list_url()}?domain={self.domain.id}&subject_ids=")

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        items = data["results"] if isinstance(data, dict) and "results" in data else data
        returned_ids = {item["id"] for item in items}
        self.assertIn(visible.id, returned_ids)

    def test_permissions_list_returns_empty_for_staff_without_linked_domain(self):
        self.client.force_authenticate(self.staff)
        resp = self.client.get(self._list_url())
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        items = data["results"] if isinstance(data, dict) and "results" in data else data
        self.assertEqual(items, [])

    def test_staff_without_linked_domain_does_not_see_other_domain_questions(self):
        foreign_owner = self._mk_user(is_staff=False)
        self.other_domain.owner = foreign_owner
        self.other_domain.save(update_fields=["owner"])

        visible = Question.objects.create(domain=self.domain, active=True, is_mode_practice=True, is_mode_exam=True)
        visible.set_current_language("fr")
        visible.title = "Domain A"
        visible.save()

        other = Question.objects.create(domain=self.other_domain, active=True, is_mode_practice=True, is_mode_exam=True)
        other.set_current_language("fr")
        other.title = "Domain B"
        other.save()

        self.client.force_authenticate(self.staff)
        resp = self.client.get(self._list_url())
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        items = data["results"] if isinstance(data, dict) and "results" in data else data
        returned_ids = {item["id"] for item in items}
        self.assertNotIn(visible.id, returned_ids)
        self.assertNotIn(other.id, returned_ids)

    def test_list_only_returns_questions_from_visible_domains(self):
        visible = Question.objects.create(domain=self.domain, active=True, is_mode_practice=True, is_mode_exam=True)
        visible.set_current_language("fr")
        visible.title = "Visible"
        visible.save()

        foreign_owner = self._mk_user(is_staff=False)
        foreign_domain = self._mk_domain(foreign_owner, allowed_codes=("fr", "nl"))
        hidden = Question.objects.create(domain=foreign_domain, active=True, is_mode_practice=True, is_mode_exam=True)
        hidden.set_current_language("fr")
        hidden.title = "Hidden"
        hidden.save()

        self.client.force_authenticate(self.domain_staff)
        resp = self.client.get(self._list_url())
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        items = data["results"] if isinstance(data, dict) and "results" in data else data
        returned_ids = {item["id"] for item in items}
        self.assertIn(visible.id, returned_ids)
        self.assertNotIn(hidden.id, returned_ids)

    def test_stale_current_domain_does_not_grant_question_access(self):
        visible = Question.objects.create(domain=self.domain, active=True, is_mode_practice=True, is_mode_exam=True)
        visible.set_current_language("fr")
        visible.title = "Visible"
        visible.save()

        self.outsider.current_domain = self.domain
        self.outsider.save(update_fields=["current_domain"])
        self.domain.owner = self.domain_owner
        self.domain.save(update_fields=["owner"])

        self.client.force_authenticate(self.outsider)
        resp = self.client.get(self._list_url())
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        items = data["results"] if isinstance(data, dict) and "results" in data else data
        self.assertEqual(items, [])

    # =========================================================
    # LIST + search
    # =========================================================
    def test_list_search_filters_by_title_translation_icontains(self):
        q1 = Question.objects.create(domain=self.domain, active=True, is_mode_practice=True, is_mode_exam=True)
        self._set_question_translation(q1, "fr", title="UniqueFoo")

        q2 = Question.objects.create(domain=self.domain, active=True, is_mode_practice=True, is_mode_exam=True)
        self._set_question_translation(q2, "fr", title="Bar")

        self.client.force_authenticate(self.domain_owner)
        resp = self.client.get(self._list_url(), {"search": "foo"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        data = resp.json()
        items = data["results"] if isinstance(data, dict) and "results" in data else data
        self.assertEqual(len(items), 1)

        self.assertIn("translations", items[0])
        self.assertIn("fr", items[0]["translations"])
        self.assertEqual(items[0]["translations"]["fr"]["title"], "UniqueFoo")

    def test_list_search_truncates_oversized_query_param(self):
        q1 = Question.objects.create(domain=self.domain, active=True, is_mode_practice=True, is_mode_exam=True)
        self._set_question_translation(q1, "fr", title="A" * 200)

        q2 = Question.objects.create(domain=self.domain, active=True, is_mode_practice=True, is_mode_exam=True)
        self._set_question_translation(q2, "fr", title="B" * 200)

        self.client.force_authenticate(self.domain_owner)
        resp = self.client.get(self._list_url(), {"search": ("A" * 200) + ("B" * 5000)})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        data = resp.json()
        items = data["results"] if isinstance(data, dict) and "results" in data else data
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["translations"]["fr"]["title"], "A" * 200)

    # =========================================================
    # CREATE (JSON)
    # =========================================================
    def test_create_json_full_with_subjects_and_options(self):
        s1 = self._mk_subject(self.domain, name_fr="S1")
        s2 = self._mk_subject(self.domain, name_fr="S2")

        payload = self._payload_create(
            self.domain,
            subject_ids=[s1.pk, s2.pk],
        )

        self.client.force_authenticate(self.domain_owner)
        resp = self.client.post(self._list_url(), data=payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.json())

        qid = resp.json()["id"]
        q = (
            Question.objects
            .prefetch_related("subjects", "answer_options", "translations")
            .get(pk=qid)
        )

        self.assertEqual(q.subjects.count(), 2)
        self.assertEqual(q.answer_options.count(), 2)

        # show_correct=True for staff => is_correct present
        self.assertIn("answer_options", resp.json())
        self.assertIn("is_correct", resp.json()["answer_options"][0])
        # Phase 3 LMS refactor: option content surfaces as a nested
        # block list, not a per-language translation map.
        first_blocks = resp.json()["answer_options"][0]["blocks"]
        self.assertEqual(first_blocks[0]["translations"]["fr"]["rich_text"], "A")

    def test_create_json_sets_created_by(self):
        s1 = self._mk_subject(self.domain, name_fr="S1")
        payload = self._payload_create(self.domain, subject_ids=[s1.pk])

        self.client.force_authenticate(self.domain_owner)
        resp = self.client.post(self._list_url(), data=payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.json())

        question = Question.objects.get(pk=resp.json()["id"])
        self.assertEqual(question.created_by_id, self.domain_owner.id)
        self.assertEqual(question.updated_by_id, self.domain_owner.id)

    def test_patch_sets_updated_by(self):
        q = Question.objects.create(domain=self.domain, active=True, is_mode_practice=True, is_mode_exam=True)
        q.set_current_language("fr")
        q.title = "Patch audit"
        q.save()

        self.client.force_authenticate(self.domain_owner)
        resp = self.client.patch(self._detail_url(q), data={"active": False}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.json())

        q.refresh_from_db()
        self.assertEqual(q.updated_by_id, self.domain_owner.id)

    def test_create_rejects_subject_from_other_domain(self):
        valid_subject = self._mk_subject(self.domain, name_fr="S1")
        foreign_subject = self._mk_subject(self.other_domain, name_fr="Foreign S")

        payload = self._payload_create(
            self.domain,
            subject_ids=[valid_subject.pk, foreign_subject.pk],
        )

        self.client.force_authenticate(self.domain_owner)
        resp = self.client.post(self._list_url(), data=payload, format="json")

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("subject_ids", resp.json())

    def test_create_rejects_domain_not_manageable_by_user(self):
        payload = self._payload_create(self.other_domain)

        self.client.force_authenticate(self.domain_owner)
        resp = self.client.post(self._list_url(), data=payload, format="json")

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("domain", resp.json())

    # =========================================================
    # CREATE (multipart) - ensures _coerce_json_fields works
    # =========================================================
    def test_create_multipart_coerces_ids_and_json_strings(self):
        s1 = self._mk_subject(self.domain, name_fr="S1")
        s2 = self._mk_subject(self.domain, name_fr="S2")

        payload = self._payload_create(
            self.domain,
            subject_ids=[s1.pk, s2.pk],
        )
        mp = self._payload_to_multipart(payload)

        self.client.force_authenticate(self.domain_owner)
        resp = self.client.post(self._list_url(), data=mp, format="multipart")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.json())

        q = Question.objects.get(pk=resp.json()["id"])
        self.assertEqual(q.subjects.count(), 2)

    def test_patch_rejects_domain_change_when_existing_subjects_belong_to_other_domain(self):
        q = Question.objects.create(domain=self.domain, active=True, is_mode_practice=True, is_mode_exam=True)
        q.set_current_language("fr")
        q.title = "Keep domain consistency"
        q.save()

        subject = self._mk_subject(self.domain, name_fr="Current S")
        q.subjects.set([subject])

        self.domain.managers.add(self.staff)
        self.staff.current_domain = self.domain
        self.staff.save(update_fields=["current_domain"])

        self.client.force_authenticate(self.staff)
        resp = self.client.patch(
            self._detail_url(q),
            data={"domain": self.other_domain.pk},
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("subject_ids", resp.json())

    # =========================================================
    # DESTROY
    # =========================================================
    def test_destroy_deletes_question(self):
        q = Question.objects.create(domain=self.domain, active=True, is_mode_practice=True, is_mode_exam=True)
        q.set_current_language("fr")
        q.title = "ToDel"
        q.save()

        self.client.force_authenticate(self.domain_owner)
        resp = self.client.delete(self._detail_url(q))
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)

    def test_retrieve_hidden_for_user_outside_domain(self):
        q = Question.objects.create(domain=self.domain, active=True, is_mode_practice=True, is_mode_exam=True)
        q.set_current_language("fr")
        q.title = "Hidden"
        q.save()

        self.client.force_authenticate(self.outsider)
        resp = self.client.get(self._detail_url(q))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

        self.assertTrue(Question.objects.filter(pk=q.pk).exists())
