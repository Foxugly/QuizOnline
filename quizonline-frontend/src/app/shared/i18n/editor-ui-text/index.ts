import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import type {EditorUiText} from './types';
import {FR} from './fr';
import {EN} from './en';
import {NL} from './nl';
import {IT} from './it';
import {ES} from './es';

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
