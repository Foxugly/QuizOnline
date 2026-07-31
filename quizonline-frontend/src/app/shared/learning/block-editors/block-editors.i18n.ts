import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {pageUiText} from '../../i18n/catalog-registry';

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
  return pageUiText<BlockEditorsUiText>('blockEditors', lang);
}
