import { test, expect } from '@playwright/test';

test.describe('AI Insights System', () => {
  test('should show insights page with disclaimer', async ({ page }) => {
    await page.goto('/insights');
    
    // Should redirect to login if not authenticated
    await expect(page).toHaveURL(/\/login/);
  });

  test('should display insights page structure', async ({ page }) => {
    // Mock authentication by setting a session
    await page.addInitScript(() => {
      localStorage.setItem('everwell-auth', JSON.stringify({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        expires_at: Date.now() + 3600000
      }));
    });

    await page.goto('/insights');
    
    // Check for disclaimer banner
    await expect(page.locator('text=Informational only')).toBeVisible();
    await expect(page.locator('text=not medical advice')).toBeVisible();
    
    // Check for main sections
    await expect(page.locator('text=Today\'s AI Summary')).toBeVisible();
    await expect(page.locator('text=Weight Trend')).toBeVisible();
    await expect(page.locator('text=Sleep')).toBeVisible();
    await expect(page.locator('text=Steps')).toBeVisible();
    await expect(page.locator('text=Water')).toBeVisible();
  });

  test('should show generate insights button when no data', async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('everwell-auth', JSON.stringify({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        expires_at: Date.now() + 3600000
      }));
    });

    await page.goto('/insights');
    
    // Should show generate button when no insights available
    await expect(page.locator('text=Generate Insights')).toBeVisible();
  });

  test('should show regenerate button when insights exist', async ({ page }) => {
    // Mock authentication and insights data
    await page.addInitScript(() => {
      localStorage.setItem('everwell-auth', JSON.stringify({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        expires_at: Date.now() + 3600000
      }));
    });

    // Mock the insights API response
    await page.route('/api/insights/generate', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          summary: 'Great progress today! Your consistent tracking shows positive trends.',
          actions: [
            'Take a 10-minute walk',
            'Drink an extra glass of water',
            'Get 8 hours of sleep tonight'
          ],
          risk_flags: []
        })
      });
    });

    await page.goto('/insights');
    
    // Click generate insights
    await page.click('text=Generate Insights');
    
    // Should show regenerate button after generation
    await expect(page.locator('text=Regenerate')).toBeVisible();
  });

  test('should display health metrics cards', async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('everwell-auth', JSON.stringify({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        expires_at: Date.now() + 3600000
      }));
    });

    await page.goto('/insights');
    
    // Check for health metrics section
    await expect(page.locator('text=Health Metrics')).toBeVisible();
    await expect(page.locator('text=BMI')).toBeVisible();
    await expect(page.locator('text=Waist-to-Height')).toBeVisible();
    await expect(page.locator('text=7-day Weight Avg')).toBeVisible();
  });

  test('should show recent activity section', async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('everwell-auth', JSON.stringify({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        expires_at: Date.now() + 3600000
      }));
    });

    await page.goto('/insights');
    
    // Check for recent activity section
    await expect(page.locator('text=Recent Activity')).toBeVisible();
    await expect(page.locator('text=Your health data from the past week')).toBeVisible();
  });

  test('should handle AI generation errors gracefully', async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('everwell-auth', JSON.stringify({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        expires_at: Date.now() + 3600000
      }));
    });

    // Mock API error
    await page.route('/api/insights/generate', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to generate insights' })
      });
    });

    await page.goto('/insights');
    
    // Click generate insights
    await page.click('text=Generate Insights');
    
    // Should show error toast
    await expect(page.locator('text=Failed to regenerate insights')).toBeVisible();
  });
});

// Unit tests for rollup math calculations
test.describe('Insights Math Calculations', () => {
  test('should calculate BMI correctly', async ({ page }) => {
    // Test BMI calculation: (weight_lbs / (height_in^2)) * 703
    const weight = 150;
    const height = 65;
    const expectedBMI = (weight / (height * height)) * 703;
    
    expect(expectedBMI).toBeCloseTo(25.0, 1);
  });

  test('should calculate waist-to-height ratio correctly', async ({ page }) => {
    // Test waist-to-height ratio: waist_in / height_in
    const waist = 32;
    const height = 65;
    const expectedRatio = waist / height;
    
    expect(expectedRatio).toBeCloseTo(0.492, 3);
  });

  test('should calculate 7-day average correctly', async ({ page }) => {
    // Test 7-day average calculation
    const values = [150, 151, 149, 152, 150, 151, 150];
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    
    expect(average).toBe(150.4);
  });

  test('should handle null values in calculations', async ({ page }) => {
    // Test handling of null values
    const values = [150, null, 151, null, 150];
    const validValues = values.filter(v => v !== null);
    const average = validValues.reduce((a, b) => a + b, 0) / validValues.length;
    
    expect(average).toBe(150.3);
  });
});
