from django.core.management.base import BaseCommand

from core.delivery import process_pending_outbound_emails


class Command(BaseCommand):
    help = "Send queued outbound emails."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=100)

    def handle(self, *args, **options):
        limit = max(1, options["limit"])
        sent = process_pending_outbound_emails(limit=limit)
        self.stdout.write(self.style.SUCCESS(f"Processed {sent} email(s)."))
