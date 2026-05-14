import {Injectable, inject, signal} from '@angular/core';
import {FormGroup, NonNullableFormBuilder} from '@angular/forms';

import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {QuizTemplateDto} from '../../../api/generated/model/quiz-template';
import {LangCode, TranslateBatchItem, TranslationService} from '../../../services/translation/translation';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {getQuizCreateUiText} from './quiz-create.i18n';

export type QuizTemplateTranslationValue = {
  title: string;
  description: string;
};

export type QuizTemplateTranslations = Record<string, QuizTemplateTranslationValue>;

export interface QuizTemplateTranslationsBinding {
  /** Returns the FormGroup that nests ``per-lang`` translation
   * sub-groups (the host owns ``quizForm.controls.translations``). */
  readonly getTranslationsGroup: () => FormGroup;
  /** Currently active app language — drives the active tab and the
   * "best fallback" picker. */
  readonly currentLang: () => LanguageEnumDto;
  /**
   * Called every time the controller resolves a localised
   * ``{title, description}`` pair so the host can keep its top-level
   * ``quizForm.controls.title`` / ``description`` in sync (the page
   * uses these for the form-level required check + initial value).
   */
  readonly onLocalizedSync: (value: QuizTemplateTranslationValue) => void;
  /** Page-level submit-error setter used for translate-call failures.
   * Passing ``null`` clears the banner — used to wipe a stale error
   * before kicking off a new translate round. */
  readonly onPageError: (message: string | null) => void;
  /**
   * Called after a translation call mutates the form so the host can
   * re-evaluate its ``quizFormValid`` signal.
   */
  readonly onTranslationsChanged: () => void;
}

/**
 * Per-language title/description slice of /quiz/create. Owns the
 * language tab strip, the translate-button orchestration, and the
 * helpers that the host needs to (1) seed the translations FormGroup
 * when a domain is chosen, (2) collect the current values back into a
 * write payload at save time, and (3) resolve the "best" pair to
 * surface in the SPA's active language.
 *
 * The translations FormGroup itself remains a sub-group of the host's
 * ``quizForm`` so reactive validation flows through the same status
 * pipe — the controller mutates the group via ``getTranslationsGroup``
 * rather than owning a private form.
 */
@Injectable()
export class QuizCreateTemplateTranslationsController {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly translationService = inject(TranslationService);
  private readonly editorUi = inject(UiTextService).editor;

  readonly langs = signal<LangCode[]>([]);
  readonly activeLang = signal<LangCode | null>(null);
  readonly translating = signal(false);

  private binding: QuizTemplateTranslationsBinding | null = null;

  bind(binding: QuizTemplateTranslationsBinding): void {
    this.binding = binding;
  }

  /** Follow the app language whenever it changes, but only if the
   * dialog already exposes a tab for it (no point activating a tab
   * that doesn't exist yet — happens on first load). */
  syncActiveLang(lang: LangCode): void {
    if (this.langs().includes(lang)) {
      this.activeLang.set(lang);
    }
  }

  onTabChange(value: string | number | undefined): void {
    if (value === undefined || value === null) {
      return;
    }
    this.activeLang.set(String(value) as LangCode);
  }

  /**
   * Rebuild the translations FormGroup so it has exactly one
   * sub-group per ``lang``. Existing values are preserved across calls
   * (e.g. when a user switches the domain mid-edit, the FR text they
   * just typed shouldn't disappear because FR is still in the new
   * domain's allowed languages).
   */
  configure(langs: LangCode[], seed: QuizTemplateTranslations = {}): void {
    if (!this.binding) {
      return;
    }
    const resolvedLangs = langs.length ? langs : [LanguageEnumDto.Fr as LangCode];
    const translationsGroup = this.binding.getTranslationsGroup();
    const existing = this.collect();

    Object.keys(translationsGroup.controls).forEach((code) => translationsGroup.removeControl(code));

    for (const lang of resolvedLangs) {
      const value = seed[lang] ?? existing[lang] ?? {title: '', description: ''};
      translationsGroup.addControl(lang, this.fb.group({
        title: [value.title ?? ''],
        description: [value.description ?? ''],
      }));
    }

    const currentLang = this.binding.currentLang() as LangCode;
    const active = resolvedLangs.includes(currentLang) ? currentLang : (resolvedLangs[0] ?? null);
    this.langs.set(resolvedLangs);
    this.activeLang.set(active);

    this.binding.onLocalizedSync(this.selectActive(this.collect()));
  }

  /** Snapshot the FormGroup into a plain ``{lang: {title, description}}``
   * dict, trimming whitespace so save-time validation is consistent. */
  collect(): QuizTemplateTranslations {
    if (!this.binding) {
      return {};
    }
    const raw = this.binding.getTranslationsGroup().getRawValue() as Record<string, QuizTemplateTranslationValue>;
    const translations: QuizTemplateTranslations = {};
    for (const [lang, value] of Object.entries(raw ?? {})) {
      translations[lang] = {
        title: value?.title?.trim() ?? '',
        description: value?.description?.trim() ?? '',
      };
    }
    return translations;
  }

  /** Pick the best ``{title, description}`` for the SPA's current
   * language: same-lang first, then any tab that has a non-empty title,
   * then empty fields as a last resort. */
  selectActive(translations: QuizTemplateTranslations = this.collect()): QuizTemplateTranslationValue {
    if (!this.binding) {
      return {title: '', description: ''};
    }
    const current = translations[this.binding.currentLang()];
    if (current?.title?.trim()) {
      return current;
    }
    for (const lang of this.langs()) {
      const value = translations[lang];
      if (value?.title?.trim()) {
        return value;
      }
    }
    for (const value of Object.values(translations)) {
      if (value?.title?.trim()) {
        return value;
      }
    }
    return {title: '', description: ''};
  }

  /** Used by ``canSave`` and the save validation pipeline. */
  hasTitle(): boolean {
    return Object.values(this.collect()).some((value) => !!value.title.trim());
  }

  /** Back-fill an "old" template (saved before the multi-language UI
   * existed) into the per-language dict so the dialog has something
   * to render even without ``translations`` on the wire. */
  buildFallback(template: QuizTemplateDto): QuizTemplateTranslations {
    const lang = (this.binding?.currentLang() ?? LanguageEnumDto.Fr) as LangCode;
    return {
      [lang]: {
        title: template.title ?? '',
        description: template.description ?? '',
      },
    };
  }

  translationGroup(lang: string): FormGroup | null {
    if (!this.binding) {
      return null;
    }
    const group = this.binding.getTranslationsGroup().get(lang);
    return group instanceof FormGroup ? group : null;
  }

  async translate(): Promise<void> {
    const binding = this.binding;
    if (!binding) {
      return;
    }
    const sourceLang = this.activeLang();
    const sourceGroup = sourceLang ? this.translationGroup(sourceLang) : null;
    if (!sourceLang || !sourceGroup) {
      return;
    }

    this.translating.set(true);
    binding.onPageError(null);

    try {
      for (const targetLang of this.langs()) {
        if (targetLang === sourceLang) {
          continue;
        }

        const targetGroup = this.translationGroup(targetLang);
        if (!targetGroup) {
          continue;
        }

        const items: TranslateBatchItem[] = [];
        if (!(targetGroup.controls['title'].value ?? '').trim()) {
          items.push({key: 'title', text: sourceGroup.controls['title'].value ?? '', format: 'text'});
        }
        if (!(targetGroup.controls['description'].value ?? '').trim()) {
          items.push({key: 'description', text: sourceGroup.controls['description'].value ?? '', format: 'text'});
        }

        if (!items.length) {
          continue;
        }

        const translated = await this.translationService.translateBatch(sourceLang, targetLang, items);
        if (translated['title'] !== undefined) {
          targetGroup.controls['title'].setValue(translated['title']);
        }
        if (translated['description'] !== undefined) {
          targetGroup.controls['description'].setValue(translated['description']);
        }
      }
    } catch (error) {
      console.error(error);
      binding.onPageError(this.editorUi().pages.quizCreate.errors.translateTemplateFailed);
    } finally {
      this.translating.set(false);
      binding.onTranslationsChanged();
    }
  }
}
