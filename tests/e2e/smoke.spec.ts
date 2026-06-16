import { test, expect } from '@playwright/test';

test('app loads and shows TSP Simulator', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'TSP Simulator' })).toBeVisible();
  await expect(page.getByTestId('status')).toBeVisible();
});

test('control panel has all inputs', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Nodes')).toBeVisible();
  await expect(page.getByLabel('Algorithm')).toBeVisible();
  await expect(page.getByText('Symmetric', { exact: true })).toBeVisible();
  await expect(page.getByText('Cycle', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Weight min')).toBeVisible();
  await expect(page.getByLabel('Weight max')).toBeVisible();
  await expect(page.getByLabel('Seed')).toBeVisible();
});

test('can start a simulation and reach completed state', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Nodes').fill('5');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByTestId('status')).toHaveText('completed', { timeout: 10_000 });
  await expect(page.getByText(/Best tour/)).toBeVisible();
});

test('preset button loads a graph', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '5-node star' }).click();
  await expect(page.getByTestId('status')).toHaveText('ready');
});

test('running different algorithms produces results', async ({ page }) => {
  await page.goto('/');
  for (const algo of ['Brute Force', 'Branch & Bound', 'Nearest Neighbor']) {
    await page.getByLabel('Nodes').fill('5');
    await page.getByLabel('Algorithm').selectOption(algo);
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByTestId('status')).toHaveText('completed', { timeout: 10_000 });
  }
});

test('switching to Held-Karp works on small graph', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Nodes').fill('6');
  await page.getByLabel('Algorithm').selectOption('Held-Karp DP');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByTestId('status')).toHaveText('completed', { timeout: 15_000 });
});

test('force-layout path works for n > 8 (nearest neighbor)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/');
  await page.getByLabel('Nodes').fill('15');
  await page.getByLabel('Algorithm').selectOption('Nearest Neighbor');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByTestId('status')).toHaveText('completed', { timeout: 10_000 });
  expect(errors).toEqual([]);
});

test('force-layout path works for n > 8 (held-karp)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/');
  await page.getByLabel('Nodes').fill('10');
  await page.getByLabel('Algorithm').selectOption('Held-Karp DP');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByTestId('status')).toHaveText('completed', { timeout: 20_000 });
  expect(errors).toEqual([]);
});

test('circular-layout path works for n <= 8', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/');
  await page.getByLabel('Nodes').fill('7');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByTestId('status')).toHaveText('completed', { timeout: 10_000 });
  expect(errors).toEqual([]);
});

test('preset + Start does not throw', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/');
  await page.getByRole('button', { name: '5-node star' }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByTestId('status')).toHaveText('completed', { timeout: 10_000 });
  expect(errors).toEqual([]);
});

test('nearest neighbor on n=15 (force layout) does not throw', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/');
  await page.getByLabel('Nodes').fill('15');
  await page.getByLabel('Algorithm').selectOption('Nearest Neighbor');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByTestId('status')).toHaveText('completed', { timeout: 10_000 });
  expect(errors).toEqual([]);
});
