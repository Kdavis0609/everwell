import { test, expect } from '@playwright/test';

test.describe('CSV Import/Export', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    // Navigate to the import/export page
    await page.goto('/tools/import-export');
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByText('Welcome to EverWell')).toBeVisible();
  });

  test('should show login page with proper authentication', async ({ page }) => {
    // Navigate to the import/export page
    await page.goto('/tools/import-export');
    
    // Should be on login page
    await expect(page).toHaveURL(/.*\/login/);
    
    // Check that login page has proper elements
    await expect(page.getByText('Welcome to EverWell')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Magic Link' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Email & Password' })).toBeVisible();
  });
});
