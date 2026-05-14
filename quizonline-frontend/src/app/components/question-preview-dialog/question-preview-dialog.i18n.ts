import {LanguageEnumDto} from '../../api/generated/model/language-enum';

export type QuestionPreviewDialogUiText = {
  header: string;
  loading: string;
  notFound: string;
  loadFailed: string;
};

const QUESTION_PREVIEW_DIALOG_UI_TEXT: Record<LanguageEnumDto, QuestionPreviewDialogUiText> = {
  [LanguageEnumDto.Fr]: {
    header: 'Aperçu de la question',
    loading: 'Chargement de l’aperçu…',
    notFound: 'Question introuvable.',
    loadFailed: 'Impossible de charger l’aperçu de la question.',
  },
  [LanguageEnumDto.En]: {
    header: 'Question preview',
    loading: 'Loading preview…',
    notFound: 'Question not found.',
    loadFailed: 'Unable to load the question preview.',
  },
  [LanguageEnumDto.Nl]: {
    header: 'Voorbeeld van de vraag',
    loading: 'Voorbeeld laden…',
    notFound: 'Vraag niet gevonden.',
    loadFailed: 'Kan het voorbeeld van de vraag niet laden.',
  },
  [LanguageEnumDto.It]: {
    header: 'Anteprima della domanda',
    loading: 'Caricamento dell’anteprima…',
    notFound: 'Domanda non trovata.',
    loadFailed: 'Impossibile caricare l’anteprima della domanda.',
  },
  [LanguageEnumDto.Es]: {
    header: 'Vista previa de la pregunta',
    loading: 'Cargando la vista previa…',
    notFound: 'Pregunta no encontrada.',
    loadFailed: 'No se puede cargar la vista previa de la pregunta.',
  },
};

export function getQuestionPreviewDialogUiText(
  lang: LanguageEnumDto | string | null | undefined,
): QuestionPreviewDialogUiText {
  return QUESTION_PREVIEW_DIALOG_UI_TEXT[lang as LanguageEnumDto]
    ?? QUESTION_PREVIEW_DIALOG_UI_TEXT[LanguageEnumDto.Fr];
}
