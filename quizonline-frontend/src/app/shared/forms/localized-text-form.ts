import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';

/**
 * Per-language form group for a translatable name + description pair.
 *
 * The two required fields (``name``, ``description``) are the lowest
 * common denominator used by every parler-backed read/write form on
 * the frontend (Domain, Subject). Each call site may pass
 * ``extraFields`` to add free-form ``CharField``-shaped controls on
 * top — Domain uses this to inject ``certificate_signatory_title``
 * alongside ``name`` + ``description`` without forking the helper.
 */
export type LocalizedTextValue = {
  name: string;
  description: string;
  [extra: string]: string;
};

export type LocalizedTextRecord = Record<string, LocalizedTextValue>;

export type LocalizedTextGroup = FormGroup;

type FormBuilderLike = Pick<FormBuilder, 'group' | 'control'>;

export function createLocalizedTextGroup(
  fb: FormBuilderLike,
  options?: { nameMaxLength?: number; extraFields?: readonly string[] },
): LocalizedTextGroup {
  const nameValidators = [Validators.required, Validators.minLength(2)];
  if (options?.nameMaxLength) {
    nameValidators.push(Validators.maxLength(options.nameMaxLength));
  }

  const groupConfig: Record<string, FormControl<string>> = {
    name: new FormControl<string>('', {nonNullable: true, validators: nameValidators}),
    description: new FormControl<string>('', {nonNullable: true}),
  };
  for (const extra of options?.extraFields ?? []) {
    groupConfig[extra] = new FormControl<string>('', {nonNullable: true});
  }
  return fb.group(groupConfig) as LocalizedTextGroup;
}

export function syncLocalizedTextControls(
  fb: FormBuilderLike,
  translationsGroup: FormGroup,
  codes: readonly string[],
  options?: { nameMaxLength?: number; extraFields?: readonly string[] },
): void {
  const wanted = new Set<string>(codes);
  const existing = new Set<string>(Object.keys(translationsGroup.controls));

  for (const code of wanted) {
    if (!existing.has(code)) {
      translationsGroup.addControl(code, createLocalizedTextGroup(fb, options));
    }
  }

  for (const code of existing) {
    if (!wanted.has(code)) {
      translationsGroup.removeControl(code);
    }
  }
}

export function getLocalizedTextGroup(translationsGroup: FormGroup, code: string): LocalizedTextGroup {
  const group = translationsGroup.get(code) as LocalizedTextGroup | null;
  if (!group) {
    throw new Error(`Missing localized text group for language: ${code}`);
  }
  return group;
}

export function buildLocalizedTextRecord(
  translationsGroup: FormGroup,
  codes?: readonly string[],
  options?: { extraFields?: readonly string[] },
): LocalizedTextRecord {
  const translations: LocalizedTextRecord = {};
  const keys = codes ? [...codes] : Object.keys(translationsGroup.controls);
  const extras = options?.extraFields ?? [];

  for (const code of keys) {
    const group = getLocalizedTextGroup(translationsGroup, code);
    const value: LocalizedTextValue = {
      name: (group.get('name')?.value as string | null) ?? '',
      description: (group.get('description')?.value as string | null) ?? '',
    };
    for (const extra of extras) {
      value[extra] = (group.get(extra)?.value as string | null) ?? '';
    }
    translations[code] = value;
  }

  return translations;
}

export function patchLocalizedTextRecord(
  translationsGroup: FormGroup,
  codes: readonly string[],
  translations: Record<string, Partial<LocalizedTextValue>>,
  options?: { extraFields?: readonly string[] },
): void {
  const patch: LocalizedTextRecord = {};
  const extras = options?.extraFields ?? [];

  for (const code of codes) {
    const row = translations[code];
    const value: LocalizedTextValue = {
      name: row?.name ?? '',
      description: row?.description ?? '',
    };
    for (const extra of extras) {
      value[extra] = row?.[extra] ?? '';
    }
    patch[code] = value;
  }

  translationsGroup.patchValue(patch, {emitEvent: false});
}
