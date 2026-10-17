import {inject} from '@angular/core';
import {Routes} from '@angular/router';

import {authGuard} from './guards/auth.guard';
import {domainAccessGuard} from './guards/domain-access.guard';
import {superuserGuard} from './guards/superuser.guard';
import {unsavedChangesGuard} from './pages/course-edit/unsaved-changes.guard';
import {MainLayoutComponent} from './core/layout/main-layout/main-layout';
import {PublicLayoutComponent} from './core/layout/public-layout/public-layout';
import {AuthService} from './services/auth/auth';

export const routes: Routes = [
  // Signed-in visitors land on their dashboard; anonymous visitors on the
  // marketing home. Function redirect runs in an injection context.
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () => (inject(AuthService).isLoggedIn() ? 'dashboard' : 'home'),
  },

  // ----------------------------------------------------------------------
  // Authenticated shell. Wraps the guarded application routes. The parent
  // carries no guard of its own — each child keeps the exact guards it had
  // when these routes lived in a flat list, so matching/redirect behaviour is
  // unchanged. Listed first: its param routes (e.g. ``user/:id/edit``) then win
  // for their own URLs, and public URLs backtrack to the public shell below.
  // ----------------------------------------------------------------------
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        // Unified post-login hub: LMS courses + certificates + quizzes + catalog.
        path: 'dashboard',
        data: {titleKey: 'ui.topmenu.dashboard'},
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardPage),
        canActivate: [authGuard],
      },
      {
        path: 'preferences',
        data: {titleKey: 'ui.topmenu.preferences'},
        loadComponent: () => import('./pages/auth/preferences/preferences').then((m) => m.Preferences),
        canActivate: [authGuard],
      },
      {
        path: 'notifications',
        data: {titleKey: 'ui.notifications.pageTitle'},
        loadComponent: () => import('./pages/notifications/notifications').then((m) => m.NotificationsPage),
        canActivate: [authGuard],
      },
      {
        path: 'change-password',
        data: {titleKey: 'ui.changePassword.title'},
        loadComponent: () => import('./pages/auth/change-password/change-password').then((m) => m.ChangePasswordPage),
        canActivate: [authGuard],
      },
      {
        path: 'domain/list',
        data: {titleKey: 'pages.domainList.title'},
        loadComponent: () => import('./pages/domain/list/domain-list').then((m) => m.DomainList),
        canActivate: [authGuard, domainAccessGuard],
      },
      {
        path: 'domain/add',
        data: {titleKey: 'editor.pages.domainCreate.title'},
        loadComponent: () => import('./pages/domain/create/domain-create').then((m) => m.DomainCreate),
        canActivate: [authGuard, domainAccessGuard],
      },
      {
        path: 'domain/:id/subscription',
        loadComponent: () => import('./pages/domain/subscription/domain-subscription').then((m) => m.DomainSubscription),
        canActivate: [authGuard, domainAccessGuard],
      },
      {
        path: 'domain/:id/edit',
        data: {titleKey: 'editor.pages.domainEdit.title'},
        loadComponent: () => import('./pages/domain/edit/domain-edit').then((m) => m.DomainEdit),
        canActivate: [authGuard, domainAccessGuard],
      },
      {
        path: 'domain/:id/delete',
        data: {titleKey: 'editor.pages.deletePage.domainTitle'},
        loadComponent: () => import('./pages/domain/delete/domain-delete').then((m) => m.DomainDelete),
        canActivate: [authGuard, domainAccessGuard],
      },
      {
        path: 'user/list',
        data: {titleKey: 'ui.topmenu.users'},
        loadComponent: () => import('./pages/user/list/user-list').then((m) => m.UserListPage),
        canActivate: [authGuard, superuserGuard],
      },
      {
        path: 'user/add',
        data: {titleKey: 'editor.pages.userCreate.title'},
        loadComponent: () => import('./pages/user/create/user-create').then((m) => m.UserCreatePage),
        canActivate: [authGuard, superuserGuard],
      },
      {
        path: 'user/:id/edit',
        data: {titleKey: 'editor.pages.userEdit.title'},
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
        data: {titleKey: 'pages.subjectList.title'},
        loadComponent: () => import('./pages/subject/list/subject-list').then((m) => m.SubjectList),
        canActivate: [authGuard, domainAccessGuard],
      },
      {
        path: 'subject/add',
        data: {titleKey: 'pages.subjectCreate.title'},
        loadComponent: () => import('./pages/subject/create/subject-create').then((m) => m.SubjectCreate),
        canActivate: [authGuard, domainAccessGuard],
      },
      {
        path: 'subject/:id/edit',
        data: {titleKey: 'editor.pages.subjectEdit.title'},
        loadComponent: () => import('./pages/subject/edit/subject-edit').then((m) => m.SubjectEdit),
        canActivate: [authGuard, domainAccessGuard],
      },
      {
        path: 'subject/:id/delete',
        data: {titleKey: 'editor.pages.deletePage.subjectTitle'},
        loadComponent: () => import('./pages/subject/delete/subject-delete').then((m) => m.SubjectDelete),
        canActivate: [authGuard, domainAccessGuard],
      },
      {
        path: 'question/list',
        data: {titleKey: 'pages.questionList.title'},
        loadComponent: () => import('./pages/question/list/question-list').then((m) => m.QuestionList),
        canActivate: [authGuard, domainAccessGuard],
      },
      {
        path: 'question/add',
        data: {titleKey: 'editor.pages.questionCreate.title'},
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
        data: {titleKey: 'editor.pages.questionEdit.title'},
        loadComponent: () => import('./pages/question/edit/question-edit').then((m) => m.QuestionEdit),
        canActivate: [authGuard, domainAccessGuard],
      },
      {
        path: 'question/:questionId/delete',
        data: {titleKey: 'editor.pages.deletePage.questionTitle'},
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
        data: {titleKey: 'pages.quizCreate.createTitle'},
        loadComponent: () => import('./pages/quiz/create/quiz-create').then((m) => m.QuizCreate),
        canActivate: [authGuard, domainAccessGuard],
      },
      {
        path: 'quiz/template/:templateId/edit',
        data: {titleKey: 'pages.quizCreate.editTitle'},
        loadComponent: () => import('./pages/quiz/create/quiz-create').then((m) => m.QuizCreate),
        canActivate: [authGuard, domainAccessGuard],
      },
      {
        path: 'quiz/template/:templateId/delete',
        data: {titleKey: 'editor.pages.deletePage.quizTemplateTitle'},
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
        data: {titleKey: 'ui.topmenu.quiz'},
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
        path: 'admin/connections',
        loadComponent: () => import('./pages/admin/connections/connections').then((m) => m.ConnectionsPage),
        canActivate: [authGuard, superuserGuard],
      },
      {
        path: 'domain/:domainId/join-requests',
        loadComponent: () => import('./pages/domain/join-requests/domain-join-requests').then((m) => m.DomainJoinRequestsPage),
        canActivate: [authGuard, domainAccessGuard],
      },
      {
        path: 'join-request/decide/:token',
        loadComponent: () => import('./pages/join-request-decide/join-request-decide').then((m) => m.JoinRequestDecidePage),
        canActivate: [authGuard],
      },
      {
        path: 'catalog',
        data: {titleKey: 'pages.catalog.pageTitle'},
        loadComponent: () => import('./pages/catalog/catalog').then((m) => m.Catalog),
        canActivate: [authGuard],
      },
      {
        // Must come BEFORE ``course/:slug`` — otherwise the router would
        // parse ``list`` / ``new`` as a slug and dispatch to course-detail.
        path: 'course/list',
        data: {titleKey: 'pages.courseList.title'},
        loadComponent: () => import('./pages/course-list/course-list').then((m) => m.CourseList),
        canActivate: [authGuard, domainAccessGuard],
      },
      {
        // Must come BEFORE ``course/:slug`` — otherwise the router would
        // parse ``new`` as a slug and dispatch to the course-detail page.
        path: 'course/new',
        data: {titleKey: 'pages.courseCreate.pageTitle'},
        loadComponent: () => import('./pages/course-create/course-create').then((m) => m.CourseCreate),
        canActivate: [authGuard, domainAccessGuard],
      },
      {
        path: 'course/:slug',
        loadComponent: () => import('./pages/course-detail/course-detail').then((m) => m.CourseDetail),
        canActivate: [authGuard],
      },
      {
        path: 'course/:id/edit',
        data: {titleKey: 'pages.courseEdit.pageTitle'},
        loadComponent: () => import('./pages/course-edit/course-edit').then((m) => m.CourseEdit),
        canActivate: [authGuard, domainAccessGuard],
        canDeactivate: [unsavedChangesGuard],
        // Re-run the guard on ``?tab=`` / ``?lesson=`` changes too, so browser
        // back / forward over unsaved block edits prompts like an in-app click.
        runGuardsAndResolvers: 'paramsOrQueryParamsChange',
      },
      {
        path: 'lesson/:id',
        loadComponent: () => import('./pages/lesson-view/lesson-view').then((m) => m.LessonView),
        canActivate: [authGuard],
      },
      {
        path: 'lesson/:id/edit',
        loadComponent: () => import('./pages/lesson-edit/lesson-edit').then((m) => m.LessonEdit),
        canActivate: [authGuard, domainAccessGuard],
      },
      {
        path: 'course-invite/:token',
        loadComponent: () =>
          import('./pages/course-invite-accept/course-invite-accept').then(
            (m) => m.CourseInviteAccept,
          ),
        canActivate: [authGuard],
      },
      {
        path: 'me/invitations',
        loadComponent: () =>
          import('./pages/my-invitations/my-invitations').then(
            (m) => m.MyInvitations,
          ),
        canActivate: [authGuard],
      },
      {
        path: 'me/progress',
        data: {titleKey: 'ui.topmenu.lmsMyProgress'},
        loadComponent: () => import('./pages/progress/progress').then((m) => m.Progress),
        canActivate: [authGuard],
      },
      {
        path: 'me/certificates',
        data: {titleKey: 'ui.topmenu.lmsMyCertificates'},
        loadComponent: () => import('./pages/certificate-list/certificate-list').then((m) => m.CertificateList),
        canActivate: [authGuard],
      },
      {
        path: 'certificate/:id',
        loadComponent: () => import('./pages/certificate-view/certificate-view').then((m) => m.CertificateView),
        canActivate: [authGuard],
      },
    ],
  },

  // ----------------------------------------------------------------------
  // Public shell. Wraps every anonymously-reachable route (marketing, auth,
  // token-landing pages). The topmenu runs in ``public`` mode here, but still
  // shows the app nav to a signed-in visitor (nav keys off the session). These
  // paths do not collide with the authenticated shell's, so they are reached by
  // backtracking after the first ``path: ''`` parent finds no matching child.
  // ----------------------------------------------------------------------
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {path: 'login', data: {titleKey: 'ui.login.title'}, loadComponent: () => import('./pages/auth/login/login').then((m) => m.LoginPage)},
      {
        // Public landing for the magic-link emails: must not be auth-gated
        // because the page itself is what authenticates the visitor.
        path: 'auth/magic/:token',
        loadComponent: () => import('./pages/auth/magic-link-exchange/magic-link-exchange').then((m) => m.MagicLinkExchangePage),
      },
      {path: 'home', loadComponent: () => import('./pages/home/home').then((m) => m.Home)},
      {path: 'donate', data: {titleKey: 'ui.topmenu.donate'}, loadComponent: () => import('./pages/donate/donate').then((m) => m.Donate)},
      {path: 'about', data: {titleKey: 'ui.topmenu.about'}, loadComponent: () => import('./pages/about/about').then((m) => m.About)},
      {path: 'privacy', data: {titleKey: 'ui.footer.privacyLink'}, loadComponent: () => import('./pages/privacy/privacy').then((m) => m.Privacy)},
      {path: 'features', data: {titleKey: 'ui.topmenu.features'}, loadComponent: () => import('./pages/features/features').then((m) => m.Features)},
      {
        // Password-reset *request* page. ``/reset-password`` is its former URL,
        // kept as a redirect for bookmarks; the e-mailed confirmation link
        // (``user/reset-password/:uid/:token``) is unchanged.
        path: 'forgot-password',
        data: {titleKey: 'ui.resetPassword.title'},
        loadComponent: () => import('./pages/auth/reset-password/reset-password').then((m) => m.ResetPassword),
      },
      {path: 'reset-password', pathMatch: 'full', redirectTo: 'forgot-password'},
      {
        path: 'user/reset-password/:uid/:token',
        data: {titleKey: 'ui.resetPassword.confirm.title'},
        loadComponent: () => import('./pages/auth/reset-password-confirm/reset-password-confirm').then((m) => m.ResetPasswordConfirmPage),
      },
      {
        path: 'user/confirm-email/:uid/:token',
        data: {titleKey: 'ui.confirmEmail.title'},
        loadComponent: () => import('./pages/auth/confirm-email/confirm-email').then((m) => m.ConfirmEmailPage),
      },
      {path: 'register', data: {titleKey: 'ui.register.title'}, loadComponent: () => import('./pages/auth/register/register').then((m) => m.Register)},
      {path: 'register/confirmation', data: {titleKey: 'ui.registerPending.title'}, loadComponent: () => import('./pages/auth/register-pending/register-pending').then((m) => m.RegisterPendingPage)},
      {
        // Public route: the invite-accept page itself routes the visitor to
        // login or signup when needed, so we must NOT gate it behind authGuard.
        path: 'invite/accept/:token',
        loadComponent: () => import('./pages/invite-accept/invite-accept').then((m) => m.InviteAcceptPage),
      },
      {
        // Same pattern as invite/accept: page is public so it can render the
        // "wrong_account" / "no_longer_eligible" states even before login.
        path: 'transfer/accept/:token',
        loadComponent: () => import('./pages/transfer-accept/transfer-accept').then((m) => m.TransferAcceptPage),
      },
      {
        path: 'verify/:token',
        loadComponent: () => import('./pages/certificate-verify/certificate-verify').then((m) => m.CertificateVerify),
      },
    ],
  },
];
