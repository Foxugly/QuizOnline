import customuser.managers
from django.db import migrations, models


def backfill_missing_emails(apps, schema_editor):
    """Give every user a usable login id before ``email`` becomes the
    required, unique ``USERNAME_FIELD``.

    Any user with a NULL/blank email would otherwise be locked out (and
    would break the ``null=False`` + ``unique`` constraint we add right
    after). We assign a deterministic, collision-free placeholder derived
    from the primary key. These are intentionally on the ``.invalid`` TLD
    (RFC 2606) so they can never receive mail — an operator must reset them
    to a real address out of band.
    """
    User = apps.get_model("customuser", "CustomUser")
    db_alias = schema_editor.connection.alias
    missing = User.objects.using(db_alias).filter(
        models.Q(email__isnull=True) | models.Q(email="")
    )
    count = 0
    for user in missing.iterator():
        user.email = f"user_{user.pk}@placeholder.invalid"
        user.save(using=db_alias, update_fields=["email"])
        count += 1
    print(
        f"\n[customuser.0006] Backfilled {count} placeholder email(s) "
        f"(user_<pk>@placeholder.invalid) for users with NULL/blank email."
    )


def noop_reverse(apps, schema_editor):
    # Backfill is not reversed: we cannot know which addresses were
    # originally NULL, and re-nulling them would be lossy. The schema
    # reversal (email nullable again + username re-added) is handled by
    # the operations below; the placeholder addresses simply remain.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("customuser", "0005_notification_prefs_two_channel"),
    ]

    operations = [
        migrations.RunPython(backfill_missing_emails, noop_reverse),
        migrations.AlterModelManagers(
            name="customuser",
            managers=[
                ("objects", customuser.managers.CustomUserManager()),
            ],
        ),
        migrations.AlterField(
            model_name="customuser",
            name="email",
            field=models.EmailField(
                max_length=254, unique=True, verbose_name="email address"
            ),
        ),
        migrations.RemoveField(
            model_name="customuser",
            name="username",
        ),
    ]
