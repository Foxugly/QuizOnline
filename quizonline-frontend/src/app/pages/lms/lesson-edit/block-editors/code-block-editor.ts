import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, input, output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {InputTextModule} from 'primeng/inputtext';
import {TextareaModule} from 'primeng/textarea';
import {Subject, Subscription, debounceTime} from 'rxjs';

import {UiTextService} from '../../../../shared/i18n/ui-text.service';
import {ContentBlock} from '../../../../shared/lms/content-block.types';

import {getLmsBlockEditorsUiText} from './block-editors.i18n';

/**
 * Editor for the ``code`` ContentBlock.
 *
 * Non-translatable: ``code_language`` (used by the renderer for
 * highlight.js class) and ``code_content`` (raw source). No
 * translatable fields — code samples typically stand on their own.
 */
@Component({
  selector: 'app-code-block-editor',
  imports: [FormsModule, InputTextModule, TextareaModule],
  template: `
    <label>
      {{ ui().fieldCodeLanguage }}
      <input pInputText type="text"
             [ngModel]="block().code_language"
             (ngModelChange)="onLangChange($event)" />
    </label>
    <label>
      {{ ui().fieldCodeContent }}
      <textarea pInputTextarea rows="8" class="code-content"
                [ngModel]="block().code_content"
                (ngModelChange)="onContentChange($event)"></textarea>
    </label>
  `,
  styles: [`
    :host { display: block; }
    label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; margin-top: 0.5rem; }
    .code-content { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeBlockEditor implements OnInit, OnDestroy {
  protected readonly ui = inject(UiTextService).localized(getLmsBlockEditorsUiText);

  block = input.required<ContentBlock>();
  changed = output<Partial<ContentBlock>>();

  private readonly debouncer$ = new Subject<Partial<ContentBlock>>();
  private sub: Subscription | null = null;

  ngOnInit(): void {
    this.sub = this.debouncer$
      .pipe(debounceTime(500))
      .subscribe((patch) => this.changed.emit(patch));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.sub = null;
  }

  protected onLangChange(value: string | null | undefined): void {
    this.debouncer$.next({code_language: value ?? ''});
  }

  protected onContentChange(value: string | null | undefined): void {
    this.debouncer$.next({code_content: value ?? ''});
  }
}
