import { expect, test } from '@playwright/test';
import { waitForFiscalContext } from './support/auth';

test('ranking dos 184 municípios mantém poucas linhas no DOM durante o scroll', async ({
  page,
}, testInfo) => {
  await page.route(/\/uf\/23\/ranking(?:\?|$)/, async (route) => {
    const response = await route.fetch();
    const real = await response.json();
    const template = real.itens?.[0] ?? {
      cod_ibge: '2304400',
      nome: 'Fortaleza',
      regiao: 'Fortaleza',
      porte: 'grande',
      populacao: 2_428_678,
      valor_pct: 47.21,
      valor_rs: null,
      faixa: 'normal',
      cor: 'verde',
      posicao: 1,
      percentil: 100,
      destaque: false,
      no_escopo: true,
    };
    const itens = Array.from({ length: 184 }, (_, index) => ({
      ...template,
      cod_ibge: String(2_300_001 + index),
      nome: `Município de desempenho ${String(index + 1).padStart(3, '0')}`,
      posicao: index + 1,
      percentil: Number((((183 - index) / 183) * 100).toFixed(2)),
      valor_pct: Number((30 + index * 0.12).toFixed(2)),
    }));
    await route.fulfill({
      response,
      json: {
        ...real,
        n_total: 184,
        n_com_valor: 184,
        itens,
      },
    });
  });

  await page.goto('/dashboard');
  await waitForFiscalContext(page);
  await page.goto('/carteira');
  await expect(page.locator('[data-screen-label="Carteira & Visão Estadual"]')).toBeVisible();

  // O ente padrão é Fortaleza; a Visão UF expõe os 184 municípios do Ceará.
  const region = page.getByRole('region', { name: 'Ranking municipal com 184 entes' });
  await expect(region).toBeVisible();
  const grid = region.getByRole('grid');
  await expect(grid).toHaveAttribute('aria-rowcount', '185');

  const rows = grid.locator('tbody > tr');
  const initialDomRows = await rows.count();
  expect(initialDomRows).toBeLessThan(50);

  const metrics = await region.locator('.virtualized-table__viewport').evaluate(
    async (viewport) => {
      const start = performance.now();
      const target = viewport.scrollHeight - viewport.clientHeight;
      let frames = 0;
      let lastFrame: number | null = null;
      const frameIntervals: number[] = [];
      const workDurations: number[] = [];

      await new Promise<void>((resolve) => {
        const step = (timestamp: number) => {
          if (lastFrame !== null) frameIntervals.push(timestamp - lastFrame);
          lastFrame = timestamp;
          frames += 1;
          const progress = Math.min(1, frames / 24);
          const workStart = performance.now();
          viewport.scrollTop = target * progress;
          viewport.dispatchEvent(new Event('scroll', { bubbles: true }));
          workDurations.push(performance.now() - workStart);
          if (progress < 1) requestAnimationFrame(step);
          else requestAnimationFrame(() => resolve());
        };
        requestAnimationFrame(step);
      });

      const durationMs = performance.now() - start;
      const sortedIntervals = [...frameIntervals].sort((a, b) => a - b);
      const p95Index = Math.max(0, Math.ceil(sortedIntervals.length * 0.95) - 1);
      const sortedWork = [...workDurations].sort((a, b) => a - b);
      const p95WorkIndex = Math.max(0, Math.ceil(sortedWork.length * 0.95) - 1);
      return {
        durationMs: Number(durationMs.toFixed(2)),
        frames,
        frameIntervals: frameIntervals.map((interval) => Number(interval.toFixed(2))),
        workDurations: workDurations.map((duration) => Number(duration.toFixed(2))),
        averageFps: Number(((frameIntervals.length * 1000) / durationMs).toFixed(2)),
        p95FrameMs: Number((sortedIntervals[p95Index] ?? 0).toFixed(2)),
        p95WorkMs: Number((sortedWork[p95WorkIndex] ?? 0).toFixed(2)),
        finalScrollTop: viewport.scrollTop,
        scrollHeight: viewport.scrollHeight,
        clientHeight: viewport.clientHeight,
      };
    },
  );

  expect(metrics.frames).toBeGreaterThan(0);
  expect(metrics.finalScrollTop).toBeGreaterThan(0);
  await expect.poll(() => rows.count()).toBeLessThan(50);
  await expect
    .poll(async () => {
      const indexes = await grid
        .locator('tbody > tr[aria-rowindex]')
        .evaluateAll((items) => items.map((item) => Number(item.getAttribute('aria-rowindex'))));
      return Math.max(...indexes);
    })
    .toBe(185);

  await testInfo.attach('virtualization-metrics.json', {
    body: Buffer.from(
      JSON.stringify(
        {
          totalDataRows: 184,
          ariaRowCount: 185,
          initialDomRows,
          finalDomRows: await rows.count(),
          ...metrics,
        },
        null,
        2,
      ),
    ),
    contentType: 'application/json',
  });
  await testInfo.attach('virtualization-ranking-final.png', {
    body: await region.screenshot(),
    contentType: 'image/png',
  });

  // O agendamento RAF do Chrome headless varia com a máquina da CI. O gate vinculante
  // mede o trabalho síncrono causado por cada frame: p95 deve usar no máximo 12 dos
  // 16,67 ms disponíveis a 60 Hz. FPS/intervalos continuam anexados para observabilidade.
  expect(metrics.p95WorkMs).toBeLessThanOrEqual(12);
});
