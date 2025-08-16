import { test, expect } from '@playwright/test';

test('Save Today\'s Metrics button should work without errors', async ({ page }) => {
  // Mock authentication
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

  // Fill in test data
  await page.fill('input[placeholder="Enter weight"]', '150');
  await page.fill('input[placeholder="Enter waist measurement"]', '32');
  await page.fill('textarea[placeholder*="notes"]', 'Test notes for bug fix');

  // Click the save button
  const saveButton = page.locator('button:has-text("Save Today\'s Metrics")');
  
  // Verify button is enabled
  await expect(saveButton).toBeEnabled();
  
  // Click the button
  await saveButton.click();
  
  // Wait for any async operations
  await page.waitForTimeout(2000);
  
  // Check for any error messages
  const errorElements = page.locator('.text-red-300, .text-red-500, [class*="red"]');
  const errorCount = await errorElements.count();
  
  if (errorCount > 0) {
    const errorText = await errorElements.first().textContent();
    console.log('Error found:', errorText);
    throw new Error(`Found error: ${errorText}`);
  }
  
  // Verify no errors occurred
  expect(errorCount).toBe(0);
  
  // The button should be in a valid state
  await expect(saveButton).toBeEnabled();
});
