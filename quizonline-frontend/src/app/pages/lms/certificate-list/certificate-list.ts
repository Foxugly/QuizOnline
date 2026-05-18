import {ChangeDetectionStrategy, Component, inject} from '@angular/core';

import {UiTextService} from '../../../shared/i18n/ui-text.service';

import {getLmsCertificateListUiText} from './certificate-list.i18n';

@Component({
  selector: 'app-lms-certificate-list',
  templateUrl: './certificate-list.html',
  styleUrl: './certificate-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LmsCertificateList {
  protected ui = inject(UiTextService).localized(getLmsCertificateListUiText);
}
