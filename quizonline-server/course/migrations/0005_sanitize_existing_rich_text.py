"""Re-sanitize every stored course ``description`` / ``learning_objectives``.

Both are rendered via ``bypassSecurityTrustHtml`` on the SPA; rows written
before sanitize-on-write may still hold raw HTML.
"""

from django.db import migrations

from block.sanitizer import sanitize_rich_text

FIELDS = ("description", "learning_objectives")


def sanitize_rows(apps, schema_editor):
    CourseTranslation = apps.get_model("course", "CourseTranslation")
    for pk, *values in CourseTranslation.objects.values_list("pk", *FIELDS).iterator():
        changes = {}
        for field, raw in zip(FIELDS, values, strict=True):
            cleaned = sanitize_rich_text(raw or "")
            if cleaned != raw:
                changes[field] = cleaned
        if changes:
            CourseTranslation.objects.filter(pk=pk).update(**changes)


class Migration(migrations.Migration):

    dependencies = [
        ("course", "0004_alter_coursetranslation_unique_together_and_more"),
    ]

    operations = [
        migrations.RunPython(sanitize_rows, migrations.RunPython.noop),
    ]
