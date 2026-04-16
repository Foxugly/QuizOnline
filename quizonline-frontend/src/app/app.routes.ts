import {Routes} from '@angular/router';

import {adminGuard} from './guards/admin.guard';
import {authGuard} from './guards/auth.guard';
import {domainAccessGuard} from './guards/domain-access.guard';
import {superuserGuard} from './guards/superuser.guard';

export const routes: Routes = [
  {path: '', redirectTo: 'home', pathMatch: 'full'},
  {path: 'login', loadComponent: () => import('./pages/auth/login/login').then((m) => m.LoginPage)},
  {path: 'home', loadComponent: () => import('./pages/home/home').then((m) => m.Home)},
  {path: 'donate', loadComponent: () => import('./pages/donate/donate').then((m) => m.Donate)},
  {path: 'about', loadComponent: () => import('./pages/about/about').then((m) => m.About)},
  {
    path: 'preferences',
    loadComponent: () => import('./pages/auth/preferences/preferences').then((m) => m.Preferences),
    canActivate: [authGuard],
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./pages/auth/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'user/reset-password/:uid/:token',
    loadComponent: () => import('./pages/auth/reset-password-confirm/reset-password-confirm').then((m) => m.ResetPasswordConfirmPage),
  },
  {
    path: 'user/confirm-email/:uid/:token',
    loadComponent: () => import('./pages/auth/confirm-email/confirm-email').then((m) => m.ConfirmEmailPage),
  },
  {
    path: 'change-password',
    loadComponent: () => import('./pages/auth/change-password/change-password').then((m) => m.ChangePasswordPage),
    canActivate: [authGuard],
  },
  {path: 'register', loadComponent: () => import('./pages/auth/register/register').then((m) => m.Register)},
  {path: 'register/confirmation', loadComponent: () => import('./pages/auth/register-pending/register-pending').then((m) => m.RegisterPendingPage)},
  {
    path: 'domain/list',
    loadComponent: () => import('./pages/domain/list/domain-list').then((m) => m.DomainList),
    canActivate: [authGuard, domainAccessGuard],
  },
  {
    path: 'domain/add',
    loadComponent: () => import('./pages/domain/create/domain-create').then((m) => m.DomainCreate),
    canActivate: [authGuard, domainAccessGuard],
  },
  {
    path: 'domain/:id/edit',
    loadComponent: () => import('./pages/domain/edit/domain-edit').then((m) => m.DomainEdit),
    canActivate: [authGuard, domainAccessGuard],
  },
  {
    path: 'domain/:id/delete',
    loadComponent: () => import('./pages/domain/delete/domain-delete').then((m) => m.DomainDelete),
    canActivate: [authGuard, domainAccessGuard],
  },
  {
    path: 'user/list',
    loadComponent: () => import('./pages/user/list/user-list').then((m) => m.UserListPage),
    canActivate: [authGuard, superuserGuard],
  },
  {
    path: 'user/add',
    loadComponent: () => import('./pages/user/create/user-create').then((m) => m.UserCreatePage),
    canActivate: [authGuard, superuserGuard],
  },
  {
    path: 'user/:id/edit',
    loadComponent: () => import('./pages/user/edit/user-edit').then((m) => m.UserEditPage),
    canActivate: [authGuard, superuserGuard],
  },
  {
    path: 'user/:id/delete',
    loadComponent: () => import('./pages/user/delete/user-delete').then((m) => m.UserDeletePage),
    canActivate: [authGuard, superuserGuard],
  },
  {
    path: 'subject/list',
    loadComponent: () => import('./pages/subject/list/subject-list').then((m) => m.SubjectList),
    canActivate: [authGuard, domainAccessGuard],
  },
  {
    path: 'subject/add',
    loadComponent: () => import('./pages/subject/create/subject-create').then((m) => m.SubjectCreate),
    canActivate: [authGuard, domainAccessGuard],
  },
  {
    path: 'subject/:id/edit',
    loadComponent: () => import('./pages/subject/edit/subject-edit').then((m) => m.SubjectEdit),
    canActivate: [authGuard, domainAccessGuard],
  },
  {
    path: 'subject/:id/delete',
    loadComponent: () => import('./pages/subject/delete/subject-delete').then((m) => m.SubjectDelete),
    canActivate: [authGuard, domainAccessGuard],
  },
  {
    path: 'question/list',
    loadComponent: () => import('./pages/question/list/question-list').then((m) => m.QuestionList),
    canActivate: [authGuard, domainAccessGuard],
  },
  {
    path: 'question/add',
    loadComponent: () => import('./pages/question/create/question-create').then((m) => m.QuestionCreate),
    canActivate: [authGuard, domainAccessGuard],
  },
  {
    path: 'question/import',
    loadComponent: () => import('./pages/question/import/question-import').then((m) => m.QuestionImport),
    canActivate: [authGuard, domainAccessGuard],
  },
  {
    path: 'question/:questionId/edit',
    loadComponent: () => import('./pages/question/edit/question-edit').then((m) => m.QuestionEdit),
    canActivate: [authGuard, domainAccessGuard],
  },
  {
    path: 'question/:questionId/delete',
    loadComponent: () => import('./pages/question/delete/question-delete').then((m) => m.QuestionDelete),
    canActivate: [authGuard, domainAccessGuard],
  },
  {
    path: 'question/:questionId/view',
    loadComponent: () => import('./pages/question/view/question-view').then((m) => m.QuestionView),
    canActivate: [authGuard, domainAccessGuard],
  },
  {
    path: 'quiz/add',
    loadComponent: () => import('./pages/quiz/create/quiz-create').then((m) => m.QuizCreate),
    canActivate: [authGuard, domainAccessGuard],
  },
  {
    path: 'quiz/template/:templateId/edit',
    loadComponent: () => import('./pages/quiz/create/quiz-create').then((m) => m.QuizCreate),
    canActivate: [authGuard, domainAccessGuard],
  },
  {
    path: 'quiz/template/:templateId/delete',
    loadComponent: () => import('./pages/quiz/delete/quiz-template-delete').then((m) => m.QuizTemplateDelete),
    canActivate: [authGuard, domainAccessGuard],
  },
  {
    path: 'quiz/template/:templateId/results',
    loadComponent: () => import('./pages/quiz/template-results/quiz-template-results').then((m) => m.QuizTemplateResultsPage),
    canActivate: [authGuard],
  },
  {
    path: 'quiz/:quizId/delete/:templateId',
    loadComponent: () => import('./pages/quiz/delete/quiz-session-delete').then((m) => m.QuizSessionDeletePage),
    canActivate: [authGuard, domainAccessGuard],
  },
  {
    path: 'quiz/:quizId/delete',
    loadComponent: () => import('./pages/quiz/delete/quiz-session-delete').then((m) => m.QuizSessionDeletePage),
    canActivate: [authGuard, domainAccessGuard],
  },
  {
    path: 'quiz/list',
    loadComponent: () => import('./pages/quiz/list/quiz-list').then((m) => m.QuizListPage),
    canActivate: [authGuard],
  },
  {
    path: 'quiz/quick',
    loadComponent: () => import('./pages/quiz/quick/quiz-quick').then((m) => m.QuizQuickPage),
    canActivate: [authGuard],
  },
  {
    path: 'messages',
    loadComponent: () => import('./pages/quiz/alerts/list/quiz-alert-list').then((m) => m.QuizAlertList),
    canActivate: [authGuard],
  },
  {
    path: 'messages/:alertId',
    loadComponent: () => import('./pages/quiz/alerts/detail/quiz-alert-detail').then((m) => m.QuizAlertDetail),
    canActivate: [authGuard],
  },
  {
    path: 'quiz/:id',
    loadComponent: () => import('./pages/quiz/view/quiz-view').then((m) => m.QuizView),
    canActivate: [authGuard],
  },
  {
    path: 'quiz/:quiz_id/questions',
    loadComponent: () => import('./pages/quiz/question-view/question-view').then((m) => m.QuizQuestionView),
    canActivate: [authGuard],
  },
  {path: 'quiz/test', loadComponent: () => import('./components/quiz-play/quiz-play').then((m) => m.QuizPlayComponent)},
  {
    path: 'admin/stats',
    loadComponent: () => import('./pages/admin/stats/stats-dashboard').then((m) => m.StatsDashboardPage),
    canActivate: [authGuard, superuserGuard],
  },
  {
    path: 'admin/system-config',
    loadComponent: () => import('./pages/admin/system-config/system-config').then((m) => m.SystemConfigPage),
    canActivate: [authGuard, superuserGuard],
  },
  {
    path: 'admin/languages',
    loadComponent: () => import('./pages/admin/languages/language-management').then((m) => m.LanguageManagementPage),
    canActivate: [authGuard, superuserGuard],
  },
  {
    path: 'admin/mail-test',
    loadComponent: () => import('./pages/admin/mail-test/mail-test').then((m) => m.MailTestPage),
    canActivate: [authGuard, superuserGuard],
  },
  {
    path: 'domain/:domainId/join-requests',
    loadComponent: () => import('./pages/domain/join-requests/domain-join-requests').then((m) => m.DomainJoinRequestsPage),
    canActivate: [authGuard, domainAccessGuard],
  },
];
