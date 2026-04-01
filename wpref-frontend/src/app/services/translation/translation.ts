import {Injectable} from '@angular/core';
import {firstValueFrom} from 'rxjs';

import {
  FormatEnumDto,
  LanguageEnumDto,
  TranslateBatchCreateRequestParams,
  TranslateBatchRequestRequestDto,
  TranslateItemRequestDto,
  TranslationApi,
} from '../../api/generated';

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
  constructor(private api: TranslationApi) {
  }

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

    const requestParams: TranslateBatchCreateRequestParams = {
      translateBatchRequestRequestDto: payload,
    };

    const res = await firstValueFrom(this.api.translateBatchCreate(requestParams));
    return res?.translations ?? {};
  }
}
