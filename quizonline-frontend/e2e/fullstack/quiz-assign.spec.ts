import {expect, test} from '@playwright/test';

const API = 'http://127.0.0.1:8001';

test.beforeEach(async ({page}) => {
  await page.addInitScript(() => {
    (window as Window & {__WPREF_API_BASE_URL?: string}).__WPREF_API_BASE_URL = 'http://127.0.0.1:8001';
  });
});

async function login(
  page: import('@playwright/test').Page,
  username = 'admin',
  password = 'secret123',
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Utilisateur').fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', {name: 'Se connecter'}).click();
  await expect(page).toHaveURL(/\/home$/);
}

async function getAccessToken(page: import('@playwright/test').Page): Promise<string> {
  const token = await page.evaluate(() =>
    sessionStorage.getItem('access_token') ?? localStorage.getItem('access_token'),
  );
  expect(token).toBeTruthy();
  return token!;
}

test('admin assigne un QuizTemplate a testuser, testuser voit le quiz dans sa liste', async ({page}) => {
  // ── 1. Login admin ─────────────────────────────────────────────────────────
  await login(page);
  const adminToken = await getAccessToken(page);

  // ── 2. Récupère l'id de testuser via l'API ──────────────────────────────────
  const usersResp = await page.request.get(`${API}/api/user/?search=testuser`, {
    headers: {Authorization: `Bearer ${adminToken}`},
  });
  expect(usersResp.ok()).toBeTruthy();
  const usersPayload = await usersResp.json();
  const testuser = (usersPayload.results ?? usersPayload).find(
    (u: {username: string}) => u.username === 'testuser',
  );
  expect(testuser).toBeTruthy();
  const testuserId: number = testuser.id;

  // ── 3. Récupère le QuizTemplate "Quiz full-stack" via l'API ────────────────
  const templatesResp = await page.request.get(`${API}/api/quiz/template/`, {
    headers: {Authorization: `Bearer ${adminToken}`},
  });
  expect(templatesResp.ok()).toBeTruthy();
  const templatesPayload = await templatesResp.json();
  const templates = templatesPayload.results ?? templatesPayload;
  const template = templates.find((t: {title: string}) => t.title === 'Quiz full-stack');
  expect(template).toBeTruthy();
  const templateId: number = template.id;

  // ── 4. Navigue vers /quiz/list ──────────────────────────────────────────────
  await page.goto('/quiz/list');
  await expect(page.getByRole('heading', {name: 'Quizz'})).toBeVisible();
  await expect(page.getByText('Quiz full-stack')).toBeVisible();

  // ── 5. Clique sur le bouton "Envoyer" du template ──────────────────────────
  const templateRow = page.locator('tr, .template-row, [data-testid="template-row"]').filter({
    hasText: 'Quiz full-stack',
  }).first();
  // Le bouton assign utilise aria-label contenant le titre du template
  const assignBtn = page.locator(`[aria-label*="Quiz full-stack"]`).first();
  await assignBtn.click();

  // ── 6. Dialog d'assignation s'ouvre ────────────────────────────────────────
  await expect(page.locator('p-dialog, .p-dialog')).toBeVisible();

  // Recherche testuser dans le dialog
  const dialogSearch = page.locator('p-dialog input[type="text"], .p-dialog input[type="text"]').first();
  await dialogSearch.fill('testuser');

  // Coche testuser
  const testuserCheckbox = page.locator(`label[for="assign-user-${testuserId}"]`).first();
  await testuserCheckbox.click();

  // ── 7. Confirme l'assignation ───────────────────────────────────────────────
  const submitBtn = page.locator('p-dialog p-button, .p-dialog p-button').filter({
    hasNot: page.locator('[severity="secondary"]'),
  }).locator('button').last();
  await submitBtn.click();

  // Attend la fermeture du dialog
  await expect(page.locator('p-dialog .p-dialog-content').filter({hasText: 'testuser'})).not.toBeVisible({timeout: 5000});

  // ── 8. Vérifie via API que le quiz a été créé pour testuser ─────────────────
  const quizzesResp = await page.request.get(`${API}/api/quiz/?user=${testuserId}`, {
    headers: {Authorization: `Bearer ${adminToken}`},
  });
  expect(quizzesResp.ok()).toBeTruthy();
  const quizzesPayload = await quizzesResp.json();
  const quizzes = quizzesPayload.results ?? quizzesPayload;
  const assignedQuiz = quizzes.find(
    (q: {quiz_template: number; user: number}) =>
      q.quiz_template === templateId && q.user === testuserId,
  );
  expect(assignedQuiz).toBeTruthy();
  const assignedQuizId: number = assignedQuiz.id;

  // ── 9. Login testuser et vérifie que le quiz apparaît dans sa liste ─────────
  await page.goto('/login');
  await page.getByLabel('Utilisateur').fill('testuser');
  await page.locator('input[type="password"]').fill('secret123');
  await page.getByRole('button', {name: 'Se connecter'}).click();
  await expect(page).toHaveURL(/\/home$/);

  await page.goto('/quiz/list');
  await expect(page.getByRole('heading', {name: 'Quizz'})).toBeVisible();

  // Le quiz assigné doit apparaître dans l'onglet "Mes sessions"
  const sessionsTab = page.getByRole('tab', {name: /session/i});
  if (await sessionsTab.isVisible()) {
    await sessionsTab.click();
  }
  await expect(page.getByText('Quiz full-stack')).toBeVisible();

  // ── 10. Vérifie via API (token testuser) ────────────────────────────────────
  const testuserToken = await getAccessToken(page);
  const quizResp = await page.request.get(`${API}/api/quiz/${assignedQuizId}/`, {
    headers: {Authorization: `Bearer ${testuserToken}`},
  });
  expect(quizResp.ok()).toBeTruthy();
  const quizPayload = await quizResp.json();
  expect(quizPayload.quiz_template).toBe(templateId);
  expect(quizPayload.user).toBe(testuserId);
  expect(quizPayload.active).toBe(true);
});
