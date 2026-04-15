import {ChangeDetectionStrategy, Component, effect, ElementRef, input, output, ViewChild} from '@angular/core';
import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {SUPPORTED_LANGUAGES, SupportedLanguage} from '../../../environments/language';

@Component({
  selector: 'app-lang-select',
  templateUrl: './lang-select.html',
  styleUrl: './lang-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'(document:click)': 'closeMenu($event)'},
})
export class LangSelectComponent {
  readonly lang = input.required<SupportedLanguage>();
  readonly langChange = output<SupportedLanguage>();
  @ViewChild('menuRoot') private readonly menuRoot?: ElementRef<HTMLElement>;

  internalLang: SupportedLanguage = LanguageEnumDto.En;
  menuOpen = false;

  readonly langOptions: Array<{label: string; value: SupportedLanguage}> = SUPPORTED_LANGUAGES.map((language) => ({
    label: this.languageLabel(language),
    value: language,
  }));

  private readonly _syncLang = effect(() => {
    this.internalLang = this.lang();
  });

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  onInternalChange(value: SupportedLanguage): void {
    this.internalLang = value;
    this.menuOpen = false;
    this.langChange.emit(value);
  }

  closeMenu(event: Event): void {
    const root = this.menuRoot?.nativeElement;
    if (!root || root.contains(event.target as Node)) {
      return;
    }

    this.menuOpen = false;
  }

  private languageLabel(language: SupportedLanguage): string {
    switch (language) {
      case LanguageEnumDto.Fr:
        return 'FR';
      case LanguageEnumDto.Nl:
        return 'NL';
      case LanguageEnumDto.It:
        return 'IT';
      case LanguageEnumDto.Es:
        return 'ES';
      case LanguageEnumDto.En:
      default:
        return 'EN';
    }
  }
}
