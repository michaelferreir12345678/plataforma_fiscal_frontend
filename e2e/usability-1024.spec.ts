import { expect, test } from '@playwright/test';
import { waitForFiscalContext } from './support/auth';

test('1024px: shell, skip link, tabs, drill e diálogo funcionam por teclado', async ({
  page,
}) => {
  await page.goto('/dashboard');
  expect(page.viewportSize()).toEqual({ width: 1024, height: 768 });
  await waitForFiscalContext(page);

  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Pular para o conteúdo' });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#conteudo-principal')).toBeFocused();

  const expand = page.getByRole('button', { name: 'Expandir menu lateral' });
  await expand.focus();
  await page.keyboard.press('Enter');
  const collapse = page.getByRole('button', { name: 'Recolher menu lateral' });
  await expect(collapse).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Expandir menu lateral' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );

  const carteiraLink = page.locator('a[href="/carteira"]');
  await carteiraLink.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/carteira$/);
  const estadual = page.getByRole('tab', { name: 'Ente estadual' });
  await estadual.focus();
  await page.keyboard.press('Space');
  await expect(estadual).toHaveAttribute('aria-selected', 'true');
  const consolidado = page.getByRole('tab', { name: 'Consolidado UF' });
  await consolidado.focus();
  await page.keyboard.press('Enter');
  await expect(consolidado).toHaveAttribute('aria-selected', 'true');

  await page.goto('/receita');
  await expect(page.locator('[data-screen-label="Detalhe · Receita"]')).toBeVisible();
  const drill = page.getByTitle('Abrir o nível seguinte').first();
  await drill.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Caminho da hierarquia').getByRole('button')).toHaveCount(2);

  const memoryTrigger = page.getByRole('button', { name: /Memória de cálculo/ }).first();
  await memoryTrigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Memória de cálculo · Receita' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Fechar diálogo' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(memoryTrigger).toBeFocused();
});
