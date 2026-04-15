import {CommonModule} from '@angular/common';
import {Component, computed, DestroyRef, inject, OnInit, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';

import {
  SystemCheckResponse,
  SystemConfigResponse,
  SystemConfigSection,
  SystemConfigSectionLabel,
  SystemConfigService,
} from '../../../services/admin/system-config';
import {UserService} from '../../../services/user/user';
import {getUiText} from '../../../shared/i18n/ui-text';
import {logApiError} from '../../../shared/api/api-errors';
import {AppToastService} from '../../../shared/toast/app-toast.service';

type SectionViewModel = {
  label: SystemConfigSectionLabel;
  title: string;
  description: string;
  entries: Array<{key: string; label: string; value: string}>;
  checkLabel: string;
  lastCheck: SystemCheckResponse | null;
  checking: boolean;
};

@Component({
  selector: 'app-system-config-page',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule],
  templateUrl: './system-config.html',
  styleUrl: './system-config.scss',
})
export class SystemConfigPage implements OnInit {
  private readonly systemConfigService = inject(SystemConfigService);
  private readonly userService = inject(UserService);
  private readonly toast = inject(AppToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly ui = computed(() => getUiText(this.userService.currentLang));
  readonly t = computed(() => this.ui().admin.systemConfig);

  readonly loading = signal(true);
  readonly sections = signal<SystemConfigSection[]>([]);
  readonly checks = signal<Partial<Record<SystemConfigSectionLabel, SystemCheckResponse>>>({});
  readonly checking = signal<Partial<Record<SystemConfigSectionLabel, boolean>>>({});

  readonly sectionCards = computed<SectionViewModel[]>(() => {
    const labels = this.t().sections;
    return this.sections().map((section) => ({
      label: section.label,
      title: labels[section.label].title,
      description: labels[section.label].description,
      entries: Object.entries(section.values).map(([key, value]) => ({
        key,
        label: labels[section.label].fields[key] ?? key,
        value: String(value),
      })),
      checkLabel: labels[section.label].check,
      lastCheck: this.checks()[section.label] ?? null,
      checking: this.checking()[section.label] === true,
    }));
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.systemConfigService.getConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: SystemConfigResponse) => {
          this.sections.set(response.sections);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          logApiError('admin.system-config.load', err);
          this.toast.add({
            severity: 'error',
            summary: this.t().errorTitle,
            detail: this.t().loadError,
          });
        },
      });
  }

  runCheck(target: SystemConfigSectionLabel): void {
    this.checking.update((state) => ({...state, [target]: true}));
    this.systemConfigService.runCheck(target)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.checking.update((state) => ({...state, [target]: false}));
          this.checks.update((state) => ({...state, [target]: response}));
          this.toast.add({
            severity: response.status === 'ok' ? 'success' : response.status === 'skipped' ? 'warn' : 'error',
            summary: this.t().checkResultTitle,
            detail: response.detail,
          });
        },
        error: (err: unknown) => {
          this.checking.update((state) => ({...state, [target]: false}));
          logApiError('admin.system-config.check', err);
          this.toast.add({
            severity: 'error',
            summary: this.t().errorTitle,
            detail: this.t().checkError,
          });
        },
      });
  }

  trackByLabel(_index: number, section: SectionViewModel): string {
    return section.label;
  }

  statusClass(status: string | undefined): string {
    if (status === 'ok') {
      return 'system-config__status system-config__status--ok';
    }
    if (status === 'skipped') {
      return 'system-config__status system-config__status--skipped';
    }
    if (status === 'error') {
      return 'system-config__status system-config__status--error';
    }
    return 'system-config__status';
  }
}
