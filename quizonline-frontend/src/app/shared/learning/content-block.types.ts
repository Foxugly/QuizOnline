import {TranslationsMap} from './learning-translations';
import {BlockType, VideoProvider} from './learning-common.i18n';

/**
 * Block-role discriminator on a polymorphic block host. Question
 * hosts split their blocks into ``prompt`` and ``explanation`` lists;
 * Lesson / AnswerOption hosts only carry a ``body`` list. Mirrors the
 * backend ``Block.ROLE_*`` constants.
 */
export type BlockRole = 'body' | 'prompt' | 'explanation';

/**
 * View-model for a single content block, mirroring the backend
 * ``Block`` serializer payload. Field naming follows the wire shape
 * (snake_case) so DTOs from the generated API client can be narrowed
 * straight to this type without remapping.
 *
 * Phase 3.5: ``Block`` is now polymorphic — it may be hosted by a
 * Lesson (LMS structure), a Question (prompt / explanation), or an
 * AnswerOption (per-answer body). Exactly one host PK is non-null at
 * any time; the other two render as ``null``.
 */
export interface ContentBlock {
  id: number;
  lesson: number | null;
  question?: number | null;
  answer_option?: number | null;
  block_type: BlockType;
  block_role?: BlockRole;
  order: number;
  is_required: boolean;
  image: string | null;
  video_url: string;
  video_provider: VideoProvider | '';
  file: string | null;
  external_url: string;
  code_language: string;
  code_content: string;
  quiz_template: number | null;
  metadata: Record<string, unknown>;
  translations: TranslationsMap;
}
