import { expect, type Page } from '@playwright/test';

export const AUTH_STATE = '.playwright/auth/user.json';
export const EMPTY_STORAGE = { cookies: [], origins: [] };

export function testCredentials(): { email: string; password: string } {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'Defina E2E_EMAIL e E2E_PASSWORD em .env.e2e ou no cofre de segredos da CI. ' +
        'Use exclusivamente uma conta administrativa de teste.',
    );
  }
  return { email, password };
}

export async function loginViaUi(page: Page): Promise<void> {
  const { email, password } = testCredentials();
  await page.goto('/dashboard');

  const form = page.locator('form');
  await expect(form).toBeVisible();
  await form.locator('input').first().fill(email);
  await form.locator('input[type="password"]').fill(password);
  await form.getByRole('button', { name: 'Entrar' }).click();

  await page.waitForFunction(() => Boolean(localStorage.getItem('prumo_token')));
  await expect(page.locator('[data-screen-label="Cockpit Executivo"]')).toBeVisible();
  await waitForFiscalContext(page);
}

export async function waitForFiscalContext(page: Page): Promise<void> {
  const periodSelector = page.getByRole('button', { name: 'Selecionar período' });
  await expect(periodSelector).toBeVisible();
  await expect(periodSelector).not.toContainText(/…|—/, { timeout: 60_000 });
}
