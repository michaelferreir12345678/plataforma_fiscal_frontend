import { expect, test } from '@playwright/test';
import { EMPTY_STORAGE, loginViaUi, waitForFiscalContext } from './support/auth';

test.describe('jornadas críticas da Sprint 27', () => {
  test.describe('1. login → cockpit', () => {
    test.use({ storageState: EMPTY_STORAGE });

    test('autentica pela interface e abre o cockpit real', async ({ page }) => {
      await loginViaUi(page);
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.locator('[data-screen-label="Cockpit Executivo"]')).toBeVisible();
    });
  });

  test('2. cockpit → Receita → drill hierárquico', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('[data-screen-label="Cockpit Executivo"]')).toBeVisible();
    await waitForFiscalContext(page);

    await page.locator('a[href="/receita"]').click();
    await expect(page).toHaveURL(/\/receita$/);
    await expect(page.locator('[data-screen-label="Detalhe · Receita"]')).toBeVisible();
    await expect(page.getByText(/árvore navegável/i)).toBeVisible();

    const proximoNivel = page.getByTitle('Abrir o nível seguinte').first();
    await expect(proximoNivel).toBeVisible();
    await proximoNivel.click();
    await expect(page.getByLabel('Caminho da hierarquia').getByRole('button')).toHaveCount(2);
  });

  test('3. Carteira / Visão UF → interação no ranking', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForFiscalContext(page);
    await page.locator('a[href="/carteira"]').click();
    await expect(page).toHaveURL(/\/carteira$/);
    await expect(page.locator('[data-screen-label="Carteira & Visão Estadual"]')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Consolidado UF' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByText('Ranking municipal')).toBeVisible();

    const ranking = page.getByRole('region', { name: /Ranking municipal com \d+ entes/ });
    const primeiroMunicipio = ranking.getByRole('button').first();
    await expect(primeiroMunicipio).toBeVisible();
    await primeiroMunicipio.click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('[data-screen-label="Cockpit Executivo"]')).toBeVisible();
  });

  test('4. Central de Dados → catálogo e jobs sem mutação', async ({ page }) => {
    await page.goto('/dashboard');
    await page.locator('a[href="/central-dados"]').click();
    await expect(page).toHaveURL(/\/central-dados$/);
    await expect(page.locator('[data-screen-label="Central de Dados"]')).toBeVisible();

    await page.getByRole('tab', { name: 'Catálogo de fontes' }).click();
    await expect(page.getByRole('tabpanel', { name: 'Catálogo de fontes' })).toBeVisible();
    await page.getByRole('tab', { name: 'Jobs de ingestão' }).click();
    await expect(page.getByLabel('Filtrar jobs por status')).toBeVisible();
  });

  test('5. Relatórios → geração isolada e consulta do histórico', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForFiscalContext(page);
    await page.locator('a[href="/relatorios"]').click();
    await expect(page).toHaveURL(/\/relatorios$/);
    await expect(page.locator('[data-screen-label="Relatórios e Exportação"]')).toBeVisible();
    await expect(page.getByText('Histórico real de relatórios')).toBeVisible();

    const postRelatorio = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/relatorios\/?$/.test(new URL(response.url()).pathname),
    );
    await page.getByRole('button', { name: 'Gerar relatório' }).click();
    const response = await postRelatorio;
    expect(response.ok()).toBeTruthy();
    await expect(page.getByText(/relatório\(s\) enfileirado\(s\) com dados reais/i)).toBeVisible();
    await expect(page.getByText('Fila / lote')).toBeVisible();
  });
});
