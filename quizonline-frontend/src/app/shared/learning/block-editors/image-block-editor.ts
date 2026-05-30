import {ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ButtonModule} from 'primeng/button';
import {FileUploadHandlerEvent, FileUploadModule} from 'primeng/fileupload';
import {InputTextModule} from 'primeng/inputtext';
import {TabsModule} from 'primeng/tabs';

import {logApiError} from '../../api/api-errors';
import {UiTextService} from '../../i18n/ui-text.service';
import {AppToastService} from '../../toast/app-toast.service';
import {ContentBlock} from '../content-block.types';
import {pickDefaultLang} from '../default-lang';
import {UploadService} from '../../../services/upload/upload.service';
import {UserService} from '../../../services/user/user';

import {getBlockListEditorUiText} from '../block-list-editor/block-list-editor.i18n';
import {BlockTranslateButton} from './block-translate-button';
import {getBlockEditorsUiText} from './block-editors.i18n';

/**
 * Editor for the ``image`` ContentBlock.
 *
 * Translatable: per-language ``title`` shown as the image caption.
 * Non-translatable: the underlying ``image`` URL, replaced via
 * :class:`UploadService.uploadImageForBlock`. The picker is a
 * ``<p-fileupload customUpload>`` so authors get drag-and-drop, a
 * thumbnail preview, and explicit size feedback — the actual upload
 * still flows through our service so the multipart payload, error
 * mapping, and toast remain consistent with the rest of the LMS.
 *
 * Upload happens immediately (independent of the explicit-save flow):
 * the new image URL is folded into the local working copy and the
 * subsequent Save round-trip persists ``image`` along with any title
 * edits the author made.
 */
@Component({
  selector: 'app-image-block-editor',
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
      @if (currentBlock().image; as url) {
        <figure class="preview">
          <img [src]="url" [alt]="ui().fieldTitle" />
          <figcaption>{{ ui().currentFileLabel }}</figcaption>
        </figure>
      }
      <p-fileupload
        mode="basic"
        accept="image/*"
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
    .preview { margin: 0; display: inline-flex; flex-direction: column; align-items: center; gap: 0.25rem; }
    .preview img { max-width: 180px; max-height: 110px; border-radius: 8px; border: 1px solid var(--p-surface-border, #e5e7eb); object-fit: cover; }
    .preview figcaption { font-size: 0.75rem; color: var(--text-color-secondary, #6b7280); }
    .muted { color: var(--text-color-secondary, #6b7280); font-size: 0.85rem; }
    .tablist-actions { display: inline-flex; align-items: center; margin-left: auto; padding-left: 0.5rem; }
    .block-editor-footer { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageBlockEditor implements OnInit {
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

  protected onUpload(event: FileUploadHandlerEvent): void {
    const file = event.files?.[0];
    if (!file) {
      return;
    }
    this.uploading.set(true);
    this.uploads.uploadImageForBlock(this.block().id, file).subscribe({
      next: (resp) => {
        const url = (resp as {image?: string} | null)?.image ?? '';
        if (url) {
          const current = this.currentBlock();
          this.localBlock.set({...current, image: url});
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
  }
}
