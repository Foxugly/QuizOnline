import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {pageUiText} from '../../shared/i18n/catalog-registry';

/**
 * Dictionary for the ``/lesson/{id}/edit`` redirect page. The editor
 * strings moved to ``shared/learning/lesson-content-editor``.
 */
export interface LessonEditUiText {
  loading: string;
}

export function getLessonEditUiText(
  lang: LanguageEnumDto | string | null | undefined,
): LessonEditUiText {
  return pageUiText<LessonEditUiText>('lessonEdit', lang);
}
