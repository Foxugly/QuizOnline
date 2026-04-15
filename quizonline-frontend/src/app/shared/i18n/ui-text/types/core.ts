export type TopMenuUiText = {
  quiz: string;
  domains: string;
  subjects: string;
  questions: string;
  about: string;
  alertsAria: string;
  currentDomain: string;
  ownedDomains: string;
  staffDomains: string;
  linkedDomains: string;
  noDomains: string;
  preferences: string;
};

export type UserMenuUiText = {
  preferences: string;
  changePassword: string;
  logout: string;
  login: string;
};

export type FooterUiText = {
  baseline: string;
  version: string;
};

export type HomeUiText = {
  eyebrow: string;
  lead: string;
  primaryLoggedIn: string;
  primaryLoggedOut: string;
  secondaryAdmin: string;
  secondaryLoggedOut: string;
  mode: string;
  modeStaff: string;
  modeUser: string;
  modeVisitor: string;
  languages: string;
  features: string;
  featuresValue: string;
  highlights: Array<{title: string; description: string;}>;
  capabilitiesTitle: string;
  capabilities: string[];
  quickLinksTitle: string;
  quickLinks: {
    catalog: string;
    preferences: string;
    about: string;
  };
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
  roleStaff: string;
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
};
