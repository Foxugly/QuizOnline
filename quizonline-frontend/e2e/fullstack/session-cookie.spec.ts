/**
 * HttpOnly refresh cookie (fleet design, piloted on PushIT) against the real
 * backend: the refresh token never reaches JavaScript, the access token lives
 * in memory only, and a reload restores the session from the cookie.
 */
import {expect, Page, test} from '@playwright/test';

const API = 'http://127.0.0.1:8001';
const COOKIE = 'quizonline_refresh';

test.beforeEach(async ({context}) => {
  // On the context: the multi-tab test opens a second page.
  await context.addInitScript(() => {
    (window as Window & {__QUIZONLINE_API_BASE_URL?: string}).__QUIZONLINE_API_BASE_URL = 'http://127.0.0.1:8001';
  });
});

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('#email').fill('admin@example.test');
  await page.locator('input[type="password"]').fill('secret123');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function storageDump(page: Page): Promise<string> {
  return page.evaluate(() => JSON.stringify({...localStorage, ...sessionStorage}));
}

test('login sets an HttpOnly cookie, no token in storage, reload restores the session', async ({page, context}) => {
  await login(page);

  const cookie = (await context.cookies()).find((c) => c.name === COOKIE);
  expect(cookie).toBeDefined();
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.path).toBe('/api/v1/token/');
  expect(cookie?.sameSite).toBe('Lax');

  expect(await page.evaluate(() => document.cookie)).not.toContain(COOKIE);
  const stored = await storageDump(page);
  expect(stored).not.toContain(cookie?.value as string);
  expect(stored).not.toContain('refresh_token');
  expect(stored).toContain('quizonline.session');

  // Full reload: memory is gone, the cookie brings the session back and is
  // rotated. Wait for each restore to land before reloading again: aborting
  // an in-flight refresh would lose the rotated cookie.
  const currentCookie = async () => (await context.cookies()).find((c) => c.name === COOKIE)?.value;
  await page.goto('/dashboard');
  await expect(page.locator('.user-trigger')).toBeVisible();
  await expect.poll(currentCookie).not.toBe(cookie?.value);
  const rotated = await currentCookie();

  await page.reload();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('.user-trigger')).toBeVisible();
  await expect.poll(currentCookie).not.toBe(rotated);
});

test('a session whose cookie is gone falls back to the login page', async ({page, context}) => {
  await login(page);
  await context.clearCookies({name: COOKIE});
  await page.goto('/question/list');
  await expect(page).toHaveURL(/\/login/);
  expect(await page.evaluate(() => localStorage.getItem('quizonline.session'))).toBeNull();
});

test('a legacy refresh token in localStorage is migrated to the cookie once', async ({page, context}) => {
  // Obtain a body-mode refresh token, as the pre-cookie SPA stored it.
  const response = await page.request.post(`${API}/api/v1/token/`, {
    data: {email: 'admin@example.test', password: 'secret123'},
  });
  expect(response.ok()).toBeTruthy();
  const {refresh} = (await response.json()) as {refresh: string};
  await page.addInitScript((token) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('refresh_token', token);
      localStorage.setItem('remember_me', '1');
      sessionStorage.setItem('seeded', '1');
    }
  }, refresh);

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('refresh_token'))).toBeNull();
  const cookie = (await context.cookies()).find((c) => c.name === COOKIE);
  expect(cookie?.httpOnly).toBe(true);

  // Next load uses the cookie only.
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('logout clears the cookie and the second tab follows', async ({page, context}) => {
  await login(page);
  await expect(page.locator('.user-trigger')).toBeVisible();
  const second = await context.newPage();
  await second.goto('/dashboard');
  await expect(second).toHaveURL(/\/dashboard$/);
  await expect(second.locator('.user-trigger')).toBeVisible();

  await page.locator('.user-trigger').click();
  await page.locator('.user-menu__item--danger').click();
  await expect(page).toHaveURL(/\/login/);

  await expect.poll(async () => (await context.cookies()).some((c) => c.name === COOKIE)).toBe(false);
  await expect.poll(() => second.evaluate(() => localStorage.getItem('quizonline.session'))).toBeNull();
  await second.goto('/question/list');
  await expect(second).toHaveURL(/\/login/);
});
