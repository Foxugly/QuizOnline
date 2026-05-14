import {LanguageEnumDto} from '../../../../api/generated/model/language-enum';

export type QuizAlertListUiText = {
  empty: {
    title: string;
    hint: string;
  };
};

const FR: QuizAlertListUiText = {
  empty: {
    title: 'Aucun message',
    hint: 'Aucun message ne correspond au filtre actif.',
  },
};

const EN: QuizAlertListUiText = {
  empty: {
    title: 'No messages',
    hint: 'No message matches the current filter.',
  },
};

const NL: QuizAlertListUiText = {
  empty: {
    title: 'Geen berichten',
    hint: 'Geen bericht komt overeen met het actieve filter.',
  },
};

const IT: QuizAlertListUiText = {
  empty: {
    title: 'Nessun messaggio',
    hint: 'Nessun messaggio corrisponde al filtro attivo.',
  },
};

const ES: QuizAlertListUiText = {
  empty: {
    title: 'Sin mensajes',
    hint: 'Ningún mensaje coincide con el filtro activo.',
  },
};

const DICT: Record<LanguageEnumDto, QuizAlertListUiText> = {
  [LanguageEnumDto.Fr]: FR,
  [LanguageEnumDto.En]: EN,
  [LanguageEnumDto.Nl]: NL,
  [LanguageEnumDto.It]: IT,
  [LanguageEnumDto.Es]: ES,
};

export function getQuizAlertListUiText(lang: LanguageEnumDto | string | null | undefined): QuizAlertListUiText {
  return DICT[(lang as LanguageEnumDto) ?? LanguageEnumDto.En] ?? EN;
}
