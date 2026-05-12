import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {TabsModule} from 'primeng/tabs';

import {CONTACT_INFO, emailDisplay, openContactEmail, phoneDisplay} from '../../shared/contact';
import {UiTextService} from '../../shared/i18n/ui-text.service';
import {getAboutUiText} from './about.i18n';

@Component({
  selector: 'app-about',
  imports: [TabsModule],
  templateUrl: './about.html',
  styleUrl: './about.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {
  protected readonly repositoryUrl = 'https://github.com/Foxugly/QuizOnline';
  protected readonly ui = inject(UiTextService).localized(getAboutUiText);
  protected readonly technicalCardKeys = ['repository', 'backend', 'frontend'] as const;
  protected readonly activeTab = signal('company');
  protected readonly contact = CONTACT_INFO;
  protected readonly emailDisplay = emailDisplay();
  protected readonly phoneDisplay = phoneDisplay();

  protected emailClick(): void {
    openContactEmail('[TrainingManager]');
  }
}
