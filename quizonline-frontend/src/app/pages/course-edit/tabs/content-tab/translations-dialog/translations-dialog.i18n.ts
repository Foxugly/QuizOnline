import {LanguageEnumDto} from '../../../../../api/generated/model/language-enum';
import {pageUiText} from '../../../../../shared/i18n/catalog-registry';

/**
 * Dictionary of the "Translations…" dialog opened from the course outline:
 * per-language title (and section description), publish / free-preview
 * toggles and the "translate from this tab" button. Wording carried over
 * from the former structure tab's edit dialogs.
 */
export interface TranslationsDialogUiText {
  sectionDialog: {
    titleEdit: string;
    titleField: string;
    descriptionField: string;
    isPublishedField: string;
    submitButton: string;
    cancelButton: string;
    translateButton: string;
    translationFailed: string;
  };
  lessonDialog: {
    titleEdit: string;
    titleField: string;
    isPreviewField: string;
    isPublishedField: string;
    submitButton: string;
    cancelButton: string;
    translateButton: string;
    translationFailed: string;
  };
  sectionUpdatedToast: string;
  lessonUpdatedToast: string;
  actionFailedToast: string;
  titleRequiredToast: string;
  /** Shown while the fresh section / lesson is fetched on open. */
  loading: string;
  loadFailedToast: string;
}

export function getTranslationsDialogUiText(
  lang: LanguageEnumDto | string | null | undefined,
): TranslationsDialogUiText {
  return pageUiText<TranslationsDialogUiText>('translationsDialog', lang);
}
