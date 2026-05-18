import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {InputTextModule} from 'primeng/inputtext';
import {TabsModule} from 'primeng/tabs';
import {TextareaModule} from 'primeng/textarea';
import {Subject, Subscription, debounceTime} from 'rxjs';

import {UserService} from '../../../../services/user/user';
import {UiTextService} from '../../../../shared/i18n/ui-text.service';
import {ContentBlock} from '../../../../shared/lms/content-block.types';
import {pickDefaultLang} from '../../../../shared/lms/default-lang';

import {BlockTranslateButton} from './block-translate-button';
import {getLmsBlockEditorsUiText} from './block-editors.i18n';

/**
 * Editor for the ``callout`` ContentBlock — an info / tip banner with
 * a localized ``title`` and a localized ``callout_text`` body. Both
 * fields are translatable; non-translatable callout colour / variant
 * is currently stored in ``metadata`` and not exposed by this MVP
 * editor.
 */
@Component({
  selector: 'app-callout-block-editor',
  imports: [FormsModule, InputTextModule, TabsModule, TextareaModule, BlockTranslateButton],
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
            <label>
              {{ ui().fieldTitle }}
              <input pInputText type="text"
                     [ngModel]="titleFor(lang)"
                     (ngModelChange)="onChange(lang, 'title', $event)" />
            </label>
            <label>
              {{ ui().fieldCalloutBody }}
              <textarea pInputTextarea rows="3"
                        [ngModel]="bodyFor(lang)"
                        (ngModelChange)="onChange(lang, 'callout_text', $event)"></textarea>
            </label>
          </p-tabpanel>
        }
      </p-tabpanels>
    </p-tabs>
  `,
  styles: [`
    :host { display: block; }
    label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; margin-top: 0.5rem; }
    .tablist-actions { display: inline-flex; align-items: center; margin-left: auto; padding-left: 0.5rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalloutBlockEditor implements OnInit, OnDestroy {
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

  protected bodyFor(lang: string): string {
    return this.block().translations?.[lang]?.['callout_text'] ?? '';
  }

  protected onChange(lang: string, field: 'title' | 'callout_text', value: string | null | undefined): void {
    const tr = {...(this.block().translations ?? {})};
    tr[lang] = {...(tr[lang] ?? {}), [field]: value ?? ''};
    this.debouncer$.next({translations: tr});
  }
}
