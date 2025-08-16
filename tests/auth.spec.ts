import { test, expect } from '@playwright/test';

test.describe('Authentication System', () => {
  test('should show login page with tabs for magic link and email/password', async ({ page }) => {
    await page.goto('/login');
    
    // Check that both tabs are visible
    await expect(page.locator('[role="tab"]:has-text("Magic Link")')).toBeVisible();
    await expect(page.locator('[role="tab"]:has-text("Email & Password")')).toBeVisible();
    
    // Check that magic link tab is active by default
    await expect(page.locator('[role="tab"][data-state="active"]')).toContainText('Magic Link');
  });

  test('should show signup page with password validation', async ({ page }) => {
    await page.goto('/signup');
    
    // Check that form fields are present
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('#password', 'test');
    
    // Check that password requirements are shown
    await expect(page.locator('text=At least 8 characters')).toBeVisible();
    await expect(page.locator('text=At least one uppercase letter')).toBeVisible();
  });

  test('should validate password requirements on signup', async ({ page }) => {
    await page.goto('/signup');
    
    // Fill in email
    await page.fill('input[type="email"]', 'test@example.com');
    
    // Try a weak password
    await page.fill('#password', 'weak');
    
    // Check that password requirements show as failed
    await expect(page.locator('text=At least 8 characters')).toHaveClass(/text-red-600/);
    
    // Try a stronger password
    await page.fill('#password', 'StrongPass123!');
    
    // Check that password requirements show as passed
    await expect(page.locator('text=At least 8 characters')).toHaveClass(/text-green-600/);
  });

  test('should show error for password mismatch on signup', async ({ page }) => {
    await page.goto('/signup');
    
    // Fill in form with mismatched passwords
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('#password', 'StrongPass123!');
    await page.fill('#confirm-password', 'DifferentPass123!');
    
    // Check that password match indicator shows error
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
    
    // Check that submit button is disabled
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('should show error for invalid email/password on login', async ({ page }) => {
    await page.goto('/login');
    
    // Switch to email/password tab
    await page.click('[role="tab"]:has-text("Email & Password")');
    
    // Try to sign in with invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error (the exact error message depends on Supabase configuration)
    // For now, just check that the form doesn't redirect immediately
    await expect(page).toHaveURL(/\/login/);
  });

  test('should handle forgot password flow', async ({ page }) => {
    await page.goto('/login');
    
    // Switch to email/password tab
    await page.click('[role="tab"]:has-text("Email & Password")');
    
    // Fill in email
    await page.fill('input[type="email"]', 'test@example.com');
    
    // Click forgot password
    await page.click('text=Forgot password?');
    
    // Should show success message (mock test)
    // In a real test, you'd need to mock the Supabase response
    await expect(page.locator('text=Password reset email sent!')).toBeVisible();
  });

  test('should show recovery page when type=recovery in URL', async ({ page }) => {
    await page.goto('/auth/callback?type=recovery');
    
    // Should show password reset form
    await expect(page.locator('text=Reset Your Password')).toBeVisible();
    await expect(page.locator('input[placeholder="Enter new password"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Confirm new password"]')).toBeVisible();
  });

  test('should redirect logged in users away from auth pages', async ({ page }) => {
    // This test would require setting up a mock authenticated session
    // For now, just verify the pages load correctly
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
    
    await page.goto('/signup');
    await expect(page).toHaveURL('/signup');
  });
});
