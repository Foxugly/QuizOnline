import {CommonModule} from '@angular/common';
import {Component, computed, DestroyRef, effect, inject, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import {UiTextService} from '../../../shared/i18n/ui-text.service';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {catchError, finalize} from 'rxjs/operators';
import {EMPTY} from 'rxjs';
import {takeUntilDestroyed, toObservable} from '@angular/core/rxjs-interop';

import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';

import {DomainDetailDto} from '../../../api/generated/model/domain-detail';
import {DomainReadDto} from '../../../api/generated/model/domain-read';
import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {SubjectWriteRequestDto} from '../../../api/generated/model/subject-write-request';
import {DomainOption, DomainService} from '../../../services/domain/domain';
import {getLocalizedDomainName} from '../../../shared/i18n/domain-label';
import {SubjectService, SubjectLangGroup} from '../../../services/subject/subject';
import {isLangCode, LangCode, TranslateBatchItem, TranslationService} from '../../../services/translation/translation';
import {UserService} from '../../../services/user/user';
import {
  buildLocalizedTextRecord,
  createLocalizedTextGroup,
  getLocalizedTextGroup,
} from '../../../shared/forms/localized-text-form';
import {isEmptyRichText} from '../../../shared/html/is-empty-rich-text';
import {SubjectEditorFormComponent} from '../../../components/subject-editor-form/subject-editor-form';
import {AppToastService} from '../../../shared/toast/app-toast.service';
import {getSubjectCreateUiText} from './subject-create.i18n';


@Component({
  selector: 'app-subject-create',
  templateUrl: './subject-create.html',
  styleUrls: ['./subject-create.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    SubjectEditorFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubjectCreate implements OnInit {
  readonly ui = inject(UiTextService).editor;
  readonly pageText = inject(UiTextService).localized(getSubjectCreateUiText);
  readonly emptyLanguagesMessage = computed(() => this.pageText().emptyLanguagesMessage);

  // UI state
  loading = signal(false);
  error = signal<string | null>(null);

  translating = signal(false);
  submitError = signal<string | null>(null);

  readonly isLocked = computed(() => this.loading() || this.translating());


  // Domain list
  domains = signal<DomainReadDto[]>([]);
  selectedDomainId = signal<number>(0);

  // Languages (from selected domain)
  domainLangs = signal<LangCode[]>([]);
  activeLang = signal<LangCode | undefined>(undefined);

  // current UI language (for labels)
  currentLang = signal<LanguageEnumDto>(LanguageEnumDto.Fr);
  translateOverwrite = signal(false);
  domainOptions = computed<DomainOption[]>(() => {
    const lang = this.currentLang();
    return (this.domains() ?? []).map((d) => ({
      id: d.id,
      name: this.getDomainLabel(d, lang),
    }));
  });
  // Reactive form
  private fb = inject(NonNullableFormBuilder);
  form = this.fb.group({
    // domain stored here too (single source of truth for submit)
    domain: this.fb.control<number>(0, {validators: [Validators.required]}),
    translations: this.fb.group({}),
  });
  // deps
  private domainService = inject(DomainService);
  private subjectService = inject(SubjectService);
  private translator = inject(TranslationService);
  private userService = inject(UserService);
  private toast = inject(AppToastService);
  private destroyRef = inject(DestroyRef);
  private selectedDomainId$ = toObservable(this.selectedDomainId);
  private lastToastMessage: string | null = null;

  constructor() {
    // lock/unlock the form
    effect(() => {
      const locked = this.isLocked();
      if (locked) this.form.disable({emitEvent: false});
      else this.form.enable({emitEvent: false});
    });
    effect(() => {
      const detail = this.submitError() ?? this.error();
      if (!detail || detail === this.lastToastMessage) {
        return;
      }

      this.lastToastMessage = detail;
      // ``submitError`` / ``error`` are already populated with the
      // user-language string via ``pageText().toast.*`` — no need to
      // re-translate here.
      this.toast.add({
        severity: 'error',
        summary: this.ui().common.errorTitle,
        detail,
      });
    });
  }

  ngOnInit(): void {
    this.currentLang.set(this.userService.currentLang ?? LanguageEnumDto.Fr);

    // load domains
    this.loading.set(true);
    this.domainService
      .list()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (domains) => {
          this.domains.set(domains ?? []);

          const currentDomainId = this.userService.currentUser()?.current_domain ?? 0;
          if (currentDomainId > 0 && (domains ?? []).some((domain) => domain.id === currentDomainId)) {
            this.selectedDomainId.set(currentDomainId);
          }
        },
        error: (err) => {
          console.error(err);
          this.error.set(this.pageText().toast.loadDomainsFailed);
        },
      });

    // react: domain change => reset + load domain detail
    this.selectedDomainId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        this.resetDomainState();

        if (!id || id <= 0) return;

        this.form.controls.domain.setValue(id);
        this.loading.set(true);

        this.domainService
          .detail(id)
          .pipe(
            finalize(() => this.loading.set(false)),
            catchError((err) => {
              console.error(err);
              this.error.set(this.pageText().toast.loadDomainFailed);
              return EMPTY;
            }),
          )
          .subscribe((domain) => {
            const codes = this.extractLangCodes(domain);
            this.domainLangs.set(codes);

            this.ensureLanguageControls(codes);
            this.activeLang.set(this.resolvePreferredLang(codes));
          });
      });
  }

  // UI actions
  onDomainChange(value: number): void {
    this.selectedDomainId.set(value);
  }

  onTabChange(value: string | number | undefined): void {
    if (value === undefined || value === null) return;
    const code = String(value) as LangCode;
    if (!this.domainLangs().includes(code)) return;
    this.activeLang.set(code);
  }

  tabCodes(): LangCode[] {
    return this.domainLangs();
  }

  langGroup(code: string): FormGroup {
    return getLocalizedTextGroup(this.translationsGroup(), code);
  }

  async translateFrom(sourceLang: LangCode): Promise<void> {
    const codes = this.tabCodes();
    if (!codes.includes(sourceLang)) return;

    this.translating.set(true);
    this.submitError.set(null);

    try {
      const source = this.getTranslationGroup(sourceLang);
      const sourceName = source.controls.name.value ?? '';
      const sourceDesc = source.controls.description.value ?? '';

      const overwrite = this.translateOverwrite();

      for (const targetLang of codes) {
        if (targetLang === sourceLang) continue;

        const target = this.getTranslationGroup(targetLang);
        const nameCtrl = target.controls.name;
        const descCtrl = target.controls.description;

        const needName = overwrite || !(nameCtrl.value ?? '').trim();
        const needDesc = overwrite || isEmptyRichText(descCtrl.value ?? '');

        const items: TranslateBatchItem[] = [];
        if (needName) items.push({key: 'name', text: sourceName, format: 'text'});
        if (needDesc) items.push({key: 'description', text: sourceDesc, format: 'html'});

        if (!items.length) continue;

        const out = await this.translator.translateBatch(sourceLang, targetLang, items);

        if (needName && out['name'] !== undefined) {
          nameCtrl.setValue(out['name']);
          nameCtrl.markAsDirty();
        }
        if (needDesc && out['description'] !== undefined) {
          descCtrl.setValue(out['description']);
          descCtrl.markAsDirty();
        }
      }
    } catch (e) {
      console.error(e);
      this.submitError.set(this.pageText().toast.translationFailed);
    } finally {
      this.translating.set(false);
    }
  }

  async translateFromActiveTab(): Promise<void> {
    const src = this.activeLang();
    if (!src) return;
    await this.translateFrom(src);
  }

  submit(): void {
    this.error.set(null);
    this.submitError.set(null);

    if (!this.isValid()) {
      this.error.set(this.pageText().toast.nameRequired);
      return;
    }

    const payload = this.buildPayload();
    this.loading.set(true);

    this.subjectService
      .create(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: () => this.subjectService.goList(),
        error: (err) => {
          console.error(err);
          this.submitError.set(this.pageText().toast.createFailed);
        },
      });
  }

  protected goList(): void {
    this.subjectService.goList();
  }

  // ====== helpers ======

  private resetDomainState(): void {
    this.error.set(null);
    this.submitError.set(null);
    this.domainLangs.set([]);
    this.activeLang.set(undefined);

    // reset translations form group
    const tg = this.translationsGroup();
    Object.keys(tg.controls).forEach((key) => tg.removeControl(key));
  }

  private translationsGroup(): FormGroup {
    return this.form.get('translations') as FormGroup;
  }

  private ensureLanguageControls(codes: LangCode[]): void {
    const tg = this.translationsGroup();

    for (const code of codes) {
      if (!tg.contains(code)) {
        tg.addControl(code, createLocalizedTextGroup(this.fb, {nameMaxLength: 120}));
      }
    }
  }

  private getTranslationGroup(code: LangCode): SubjectLangGroup {
    return getLocalizedTextGroup(this.translationsGroup(), code) as SubjectLangGroup;
  }

  private isValid(): boolean {
    const domainId = this.form.controls.domain.value;
    if (!domainId || domainId <= 0) return false;

    const langs = this.domainLangs();
    if (langs.length === 0) return false;

    const tg = this.translationsGroup();
    return langs.every((l) => (tg.get(l) as SubjectLangGroup | null)?.valid === true);
  }

  private buildPayload(): SubjectWriteRequestDto {
    const domainId = this.form.controls.domain.value;
    const langs = this.domainLangs();
    const translations = buildLocalizedTextRecord(this.translationsGroup(), langs);

    return this.subjectService.buildWritePayload(domainId, translations);
  }

  private getDomainLabel(domain: Pick<DomainReadDto, 'id' | 'translations'>, lang: LanguageEnumDto): string {
    return getLocalizedDomainName(domain, lang);
  }

  private extractLangCodes(domain: Pick<DomainDetailDto, 'allowed_languages'>): LangCode[] {
    const codes = (domain.allowed_languages ?? [])
      .filter((language) => language.active)
      .map((language) => language.code)
      .filter(isLangCode);

    return codes.length ? codes : [LanguageEnumDto.Fr as LangCode];
  }

  private resolvePreferredLang(codes: LangCode[]): LangCode | undefined {
    const current = this.currentLang();
    return codes.includes(current as LangCode) ? current as LangCode : codes[0];
  }


}
