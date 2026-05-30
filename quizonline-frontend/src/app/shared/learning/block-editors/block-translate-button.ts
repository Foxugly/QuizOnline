import {ChangeDetectionStrategy, Component, computed, inject, input, output, signal} from '@angular/core';
import {ButtonModule} from 'primeng/button';

import {logApiError} from '../../../shared/api/api-errors';
import {isEmptyRichText} from '../../../shared/html/is-empty-rich-text';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {ContentBlock} from '../../../shared/learning/content-block.types';
import {TRANSLATABLE_FIELDS} from '../../../shared/learning/translatable-fields';
import {TranslationsMap} from '../../../shared/learning/learning-translations';
import {AppToastService} from '../../../shared/toast/app-toast.service';
import {TranslateBatchItem, TranslationService} from '../../../services/translation/translation';

import {getBlockEditorsUiText} from './block-editors.i18n';

/**
 * Inline "translate from current tab" button that lives next to the
 * language tabs of a block editor. Mirrors the info-tab UX: only fills
 * empty per-language slots, never overwrites. Block types with no
 * translatable fields render nothing.
 */
@Component({
  selector: 'app-block-translate-button',
  imports: [ButtonModule],
  template: `
    @if (fields().length > 0 && availableLangs().length > 1) {
      <p-button
        type="button"
        severity="info"
        size="small"
        icon="pi pi-language"
        [label]="ui().translateButton"
        [disabled]="translating()"
        [loading]="translating()"
        (onClick)="run()">
      </p-button>
    }
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlockTranslateButton {
  private readonly translator = inject(TranslationService);
  private readonly toast = inject(AppToastService);
  protected readonly ui = inject(UiTextService).localized(getBlockEditorsUiText);

  block = input.required<ContentBlock>();
  availableLangs = input<string[]>(['fr', 'en']);
  activeLang = input.required<string>();
  changed = output<Partial<ContentBlock>>();

  protected readonly translating = signal(false);
  protected readonly fields = computed(() => TRANSLATABLE_FIELDS[this.block().block_type]);

  protected async run(): Promise<void> {
    if (this.translating()) {
      return;
    }
    const source = this.activeLang();
    const targets = this.availableLangs().filter((l) => l !== source);
    const fields = this.fields();
    if (!targets.length || !fields.length) {
      return;
    }

    this.translating.set(true);
    try {
      const merged: TranslationsMap = {...(this.block().translations ?? {})};

      // Pre-compute the per-target item lists in a single sync pass
      // so we can fire every ``translateBatch`` call in parallel via
      // ``Promise.all`` — wall time becomes ``max(call latency)``
      // instead of ``sum``, which on a 5-language domain turns 4
      // sequential round-trips into one network burst.
      const plans: Array<{target: string; items: TranslateBatchItem[]}> = [];
      for (const target of targets) {
        const items: TranslateBatchItem[] = [];
        for (const f of fields) {
          const targetVal = (merged[target]?.[f.key] ?? '').toString();
          const isBlank = f.format === 'html' ? isEmptyRichText(targetVal) : !targetVal.trim();
          if (!isBlank) {
            continue;
          }
          const sourceVal = (merged[source]?.[f.key] ?? '').toString();
          const sourceBlank = f.format === 'html' ? isEmptyRichText(sourceVal) : !sourceVal.trim();
          if (sourceBlank) {
            continue;
          }
          items.push({key: f.key, text: sourceVal, format: f.format});
        }
        if (items.length) {
          plans.push({target, items});
        }
      }

      const results = await Promise.all(
        plans.map((p) =>
          this.translator
            .translateBatch(source, p.target, p.items)
            .then((out) => ({target: p.target, out})),
        ),
      );

      let touched = false;
      for (const {target, out} of results) {
        const targetGroup = {...(merged[target] ?? {})};
        for (const f of fields) {
          const v = out[f.key];
          if (v !== undefined) {
            targetGroup[f.key] = v;
            touched = true;
          }
        }
        merged[target] = targetGroup;
      }
      if (touched) {
        this.changed.emit({translations: merged});
        this.toast.add({severity: 'success', summary: this.ui().translateSuccessToast});
      }
    } catch (err) {
      logApiError('lms.block-translate', err);
      this.toast.addApiError(err, this.ui().translateErrorToast);
    } finally {
      this.translating.set(false);
    }
  }
}
