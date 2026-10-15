import {expect, test} from '@playwright/test';

type DialogWindow = Window & {__dialogSeen?: boolean};

test.beforeEach(async ({page}) => {
  // Flag any dialog ever inserted in the DOM (resets on reload).
  await page.addInitScript(() => {
    const sel = '.p-dialog, .p-confirmdialog, [role="dialog"]';
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        m.addedNodes.forEach(n => {
          if (n instanceof Element && (n.matches(sel) || n.querySelector(sel))) {
            (window as DialogWindow).__dialogSeen = true;
          }
        });
      }
    });
    observer.observe(document, {childList: true, subtree: true});
  });
  await page.addInitScript(() => {
    (window as Window & {__QUIZONLINE_API_BASE_URL?: string}).__QUIZONLINE_API_BASE_URL = 'http://127.0.0.1:8001';
  });
});

test('instructor builds a section and a lesson with content, no dialog', async ({page}) => {
  await page.goto('/login');
  await page.locator('#email').fill('admin@example.test');
  await page.locator('input[type="password"]').fill('secret123');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Create the course (title in the first language tab) -> lands on the content tab.
  await page.goto('/course/create');
  await page.locator('input[formControlName="title"]').first().fill('E2E authoring');
  await page.getByRole('button', {name: /créer le cours|create course/i}).click();
  await expect(page).toHaveURL(/\/course\/\d+\/edit\?tab=content/);

  // Section, then lesson: inline inputs, Enter to submit.
  await page.getByTestId('add-section-open').click();
  await page.getByTestId('add-section-input').fill('Chapitre 1');
  await page.getByTestId('add-section-input').press('Enter');

  // submitSection() opens the lesson input of the new section automatically.
  const lessonInput = page.locator('[data-testid^="add-lesson-"][data-testid$="-input"]');
  await expect(lessonInput).toBeVisible();
  await lessonInput.fill('Leçon 1');
  await lessonInput.press('Enter');
  await expect(page).toHaveURL(/lesson=\d+/);

  // Add a rich-text block, type content, save.
  const lessonPane = page.locator('app-lesson-content-editor');
  await lessonPane.getByRole('button', {name: /texte enrichi|rich text/i}).click();
  await lessonPane.locator('.ql-editor').first().fill('Contenu E2E');
  await lessonPane.getByRole('button', {name: /^(enregistrer|save)$/i}).first().click();

  expect(await page.evaluate(() => (window as DialogWindow).__dialogSeen === true)).toBe(false);

  // Content survives a reload, and no dialog was ever involved.
  await page.reload();
  await expect(page).toHaveURL(/lesson=\d+/);
  await expect(page.getByText('Contenu E2E')).toBeVisible();
  await expect(page.locator('.p-dialog')).toHaveCount(0);
});
