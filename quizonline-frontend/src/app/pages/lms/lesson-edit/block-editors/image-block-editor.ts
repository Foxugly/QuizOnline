import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {InputTextModule} from 'primeng/inputtext';
import {TabsModule} from 'primeng/tabs';
import {Subject, Subscription, debounceTime} from 'rxjs';

import {logApiError} from '../../../../shared/api/api-errors';
import {UiTextService} from '../../../../shared/i18n/ui-text.service';
import {AppToastService} from '../../../../shared/toast/app-toast.service';
import {ContentBlock} from '../../../../shared/lms/content-block.types';
import {LmsUploadService} from '../../../../services/lms/lms-upload.service';

import {BlockTranslateButton} from './block-translate-button';
import {getLmsBlockEditorsUiText} from './block-editors.i18n';

/**
 * Editor for the ``image`` ContentBlock.
 *
 * Translatable: per-language ``title`` shown as the image caption by
 * the renderer. Non-translatable: the underlying ``image`` URL, which
 * is replaced via :class:`LmsUploadService.uploadImageForBlock` when
 * the author picks a new file. We use a plain ``<input type="file">``
 * rather than ``<p-fileupload>`` so the upload pipeline stays under
 * our control (the service issues a multipart PATCH against the
 * ContentBlock endpoint, and the response is folded back into the
 * shell's local state via the ``changed`` output).
 */
@Component({
  selector: 'app-image-block-editor',
  imports: [FormsModule, InputTextModule, TabsModule, BlockTranslateButton],
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
                     (ngModelChange)="onTitleChange(lang, $event)" />
            </label>
          </p-tabpanel>
        }
      </p-tabpanels>
    </p-tabs>

    <div class="upload-row">
      <label class="file-picker">
        <span>{{ ui().chooseFile }}</span>
        <input type="file" accept="image/*"
               [disabled]="uploading()"
               (change)="onFileSelected($event)" />
      </label>
      @if (uploading()) {
        <span class="muted">{{ ui().uploading }}</span>
      }
      @if (block().image; as url) {
        <span class="current-url"><strong>{{ ui().currentFileLabel }}:</strong> {{ url }}</span>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .upload-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; align-items: center; }
    .current-url { font-size: 0.85rem; color: var(--text-color-secondary, #6b7280); word-break: break-all; }
    label { display: inline-flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; width: 100%; }
    .tablist-actions { display: inline-flex; align-items: center; margin-left: auto; padding-left: 0.5rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageBlockEditor implements OnInit, OnDestroy {
  private readonly uploads = inject(LmsUploadService);
  private readonly toast = inject(AppToastService);

  protected readonly ui = inject(UiTextService).localized(getLmsBlockEditorsUiText);

  block = input.required<ContentBlock>();
  availableLangs = input<string[]>(['fr', 'en']);
  changed = output<Partial<ContentBlock>>();

  protected readonly uploading = signal(false);
  protected readonly activeLang = signal<string>('');
  private readonly firstLang = computed(() => this.availableLangs()[0] ?? 'fr');

  private readonly debouncer$ = new Subject<Partial<ContentBlock>>();
  private sub: Subscription | null = null;

  ngOnInit(): void {
    this.activeLang.set(this.firstLang());
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

  protected onFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    if (!file) {
      return;
    }
    this.uploading.set(true);
    this.uploads.uploadImageForBlock(this.block().id, file).subscribe({
      next: (resp) => {
        const url = (resp as {image?: string} | null)?.image ?? '';
        if (url) {
          this.changed.emit({image: url});
        }
        this.toast.add({severity: 'success', summary: this.ui().uploadSuccessToast});
      },
      error: (err: unknown) => {
        logApiError('lms.lesson-edit.upload-image', err);
        this.toast.addApiError(err, this.ui().uploadErrorToast);
        this.uploading.set(false);
      },
      complete: () => this.uploading.set(false),
    });
    // Reset the input so picking the same file again still triggers ``change``.
    inputEl.value = '';
  }
}
