import {CustomUserRead} from '../../api/generated/model/custom-user-read';

type SessionRedirect =
  | {kind: 'login'; queryParams?: Record<string, string | number>}
  | {kind: 'change-password'; queryParams?: Record<string, string | number>}
  | null;

export function requiredSessionRedirect(
  user: CustomUserRead | null | undefined,
  currentUrl: string,
  options: {
    authenticated: boolean;
    requiresEmailConfirmation: (candidate: CustomUserRead | null | undefined) => boolean;
    requiresPasswordChange: (candidate: CustomUserRead | null | undefined) => boolean;
  },
): SessionRedirect {
  if (!options.authenticated || !user) {
    return null;
  }

  if (options.requiresEmailConfirmation(user)) {
    return {
      kind: 'login',
      queryParams: {email_confirmation_required: 1},
    };
  }

  if (currentUrl.startsWith('/change-password')) {
    return null;
  }

  if (options.requiresPasswordChange(user)) {
    return {
      kind: 'change-password',
      queryParams: {next: currentUrl},
    };
  }

  return null;
}
