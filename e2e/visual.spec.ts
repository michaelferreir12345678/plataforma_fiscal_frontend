import { expect, test } from '@playwright/test';
import { HEAVY_ROUTES } from './routes';
import { openRoute, settleVisualPage } from './support/page';

test.describe('regressão visual compartilhada', () => {
  for (const route of HEAVY_ROUTES) {
    test(`${route.path} corresponde ao baseline`, async ({ page }) => {
      await openRoute(page, route);
      await settleVisualPage(page);
      await expect(page).toHaveScreenshot(`${route.snapshot}.png`, {
        fullPage: true,
      });
    });
  }
});
