// Playwright config pro visual regression + a11y testy.
// Spuštění:
//   npm run test:e2e                — všechny tests, 3 viewporty
//   npm run test:e2e -- --update-snapshots — přijmout nový baseline
//   npm run test:e2e:a11y           — jen a11y axe scans

import { defineConfig, devices } from '@playwright/test';

const port = 8080;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,

  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  // Všechny projekty běží na chromiu (CI instaluje pouze chromium). Mobilní /
  // tabletový rozměr se simuluje šířkou viewportu (spouští responzivní CSS
  // breakpointy); DPR=1 drží snapshoty stabilní napříč prostředími.
  projects: [
    { name: 'mobile',  use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
    { name: 'tablet',  use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],

  webServer: {
    command: `npx http-server . -p ${port} -c-1 --silent`,
    port,
    timeout: 30_000,
    reuseExistingServer: !process.env.CI,
  },

  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    },
  },
});
