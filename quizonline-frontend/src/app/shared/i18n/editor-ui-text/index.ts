import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

import EN_JSON from './en.json';
import ES_JSON from './es.json';
import FR_JSON from './fr.json';
import IT_JSON from './it.json';
import NL_JSON from './nl.json';
import type {EditorUiText} from './types';

const EN = EN_JSON as EditorUiText;
const FR = FR_JSON as EditorUiText;
const NL = NL_JSON as EditorUiText;
const IT = IT_JSON as EditorUiText;
const ES = ES_JSON as EditorUiText;

export type {EditorUiText} from './types';

const TEXTS: Partial<Record<LanguageEnumDto, EditorUiText>> = {
  [LanguageEnumDto.Fr]: FR,
  [LanguageEnumDto.En]: EN,
  [LanguageEnumDto.Nl]: NL,
  [LanguageEnumDto.It]: IT,
  [LanguageEnumDto.Es]: ES,
};

export function getEditorUiText(lang: LanguageEnumDto | string | null | undefined): EditorUiText {
  return TEXTS[lang as LanguageEnumDto] ?? EN;
}
