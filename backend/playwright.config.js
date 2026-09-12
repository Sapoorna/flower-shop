const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  globalTeardown: './tests/teardown.cjs',
  testDir: './tests',
  testMatch: 'store.spec.js',
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5174',
    headless: true,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'node tests/preview.cjs',
    url: 'http://localhost:5174/api/health',
    reuseExistingServer: false,
    timeout: 240000
  },
  reporter: 'list'
});
