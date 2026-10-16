import { test, expect } from '@playwright/test';
import { installApiMocks } from './apiMocks.js';

test.describe('Bug report form validation', () => {
  test('blocks submission and shows inline field errors for empty fields', async ({ page }) => {
    const createCalls = [];

    await installApiMocks(page, [
      { method: 'GET', pattern: /\/api\/bugs$/, json: { data: [] } },
      { method: 'GET', pattern: /\/api\/users$/, json: { data: [] } },
      {
        method: 'POST',
        pattern: /\/api\/bugs$/,
        json: async ({ request }) => {
          createCalls.push(await request.postDataJSON());
          return { data: { id: 1, title: 'unexpected' } };
        },
      },
    ]);

    await page.goto('/bugs');
    await page.getByRole('button', { name: /report bug/i }).click();

    await expect(page.getByRole('dialog', { name: /report a bug/i })).toBeVisible();

    await page.getByRole('button', { name: /create bug/i }).click();

    const inlineError = page.getByRole('alert');
    await expect(inlineError).toHaveText(/title is required/i);

    // Submission was blocked: no request reached the API and the modal stays open.
    expect(createCalls).toHaveLength(0);
    await expect(page.getByRole('dialog', { name: /report a bug/i })).toBeVisible();
  });

  test('clears the inline error once a title is provided', async ({ page }) => {
    const createCalls = [];

    await installApiMocks(page, [
      { method: 'GET', pattern: /\/api\/bugs$/, json: { data: [] } },
      { method: 'GET', pattern: /\/api\/users$/, json: { data: [] } },
      {
        method: 'POST',
        pattern: /\/api\/bugs$/,
        json: async ({ request }) => {
          createCalls.push(await request.postDataJSON());
          return { data: { id: 1, title: 'Login' } };
        },
      },
    ]);

    await page.goto('/bugs');
    await page.getByRole('button', { name: /report bug/i }).click();
    await page.getByRole('button', { name: /create bug/i }).click();
    await expect(page.getByRole('alert')).toHaveText(/title is required/i);

    await page.getByLabel('Title').fill('Login button does nothing');
    await expect(page.getByRole('alert')).toHaveCount(0);

    await page.getByRole('button', { name: /create bug/i }).click();

    await expect.poll(() => createCalls.length).toBe(1);
    expect(createCalls[0]).toMatchObject({ title: 'Login button does nothing' });
  });
});
