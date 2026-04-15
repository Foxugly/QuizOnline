import {CommonModule} from '@angular/common';
import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {firstValueFrom} from 'rxjs';

import {ButtonModule} from 'primeng/button';
import {CardModule} from 'primeng/card';
import {FileUploadModule} from 'primeng/fileupload';

import {LanguageEnumDto} from '../../../api/generated/model/language-enum';
import {
  QuestionService,
  StructuredQuestionImportFile,
  StructuredQuestionImportResult,
} from '../../../services/question/question';
import {AppToastService} from '../../../shared/toast/app-toast.service';
import {UserService} from '../../../services/user/user';
import {getQuestionImportUiText, QuestionImportUiText} from './question-import.i18n';

@Component({
  standalone: true,
  selector: 'app-question-import',
  templateUrl: './question-import.html',
  styleUrl: './question-import.scss',
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    FileUploadModule,
  ],
})
export class QuestionImport implements OnInit {
  readonly text = computed<QuestionImportUiText>(() => getQuestionImportUiText(this.currentLang()));
  readonly hasValidFile = computed(
    () => this.validationErrors().length === 0 && (this.importFile() !== null || this.importFileRaw() !== null),
  );

  importing = signal(false);
  selectedFileName = signal<string | null>(null);
  importFile = signal<StructuredQuestionImportFile | null>(null);
  importFileRaw = signal<File | null>(null);
  validationErrors = signal<string[]>([]);

  private questionService = inject(QuestionService);
  private userService = inject(UserService);
  private toast = inject(AppToastService);
  private currentLang = signal<LanguageEnumDto>(LanguageEnumDto.En);

  ngOnInit(): void {
    this.currentLang.set(this.userService.currentLang ?? LanguageEnumDto.En);
  }

  goBack(): void {
    this.questionService.goList();
  }

  cancel(): void {
    this.questionService.goList();
  }

  async onFileSelected(event: { files?: File[] }): Promise<void> {
    const file = event.files?.[0];
    if (!file) {
      return;
    }

    this.selectedFileName.set(file.name);
    this.importFile.set(null);
    this.importFileRaw.set(null);
    this.validationErrors.set([]);

    if (file.name.toLowerCase().endsWith('.zip')) {
      // ZIP file: skip client-side validation, server will validate
      this.importFileRaw.set(file);
      this.showToast('success', this.text().formatValid, this.text().zipFileReady);
      return;
    }

    try {
      const content = await file.text();
      const raw = JSON.parse(content) as unknown;
      const {file: importFile, errors} = this.parseImportFile(raw);

      this.importFile.set(importFile);
      this.validationErrors.set(errors);

      if (errors.length === 0) {
        this.showToast('success', this.text().formatValid, this.text().fileValidated(importFile?.questions.length ?? 0));
      } else {
        this.showToast('error', this.text().formatInvalid, errors[0]);
      }
    } catch {
      this.importFile.set(null);
      this.validationErrors.set([this.text().invalidJson]);
      this.showToast('error', this.text().formatInvalid, this.text().invalidJson);
    }
  }

  clearSelection(): void {
    this.selectedFileName.set(null);
    this.importFile.set(null);
    this.importFileRaw.set(null);
    this.validationErrors.set([]);
  }

  downloadExample(): void {
    const blob = new Blob([JSON.stringify(this.buildExampleFile(), null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'question-import-example.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async importQuestions(): Promise<void> {
    if (!this.hasValidFile() || this.importing()) {
      return;
    }

    this.importing.set(true);

    try {
      let result: StructuredQuestionImportResult;

      const rawFile = this.importFileRaw();
      if (rawFile) {
        result = await firstValueFrom(this.questionService.importStructuredFormData(rawFile));
      } else {
        result = await firstValueFrom(this.questionService.importStructured(this.importFile()!));
      }

      const successCount = this.getImportedQuestionCount(result);
      this.showToast('success', this.text().importDone, this.text().importSuccess(successCount));
      this.questionService.goList();
    } finally {
      this.importing.set(false);
    }
  }

  private parseImportFile(raw: unknown): { file: StructuredQuestionImportFile | null; errors: string[] } {
    const errors: string[] = [];

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {file: null, errors: [this.text().rootObjectError]};
    }

    const payload = raw as Partial<StructuredQuestionImportFile>;
    if (payload.version !== '1.0') {
      errors.push(this.text().versionError);
    }
    if (!payload.domain || typeof payload.domain !== 'object' || Array.isArray(payload.domain)) {
      errors.push(this.text().domainObjectError);
    }
    if (!Array.isArray(payload.subjects)) {
      errors.push(this.text().subjectsArrayError);
    }
    if (!Array.isArray(payload.questions)) {
      errors.push(this.text().questionsArrayError);
    }
    if (errors.length > 0) {
      return {file: null, errors};
    }

    const domain = this.normalizeDomain(payload.domain!, errors);
    const subjects = this.normalizeSubjects(payload.subjects!, errors);
    const questions = this.normalizeQuestions(payload.questions!, errors, subjects);

    return {
      file: errors.length === 0 && domain
        ? {
          version: '1.0',
          domain,
          subjects,
          questions,
        }
        : null,
      errors,
    };
  }

  private normalizeDomain(
    domain: StructuredQuestionImportFile['domain'],
    errors: string[],
  ): StructuredQuestionImportFile['domain'] | null {
    if (!Number.isInteger(domain.id) || domain.id <= 0) {
      errors.push(this.text().domainIdError);
    }
    if (!domain.translations || typeof domain.translations !== 'object' || Array.isArray(domain.translations)) {
      errors.push(this.text().domainTranslationsError);
    }

    return errors.length === 0 ? {
      id: domain.id,
      hash: typeof domain.hash === 'string' ? domain.hash : undefined,
      translations: domain.translations,
    } : null;
  }

  private normalizeSubjects(
    subjects: StructuredQuestionImportFile['subjects'],
    errors: string[],
  ): StructuredQuestionImportFile['subjects'] {
    return subjects.filter((subject, index) => {
      const itemNumber = index + 1;
      const valid =
        Number.isInteger(subject?.id) &&
        subject.id > 0 &&
        !!subject.translations &&
        typeof subject.translations === 'object' &&
        !Array.isArray(subject.translations);
      if (!valid) {
        errors.push(this.text().subjectObjectError(itemNumber));
      }
      return valid;
    }).map((subject) => ({
      id: subject.id,
      hash: typeof subject.hash === 'string' ? subject.hash : undefined,
      translations: subject.translations,
    }));
  }

  private normalizeQuestions(
    questions: StructuredQuestionImportFile['questions'],
    errors: string[],
    subjects: StructuredQuestionImportFile['subjects'],
  ): StructuredQuestionImportFile['questions'] {
    const knownSubjectIds = new Set(subjects.map((subject) => subject.id));
    return questions.filter((question, index) => {
      const itemNumber = index + 1;
      const valid =
        !!question &&
        typeof question === 'object' &&
        Number.isInteger(question.domain_id) &&
        question.domain_id > 0 &&
        Array.isArray(question.subject_ids) &&
        Array.isArray(question.answer_options) &&
        !!question.translations &&
        typeof question.translations === 'object' &&
        !Array.isArray(question.translations);
      if (!valid) {
        errors.push(this.text().questionObjectError(itemNumber));
        return false;
      }
      if (question.answer_options.length < 2) {
        errors.push(this.text().questionAnswersError(itemNumber));
        return false;
      }
      if (question.subject_ids.some((subjectId) => !knownSubjectIds.has(subjectId))) {
        errors.push(this.text().questionSubjectsReferenceError(itemNumber));
        return false;
      }
      if (!question.answer_options.some((answer) => !!answer.is_correct)) {
        errors.push(this.text().questionCorrectAnswerError(itemNumber));
        return false;
      }
      return true;
    }).map((question, index) => ({
      id: question.id,
      domain_id: question.domain_id,
      subject_ids: question.subject_ids,
      active: question.active ?? true,
      allow_multiple_correct: !!question.allow_multiple_correct,
      is_mode_practice: !!question.is_mode_practice,
      is_mode_exam: !!question.is_mode_exam,
      translations: question.translations,
      answer_options: question.answer_options.map((answer, answerIndex) => ({
        id: answer.id,
        is_correct: !!answer.is_correct,
        sort_order: Number.isInteger(answer.sort_order) ? answer.sort_order : answerIndex + 1,
        translations: answer.translations,
      })),
    }));
  }

  private buildExampleFile(): StructuredQuestionImportFile {
    return {
      version: '1.0',
      domain: {
        id: 1,
        hash: 'replace-with-domain-hash-if-known',
        translations: {
          fr: {
            name: 'Geographie',
            description: 'Questions de geographie',
          },
          en: {
            name: 'Geography',
            description: 'Geography questions',
          },
        },
      },
      subjects: [
        {
          id: 2,
          hash: 'replace-with-subject-hash-if-known',
          translations: {
            fr: {name: 'Capitales'},
            en: {name: 'Capitals'},
          },
        },
      ],
      questions: [
        {
          id: 100,
          domain_id: 1,
          subject_ids: [2],
          allow_multiple_correct: false,
          active: true,
          is_mode_practice: true,
          is_mode_exam: false,
          translations: {
            fr: {
              title: 'Capitale de la Belgique',
              description: '<p>Choisis la bonne reponse.</p>',
              explanation: '<p>Bruxelles est la capitale de la Belgique.</p>',
            },
            en: {
              title: 'Capital of Belgium',
              description: '<p>Choose the correct answer.</p>',
              explanation: '<p>Brussels is the capital of Belgium.</p>',
            },
          },
          answer_options: [
            {
              id: 1001,
              is_correct: true,
              sort_order: 1,
              translations: {
                fr: {content: '<p>Bruxelles</p>'},
                en: {content: '<p>Brussels</p>'},
              },
            },
            {
              id: 1002,
              is_correct: false,
              sort_order: 2,
              translations: {
                fr: {content: '<p>Anvers</p>'},
                en: {content: '<p>Antwerp</p>'},
              },
            },
          ],
        },
      ],
    };
  }

  private getImportedQuestionCount(result: StructuredQuestionImportResult): number {
    return (result.questions_created ?? 0) + (result.questions_updated ?? 0);
  }

  private showToast(severity: 'success' | 'error' | 'warn', summary: string, detail: string): void {
    this.toast.add({
      severity,
      summary,
      detail,
    });
  }

}
