const { existsSync } = require('node:fs');
const { chromium } = require('playwright');
const { config: loadEnv } = require('dotenv');

loadEnv({ path: '.env.e2e', override: false, quiet: true });

if (process.env.E2E_API_BASE_URL && !process.env.VITE_API_BASE_URL) {
  process.env.VITE_API_BASE_URL = process.env.E2E_API_BASE_URL;
}

const externalBaseUrl = process.env.E2E_BASE_URL;
const baseUrl = (externalBaseUrl || 'http://localhost:5173').replace(/\/$/, '');
const chromePath = process.env.CHROME_PATH || chromium.executablePath();

if (!existsSync(chromePath)) {
  throw new Error(
    'Chromium não encontrado. Execute `npx playwright install chromium` antes do Lighthouse.',
  );
}

const paths = ['/dashboard', '/carteira', '/patrimonio', '/benchmarking', '/central-dados'];
const collect = {
  url: paths.map((path) => `${baseUrl}${path}`),
  numberOfRuns: process.env.CI ? 3 : 1,
  puppeteerScript: './quality/lighthouse-auth.cjs',
  chromePath,
  puppeteerLaunchOptions: {
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  },
  settings: {
    preset: 'desktop',
    onlyCategories: ['performance', 'accessibility'],
  },
};

if (!externalBaseUrl) {
  collect.startServerCommand =
    'npm run preview -- --host 127.0.0.1 --port 5173 --strictPort';
  collect.startServerReadyPattern = 'Local';
  collect.startServerReadyTimeout = 120_000;
}

module.exports = {
  ci: {
    collect,
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:performance': ['error', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './lighthouse-report',
    },
  },
};
