import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {EditorModule} from 'primeng/editor';
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
 * Multilingual rich-text editor for the ``rich_text`` ContentBlock.
 *
 * One Quill instance per available language; we debounce keystrokes
 * (500 ms) before emitting a ``Partial<ContentBlock>`` patch that the
 * lesson-edit shell PATCHes against ``/api/block/{id}/``. Field
 * naming mirrors the serializer wire shape — translations live under
 * ``translations[lang].rich_text`` so the renderer and editor agree.
 */
@Component({
  selector: 'app-rich-text-block-editor',
  imports: [FormsModule, EditorModule, InputTextModule, TabsModule, BlockTranslateButton],
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
            <p-editor [ngModel]="bodyFor(lang)"
                      (ngModelChange)="onChange(lang, $event)"
                      [style]="{ height: '200px' }" />
          </p-tabpanel>
        }
      </p-tabpanels>
    </p-tabs>
  `,
  styles: [`
    :host { display: block; }
    .tablist-actions { display: inline-flex; align-items: center; margin-left: auto; padding-left: 0.5rem; }
    .field { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; margin: 0.5rem 0; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTextBlockEditor implements OnInit, OnDestroy {
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

  protected bodyFor(lang: string): string {
    return this.block().translations?.[lang]?.['rich_text'] ?? '';
  }

  protected titleFor(lang: string): string {
    return this.block().translations?.[lang]?.['title'] ?? '';
  }

  protected onChange(lang: string, value: string | null | undefined): void {
    const tr = {...(this.block().translations ?? {})};
    tr[lang] = {...(tr[lang] ?? {}), rich_text: value ?? ''};
    this.debouncer$.next({translations: tr});
  }

  protected onTitleChange(lang: string, value: string | null | undefined): void {
    const tr = {...(this.block().translations ?? {})};
    tr[lang] = {...(tr[lang] ?? {}), title: value ?? ''};
    this.debouncer$.next({translations: tr});
  }
}
