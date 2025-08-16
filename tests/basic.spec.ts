import { test, expect } from '@playwright/test';

test('basic page load test', async ({ page }) => {
  // Test that the home page loads
  await page.goto('/');
  await expect(page).toHaveTitle(/EverWell/);
});

test('login page loads', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('h1')).toContainText('Sign in');
});

test('metrics page redirects to login when not authenticated', async ({ page }) => {
  await page.goto('/metrics');
  // Should redirect to login
  await expect(page).toHaveURL(/\/login/);
});
