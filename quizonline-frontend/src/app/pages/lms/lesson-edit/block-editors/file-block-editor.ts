import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {InputTextModule} from 'primeng/inputtext';
import {TabsModule} from 'primeng/tabs';
import {Subject, Subscription, debounceTime} from 'rxjs';

import {logApiError} from '../../../../shared/api/api-errors';
import {UiTextService} from '../../../../shared/i18n/ui-text.service';
import {AppToastService} from '../../../../shared/toast/app-toast.service';
import {ContentBlock} from '../../../../shared/lms/content-block.types';
import {LmsUploadService} from '../../../../services/lms/lms-upload.service';

import {getLmsBlockEditorsUiText} from './block-editors.i18n';

/**
 * Editor for the ``file`` ContentBlock (generic downloadable asset).
 *
 * Translatable: per-language ``title`` shown as the link label by the
 * renderer. Non-translatable: the stored ``file`` URL, replaced via
 * :class:`LmsUploadService.uploadFileForBlock`. Same plain-input
 * upload approach as the image editor — see that file for the
 * rationale.
 */
@Component({
  selector: 'app-file-block-editor',
  imports: [FormsModule, InputTextModule, TabsModule],
  template: `
    <p-tabs [value]="availableLangs()[0]">
      <p-tablist>
        @for (lang of availableLangs(); track lang) {
          <p-tab [value]="lang">{{ lang.toUpperCase() }}</p-tab>
        }
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
        <input type="file"
               [disabled]="uploading()"
               (change)="onFileSelected($event)" />
      </label>
      @if (uploading()) {
        <span class="muted">{{ ui().uploading }}</span>
      }
      @if (block().file; as url) {
        <span class="current-url"><strong>{{ ui().currentFileLabel }}:</strong> {{ url }}</span>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .upload-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; align-items: center; }
    .current-url { font-size: 0.85rem; color: var(--text-color-secondary, #6b7280); word-break: break-all; }
    label { display: inline-flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; width: 100%; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileBlockEditor implements OnInit, OnDestroy {
  private readonly uploads = inject(LmsUploadService);
  private readonly toast = inject(AppToastService);

  protected readonly ui = inject(UiTextService).localized(getLmsBlockEditorsUiText);

  block = input.required<ContentBlock>();
  availableLangs = input<string[]>(['fr', 'en']);
  changed = output<Partial<ContentBlock>>();

  protected readonly uploading = signal(false);

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
    this.uploads.uploadFileForBlock(this.block().id, file).subscribe({
      next: (resp) => {
        const url = (resp as {file?: string} | null)?.file ?? '';
        if (url) {
          this.changed.emit({file: url});
        }
        this.toast.add({severity: 'success', summary: this.ui().uploadSuccessToast});
      },
      error: (err: unknown) => {
        logApiError('lms.lesson-edit.upload-file', err);
        this.toast.addApiError(err, this.ui().uploadErrorToast);
        this.uploading.set(false);
      },
      complete: () => this.uploading.set(false),
    });
    inputEl.value = '';
  }
}
