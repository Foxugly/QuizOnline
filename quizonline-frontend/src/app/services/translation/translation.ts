import {Injectable, inject} from '@angular/core';
import {firstValueFrom} from 'rxjs';

import {TranslationApi as TranslationApiService} from '../../api/generated/api/translation.service';
import {FormatEnumDto} from '../../api/generated/model/format-enum';
import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {TranslateBatchRequestRequestDto} from '../../api/generated/model/translate-batch-request-request';
import {TranslateItemRequestDto} from '../../api/generated/model/translate-item-request';

export type LangCode = `${LanguageEnumDto}`;
export type TranslateFormat = 'text' | 'html';

export type TranslateBatchItem = {
  key: string;
  text: string;
  format: TranslateFormat;
};

export const LANG_CODES = Object.values(LanguageEnumDto) as LangCode[];

export function isLangCode(value: string): value is LangCode {
  return (LANG_CODES as readonly string[]).includes(value);
}

@Injectable({providedIn: 'root'})
export class TranslationService {
    private readonly api = inject(TranslationApiService);

  async translateBatch(source: string, target: string, items: TranslateBatchItem[]): Promise<Record<string, string>> {
    const requestItems: TranslateItemRequestDto[] = items.map((item) => ({
      key: item.key,
      text: item.text,
      format: item.format === 'html' ? FormatEnumDto.Html : FormatEnumDto.Text,
    }));

    const payload: TranslateBatchRequestRequestDto = {
      source,
      target,
      items: requestItems,
    };

    const res = await firstValueFrom(this.api.translateBatchCreate({translateBatchRequestRequestDto: payload}));
    return res?.translations ?? {};
  }
}
