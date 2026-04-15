import {ComponentFixture, TestBed} from '@angular/core/testing';
import {of, throwError} from 'rxjs';

import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {
  SystemConfigService,
  type SystemConfigResponse,
} from '../../../services/admin/system-config';
import {UserService} from '../../../services/user/user';
import {AppToastService} from '../../../shared/toast/app-toast.service';
import {SystemConfigPage} from './system-config';

describe('SystemConfigPage', () => {
  let fixture: ComponentFixture<SystemConfigPage>;
  let component: SystemConfigPage;
  let systemConfigService: jasmine.SpyObj<SystemConfigService>;
  let toastService: Pick<AppToastService, 'add'>;
  let toastMessages: Array<unknown>;

  const configResponse: SystemConfigResponse = {
    sections: [
      {
        label: 'db',
        values: {
          engine: 'sqlite3',
          name: 'db.sqlite3',
        },
      },
      {
        label: 'deepl',
        values: {
          enabled: false,
          auth_key_configured: false,
        },
      },
    ],
  };

  beforeEach(async () => {
    systemConfigService = jasmine.createSpyObj<SystemConfigService>('SystemConfigService', ['getConfig', 'runCheck']);
    toastMessages = [];
    toastService = {
      add: (payload) => {
        toastMessages.push(payload);
      },
    };
    systemConfigService.getConfig.and.returnValue(of(configResponse));

    await TestBed.configureTestingModule({
      imports: [SystemConfigPage],
      providers: [
        {provide: SystemConfigService, useValue: systemConfigService},
        {provide: AppToastService, useValue: toastService},
        {
          provide: UserService,
          useValue: {
            currentLang: LanguageEnumDto.Fr,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SystemConfigPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads system config on init', () => {
    expect(systemConfigService.getConfig).toHaveBeenCalled();
    expect(component.loading()).toBeFalse();
    expect(component.sectionCards().length).toBe(2);
    expect(component.sectionCards()[0].label).toBe('db');
  });

  it('updates check status and shows toast on successful check', () => {
    systemConfigService.runCheck.and.returnValue(of({
      target: 'db',
      status: 'ok',
      detail: 'Database connection OK.',
      checked_at: '2026-04-15T12:00:00+02:00',
    }));

    component.runCheck('db');

    expect(systemConfigService.runCheck).toHaveBeenCalledOnceWith('db');
    expect(component.checks().db?.status).toBe('ok');
    expect(component.checks().db?.detail).toBe('Database connection OK.');
    const successToast = toastMessages.at(-1) as {severity: string; detail: string};
    expect(successToast.severity).toBe('success');
    expect(successToast.detail).toBe('Database connection OK.');
    expect(component.checking().db).toBeFalse();
  });

  it('shows an error toast when a check fails', () => {
    systemConfigService.runCheck.and.returnValue(throwError(() => new Error('boom')));

    component.runCheck('deepl');

    const errorToast = toastMessages.at(-1) as {severity: string};
    expect(errorToast.severity).toBe('error');
    expect(component.checking().deepl).toBeFalse();
  });

  it('returns the expected css class for statuses', () => {
    expect(component.statusClass('ok')).toContain('--ok');
    expect(component.statusClass('skipped')).toContain('--skipped');
    expect(component.statusClass('error')).toContain('--error');
    expect(component.statusClass(undefined)).toBe('system-config__status');
  });
});
