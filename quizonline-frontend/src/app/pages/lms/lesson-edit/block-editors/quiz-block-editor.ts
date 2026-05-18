import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, input, output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {InputNumberModule} from 'primeng/inputnumber';
import {Subject, Subscription, debounceTime} from 'rxjs';

import {UiTextService} from '../../../../shared/i18n/ui-text.service';
import {ContentBlock} from '../../../../shared/lms/content-block.types';

import {getLmsBlockEditorsUiText} from './block-editors.i18n';

/**
 * Editor for the ``quiz`` ContentBlock.
 *
 * Minimal MVP: surfaces only the ``quiz_template`` foreign key as a
 * numeric id input — the full quiz-template picker (search + preview)
 * is deferred to a follow-up since it depends on the quiz catalog
 * service. No translatable fields: the underlying quiz template owns
 * its own per-language payload.
 */
@Component({
  selector: 'app-quiz-block-editor',
  imports: [FormsModule, InputNumberModule],
  template: `
    <label>
      {{ ui().fieldQuizTemplate }}
      <p-inputNumber [ngModel]="block().quiz_template"
                     [useGrouping]="false"
                     [min]="1"
                     (ngModelChange)="onTemplateChange($event)" />
    </label>
  `,
  styles: [`
    :host { display: block; }
    label { display: inline-flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizBlockEditor implements OnInit, OnDestroy {
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

  protected onTemplateChange(value: number | null | undefined): void {
    const next = typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
    this.debouncer$.next({quiz_template: next});
  }
}
