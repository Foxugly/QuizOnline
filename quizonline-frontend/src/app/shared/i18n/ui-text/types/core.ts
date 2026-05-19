export type TopMenuUiText = {
  quiz: string;
  domains: string;
  subjects: string;
  questions: string;
  users: string;
  features: string;
  donate: string;
  about: string;
  alertsAria: string;
  currentDomain: string;
  ownedDomains: string;
  managedDomains: string;
  linkedDomains: string;
  noDomains: string;
  preferences: string;
  notificationsAria: string;
  // LMS entries — surfaced for every authenticated user so they can
  // browse the catalog, track progress and access earned certificates.
  // ``lmsMyProgress`` / ``lmsMyCertificates`` are still used as sub-item
  // labels inside the new Courses dropdown.
  lmsMyProgress: string;
  lmsMyCertificates: string;
  // Courses dropdown — top-level entry for every authenticated user,
  // wraps Formations / Ma progression / Mes certificats.
  coursesMenu: string;
  coursesMenuFormations: string;
  // Quiz dropdown — replaces the flat Quiz/Subjects/Questions links for
  // owners/managers/superusers. Members still see ``quiz`` as a flat link.
  quizMenu: string;
  quizMenuLabel: string;
  // Top-level Dashboard entry — unified post-login hub combining LMS + quiz state.
  dashboard: string;
};

export type NotificationsUiText = {
  bellTitle: string;
  bellEmpty: string;
  bellMarkAllRead: string;
  bellSeeAll: string;
  pageTitle: string;
  pageSubtitle: string;
  filterUnread: string;
  filterAll: string;
  filterDeleted: string;
  empty: string;
  emptyHint: string;
  actionMarkRead: string;
  actionDelete: string;
  relative: (totalSeconds: number) => string;
  kindLine: (kind: string, payload: Record<string, unknown>) => string;
};

export type UserMenuUiText = {
  preferences: string;
  changePassword: string;
  logout: string;
  login: string;
  /** "My invitations" link entry — shown only when the user has at
   *  least one pending course invitation (the count is the trailing
   *  badge on the menu item). */
  myInvitations: string;
  /** Generic fallback rendered when the stored username is missing
   *  (e.g. session restored from a refresh token whose USER_KEY was
   *  evicted from local/session storage). */
  userFallback: string;
};

export type FooterUiText = {
  baseline: string;
  version: string;
  privacyLink: string;
};

export type HomeUiText = {
  eyebrow: string;
  lead: string;
  primaryLoggedIn: string;
  primaryLoggedOut: string;
  secondaryAdmin: string;
  secondaryLoggedOut: string;
  mode: string;
  modeManager: string;
  modeUser: string;
  modeVisitor: string;
  languages: string;
  features: string;
  featuresValue: string;
  contactCta: string;
  moderationTileTitle: string;
  moderationTileSubtitle: (total: number) => string;
  moderationTileCount: (n: number) => string;
};

export type PreferencesUiText = {
  eyebrow: string;
  title: string;
  subtitle: string;
  profileTitle: string;
  profileSubtitle: string;
  summaryTitle: string;
  summarySubtitle: string;
  loading: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  language: string;
  domains: string;
  chooseDomains: string;
  currentDomain: string;
  chooseLanguage: string;
  noDomain: string;
  save: string;
  changePassword: string;
  role: string;
  user: string;
  currentDomainLabel: string;
  managedDomains: string;
  ownedDomains: string;
  activeAccount: string;
  yes: string;
  no: string;
  roleSuperuser: string;
  roleManager: string;
  roleUser: string;
  roleOwner: string;
  roleMember: string;
  domainsTitle: string;
  domainsSubtitle: string;
  linkedDomainsList: string;
  currentBadge: string;
  setCurrent: string;
  unlinkDomain: string;
  addDomain: string;
  noMoreDomains: string;
  linkSelectedDomains: string;
  cancel: string;
  ownerLabel: string;
  deleteDomain: string;
  deleteDomainSuccess: string;
  deleteDomainError: string;
  loadError: string;
  saveError: string;
  saveSuccess: string;
  userMissing: string;
  pendingRequestsTitle: string;
  pendingRequestsEmpty: string;
  pendingRequestsRequestedAt: string;
  pendingRequestsCancel: string;
  tabProfile: string;
  tabDomains: string;
  tabNotifications: string;
  notificationsTitle: string;
  notificationsSubtitle: string;
  notificationKindJoinRequestCreated: string;
  notificationKindJoinRequestDecided: string;
  notificationKindJoinRequestExpiry: string;
  notificationKindInviteReceived: string;
  notificationKindTransferReceived: string;
  notificationKindQuizAssignment: string;
  notificationKindQuizCompleted: string;
  notificationKindQuizResultAvailable: string;
  notificationKindQuizDetailAvailable: string;
  notificationKindCourseInviteSent: string;
  notificationKindCourseInviteReceived: string;
  notificationKindCourseInviteAccepted: string;
  notificationKindCourseEnrollmentRequest: string;
  notificationCategoryDomain: string;
  notificationCategoryQuiz: string;
  notificationCategoryLms: string;
  notificationChannelEmail: string;
  notificationChannelWeb: string;
  notificationGroupUser: string;
  notificationGroupManager: string;
  notificationGroupOwner: string;
  notificationsSaved: string;
  // --- Danger zone: self-service account deletion (GDPR right of erasure) ---
  dangerZoneTitle: string;
  deleteAccountTitle: string;
  deleteAccountDescription: string;
  deleteAccountCta: string;
  deleteConfirmHeader: string;
  deleteConfirmMessage: (username: string) => string;
  deleteConfirmPlaceholder: string;
  deleteConfirmAccept: string;
  deleteConfirmCancel: string;
  /** Server error when the user still owns ``n`` domain(s). */
  deleteOwnedDomainsBlock: (count: number) => string;
  deleteSuccess: string;
  deleteError: string;
};
