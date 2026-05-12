import {computed, Injectable, inject, Signal} from '@angular/core';

import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {UserService} from '../../services/user/user';
import {getEditorUiText, type EditorUiText} from './editor-ui-text';
import {getUiText, type UiText} from './ui-text';

/**
 * Loose type accepted by every ``getXxxUiText`` getter. The shape of
 * ``userService.lang()`` is the ``SupportedLanguage`` string union, so
 * widening here means every per-page i18n file can be plugged into
 * :func:`UiTextService.localized` without per-call casts.
 */
type LangInput = LanguageEnumDto | string | null | undefined;

/**
 * Centralised reactive i18n accessors.
 *
 * Two built-in dictionaries cover the shell and the editor / admin
 * surfaces. For page-scoped text live in ``pages/<page>/<page>.i18n.ts``,
 * inject the service and call ``localized(getXxxUiText)`` instead of
 * hand-rolling ``computed(() => getXxxUiText(userService.currentLang))``:
 *
 *   protected readonly ui = inject(UiTextService).ui;
 *   protected readonly editorUi = inject(UiTextService).editor;
 *   protected readonly pageText = inject(UiTextService).localized(getXxxUiText);
 *
 * All three signals re-compute when the user's language changes, so
 * every page now has consistent reactive language switching with no
 * per-component boilerplate.
 */
@Injectable({providedIn: 'root'})
export class UiTextService {
  private readonly userService = inject(UserService);

  /** Top-level UI dictionary (topmenu, login, footer, home, preferences, …). */
  readonly ui: Signal<UiText> = computed(() => getUiText(this.userService.lang()));

  /** Editor / admin UI dictionary (CRUD forms, list pages, …). */
  readonly editor: Signal<EditorUiText> = computed(() => getEditorUiText(this.userService.lang()));

  /**
   * Wrap any per-page ``getXxxUiText`` getter into a reactive signal
   * tied to the current language. Returned signal re-evaluates when
   * ``userService.lang()`` changes.
   */
  localized<T>(getter: (lang: LangInput) => T): Signal<T> {
    return computed(() => getter(this.userService.lang()));
  }
}
