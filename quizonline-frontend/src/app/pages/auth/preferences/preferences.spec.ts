import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {Preferences} from './preferences';
import {AuthService} from '../../../services/auth/auth';
import {AppToastService} from '../../../shared/toast/app-toast.service';

describe('Preferences', () => {
  let component: Preferences;
  let fixture: ComponentFixture<Preferences>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Preferences],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(Preferences);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    // We intentionally skip ``fixture.detectChanges()`` for the danger-zone
    // suite: ngOnInit's /me + /domain bootstrap would race with the DELETE
    // we're about to issue and there is nothing in the danger-zone path
    // that needs the rendered template — we exercise the public methods
    // and signals directly.
  });

  afterEach(() => {
    // Drain any outstanding requests so leftovers don't bleed into the
    // next test. Skip cancelled requests (``takeUntilDestroyed`` may have
    // unsubscribed them already after the test's logout call).
    httpMock.match(() => true).forEach((req) => {
      if (!req.cancelled) {
        req.flush(null, {status: 200, statusText: 'OK'});
      }
    });
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('danger zone — account deletion', () => {
    // Set up a pretend logged-in user so ``deleteConfirmReady`` has a
    // target email to compare typed input against. We don't go through
    // the real /me load because the test runs without a backend.
    const fakeUser = {
      id: 1,
      email: 'alice@example.com',
      first_name: '',
      last_name: '',
    } as Parameters<typeof component.currentUser.set>[0];

    beforeEach(() => {
      component.currentUser.set(fakeUser);
    });

    it('keeps the destructive button disabled until the user retypes their email', () => {
      expect(component.deleteConfirmReady()).toBe(false);

      component.deleteConfirmInput.set('alice@example');
      expect(component.deleteConfirmReady()).toBe(false);

      component.deleteConfirmInput.set('Alice@Example.com'); // wrong case
      expect(component.deleteConfirmReady()).toBe(false);

      component.deleteConfirmInput.set('alice@example.com');
      expect(component.deleteConfirmReady()).toBe(true);
    });

    it('happy path: 204 logs the user out and routes to /home with a success toast', () => {
      const auth = TestBed.inject(AuthService);
      const router = TestBed.inject(Router);
      const toast = TestBed.inject(AppToastService);

      const logoutSpy = vi.spyOn(auth, 'logout').mockImplementation(() => {});
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      const toastSpy = vi.spyOn(toast, 'add');

      component.openDeleteAccountDialog();
      component.deleteConfirmInput.set('alice@example.com');
      component.confirmDeleteAccount();

      const req = httpMock.expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/api/user/me/'));
      req.flush(null, {status: 204, statusText: 'No Content'});

      expect(component.deleting()).toBe(false);
      expect(component.deleteDialogVisible()).toBe(false);
      expect(logoutSpy).toHaveBeenCalledOnce();
      expect(navigateSpy).toHaveBeenCalledWith(['/home']);
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({severity: 'success'}));
    });

    it('409 owner_of_domains surfaces an inline block message and keeps the dialog open', () => {
      const auth = TestBed.inject(AuthService);
      const router = TestBed.inject(Router);

      const logoutSpy = vi.spyOn(auth, 'logout').mockImplementation(() => {});
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      component.openDeleteAccountDialog();
      component.deleteConfirmInput.set('alice@example.com');
      component.confirmDeleteAccount();

      const req = httpMock.expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/api/user/me/'));
      req.flush(
        {detail: 'owner_of_domains', owned_count: 3},
        {status: 409, statusText: 'Conflict'},
      );

      expect(component.deleting()).toBe(false);
      expect(component.deleteDialogVisible()).toBe(true);
      // The inline message mentions the count so the user knows what to clean up.
      const msg = component.deleteBlockMessage();
      expect(msg).toBeTruthy();
      expect(msg).toContain('3');
      expect(logoutSpy).not.toHaveBeenCalled();
      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('generic 500 routes to an error toast (not the owner-block path)', () => {
      const toast = TestBed.inject(AppToastService);
      const errorToastSpy = vi.spyOn(toast, 'addApiError');

      component.openDeleteAccountDialog();
      component.deleteConfirmInput.set('alice@example.com');
      component.confirmDeleteAccount();

      const req = httpMock.expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/api/user/me/'));
      req.flush({detail: 'something went wrong'}, {status: 500, statusText: 'Server Error'});

      expect(component.deleting()).toBe(false);
      expect(component.deleteDialogVisible()).toBe(true);
      // No inline block message — that path is reserved for the 409 contract.
      expect(component.deleteBlockMessage()).toBeNull();
      expect(errorToastSpy).toHaveBeenCalled();
    });
  });
});
