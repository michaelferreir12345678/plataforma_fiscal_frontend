import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.e2e', override: false, quiet: true });

if (process.env.E2E_API_BASE_URL && !process.env.VITE_API_BASE_URL) {
  process.env.VITE_API_BASE_URL = process.env.E2E_API_BASE_URL;
}

const externalBaseUrl = process.env.E2E_BASE_URL;
const baseURL = externalBaseUrl ?? 'http://localhost:5173';
const authState = '.playwright/auth/user.json';

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  // As jornadas compartilham o mesmo backend de homologação e fazem leituras pesadas.
  // Serial evita transformar contenção do ambiente em falso negativo de interface.
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: Number(process.env.E2E_WORKERS || 1),
  timeout: 90_000,
  expect: {
    timeout: 30_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.01,
    },
  },
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    locale: 'pt-BR',
    timezoneId: 'America/Fortaleza',
    colorScheme: 'light',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // Serve o **bundle de produção**, não o dev server. Acessibilidade e desempenho são
  // medidos no artefato que o gestor recebe; o Vite em modo dev compila módulo a módulo
  // sob demanda e transformava latência de ferramenta em falso negativo de a11y.
  webServer: externalBaseUrl
    ? undefined
    : {
        command: 'npm run build && npx vite preview --host 127.0.0.1 --port 5173 --strictPort',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      testIgnore: /usability-1024\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: authState,
      },
      dependencies: ['setup'],
    },
    {
      name: 'usability-1024',
      testMatch: /usability-1024\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 },
        storageState: authState,
        video: 'on',
      },
      dependencies: ['setup'],
    },
  ],
});
