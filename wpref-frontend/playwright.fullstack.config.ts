import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
  testDir: './e2e/fullstack',
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'powershell -NoProfile -ExecutionPolicy Bypass -File ..\\scripts\\run-fullstack-backend.ps1',
      url: 'http://127.0.0.1:8001/api/docs/',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npx ng serve --host 127.0.0.1 --port 4200',
      url: 'http://127.0.0.1:4200',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
