/**
 * A base da API pode ser **absoluta** (dev: `http://localhost:8000`) ou **relativa**
 * (produção atrás de proxy reverso: `/api`, mesma origem, sem CORS).
 *
 * `new URL(base + path)` só aceita base absoluta: com `/api` toda tela quebrava em
 * `Failed to construct 'URL': Invalid URL`. O teste fixa os dois modos porque o defeito
 * só aparece no ambiente que ninguém roda em desenvolvimento.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

async function comBase(base: string) {
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE_URL', base);
  return import('../services/api');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('montarUrl', () => {
  it('resolve base relativa contra a origem da página (produção atrás do proxy)', async () => {
    const { montarUrl } = await comBase('/api');
    // jsdom serve a página em http://localhost:3000 por padrão do vitest.
    expect(montarUrl('/entes')).toBe(`${window.location.origin}/api/entes`);
  });

  it('preserva base absoluta (desenvolvimento apontando direto para a API)', async () => {
    const { montarUrl } = await comBase('http://localhost:8000');
    expect(montarUrl('/entes')).toBe('http://localhost:8000/entes');
  });

  it('acrescenta query params e ignora nulos', async () => {
    const { montarUrl } = await comBase('/api');
    const url = new URL(montarUrl('/entes', { periodo: '2025-B6', page: 2, uf: null }));
    expect(url.pathname).toBe('/api/entes');
    expect(url.searchParams.get('periodo')).toBe('2025-B6');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.has('uf')).toBe(false);
  });

  it('não duplica a barra quando a base termina com uma', async () => {
    const { montarUrl } = await comBase('/api/');
    expect(montarUrl('/entes')).toBe(`${window.location.origin}/api/entes`);
  });
});
