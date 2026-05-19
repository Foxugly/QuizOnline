import {expect, test} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.addInitScript(() => {
    (window as Window & {__QUIZONLINE_API_BASE_URL?: string}).__QUIZONLINE_API_BASE_URL = 'http://127.0.0.1:8001';
  });
});

async function loginAs(
  page: import('@playwright/test').Page,
  username: string,
  password = 'secret123',
): Promise<void> {
  await page.goto('/login');
  await page.locator('#username').fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/home$/);
}

async function getAccessToken(
  page: import('@playwright/test').Page,
  username: string,
  password = 'secret123',
): Promise<string> {
  const response = await page.request.post('http://127.0.0.1:8001/api/token/', {
    data: {username, password},
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as {access?: string};
  expect(payload.access).toBeTruthy();
  return payload.access!;
}

test('testuser accepts a pending course invitation and lands enrolled', async ({page}) => {
  // The seed (``seed_fullstack_e2e`` management command) plants:
  //   - admin owns "Sciences" domain
  //   - testuser is a member of the domain
  //   - course slug=e2e-invite-only is in ``enroll_invite`` mode
  //   - a pending CourseInvite from admin to testuser exists
  // Any previous accept run is reset by the seed so this spec runs
  // deterministically on every ``test:e2e:fullstack``.
  await loginAs(page, 'testuser');

  // The topbar user-menu shows a red badge with the pending count.
  await expect(
    page.locator('.user-trigger__badge'),
  ).toContainText('1');

  // Open the user menu and click "Mes invitations".
  await page.locator('.user-trigger').click();
  await page.getByRole('button', {name: /Mes invitations/i}).click();
  await expect(page).toHaveURL(/\/lms\/me\/invitations$/);

  // One invitation card is visible — click "Voir l'invitation".
  await expect(page.getByRole('heading', {name: /Cours sur invitation/i})).toBeVisible();
  await page.getByRole('link', {name: /Voir l'invitation/i}).click();
  await expect(page).toHaveURL(/\/lms\/course-invite\/.+$/);

  // Accept button + course context render.
  await expect(page.getByText(/vous invite à rejoindre/i)).toBeVisible();
  await page.getByRole('button', {name: /Accepter l.invitation/i}).click();

  // Outcome view confirms the accept landed.
  await expect(page.getByRole('heading', {name: /Invitation acceptée/i})).toBeVisible();

  // Verify the enrollment row exists via the backend API.
  const accessToken = await getAccessToken(page, 'testuser');
  const enrollmentsResponse = await page.request.get(
    'http://127.0.0.1:8001/api/lms/enrollment/?status=active',
    {headers: {Authorization: `Bearer ${accessToken}`}},
  );
  expect(enrollmentsResponse.ok()).toBeTruthy();
  const enrollmentsJson = await enrollmentsResponse.json();
  const rows = enrollmentsJson.results ?? enrollmentsJson;
  expect(Array.isArray(rows)).toBeTruthy();
  const inviteRow = rows.find(
    (r: {course?: number; status?: string}) => r.status === 'active',
  );
  expect(inviteRow).toBeTruthy();
});
