import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {DestroyRef} from '@angular/core';
import {ButtonModule} from 'primeng/button';

import {UserApi} from '../../api/generated/api/user.service';
import {AuthService} from '../../services/auth/auth';
import {logApiError} from '../../shared/api/api-errors';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {getPrivacyUiText} from './privacy.i18n';

@Component({
  selector: 'app-privacy',
  imports: [ButtonModule],
  templateUrl: './privacy.html',
  styleUrl: './privacy.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Privacy {
  protected readonly pageText = inject(UiTextService).localized(getPrivacyUiText);
  protected readonly editorUi = inject(UiTextService).editor;
  protected readonly auth = inject(AuthService);
  protected readonly downloading = signal(false);

  /** Cut-over date for the policy. Bump when the text materially changes. */
  protected readonly lastUpdatedDate = '2026-05-14';

  /** Address rendered in the contact section. Single source of truth so
   *  the operator can change it without touching translation strings. */
  protected readonly contactEmail = 'privacy@foxugly.com';

  private readonly userApi = inject(UserApi);
  private readonly destroyRef = inject(DestroyRef);

  /** Hits ``GET /api/customuser/me/export/`` and downloads the JSON dump
   *  with a sensible filename. No-op when the user is not authenticated
   *  (the button is hidden in that case). */
  download(): void {
    if (this.downloading()) {
      return;
    }
    this.downloading.set(true);
    this.userApi.userMeExportRetrieve()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (payload) => {
          const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `quizonline-export-${this.auth.getUsername() || 'me'}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          this.downloading.set(false);
        },
        error: (err) => {
          logApiError('privacy.export', err);
          this.downloading.set(false);
        },
      });
  }
}
