import { test, expect } from '@playwright/test';

test('Tailwind utilities apply on the landing route', async ({ page }) => {
  await page.goto('/');
  // Inject a probe div that uses Tailwind utilities; then assert computed CSS.
  await page.evaluate(() => {
    const el = document.createElement('div');
    el.id = 'tw-probe';
    el.className = 'w-10 h-10 bg-blue-500 rounded-lg shadow';
    document.body.appendChild(el);
  });
  const probe = page.locator('#tw-probe');
  await expect(probe).toHaveCSS('width', '40px');
  await expect(probe).toHaveCSS('height', '40px');
  // Color assertion: allow rgb, lab, or hsl formats that modern browsers might return
  const bg = await probe.evaluate((n) => getComputedStyle(n).backgroundColor);
  test.expect(bg).toMatch(/(rgb|lab|hsl)\(/); // we only need it to be a resolved color, not transparent
});
