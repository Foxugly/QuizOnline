import {Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, ViewChild} from '@angular/core';
import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {SUPPORTED_LANGUAGES, SupportedLanguage} from '../../../environments/language';

@Component({
  selector: 'app-lang-select',
  standalone: true,
  templateUrl: './lang-select.html',
  styleUrl: './lang-select.scss',
})
export class LangSelectComponent implements OnChanges {
  @Input() lang!: SupportedLanguage;
  @Output() langChange = new EventEmitter<SupportedLanguage>();
  @ViewChild('menuRoot') private readonly menuRoot?: ElementRef<HTMLElement>;

  internalLang: SupportedLanguage = LanguageEnumDto.En;
  menuOpen = false;

  readonly langOptions: Array<{label: string; value: SupportedLanguage}> = SUPPORTED_LANGUAGES.map((language) => ({
    label: this.languageLabel(language),
    value: language,
  }));

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['lang']) {
      this.internalLang = this.lang ?? LanguageEnumDto.En;
    }
  }

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  onInternalChange(value: SupportedLanguage): void {
    this.internalLang = value;
    this.menuOpen = false;
    this.langChange.emit(value);
  }

  @HostListener('document:click', ['$event'])
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
