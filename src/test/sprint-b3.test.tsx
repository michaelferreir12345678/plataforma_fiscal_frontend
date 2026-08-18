/**
 * Sprint B3 — funcionalidades construídas e nunca ligadas.
 *
 * A peça já existia em todos os casos; faltava ligá-la à tela. Cobre os quatro pontos que
 * a ficha pede teste: impressão (CSS aplicado), axe-core nos gráficos que passaram a usar
 * `AccessibleChart`, o seletor de período do `AppShell` ficando mudo/oculto conforme a
 * rota, e o Assistente sinalizando dado incompleto e modo offline.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axe from 'axe-core';

import { PrintButton } from '../components/PrintButton';
import { PageHeader } from '../components/PageHeader';
import { SerieChart } from '../components/SerieChart';
import { TendenciaChart, type PontoTendencia } from '../components/TendenciaChart';
import { AppShell } from '../layouts/AppShell';
import { AppProvider } from '../context/AppContext';
import { AssistentePage } from '../pages/AssistentePage';
import * as backend from '../services/backend';
import * as api from '../services/api';

// axe-core não calcula estilo pintado em jsdom (sem layout real) — `color-contrast` some
// como "incomplete" em vez de violação real. A Sprint 27 já cobre contraste por token; aqui
// auditamos estrutura e semântica (nome acessível, tabela, foco), que é o que mudou.
const AXE_OPCOES = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  rules: { 'color-contrast': { enabled: false } },
};

beforeEach(() => {
  vi.restoreAllMocks();
});

// --------------------------------------------------------------------------- //
// 1. Impressão (U12) — botão liga a infraestrutura de global.css:342-405
// --------------------------------------------------------------------------- //
describe('Impressão (Sprint B3)', () => {
  it('aciona window.print ao clicar e fica dentro da área que a folha impressa esconde', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(<PageHeader title="Receita" actions={<PrintButton />} />);

    const botao = screen.getByRole('button', { name: 'Imprimir' });
    // `.page-header__actions` carrega `.no-print`, a classe que @media print esconde —
    // sem isto o botão apareceria na folha impressa junto com o conteúdo.
    expect(botao.closest('.no-print')).not.toBeNull();

    await user.click(botao);
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it('global.css aplica @page e esconde .no-print dentro de @media print', () => {
    // `process.cwd()` é a raiz do projeto (vitest roda a partir daí) — mais robusto que
    // `import.meta.url`, que o transform do vitest não garante ser sempre `file://`.
    const caminho = join(process.cwd(), 'src', 'styles', 'global.css');
    const css = readFileSync(caminho, 'utf-8');
    expect(css).toMatch(/@page\s*\{/);
    expect(css).toMatch(/@media print\s*\{/);
    // A regra precisa estar DENTRO do bloco @media print, não em qualquer lugar do arquivo.
    const blocoPrint = css.slice(css.indexOf('@media print'));
    expect(blocoPrint).toMatch(/\.no-print[^}]*display:\s*none/);
  });
});

// --------------------------------------------------------------------------- //
// 2. AccessibleChart nos gráficos SVG artesanais (axe-core)
// --------------------------------------------------------------------------- //
describe('Gráficos convertidos ao AccessibleChart (axe-core)', () => {
  it('SerieChart (figure + alternativa tabular) não reporta violação axe', async () => {
    const { container } = render(
      <SerieChart
        titulo="Receita corrente"
        medida="Arrecadado acumulado"
        pontos={[
          { periodo: '2023', nominal: 100_000 },
          { periodo: '2024', nominal: 120_000 },
        ]}
      />,
    );
    const resultado = await axe.run(container, AXE_OPCOES);
    expect(resultado.violations).toEqual([]);
  });

  it('TendenciaChart (Sprint B3 — recém adotado) não reporta violação axe', async () => {
    const pontos: PontoTendencia[] = [
      { periodo: '2024-B5', valor: 46.1, projetado: false },
      { periodo: '2024-B6', valor: 47.2, projetado: false },
      { periodo: '2025-B1', valor: 48.0, projetado: true, icInferior: 47, icSuperior: 49 },
    ];
    const { container } = render(
      <TendenciaChart
        titulo="Pessoal (% RCL)"
        pontos={pontos}
        formatar={(v) => `${v.toFixed(1)}%`}
        limite={54}
        cruzamento="2025-B1"
      />,
    );
    const resultado = await axe.run(container, AXE_OPCOES);
    expect(resultado.violations).toEqual([]);
  });

  it('TendenciaChart oferece a alternativa tabular (Gráfico ⇄ Tabela), como o SerieChart', async () => {
    const pontos: PontoTendencia[] = [
      { periodo: '2024-B5', valor: 46.1, projetado: false },
      { periodo: '2024-B6', valor: 47.2, projetado: false },
    ];
    const user = userEvent.setup();
    render(<TendenciaChart titulo="Pessoal (% RCL)" pontos={pontos} formatar={(v) => `${v.toFixed(1)}%`} />);

    expect(screen.getByRole('img', { name: 'Pessoal (% RCL)' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tabela' }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Período' })).toBeInTheDocument();
  });

  it('sinaliza quando o eixo de TendenciaChart não parte de zero (padronização com SerieChart)', () => {
    // Janela estreita (46,1–47,2) fica inteira acima do zero mesmo com a folga de 12% —
    // é o corte que a auditoria da Sprint B3 encontrou em TendenciaChart.tsx:60-72 sem aviso.
    const pontos: PontoTendencia[] = [
      { periodo: '2024-B5', valor: 46.1, projetado: false },
      { periodo: '2024-B6', valor: 47.2, projetado: false },
    ];
    render(<TendenciaChart titulo="Pessoal (% RCL)" pontos={pontos} formatar={(v) => `${v.toFixed(1)}%`} />);
    expect(screen.getByText(/eixo vertical não parte de zero/i)).toBeInTheDocument();
  });
});

// --------------------------------------------------------------------------- //
// 3. Seletor de período do AppShell — mudo em 7 rotas (AppShell.tsx antiga:257)
// --------------------------------------------------------------------------- //
describe('Seletor de período do AppShell (Sprint B3)', () => {
  const PERIODOS_RREO = {
    cod_ibge: '2304400',
    relatorio: 'RREO',
    default: '2024-B6',
    periodos: [{ periodo: '2024-B6', relatorio: 'RREO', versao_entrega: '1', vigente: true }],
  };
  const PERIODOS_RGF = {
    cod_ibge: '2304400',
    relatorio: 'RGF',
    default: '2024-Q3',
    periodos: [{ periodo: '2024-Q3', relatorio: 'RGF', versao_entrega: '1', vigente: true }],
  };

  function mockDependenciasDoShell() {
    vi.spyOn(api, 'getToken').mockReturnValue('token-de-teste');
    vi.spyOn(backend, 'fetchPeriodos').mockImplementation((_ibge, relatorio) =>
      Promise.resolve((relatorio === 'RGF' ? PERIODOS_RGF : PERIODOS_RREO) as never),
    );
    vi.spyOn(backend, 'fetchMe').mockResolvedValue({
      usuario_id: 'u1', email: 'gestor@ente.gov.br', nome: 'Gestor',
      org_ativa: null, memberships: [],
    } as never);
    vi.spyOn(backend, 'fetchAlertas').mockResolvedValue({
      escopo: 'ente', cod_ibge: '2304400', gerado_em: '2026-08-01T00:00:00Z',
      contadores: { critico: 0, atencao: 0, informativo: 0, total: 0 }, alertas: [],
    } as never);
    vi.spyOn(backend, 'fetchCarteiraResumo').mockResolvedValue({ total_entes: 0 } as never);
  }

  function renderShellEm(pathname: string) {
    return render(
      <MemoryRouter initialEntries={[pathname]}>
        <AppProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route path={pathname} element={<div data-testid="conteudo-rota">conteúdo</div>} />
            </Route>
          </Routes>
        </AppProvider>
      </MemoryRouter>,
    );
  }

  beforeEach(() => {
    mockDependenciasDoShell();
  });

  it.each([
    '/admin',
    '/central-dados',
    '/perfil',
    '/plataforma',
    '/divida/operacao/123',
    '/alertas',
    '/previsoes',
  ])('oculta o seletor de período em %s — a tela não consome periodo/periodoRgf', async (pathname) => {
    renderShellEm(pathname);
    await screen.findByTestId('conteudo-rota');
    expect(screen.queryByRole('button', { name: 'Selecionar período' })).not.toBeInTheDocument();
  });

  it('mantém o seletor de período em rotas fiscais que o governam (ex.: /receita)', async () => {
    renderShellEm('/receita');
    await screen.findByTestId('conteudo-rota');
    expect(await screen.findByRole('button', { name: 'Selecionar período' })).toBeInTheDocument();
  });
});

// --------------------------------------------------------------------------- //
// 4. Assistente — dados_incompletos renderizado + aviso de modo offline
// --------------------------------------------------------------------------- //
describe('Assistente — dados incompletos e modo offline (Sprint B3)', () => {
  function respostaBase(overrides: Partial<backend.AssistResposta> = {}): backend.AssistResposta {
    return {
      conversa_id: 'c1',
      tipo: 'pergunta',
      ente: '2304400',
      ente_nome: 'Fortaleza',
      periodo: '2024-B6',
      as_of: null,
      titulo: null,
      pergunta: 'Como está a despesa com pessoal?',
      resposta: 'A despesa com pessoal está em 47,2% da RCL, dentro do limite.',
      recusa: false,
      dado_disponivel: true,
      fatos: [],
      normas: [],
      fontes: [],
      dados_incompletos: [],
      uso: { modelo: 'gemini-2.5-flash', tokens_entrada: 120, tokens_saida: 80, latencia_ms: 640 },
      source_refs: [],
      // Sprint IA-7: a resposta declara quantos turnos anteriores entraram no contexto.
      turnos_no_contexto: 0,
      turnos_descartados: 0,
      verificacao: null,
      gerado_em: '2026-08-01T12:00:00Z',
      ...overrides,
    };
  }

  function mockSessaoMinima() {
    vi.spyOn(api, 'getToken').mockReturnValue(null);
    vi.spyOn(backend, 'fetchAssistenteUso').mockRejectedValue(new Error('sem uso ainda'));
  }

  function renderAssistente() {
    return render(
      <MemoryRouter initialEntries={['/assistente']}>
        <AppProvider>
          <AssistentePage />
        </AppProvider>
      </MemoryRouter>,
    );
  }

  it('replica o padrão de RelatoriosPage e mostra dados_incompletos sem omitir item', async () => {
    mockSessaoMinima();
    vi.spyOn(backend, 'perguntarAssistente').mockResolvedValue(
      respostaBase({
        dados_incompletos: [
          {
            tipo: 'defasado',
            codigo: 'fonte_rreo',
            mensagem: 'RREO com defasagem de 2 bimestres em relação ao esperado.',
            periodo_esperado: '2024-B6',
            periodo_encontrado: '2024-B4',
          },
        ],
      }),
    );
    const user = userEvent.setup();
    renderAssistente();

    const sugestao = await screen.findByRole('button', {
      name: /Como está a despesa com pessoal do Executivo e qual o limite\?/,
    });
    await user.click(sugestao);

    expect(await screen.findByText('1 sinalização(ões) — nenhum item foi omitido')).toBeInTheDocument();
    expect(
      screen.getByText(/RREO com defasagem de 2 bimestres em relação ao esperado\./),
    ).toBeInTheDocument();
  });

  it('não mostra a caixa de sinalização quando não há dados_incompletos', async () => {
    mockSessaoMinima();
    vi.spyOn(backend, 'perguntarAssistente').mockResolvedValue(respostaBase());
    const user = userEvent.setup();
    renderAssistente();

    const sugestao = await screen.findByRole('button', {
      name: /Como está a despesa com pessoal do Executivo e qual o limite\?/,
    });
    await user.click(sugestao);

    await screen.findByText(/dentro do limite/);
    expect(screen.queryByText(/sinalização\(ões\)/)).not.toBeInTheDocument();
  });

  it('avisa "modo offline (sem Gemini)" quando o provedor degrada para local-grounded', async () => {
    mockSessaoMinima();
    vi.spyOn(backend, 'perguntarAssistente').mockResolvedValue(
      respostaBase({
        uso: { modelo: 'local-grounded', tokens_entrada: 0, tokens_saida: 0, latencia_ms: 12 },
      }),
    );
    const user = userEvent.setup();
    renderAssistente();

    const sugestao = await screen.findByRole('button', {
      name: /Como está a despesa com pessoal do Executivo e qual o limite\?/,
    });
    await user.click(sugestao);

    expect(await screen.findByText(/modo offline \(sem gemini\)/i)).toBeInTheDocument();
  });

  it('não mostra o aviso de modo offline quando o Gemini respondeu normalmente', async () => {
    mockSessaoMinima();
    vi.spyOn(backend, 'perguntarAssistente').mockResolvedValue(respostaBase());
    const user = userEvent.setup();
    renderAssistente();

    const sugestao = await screen.findByRole('button', {
      name: /Como está a despesa com pessoal do Executivo e qual o limite\?/,
    });
    await user.click(sugestao);

    await screen.findByText(/dentro do limite/);
    expect(screen.queryByText(/modo offline/i)).not.toBeInTheDocument();
  });
});
