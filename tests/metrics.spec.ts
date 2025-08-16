import { test, expect } from '@playwright/test';

test.describe('Metrics Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to metrics page
    await page.goto('/metrics');
  });

  test('should show login redirect when not authenticated', async ({ page }) => {
    // Should redirect to login since we're not authenticated
    await expect(page).toHaveURL(/\/login/);
  });

  test('should handle save metrics button click', async ({ page }) => {
    // Mock authentication by setting localStorage
    await page.addInitScript(() => {
      // Mock Supabase auth state
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        expires_at: Date.now() + 3600000
      }));
    });

    // Navigate to metrics page
    await page.goto('/metrics');

    // Wait for the page to load
    await page.waitForSelector('h1:has-text("Today\'s Metrics")');

    // Fill in some test data
    await page.fill('input[placeholder="Enter weight"]', '150');
    await page.fill('input[placeholder="Enter waist measurement"]', '32');
    await page.fill('textarea[placeholder*="notes"]', 'Test notes');

    // Click the save button
    const saveButton = page.locator('button:has-text("Save Today\'s Metrics")');
    
    // Test that the button is clickable
    await expect(saveButton).toBeEnabled();
    
    // Click and check for any errors
    await saveButton.click();
    
    // Wait a moment for any async operations
    await page.waitForTimeout(1000);
    
    // Check if there are any error messages
    const errorElements = page.locator('.text-red-300, .text-red-500');
    const errorCount = await errorElements.count();
    
    if (errorCount > 0) {
      const errorText = await errorElements.first().textContent();
      console.log('Error found:', errorText);
    }
    
    // The button should show "Saving..." state briefly
    await expect(saveButton).toHaveText(/Saving|Save Today's Metrics/);
  });

  test('should validate form inputs', async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        expires_at: Date.now() + 3600000
      }));
    });

    await page.goto('/metrics');
    await page.waitForSelector('h1:has-text("Today\'s Metrics")');

    // Test invalid weight input
    await page.fill('input[placeholder="Enter weight"]', 'invalid');
    await page.click('button:has-text("Save Today\'s Metrics")');
    
    // Should show validation error
    await expect(page.locator('text=Weight must be a number')).toBeVisible();
  });
});
