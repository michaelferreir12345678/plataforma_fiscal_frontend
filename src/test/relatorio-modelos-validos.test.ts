/**
 * Sprint D1 — nenhum `modeloRelatorio` aponta para um modelo inexistente.
 *
 * `ExportButton` já linka toda página fiscal para `/relatorios?modelo=<modeloRelatorio>`
 * (Sprint 25); o defeito residual (achado ao investigar a Tarefa 7 da ficha, "ligue as
 * páginas fiscais como emissoras do deep-link ?modelo=") era outro: 6 usos passavam um
 * código que não existe em `reports/models.py::MODELOS`
 * ("benchmark", "patrimonio" ×2, "tecnico" ×2, "saude", "educacao") e caíam silenciosamente
 * em "Resumo Executivo" — `RelatoriosPage.tsx` faz esse fallback com `??`, sem avisar.
 * Este teste varre os fontes das páginas e trava contra qualquer `modeloRelatorio="..."`
 * literal fora do enum real do backend.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Espelha reports/models.py::MODELOS (backend_plataforma_fiscal/src/app/modules/reports/models.py).
const MODELOS_VALIDOS = new Set(['executivo', 'limites', 'comparativo', 'conformidade', 'boletim']);

const PAGES_DIR = join(__dirname, '..', 'pages');

function paginasComModeloLiteral(): { arquivo: string; modelo: string }[] {
  const achados: { arquivo: string; modelo: string }[] = [];
  // Cobre tanto o atributo JSX (`<ExportButton modeloRelatorio="X">`, a maioria dos casos)
  // quanto a chave de objeto (`modeloRelatorio: 'X'`, o CONFIG de SaudeEducacaoPage —
  // dinâmico via `cfg.modeloRelatorio`, mas com valor literal na origem).
  const padroes = [/modeloRelatorio="([^"]+)"/g, /modeloRelatorio:\s*['"]([^'"]+)['"]/g];
  for (const arquivo of readdirSync(PAGES_DIR)) {
    if (!arquivo.endsWith('.tsx')) continue;
    const conteudo = readFileSync(join(PAGES_DIR, arquivo), 'utf-8');
    for (const padrao of padroes) {
      for (const m of conteudo.matchAll(padrao)) {
        achados.push({ arquivo, modelo: m[1] });
      }
    }
  }
  return achados;
}

describe('modeloRelatorio literais apontam para um modelo que existe (Sprint D1)', () => {
  it('todo modeloRelatorio está em reports/models.py::MODELOS (13/13 emissores)', () => {
    const achados = paginasComModeloLiteral();
    // 13 emissores confirmados nesta sprint (Alertas ×2, Benchmarking, Caixa, Carteira,
    // Cockpit, Dívida, Limites, Patrimônio ×2, Pessoal, Previsões ×2, Saúde/Educação ×2).
    expect(achados.length).toBeGreaterThanOrEqual(13);
    const invalidos = achados.filter((a) => !MODELOS_VALIDOS.has(a.modelo));
    expect(invalidos, JSON.stringify(invalidos)).toEqual([]);
  });
});
