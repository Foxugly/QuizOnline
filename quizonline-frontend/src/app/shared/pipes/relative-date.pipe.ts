import {Pipe, PipeTransform, inject} from '@angular/core';
import {DatePipe} from '@angular/common';

import {UserService} from '../../services/user/user';
import {UiTextService} from '../i18n/ui-text.service';

/**
 * Renders a date as a relative string for recent events ("à l'instant",
 * "il y a 12 min", "il y a 3 j") and falls back to a localised absolute
 * date for older ones. Threshold defaults to 7 days.
 *
 * Pure pipe — recomputed only on input change, not every CD cycle —
 * which is the right call for tables with hundreds of rows. Components
 * that want the relative label to "tick" while the popover is open
 * should drive a `now` signal and re-bind the input (the notifications
 * bell already does this).
 *
 * Usage:
 *   {{ row.created_at | relativeDate }}
 *   {{ row.created_at | relativeDate:'long' }}   // explicit absolute format
 */
@Pipe({
  name: 'relativeDate',
  pure: true,
})
export class RelativeDatePipe implements PipeTransform {
  private readonly uiText = inject(UiTextService);
  private readonly userService = inject(UserService);
  private readonly datePipe = new DatePipe(this.userService.currentLang || 'en');

  transform(value: string | number | Date | null | undefined, absoluteFormat: string = 'short'): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    const ts = value instanceof Date ? value.getTime() : Date.parse(String(value));
    if (!Number.isFinite(ts)) {
      return '';
    }
    const ageSeconds = Math.max(0, (Date.now() - ts) / 1000);
    const sevenDays = 7 * 24 * 3600;
    if (ageSeconds < sevenDays) {
      return this.uiText.ui().notifications.relative(ageSeconds);
    }
    return this.datePipe.transform(new Date(ts), absoluteFormat) ?? '';
  }
}
