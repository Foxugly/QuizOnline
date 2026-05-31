/**
 * Smoke tests for golden paths that the unit-test suite cannot catch.
 *
 * Each spec targets a regression that escaped to production despite
 * green unit tests (every fix lives in a separate commit on ``main``):
 *
 * - ``/course/list`` was deadlocked behind its own table-skeleton —
 *   the lazy ``onLazyLoad`` event of the wrapped ``<p-table>`` never
 *   fired because the table was inside ``@if (initialLoad())``'s
 *   else-branch, so ``initialLoad`` stayed ``true`` forever and the
 *   skeleton rendered indefinitely. PR #57 fixed it.
 *
 * - The question preview dialog showed an empty popover until the user
 *   clicked anywhere else: its ``loading`` / ``error`` / ``question``
 *   were plain class fields under ``ChangeDetectionStrategy.OnPush``,
 *   so Angular never re-rendered when the HTTP fetch resolved. PR #63
 *   fixed it (signals + computed).
 *
 * Both bugs are CD-/integration-level and only surface when the
 * actual Angular pipeline runs against a backend. A unit spec on
 * either component would have passed.
 */
import {expect, test} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.addInitScript(() => {
    (window as Window & {__QUIZONLINE_API_BASE_URL?: string}).__QUIZONLINE_API_BASE_URL = 'http://127.0.0.1:8001';
  });
});

async function login(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login');
  await page.locator('#username').fill('admin');
  await page.locator('input[type="password"]').fill('secret123');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/home$/);
}

test.describe('smoke — known regressions', () => {
  test('/course/list resolves the skeleton and renders the seeded course', async ({page}) => {
    await login(page);
    await page.goto('/course/list');

    // The page must escape the initial skeleton state. Wait for the
    // table to actually appear (the skeleton has no such element).
    const table = page.locator('p-table table');
    await expect(table).toBeVisible();

    // The seed_lms_e2e fixture inserts a Course with slug
    // ``e2e-invite-only``. It must be in the first page of results.
    await expect(page.getByRole('cell', {name: /e2e-invite-only/i}).first()).toBeVisible();

    // Negative assertion: the skeleton component should be gone once
    // the data is on screen. If the deadlock came back the skeleton
    // would stay and the test above would have failed first — this is
    // belt-and-braces.
    await expect(page.locator('app-table-skeleton')).toHaveCount(0);
  });

  test('clicking the question-edit preview shows the question on first click', async ({page}) => {
    await login(page);

    await page.goto('/question/list');
    await expect(page.getByText('Question de seed').first()).toBeVisible();

    // Open the seeded question's edit page. The first row's edit button
    // is the most stable target.
    await page.locator('tr', {hasText: 'Question de seed'}).locator('#btn_edit_question').first().click();
    await expect(page).toHaveURL(/\/question\/\d+\/edit$/);

    // Click the eye (preview) icon in the header trio (duplicate / view /
    // delete). It carries an ``aria-label`` of "Voir" in FR.
    await page.locator('button[aria-label="Voir"]').first().click();

    // The dialog must materialise AND swap from its loading shimmer to
    // the actual question content within a reasonable network window.
    // Before the OnPush-signals fix this assertion would have timed out
    // because the dialog stayed on "Chargement de l'aperçu…" until a
    // stray CD tick (e.g. a click outside the popover) flushed the
    // signals.
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('app-quiz-question')).toBeVisible({timeout: 10_000});
    // The question prompt body must be in the dialog — confirms the
    // payload arrived AND was rendered, not just the shell.
    await expect(dialog.getByText(/Question de seed|prompt/i).first()).toBeVisible();
  });
});
