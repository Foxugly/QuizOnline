from django.conf import settings
from django.db.models.signals import pre_delete
from django.dispatch import receiver

from .models import Certificate


@receiver(pre_delete, sender=settings.AUTH_USER_MODEL)
def snapshot_holder_name_before_user_delete(sender, instance, **kwargs):
    """Freeze the latest display name on the user's certificates just before
    ``Certificate.user`` is nulled by ``on_delete=SET_NULL`` (GDPR erasure),
    so the public verification page keeps showing who it was issued to. The
    snapshot is the full name only: the e-mail is never kept."""
    Certificate.objects.filter(user=instance).update(
        holder_name=Certificate.holder_name_for(instance),
    )
