import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {InputNumberModule} from 'primeng/inputnumber';
import {InputTextModule} from 'primeng/inputtext';
import {TabsModule} from 'primeng/tabs';
import {Subject, Subscription, debounceTime} from 'rxjs';

import {UserService} from '../../../../services/user/user';
import {UiTextService} from '../../../../shared/i18n/ui-text.service';
import {ContentBlock} from '../../../../shared/lms/content-block.types';
import {pickDefaultLang} from '../../../../shared/lms/default-lang';

import {BlockTranslateButton} from './block-translate-button';
import {getLmsBlockEditorsUiText} from './block-editors.i18n';

/**
 * Editor for the ``quiz`` ContentBlock.
 *
 * Per-language tabs hosting a single translatable ``title`` (used as
 * the block-outline label and the in-content card heading), plus the
 * non-translatable ``quiz_template`` foreign key. The underlying quiz
 * template still owns its own translated questions / answers — the
 * ``title`` here just labels the block in the lesson.
 */
@Component({
  selector: 'app-quiz-block-editor',
  imports: [FormsModule, InputNumberModule, InputTextModule, TabsModule, BlockTranslateButton],
  template: `
    <p-tabs [value]="activeLang()" (valueChange)="activeLang.set($any($event))">
      <p-tablist>
        @for (lang of availableLangs(); track lang) {
          <p-tab [value]="lang">{{ lang.toUpperCase() }}</p-tab>
        }
        <div class="tablist-actions">
          <app-block-translate-button
            [block]="block()"
            [availableLangs]="availableLangs()"
            [activeLang]="activeLang()"
            (changed)="changed.emit($event)" />
        </div>
      </p-tablist>
      <p-tabpanels>
        @for (lang of availableLangs(); track lang) {
          <p-tabpanel [value]="lang">
            <label class="field">
              {{ ui().fieldTitle }}
              <input pInputText type="text"
                     [ngModel]="titleFor(lang)"
                     (ngModelChange)="onTitleChange(lang, $event)" />
            </label>
          </p-tabpanel>
        }
      </p-tabpanels>
    </p-tabs>

    <label class="field field--inline">
      {{ ui().fieldQuizTemplate }}
      <p-inputNumber [ngModel]="block().quiz_template"
                     [useGrouping]="false"
                     [min]="1"
                     (ngModelChange)="onTemplateChange($event)" />
    </label>
  `,
  styles: [`
    :host { display: block; }
    .field { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; margin-top: 0.5rem; }
    .field--inline { display: inline-flex; }
    .tablist-actions { display: inline-flex; align-items: center; margin-left: auto; padding-left: 0.5rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizBlockEditor implements OnInit, OnDestroy {
  private readonly user = inject(UserService);
  protected readonly ui = inject(UiTextService).localized(getLmsBlockEditorsUiText);

  block = input.required<ContentBlock>();
  availableLangs = input<string[]>(['fr', 'en']);
  changed = output<Partial<ContentBlock>>();

  protected readonly activeLang = signal<string>('');
  private readonly defaultLang = computed(() => pickDefaultLang(this.availableLangs(), this.user.lang()));

  private readonly debouncer$ = new Subject<Partial<ContentBlock>>();
  private sub: Subscription | null = null;

  ngOnInit(): void {
    this.activeLang.set(this.defaultLang());
    this.sub = this.debouncer$
      .pipe(debounceTime(500))
      .subscribe((patch) => this.changed.emit(patch));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.sub = null;
  }

  protected titleFor(lang: string): string {
    return this.block().translations?.[lang]?.['title'] ?? '';
  }

  protected onTitleChange(lang: string, value: string | null | undefined): void {
    const tr = {...(this.block().translations ?? {})};
    tr[lang] = {...(tr[lang] ?? {}), title: value ?? ''};
    this.debouncer$.next({translations: tr});
  }

  protected onTemplateChange(value: number | null | undefined): void {
    const next = typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
    this.debouncer$.next({quiz_template: next});
  }
}
