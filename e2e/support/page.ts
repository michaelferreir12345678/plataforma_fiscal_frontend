import { expect, type Page } from '@playwright/test';
import type { AppRoute } from '../routes';
import { waitForFiscalContext } from './auth';

export async function openRoute(page: Page, route: AppRoute): Promise<void> {
  await page.goto(route.path);
  await expect(page.locator(`[data-screen-label="${route.screen}"]`)).toBeVisible();
  await waitForFiscalContext(page);

  const hasPolling = route.path === '/central-dados' || route.path === '/relatorios';
  const networkSettled = page.waitForLoadState('networkidle', { timeout: 30_000 });
  if (hasPolling) await networkSettled.catch(() => undefined);
  else await networkSettled;

  const contentSettled = expect
    .poll(() => page.locator('[aria-busy="true"]').count(), {
      message: `${route.path} ainda contém blocos em carregamento`,
      timeout: 30_000,
    })
    .toBe(0);
  if (hasPolling) await contentSettled.catch(() => undefined);
  else await contentSettled;
}

/** Reduz ruído visual sem substituir dados reais nem interceptar a API. */
export async function settleVisualPage(page: Page): Promise<void> {
  await page
    .waitForLoadState('networkidle', { timeout: 5_000 })
    .catch(() => undefined);
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
    `,
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}
