import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export interface LmsProgressUiText {
  pageTitle: string;
}

export function getLmsProgressUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LmsProgressUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {pageTitle: 'Ma progression'};
    case LanguageEnumDto.Nl:
    case 'nl':
      return {pageTitle: 'Mijn voortgang'};
    case LanguageEnumDto.It:
    case 'it':
      return {pageTitle: 'I miei progressi'};
    case LanguageEnumDto.Es:
    case 'es':
      return {pageTitle: 'Mi progreso'};
    default:
      return {pageTitle: 'My progress'};
  }
}
