import { test, expect } from '@playwright/test';
import { installApiMocks } from './apiMocks.js';

const bug = {
  id: 1,
  title: 'Checkout times out under load',
  description: 'Every user sees a timeout when checking out during peak traffic.',
  status: 'open',
  priority: 'high',
  severity: 'major',
  assigned_to: null,
  created_at: '2026-01-01T10:00:00.000Z',
  updated_at: '2026-01-01T10:00:00.000Z',
  comments: [],
};

const users = [
  { id: 7, name: 'Ada Lovelace', role: 'developer' },
  { id: 8, name: 'Alan Turing', role: 'developer' },
];

const suggestions = {
  recommendations: [
    { userId: 7, name: 'Ada Lovelace', matchScore: 95, reason: 'strong match · 4 tickets resolved' },
    { userId: 8, name: 'Alan Turing', matchScore: 71, reason: 'generalist fit · currently unassigned' },
  ],
  source: 'mock',
};

test.describe('AI Assignee recommendation', () => {
  test('lists recommendations, assigns a developer and updates the UI', async ({ page }) => {
    const assignCalls = [];

    await installApiMocks(page, [
      { method: 'GET', pattern: /\/api\/bugs$/, json: { data: [bug] } },
      { method: 'GET', pattern: /\/api\/bugs\/1$/, json: { data: bug } },
      { method: 'GET', pattern: /\/api\/users$/, json: { data: users } },
      { method: 'POST', pattern: /\/api\/bugs\/1\/ai-suggest-assignee$/, json: suggestions },
      {
        method: 'PATCH',
        pattern: /\/api\/bugs\/1\/assign$/,
        json: async ({ request }) => {
          assignCalls.push(await request.postDataJSON());
          return { data: { ...bug, status: 'assigned', assigned_to: 7 } };
        },
      },
    ]);

    await page.goto('/bugs/1');

    await expect(page.getByRole('heading', { name: bug.title })).toBeVisible();
    await expect(page.locator('span.badge').filter({ hasText: /^Open$/ })).toBeVisible();

    await page.getByTestId('ai-suggest-button').click();

    const candidates = page.getByTestId('ai-candidate');
    await expect(candidates).toHaveCount(2);
    await expect(page.getByTestId('ai-match-badge').first()).toHaveText('95% Match');
    const recommendations = page.getByTestId('ai-recommendations');
    await expect(recommendations.getByText('Ada Lovelace')).toBeVisible();
    await expect(recommendations.getByText(/strong match/i)).toBeVisible();

    await page.getByTestId('ai-assign-7').click();

    await expect.poll(() => assignCalls.length).toBe(1);
    expect(assignCalls[0]).toEqual({ assigned_to: 7 });

    await expect(page.locator('#assignee')).toHaveValue('7');
    await expect(page.getByText(/bug assigned successfully/i)).toBeVisible();
    await expect(page.locator('span.badge').filter({ hasText: /^Assigned$/ })).toBeVisible();
  });
});
