import { test, expect } from '@playwright/test';
import { installApiMocks } from './apiMocks.js';

const triageResult = {
  suggested_priority: 'critical',
  suggested_severity: 'major',
  summary: 'Checkout fails: database connections are exhausted under load',
  possible_root_cause:
    'Likely database connection pool exhaustion. Inspect pool sizing and long-running queries.',
  source: 'mock',
};

test.describe('AI Triage', () => {
  test('auto-populates priority, severity and root cause from the AI suggestion', async ({ page }) => {
    await installApiMocks(page, [
      { method: 'GET', pattern: /\/api\/bugs$/, json: { data: [] } },
      { method: 'GET', pattern: /\/api\/users$/, json: { data: [] } },
      { method: 'POST', pattern: /\/api\/bugs\/ai-triage$/, json: triageResult },
    ]);

    await page.goto('/bugs');
    await page.getByRole('button', { name: /report bug/i }).click();

    await page.getByLabel('Title').fill('Database timeout in checkout');
    await page
      .getByLabel('Description')
      .fill('Connections are exhausted and every user gets a timeout error.');

    await page.getByTestId('ai-triage-button').click();

    const result = page.getByTestId('ai-triage-result');
    await expect(result).toBeVisible();
    await expect(page.getByTestId('ai-suggested-priority')).toHaveText(/critical/i);
    await expect(page.getByTestId('ai-suggested-severity')).toHaveText(/major/i);
    await expect(result).toContainText(/connection pool exhaustion/i);

    // The form fields are populated with the AI suggestion.
    await expect(page.locator('#bug-priority')).toHaveValue('critical');
    await expect(page.locator('#bug-severity')).toHaveValue('major');
  });

  test('shows a graceful error banner when the AI service is offline', async ({ page }) => {
    const createCalls = [];

    await installApiMocks(page, [
      { method: 'GET', pattern: /\/api\/bugs$/, json: { data: [] } },
      { method: 'GET', pattern: /\/api\/users$/, json: { data: [] } },
      {
        method: 'POST',
        pattern: /\/api\/bugs\/ai-triage$/,
        status: 503,
        json: { error: 'AI service offline' },
      },
      {
        method: 'POST',
        pattern: /\/api\/bugs$/,
        json: async ({ request }) => {
          createCalls.push(await request.postDataJSON());
          return { data: { id: 2, title: 'Manual report' } };
        },
      },
    ]);

    await page.goto('/bugs');
    await page.getByRole('button', { name: /report bug/i }).click();

    await page.getByLabel('Title').fill('Manual report of a crash');
    await page
      .getByLabel('Description')
      .fill('The application crashes when the user opens settings.');

    await page.getByTestId('ai-triage-button').click();

    await expect(page.getByTestId('ai-triage-error')).toContainText(/ai service offline/i);

    // The manual flow is not blocked: the user can still pick a priority and submit.
    await page.locator('#bug-priority').selectOption('high');
    await page.getByRole('button', { name: /create bug/i }).click();

    await expect.poll(() => createCalls.length).toBe(1);
    expect(createCalls[0]).toMatchObject({ priority: 'high' });
  });
});
