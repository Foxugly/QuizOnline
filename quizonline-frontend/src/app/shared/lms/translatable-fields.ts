import {BlockType} from './lms-common.i18n';

/**
 * Translation key + format spec for the translatable fields of every
 * ContentBlock type. Block types with no translatable content
 * (``quiz``, ``code``) map to an empty array so the per-block translate
 * button can simply hide itself.
 */
export const TRANSLATABLE_FIELDS: Record<BlockType, ReadonlyArray<{key: string; format: 'text' | 'html'}>> = {
  rich_text: [{key: 'rich_text', format: 'html'}],
  image: [{key: 'title', format: 'text'}],
  video: [{key: 'title', format: 'text'}],
  file: [{key: 'title', format: 'text'}],
  quiz: [],
  callout: [{key: 'title', format: 'text'}, {key: 'callout_text', format: 'text'}],
  code: [],
  embed: [{key: 'title', format: 'text'}],
};
