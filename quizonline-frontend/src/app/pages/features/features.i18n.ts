import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {pageUiText} from '../../shared/i18n/catalog-registry';
import {
  buildFeaturesUiText,
  type FeaturesContent,
  type FeaturesUiText,
} from './features.util';

export type {FeatureItem, FeatureSection, FeaturesUiText} from './features.util';

export function getFeaturesUiText(
  lang: LanguageEnumDto | string | null | undefined,
): FeaturesUiText {
  // Le catalogue stocke le contenu BRUT (sections indexees par slug) ; c'est
  // buildFeaturesUiText qui le transforme en tableau ordonne selon
  // SECTION_DEFS. Ne pas court-circuiter cette etape : le template fait
  // @for sur ui().sections et ne peut pas iterer un Record.
  return buildFeaturesUiText(pageUiText<FeaturesContent>('features', lang));
}
