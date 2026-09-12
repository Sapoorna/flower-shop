const { test, expect } = require('@playwright/test');
test('Register, filter, quantities, COD checkout, profile and logout', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/signup.html');
  await page.getByLabel('First name', { exact: true }).fill('Browser');
  await page.getByLabel('Last name', { exact: true }).fill('Tester');
  await page.getByLabel('Email address', { exact: true }).fill(`browser-${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill('browser testing password');
  await page.getByLabel('Confirm password').fill('browser testing password');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/profile.html/);
  await expect(page.getByText('Hello, Browser.')).toBeVisible();
  await page.goto('/shop.html');
  await expect(page.locator('.product-card')).toHaveCount(6);
  await page.getByRole('button', { name: 'Lilies', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(1);
  await expect(page.locator('.product-card h3')).toHaveText('White lilies');
  await page.getByRole('button', { name: 'Increase quantity of White lilies' }).click();
  await page.getByRole('button', { name: 'Add White lilies to bag' }).click();
  await expect(page.locator('[data-inbag="white-lilies"]')).toHaveText('2 in your bag');
  await expect(page.locator('#bag-count')).toHaveText('2');
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search products' }).fill('zzzz');
  await expect(page.getByText('Nothing here just yet.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.product-card')).toHaveCount(6);
  await page.goto('/cart.html');
  await expect(page.locator('.total dd')).toContainText('10,750');
  await page.getByRole('button', { name: 'Decrease quantity of White lilies' }).click();
  await expect(page.locator('.total dd')).toContainText('5,550');
  await page.getByRole('link', { name: 'Continue to checkout' }).click();
  await expect(page.locator('#checkout-form')).toBeVisible();
  await expect(page.locator('input[value="card"]')).toBeDisabled();
  await expect(page.locator('input[value="cod"]')).toBeChecked();
  await expect(page.locator('input[autocomplete="cc-number"]')).toHaveCount(0);
  await page.getByLabel('Phone number').fill('0771234567');
  await page.getByLabel('Street address').fill('12 Garden Street');
  await page.getByLabel('City', { exact: true }).fill('Colombo');
  await page.getByLabel('Postal code').fill('10100');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: 'test-results/checkout-mobile.png', fullPage: true });
  await page.getByRole('button', { name: /Place order/ }).click();
  await expect(page).toHaveURL(/profile.html\?order=/);
  await expect(page.getByText('Thank you. Your order is in.')).toBeVisible();
  await expect(page.locator('#bag-count')).toHaveText('0');
  await page.getByText('View order details').click();
  await expect(page.getByText(/12 Garden Street/)).toBeVisible();
  await expect(page.getByText('Cash on delivery · Unpaid')).toBeVisible();
  await page.getByLabel('First name', { exact: true }).fill('New name');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Your details have been saved.')).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/login.html/);
  expect(errors).toEqual([]);
});
test('All pages render without overflow or broken images at mobile and desktop widths', async ({
  page
}) => {
  test.setTimeout(180000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      'index',
      'shop',
      'cafe',
      'gifts',
      'garden',
      'cart',
      'checkout',
      'login',
      'signup',
      'forgot-password',
      'reset-password',
      'profile',
      'help',
      'privacy',
      'credits',
      '404'
    ]) {
      await page.goto(`/${path}.html`);
      await page.waitForFunction(() => !document.querySelector('.loading'));
      await page.evaluate(async () => {
        for (const img of document.images) img.loading = 'eager';
        await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
        await document.fonts.ready;
      });
      const broken = await page
        .locator('img')
        .evaluateAll((imgs) =>
          imgs
            .filter((i) => !i.complete || i.naturalWidth === 0 || i.dataset.fallback)
            .map((i) => i.src)
        );
      expect(broken, `${path} ${width}: broken photos`).toEqual([]);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1
      );
      expect(overflow, `${path} ${width}: horizontal overflow`).toBe(false);
      if (width === 1440 && path === 'index')
        await page.screenshot({
          path: 'test-results/home-desktop.png',
          fullPage: true,
          animations: 'disabled'
        });
      if (width === 375 && path === 'shop')
        await page.screenshot({
          path: 'test-results/shop-mobile.png',
          fullPage: true,
          animations: 'disabled'
        });
    }
  }
  expect(errors).toEqual([]);
});
test('Mobile menu, gift enquiry and unavailable reset have clear behavior', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/gifts.html');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.locator('#navigation')).toHaveClass(/open/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#navigation')).not.toHaveClass(/open/);
  await page.getByLabel('Your name').fill('Gift Tester');
  await page.getByLabel('Email address').fill('gift@example.com');
  await page
    .getByLabel('What do you have in mind?')
    .fill('A white flower bouquet for a birthday please.');
  await page.getByRole('button', { name: 'Send your request' }).click();
  await expect(
    page.getByText('Your request has been received. We will reply by email.')
  ).toBeVisible();
  await page.goto('/forgot-password.html');
  await expect(page.getByRole('button', { name: 'Send reset link' })).toBeDisabled();
  await expect(
    page.getByText('Password reset emails are not available yet. Please try again later.')
  ).toBeVisible();
});
