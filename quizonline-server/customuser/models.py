from django.apps import apps
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import QuerySet, Q
from django.utils.translation import gettext_lazy as _


class CustomUser(AbstractUser):
    email = models.EmailField(_("email address"), unique=True, blank=True, null=True, default=None)
    language = models.CharField(_("language"), max_length=8, choices=settings.LANGUAGES,
                                default=getattr(settings, "LANGUAGE_CODE", "en"))
    email_confirmed = models.BooleanField(default=False)
    must_change_password = models.BooleanField(default=False)
    nb_domain_max = models.PositiveIntegerField(default=0)
    # Per-kind opt-outs for non-critical notifications. Stored as a
    # ``{kind: bool}`` map; the absence of a key means "enabled" so a
    # fresh user gets every notification by default. Security-critical
    # mails (registration confirmation, password reset, magic-link
    # sign-in) are NOT gated by this map — they always send.
    notification_prefs = models.JSONField(default=dict, blank=True)

    current_domain = models.ForeignKey(
        "domain.Domain",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="current_users",
    )

    # -------------------------
    # Helpers internes
    # -------------------------
    @staticmethod
    def _domain_model():
        # Évite les imports circulaires
        return apps.get_model("domain", "Domain")

    def save(self, *args, **kwargs):
        # Normalize blank email to None so the unique constraint allows multiple empty emails.
        if not self.email:
            self.email = None
        super().save(*args, **kwargs)

    # -------------------------
    # Représentation
    # -------------------------
    def __str__(self):
        return self.get_display_name()

    def get_display_name(self):
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name} ({self.username})"
        return self.username

    def to_field_value_dict(self) -> dict[str, object]:
        """
        Retourne les champs concrets du modèle et leur valeur courante.
        Les relations FK sont renvoyées via leur `<field>_id`, comme sur l'instance Django.
        """
        return {
            field.attname: getattr(self, field.attname)
            for field in self._meta.concrete_fields
        }

    # -------------------------
    # Domain / permissions métier
    # -------------------------
    def can_manage_domain(self, domain) -> bool:
        """
        Retourne True si l'utilisateur peut "gérer" un Domain:
        - superuser Django (is_superuser) => True
        - owner du domain => True
        - manager du domaine (Domain.managers M2M, related_name="managed_domains") => True

        Note: is_staff Django seul ne suffit pas — seul is_superuser bypasse toutes les vérifications.
        """
        if domain is None:
            return False

        if self.is_superuser:
            return True

        # domain.owner_id est standard sur un ForeignKey
        if getattr(domain, "owner_id", None) == self.id:
            return True

        # Grâce à Domain.managers.related_name="managed_domains"
        # => self.managed_domains est disponible. ``domain`` may be a
        # SimpleNamespace passed by tests / hot paths, so resolve its
        # id defensively the same way ``owner_id`` was read above.
        domain_id = getattr(domain, "id", None)
        if domain_id is None:
            return False
        prefetched = getattr(self, "_prefetched_objects_cache", {})
        if "managed_domains" in prefetched:
            return any(prefetched_domain.id == domain_id for prefetched_domain in prefetched["managed_domains"])
        return self.managed_domains.filter(id=domain_id).exists()

    def get_manageable_domains(self, *, active_only: bool = False) -> QuerySet:
        """Domains the user can edit / admin (owner or manager).

        Superusers see everything. ``active_only=True`` filters out
        inactive rows.
        """
        Domain = self._domain_model()
        # Superusers have no JOIN -> no ``distinct()`` needed. Non-superuser
        # path goes through the ``managers`` M2M which duplicates rows when
        # the user has the manager link, hence the ``distinct()`` there only.
        if self.is_superuser:
            qs = Domain.objects.all()
        else:
            qs = Domain.objects.filter(Q(owner=self) | Q(managers=self)).distinct()
        if active_only:
            qs = qs.filter(active=True)
        return qs

    def can_create_domain(self) -> bool:
        """True quand l'utilisateur peut créer un nouveau domaine.

        Règle : ``nb_domain_max`` est un quota par-utilisateur défini
        par un superuser (champ du modèle, default 0). On peut créer
        tant que le nombre de domaines détenus est strictement
        inférieur au quota. Les superusers court-circuitent toujours
        le quota.

        Appelée par :func:`domain.views.DomainViewSet.perform_create`
        avant la sauvegarde, et par le frontend (``canCreateDomain``
        dans le topmenu + ``domainAccessGuard``) pour gater l'entrée
        Domaines. Les deux côtés doivent rester en miroir — modifier
        la règle ici suppose de la propager côté Angular.
        """
        if self.is_superuser:
            return True
        Domain = self._domain_model()
        owned = Domain.objects.filter(owner=self).count()
        quota = self.nb_domain_max or 0
        return owned < quota

    def get_visible_domains(self, *, active_only: bool = True) -> QuerySet:
        """Domains the user may see in a dropdown / set as ``current_domain``.

        **Not** an alias of :meth:`get_manageable_domains` — the predicate
        is wider here. A user can be a domain ``members`` link (a learner
        linked to a learning domain without any admin right) and still
        need that domain to show up in the "switch current domain" UI.
        That is why we OR in ``Q(members=self)`` on top of the
        ``owner | managers`` set returned by :meth:`get_manageable_domains`.

        Stays separate from :meth:`get_manageable_domains` so the two
        permission gates stay clear:

        - **visible** ⇒ may select / read
        - **manageable** ⇒ may edit / admin

        Mixing the two would silently widen instructor surfaces or
        hide learner choices, depending on the direction.
        """
        Domain = self._domain_model()
        # Same shape as ``get_manageable_domains``: superuser short-circuit
        # avoids a wasted ``distinct()`` on the no-JOIN path.
        if self.is_superuser:
            qs = Domain.objects.all()
        else:
            qs = Domain.objects.filter(
                Q(owner=self) | Q(managers=self) | Q(members=self),
            ).distinct()
        if active_only:
            qs = qs.filter(active=True)
        return qs

    def set_current_domain(self, domain, *, allow_none: bool = True, save: bool = True) -> None:
        """Safe setter for the user's ``current_domain`` foreign key.

        Visibility check, not management check: the user is allowed to
        select any domain returned by :meth:`get_visible_domains`, which
        includes ``members``-only links. This is intentional — a learner
        linked to a learning domain needs to be able to set it as their
        current domain even though they cannot edit its content. The
        per-action authorization for writes still goes through
        :meth:`can_manage_domain` at the view layer.

        - ``allow_none=True`` lets the caller reset (``domain=None``)
        - ``save=True`` persists immediately via
          ``update_fields=["current_domain"]``
        """
        if domain is None:
            if not allow_none:
                raise ValueError("current_domain cannot be None.")
            self.current_domain = None
            if save:
                self.save(update_fields=["current_domain"])
            return

        if not self.get_visible_domains(active_only=False).filter(id=domain.id).exists():
            raise PermissionError("User cannot set this domain as current.")
        if domain.active is False:
            raise ValidationError({"current_domain": "This domain is inactive."})

        self.current_domain = domain
        if save:
            self.save(update_fields=["current_domain"])

    def ensure_current_domain_is_valid(self, *, auto_fix: bool = False, active_only: bool = True) -> bool:
        """
        Vérifie si current_domain est:
        - gérable par l'utilisateur
        - et (optionnel) actif

        Si auto_fix=True:
        - tente de mettre current_domain au premier domaine visible, sinon None
        """
        cd = self.current_domain
        if cd is None:
            if auto_fix:
                self.pick_default_current_domain(save=True, active_only=active_only)
            return True

        if active_only and cd.active is False:
            if auto_fix:
                self.pick_default_current_domain(save=True, active_only=active_only)
            return False

        if not self.get_visible_domains(active_only=False).filter(id=cd.id).exists():
            if auto_fix:
                self.pick_default_current_domain(save=True, active_only=active_only)
            return False

        return True

    def pick_default_current_domain(self, *, save: bool = True, active_only: bool = True):
        """
        Choisit un domaine par défaut :
        - premier domaine visible (actif si active_only=True)
        - sinon None
        """
        # ``get_visible_domains`` already returns a distinct queryset; the
        # ``order_by("translations__name")`` parler JOIN can still re-duplicate
        # rows when a domain has translations in several allowed languages,
        # so re-apply ``.distinct()`` once at the end.
        qs = self.get_visible_domains(active_only=active_only).order_by("translations__name", "id").distinct()
        domain = qs.first()
        self.current_domain = domain
        if save:
            self.save(update_fields=["current_domain"])
        return domain

    # -------------------------
    # Validation modèle
    # -------------------------
    def clean(self):
        """
        Validation côté modèle (utile en admin et parfois en tests).
        Interdit current_domain si non gérable, sauf staff global/superuser.
        """
        super().clean()

        if self.current_domain is None:
            return

        if not self.get_visible_domains(active_only=False).filter(id=self.current_domain_id).exists():
            raise ValidationError({"current_domain": "This domain is not visible to the user."})
        if self.current_domain.active is False:
            raise ValidationError({"current_domain": "This domain is inactive."})

    # -------------------------
    # Qualité de vie (facultatif)
    # -------------------------
    @property
    def has_current_domain(self) -> bool:
        return self.current_domain_id is not None

    @property
    def requires_password_change(self) -> bool:
        # Public-facing alias of the storage column ``must_change_password`` —
        # surfaced under this name by the user serializer and the admin
        # readonly badge.
        return self.must_change_password


class Notification(models.Model):
    """
    Per-user in-app notification row. One row per (user, kind, payload),
    independent of the email channel — the web channel is always emitted
    while the email side is gated by ``CustomUser.notification_prefs``.

    ``kind`` matches the constants in :mod:`customuser.notifications`
    (``domain.join_request.created``, …). ``payload`` is a JSON blob
    used by the frontend to render the human-readable line (domain
    name, target user display name, reject reason, …) without
    re-querying the database.

    Soft-delete via ``deleted_at`` and soft-read via ``read_at`` so
    we never lose history. The unread badge in the topmenu is served
    by the ``unread_count`` action on ``NotificationViewSet`` (see
    ``customuser/notification_views.py``), which runs the equivalent
    of ``COUNT(*) WHERE read_at IS NULL AND deleted_at IS NULL``
    over the caller's own rows.
    """

    KIND_MAX_LENGTH = 64

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    kind = models.CharField(max_length=KIND_MAX_LENGTH, db_index=True)
    payload = models.JSONField(default=dict, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "-created_at"], name="notif_user_ct_idx"),
            models.Index(fields=["user", "read_at"], name="notif_user_read_idx"),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user_id}/{self.kind}@{self.created_at:%Y-%m-%dT%H:%M:%S}"

    @property
    def is_read(self) -> bool:
        return self.read_at is not None

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None
