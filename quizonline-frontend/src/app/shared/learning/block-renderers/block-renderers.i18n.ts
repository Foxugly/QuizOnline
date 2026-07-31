import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {pageUiText} from '../../i18n/catalog-registry';

/**
 * Shared label dictionary for every block-renderer under
 * ``shared/learning/block-renderers/``. Every visible string emitted
 * by the file / image / video / embed / quiz renderers (fallback
 * labels, CTAs, error / loading hints, score line, mode tags) lives
 * here so the renderers can stay under ``shared/`` without depending
 * on the ``pages/lesson-view`` page-scoped i18n.
 *
 * The quiz block renderer is a launcher card (the actual quiz player
 * lives at ``/quiz/:id/questions``). It surfaces four CTA states
 * (start / resume / view result / retake), a meta line
 * (questions / duration / mode), the loading + error affordances,
 * and the localised score / fallback strings.
 */
export interface BlockRenderersUiText {
  /** Generic "open file" link label rendered next to a file block when
   *  its translated ``title`` is empty. */
  downloadFileFallback: string;
  /** Placeholder shown when the video block has no recognisable
   *  provider or URL. */
  videoNotAvailable: string;
  /** Placeholder shown when the embed block has no URL or the URL
   *  fails to render. */
  embedNotAvailable: string;
  /** Escape-hatch link surfaced under embed iframes — used when the
   *  third-party host refuses to play in an iframe and the learner
   *  needs a way out to the original page. */
  embedOpenInNewTab: string;
  /** Title fallback when the QuizTemplate translation lookup yields no string. */
  quizBlockFallbackTitle: (templateId: number | string) => string;
  /** Pluralized "{n} questions" label for the meta line. */
  quizBlockQuestionsLabel: (n: number) => string;
  /** "{n} min" duration label for the meta line (only shown when with_duration). */
  quizBlockDurationLabel: (n: number) => string;
  /** Mode tag for practice quizzes. */
  quizBlockModePractice: string;
  /** Mode tag for exam quizzes. */
  quizBlockModeExam: string;
  /** CTA: no previous attempt — create a new session. */
  quizBlockStartButton: string;
  /** CTA: an active session exists — resume it. */
  quizBlockResumeButton: string;
  /** CTA: latest session is closed — view its result. */
  quizBlockViewResultButton: string;
  /** Secondary CTA when a closed session exists and a new attempt is still allowed. */
  quizBlockRetakeButton: string;
  /** "Score : {n}%" line for closed sessions. */
  quizBlockScoreLabel: (percent: number) => string;
  /** Notice shown when the user is no longer allowed to attempt the quiz. */
  quizBlockNoAttemptsRemaining: string;
  /** Error state when the template + sessions fetch fails. */
  quizBlockLoadFailed: string;
  /** Retry button paired with the error state. */
  quizBlockRetry: string;
  /** Defensive placeholder when the block has no ``quiz_template`` FK. */
  quizBlockNotConfigured: string;
}

export function getBlockRenderersUiText(
  lang: LanguageEnumDto | string | null | undefined,
): BlockRenderersUiText {
  return pageUiText<BlockRenderersUiText>('blockRenderers', lang);
}
