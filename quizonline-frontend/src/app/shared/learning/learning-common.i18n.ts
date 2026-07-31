import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {pageUiText} from '../i18n/catalog-registry';

/** Content-block type discriminator shared by every LMS lesson block. */
export type BlockType =
  | 'rich_text' | 'image' | 'video' | 'file'
  | 'quiz' | 'callout' | 'code' | 'embed';

/** Lifecycle of a user's enrollment in a course. */
export type EnrollmentStatus = 'pending' | 'active' | 'completed' | 'cancelled';

/** Difficulty taxonomy advertised on a course. */
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';

/** Source backing a video block. */
export type VideoProvider = 'youtube' | 'vimeo' | 'upload';

/**
 * Bundle of label dictionaries needed across every LMS surface that
 * renders one of the enums above. Page-specific i18n files compose this
 * via :func:`getLearningCommonUiText` rather than duplicating per-page.
 */
export interface LearningCommonUiText {
  blockTypeLabels: Record<BlockType, string>;
  enrollmentStatusLabels: Record<EnrollmentStatus, string>;
  levelLabels: Record<CourseLevel, string>;
  videoProviderLabels: Record<VideoProvider, string>;
}

/**
 * Return the shared LMS enum label dictionary for ``lang``. Accepts the
 * same wide ``LanguageEnumDto | string | null | undefined`` shape as
 * every other ``getXxxUiText`` getter so it slots directly into
 * :func:`UiTextService.localized`; unknown values fall back to English.
 */
export function getLearningCommonUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LearningCommonUiText {
  return pageUiText<LearningCommonUiText>('learningCommon', lang);
}
