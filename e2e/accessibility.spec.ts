import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { APP_ROUTES } from './routes';
import { openRoute } from './support/page';

test.describe('axe WCAG 2.2 nas 18 rotas', () => {
  for (const route of APP_ROUTES) {
    test(`${route.path} não possui violações axe`, async ({ page }, testInfo) => {
      await openRoute(page, route);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      await testInfo.attach(`axe-${route.snapshot}`, {
        body: Buffer.from(JSON.stringify(results, null, 2)),
        contentType: 'application/json',
      });

      expect(
        results.violations,
        results.violations
          .map(
            (violation) =>
              `${violation.id} (${violation.impact ?? 'sem impacto'}): ${violation.nodes.length} ocorrência(s)`,
          )
          .join('\n'),
      ).toEqual([]);
    });
  }
});
