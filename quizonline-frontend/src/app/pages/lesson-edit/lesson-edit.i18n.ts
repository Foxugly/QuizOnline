import {LanguageEnumDto} from '../../api/generated/model/language-enum';

/**
 * Page-scoped dictionary for ``/lesson/{id}/edit``. The shell-level
 * strings (page title, preview / edit toggle labels, outline heading,
 * empty-state title + hint) live here. Everything block-list-related
 * (add bar, delete aria, reorder toasts, …) is owned by the shared
 * ``<app-block-list-editor>`` and lives in
 * ``shared/learning/block-list-editor/block-list-editor.i18n.ts``.
 */
export interface LessonEditUiText {
  pageTitle: string;
  /** Single load-error toast — surfaces a backend failure when the
   *  initial ``GET /api/lesson/{id}/`` rejects. */
  blockErrorToast: string;
  emptyTitle: string;
  emptyHint: string;
  /** Toggle label that swaps the editor for the in-page learner preview. */
  previewButton: string;
  /** Toggle label shown when the preview is active (switches back to edit mode). */
  editModeButton: string;
  /** Heading + aria-label of the left-side block outline shown in
   *  preview mode — mirrors the learner-facing /lesson/{id} page. */
  outlineHeading: string;
}

export function getLessonEditUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LessonEditUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        pageTitle: 'Édition de la leçon',
        blockErrorToast: 'L\'opération sur le bloc a échoué.',
        emptyTitle: 'Leçon vide',
        emptyHint: 'Ajoutez un premier bloc à l\'aide de la barre ci-dessous.',
        previewButton: 'Aperçu',
        editModeButton: 'Édition',
        outlineHeading: 'Plan de la leçon',
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        pageTitle: 'Les bewerken',
        blockErrorToast: 'De blok-bewerking is mislukt.',
        emptyTitle: 'Lege les',
        emptyHint: 'Voeg een eerste blok toe via de balk hieronder.',
        previewButton: 'Voorbeeld',
        editModeButton: 'Bewerken',
        outlineHeading: 'Lesoverzicht',
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        pageTitle: 'Modifica lezione',
        blockErrorToast: 'Operazione sul blocco non riuscita.',
        emptyTitle: 'Lezione vuota',
        emptyHint: 'Aggiungi un primo blocco usando la barra qui sotto.',
        previewButton: 'Anteprima',
        editModeButton: 'Modifica',
        outlineHeading: 'Indice della lezione',
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        pageTitle: 'Editar lección',
        blockErrorToast: 'La operación sobre el bloque falló.',
        emptyTitle: 'Lección vacía',
        emptyHint: 'Añade un primer bloque desde la barra de abajo.',
        previewButton: 'Vista previa',
        editModeButton: 'Editar',
        outlineHeading: 'Índice de la lección',
      };
    default:
      return {
        pageTitle: 'Edit lesson',
        blockErrorToast: 'Block operation failed.',
        emptyTitle: 'Empty lesson',
        emptyHint: 'Add a first block from the bar below.',
        previewButton: 'Preview',
        editModeButton: 'Edit',
        outlineHeading: 'Lesson outline',
      };
  }
}
