from __future__ import annotations

from collections.abc import Iterable

from rest_framework import serializers

from .models import AnswerOption, Question


def sync_question_answer_options(
    *,
    question: Question,
    answer_options_data: Iterable[dict],
    allowed_langs: set[str],
    upsert_translations,
) -> None:
    existing_options = {option.id: option for option in question.answer_options.all()}
    referenced_existing_ids = set(
        AnswerOption.objects.filter(question=question, quiz_answers__isnull=False)
        .distinct()
        .values_list("id", flat=True)
    )
    retained_ids: set[int] = set()

    # Separate new vs existing, validate inline, collect (instance, translations) pairs.
    new_pairs: list[tuple[AnswerOption, dict]] = []
    update_pairs: list[tuple[AnswerOption, dict]] = []

    for i, raw_option in enumerate(answer_options_data):
        if not isinstance(raw_option, dict):
            raise serializers.ValidationError({f"answer_options[{i}]": "Each item must be an object."})

        option_translations = raw_option.get("translations") or {}
        if not isinstance(option_translations, dict):
            raise serializers.ValidationError(
                {f"answer_options[{i}].translations": "Must be an object keyed by language code."}
            )

        option_payload = dict(raw_option)
        option_id = option_payload.pop("id", None)
        option_payload.pop("translations", None)

        if option_id is not None:
            option = existing_options.get(option_id)
            if option is None:
                raise serializers.ValidationError(
                    {f"answer_options[{i}].id": "Unknown answer option for this question."}
                )
            if option_id in retained_ids:
                raise serializers.ValidationError(
                    {f"answer_options[{i}].id": "Duplicate answer option id in payload."}
                )
            new_is_correct = option_payload.get("is_correct", option.is_correct)
            if option_id in referenced_existing_ids and bool(new_is_correct) != bool(option.is_correct):
                raise serializers.ValidationError(
                    {
                        "answer_options": (
                            "Impossible de modifier le statut correcte/incorrecte "
                            f"de reponses deja utilisees dans des quiz: [{option_id}]"
                        )
                    }
                )
            for attr, value in option_payload.items():
                setattr(option, attr, value)
            retained_ids.add(option_id)
            update_pairs.append((option, option_translations))
        else:
            option = AnswerOption(question=question, **option_payload)
            new_pairs.append((option, option_translations))

    # Bulk create new options (sets PKs on instances in-place).
    if new_pairs:
        AnswerOption.objects.bulk_create([opt for opt, _ in new_pairs])
        for opt, _ in new_pairs:
            retained_ids.add(opt.id)

    # Bulk update existing options.
    if update_pairs:
        AnswerOption.objects.bulk_update(
            [opt for opt, _ in update_pairs],
            fields=["is_correct", "sort_order"],
        )

    retained_options = [opt for opt, _ in update_pairs + new_pairs]

    removable_ids = set(existing_options) - retained_ids
    if removable_ids:
        referenced_ids = sorted(referenced_existing_ids.intersection(removable_ids))
        if referenced_ids:
            raise serializers.ValidationError(
                {
                    "answer_options": (
                        "Impossible de supprimer des reponses deja utilisees dans des quiz: "
                        f"{referenced_ids}"
                    )
                }
            )

    final_count = len(retained_options)
    correct_count = sum(1 for option in retained_options if option.is_correct)

    if final_count < 2:
        raise serializers.ValidationError({"answer_options": "Au moins 2 réponses sont requises."})
    if correct_count == 0:
        raise serializers.ValidationError({"answer_options": "Indique au moins une réponse correcte."})
    if not question.allow_multiple_correct and correct_count != 1:
        raise serializers.ValidationError({"answer_options": "Une seule réponse correcte est autorisée."})

    if removable_ids:
        AnswerOption.objects.filter(id__in=removable_ids).delete()

    # Apply translations after all DB writes so PKs are guaranteed to exist.
    for opt, translations in update_pairs + new_pairs:
        upsert_translations(
            opt,
            {lang_code: translations.get(lang_code, {}) for lang_code in allowed_langs},
            fields=["content"],
        )
