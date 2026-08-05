/**
 * Sprint 25D — Patrimônio sem seletor-demo e Benchmarking multi-indicador/multi-período.
 *
 * O aceite central é uma recusa: **nenhum ente é trocado silenciosamente**. A tela de
 * Patrimônio mostra o ente do contexto mesmo quando ele não tem dado, e diz o que falta
 * ingerir — em vez de exibir o patrimônio de outro município.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AppProvider } from '../context/AppContext';
import { PatrimonioPage } from '../pages/PatrimonioPage';
import { BenchmarkingPage } from '../pages/BenchmarkingPage';
import * as backend from '../services/backend';
import * as api from '../services/api';

const PERIODOS_RREO = {
  cod_ibge: '2304400',
  relatorio: 'RREO',
  default: '2024-B6',
  periodos: [{ periodo: '2024-B6', relatorio: 'RREO', versao_entrega: '1', vigente: true }],
};
const SRC_DCA = { relatorio: 'DCA', anexo: 'DCA-Anexo I-AB', periodo: '2024', versao_entrega: '1' };
const SRC_RREO = { relatorio: 'RREO', anexo: 'Anexo 02 — natureza', periodo: '2024-B6', versao_entrega: '1' };

function mockSessao(capacidades: string[] = ['ver']) {
  vi.spyOn(api, 'getToken').mockReturnValue('token-de-teste');
  vi.spyOn(backend, 'fetchPeriodos').mockResolvedValue(PERIODOS_RREO as never);
  vi.spyOn(backend, 'fetchMe').mockResolvedValue({
    usuario: { id: 'u1', email: 'gestor@ente.gov.br', nome: 'Gestor' },
    org_ativa: { id: 'o1', nome: 'Prefeitura', tipo: 'ente', capacidades },
    orgs: [],
  } as never);
}

function patrimonioFake(over: Partial<backend.PatrimonioDetalhe> = {}): backend.PatrimonioDetalhe {
  return {
    cod_ibge: '2304400',
    ano: 2024,
    as_of: null,
    esfera: 'municipal',
    uf: 'CE',
    tem_msc: false,
    tem_dca: true,
    ativo: 7_070_000_000,
    passivo_pl: 7_070_000_000,
    patrimonio_liquido: 2_800_000_000,
    vpd: 9_000_000_000,
    vpa: 9_400_000_000,
    resultado_patrimonial: 400_000_000,
    balanco_fechado: true,
    meses_msc: [],
    anos_disponiveis: [2021, 2022, 2023, 2024],
    conciliado: true,
    n_divergencias: 0,
    cobertura: {
      tem_dca: true,
      tem_msc: false,
      anos_dca: [2021, 2022, 2023, 2024],
      meses_msc: [],
      fontes_ausentes: ['MSC'],
      mensagem:
        'DCA disponível em 2021, 2022, 2023, 2024. Este ente **não** publica a MSC mensal no SICONFI.',
    },
    source_ref: SRC_DCA,
    ...over,
  } as backend.PatrimonioDetalhe;
}

function mockPatrimonio(detalhe: backend.PatrimonioDetalhe) {
  vi.spyOn(backend, 'fetchPatrimonio').mockResolvedValue(detalhe);
  vi.spyOn(backend, 'fetchMscConciliacao').mockResolvedValue({
    cod_ibge: '2304400', ano: 2024, tem_msc: false, tem_dca: true, titulo: 'Balanço fecha',
    conciliado: true, n_checks: 1, n_divergencias: 0,
    checks: [], observacao: 'Sem MSC: apenas os testes da DCA se aplicam.',
    source_ref: SRC_DCA, as_of: null,
  } as never);
  vi.spyOn(backend, 'fetchBalanco').mockResolvedValue({
    cod_ibge: '2304400', ano: 2024, tipo: 'patrimonial', anexo: 'DCA-Anexo I-AB',
    as_of: null, versao_entrega: '1',
    destaques: { ativo: 7_070_000_000, passivo_pl: 7_070_000_000 },
    linhas: [
      { cod_conta: '1.0.0.0.0.00.00', descricao: 'Ativo', coluna: 'Saldo', valor: 7_070_000_000, nivel: 1, parent_conta: null, natureza: 'devedora' },
    ],
    memoria: {},
    source_ref: SRC_DCA,
  } as never);
  vi.spyOn(backend, 'fetchBalancoComparacao').mockResolvedValue({
    cod_ibge: '2304400',
    tipo: 'patrimonial',
    anexo: 'DCA-Anexo I-AB',
    anos: [2021, 2022, 2023, 2024],
    anos_sem_balanco: [],
    observacao: null,
    linhas: [
      {
        cod_conta: '1.0.0.0.0.00.00', descricao: 'Ativo', nivel: 1,
        valores: { '2021': 5_460_000_000, '2022': 6_220_000_000, '2023': 7_320_000_000, '2024': 7_070_000_000 },
        variacao_abs: 1_610_000_000, variacao_pct: 29.5, anos_com_valor: [2021, 2022, 2023, 2024],
      },
      {
        cod_conta: '2.3.0.0.0.00.00', descricao: 'Patrimônio Líquido', nivel: 2,
        valores: { '2021': 2_100_000_000, '2022': null, '2023': 2_600_000_000, '2024': 2_800_000_000 },
        variacao_abs: 700_000_000, variacao_pct: 33.3, anos_com_valor: [2021, 2023, 2024],
      },
    ],
    memoria: { ausencia: 'exercício sem a conta fica nulo — não é zero' },
    source_refs: [SRC_DCA],
  } as never);
}

function renderPatrimonio() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <PatrimonioPage />
      </AppProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('Patrimônio — o ente é o do contexto (Sprint 25D)', () => {
  it('não oferece seletor de entes-demo nem troca o ente exibido', async () => {
    mockSessao();
    mockPatrimonio(patrimonioFake());
    renderPatrimonio();
    expect(await screen.findByText(/Ativo total · Município de Fortaleza/)).toBeInTheDocument();
    // O seletor removido oferecia São Paulo e sobrescrevia o ente global.
    expect(screen.queryByRole('button', { name: /São Paulo/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/São Paulo/)).not.toBeInTheDocument();
  });

  it('declara a fonte ausente em vez de esconder a lacuna', async () => {
    mockSessao();
    mockPatrimonio(patrimonioFake());
    renderPatrimonio();
    const aviso = await screen.findByTestId('aviso-cobertura');
    expect(aviso).toHaveTextContent(/não\*\* publica a MSC mensal/);
  });

  it('oferece o caminho da ingestão a quem administra', async () => {
    mockSessao(['ver', 'administrar']);
    mockPatrimonio(patrimonioFake());
    renderPatrimonio();
    const aviso = await screen.findByTestId('aviso-cobertura');
    expect(aviso).toHaveTextContent(/abrir a Central de Dados/);
    expect(aviso).toHaveTextContent(/solicitar a ingestão de MSC/);
  });

  it('não oferece o CTA de ingestão a quem só pode ver', async () => {
    mockSessao(['ver']);
    mockPatrimonio(patrimonioFake());
    renderPatrimonio();
    const aviso = await screen.findByTestId('aviso-cobertura');
    expect(aviso).not.toHaveTextContent(/Central de Dados/);
  });

  it('mostra o estado vazio com CTA quando o ente não tem nenhuma fonte', async () => {
    mockSessao(['ver', 'administrar']);
    mockPatrimonio(
      patrimonioFake({
        tem_dca: false, tem_msc: false, ativo: null, passivo_pl: null,
        patrimonio_liquido: null, anos_disponiveis: [],
        cobertura: {
          tem_dca: false, tem_msc: false, anos_dca: [], meses_msc: [],
          fontes_ausentes: ['DCA', 'MSC'],
          mensagem: 'Nenhuma fonte patrimonial ingerida para este ente.',
        },
      }),
    );
    renderPatrimonio();
    expect(await screen.findByText(/Sem dado para Município de Fortaleza/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /abrir a Central de Dados/ })).toBeInTheDocument();
    // Nada de número onde não há dado.
    expect(screen.queryByText(/Ativo total/)).not.toBeInTheDocument();
  });

  it('compara os balanços exercício a exercício e deixa a lacuna vazia', async () => {
    mockSessao();
    mockPatrimonio(patrimonioFake());
    renderPatrimonio();
    // Título do bloco aparece antes do dado; esperamos a linha resolvida da tabela.
    const linhaPlTexto = await screen.findByText('Patrimônio Líquido');
    expect(screen.getByText('Comparação anual dos balanços')).toBeInTheDocument();
    expect(screen.getByText(/exercício sem a conta fica vazio — não é zero/)).toBeInTheDocument();
    const linhaPl = linhaPlTexto.closest('tr');
    expect(linhaPl).not.toBeNull();
    // 2022 não tem a conta: célula vazia, nunca R$ 0.
    expect(linhaPl?.textContent).toContain('—');
    expect(screen.getByText('29,5%')).toBeInTheDocument();
  });

  it('rotula "Balanço fecha" (não "Conciliação MSC ↔ DCA") para ente sem MSC (U33)', async () => {
    // patrimonioFake() é tem_msc:false por padrão — só o check do Balanço roda (1 de 3);
    // "Conciliação MSC ↔ DCA" descreveria os três como se tivessem passado. O rótulo
    // aparece duas vezes (StatBox do cabeçalho + SectionLabel do card de conciliação).
    mockSessao();
    mockPatrimonio(patrimonioFake());
    renderPatrimonio();
    await screen.findByText('Balanço fecha'); // primeiro a resolver: o cabeçalho
    // O card de conciliação (fetchMscConciliacao) resolve numa camada assíncrona à parte.
    await waitFor(() => expect(screen.getAllByText('Balanço fecha').length).toBeGreaterThanOrEqual(2));
    expect(screen.queryByText('Conciliação MSC ↔ DCA')).not.toBeInTheDocument();
  });
});

// --- Benchmarking ------------------------------------------------------------
function benchmarkFake(over: Partial<backend.BenchmarkResponse> = {}): backend.BenchmarkResponse {
  return {
    indicador: 'investimento_rcl',
    indicador_rotulo: 'Investimento sobre a RCL',
    unidade: 'percentual_rcl',
    sentido: 'neutro',
    periodo: '2024-B6',
    as_of: '2026-01-01T00:00:00Z',
    coorte: {
      id: 'c1', codigo: 'regiao_ne', criterio: 'regiao', faixa: 'NE',
      rotulo: 'Região Nordeste', ordem: 2, limite_inferior: null, limite_superior: null,
      inclusivo_superior: false, unidade_criterio: null,
      source_ref: { relatorio: 'IBGE-POP', versao_entrega: '2025' },
    },
    coortes_disponiveis: [],
    indicadores_disponiveis: [
      { codigo: 'investimento_rcl', rotulo: 'Investimento sobre a RCL', unidade: 'percentual_rcl', sentido: 'neutro' },
      { codigo: 'rcl_per_capita', rotulo: 'RCL por habitante', unidade: 'brl_per_capita', sentido: 'neutro' },
    ],
    quantidade: 176,
    cobertura: {
      entes_elegiveis: 1791, entes_com_valor: 176, entes_sem_valor: 1615,
      percentual: 9.8, amostra_parcial: true,
    },
    distribuicao: { minimo: 0.5, p10: 3.2, p25: 7.1, mediana: 11.39, p75: 16.2, p90: 22.8, maximo: 41.1 },
    ente: {
      cod_ibge: '2304400', nome: 'Fortaleza', uf: 'CE', valor: 11.8, percentil: 53.1,
      posicao: 94, faixa: null, destaque: true, as_of: '2026-01-01T00:00:00Z',
      source_ref: SRC_RREO, memoria: null, valor_per_capita: null,
    },
    memoria: { denominador: 'rcl' },
    source_refs: [SRC_RREO],
    ...over,
  } as unknown as backend.BenchmarkResponse;
}

function mockBenchmark(over: { evolucaoPontos?: number } = {}) {
  const { evolucaoPontos = 6 } = over;
  vi.spyOn(backend, 'fetchBenchmark').mockResolvedValue(benchmarkFake());
  vi.spyOn(backend, 'fetchBenchmarkRanking').mockResolvedValue({
    indicador: 'investimento_rcl',
    indicador_rotulo: 'Investimento sobre a RCL',
    unidade: 'percentual_rcl',
    sentido: 'neutro',
    periodo: '2024-B6',
    as_of: '2026-01-01T00:00:00Z',
    coorte: benchmarkFake().coorte,
    coortes_disponiveis: [],
    indicadores_disponiveis: [],
    ordenar: 'posicao',
    ordem: 'asc',
    itens: [benchmarkFake().ente],
    ente_ancora: benchmarkFake().ente,
    total: 176,
    pagina: 1,
    por_pagina: 100,
    total_paginas: 2,
    cobertura: benchmarkFake().cobertura,
    memoria: {},
    source_refs: [SRC_RREO],
  } as unknown as backend.BenchmarkRankingResponse);
  const periodos = ['2024-B1', '2024-B2', '2024-B3', '2024-B4', '2024-B5', '2024-B6'].slice(
    0,
    evolucaoPontos,
  );
  const valores = [2.94, 5.03, 6.88, 9.03, 10.32, 11.8];
  const medianas = [1.77, 3.61, 5.76, 8.2, 9.87, 11.39];
  const posicoes = [135, 124, 115, 101, 93, 94];
  vi.spyOn(backend, 'fetchBenchmarkEvolucao').mockResolvedValue({
    cod_ibge: '2304400',
    indicador: 'investimento_rcl',
    indicador_rotulo: 'Investimento sobre a RCL',
    unidade: 'percentual_rcl',
    sentido: 'neutro',
    coorte: benchmarkFake().coorte,
    periodos_solicitados: 6,
    periodos_sem_comparacao: [],
    observacao: null,
    pontos: periodos.map((periodo, i) => ({
      periodo,
      valor_ente: valores[i],
      posicao: posicoes[i],
      quantidade: 176,
      percentil: 53.1,
      mediana: medianas[i],
      p10: 3.2,
      p90: 22.8,
      valor_ente_per_capita: null,
      cobertura: { entes_elegiveis: 1791, entes_com_valor: 176, entes_sem_valor: 1615, percentual: 9.8, amostra_parcial: true },
      as_of: '2026-01-01T00:00:00Z',
      source_ref: SRC_RREO,
    })),
    memoria: { coorte_fixada_em: 'regiao_ne' },
    source_refs: [SRC_RREO],
  } as unknown as backend.BenchmarkEvolucaoResponse);
}

/** Espera a tabela da evolução — último bloco a resolver na página. */
async function evolucaoPronta() {
  const celulas = await screen.findAllByText('2024-B1');
  const linha = celulas.map((c) => c.closest('tr')).find(Boolean);
  expect(linha).toBeTruthy();
  return linha as HTMLTableRowElement;
}

function renderBenchmarking() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <BenchmarkingPage />
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('Benchmarking — indicadores gerenciais e multi-período (Sprint 25D)', () => {
  it('oferece os indicadores gerenciais além dos de conformidade', async () => {
    mockSessao();
    mockBenchmark();
    renderBenchmarking();
    await evolucaoPronta();
    expect(screen.getByRole('button', { name: /RCL por habitante/ })).toBeInTheDocument();
    // O rótulo também aparece no cabeçalho ordenável do ranking — daí o getAll.
    expect(screen.getAllByRole('button', { name: /Investimento sobre a RCL/ }).length).toBeGreaterThan(0);
  });

  it('desenha a evolução na coorte com a mediana período a período', async () => {
    mockSessao();
    mockBenchmark();
    renderBenchmarking();
    // O título do bloco existe antes do dado chegar; esperamos a tabela resolvida.
    const linha = await evolucaoPronta();
    expect(screen.getByText(/mesma coorte em todos os pontos/)).toBeInTheDocument();
    expect(linha.textContent).toContain('135 de 176');
  });

  it('recusa desenhar trajetória com um único período comparável', async () => {
    mockSessao();
    mockBenchmark({ evolucaoPontos: 1 });
    renderBenchmarking();
    expect(await screen.findByTestId('evolucao-insuficiente')).toBeInTheDocument();
  });

  it('exporta a evolução em CSV', async () => {
    mockSessao();
    mockBenchmark();
    renderBenchmarking();
    await evolucaoPronta();
    expect(screen.getAllByRole('button', { name: /CSV/ }).length).toBeGreaterThan(0);
  });

  it('rotula a unidade sem chamar tudo de percentual da RCL', async () => {
    mockSessao();
    mockBenchmark();
    renderBenchmarking();
    await evolucaoPronta();
    expect(screen.getAllByText(/11,80% da RCL/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/11,39% da RCL/).length).toBeGreaterThan(0);
  });

  it('declara a cobertura da página — coorte mais rala do produto (U34)', async () => {
    mockSessao();
    mockBenchmark();
    vi.spyOn(backend, 'fetchCoberturaPagina').mockResolvedValue({
      pagina: 'benchmarking',
      ente: { cod_ibge: '2304400', tem_dado: true, periodo_mais_recente: '2024-B6', periodo_solicitado: '2024-B6' },
      escopo: { entes_no_escopo: 184, entes_com_dado: 18 },
      fontes: [],
      indicadores: [{ indicador: 'pessoal_executivo', entes_com_dado: 18, periodo_mais_recente: '2024-B6' }],
      lacunas: ['pessoal_executivo'],
      observacao: 'Esta página depende de dados que a plataforma ainda não carregou.',
    } as never);
    renderBenchmarking();
    expect(await screen.findByRole('button', { name: /Responde para/ })).toHaveTextContent('18 de 184');
  });
});
