import {ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ButtonModule} from 'primeng/button';
import {FileUploadHandlerEvent, FileUploadModule} from 'primeng/fileupload';
import {InputTextModule} from 'primeng/inputtext';
import {TabsModule} from 'primeng/tabs';

import {logApiError} from '../../../shared/api/api-errors';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {AppToastService} from '../../../shared/toast/app-toast.service';
import {ContentBlock} from '../../../shared/learning/content-block.types';
import {pickDefaultLang} from '../../../shared/learning/default-lang';
import {UploadService} from '../../../services/upload/upload.service';
import {UserService} from '../../../services/user/user';

import {getBlockListEditorUiText} from '../../../shared/learning/block-list-editor/block-list-editor.i18n';
import {BlockTranslateButton} from './block-translate-button';
import {getBlockEditorsUiText} from './block-editors.i18n';

/**
 * Editor for the ``file`` ContentBlock.
 *
 * Translatable: per-language ``title`` shown as the link label. The
 * upload picker is a ``<p-fileupload customUpload>`` that defers the
 * actual multipart PATCH to :class:`UploadService.uploadFileForBlock`
 * so error mapping and toasts stay consistent across editors.
 */
@Component({
  selector: 'app-file-block-editor',
  imports: [FormsModule, ButtonModule, FileUploadModule, InputTextModule, TabsModule, BlockTranslateButton],
  template: `
    @if (!hideTitle()) {
      <p-tabs [value]="activeLang()" (valueChange)="activeLang.set($any($event))">
        <p-tablist>
          @for (lang of availableLangs(); track lang) {
            <p-tab [value]="lang">{{ lang.toUpperCase() }}</p-tab>
          }
          <div class="tablist-actions">
            <app-block-translate-button
              [block]="currentBlock()"
              [availableLangs]="availableLangs()"
              [activeLang]="activeLang()"
              (changed)="applyTranslationPatch($event)" />
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
    }

    <div class="upload-area">
      @if (currentBlock().file; as url) {
        <a class="current-file" [href]="url" target="_blank" rel="noopener noreferrer">
          <i class="pi pi-file"></i>
          <span class="current-file__name">{{ fileNameFromUrl(url) }}</span>
          <span class="current-file__hint">({{ ui().currentFileLabel }})</span>
        </a>
      }
      <p-fileupload
        mode="basic"
        [auto]="true"
        [customUpload]="true"
        [chooseLabel]="ui().chooseFile"
        [disabled]="uploading()"
        (uploadHandler)="onUpload($event)" />
      @if (uploading()) {
        <span class="muted">{{ ui().uploading }}</span>
      }
    </div>

    <div class="block-editor-footer">
      <p-button type="button" severity="secondary" [outlined]="true"
                [label]="listUi().cancelBlockLabel"
                [disabled]="saving()"
                (onClick)="cancel.emit()" />
      <p-button type="button"
                [label]="listUi().saveBlockLabel"
                [loading]="saving()"
                [disabled]="saving()"
                (onClick)="save.emit(currentBlock())" />
    </div>
  `,
  styles: [`
    :host { display: block; }
    .field { display: inline-flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; width: 100%; margin-top: 0.5rem; }
    .upload-area { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; margin-top: 0.75rem; }
    .current-file { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.45rem 0.7rem; border: 1px solid var(--p-surface-border, #e5e7eb); border-radius: 8px; color: inherit; text-decoration: none; }
    .current-file:hover { background: var(--p-surface-100, #f3f4f6); }
    .current-file__name { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 18rem; }
    .current-file__hint { font-size: 0.75rem; color: var(--text-color-secondary, #6b7280); }
    .muted { color: var(--text-color-secondary, #6b7280); font-size: 0.85rem; }
    .tablist-actions { display: inline-flex; align-items: center; margin-left: auto; padding-left: 0.5rem; }
    .block-editor-footer { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileBlockEditor implements OnInit {
  private readonly uploads = inject(UploadService);
  private readonly toast = inject(AppToastService);
  private readonly user = inject(UserService);

  protected readonly ui = inject(UiTextService).localized(getBlockEditorsUiText);
  protected readonly listUi = inject(UiTextService).localized(getBlockListEditorUiText);

  readonly block = input.required<ContentBlock>();
  readonly availableLangs = input<string[]>(['fr', 'en']);
  readonly hideTitle = input<boolean>(false);
  readonly saving = input<boolean>(false);

  readonly save = output<ContentBlock>();
  readonly cancel = output<void>();

  protected readonly uploading = signal(false);
  protected readonly activeLang = signal<string>('');
  private readonly defaultLang = computed(() => pickDefaultLang(this.availableLangs(), this.user.lang()));

  private readonly localBlock = signal<ContentBlock | null>(null);
  protected readonly currentBlock = computed(() => this.localBlock() ?? this.block());

  ngOnInit(): void {
    this.activeLang.set(this.defaultLang());
  }

  protected titleFor(lang: string): string {
    return this.currentBlock().translations?.[lang]?.['title'] ?? '';
  }

  protected onTitleChange(lang: string, value: string | null | undefined): void {
    const current = this.currentBlock();
    const tr = {...(current.translations ?? {})};
    tr[lang] = {...(tr[lang] ?? {}), title: value ?? ''};
    this.localBlock.set({...current, translations: tr});
  }

  protected applyTranslationPatch(patch: Partial<ContentBlock>): void {
    if (!patch.translations) {
      return;
    }
    const current = this.currentBlock();
    this.localBlock.set({...current, translations: patch.translations});
  }

  protected fileNameFromUrl(url: string): string {
    try {
      const u = new URL(url, window.location.origin);
      const seg = u.pathname.split('/').filter(Boolean).pop() ?? '';
      return decodeURIComponent(seg) || url;
    } catch {
      const stripped = url.split('?')[0] ?? url;
      return stripped.split('/').filter(Boolean).pop() ?? url;
    }
  }

  protected onUpload(event: FileUploadHandlerEvent): void {
    const file = event.files?.[0];
    if (!file) {
      return;
    }
    this.uploading.set(true);
    this.uploads.uploadFileForBlock(this.block().id, file).subscribe({
      next: (resp) => {
        const url = (resp as {file?: string} | null)?.file ?? '';
        if (url) {
          const current = this.currentBlock();
          this.localBlock.set({...current, file: url});
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
  }
}
