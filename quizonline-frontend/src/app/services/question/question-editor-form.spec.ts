import {TestBed} from '@angular/core/testing';
import {NonNullableFormBuilder} from '@angular/forms';
import {beforeEach, describe, expect, it} from 'vitest';

import {QuestionReadDto} from '../../api/generated/model/question-read';
import {LangCode} from '../translation/translation';
import {
  addQuestionAnswerOption,
  buildQuestionCreatePayload,
  buildQuestionPatchPayload,
  clearQuestionTranslationTab,
  createQuestionEditorForm,
  ensureQuestionTranslationControls,
  getAnswerOptions,
  getQuestionCorrectCount,
  getQuestionTrGroup,
  isQuestionEditorFormValid,
  populateQuestionEditorForm,
  populateQuestionEditorFormFromDraft,
  resetQuestionTranslationsOnly,
  resolveQuestionDomainLanguages,
} from './question-editor-form';

const fr = 'fr' as LangCode;
const en = 'en' as LangCode;
const nl = 'nl' as LangCode;

function question(overrides: Partial<Record<string, unknown>> = {}): QuestionReadDto {
  return {
    id: 1,
    domain: {id: 3, allowed_languages: []},
    subjects: [{id: 10}, {id: 11}],
    active: true,
    is_mode_practice: false,
    is_mode_exam: true,
    translations: {fr: {title: 'Titre'}, en: {title: 'Title'}},
    answer_options: [
      {id: 21, is_correct: true, sort_order: 2},
      {id: 20, is_correct: false, sort_order: 1},
      {id: 22, is_correct: true, sort_order: null},
    ],
    ...overrides,
  } as unknown as QuestionReadDto;
}

describe('question-editor-form', () => {
  let fb: NonNullableFormBuilder;

  beforeEach(() => {
    fb = TestBed.inject(NonNullableFormBuilder);
  });

  describe('createQuestionEditorForm', () => {
    it('starts enabled with practice mode on', () => {
      const form = createQuestionEditorForm(fb);
      expect(form.controls.domain.enabled).toBe(true);
      expect(form.controls.subject_ids.enabled).toBe(true);
      expect(form.getRawValue()).toMatchObject({active: true, is_mode_practice: true, is_mode_exam: false});
    });

    it('can lock the domain and the subjects', () => {
      const form = createQuestionEditorForm(fb, {domainDisabled: true, subjectIdsDisabled: true});
      expect(form.controls.domain.disabled).toBe(true);
      expect(form.controls.subject_ids.disabled).toBe(true);
    });
  });

  describe('resolveQuestionDomainLanguages', () => {
    it('prefers the serializer list', () => {
      expect(resolveQuestionDomainLanguages(question({available_lang_codes: ['nl']}))).toEqual(['nl']);
    });

    it('falls back to the active allowed languages of the domain', () => {
      const q = question({
        domain: {
          id: 3,
          allowed_languages: [
            {code: 'it', active: true},
            {code: 'es', active: false},
            {code: '', active: true},
          ],
        },
      });
      expect(resolveQuestionDomainLanguages(q)).toEqual(['it']);
    });

    it('then to the translation keys, then to French', () => {
      expect(resolveQuestionDomainLanguages(question())).toEqual(['fr', 'en']);
      expect(resolveQuestionDomainLanguages(question({translations: undefined, domain: {id: 3}}))).toEqual(['fr']);
    });
  });

  it('ensureQuestionTranslationControls adds missing and drops extra languages', () => {
    const form = createQuestionEditorForm(fb);
    ensureQuestionTranslationControls(fb, form, [fr, en]);
    getQuestionTrGroup(form, fr).controls.title.setValue('kept');
    ensureQuestionTranslationControls(fb, form, [fr, nl]);
    expect(Object.keys(form.controls.translations.controls)).toEqual(['fr', 'nl']);
    expect(getQuestionTrGroup(form, fr).controls.title.value).toBe('kept');
    expect(() => getQuestionTrGroup(form, en)).toThrow(/Missing question translation group for: en/);

    resetQuestionTranslationsOnly(form);
    expect(Object.keys(form.controls.translations.controls)).toEqual([]);
  });

  it('populateQuestionEditorForm fills metadata, titles and sorted answers', () => {
    const form = createQuestionEditorForm(fb);
    addQuestionAnswerOption(fb, form, []);
    const langs = populateQuestionEditorForm(fb, form, question());

    expect(langs).toEqual(['fr', 'en']);
    expect(form.getRawValue()).toMatchObject({
      domain: 3,
      subject_ids: [10, 11],
      active: true,
      is_mode_practice: false,
      is_mode_exam: true,
      translations: {fr: {title: 'Titre'}, en: {title: 'Title'}},
    });
    // the pre-existing option was cleared; answers sorted by sort_order ?? id
    expect(getAnswerOptions(form).getRawValue()).toEqual([
      {id: 20, is_correct: false, sort_order: 1},
      {id: 21, is_correct: true, sort_order: 2},
      {id: 22, is_correct: true, sort_order: 3},
    ]);
    expect(getQuestionCorrectCount(form)).toBe(2);
  });

  it('populateQuestionEditorForm leaves a blank title for a language without translation', () => {
    const form = createQuestionEditorForm(fb);
    populateQuestionEditorForm(fb, form, question({available_lang_codes: ['nl'], answer_options: undefined}));
    expect(getQuestionTrGroup(form, nl).controls.title.value).toBe('');
    expect(getAnswerOptions(form).length).toBe(0);
  });

  it('populateQuestionEditorFormFromDraft copies the draft without answer ids', () => {
    const form = createQuestionEditorForm(fb);
    populateQuestionEditorFormFromDraft(
      fb,
      form,
      {
        domainId: 5,
        subjectIds: [1],
        active: false,
        isModePractice: true,
        isModeExam: false,
        translations: {fr: {title: 'Copie'}},
        answerOptions: [
          {is_correct: true, sort_order: 1},
          {is_correct: false, sort_order: undefined as unknown as number},
        ],
      },
      [fr, en],
    );
    expect(form.getRawValue()).toMatchObject({
      domain: 5,
      subject_ids: [1],
      active: false,
      translations: {fr: {title: 'Copie'}, en: {title: ''}},
    });
    expect(getAnswerOptions(form).getRawValue()).toEqual([
      {id: null, is_correct: true, sort_order: 1},
      {id: null, is_correct: false, sort_order: 2},
    ]);
  });

  it('clearQuestionTranslationTab blanks the title and marks it dirty', () => {
    const form = createQuestionEditorForm(fb);
    ensureQuestionTranslationControls(fb, form, [fr]);
    getQuestionTrGroup(form, fr).controls.title.setValue('abc');
    clearQuestionTranslationTab(form, fr);
    const title = getQuestionTrGroup(form, fr).controls.title;
    expect(title.value).toBe('');
    expect(title.dirty).toBe(true);
  });

  describe('isQuestionEditorFormValid', () => {
    it('requires the domain only when asked', () => {
      const form = createQuestionEditorForm(fb);
      ensureQuestionTranslationControls(fb, form, [fr]);
      getQuestionTrGroup(form, fr).controls.title.setValue('Valid');
      expect(isQuestionEditorFormValid(form, [fr], {requireDomain: true})).toBe(false);
      expect(isQuestionEditorFormValid(form, [fr])).toBe(true);
      form.controls.domain.setValue(4);
      expect(isQuestionEditorFormValid(form, [fr], {requireDomain: true})).toBe(true);
    });

    it('rejects an empty language list and an invalid title', () => {
      const form = createQuestionEditorForm(fb);
      ensureQuestionTranslationControls(fb, form, [fr, en]);
      expect(isQuestionEditorFormValid(form, [])).toBe(false);
      getQuestionTrGroup(form, fr).controls.title.setValue('Ok');
      getQuestionTrGroup(form, en).controls.title.setValue('x');
      expect(isQuestionEditorFormValid(form, [fr, en])).toBe(false);
      expect(isQuestionEditorFormValid(form, [fr])).toBe(true);
    });
  });

  describe('payload builders', () => {
    function filledForm() {
      const form = createQuestionEditorForm(fb);
      populateQuestionEditorForm(fb, form, question());
      addQuestionAnswerOption(fb, form, [fr]);
      return form;
    }

    it('buildQuestionCreatePayload flags multiple correct answers', () => {
      const payload = buildQuestionCreatePayload(filledForm(), [fr, en]);
      expect(payload).toEqual({
        domain: 3,
        subject_ids: [10, 11],
        allow_multiple_correct: true,
        active: true,
        is_mode_practice: false,
        is_mode_exam: true,
        translations: {fr: {title: 'Titre'}, en: {title: 'Title'}},
        answer_options: [
          {id: 20, is_correct: false, sort_order: 1},
          {id: 21, is_correct: true, sort_order: 2},
          {id: 22, is_correct: true, sort_order: 3},
          // new option: no id yet, next sort order
          {id: undefined, is_correct: false, sort_order: 4},
        ],
      });
    });

    it('buildQuestionPatchPayload leaves the domain out and reports a single correct answer', () => {
      const form = filledForm();
      getAnswerOptions(form).at(2).get('is_correct')?.setValue(false);
      const payload = buildQuestionPatchPayload(form, [fr]);
      expect(payload).not.toHaveProperty('domain');
      expect(payload.allow_multiple_correct).toBe(false);
      expect(payload.translations).toEqual({fr: {title: 'Titre'}});
      expect(payload.answer_options).toHaveLength(4);
    });
  });
});
