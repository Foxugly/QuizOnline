import {TranslationsMap} from './learning-translations';
import {BlockType, VideoProvider} from './learning-common.i18n';

/**
 * View-model for a single lesson content block, mirroring the backend
 * ``ContentBlock`` serializer payload. Field naming follows the wire
 * shape (snake_case) so DTOs from the generated API client can be
 * narrowed straight to this type without remapping.
 */
export interface ContentBlock {
  id: number;
  lesson: number;
  block_type: BlockType;
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
