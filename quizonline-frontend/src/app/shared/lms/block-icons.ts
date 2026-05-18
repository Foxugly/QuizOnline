import {BlockType} from './lms-common.i18n';

/**
 * PrimeNG / primeicons class string for each content-block type. Use
 * with ``<i [class]="BLOCK_ICONS[block.block_type]"></i>`` so the
 * lesson editor, lesson viewer and any future block listing all render
 * the same iconography.
 */
export const BLOCK_ICONS: Record<BlockType, string> = {
  rich_text: 'pi pi-align-left',
  image: 'pi pi-image',
  video: 'pi pi-video',
  file: 'pi pi-file',
  quiz: 'pi pi-question-circle',
  callout: 'pi pi-info-circle',
  code: 'pi pi-code',
  embed: 'pi pi-external-link',
};
