import {expect, test} from '@playwright/test';

import {mockApi} from './support/mock-api';

test('redirige un utilisateur anonyme vers login sur une route protegee', async ({page}) => {
  await mockApi(page);

  await page.goto('/question/list');

  await expect(page).toHaveURL(/\/login\?next=%2Fquestion%2Flist/);
  await expect(page.getByRole('button', {name: 'Se connecter'})).toBeVisible();
});

test('permet de se connecter et charge /me', async ({page}) => {
  const api = await mockApi(page);

  await page.goto('/login');
  await page.getByLabel('Utilisateur').fill('admin');
  await page.locator('input[type="password"]').fill('secret123');
  await page.getByRole('button', {name: 'Se connecter'}).click();

  await expect(page).toHaveURL(/\/home$/);
  expect(api.requests.login).toEqual([
    {username: 'admin', password: 'secret123'},
  ]);
});

test('soumet la demande de reset password', async ({page}) => {
  const api = await mockApi(page);

  await page.goto('/reset-password');
  await page.getByLabel('E-mail').fill('admin@example.test');
  await page.getByRole('button', {name: /Envoyer le lien/}).click();

  await expect(page.locator('p-message')).toBeVisible();
  expect(api.requests.passwordReset).toEqual([
    {email: 'admin@example.test'},
  ]);
});

test('soumet la confirmation de reset password', async ({page}) => {
  const api = await mockApi(page);

  await page.goto('/user/reset-password/uid-1/token-1');
  await page.locator('#new_password1 input').fill('newpassword');
  await page.locator('#new_password2 input').fill('newpassword');
  await page.getByRole('button', {name: /initialiser le mot de passe/i}).click();

  await expect(page.locator('p-message')).toBeVisible();
  expect(api.requests.passwordResetConfirm).toEqual([
    {
      uid: 'uid-1',
      token: 'token-1',
      new_password1: 'newpassword',
      new_password2: 'newpassword',
    },
  ]);
});
