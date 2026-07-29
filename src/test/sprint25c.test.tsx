/**
 * Sprint 25C — Saúde & Educação numa tela só.
 *
 * Aceite coberto aqui: % atual, piso, projeção, série de exercícios, trajetória do
 * exercício, posição na coorte e SIOPS/SIOPE com selo — mais memória em diálogo e
 * export. E as três recusas honestas: coorte pequena demais não vira ranking, série de
 * um exercício não vira "série plurianual", e enriquecimento nunca altera o piso.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { AppProvider } from '../context/AppContext';
import { SaudeEducacaoPage } from '../pages/SaudeEducacaoPage';
import * as backend from '../services/backend';
import * as api from '../services/api';

const PERIODOS_RREO = {
  cod_ibge: '2304400',
  relatorio: 'RREO',
  default: '2024-B6',
  periodos: [{ periodo: '2024-B6', relatorio: 'RREO', versao_entrega: '1', vigente: true }],
};
const SRC_ASPS = { relatorio: 'RREO', anexo: 'Anexo 12 — ASPS', periodo: '2024-B6', versao_entrega: '1' };
const SRC_MDE = { relatorio: 'RREO', anexo: 'Anexo 08 — MDE', periodo: '2024-B6', versao_entrega: '1' };

const MEMORIA: backend.MemoriaCalculo = {
  formula_aplicacao: 'despesa_aplicada = despesa_bruta − deduções − RPNP_sem_lastro',
  formula_percentual: 'pct_aplicado = despesa_aplicada ÷ impostos_e_transferências × 100',
  estagio_legal: 'empenhado',
  regra_expurgo: 'RPNP sem lastro é apurado fonte a fonte no RGF Anexo 5.',
  componentes: [
    {
      codigo: 'base', rotulo: 'Impostos + transferências', valor: 6_882_415_857,
      operacao: 'base', source_ref: SRC_ASPS, as_of: '2025-02-28T21:00:00Z',
    },
    {
      codigo: 'rpnp_sem_lastro', rotulo: 'RPNP sem disponibilidade de caixa', valor: 0,
      operacao: 'subtrai',
      source_ref: { relatorio: 'RGF', anexo: 'Anexo 05', periodo: '2024-Q3', versao_entrega: '1' },
      as_of: '2025-02-28T21:00:00Z',
    },
  ],
  detalhes: { base_nao_e_rcl: true, metodo_expurgo: 'sprint10_rgf_anexo_5' },
};

function minimoFake(over: Partial<backend.SaudeDetalhe> = {}): backend.SaudeDetalhe {
  return {
    cod_ibge: '2304400',
    periodo: '2024-B6',
    esfera: 'municipal',
    base_impostos_transferencias: 6_882_415_857,
    despesa_bruta: 1_868_174_880,
    deducoes_outras: 0,
    rpnp_sem_lastro: 0,
    despesa_aplicada: 1_868_174_880,
    pct_aplicado: 27.14,
    minimo_pct: 15,
    valor_minimo: 1_032_362_378,
    abaixo_do_minimo: false,
    folga: 835_812_502,
    projecao_pct: 27.14,
    fonte_primaria: 'RREO',
    versao_entrega: '1',
    source_ref: SRC_ASPS,
    source_ref_expurgo: null,
    as_of: '2025-02-28T21:00:00Z',
    memoria_calculo: MEMORIA,
    serie: [],
    ...over,
  } as backend.SaudeDetalhe;
}

function serieFake(over: Partial<backend.SerieMinimoResposta> = {}): backend.SerieMinimoResposta {
  const ponto = (periodo: string, exercicio: number, pct: number, parcial: boolean) => ({
    periodo,
    exercicio,
    parcial,
    estagio_legal: parcial ? ('liquidado' as const) : ('empenhado' as const),
    base_impostos_transferencias: 6_882_415_857,
    despesa_aplicada: 1_868_174_880,
    pct_aplicado: pct,
    minimo_pct: 15,
    abaixo_do_minimo: pct < 15,
    source_ref: SRC_ASPS,
    as_of: '2025-02-28T21:00:00Z',
  });
  return {
    cod_ibge: '2304400',
    periodo: '2024-B6',
    indicador: 'saude',
    minimo_pct: 15,
    anos_solicitados: 5,
    exercicios_com_dado: [2023, 2024],
    exercicios_sem_dado: [2020, 2021, 2022],
    cobertura_completa: false,
    observacao: '2 de 5 exercícios têm o RREO Anexo 12 — ASPS publicado para este ente; sem dado em 2020, 2021, 2022.',
    data: [ponto('2023-B6', 2023, 22.4, false), ponto('2024-B6', 2024, 27.14, false)],
    trajetoria_exercicio: [
      ponto('2024-B1', 2024, 18.95, true),
      ponto('2024-B6', 2024, 27.14, false),
    ],
    source_ref: SRC_ASPS,
    as_of: '2025-02-28T21:00:00Z',
    ...over,
  };
}

function benchmarkFake(comValor: number, elegiveis: number): backend.BenchmarkResponse {
  return {
    indicador: 'saude_minimo',
    indicador_rotulo: 'Aplicação em saúde',
    unidade: 'percentual_impostos_transferencias',
    sentido: 'maior_melhor',
    periodo: '2024-B6',
    as_of: '2025-02-28T21:00:00Z',
    coorte: {
      id: 'c1', codigo: 'porte_metropole', criterio: 'porte', faixa: 'metropole',
      rotulo: '1 milhão de habitantes ou mais', ordem: 4,
      source_ref: { relatorio: 'IBGE-POP', versao_entrega: '2025' },
    },
    coortes_disponiveis: [],
    indicadores_disponiveis: [],
    quantidade: comValor,
    cobertura: {
      entes_elegiveis: elegiveis,
      entes_com_valor: comValor,
      entes_sem_valor: elegiveis - comValor,
      percentual: (comValor / elegiveis) * 100,
      amostra_parcial: comValor < elegiveis,
    },
    distribuicao: { minimo: 16, p10: 16.4, p25: 17, mediana: 19.5, p75: 24, p90: 26, maximo: 27.14 },
    ente: {
      cod_ibge: '2304400', nome: 'Fortaleza', uf: 'CE', valor: 27.14, percentil: 100,
      posicao: comValor, faixa: 'adequado', destaque: true, as_of: '2025-02-28T21:00:00Z',
      source_ref: SRC_ASPS, memoria: null,
    },
    memoria: { denominador: 'impostos_transferencias' },
    source_refs: [SRC_ASPS],
  } as unknown as backend.BenchmarkResponse;
}

function enriquecimentoFake(
  over: Partial<backend.EnriquecimentoDetalhe> = {},
): backend.EnriquecimentoDetalhe {
  return {
    cod_ibge: '2304400',
    periodo_solicitado: '2024-B6',
    periodo_fonte: '2024-B4',
    ultima_atualizacao: '2025-01-15T12:00:00Z',
    defasado: true,
    defasagem_bimestres: 2,
    selo: 'defasado',
    nao_substitui_base: true,
    itens: [
      {
        codigo: '1.1', descricao: 'Despesa total em saúde por habitante', valor: 1234.56,
        unidade: 'R$', periodo: '2024-B4', source_ref: { relatorio: 'SIOPS', periodo: '2024-B4', versao_entrega: '1' },
        as_of: '2025-01-15T12:00:00Z',
      },
    ],
    source_ref: { relatorio: 'SIOPS', periodo: '2024-B4', versao_entrega: '1' },
    as_of: '2025-01-15T12:00:00Z',
    ...over,
  } as backend.EnriquecimentoDetalhe;
}

function mockTudo(opcoes: { paresNaCoorte?: number; serie?: Partial<backend.SerieMinimoResposta> } = {}) {
  const { paresNaCoorte = 8, serie = {} } = opcoes;
  vi.spyOn(api, 'getToken').mockReturnValue('token-de-teste');
  vi.spyOn(backend, 'fetchPeriodos').mockResolvedValue(PERIODOS_RREO as never);
  vi.spyOn(backend, 'fetchMe').mockResolvedValue({
    usuario: { id: 'u1', email: 'gestor@ente.gov.br', nome: 'Gestor' },
    org_ativa: { id: 'o1', nome: 'Prefeitura', tipo: 'ente', capacidades: ['ver'] },
    orgs: [],
  } as never);
  vi.spyOn(backend, 'fetchSaude').mockResolvedValue(minimoFake());
  vi.spyOn(backend, 'fetchEducacao').mockResolvedValue({
    ...minimoFake({
      pct_aplicado: 25.28, minimo_pct: 25, abaixo_do_minimo: false, source_ref: SRC_MDE,
      projecao_pct: 25.28,
    }),
    despesa_impostos: 1_500_000_000,
    despesa_fundeb: 285_000_000,
    fundeb: {
      base: 1_895_200_000, aplicado_profissionais: 1_861_000_000, pct_aplicado: 98.19,
      minimo_pct: 70, valor_minimo: 1_326_640_000, abaixo_do_minimo: false,
      source_ref: SRC_MDE, as_of: '2025-02-28T21:00:00Z',
    },
  } as never);
  vi.spyOn(backend, 'fetchMinimosProjecao').mockResolvedValue({
    cod_ibge: '2304400',
    periodo: '2024-B6',
    saude: {
      indicador: 'saude', periodo: '2024-B6', pct_atual: 27.14, pct_projetado: 27.14,
      minimo_pct: 15, valor_aplicado_projetado: 1_868_174_880, valor_minimo_projetado: 1_032_362_378,
      abaixo_do_minimo_projetado: false, metodo: 'Carregamento da razão acumulada.',
      source_ref: SRC_ASPS, as_of: '2025-02-28T21:00:00Z',
    },
    educacao: {
      indicador: 'educacao', periodo: '2024-B6', pct_atual: 24.05, pct_projetado: 24.05,
      minimo_pct: 25, valor_aplicado_projetado: 1_400_000_000, valor_minimo_projetado: 1_764_825_000,
      abaixo_do_minimo_projetado: true, metodo: 'Carregamento da razão acumulada.',
      source_ref: SRC_MDE, as_of: '2025-02-28T21:00:00Z',
    },
    serie: [],
    source_ref: SRC_ASPS,
    as_of: '2025-02-28T21:00:00Z',
  } as never);
  vi.spyOn(backend, 'fetchSaudeSerie').mockResolvedValue(serieFake(serie));
  vi.spyOn(backend, 'fetchEducacaoSerie').mockResolvedValue(
    serieFake({ indicador: 'educacao', minimo_pct: 25, source_ref: SRC_MDE, ...serie }),
  );
  vi.spyOn(backend, 'fetchSaudeMemoria').mockResolvedValue(MEMORIA);
  vi.spyOn(backend, 'fetchEducacaoMemoria').mockResolvedValue(MEMORIA);
  vi.spyOn(backend, 'fetchBenchmark').mockResolvedValue(benchmarkFake(paresNaCoorte, 15));
  vi.spyOn(backend, 'fetchSaudeDetalhamentoSiops').mockResolvedValue(enriquecimentoFake());
  vi.spyOn(backend, 'fetchEducacaoDetalhamentoSiope').mockResolvedValue(
    enriquecimentoFake({ selo: 'indisponivel', defasado: true, itens: [], periodo_fonte: null }),
  );
  vi.spyOn(backend, 'fetchSaudeArvore').mockResolvedValue({
    node: null,
    breadcrumb: [],
    children: [
      {
        codigo: '10.ATENCAO_BASICA', descricao: 'Atenção básica', nivel: 2,
        measures: { valor_computado: 484_886_445, empenhado: 484_886_445, liquidado: 484_795_116, pago: 484_586_716 },
        has_children: false,
      },
    ],
    measures: {},
    period: '2024-B6',
    source_ref: SRC_ASPS,
  } as never);
  vi.spyOn(backend, 'fetchEducacaoArvore').mockResolvedValue({
    node: null,
    breadcrumb: [],
    children: [
      { codigo: 'MDE', descricao: 'Manutenção e Desenvolvimento do Ensino', nivel: 1, measures: { despesa_aplicada: 1_785_000_000 }, has_children: true },
    ],
    measures: {},
    period: '2024-B6',
    source_ref: SRC_MDE,
  } as never);
}

function renderPagina() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <SaudeEducacaoPage />
      </AppProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

/**
 * A página encadeia sete recursos independentes; asserção feita no meio do voo pode
 * pegar um nó que o próximo commit substitui. Esperamos o último bloco a carregar
 * (a série) antes de conferir o resto de forma síncrona.
 */
async function telaEstavel() {
  await screen.findByRole('group', { name: /ASPS acumulado no exercício/ });
}

describe('Saúde & Educação — uma tela com as sete respostas (Sprint 25C)', () => {
  it('mostra % aplicado, piso e folga em pontos percentuais e em reais', async () => {
    mockTudo();
    renderPagina();
    await telaEstavel();
    expect(screen.getByTestId('pct-aplicado')).toHaveTextContent('27,14%');
    // O selo aparece duas vezes (apurado e projetado) — ambos cumprem o piso aqui.
    expect(screen.getAllByText(/CUMPRE O PISO/).length).toBeGreaterThan(0);
    // "piso 15%" aparece no medidor e como linha de referência do gráfico.
    expect(screen.getAllByText(/piso 15%/).length).toBeGreaterThan(0);
    expect(screen.getByText(/12,14 p\.p\./)).toBeInTheDocument(); // 27,14 − 15
    expect(screen.getByText(/sobra R\$ 835,8 M/)).toBeInTheDocument();
  });

  it('diz que a base é impostos e transferências, e não a RCL', async () => {
    mockTudo();
    renderPagina();
    await telaEstavel();
    expect(
      screen.getByText(/receita de impostos e transferências constitucionais — não é RCL/),
    ).toBeInTheDocument();
  });

  it('projeta o fechamento e sinaliza risco quando a trajetória fica abaixo do piso', async () => {
    mockTudo();
    renderPagina();
    await userEvent.click(screen.getByRole('tab', { name: /Educação/ }));
    expect(await screen.findByText(/PROJEÇÃO ABAIXO DO MÍNIMO/)).toBeInTheDocument();
    expect(screen.getByTestId('pct-projetado')).toHaveTextContent('24,05%');
    expect(screen.getByText(/deixa de ser risco e passa a ser descumprimento apurado/)).toBeInTheDocument();
  });

  it('desenha a série por exercício e a trajetória do exercício separadamente', async () => {
    mockTudo();
    renderPagina();
    expect(
      await screen.findByRole('group', { name: /ASPS aplicado por exercício/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: /ASPS acumulado no exercício/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Comparar com o piso aqui\s+mostra o caminho, não o cumprimento/),
    ).toBeInTheDocument();
  });

  it('declara a cobertura da série em vez de fingir cinco exercícios', async () => {
    mockTudo();
    renderPagina();
    expect(await screen.findByText(/2 de 5 exercícios\s+apurados/)).toBeInTheDocument();
    expect(screen.getByText(/Sem dado em 2020, 2021, 2022\./)).toBeInTheDocument();
  });

  it('recusa a série plurianual quando só um exercício foi apurado', async () => {
    mockTudo({
      serie: {
        exercicios_com_dado: [2024],
        exercicios_sem_dado: [2020, 2021, 2022, 2023],
        data: [
          {
            periodo: '2024-B6', exercicio: 2024, parcial: false, estagio_legal: 'empenhado',
            base_impostos_transferencias: 6_882_415_857, despesa_aplicada: 1_868_174_880,
            pct_aplicado: 27.14, minimo_pct: 15, abaixo_do_minimo: false,
            source_ref: SRC_ASPS, as_of: '2025-02-28T21:00:00Z',
          },
        ],
      },
    });
    renderPagina();
    expect(await screen.findByTestId('serie-plurianual-insuficiente')).toBeInTheDocument();
    expect(screen.queryByText(/ASPS aplicado por exercício/)).not.toBeInTheDocument();
  });

  it('posiciona o ente na coorte e nomeia a unidade da métrica', async () => {
    mockTudo();
    renderPagina();
    expect(await screen.findByText(/posição 8 de 8 · percentil 100%/)).toBeInTheDocument();
    expect(screen.getByText(/8 de 15 entes\s+publicaram o indicador/)).toBeInTheDocument();
    expect(screen.getByText('percentual_impostos_transferencias')).toBeInTheDocument();
  });

  it('não transforma uma coorte de dois entes em ranking', async () => {
    mockTudo({ paresNaCoorte: 2 });
    renderPagina();
    expect(await screen.findByTestId('coorte-insuficiente')).toBeInTheDocument();
    expect(screen.queryByText(/percentil 100%/)).not.toBeInTheDocument();
  });

  it('exibe SIOPS com selo de defasagem sem alterar o piso', async () => {
    mockTudo();
    renderPagina();
    expect(await screen.findByText('DEFASADO · 2 BIMESTRES')).toBeInTheDocument();
    expect(
      screen.getByText(/apuração constitucional acima permanece baseada\s+exclusivamente no RREO/),
    ).toBeInTheDocument();
  });

  it('marca SIOPE como indisponível quando a fonte não publicou o ente', async () => {
    mockTudo();
    renderPagina();
    await userEvent.click(screen.getByRole('tab', { name: /Educação/ }));
    expect(await screen.findByText('INDISPONÍVEL')).toBeInTheDocument();
  });

  it('abre a memória de cálculo em diálogo, com a fonte de cada componente', async () => {
    mockTudo();
    renderPagina();
    await userEvent.click(await screen.findByRole('button', { name: /Memória de cálculo/ }));
    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveTextContent('despesa_aplicada = despesa_bruta − deduções − RPNP_sem_lastro');
    expect(dialogo).toHaveTextContent('RGF · Anexo 05 · 2024-Q3');
    expect(dialogo).toHaveTextContent('Base Nao E Rcl');
  });

  it('exporta o mínimo e a série em CSV', async () => {
    mockTudo();
    renderPagina();
    await waitFor(() => expect(screen.getAllByRole('button', { name: /CSV/ }).length).toBeGreaterThan(1));
  });

  it('mostra o FUNDEB com a sua própria base, distinta da base do MDE', async () => {
    mockTudo();
    renderPagina();
    await userEvent.click(screen.getByRole('tab', { name: /Educação/ }));
    expect(await screen.findByText('98,19%')).toBeInTheDocument();
    expect(
      screen.getByText(/base = receitas do FUNDEB \(não é a base de impostos do MDE\)/),
    ).toBeInTheDocument();
  });
});
