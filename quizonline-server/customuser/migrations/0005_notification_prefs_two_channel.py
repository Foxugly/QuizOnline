"""
Data migration: convert legacy ``CustomUser.notification_prefs`` shape
``{kind: false}`` to the new two-channel shape
``{kind: {"email": false, "web": true}}``.

Legacy semantics: ``false`` meant "mute the email for that kind; web
was always on" (no web channel existed yet). The new shape preserves
that semantics exactly — old false rows become "email off, web on".

True values (and missing keys) were already "everything on"; the new
shape encodes that as a missing key, so we just leave them out.
"""

from django.db import migrations


def _legacy_to_two_channel(prefs):
    if not isinstance(prefs, dict):
        return {}
    out = {}
    for kind, value in prefs.items():
        if value is False:
            out[kind] = {"email": False}
        elif isinstance(value, dict):
            channel_map = {}
            for channel in ("email", "web"):
                if value.get(channel) is False:
                    channel_map[channel] = False
            if channel_map:
                out[kind] = channel_map
        # True / missing == enabled, no row to write.
    return out


def forward(apps, schema_editor):
    User = apps.get_model("customuser", "CustomUser")
    for user in User.objects.exclude(notification_prefs={}).iterator():
        updated = _legacy_to_two_channel(user.notification_prefs)
        if updated != user.notification_prefs:
            user.notification_prefs = updated
            user.save(update_fields=["notification_prefs"])


def backward(apps, schema_editor):
    """Best-effort downgrade: collapse to legacy boolean when only the
    email channel was disabled, drop the entry otherwise (lossy)."""
    User = apps.get_model("customuser", "CustomUser")
    for user in User.objects.exclude(notification_prefs={}).iterator():
        if not isinstance(user.notification_prefs, dict):
            continue
        rolled_back = {}
        for kind, value in user.notification_prefs.items():
            if isinstance(value, dict):
                email_off = value.get("email") is False
                web_off = value.get("web") is False
                if email_off and not web_off:
                    rolled_back[kind] = False
                # Other combinations cannot be expressed in the old
                # shape; drop them rather than misrepresent the intent.
        if rolled_back != user.notification_prefs:
            user.notification_prefs = rolled_back
            user.save(update_fields=["notification_prefs"])


class Migration(migrations.Migration):

    dependencies = [
        ("customuser", "0004_notification"),
    ]

    operations = [
        migrations.RunPython(forward, backward),
    ]
