const EMAIL_USER = 'info';
const EMAIL_HOST = 'foxugly';
const EMAIL_TLD = 'com';
const PHONE_PREFIX = '+32';
const PHONE_PARTS = ['478', '811988'];

export const CONTACT_INFO = {
  name: 'Renaud Vilain',
  company: 'Foxugly SRL',
  vat: 'BE 1004.770.045',
  addressLines: ['rue Nicolas Defrêcheux 22', '1030 Schaerbeek', 'Belgium'],
  websiteLabel: 'www.foxugly.com',
  websiteUrl: 'https://www.foxugly.com',
} as const;

/**
 * Returns the e-mail rendered with [at] / [dot] markers so it isn't
 * harvested verbatim by naive crawlers. The real address is reassembled
 * client-side only when {@link openContactEmail} is invoked.
 */
export function emailDisplay(): string {
  return `${EMAIL_USER} [at] ${EMAIL_HOST} [dot] ${EMAIL_TLD}`;
}

export function phoneDisplay(): string {
  return `${PHONE_PREFIX} ${PHONE_PARTS.join(' ')}`;
}

export function openContactEmail(subject: string): void {
  const address = `${EMAIL_USER}@${EMAIL_HOST}.${EMAIL_TLD}`;
  const params = new URLSearchParams({subject});
  window.location.href = `mailto:${address}?${params.toString()}`;
}
