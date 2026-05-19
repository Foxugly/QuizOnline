"""Meta-command that seeds every per-app Playwright fullstack fixture.

The legacy single command grew into a ~400-line catch-all spanning
quiz, LMS, etc. It now delegates to per-app commands so each module
owns its own seed and tests stay focused. The shared admin /
testuser / domain fixtures live in :mod:`core.seed_e2e` and each
per-app command re-runs them idempotently, so order does not matter
for re-runs.
"""

from __future__ import annotations

from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Run every per-app Playwright fullstack seed (quiz + LMS)."

    def handle(self, *args, **options):
        call_command("seed_quiz_e2e")
        call_command("seed_lms_e2e")
        self.stdout.write(self.style.SUCCESS("Seeded all e2e fixtures."))
