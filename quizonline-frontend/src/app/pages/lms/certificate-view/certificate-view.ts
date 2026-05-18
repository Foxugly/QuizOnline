import {ChangeDetectionStrategy, Component, inject} from '@angular/core';

import {UiTextService} from '../../../shared/i18n/ui-text.service';

import {getLmsCertificateViewUiText} from './certificate-view.i18n';

@Component({
  selector: 'app-lms-certificate-view',
  templateUrl: './certificate-view.html',
  styleUrl: './certificate-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCertificateView {
  protected ui = inject(UiTextService).localized(getLmsCertificateViewUiText);
}
