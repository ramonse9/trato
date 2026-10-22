import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), '../..');
const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('TEST_DATABASE_URL es obligatoria para las pruebas de navegador.');
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4300',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-movil',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: [
    {
      name: 'API',
      command: 'npm run start:api:prod',
      cwd: root,
      url: 'http://127.0.0.1:3100/api/health',
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        API_PORT: '3100',
        WEB_ORIGIN: 'http://127.0.0.1:4300',
        TZ: 'America/Mazatlan',
        DATABASE_URL: databaseUrl,
      },
    },
    {
      name: 'Web',
      command: 'npm run start:e2e --workspace @trato/web',
      cwd: root,
      url: 'http://127.0.0.1:4300/login',
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
