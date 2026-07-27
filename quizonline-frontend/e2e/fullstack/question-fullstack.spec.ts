import {expect, test} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.addInitScript(() => {
    (window as Window & {__QUIZONLINE_API_BASE_URL?: string}).__QUIZONLINE_API_BASE_URL = 'http://127.0.0.1:8001';
  });
});

async function login(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login');
  await page.locator('#email').fill('admin@example.test');
  await page.locator('input[type="password"]').fill('secret123');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function getAccessToken(
  page: import('@playwright/test').Page,
  email = 'admin@example.test',
  password = 'secret123',
): Promise<string> {
  // The SPA never persists the access token (XSS hardening). Obtain one
  // directly from the backend so the test can call the API as a bearer
  // client without depending on AuthService internals. Email-only auth:
  // /api/token/ keys on USERNAME_FIELD = "email".
  const response = await page.request.post('http://127.0.0.1:8001/api/token/', {
    data: {email, password},
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as {access?: string};
  expect(payload.access).toBeTruthy();
  return payload.access!;
}

function normalizeHtmlText(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// TODO(O6): rehabilitate — auth rot fixed (email-only login + /api/token/ email
// field), but the question view/edit UI assertions still need re-alignment with
// the current SPA before these can gate. Tracked in
// docs/improvement-backlog.md (O6).
// TODO(O6): partially rehabilitated. The preview dialog opens with content
// (heading + "Bonne reponse" assert fine); remaining drift is the media itself —
// the seeded image/video no longer render an <img>/<video> whose src contains
// "question_media" in the dialog (media URL scheme / rendering changed). Needs
// the real current media URL pattern. Tracked in docs/improvement-backlog.md (O6).
test.skip('charge une question seedee avec ses medias reels', async ({page}) => {
  await login(page);

  await page.goto('/question/list');

  await expect(page.getByRole('heading', {name: 'Questions'})).toBeVisible();
  await expect(page.getByText('Question de seed')).toBeVisible();

  await page.locator('tr', {hasText: 'Question de seed'}).locator('#btn_view_question').click();

  const previewDialog = page.locator('.p-dialog').filter({hasText: 'Question de seed'}).first();
  await expect(previewDialog).toBeVisible();
  await expect(previewDialog.getByText('Bonne reponse')).toBeVisible();
  // Media is rendered as content blocks now (no bespoke quiz-question__media-*
  // classes), so assert on the real backend URLs directly — markup-agnostic.
  await expect(previewDialog.locator('img[src*="question_media"]').first()).toHaveAttribute(
    'src',
    /question_media\/.+\.png/,
  );
  await expect(
    previewDialog.locator('video[src*="question_media"], video source[src*="question_media"]').first(),
  ).toHaveAttribute('src', /question_media\/.+\.mp4/);
  await expect(previewDialog.locator('iframe[src*="youtube"]').first()).toHaveAttribute(
    'src',
    /youtube(?:-nocookie)?\.com\/embed\/dQw4w9WgXcQ/,
  );
});

// TODO(O6): still skipped — the answer-editing UI moved from a simple
// per-answer rich-text field (`.answer__content .ql-editor`) to an
// `app-block-list-editor` (block editor) per answer. Rehabilitating this needs
// a rewrite of the answer-filling interaction to drive the block editor, not a
// selector tweak. Tracked in docs/improvement-backlog.md (O6).
test.skip('edite une question et persiste les traductions et reponses cote backend', async ({page}) => {
  await login(page);

  await page.goto('/question/list');
  await page.locator('#btn_edit_question').first().click();

  await expect(page).toHaveURL(/\/question\/\d+\/edit$/);
  await expect(page.getByRole('heading', {name: /Modifier/i})).toBeVisible();

  await page.getByRole('tab', {name: 'FR'}).click();
  await page.locator('input[formcontrolname="title"]:visible').fill('Question modifiee FR');

  let answers = page.locator('.answer__content .ql-editor:visible');
  await answers.nth(0).fill('Bonne reponse modifiee FR');
  await answers.nth(1).fill('Mauvaise reponse modifiee FR');

  await page.getByRole('tab', {name: 'NL'}).click();
  await page.locator('input[formcontrolname="title"]:visible').fill('Vraag aangepast NL');

  answers = page.locator('.answer__content .ql-editor:visible');
  await answers.nth(0).fill('Goed antwoord aangepast NL');
  await answers.nth(1).fill('Fout antwoord aangepast NL');

  await page.getByRole('button', {name: 'Enregistrer'}).click();

  await expect(page).toHaveURL(/\/question\/\d+\/view$/);
  await expect(page.getByRole('heading', {name: /question/i})).toBeVisible();

  const questionIdMatch = page.url().match(/\/question\/(\d+)\/view$/);
  expect(questionIdMatch).toBeTruthy();
  const questionId = questionIdMatch![1];
  const accessToken = await getAccessToken(page);

  const response = await page.request.get(`http://127.0.0.1:8001/api/question/${questionId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  expect(response.ok()).toBeTruthy();
  const payload = await response.json();

  expect(payload.translations.fr.title).toBe('Question modifiee FR');
  expect(payload.translations.nl.title).toBe('Vraag aangepast NL');
  expect(normalizeHtmlText(payload.answer_options[0].translations.fr.content)).toBe('Bonne reponse modifiee FR');
  expect(normalizeHtmlText(payload.answer_options[0].translations.nl.content)).toBe('Goed antwoord aangepast NL');
  expect(normalizeHtmlText(payload.answer_options[1].translations.fr.content)).toBe('Mauvaise reponse modifiee FR');
  expect(normalizeHtmlText(payload.answer_options[1].translations.nl.content)).toBe('Fout antwoord aangepast NL');
});
