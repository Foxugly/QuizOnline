import {Injectable} from '@angular/core';
import {firstValueFrom} from 'rxjs';

import {
  FormatEnum,
  LanguageEnum,
  TranslateBatchRequestRequest,
  TranslateItemRequest,
  TranslationService as TranslationApiService,
} from '../../api/generated';

export type LangCode = `${LanguageEnum}`;
export type TranslateFormat = 'text' | 'html';

export type TranslateBatchItem = {
  key: string;
  text: string;
  format: TranslateFormat;
};

export const LANG_CODES = Object.values(LanguageEnum) as LangCode[];

export function isLangCode(value: string): value is LangCode {
  return (LANG_CODES as readonly string[]).includes(value);
}

@Injectable({providedIn: 'root'})
export class TranslationService {
  constructor(private api: TranslationApiService) {
  }

  async translateBatch(source: string, target: string, items: TranslateBatchItem[]): Promise<Record<string, string>> {
    const requestItems: TranslateItemRequest[] = items.map((item) => ({
      key: item.key,
      text: item.text,
      format: item.format === 'html' ? FormatEnum.Html : FormatEnum.Text,
    }));

    const payload: TranslateBatchRequestRequest = {
      source,
      target,
      items: requestItems,
    };

    const res = await firstValueFrom(this.api.translateBatchCreate(payload));
    return res?.translations ?? {};
  }
}
