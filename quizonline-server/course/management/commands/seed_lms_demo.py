"""Seed an LMS demo dataset (idempotent)."""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from block.models import ContentBlock
from domain.models import Domain
from language.models import Language
from lesson.models import Lesson

from course.models import Course, Section


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
            domain.set_current_language("fr")
            domain.name = "Demo Domain"
            domain.save()
            domain.allowed_languages.add(fr, en)

        course = Course.objects.filter(slug="demo-python").first()
        if not course:
            course = Course(
                domain=domain, slug="demo-python", language=fr,
                level=Course.LEVEL_BEGINNER, enrollment_mode=Course.ENROLL_OPEN,
                is_published=True, published_at=timezone.now(),
                created_by=owner,
            )
            course.set_current_language("fr")
            course.title = "Introduction à Python"
            course.save()
            course.set_current_language("en")
            course.title = "Introduction to Python"
            course.save()

            s1 = Section.objects.create(course=course, order=0, is_published=True)
            s1.set_current_language("fr")
            s1.title = "Module 1 — Bases"
            s1.save()

            lesson = Lesson.objects.create(
                section=s1, slug="hello-world", order=0, is_published=True, estimated_duration=10,
            )
            lesson.set_current_language("fr")
            lesson.title = "Bonjour, le monde"
            lesson.save()

            ContentBlock.objects.create(
                lesson=lesson, block_type=ContentBlock.TYPE_CODE,
                order=0, code_language="python", code_content="print('Bonjour!')",
            )

        self.stdout.write(self.style.SUCCESS(f"Seeded demo course #{course.id}"))
