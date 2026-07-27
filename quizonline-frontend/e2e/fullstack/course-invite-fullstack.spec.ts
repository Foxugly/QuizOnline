import {expect, test} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.addInitScript(() => {
    (window as Window & {__QUIZONLINE_API_BASE_URL?: string}).__QUIZONLINE_API_BASE_URL = 'http://127.0.0.1:8001';
  });
});

async function loginAs(
  page: import('@playwright/test').Page,
  email: string,
  password = 'secret123',
): Promise<void> {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function getAccessToken(
  page: import('@playwright/test').Page,
  email: string,
  password = 'secret123',
): Promise<string> {
  // Email-only auth: /api/token/ keys on USERNAME_FIELD = "email".
  const response = await page.request.post('http://127.0.0.1:8001/api/token/', {
    data: {email, password},
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as {access?: string};
  expect(payload.access).toBeTruthy();
  return payload.access!;
}

// TODO(O6): rehabilitate — auth/route rot fixed (email-only login, /me/…,
// /course-invite/…), but the invitation UI flow (user-menu badge, "Mes
// invitations" navigation, accept view) still needs re-alignment with the
// current SPA before this can gate. Tracked in docs/improvement-backlog.md (O6).
test('testuser accepts a pending course invitation and lands enrolled', async ({page}) => {
  // The seed (``seed_fullstack_e2e`` management command) plants:
  //   - admin owns "Sciences" domain
  //   - testuser is a member of the domain
  //   - course slug=e2e-invite-only is in ``enroll_invite`` mode
  //   - a pending CourseInvite from admin to testuser exists
  // Any previous accept run is reset by the seed so this spec runs
  // deterministically on every ``test:e2e:fullstack``.
  await loginAs(page, 'testuser@example.test');

  // The topbar user-menu shows a red badge with the pending count.
  await expect(
    page.locator('.user-trigger__badge'),
  ).toContainText('1');

  // Open the user menu and go to the invitations page. The menu shows a
  // pending-invitations preview with an unambiguous "Voir mes invitations"
  // button (the "Mes invitations" label alone matches the trigger + badge +
  // menu item, hence the explicit button name).
  await page.locator('.user-trigger').click();
  await page.getByRole('button', {name: 'Voir mes invitations'}).click();
  await expect(page).toHaveURL(/\/me\/invitations$/);

  // One invitation card is visible — open it. The "view invitation" action is a
  // p-button (routerLink) rendered as a <button role=button>; the FR label uses
  // a curly apostrophe, so match it with a wildcard.
  await expect(page.getByRole('heading', {name: /Cours sur invitation/i})).toBeVisible();
  await page.getByRole('button', {name: /Voir l.invitation/i}).click();
  await expect(page).toHaveURL(/\/course-invite\/.+$/);

  // Accept button + course context render.
  await expect(page.getByText(/vous invite à rejoindre/i)).toBeVisible();
  await page.getByRole('button', {name: /Accepter l.invitation/i}).click();

  // Outcome view confirms the accept landed.
  await expect(page.getByRole('heading', {name: /Invitation acceptée/i})).toBeVisible();

  // Verify the enrollment row exists via the backend API.
  const accessToken = await getAccessToken(page, 'testuser@example.test');
  const enrollmentsResponse = await page.request.get(
    'http://127.0.0.1:8001/api/enrollment/?status=active',
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
