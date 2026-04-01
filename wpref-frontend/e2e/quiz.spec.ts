import {expect, test} from '@playwright/test';

import {mockApi, seedAuthenticatedSession} from './support/mock-api';

test.describe('quiz flows', () => {
  test.beforeEach(async ({page}) => {
    await seedAuthenticatedSession(page);
  });

  test('affiche la liste des quiz et le resume d un quiz', async ({page}) => {
    await mockApi(page);

    await page.goto('/quiz/list');
    await expect(page.getByRole('heading', {name: 'Quizz'})).toBeVisible();
    await expect(page.getByText('Quiz de test')).toBeVisible();

    await page.locator('#btn_add_question').first().click();

    await expect(page).toHaveURL(/\/quiz\/700$/);
    await expect(page.getByRole('heading', {name: 'Résumé du quiz'})).toBeVisible();
    await expect(page.getByText('Quiz de test')).toBeVisible();
  });

  test('sauvegarde une reponse puis passe a la question suivante', async ({page}) => {
    const api = await mockApi(page);

    await page.goto('/quiz/700/questions');

    await expect(page.getByText('Bonne reponse')).toBeVisible();
    await page.getByRole('radio', {name: /501 Bonne reponse/}).check();
    await page.getByRole('button', {name: 'Suivant'}).click();

    await expect(page.getByText('Question 2')).toBeVisible();
    expect(api.requests.quizAnswerCreate).toHaveLength(1);
    expect(api.requests.quizAnswerCreate[0]).toMatchObject({
      question_id: 200,
      question_order: 1,
      selected_options: [501],
    });
  });
});
