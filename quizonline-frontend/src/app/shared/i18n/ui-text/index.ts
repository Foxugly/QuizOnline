import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

import EN_JSON from './en.json';
import ES_JSON from './es.json';
import FR_JSON from './fr.json';
import IT_JSON from './it.json';
import NL_JSON from './nl.json';
import type {UiText} from './types';

const EN = EN_JSON as UiText;
const FR = FR_JSON as UiText;
const NL = NL_JSON as UiText;
const IT = IT_JSON as UiText;
const ES = ES_JSON as UiText;

const UI_TEXT: Partial<Record<LanguageEnumDto, UiText>> = {
  [LanguageEnumDto.Fr]: FR,
  [LanguageEnumDto.En]: EN,
  [LanguageEnumDto.Nl]: NL,
  [LanguageEnumDto.It]: IT,
  [LanguageEnumDto.Es]: ES,
};

export type {UiText} from './types';

export function getUiText(lang: LanguageEnumDto | string | null | undefined): UiText {
  return UI_TEXT[(lang as LanguageEnumDto)] ?? EN;
}
