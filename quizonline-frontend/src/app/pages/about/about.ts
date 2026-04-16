import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {TabsModule} from 'primeng/tabs';

import {UserService} from '../../services/user/user';
import {getAboutUiText} from './about.i18n';

@Component({
  selector: 'app-about',
  imports: [TabsModule],
  templateUrl: './about.html',
  styleUrl: './about.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {
  private readonly userService = inject(UserService);

  protected readonly repositoryUrl = 'https://github.com/Foxugly/QuizOnline';
  protected readonly ui = computed(() => getAboutUiText(this.userService.currentLang));
  protected readonly technicalCardKeys = ['repository', 'backend', 'frontend'] as const;
  protected readonly activeTab = signal('features');
}
