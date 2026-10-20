"""Re-sanitize every stored ``BlockTranslation.rich_text`` with nh3.

Rows written before the ``pre_save`` hook (e.g. through the course import,
which only sanitized the course fields, or the legacy question migration)
may hold raw HTML that the SPA renders via ``bypassSecurityTrustHtml``.
"""

from django.db import migrations

from block.sanitizer import sanitize_rich_text


def sanitize_rows(apps, schema_editor):
    BlockTranslation = apps.get_model("block", "BlockTranslation")
    rows = BlockTranslation.objects.values_list("pk", "rich_text").iterator()
    for pk, raw in rows:
        cleaned = sanitize_rich_text(raw or "")
        if cleaned != raw:
            BlockTranslation.objects.filter(pk=pk).update(rich_text=cleaned)


class Migration(migrations.Migration):

    dependencies = [
        ("block", "0003_upload_allowlist"),
    ]

    operations = [
        migrations.RunPython(sanitize_rows, migrations.RunPython.noop),
    ]
