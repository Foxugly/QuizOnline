import {Pipe, PipeTransform} from '@angular/core';

const DEFAULT_MAX_LENGTH = 30;
const ELLIPSIS = '...';

@Pipe({
  name: 'truncateFilename',
  standalone: true,
})
export class TruncateFilenamePipe implements PipeTransform {
  transform(value: string | null | undefined, maxLength: number = DEFAULT_MAX_LENGTH): string {
    if (!value) {
      return '';
    }
    if (value.length <= maxLength) {
      return value;
    }

    const dot = value.lastIndexOf('.');
    // Treat as extensionless when the dot is missing, leading, or part of a
    // long "extension" we'd just truncate further anyway.
    const hasUsableExt = dot > 0 && value.length - dot <= 8;
    const ext = hasUsableExt ? value.slice(dot) : '';
    const stem = hasUsableExt ? value.slice(0, dot) : value;

    const budget = maxLength - ELLIPSIS.length - ext.length;
    if (budget <= 0) {
      return value.slice(0, maxLength - ELLIPSIS.length) + ELLIPSIS;
    }

    return stem.slice(0, budget) + ELLIPSIS + ext;
  }
}
