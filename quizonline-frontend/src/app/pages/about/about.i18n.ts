import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import data from './about.i18n.json';

export type AboutTechCard = {
  title: string;
  description: string;
  items: string[];
};

export type AboutLegalSection = {
  title: string;
  content: string[];
};

export type AboutUiText = {
  tabs: {
    company: string;
    legal: string;
    technical: string;
  };

  companyTitle: string;
  companyIntro: string;
  company: {
    contactLabel: string;
    companyLabel: string;
    vatLabel: string;
    addressLabel: string;
    emailLabel: string;
    emailButton: string;
    phoneLabel: string;
    websiteLabel: string;
  };

  legalTitle: string;
  legalIntro: string;
  legalSections: AboutLegalSection[];

  technicalTitle: string;
  technicalIntro: string;
  repositoryUrlLabel: string;
  cards: {
    repository: AboutTechCard;
    backend: AboutTechCard;
    frontend: AboutTechCard;
  };
};

const CATALOG = data as Record<string, AboutUiText>;

export function getAboutUiText(lang: LanguageEnumDto | string | null | undefined): AboutUiText {
  return CATALOG[lang as string] ?? CATALOG[LanguageEnumDto.En];
}
