import {Component, computed, inject, input, output, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {InputTextModule} from 'primeng/inputtext';
import {ButtonModule} from 'primeng/button';
import {getEditorUiText} from '../../shared/i18n/editor-ui-text';
import {UserService} from '../../services/user/user';

@Component({
  selector: 'app-quiz-list-toolbar',
  imports: [FormsModule, InputTextModule, ButtonModule],
  templateUrl: './quiz-list-toolbar.html',
  styleUrl: './quiz-list-toolbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizListToolbarComponent {
  private readonly userService = inject(UserService);
  readonly editorUi = computed(() => getEditorUiText(this.userService.currentLang));
  readonly search = input('');
  readonly canCompose = input(false);
  readonly canQuickCreate = input(false);

  readonly searchChange = output<string>();
  readonly compose = output<void>();
  readonly quickCreate = output<void>();
}
