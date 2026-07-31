import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {pageUiText} from '../../../shared/i18n/catalog-registry';

export interface CourseReviewsUiText {
  heading: string;
  noReviews: string;
  reviewsCount: string; // "{count} avis"
  ratingCount: string; // "{count} notes"
  yourReview: string;
  writeReview: string;
  editReview: string;
  ratingLabel: string;
  commentLabel: string;
  commentPlaceholder: string;
  submit: string;
  delete: string;
  hide: string;
  unhide: string;
  hiddenBadge: string;
  savedToast: string;
  errorToast: string;
  onlyCompleted: string; // hint when the learner hasn't completed
}

export function getCourseReviewsUiText(
  lang: LanguageEnumDto | string | null | undefined,
): CourseReviewsUiText {
  return pageUiText<CourseReviewsUiText>('courseReviews', lang);
}
