import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild} from '@angular/core';
import {ButtonModule} from 'primeng/button';
import {Menu} from 'primeng/menu';
import {MenuItem} from 'primeng/api';
import {LanguageEnum} from '../../api/generated';
import {SUPPORTED_LANGUAGES, SupportedLanguage} from '../../../environments/language';

@Component({
  selector: 'app-lang-select',
  standalone: true,
  imports: [ButtonModule, Menu],
  templateUrl: './lang-select.html',
  styleUrl: './lang-select.scss',
})
export class LangSelectComponent implements OnChanges {
  @Input() lang!: SupportedLanguage;
  @Output() langChange = new EventEmitter<SupportedLanguage>();
  @ViewChild('langMenu') private readonly langMenu?: Menu;

  internalLang: SupportedLanguage = LanguageEnum.En;

  readonly langOptions: Array<{label: string; value: SupportedLanguage}> = SUPPORTED_LANGUAGES.map((language) => ({
    label: this.languageLabel(language),
    value: language,
  }));

  get menuItems(): MenuItem[] {
    return this.langOptions.map((option) => ({
      label: option.label,
      command: () => this.onInternalChange(option.value),
    }));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['lang']) {
      this.internalLang = this.lang ?? LanguageEnum.En;
    }
  }

  toggleMenu(event: Event): void {
    this.langMenu?.toggle(event);
  }

  onInternalChange(value: SupportedLanguage): void {
    this.internalLang = value;
    this.langChange.emit(value);
  }

  private languageLabel(language: SupportedLanguage): string {
    switch (language) {
      case LanguageEnum.Fr:
        return 'FR';
      case LanguageEnum.Nl:
        return 'NL';
      case LanguageEnum.It:
        return 'IT';
      case LanguageEnum.Es:
        return 'ES';
      case LanguageEnum.En:
      default:
        return 'EN';
    }
  }
}
