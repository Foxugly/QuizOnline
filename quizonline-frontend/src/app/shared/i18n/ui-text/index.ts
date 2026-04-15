import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

import {EN} from './en';
import {ES} from './es';
import {FR} from './fr';
import {IT} from './it';
import {NL} from './nl';
import type {UiText} from './types';

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
