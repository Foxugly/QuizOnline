/**
 * i18n completeness check.
 *
 * For each i18n dictionary (shell, editor, and every page-scoped i18n module),
 * load the FR/EN/NL/IT/ES variants and compare them.
 *
 * Reports two kinds of issues:
 *   1. MISSING — a key present in one language but absent in another.
 *      This catches structural drift when a partial spread leaves an
 *      override block incomplete (TypeScript can't always catch this
 *      because the spread fills in the type).
 *   2. SAME-AS-EN — a value identical to the English version. Almost always
 *      means the translation is missing and the dictionary silently falls
 *      back to English. False positives (intentional duplicates like
 *      "Quiz", "Email", "FAQ") are allowed via i18n-allowed-same.json.
 *
 * Functions (e.g. `(n: number) => '...'`) are checked for presence only:
 * we cannot reasonably compare their output without knowing the signature.
 *
 * Exits with code 1 if any error is found.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

import {LanguageEnumDto} from '../src/app/api/generated/model/language-enum';
import {getUiText} from '../src/app/shared/i18n/ui-text';
import {getEditorUiText} from '../src/app/shared/i18n/editor-ui-text';

import {getAboutUiText} from '../src/app/pages/about/about.i18n';
import {getDomainCreateUiText} from '../src/app/pages/domain/create/domain-create.i18n';
import {getDomainEditUiText} from '../src/app/pages/domain/edit/domain-edit.i18n';
import {getDomainListUiText} from '../src/app/pages/domain/list/domain-list.i18n';
import {getDonateUiText} from '../src/app/pages/donate/donate.i18n';
import {getFeaturesUiText} from '../src/app/pages/features/features.i18n';
import {getInviteAcceptUiText} from '../src/app/pages/invite-accept/invite-accept.i18n';
import {getJoinRequestDecideUiText} from '../src/app/pages/join-request-decide/join-request-decide.i18n';
import {getQuestionImportUiText} from '../src/app/pages/question/import/question-import.i18n';
import {getQuestionListUiText} from '../src/app/pages/question/list/question-list.i18n';
import {getQuizAlertDetailUiText} from '../src/app/pages/quiz/alerts/detail/quiz-alert-detail.i18n';
import {getQuizCreateUiText} from '../src/app/pages/quiz/create/quiz-create.i18n';
import {getQuizListUiText} from '../src/app/pages/quiz/list/quiz-list.i18n';
import {getTransferAcceptUiText} from '../src/app/pages/transfer-accept/transfer-accept.i18n';
import {getSavedAtUiText} from '../src/app/shared/components/saved-at/saved-at.i18n';
import {getQuestionPreviewDialogUiText} from '../src/app/components/question-preview-dialog/question-preview-dialog.i18n';
import {getSubjectListUiText} from '../src/app/pages/subject/list/subject-list.i18n';
import {getPrivacyUiText} from '../src/app/pages/privacy/privacy.i18n';
import {getSubjectFormUiText} from '../src/app/pages/quiz/subject-form/subject-form.i18n';
import {getSubjectCreateUiText} from '../src/app/pages/subject/create/subject-create.i18n';
import {getCatalogUiText} from '../src/app/pages/catalog/catalog.i18n';
import {getCourseCreateUiText} from '../src/app/pages/course-create/course-create.i18n';
import {getCourseEditUiText} from '../src/app/pages/course-edit/course-edit.i18n';
import {getCourseListUiText} from '../src/app/pages/course-list/course-list.i18n';
import {getCourseEditInfoTabUiText} from '../src/app/pages/course-edit/tabs/info-tab/info-tab.i18n';
import {getCourseEditStructureTabUiText} from '../src/app/pages/course-edit/tabs/structure-tab/structure-tab.i18n';
import {getCourseEditAnalyticsTabUiText} from '../src/app/pages/course-edit/tabs/analytics-tab/analytics-tab.i18n';
import {getCourseInviteAcceptUiText} from '../src/app/pages/course-invite-accept/course-invite-accept.i18n';
import {getMyInvitationsUiText} from '../src/app/pages/my-invitations/my-invitations.i18n';
import {getLessonEditUiText} from '../src/app/pages/lesson-edit/lesson-edit.i18n';
import {getLessonViewUiText} from '../src/app/pages/lesson-view/lesson-view.i18n';
import {getDashboardUiText} from '../src/app/pages/dashboard/dashboard.i18n';
import {getBlockListEditorUiText} from '../src/app/shared/learning/block-list-editor/block-list-editor.i18n';
import {getLearningCommonUiText} from '../src/app/shared/learning/learning-common.i18n';
import {getLessonReaderUiText} from '../src/app/shared/learning/lesson-reader/lesson-reader.i18n';
import {getQuestionEditorFormUiText} from '../src/app/components/question-editor-form/question-editor-form.i18n';
import {getCertificateListUiText} from '../src/app/pages/certificate-list/certificate-list.i18n';
import {getCertificateViewUiText} from '../src/app/pages/certificate-view/certificate-view.i18n';
import {getCertificateVerifyUiText} from '../src/app/pages/certificate-verify/certificate-verify.i18n';
import {getCourseDetailUiText} from '../src/app/pages/course-detail/course-detail.i18n';
import {getCourseEditEnrollmentTabUiText} from '../src/app/pages/course-edit/tabs/enrollment-tab/enrollment-tab.i18n';
import {getBlockEditorsUiText} from '../src/app/shared/learning/block-editors/block-editors.i18n';
import {getBlockRenderersUiText} from '../src/app/shared/learning/block-renderers/block-renderers.i18n';
import {getProgressUiText} from '../src/app/pages/progress/progress.i18n';
import {getQuizAlertListUiText} from '../src/app/pages/quiz/alerts/list/quiz-alert-list.i18n';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ALLOWLIST_PATH = path.join(__dirname, 'i18n-allowed-same.json');

type Getter = (lang: LanguageEnumDto) => unknown;

const ENTRIES: Array<{name: string; get: Getter}> = [
  {name: 'shell/ui-text', get: getUiText as Getter},
  {name: 'editor-ui-text', get: getEditorUiText as Getter},
  {name: 'pages/about', get: getAboutUiText as Getter},
  {name: 'pages/domain/create', get: getDomainCreateUiText as Getter},
  {name: 'pages/domain/edit', get: getDomainEditUiText as Getter},
  {name: 'pages/domain/list', get: getDomainListUiText as Getter},
  {name: 'pages/donate', get: getDonateUiText as Getter},
  {name: 'pages/features', get: getFeaturesUiText as Getter},
  {name: 'pages/invite-accept', get: getInviteAcceptUiText as Getter},
  {name: 'pages/join-request-decide', get: getJoinRequestDecideUiText as Getter},
  {name: 'pages/question/import', get: getQuestionImportUiText as Getter},
  {name: 'pages/question/list', get: getQuestionListUiText as Getter},
  {name: 'pages/quiz/alerts/detail', get: getQuizAlertDetailUiText as Getter},
  {name: 'pages/quiz/create', get: getQuizCreateUiText as Getter},
  {name: 'pages/quiz/list', get: getQuizListUiText as Getter},
  {name: 'pages/transfer-accept', get: getTransferAcceptUiText as Getter},
  {name: 'shared/saved-at', get: getSavedAtUiText as Getter},
  {name: 'components/question-preview-dialog', get: getQuestionPreviewDialogUiText as Getter},
  {name: 'pages/subject/list', get: getSubjectListUiText as Getter},
  {name: 'pages/privacy', get: getPrivacyUiText as Getter},
  {name: 'pages/quiz/subject-form', get: getSubjectFormUiText as Getter},
  {name: 'pages/subject/create', get: getSubjectCreateUiText as Getter},
  {name: 'pages/catalog', get: getCatalogUiText as Getter},
  {name: 'pages/course-create', get: getCourseCreateUiText as Getter},
  {name: 'pages/course-edit', get: getCourseEditUiText as Getter},
  {name: 'pages/course-list', get: getCourseListUiText as Getter},
  {name: 'pages/course-edit/info-tab', get: getCourseEditInfoTabUiText as Getter},
  {name: 'pages/course-edit/structure-tab', get: getCourseEditStructureTabUiText as Getter},
  {name: 'pages/course-edit/analytics-tab', get: getCourseEditAnalyticsTabUiText as Getter},
  {name: 'pages/course-invite-accept', get: getCourseInviteAcceptUiText as Getter},
  {name: 'pages/my-invitations', get: getMyInvitationsUiText as Getter},
  {name: 'pages/lesson-edit', get: getLessonEditUiText as Getter},
  {name: 'pages/lesson-view', get: getLessonViewUiText as Getter},
  {name: 'pages/dashboard', get: getDashboardUiText as Getter},
  {name: 'shared/learning/block-list-editor', get: getBlockListEditorUiText as Getter},
  {name: 'shared/learning/learning-common', get: getLearningCommonUiText as Getter},
  {name: 'shared/learning/lesson-reader', get: getLessonReaderUiText as Getter},
  {name: 'components/question-editor-form', get: getQuestionEditorFormUiText as Getter},
  {name: 'pages/certificate-list', get: getCertificateListUiText as Getter},
  {name: 'pages/certificate-view', get: getCertificateViewUiText as Getter},
  {name: 'pages/certificate-verify', get: getCertificateVerifyUiText as Getter},
  {name: 'pages/course-detail', get: getCourseDetailUiText as Getter},
  {name: 'pages/course-edit/enrollment-tab', get: getCourseEditEnrollmentTabUiText as Getter},
  {name: 'shared/learning/block-editors', get: getBlockEditorsUiText as Getter},
  {name: 'shared/learning/block-renderers', get: getBlockRenderersUiText as Getter},
  {name: 'pages/progress', get: getProgressUiText as Getter},
  {name: 'pages/quiz/alerts/list', get: getQuizAlertListUiText as Getter},
];

const REFERENCE_LANG = LanguageEnumDto.En;
const OTHER_LANGS: LanguageEnumDto[] = [
  LanguageEnumDto.Fr,
  LanguageEnumDto.Nl,
  LanguageEnumDto.It,
  LanguageEnumDto.Es,
];

type Leaf = string | ((...args: unknown[]) => string) | number | boolean;
type Tree = {[key: string]: Tree | Leaf};

function flatten(node: unknown, prefix = ''): Map<string, Leaf> {
  const out = new Map<string, Leaf>();
  if (node === null || node === undefined) {
    return out;
  }
  if (typeof node !== 'object') {
    if (prefix) {
      out.set(prefix, node as Leaf);
    }
    return out;
  }
  for (const [key, value] of Object.entries(node as Tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') {
      for (const [k, v] of flatten(value, path).entries()) {
        out.set(k, v);
      }
    } else {
      out.set(path, value as Leaf);
    }
  }
  return out;
}

type Allowlist = {exact: Set<string>; patterns: RegExp[]};

function loadAllowlist(): Allowlist {
  if (!fs.existsSync(ALLOWLIST_PATH)) {
    return {exact: new Set(), patterns: []};
  }
  const raw = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf-8')) as string[];
  const exact = new Set<string>();
  const patterns: RegExp[] = [];
  for (const entry of raw) {
    if (entry.includes('*')) {
      // Glob-style: '*' → '.*'. Escape regex metachars first.
      const regex = new RegExp(
        '^' + entry.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$',
      );
      patterns.push(regex);
    } else {
      exact.add(entry);
    }
  }
  return {exact, patterns};
}

function isAllowed(fqp: string, allowlist: Allowlist): boolean {
  if (allowlist.exact.has(fqp)) {
    return true;
  }
  for (const pattern of allowlist.patterns) {
    if (pattern.test(fqp)) {
      return true;
    }
  }
  return false;
}

type Issue =
  | {kind: 'missing'; entry: string; lang: string; path: string}
  | {kind: 'extra'; entry: string; lang: string; path: string}
  | {kind: 'same-as-en'; entry: string; lang: string; path: string; value: string};

function diff(entry: {name: string; get: Getter}, allowlist: Allowlist): Issue[] {
  const reference = flatten(entry.get(REFERENCE_LANG));
  const issues: Issue[] = [];

  for (const lang of OTHER_LANGS) {
    const langDict = flatten(entry.get(lang));

    for (const refKey of reference.keys()) {
      if (!langDict.has(refKey)) {
        issues.push({kind: 'missing', entry: entry.name, lang, path: refKey});
      }
    }
    for (const langKey of langDict.keys()) {
      if (!reference.has(langKey)) {
        issues.push({kind: 'extra', entry: entry.name, lang, path: langKey});
      }
    }

    for (const [refKey, refValue] of reference.entries()) {
      const langValue = langDict.get(refKey);
      if (langValue === undefined) {
        continue;
      }
      // Only compare strings. Functions and other types are checked for
      // presence only — we cannot meaningfully invoke unknown signatures.
      if (typeof refValue === 'string' && typeof langValue === 'string'
          && refValue === langValue && refValue.trim() !== '') {
        const fqp = `${entry.name}:${refKey}`;
        if (!isAllowed(fqp, allowlist)) {
          issues.push({kind: 'same-as-en', entry: entry.name, lang, path: refKey, value: refValue});
        }
      }
    }
  }

  return issues;
}

function main(): number {
  const strict = process.argv.includes('--strict');
  const allowlist = loadAllowlist();
  const allIssues: Issue[] = [];
  for (const entry of ENTRIES) {
    allIssues.push(...diff(entry, allowlist));
  }

  const byKind = {
    missing: allIssues.filter((i) => i.kind === 'missing'),
    extra: allIssues.filter((i) => i.kind === 'extra'),
    sameAsEn: allIssues.filter((i) => i.kind === 'same-as-en'),
  };

  if (allIssues.length === 0) {
    console.log('✓ i18n complete across FR / EN / NL / IT / ES — no missing keys, no silent EN fallbacks.');
    return 0;
  }

  // Structural drift — always blocking. This catches the "added a key in EN
  // but forgot it in NL" case, which is the primary value of the check.
  if (byKind.missing.length > 0) {
    console.log(`\n✗ MISSING keys (key present in EN but absent in another language)`);
    for (const issue of byKind.missing) {
      console.log(`  ${issue.entry} [${issue.lang}] ${issue.path}`);
    }
  }
  if (byKind.extra.length > 0) {
    console.log(`\n✗ EXTRA keys (key present in another language but absent in EN)`);
    for (const issue of byKind.extra) {
      console.log(`  ${issue.entry} [${issue.lang}] ${issue.path}`);
    }
  }
  // Value-level drift — informational by default, blocking with --strict.
  if (byKind.sameAsEn.length > 0) {
    const header = strict
      ? '✗ SAME-AS-EN values (probably untranslated — add to i18n-allowed-same.json if intentional)'
      : '! SAME-AS-EN values (probably untranslated — non-blocking; pass --strict to fail on these)';
    console.log(`\n${header}`);
    for (const issue of byKind.sameAsEn) {
      const truncated = (issue as Extract<Issue, {kind: 'same-as-en'}>).value.slice(0, 80);
      console.log(`  ${issue.entry} [${issue.lang}] ${issue.path} = "${truncated}"`);
    }
  }

  console.log(
    `\nTotal: ${allIssues.length} issue(s) — ${byKind.missing.length} missing, ${byKind.extra.length} extra, ${byKind.sameAsEn.length} same-as-en.`,
  );

  const structuralFailure = byKind.missing.length > 0 || byKind.extra.length > 0;
  const valueFailure = strict && byKind.sameAsEn.length > 0;
  return structuralFailure || valueFailure ? 1 : 0;
}

process.exit(main());
