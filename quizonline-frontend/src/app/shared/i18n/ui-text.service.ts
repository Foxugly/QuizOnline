import {computed, Injectable, inject, Signal} from '@angular/core';

import {UserService} from '../../services/user/user';
import {getEditorUiText, type EditorUiText} from './editor-ui-text';
import {getUiText, type UiText} from './ui-text';

/**
 * Centralised reactive i18n accessors.
 *
 * Replaces the per-component pattern of (now obsolete):
 *   readonly ui = computed(() =&gt; getUiText(this.userService.currentLang));
 *
 * Inject and read the signals directly:
 *   protected readonly ui = inject(UiTextService).ui;
 *   protected readonly editorUi = inject(UiTextService).editor;
 *
 * Both signals re-compute when the user's language changes.
 */
@Injectable({providedIn: 'root'})
export class UiTextService {
  private readonly userService = inject(UserService);

  /** Top-level UI dictionary (topmenu, login, footer, home, preferences, …). */
  readonly ui: Signal<UiText> = computed(() => getUiText(this.userService.lang()));

  /** Editor / admin UI dictionary (CRUD forms, list pages, …). */
  readonly editor: Signal<EditorUiText> = computed(() => getEditorUiText(this.userService.lang()));
}
