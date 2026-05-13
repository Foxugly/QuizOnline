
export type LoginUiText = {
  eyebrow: string;
  title: string;
  subtitle: string;
  username: string;
  usernamePlaceholder: string;
  usernameError: string;
  password: string;
  passwordPlaceholder: string;
  passwordError: string;
  remember: string;
  forgotPassword: string;
  submit: string;
  noAccount: string;
  createAccount: string;
  invalidCredentials: string;
  confirmEmailRequired: string;
  orSeparator: string;
  magicLinkSwitch: string;
  magicLinkBackToPassword: string;
  magicLinkEmail: string;
  magicLinkEmailPlaceholder: string;
  magicLinkSubmit: string;
  magicLinkSent: string;
  magicLinkError: string;
  magicLinkExchanging: string;
  magicLinkExchangeFailed: string;
  magicLinkExpired: string;
};

export type RegisterUiText = {
  title: string;
  subtitle: string;
  back: string;
  create: string;
  loading: string;
  identityTitle: string;
  identityBadge: string;
  securityTitle: string;
  securityBadge: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  language: string;
  domains: string;
  chooseDomains: string;
  domainsHint: string;
  chooseLanguage: string;
  password: string;
  confirmPassword: string;
  createAccount: string;
  cancel: string;
  usernameRequired: string;
  emailRequired: string;
  emailInvalid: string;
  firstNameRequired: string;
  lastNameRequired: string;
  languageRequired: string;
  passwordRequired: string;
  passwordMin: string;
  confirmRequired: string;
  passwordMismatch: string;
  success: string;
  loadLanguagesError: string;
  loadDomainsError: string;
  submitError: string;
};

export type RegisterPendingUiText = {
  title: string;
  subtitle: string;
  lead: string;
  body: string;
  login: string;
};

export type ConfirmEmailUiText = {
  title: string;
  subtitle: string;
  inProgress: string;
  successFallback: string;
  errorFallback: string;
  invalidLink: string;
};

export type ResetPasswordUiText = {
  title: string;
  loading: string;
  emailLabel: string;
  emailPlaceholder: string;
  emailRequired: string;
  emailInvalid: string;
  emailHint: string;
  successMessage: string;
  errorGeneric: string;
  formInvalid: string;
  confirm: {
    title: string;
    subtitle: string;
    confirmPassword: string;
    backToLogin: string;
    linkInvalidOrIncomplete: string;
    linkInvalidOrExpired: string;
    successReset: string;
    errorGeneric: string;
  };
};

export type ChangePasswordUiText = {
  title: string;
  subtitle: string;
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
  oldPasswordRequired: string;
  newPasswordRequired: string;
  newPasswordMin: string;
  confirmRequired: string;
  mismatch: string;
  submit: string;
  forceMessage: string;
  success: string;
  error: string;
};
