
export type LoginUiText = {
  title: string;
  email: string;
  emailError: string;
  password: string;
  passwordError: string;
  remember: string;
  forgotPassword: string;
  submit: string;
  noAccount: string;
  createAccount: string;
  invalidCredentials: string;
  confirmEmailRequired: string;
  /** Bottom link of forgot / reset / magic / confirm pages. */
  backToLogin: string;
  orSeparator: string;
  magicLinkSwitch: string;
  magicLinkBackToPassword: string;
  magicLinkSubmit: string;
  magicLinkSent: string;
  magicLinkError: string;
  magicLinkExchanging: string;
  magicLinkExchangeFailed: string;
  magicLinkExpired: string;
};

export type RegisterUiText = {
  title: string;
  loading: string;
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
  /** "Already have an account?" — followed by the sign-in link. */
  haveAccount: string;
  emailRequired: string;
  emailInvalid: string;
  firstNameRequired: string;
  lastNameRequired: string;
  languageRequired: string;
  passwordRequired: string;
  passwordMin: string;
  confirmRequired: string;
  passwordMismatch: string;
  loadLanguagesError: string;
  loadDomainsError: string;
  submitError: string;
};

export type RegisterPendingUiText = {
  title: string;
  body: string;
  login: string;
};

export type ConfirmEmailUiText = {
  title: string;
  inProgress: string;
  successFallback: string;
  errorFallback: string;
  invalidLink: string;
};

export type ResetPasswordUiText = {
  title: string;
  emailLabel: string;
  emailRequired: string;
  emailInvalid: string;
  emailHint: string;
  submit: string;
  successMessage: string;
  errorGeneric: string;
  formInvalid: string;
  confirm: {
    title: string;
    confirmPassword: string;
    linkInvalidOrIncomplete: string;
    linkInvalidOrExpired: string;
    successReset: string;
    errorGeneric: string;
  };
};

export type ChangePasswordUiText = {
  title: string;
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

/** Shared, status-based error copy for the auth pages (fleet rule: never
 *  show a raw backend message unless it maps to a known application code). */
export type AuthErrorsUiText = {
  /** Network failure or 5xx. */
  generic: string;
  /** HTTP 429. */
  tooManyAttempts: string;
  /** Captcha not solved, or ``code: captcha_failed`` from the API. */
  captcha: string;
};
