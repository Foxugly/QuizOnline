import {TestBed} from '@angular/core/testing';
import {FormBuilder, FormGroup} from '@angular/forms';
import {beforeEach, describe, expect, it} from 'vitest';

import {
  buildLocalizedTextRecord,
  createLocalizedTextGroup,
  getLocalizedTextGroup,
  patchLocalizedTextRecord,
  syncLocalizedTextControls,
} from './localized-text-form';

describe('localized-text-form', () => {
  let fb: FormBuilder;
  let translations: FormGroup;

  beforeEach(() => {
    fb = TestBed.inject(FormBuilder);
    translations = fb.group({});
  });

  describe('createLocalizedTextGroup', () => {
    it('requires a name of at least two characters', () => {
      const group = createLocalizedTextGroup(fb);
      expect(group.valid).toBe(false);
      group.patchValue({name: 'a'});
      expect(group.get('name')?.hasError('minlength')).toBe(true);
      group.patchValue({name: 'a'.repeat(500)});
      expect(group.valid).toBe(true);
    });

    it('caps the name length and adds extra fields when asked', () => {
      const group = createLocalizedTextGroup(fb, {nameMaxLength: 5, extraFields: ['signatory']});
      group.patchValue({name: 'toolong'});
      expect(group.get('name')?.hasError('maxlength')).toBe(true);
      expect(group.get('signatory')?.value).toBe('');
    });
  });

  it('syncLocalizedTextControls adds wanted languages and removes the rest', () => {
    syncLocalizedTextControls(fb, translations, ['fr', 'en']);
    getLocalizedTextGroup(translations, 'fr').patchValue({name: 'Garde'});
    syncLocalizedTextControls(fb, translations, ['fr', 'nl'], {extraFields: ['x']});

    expect(Object.keys(translations.controls).sort()).toEqual(['fr', 'nl']);
    expect(getLocalizedTextGroup(translations, 'fr').get('name')?.value).toBe('Garde');
    expect(getLocalizedTextGroup(translations, 'nl').get('x')).not.toBeNull();
    expect(() => getLocalizedTextGroup(translations, 'en')).toThrow(/language: en/);
  });

  it('buildLocalizedTextRecord reads every language, or only the requested ones', () => {
    syncLocalizedTextControls(fb, translations, ['fr', 'en'], {extraFields: ['title']});
    getLocalizedTextGroup(translations, 'fr').patchValue({name: 'Nom', description: 'Desc', title: 'T'});

    expect(buildLocalizedTextRecord(translations, undefined, {extraFields: ['title', 'missing']})).toEqual({
      fr: {name: 'Nom', description: 'Desc', title: 'T', missing: ''},
      en: {name: '', description: '', title: '', missing: ''},
    });
    expect(buildLocalizedTextRecord(translations, ['en'])).toEqual({en: {name: '', description: ''}});
  });

  it('patchLocalizedTextRecord fills blanks for missing rows and fields', () => {
    syncLocalizedTextControls(fb, translations, ['fr', 'en'], {extraFields: ['title']});
    getLocalizedTextGroup(translations, 'en').patchValue({name: 'old'});

    patchLocalizedTextRecord(
      translations,
      ['fr', 'en'],
      {fr: {name: 'Nom', title: 'Titre'}},
      {extraFields: ['title']},
    );

    expect(translations.getRawValue()).toEqual({
      fr: {name: 'Nom', description: '', title: 'Titre'},
      en: {name: '', description: '', title: ''},
    });
  });
});
