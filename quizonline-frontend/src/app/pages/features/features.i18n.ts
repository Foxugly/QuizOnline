import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import data from './features.i18n.json';
import {
  buildFeaturesUiText,
  type FeaturesContent,
  type FeaturesUiText,
} from './features.util';

export type {FeatureItem, FeatureSection, FeaturesUiText} from './features.util';

const CATALOG = data as Record<string, FeaturesContent>;

export function getFeaturesUiText(
  lang: LanguageEnumDto | string | null | undefined,
): FeaturesUiText {
  return buildFeaturesUiText(CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.En]);
}
