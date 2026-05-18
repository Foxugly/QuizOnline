import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

export type SubjectFormUiText = {
  title: string;
  domain: string;
  domainPlaceholder: string;
  timer: string;
  timerActive: string;
  timerInactive: string;
  duration: string;
  durationSuffix: string;
  subjects: string;
  subjectsPlaceholder: string;
  questionCount: string;
  /** Variant rendered when we know the upper bound — e.g. "Nombre de questions (max : 12)". */
  questionCountWithMax: (max: number) => string;
};

const FR: SubjectFormUiText = {
  title: 'Titre',
  domain: 'Domaine',
  domainPlaceholder: 'Choisir un domaine',
  timer: 'Minuteur',
  timerActive: 'Activé',
  timerInactive: 'Désactivé',
  duration: 'Durée',
  durationSuffix: ' min',
  subjects: 'Sujets',
  subjectsPlaceholder: 'Choisir un ou plusieurs sujets',
  questionCount: 'Nombre de questions',
  questionCountWithMax: (max) => `Nombre de questions (max : ${max})`,
};

const EN: SubjectFormUiText = {
  title: 'Title',
  domain: 'Domain',
  domainPlaceholder: 'Pick a domain',
  timer: 'Timer',
  timerActive: 'On',
  timerInactive: 'Off',
  duration: 'Duration',
  durationSuffix: ' min',
  subjects: 'Topics',
  subjectsPlaceholder: 'Pick one or more topics',
  questionCount: 'Number of questions',
  questionCountWithMax: (max) => `Number of questions (max: ${max})`,
};

const NL: SubjectFormUiText = {
  title: 'Titel',
  domain: 'Domein',
  domainPlaceholder: 'Kies een domein',
  timer: 'Timer',
  timerActive: 'Aan',
  timerInactive: 'Uit',
  duration: 'Duur',
  durationSuffix: ' min',
  subjects: 'Onderwerpen',
  subjectsPlaceholder: 'Kies een of meer onderwerpen',
  questionCount: 'Aantal vragen',
  questionCountWithMax: (max) => `Aantal vragen (max: ${max})`,
};

const IT: SubjectFormUiText = {
  title: 'Titolo',
  domain: 'Dominio',
  domainPlaceholder: 'Scegli un dominio',
  timer: 'Timer',
  timerActive: 'Attivo',
  timerInactive: 'Disattivato',
  duration: 'Durata',
  durationSuffix: ' min',
  subjects: 'Argomenti',
  subjectsPlaceholder: 'Scegli uno o più argomenti',
  questionCount: 'Numero di domande',
  questionCountWithMax: (max) => `Numero di domande (max: ${max})`,
};

const ES: SubjectFormUiText = {
  title: 'Título',
  domain: 'Dominio',
  domainPlaceholder: 'Elige un dominio',
  timer: 'Temporizador',
  timerActive: 'Activo',
  timerInactive: 'Desactivado',
  duration: 'Duración',
  durationSuffix: ' min',
  subjects: 'Temas',
  subjectsPlaceholder: 'Elige uno o varios temas',
  questionCount: 'Número de preguntas',
  questionCountWithMax: (max) => `Número de preguntas (máx.: ${max})`,
};

const UI_TEXT: Record<LanguageEnumDto, SubjectFormUiText> = {
  [LanguageEnumDto.Fr]: FR,
  [LanguageEnumDto.En]: EN,
  [LanguageEnumDto.Nl]: NL,
  [LanguageEnumDto.It]: IT,
  [LanguageEnumDto.Es]: ES,
};

export function getSubjectFormUiText(
  lang: LanguageEnumDto | string | null | undefined,
): SubjectFormUiText {
  return UI_TEXT[lang as LanguageEnumDto] ?? FR;
}
