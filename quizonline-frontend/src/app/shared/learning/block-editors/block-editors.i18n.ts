import {LanguageEnumDto} from '../../../api/generated/model/language-enum';

/**
 * Shared label dictionary for every block-editor under
 * ``shared/learning/block-editors/``. Each editor injects this
 * via :func:`UiTextService.localized` so the field labels stay
 * consistent across editors without duplicating five-language switches
 * inside every component file.
 */
export interface BlockEditorsUiText {
  /** Generic label for the localized "title" string of a block. */
  fieldTitle: string;
  /** Body of a callout block (translatable). */
  fieldCalloutBody: string;
  /** Label of the variant picker on a callout block. */
  fieldCalloutVariant: string;
  /** Localised labels of the 4 callout variants — fed to the SelectButton. */
  calloutVariantInfo: string;
  calloutVariantSuccess: string;
  calloutVariantWarning: string;
  calloutVariantError: string;
  /** External URL field on embed / video blocks. */
  fieldExternalUrl: string;
  /** Video URL (raw / embed) on a video block. */
  fieldVideoUrl: string;
  /** Video provider picker on a video block. */
  fieldVideoProvider: string;
  /** Quiz template id field on a quiz block. */
  fieldQuizTemplate: string;
  /** Programming language on a code block. */
  fieldCodeLanguage: string;
  /** Source code body on a code block. */
  fieldCodeContent: string;
  /** Choose-a-file button label for image / file uploads. */
  chooseFile: string;
  /** Helper hint shown next to the chosen file URL. */
  currentFileLabel: string;
  /** Message shown while waiting for an upload to finish. */
  uploading: string;
  /** Success toast after a file or image upload. */
  uploadSuccessToast: string;
  /** Error toast when the upload service rejects a file. */
  uploadErrorToast: string;
  /** Placeholder for a TODO editor that has no controls yet. */
  todoPlaceholder: string;
  /** Placeholder shown in the quiz-template autocomplete picker. */
  quizTemplatePlaceholder: string;
  /** Inline button label on the language tabs row of translatable editors. */
  translateButton: string;
  /** Success toast emitted by the inline per-block translate button. */
  translateSuccessToast: string;
  /** Error toast emitted by the inline per-block translate button. */
  translateErrorToast: string;
}

export function getBlockEditorsUiText(
  lang: LanguageEnumDto | string | null | undefined,
): BlockEditorsUiText {
  switch (lang) {
    case LanguageEnumDto.Fr:
    case 'fr':
      return {
        fieldTitle: 'Titre',
        fieldCalloutBody: 'Texte',
        fieldCalloutVariant: 'Type',
        calloutVariantInfo: 'Information',
        calloutVariantSuccess: 'Succès',
        calloutVariantWarning: 'Avertissement',
        calloutVariantError: 'Erreur',
        fieldExternalUrl: 'URL externe',
        fieldVideoUrl: 'URL de la vidéo',
        fieldVideoProvider: 'Hébergeur',
        fieldQuizTemplate: 'Identifiant du modèle de quiz',
        fieldCodeLanguage: 'Langage',
        fieldCodeContent: 'Code source',
        chooseFile: 'Choisir un fichier',
        currentFileLabel: 'Fichier actuel',
        uploading: 'Envoi en cours…',
        uploadSuccessToast: 'Fichier envoyé.',
        uploadErrorToast: 'Impossible d\'envoyer le fichier.',
        todoPlaceholder: 'Éditeur à implémenter prochainement.',
        quizTemplatePlaceholder: 'Rechercher un quiz…',
        translateButton: 'Traduire',
        translateSuccessToast: 'Traduction appliquée.',
        translateErrorToast: 'Échec de la traduction automatique.',
      };
    case LanguageEnumDto.Nl:
    case 'nl':
      return {
        fieldTitle: 'Titel',
        fieldCalloutBody: 'Tekst',
        fieldCalloutVariant: 'Type',
        calloutVariantInfo: 'Informatie',
        calloutVariantSuccess: 'Succes',
        calloutVariantWarning: 'Waarschuwing',
        calloutVariantError: 'Fout',
        fieldExternalUrl: 'Externe URL',
        fieldVideoUrl: 'Video-URL',
        fieldVideoProvider: 'Provider',
        fieldQuizTemplate: 'ID van het quizsjabloon',
        fieldCodeLanguage: 'Taal',
        fieldCodeContent: 'Broncode',
        chooseFile: 'Bestand kiezen',
        currentFileLabel: 'Huidig bestand',
        uploading: 'Bezig met uploaden…',
        uploadSuccessToast: 'Bestand verzonden.',
        uploadErrorToast: 'Kan het bestand niet uploaden.',
        todoPlaceholder: 'Editor volgt binnenkort.',
        quizTemplatePlaceholder: 'Een quiz zoeken…',
        translateButton: 'Vertalen',
        translateSuccessToast: 'Vertaling toegepast.',
        translateErrorToast: 'Automatische vertaling mislukt.',
      };
    case LanguageEnumDto.It:
    case 'it':
      return {
        fieldTitle: 'Titolo',
        fieldCalloutBody: 'Testo',
        fieldCalloutVariant: 'Tipo',
        calloutVariantInfo: 'Informazione',
        calloutVariantSuccess: 'Successo',
        calloutVariantWarning: 'Avviso',
        calloutVariantError: 'Errore',
        fieldExternalUrl: 'URL esterno',
        fieldVideoUrl: 'URL del video',
        fieldVideoProvider: 'Provider',
        fieldQuizTemplate: 'ID del modello di quiz',
        fieldCodeLanguage: 'Linguaggio',
        fieldCodeContent: 'Codice sorgente',
        chooseFile: 'Scegli un file',
        currentFileLabel: 'File attuale',
        uploading: 'Caricamento in corso…',
        uploadSuccessToast: 'File caricato.',
        uploadErrorToast: 'Impossibile caricare il file.',
        todoPlaceholder: 'Editor in arrivo a breve.',
        quizTemplatePlaceholder: 'Cerca un quiz…',
        translateButton: 'Traduci',
        translateSuccessToast: 'Traduzione applicata.',
        translateErrorToast: 'Traduzione automatica non riuscita.',
      };
    case LanguageEnumDto.Es:
    case 'es':
      return {
        fieldTitle: 'Título',
        fieldCalloutBody: 'Texto',
        fieldCalloutVariant: 'Tipo',
        calloutVariantInfo: 'Información',
        calloutVariantSuccess: 'Éxito',
        calloutVariantWarning: 'Advertencia',
        calloutVariantError: 'Error',
        fieldExternalUrl: 'URL externa',
        fieldVideoUrl: 'URL del vídeo',
        fieldVideoProvider: 'Proveedor',
        fieldQuizTemplate: 'ID de la plantilla de cuestionario',
        fieldCodeLanguage: 'Lenguaje',
        fieldCodeContent: 'Código fuente',
        chooseFile: 'Elegir un archivo',
        currentFileLabel: 'Archivo actual',
        uploading: 'Enviando…',
        uploadSuccessToast: 'Archivo enviado.',
        uploadErrorToast: 'No se pudo enviar el archivo.',
        todoPlaceholder: 'Editor próximamente.',
        quizTemplatePlaceholder: 'Buscar un quiz…',
        translateButton: 'Traducir',
        translateSuccessToast: 'Traducción aplicada.',
        translateErrorToast: 'La traducción automática falló.',
      };
    default:
      return {
        fieldTitle: 'Title',
        fieldCalloutBody: 'Body',
        fieldCalloutVariant: 'Type',
        calloutVariantInfo: 'Info',
        calloutVariantSuccess: 'Success',
        calloutVariantWarning: 'Warning',
        calloutVariantError: 'Error',
        fieldExternalUrl: 'External URL',
        fieldVideoUrl: 'Video URL',
        fieldVideoProvider: 'Provider',
        fieldQuizTemplate: 'Quiz template id',
        fieldCodeLanguage: 'Language',
        fieldCodeContent: 'Source code',
        chooseFile: 'Choose a file',
        currentFileLabel: 'Current file',
        uploading: 'Uploading…',
        uploadSuccessToast: 'File uploaded.',
        uploadErrorToast: 'Could not upload the file.',
        todoPlaceholder: 'Editor coming soon.',
        quizTemplatePlaceholder: 'Search for a quiz…',
        translateButton: 'Translate',
        translateSuccessToast: 'Translation applied.',
        translateErrorToast: 'Automatic translation failed.',
      };
  }
}
