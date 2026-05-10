import {Component, inject, ChangeDetectionStrategy} from '@angular/core';
import {UiTextService} from '../../shared/i18n/ui-text.service';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  app = window.__APP__!;
  readonly ui = inject(UiTextService).ui;
}
