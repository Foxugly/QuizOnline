import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  HostListener,
  input,
  output,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
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
  @ViewChildren('menuitem') private readonly menuItems?: QueryList<ElementRef<HTMLButtonElement>>;

  internalLang: SupportedLanguage = LanguageEnumDto.En;
  menuOpen = false;
  focusedIndex: number | null = null;

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
    if (this.menuOpen) {
      const idx = this.langOptions.findIndex((o) => o.value === this.internalLang);
      this.focusedIndex = idx >= 0 ? idx : 0;
      queueMicrotask(() => this.focusCurrent());
    } else {
      this.focusedIndex = null;
    }
  }

  onInternalChange(value: SupportedLanguage): void {
    this.internalLang = value;
    this.menuOpen = false;
    this.focusedIndex = null;
    this.langChange.emit(value);
  }

  closeMenu(event: Event): void {
    const root = this.menuRoot?.nativeElement;
    if (!root || root.contains(event.target as Node)) {
      return;
    }
    this.menuOpen = false;
    this.focusedIndex = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpen = false;
    this.focusedIndex = null;
  }

  @HostListener('keydown.arrowdown', ['$event'])
  onArrowDown(event: Event): void {
    if (!this.menuOpen) return;
    event.preventDefault();
    this.focusedIndex = ((this.focusedIndex ?? -1) + 1) % this.langOptions.length;
    this.focusCurrent();
  }

  @HostListener('keydown.arrowup', ['$event'])
  onArrowUp(event: Event): void {
    if (!this.menuOpen) return;
    event.preventDefault();
    const len = this.langOptions.length;
    this.focusedIndex = ((this.focusedIndex ?? 0) - 1 + len) % len;
    this.focusCurrent();
  }

  @HostListener('keydown.home', ['$event'])
  onHome(event: Event): void {
    if (!this.menuOpen) return;
    event.preventDefault();
    this.focusedIndex = 0;
    this.focusCurrent();
  }

  @HostListener('keydown.end', ['$event'])
  onEnd(event: Event): void {
    if (!this.menuOpen) return;
    event.preventDefault();
    this.focusedIndex = this.langOptions.length - 1;
    this.focusCurrent();
  }

  private focusCurrent(): void {
    if (this.focusedIndex == null) return;
    this.menuItems?.get(this.focusedIndex)?.nativeElement.focus();
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
