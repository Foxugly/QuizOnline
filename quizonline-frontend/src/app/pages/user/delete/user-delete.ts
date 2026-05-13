import {Component, computed, inject, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {ActivatedRoute, Router} from '@angular/router';

import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';
import {MessageModule} from 'primeng/message';

import {ROUTES} from '../../../app.routes-paths';
import {UserService} from '../../../services/user/user';
import {logApiError, userFacingApiMessage} from '../../../shared/api/api-errors';

@Component({
  selector: 'app-user-delete-page',
  imports: [ButtonModule, CardModule, MessageModule],
  templateUrl: './user-delete.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDeletePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  readonly ui = inject(UiTextService).editor;
  readonly userId = signal(0);
  readonly username = signal('');
  readonly submitError = signal<string | null>(null);

  ngOnInit(): void {
    const errors = this.ui().pages.userDelete.errors;
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id)) {
      this.submitError.set(errors.invalidId);
      return;
    }
    this.userId.set(id);

    this.userService.retrieveAdmin(id).subscribe({
      next: (user) => this.username.set(user.username),
      error: (err) => {
        logApiError('user.delete.load', err);
        this.submitError.set(userFacingApiMessage(err, errors.loadFailed));
      },
    });
  }

  confirmDelete(): void {
    const errors = this.ui().pages.userDelete.errors;
    this.submitError.set(null);
    this.userService.deleteAdmin(this.userId()).subscribe({
      next: () => void this.router.navigate(ROUTES.user.list()),
      error: (err) => {
        logApiError('user.delete.submit', err);
        this.submitError.set(userFacingApiMessage(err, errors.deleteFailed));
      },
    });
  }

  cancel(): void {
    void this.router.navigate(ROUTES.user.list());
  }
}
