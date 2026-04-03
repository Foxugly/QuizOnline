import {Component, inject} from '@angular/core';
import {UserService} from '../../services/user/user';
import {getUiText} from '../../shared/i18n/ui-text';

declare global {
  interface Window {
    __APP__?: {
      name: string;
      version: string;
      author: string;
      year: string;
      logoSvg: string;
      logoIco: string;
      logoPng: string;
    };
  }
}

@Component({
  selector: 'app-footer',
  imports: [],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class FooterComponent {
  app = window.__APP__!;
  private readonly userService = inject(UserService);

  get ui() {
    return getUiText(this.userService.currentLang);
  }
}
