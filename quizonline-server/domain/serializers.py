from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from drf_spectacular.utils import extend_schema_field
from language.models import Language
from language.serializers import LanguageReadSerializer
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied
from config.serializers import (
    LocalizedNameDescriptionTranslationSerializer,
    LocalizedTranslationsDictField,
    UserSummarySerializer,
    localized_translations_map_schema,
)

from .models import Domain, DomainAuditLog, DomainInvite, DomainJoinRequest
from subject.serializers import SubjectReadSerializer

User = get_user_model()
LANG_CODES = {code for code, _ in settings.LANGUAGES}


class DomainReadSerializer(serializers.ModelSerializer):
    translations = serializers.SerializerMethodField()
    allowed_languages = serializers.SerializerMethodField()
    owner = serializers.SerializerMethodField()
    managers = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()
    subjects_count = serializers.IntegerField(read_only=True)
    questions_count = serializers.IntegerField(read_only=True)
    pending_join_requests_count = serializers.SerializerMethodField()
    my_join_request_status = serializers.SerializerMethodField()

    class Meta:
        model = Domain
        fields = [
            "id",
            "translations",
            "allowed_languages",
            "active",
            "public",
            "join_policy",
            "subjects_count",
            "questions_count",
            "pending_join_requests_count",
            "my_join_request_status",
            "owner",
            "managers",
            "members",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
        extra_kwargs = {"owner": {"read_only": True}}

    @extend_schema_field(UserSummarySerializer)
    def get_owner(self, obj: Domain) -> dict[str, int | str]:
        return _user_summary(obj.owner)

    @extend_schema_field(UserSummarySerializer(many=True))
    def get_managers(self, obj: Domain) -> list[dict[str, int | str]]:
        return [_user_summary(u) for u in obj.managers.all()]

    @extend_schema_field(UserSummarySerializer(many=True))
    def get_members(self, obj: Domain) -> list[dict[str, int | str]]:
        return [_user_summary(u) for u in obj.members.all()]

    @extend_schema_field(LanguageReadSerializer(many=True))
    def get_allowed_languages(self, obj: Domain) -> list[dict]:
        qs = obj.allowed_languages.filter(active=True).order_by("id")
        return LanguageReadSerializer(qs, many=True, context=self.context).data

    @extend_schema_field(
        localized_translations_map_schema(
            LocalizedNameDescriptionTranslationSerializer,
            "LocalizedNameDescriptionTranslations",
        )
    )
    def get_translations(self, obj: Domain) -> dict[str, dict[str, str]]:
        data = {}
        for t in obj.translations.all():
            data[t.language_code] = {"name": t.name or "", "description": t.description or ""}
        return data

    def get_pending_join_requests_count(self, obj: Domain) -> int | None:
        from domain.permissions import CanApproveJoinRequest
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            return None
        perm = CanApproveJoinRequest()
        if not perm.has_object_permission(request, None, obj):
            return None
        return DomainJoinRequest.objects.filter(
            domain=obj, status=DomainJoinRequest.STATUS_PENDING
        ).count()

    def get_my_join_request_status(self, obj: Domain) -> str | None:
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            return None
        latest = (
            DomainJoinRequest.objects
            .filter(domain=obj, user=user)
            .order_by("-created_at")
            .values_list("status", flat=True)
            .first()
        )
        return latest

    def validate(self, attrs):
        raise serializers.ValidationError("This serializer is read-only.")


class DomainWriteSerializer(serializers.ModelSerializer):
    allowed_languages = serializers.PrimaryKeyRelatedField(queryset=Language.objects.all(), many=True, required=True)
    translations = LocalizedTranslationsDictField(
        value_serializer=LocalizedNameDescriptionTranslationSerializer,
        write_only=True,
        required=True,
    )
    managers = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), many=True, required=True)
    owner = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False)

    class Meta:
        model = Domain
        fields = [
            "translations",
            "allowed_languages",
            "active",
            "public",
            "join_policy",
            "owner",
            "managers",
        ]
        # read_only_fields = ["id"]

    # ---------------------------
    # helpers
    # ---------------------------
    def _apply_translations(self, domain: Domain, translations: dict) -> None:
        translation_model = domain._parler_meta.root_model
        for lang_code, data in (translations or {}).items():
            translation_model.objects.update_or_create(
                master_id=domain.pk,
                language_code=lang_code,
                defaults={
                    "name": data.get("name", ""),
                    "description": data.get("description", ""),
                },
            )

    # ---------------------------
    # validation
    # ---------------------------
    def validate_allowed_languages(self, value: list[Language]) -> list[Language]:
        seen_ids = set()
        unique_languages = []
        for lang in value:
            if lang.pk in seen_ids:
                continue
            seen_ids.add(lang.pk)
            unique_languages.append(lang)

        # Validation : code doit exister dans settings.LANGUAGES
        invalid = [lang.code for lang in unique_languages if lang.code not in LANG_CODES]
        if invalid:
            raise serializers.ValidationError(
                f"Invalid language code(s): {', '.join(sorted(invalid))}"
            )

        return unique_languages

    def validate_join_policy(self, value):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            raise DRFPermissionDenied("Authentication is required.")
        if getattr(user, "is_superuser", False):
            return value
        if self.instance is None:
            # Creation: anyone authorized to create a domain may set the policy.
            return value
        if self.instance.owner_id != user.id:
            raise DRFPermissionDenied("Only the domain owner can change the join policy.")
        return value

    def _validate_owner_change(self, attrs: dict) -> None:
        request = self.context.get("request")
        instance = getattr(self, "instance", None)
        new_owner = attrs.get("owner")

        if instance is None or new_owner is None or new_owner.pk == instance.owner_id:
            return

        user = getattr(request, "user", None)
        if not user or user.is_anonymous:
            raise serializers.ValidationError({"owner": "Authentication is required."})
        if not user.is_superuser and instance.owner_id != user.id:
            raise serializers.ValidationError({"owner": "Only the superuser or the current owner can change the owner."})

    def validate(self, attrs):
        translations = attrs.get("translations")
        if not translations and not self.partial:
            raise serializers.ValidationError({"translations": "Au moins une traduction est requise."})

        allowed_langs = attrs.get("allowed_languages")
        if "allowed_languages" in attrs and allowed_langs == []:
            raise serializers.ValidationError({"allowed_languages": "Au moins une langue est requise."})
        # Cross-consistency between allowed_languages and translations is only enforced
        # when both are provided here. The PATCH path goes through DomainPartialSerializer.validate()
        # which performs its own translations-aware checks; see line ~252.
        if allowed_langs is not None and translations:
            allowed_codes = {language.code for language in allowed_langs}
            provided = set(translations.keys())
            invalid_codes = provided - LANG_CODES
            if invalid_codes:
                raise serializers.ValidationError({"translations": f"Langues inconnues: {sorted(invalid_codes)}"})

            missing = allowed_codes - provided
            if missing:
                raise serializers.ValidationError(
                    {"translations": f"Traductions manquantes pour: {sorted(missing)}"}
                )

        self._validate_owner_change(attrs)

        return attrs

    # ---------------------------
    # create / update
    # ---------------------------
    def create(self, validated_data):
        request = self.context.get("request")
        if not request or not request.user or request.user.is_anonymous:
            raise serializers.ValidationError({"owner": "Owner is required."})
        translations = validated_data.pop("translations")
        langs = validated_data.pop("allowed_languages", [])
        validated_data.pop("owner", None)
        managers = validated_data.pop("managers", [])
        with transaction.atomic():
            domain = Domain.objects.create(owner=request.user, **validated_data)
            if managers:
                domain.managers.set(managers)
            if langs:
                domain.allowed_languages.set(langs)
            self._apply_translations(domain, translations)
        return domain

    def update(self, instance, validated_data):
        previous_policy = instance.join_policy
        translations = validated_data.pop("translations", None)
        langs = validated_data.pop("allowed_languages", None)
        new_owner = validated_data.pop("owner", None)
        managers = validated_data.pop("managers", None)

        with transaction.atomic():
            if new_owner is not None:
                instance.owner = new_owner
                instance.members.add(new_owner)
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            if managers is not None:
                instance.managers.set(managers)

            if langs is not None:
                instance.allowed_languages.set(langs)

            if translations is not None:
                self._apply_translations(instance, translations)

            # Detect (non-auto) → auto transition and auto-approve pending
            # requests. Kept inside the atomic block so a downstream error
            # rolls back the auto-approval too.
            new_policy = instance.join_policy
            if previous_policy != "auto" and new_policy == "auto":
                from domain.services import auto_approve_pending_requests
                from core.mailers.domain_join import send_join_request_approved_email
                request = self.context.get("request")
                actor = getattr(request, "user", None)
                approved = auto_approve_pending_requests(instance, by=actor)
                for jr in approved:
                    transaction.on_commit(
                        lambda jr=jr: send_join_request_approved_email(join_request=jr)
                    )

        return instance


class DomainPartialSerializer(DomainWriteSerializer):
    allowed_languages = serializers.PrimaryKeyRelatedField(queryset=Language.objects.all(), many=True, required=False)
    translations = LocalizedTranslationsDictField(
        value_serializer=LocalizedNameDescriptionTranslationSerializer,
        write_only=True,
        required=False,
    )
    managers = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), many=True, required=False)
    owner = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False)
    active = serializers.BooleanField(required=False)
    public = serializers.BooleanField(required=False)

    def validate(self, attrs):
        self._validate_owner_change(attrs)

        # Si on touche aux translations => règles complètes
        if "translations" in attrs:
            return super().validate(attrs)

        # Si on touche seulement aux allowed_languages (sans translations), on ne force pas translations
        if "allowed_languages" in attrs:
            allowed_langs = attrs.get("allowed_languages")
            if allowed_langs == []:
                raise serializers.ValidationError({"allowed_languages": "Au moins une langue est requise."})
        return attrs


class DomainDetailSerializer(DomainReadSerializer):
    subjects = serializers.SerializerMethodField()

    class Meta:
        model = Domain
        fields = [
            "id",
            "translations",
            "allowed_languages",
            "active",
            "public",
            "join_policy",
            "pending_join_requests_count",
            "my_join_request_status",
            "owner",
            "managers",
            "members",
            "created_at",
            "updated_at",
            "subjects"
        ]
        read_only_fields = fields
        extra_kwargs = {"owner": {"read_only": True}}

    @extend_schema_field(SubjectReadSerializer(many=True))
    def get_subjects(self, obj: Domain) -> list[dict]:
        qs = obj.subjects.filter(active=True).order_by("id")
        return SubjectReadSerializer(qs, many=True, context=self.context).data

    def validate(self, attrs):
        raise serializers.ValidationError("This serializer is read-only.")


class DomainMemberRoleSerializer(serializers.Serializer):
    """
    Three intents are supported on a single endpoint:

    - ``is_domain_manager``: add/remove the user from this domain's managers
      (scoped to the domain).
    - ``is_active``: toggle the global ``User.is_active`` flag (locks/unlocks
      the account on the entire platform). Permitted only with strong guards
      enforced in the view — see ``DomainViewSet._authorize_is_active_change``.
    - ``remove_member``: remove the user from this domain's members (and
      managers) entirely. Scoped operation, never touches ``User.is_active``.
      Cannot be combined with the other intents (a remove + flip would be
      ambiguous to audit).
    """

    user_id = serializers.IntegerField(min_value=1)
    is_domain_manager = serializers.BooleanField(required=False)
    is_active = serializers.BooleanField(required=False)
    remove_member = serializers.BooleanField(required=False)

    _ACTION_FIELDS = ("is_domain_manager", "is_active", "remove_member")

    def validate(self, attrs):
        provided = [name for name in self._ACTION_FIELDS if name in attrs]
        if not provided:
            raise serializers.ValidationError(
                "At least one of is_domain_manager, is_active, remove_member must be provided."
            )
        if "remove_member" in attrs:
            if not attrs["remove_member"]:
                raise serializers.ValidationError(
                    {"remove_member": "Only the value true is supported (use is_domain_manager to add)."}
                )
            if len(provided) > 1:
                raise serializers.ValidationError(
                    {"remove_member": "Cannot be combined with is_active or is_domain_manager."}
                )
        return attrs


class DomainJoinRequestReadSerializer(serializers.ModelSerializer):
    user_summary = serializers.SerializerMethodField()
    decided_by_summary = serializers.SerializerMethodField()

    class Meta:
        model = DomainJoinRequest
        fields = (
            "id",
            "domain",
            "user",
            "user_summary",
            "status",
            "decided_by",
            "decided_by_summary",
            "decided_at",
            "reject_reason",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    @extend_schema_field(UserSummarySerializer(allow_null=True))
    def get_user_summary(self, obj) -> dict | None:
        return _user_summary(obj.user) if obj.user_id else None

    @extend_schema_field(UserSummarySerializer(allow_null=True))
    def get_decided_by_summary(self, obj) -> dict | None:
        return _user_summary(obj.decided_by) if obj.decided_by_id else None


def _user_summary(user) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name or "",
        "last_name": user.last_name or "",
        "email": user.email or "",
    }


class DomainJoinRequestRejectSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500, default="")


class DomainJoinRequestDecideResponseSerializer(serializers.Serializer):
    """Shape of the GET/POST response from the public moderation endpoint."""
    action = serializers.ChoiceField(choices=("approve", "reject"))
    was_already_decided = serializers.BooleanField()
    request = DomainJoinRequestReadSerializer()


class DomainAuditLogReadSerializer(serializers.ModelSerializer):
    """Lightweight view of an audit-log row for the per-domain audit page."""
    actor_username = serializers.SerializerMethodField()
    target_username = serializers.SerializerMethodField()

    class Meta:
        model = DomainAuditLog
        fields = [
            "id",
            "action",
            "actor_username",
            "target_username",
            "metadata",
            "created_at",
        ]
        read_only_fields = fields

    def get_actor_username(self, obj) -> str:
        return obj.actor.username if obj.actor_id else ""

    def get_target_username(self, obj) -> str:
        return obj.target_user.username if obj.target_user_id else ""


class ModerationSummaryItemSerializer(serializers.Serializer):
    """One row in the moderator dashboard summary list."""
    id = serializers.IntegerField()
    name = serializers.CharField()
    pending_count = serializers.IntegerField()


class DomainInviteReadSerializer(serializers.ModelSerializer):
    """Lightweight view over a persisted DomainInvite row."""

    inviter_username = serializers.SerializerMethodField()

    class Meta:
        model = DomainInvite
        fields = [
            "id",
            "email",
            "status",
            "inviter_username",
            "created_at",
            "expires_at",
            "last_sent_at",
        ]
        read_only_fields = fields

    def get_inviter_username(self, obj) -> str:
        return obj.inviter.username if obj.inviter_id else ""


class DomainInviteRequestSerializer(serializers.Serializer):
    """
    Payload for ``POST /api/domain/{id}/invite/``.

    ``language`` is optional and used to pick the email locale when we
    have no User row to read a preference from yet (fresh invitations to
    addresses not on the platform).

    We deliberately use a plain ``CharField`` with manual validation
    rather than a ``ChoiceField``: drf-spectacular would otherwise emit
    a new ad-hoc enum schema that collides with the shared
    ``LanguageEnum`` referenced everywhere else in the API.
    """
    emails = serializers.ListField(
        child=serializers.EmailField(),
        min_length=1,
        max_length=50,
        allow_empty=False,
    )
    language = serializers.CharField(required=False, default="en", max_length=8)

    def validate_language(self, value):
        valid = {code for code, _ in settings.LANGUAGES}
        if value not in valid:
            raise serializers.ValidationError("Unsupported language.")
        return value


class DomainInviteResultSerializer(serializers.Serializer):
    """Per-invitation outcome returned by the bulk invite endpoint."""
    email = serializers.EmailField()
    status = serializers.ChoiceField(choices=("sent", "already_member", "invalid"))


class DomainTransferRequestSerializer(serializers.Serializer):
    """Payload for ``POST /api/domain/{id}/transfer/``."""
    user_id = serializers.IntegerField(min_value=1)


class DomainTransferStateSerializer(serializers.Serializer):
    """Shape of GET/POST ``/api/domain/transfer/accept/{token}/``."""
    state = serializers.ChoiceField(choices=(
        "ready_to_accept",
        "wrong_account",
        "no_longer_eligible",
        "transferred",
    ))
    domain_id = serializers.IntegerField()
    domain_name = serializers.CharField()
    initiator_username = serializers.CharField()
    future_owner_username = serializers.CharField()


class DomainInviteStateSerializer(serializers.Serializer):
    """Shape of GET/POST ``/api/domain/invite/accept/{token}/``."""
    state = serializers.ChoiceField(choices=(
        "ready_to_accept",
        "login_required",
        "signup_required",
        "wrong_account",
        "already_member",
        "accepted",
    ))
    domain_id = serializers.IntegerField()
    domain_name = serializers.CharField()
    inviter_username = serializers.CharField()
    invited_email = serializers.EmailField()
