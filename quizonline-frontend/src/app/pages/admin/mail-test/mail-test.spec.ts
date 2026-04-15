import {ComponentFixture, TestBed} from '@angular/core/testing';
import {of, throwError} from 'rxjs';

import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {MailTestService} from '../../../services/admin/mail-test';
import {UserService} from '../../../services/user/user';
import {AppToastService} from '../../../shared/toast/app-toast.service';
import {MailTestPage} from './mail-test';

describe('MailTestPage', () => {
  let fixture: ComponentFixture<MailTestPage>;
  let component: MailTestPage;
  let mailTestService: jasmine.SpyObj<MailTestService>;
  let toastService: Pick<AppToastService, 'add'>;
  let toastMessages: Array<unknown>;

  beforeEach(async () => {
    mailTestService = jasmine.createSpyObj<MailTestService>('MailTestService', ['sendTestEmail']);
    toastMessages = [];
    toastService = {
      add: (payload) => {
        toastMessages.push(payload);
      },
    };

    await TestBed.configureTestingModule({
      imports: [MailTestPage],
      providers: [
        {provide: MailTestService, useValue: mailTestService},
        {provide: AppToastService, useValue: toastService},
        {
          provide: UserService,
          useValue: {
            currentLang: LanguageEnumDto.Fr,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MailTestPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('does not submit when form is invalid', () => {
    component.submit();

    expect(mailTestService.sendTestEmail).not.toHaveBeenCalled();
    expect(component.toControl.touched).toBeTrue();
  });

  it('stores last response and shows success toast on submit', () => {
    mailTestService.sendTestEmail.and.returnValue(of({
      detail: 'Email queued.',
      email_id: 42,
      recipients: ['dest@example.com'],
      subject: 'Test subject',
    }));
    component.form.setValue({
      to: 'dest@example.com',
      subject: 'Test subject',
      body: 'Hello',
    });

    component.submit();

    expect(mailTestService.sendTestEmail).toHaveBeenCalledOnceWith({
      to: 'dest@example.com',
      subject: 'Test subject',
      body: 'Hello',
    });
    expect(component.lastResponse()).toEqual({
      emailId: 42,
      recipients: ['dest@example.com'],
      subject: 'Test subject',
    });
    const successToast = toastMessages.at(-1) as {severity: string; detail: string};
    expect(successToast.severity).toBe('success');
    expect(successToast.detail).toBe('Email queued.');
    expect(component.submitting()).toBeFalse();
  });

  it('shows backend detail on submit error', () => {
    mailTestService.sendTestEmail.and.returnValue(throwError(() => ({
      error: {detail: 'SMTP unavailable'},
    })));
    component.form.setValue({
      to: 'dest@example.com',
      subject: '',
      body: '',
    });

    component.submit();

    const errorToast = toastMessages.at(-1) as {severity: string; detail: string};
    expect(errorToast.severity).toBe('error');
    expect(errorToast.detail).toBe('SMTP unavailable');
    expect(component.submitting()).toBeFalse();
  });
});
