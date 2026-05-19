import type {UiText} from './types';

export const EN: UiText = {
  topmenu: {quiz: 'Quizzes', domains: 'Domains', subjects: 'Topics', questions: 'Questions', users: 'Users', features: 'Features', donate: 'Donate', about: 'About', alertsAria: 'Messages', currentDomain: 'Current domain', ownedDomains: 'My domains', managedDomains: 'Domains I manage', linkedDomains: 'Linked domains', noDomains: 'No domain', preferences: 'Preferences', notificationsAria: 'Notifications', lmsMyProgress: 'My progress', lmsMyCertificates: 'My certificates', coursesMenu: 'Courses', coursesMenuFormations: 'Courses', quizMenu: 'Quiz', quizMenuLabel: 'Quiz', dashboard: 'Dashboard'},
  userMenu: {preferences: 'Preferences', changePassword: 'Change password', logout: 'Logout', login: 'Login', userFallback: 'User'},
  footer: {baseline: 'Quiz and domain content management platform.', version: 'Version', privacyLink: 'Privacy'},
  home: {
    eyebrow: 'Quizzes, templates and review',
    lead: 'One place to build quizzes, assign them, complete them and review feedback.',
    primaryLoggedIn: 'View my quizzes',
    primaryLoggedOut: 'Sign in',
    secondaryAdmin: 'Create a template',
    secondaryLoggedOut: 'Create an account',
    mode: 'Mode',
    modeManager: 'Manager',
    modeUser: 'Signed-in user',
    modeVisitor: 'Visitor',
    languages: 'Languages',
    features: 'Features',
    featuresValue: 'Quizzes, messages, assignments, review',
    contactCta: 'Contact me', moderationTileTitle: 'Requests to moderate', moderationTileSubtitle: (total) => `${total} pending across your domains.`, moderationTileCount: (n) => n <= 1 ? `${n} request` : `${n} requests`,
  },
  login: {
    eyebrow: 'Login', title: 'Access your workspace', subtitle: 'Sign in to continue.',
    username: 'Username', usernamePlaceholder: 'Your username', usernameError: 'Username is required (min. 3 characters)',
    password: 'Password', passwordPlaceholder: 'Your password', passwordError: 'Password is required (min. 4 characters)',
    remember: 'Remember me', forgotPassword: 'Forgot password?', submit: 'Sign in', noAccount: 'No account yet?',
    createAccount: 'Create account', invalidCredentials: 'Invalid credentials. Try again.', confirmEmailRequired: 'Confirm your email address before signing in.', orSeparator: 'or', magicLinkSwitch: 'Sign in with a magic link', magicLinkBackToPassword: 'Use a password', magicLinkEmail: 'Email', magicLinkEmailPlaceholder: 'your@email.com', magicLinkSubmit: 'Send the link', magicLinkSent: 'If an account exists, a sign-in link has been emailed.', magicLinkError: 'Could not send the link. Try again.', magicLinkExchanging: 'Signing in…', magicLinkExchangeFailed: 'Invalid or already used link.', magicLinkExpired: 'Expired link. Request a new one.',
  },
  register: {
    title: 'Create an account', subtitle: 'Identity, language and security', back: 'Back', create: 'Create', loading: 'Loading...',
    identityTitle: 'Identity', identityBadge: 'profile', securityTitle: 'Security', securityBadge: 'password',
    username: 'Username', email: 'Email address', firstName: 'First name', lastName: 'Last name', language: 'Language',
    domains: 'Domains', chooseDomains: 'Choose one or more domains', domainsHint: 'Select the domains you want to be linked to.',
    chooseLanguage: 'Choose a language', password: 'Password', confirmPassword: 'Confirm password', createAccount: 'Create my account',
    cancel: 'Cancel', usernameRequired: 'Username is required.', emailRequired: 'Email address is required.', emailInvalid: 'Email address is not valid.',
    firstNameRequired: 'First name is required.', lastNameRequired: 'Last name is required.', languageRequired: 'Language is required.',
    passwordRequired: 'Password is required.', passwordMin: 'Minimum 8 characters.', confirmRequired: 'Confirmation is required.',
    passwordMismatch: 'Passwords do not match.', success: 'Your account has been created. Check your mailbox to confirm your registration.',
    loadLanguagesError: 'Unable to load languages.', loadDomainsError: 'Unable to load domains.', submitError: 'Registration failed. Check the information and try again.',
  },
  registerPending: {
    title: 'Account created',
    subtitle: 'Confirm your email address',
    lead: 'Your account has been created successfully.',
    body: 'Check your mailbox now and click the confirmation link to activate your registration.',
    login: 'Go to login',
  },
  changePassword: {
    title: 'QuizOnline', subtitle: 'Reset my password', oldPassword: 'Current password', newPassword: 'New password',
    confirmNewPassword: 'Confirm new password', oldPasswordRequired: 'Current password is required.', newPasswordRequired: 'New password is required.',
    newPasswordMin: 'The new password must be at least 8 characters long.', confirmRequired: 'Confirmation is required.', mismatch: 'Passwords do not match.',
    submit: 'Change password', forceMessage: 'Password change is required before continuing.', success: 'Your password has been changed.',
    error: 'An error occurred while changing the password.',
  },
  resetPassword: {
    title: 'Reset password',
    loading: 'Loading…',
    emailLabel: 'Email',
    emailPlaceholder: 'your email address',
    emailRequired: 'Email is required.',
    emailInvalid: 'The email is not valid.',
    emailHint: 'A reset link will be sent if the email address exists.',
    successMessage: 'If an account exists for that address, a reset email has been sent.',
    errorGeneric: 'An error occurred. Please try again later.',
    formInvalid: 'Please fix the errors in the form.',
    confirm: {
      title: 'New password',
      subtitle: 'Pick a new password for your account.',
      confirmPassword: 'Confirm password',
      backToLogin: 'Back to sign in',
      linkInvalidOrIncomplete: 'Reset link is invalid or incomplete.',
      linkInvalidOrExpired: 'Reset link is invalid or expired.',
      successReset: 'Your password has been reset. You can now sign in.',
      errorGeneric: 'Unable to reset the password.',
    },
  },
  confirmEmail: {
    title: 'Email confirmation',
    subtitle: 'Validating your registration',
    inProgress: 'Confirmation in progress…',
    successFallback: 'Email address confirmed successfully.',
    errorFallback: 'Unable to confirm this email address.',
    invalidLink: 'Confirmation link is invalid or incomplete.',
  },
  preferences: {
    eyebrow: 'My account', title: 'Preferences', subtitle: 'Manage your profile, interface language and current domain.',
    profileTitle: 'Profile', profileSubtitle: 'Personal information and display preferences.', summaryTitle: 'Summary',
    summarySubtitle: 'Quick view of your current account.', loading: 'Loading...', username: 'Username', email: 'Email',
    firstName: 'First name', lastName: 'Last name', language: 'Language', domains: 'Linked domains', chooseDomains: 'Choose linked domains', currentDomain: 'Current domain', chooseLanguage: 'Choose a language',
    noDomain: 'No domain', save: 'Save', changePassword: 'Change password', role: 'Role', user: 'User', currentDomainLabel: 'Current domain',
    managedDomains: 'Managed domains', ownedDomains: 'Owned domains', activeAccount: 'Active account', yes: 'Yes', no: 'No',
    roleSuperuser: 'Superuser', roleManager: 'Manager', roleUser: 'User', roleOwner: 'Owner', roleMember: 'Linked member', domainsTitle: 'Domains', domainsSubtitle: 'Manage your linked domains and choose the current one.', linkedDomainsList: 'Visible domains', currentBadge: 'Current', setCurrent: 'Set current', unlinkDomain: 'Leave', addDomain: 'Link a domain', noMoreDomains: 'No additional domain available.', linkSelectedDomains: 'Link selection', cancel: 'Cancel', ownerLabel: 'Owner:', deleteDomain: 'Delete', deleteDomainSuccess: 'Domain deleted.', deleteDomainError: 'Unable to delete this domain.', loadError: 'Unable to load your preferences.',
    saveError: 'Unable to save preferences.', saveSuccess: 'Preferences saved.', userMissing: 'User not found.',
    pendingRequestsTitle: 'My pending requests',
    pendingRequestsEmpty: 'No pending request.',
    pendingRequestsRequestedAt: 'Requested at',
    pendingRequestsCancel: 'Cancel request',
    tabProfile: 'Profile',
    tabDomains: 'Domains',
    tabNotifications: 'Notifications',
    notificationsTitle: 'Email notifications',
    notificationsSubtitle: 'Pick the emails you want to receive. Critical emails (registration confirmation, password reset, sign-in link) are always sent.',
    notificationKindJoinRequestCreated: 'New join request on a domain I moderate',
    notificationKindJoinRequestDecided: 'Decision (approved / rejected) on one of my requests',
    notificationKindJoinRequestExpiry: 'Warning before auto-cancel of a pending request',
    notificationKindInviteReceived: 'Invitation to join a domain',
    notificationKindTransferReceived: 'Ownership transfer proposal',
    notificationKindQuizAssignment: 'A quiz has been assigned to me',
    notificationKindQuizCompleted: 'A user completed one of my quizzes',
    notificationKindQuizResultAvailable: 'My score on a quiz is available',
    notificationKindQuizDetailAvailable: 'The detailed correction of a quiz is available',
    notificationKindCourseInviteSent: 'One of my course invitations was sent',
    notificationKindCourseInviteReceived: 'I am invited to join a course',
    notificationKindCourseInviteAccepted: 'One of my course invitations was accepted',
    notificationKindCourseEnrollmentRequest: 'New enrollment request on a course I moderate',
    notificationChannelEmail: 'Email',
    notificationChannelWeb: 'Bell',
    notificationGroupUser: 'My notifications',
    notificationGroupManager: 'As a manager',
    notificationGroupOwner: 'As an owner',
    notificationsSaved: 'Notification preferences saved.',
    dangerZoneTitle: 'Danger zone',
    deleteAccountTitle: 'Delete my account',
    deleteAccountDescription: 'Permanently delete your account and all your personal data. This cannot be undone. If you still own domains, transfer or delete them first.',
    deleteAccountCta: 'Delete my account…',
    deleteConfirmHeader: 'Confirm deletion',
    deleteConfirmMessage: (username) => `This cannot be undone. To confirm, type your username ("${username}") below.`,
    deleteConfirmPlaceholder: 'Username',
    deleteConfirmAccept: 'Delete permanently',
    deleteConfirmCancel: 'Cancel',
    deleteOwnedDomainsBlock: (count) => count <= 1
      ? 'You still own one domain. Transfer or delete it before deleting your account.'
      : `You still own ${count} domains. Transfer or delete them before deleting your account.`,
    deleteSuccess: 'Your account has been deleted.',
    deleteError: 'Unable to delete the account.',
  },
  notifications: {
    bellTitle: 'Notifications',
    bellEmpty: 'No notification.',
    bellMarkAllRead: 'Mark all as read',
    bellSeeAll: 'See all notifications',
    pageTitle: 'Notifications',
    pageSubtitle: 'Everything that happens on your domains and your invitations.',
    filterUnread: 'Unread',
    filterAll: 'All',
    filterDeleted: 'Trash',
    empty: 'Nothing to show.',
    emptyHint: 'You will be notified here as soon as something happens on one of your domains or invitations.',
    actionMarkRead: 'Mark as read',
    actionDelete: 'Delete',
    relative: (s) => {
      const sec = Math.max(0, Math.round(s));
      if (sec < 60) return 'just now';
      const m = Math.floor(sec / 60);
      if (m < 60) return `${m} min ago`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h} h ago`;
      const d = Math.floor(h / 24);
      return `${d} d ago`;
    },
    kindLine: (kind, payload) => {
      const dn = String((payload as {domain_name?: string})?.domain_name ?? '');
      const ru = String((payload as {requester_username?: string})?.requester_username ?? '');
      const iu = String((payload as {inviter_username?: string})?.inviter_username ?? '');
      const ii = String((payload as {initiator_username?: string})?.initiator_username ?? '');
      const oc = String((payload as {outcome?: string})?.outcome ?? '');
      switch (kind) {
        case 'domain.join_request.created':
          return `${ru || 'A user'} requested to join "${dn}".`;
        case 'domain.join_request.decided':
          return oc === 'approved'
            ? `Your request on "${dn}" was approved.`
            : `Your request on "${dn}" was rejected.`;
        case 'domain.join_request.expiry_warning':
          return `Your request on "${dn}" is about to expire.`;
        case 'domain.invite.received':
          return `${iu || 'Someone'} invited you to join "${dn}".`;
        case 'domain.transfer.received':
          return `${ii || 'The owner'} is offering you ownership of "${dn}".`;
        case 'quiz.assignment':
          return `A new quiz "${String((payload as {template_title?: string})?.template_title ?? '')}" has been assigned to you.`;
        case 'quiz.completed':
          return `${String((payload as {user_username?: string})?.user_username ?? 'A user')} just completed "${String((payload as {template_title?: string})?.template_title ?? '')}".`;
        case 'quiz.result_available':
          return `Your score on "${String((payload as {template_title?: string})?.template_title ?? '')}" is available.`;
        case 'quiz.detail_available':
          return `The detailed correction of "${String((payload as {template_title?: string})?.template_title ?? '')}" is available.`;
        default:
          return kind;
      }
    },
  },
  admin: {
    menuLabel: 'Administration',
    stats: {
      title: 'Statistics',
      activeUsers: 'Active users',
      activeDomains: 'Active domains',
      activeQuestions: 'Active questions',
      completedSessions: 'Completed sessions',
      domain: 'Domain',
      members: 'Members',
      managers: 'Managers',
      questions: 'Questions',
      templates: 'Templates',
      sessions: 'Sessions',
      completion: 'Completion',
    },
    languages: {
      title: 'Language management',
      addLanguage: 'Add a language',
      code: 'Code',
      name: 'Name',
      active: 'Active',
      editLanguage: 'Edit language',
      deleteConfirm: 'Are you sure you want to delete this language?',
      actions: 'Actions',
    },
    mailTest: {
      title: 'Email test',
      eyebrow: 'SMTP / Outbox',
      subtitle: 'Trigger a test message through the real backend email flow.',
      formTitle: 'Send a test email',
      formSubtitle: 'The backend enqueues the message in the outbox and starts standard delivery.',
      to: 'Recipient',
      toPlaceholder: 'recipient@example.com',
      toRequired: 'Email address is required.',
      toInvalid: 'Email address is not valid.',
      subject: 'Topic',
      subjectPlaceholder: 'Leave empty to use the default topic',
      subjectHint: 'Optional. When empty, the backend generates a test topic.',
      body: 'Message',
      bodyPlaceholder: 'Leave empty to use the default body',
      bodyHint: 'Optional. When empty, the backend generates a timestamped body.',
      send: 'Send test email',
      sending: 'Sending...',
      successTitle: 'Email queued',
      errorTitle: 'Send failed',
      errorFallback: 'Unable to send the test email.',
      resultTitle: 'Latest submission',
      resultSubtitle: 'Immediate API response after queueing.',
      resultEmpty: 'No test email has been sent in this session.',
      emailId: 'Outbox ID',
      recipients: 'Recipients',
      deliveryNote: 'If the broker or SMTP backend is unavailable, the message may stay queued or be delivered in degraded mode depending on backend settings.',
    },
    systemConfig: {
      title: 'System configuration',
      eyebrow: 'Diagnostics',
      subtitle: 'Read-only view of the effective runtime configuration with on-demand connectivity checks.',
      loading: 'Loading configuration...',
      checking: 'Checking...',
      checkedAt: 'Checked at',
      checkResultTitle: 'Check result',
      errorTitle: 'System error',
      loadError: 'Unable to load system configuration.',
      checkError: 'Unable to run this check.',
      sections: {
        db: {
          title: 'Database',
          description: 'Engine, target and connection settings with masking applied.',
          check: 'Test DB',
          fields: {engine: 'Engine', name: 'Name', host: 'Host', port: 'Port', conn_max_age: 'Conn max age'},
        },
        email: {
          title: 'Email',
          description: 'Email backend, sender and delivery dependencies.',
          check: 'Test email',
          fields: {
            backend: 'Backend',
            host: 'Host',
            port: 'Port',
            use_tls: 'TLS',
            host_user: 'User',
            host_password_configured: 'Password configured',
            default_from_email: 'From',
            celery_broker_url: 'Celery broker',
            celery_result_backend: 'Result backend',
          },
        },
        upload: {
          title: 'Upload',
          description: 'Media directory and active upload limits.',
          check: 'Test write access',
          fields: {
            media_root: 'Media root',
            media_root_exists: 'Directory exists',
            data_upload_max_memory_size: 'Data upload max',
            file_upload_max_memory_size: 'File upload max',
            max_upload_file_size: 'Max file size',
          },
        },
        deepl: {
          title: 'DeepL',
          description: 'Activation status and key presence without exposing the secret.',
          check: 'Test DeepL',
          fields: {enabled: 'Enabled', auth_key_configured: 'Key configured', is_free: 'Free plan'},
        },
      },
    },
    joinRequests: {
      title: 'Join requests',
      user: 'User',
      email: 'Email',
      requestedAt: 'Requested at',
      status: 'Status',
      actions: 'Actions',
      approve: 'Approve',
      reject: 'Reject',
      rejectReason: 'Rejection reason',
      rejectReasonPlaceholder: 'Enter the reason for rejection…',
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      cancelled: 'Cancelled',
      all: 'All',
      noRequests: 'No requests.',
      moderate: 'Moderate join requests',
      decidedBy: 'Decided by',
      decidedAt: 'Decided at',
      reason: 'Reason',
      noReason: '—',
      bulkPlaceholder: 'Bulk actions…',
      bulkApply: 'Apply',
      bulkApprove: 'Approve selection',
      bulkReject: 'Reject selection',
      bulkCancel: 'Cancel',
      bulkSelectedCount: (n) => `${n} selected`,
      bulkRejectHeader: 'Reject multiple requests',
      bulkRejectMessage: (n) => `The reason below will be saved for the ${n} rejected requests.`,
      bulkActionFailed: 'One or more actions failed.',
      bulkResultTitle: 'Bulk action complete',
      bulkResultDetail: (processed, skipped) => skipped > 0
        ? `${processed} request(s) processed, ${skipped} skipped (already decided or out of scope).`
        : `${processed} request(s) processed.`,
    },
  },
  a11y: {
    skipToContent: 'Skip to main content',
  },
};

