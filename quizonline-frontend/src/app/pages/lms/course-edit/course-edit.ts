import {ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Subscription} from 'rxjs';
import {TabsModule} from 'primeng/tabs';

import {UiTextService} from '../../../shared/i18n/ui-text.service';

import {getLmsCourseEditUiText} from './course-edit.i18n';
import {LmsCourseEditInfoTab} from './tabs/info-tab/info-tab';
import {LmsCourseEditStructureTab} from './tabs/structure-tab/structure-tab';
import {LmsCourseEditEnrollmentTab} from './tabs/enrollment-tab/enrollment-tab';
import {LmsCourseEditAnalyticsTab} from './tabs/analytics-tab/analytics-tab';

/**
 * Course-author shell: four-tab page (info / structure / enrollment /
 * analytics) keyed off the ``:id`` route param. Each tab is its own
 * OnPush component receiving ``courseId`` as a signal-input, so the
 * shell stays trivially light and tab components can fan out into
 * full editors without coupling.
 */
@Component({
  selector: 'app-lms-course-edit',
  imports: [
    TabsModule,
    LmsCourseEditInfoTab,
    LmsCourseEditStructureTab,
    LmsCourseEditEnrollmentTab,
    LmsCourseEditAnalyticsTab,
  ],
  templateUrl: './course-edit.html',
  styleUrl: './course-edit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCourseEdit implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);

  protected readonly ui = inject(UiTextService).localized(getLmsCourseEditUiText);
  protected readonly courseId = signal<number>(0);

  private routeSub: Subscription | null = null;

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const raw = params.get('id');
      const parsed = raw !== null ? Number(raw) : NaN;
      this.courseId.set(Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.routeSub = null;
  }
}
