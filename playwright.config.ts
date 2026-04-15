import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5177',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'brave',
      use: {
        headless: true,
        viewport: { width: 1280, height: 720 },
        executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
        },
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5177',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
