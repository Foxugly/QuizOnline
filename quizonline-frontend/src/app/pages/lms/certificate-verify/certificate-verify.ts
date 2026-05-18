import {ChangeDetectionStrategy, Component, inject} from '@angular/core';

import {UiTextService} from '../../../shared/i18n/ui-text.service';

import {getLmsCertificateVerifyUiText} from './certificate-verify.i18n';

@Component({
  selector: 'app-lms-certificate-verify',
  templateUrl: './certificate-verify.html',
  styleUrl: './certificate-verify.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCertificateVerify {
  protected ui = inject(UiTextService).localized(getLmsCertificateVerifyUiText);
}
