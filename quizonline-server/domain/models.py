from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _
from parler.models import TranslatableModel, TranslatedFields
from config.models import AuditMixin

User = get_user_model()


def settings_language_codes() -> set[str]:
    return {code for code, _ in getattr(settings, "LANGUAGES", [])}


class JoinPolicy(models.TextChoices):
    AUTO = "auto", _("Automatic")
    OWNER = "owner", _("Owner validation")
    OWNER_MANAGERS = "owner_managers", _("Owner or managers validation")


class Domain(AuditMixin, TranslatableModel):
    """
        Domain represents a logical grouping of subjects and questions,
        with multilingual support and language restrictions.
    """
    translations = TranslatedFields(
        name=models.CharField(_("name"), max_length=120),
        description=models.TextField(_("description"), blank=True),
        # Title rendered under the signatory name on the certificate PDF
        # (e.g. "President", "Directeur"). Personal names are not
        # translatable (a name is a name), but the role title is.
        certificate_signatory_title=models.CharField(
            _("certificate signatory title"), max_length=120, blank=True,
        ),
    )

    # Per-domain certificate branding. ``logo`` and ``signatory_name``
    # are non-translatable (a logo is a single image, a personal name
    # doesn't translate). ``certificate_signatory_title`` lives in the
    # parler ``translations`` block above.
    certificate_logo = models.ImageField(
        upload_to="domain/certificate-logos/", blank=True, null=True,
    )
    certificate_signatory_name = models.CharField(max_length=200, blank=True)

    allowed_languages = models.ManyToManyField(
        "language.Language",
        related_name="domains",
        blank=True,
    )
    active = models.BooleanField(default=True, db_index=True)
    # Public = discoverable through the "available domains" catalog and
    # joinable via a normal join-request. When False, the domain is
    # hidden from non-members and can only be joined through an emailed
    # invitation. Existing members keep access — visibility only.
    public = models.BooleanField(default=True, db_index=True)

    join_policy = models.CharField(
        max_length=20,
        choices=JoinPolicy.choices,
        default=JoinPolicy.AUTO,
    )

    owner = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="owned_domains",
    )

    managers = models.ManyToManyField(
        User,
        blank=True,
        related_name="managed_domains",
    )
    members = models.ManyToManyField(
        User,
        blank=True,
        related_name="linked_domains",
    )

    # Per-kind, per-channel notification gates owned by the *domain*.
    # Shape: ``{kind: {"email": bool, "web": bool}}``. Missing keys or
    # channels default to ``True`` (enabled). The user side
    # (``CustomUser.notification_prefs``) is intersected with this at
    # emission time — either side saying False mutes the channel.
    notification_settings = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        return self.safe_translation_getter("name", any_language=True) or f"Domain#{self.pk}"

    def clean(self):
        super().clean()
        if not self.pk:
            return
        valid = settings_language_codes()
        codes = set(self.allowed_languages.values_list("code", flat=True))

        invalid = sorted([c for c in codes if c not in valid])
        if invalid:
            raise ValidationError(
                {"allowed_languages": [f"Invalid language code(s): {', '.join(invalid)}"]}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def ensure_managers_are_members(self) -> None:
        """
        Business rule:
        - a domain manager (Domain.managers M2M) must always remain a domain member
        - removing manager status does not remove membership
        """
        manager_ids = self.managers.values_list("id", flat=True)
        self.members.add(*manager_ids)


class DomainJoinRequest(models.Model):
    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_PENDING, _("Pending")),
        (STATUS_APPROVED, _("Approved")),
        (STATUS_REJECTED, _("Rejected")),
        (STATUS_CANCELLED, _("Cancelled")),
    ]

    domain = models.ForeignKey(
        Domain,
        on_delete=models.CASCADE,
        related_name="join_requests",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="domain_join_requests",
    )
    status = models.CharField(
        max_length=16,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )

    decided_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="decided_domain_join_requests",
    )
    decided_at = models.DateTimeField(null=True, blank=True)
    reject_reason = models.TextField(blank=True, max_length=500)
    # Set when the daily expiry-warning task has emailed the requester.
    # Stored as a timestamp (not a boolean) so we can audit when the
    # warning went out and never re-fire it on the same row.
    expiry_warning_sent_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["domain", "user"],
                condition=models.Q(status="pending"),
                name="uniq_pending_join_request_per_domain_user",
            ),
        ]
        indexes = [
            models.Index(fields=["domain", "status"], name="dom_join_req_dom_st_idx"),
            models.Index(fields=["user", "status"], name="dom_join_req_user_st_idx"),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user} → {self.domain} ({self.status})"


class DomainInvite(models.Model):
    """
    Outstanding email invitation to join a domain.

    The signed token in the mail is still self-contained — see
    :mod:`domain.invite_token` — but persisting one row per pending
    invitation gives us three properties the stateless design did not
    have:

    1. **Resend**: an owner who lost the original mail can re-send
       without remembering the exact addresses.
    2. **Revoke**: an owner who changes their mind can mark the row
       revoked; the accept endpoint cross-checks the row state so the
       token alone is not enough.
    3. **Audit / dashboard**: visible list of "I invited 3 people, 1
       accepted, 2 still pending."

    Only one ``pending`` row per ``(domain, email)`` at a time; the
    partial unique constraint kicks in on the second insert and the
    invite view re-uses the existing row instead.
    """

    STATUS_PENDING = "pending"
    STATUS_ACCEPTED = "accepted"
    STATUS_REVOKED = "revoked"
    STATUS_CHOICES = [
        (STATUS_PENDING, _("Pending")),
        (STATUS_ACCEPTED, _("Accepted")),
        (STATUS_REVOKED, _("Revoked")),
    ]

    domain = models.ForeignKey(
        Domain,
        on_delete=models.CASCADE,
        related_name="invites",
    )
    email = models.EmailField(db_index=True)
    inviter = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sent_domain_invites",
    )
    status = models.CharField(
        max_length=16,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True,
    )
    # Pre-computed for cheap queries ("which invites expire in 3 days").
    # The accept endpoint also uses this as a fast denial signal before
    # bothering with token decoding.
    expires_at = models.DateTimeField()
    # Bumped each time we re-send the mail; useful both for audit and
    # for cron-driven "remind invitees who never clicked" jobs.
    last_sent_at = models.DateTimeField(auto_now_add=True)
    accepted_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="accepted_domain_invites",
    )
    accepted_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["domain", "email"],
                condition=models.Q(status="pending"),
                name="uniq_pending_invite_per_domain_email",
            ),
        ]
        indexes = [
            models.Index(fields=["email", "status"], name="dom_invite_em_st_idx"),
            models.Index(fields=["domain", "status"], name="dom_invite_dom_st_idx"),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.email} → {self.domain_id} ({self.status})"


class DomainAuditLog(models.Model):
    """
    Append-only audit trail for any meaningful administrative action
    performed on a domain. One row per action; the row is the source
    of truth for "who did what when".

    The model is generic on purpose: ``action`` is a free-form string
    (e.g. ``"member.promote"``, ``"member.remove"``,
    ``"join_request.approve_via_email"``) and ``metadata`` is a JSON
    blob that carries the per-action context (IP, user-agent,
    target_user_id, previous_status, …). Adding a new audit-worthy
    action does not require a migration.

    Designed for read performance on per-domain audit views: the
    ``(domain, -created_at)`` index covers the common query "show me
    the last N actions on this domain".
    """

    ACTION_MAX_LENGTH = 64

    domain = models.ForeignKey(
        Domain,
        on_delete=models.CASCADE,
        related_name="audit_logs",
    )
    # ``actor`` may be NULL for system-driven actions (Celery beat job,
    # signed-mail token executed without an active user, …). We do not
    # cascade so audit history outlives user deletions.
    actor = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="emitted_domain_audit_logs",
    )
    action = models.CharField(max_length=ACTION_MAX_LENGTH, db_index=True)
    # Optional pointer at the affected user (e.g., the user being
    # promoted / removed). Many actions only have a domain target, in
    # which case this stays NULL.
    target_user = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="received_domain_audit_logs",
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["domain", "-created_at"], name="dom_audit_dom_ct_idx"),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        actor = self.actor.username if self.actor_id else "system"
        return f"[{self.created_at:%Y-%m-%d %H:%M}] {actor} {self.action} on {self.domain_id}"
