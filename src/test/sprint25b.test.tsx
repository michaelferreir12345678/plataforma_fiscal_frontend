/**
 * Sprint 25B — Pessoal (página nova), Dívida, Resultado e Caixa.
 *
 * Aceite coberto aqui: `/pessoal` existe e responde às 10 perguntas do domínio; os
 * endpoints antes ociosos dos quatro módulos passam a ter consumidor; a meta da LDO
 * cadastrada pela organização é sempre rotulada como tal.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { AppProvider } from '../context/AppContext';
import { PessoalPage } from '../pages/PessoalPage';
import { ResultadoPage } from '../pages/ResultadoPage';
import { CaixaPage } from '../pages/CaixaPage';
import * as backend from '../services/backend';
import * as api from '../services/api';

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
  periodos: [
    { periodo: '2023-Q3', relatorio: 'RGF', versao_entrega: '1', vigente: true },
    { periodo: '2024-Q3', relatorio: 'RGF', versao_entrega: '1', vigente: true },
  ],
};
const SRC_RGF = { relatorio: 'RGF', anexo: 'Anexo 01', periodo: '2024-Q3', versao_entrega: '1' };
const SRC_RREO = { relatorio: 'RREO', anexo: 'Anexo 06', periodo: '2024-B6', versao_entrega: '1' };

const AJUSTE: backend.SerieAjuste = {
  base_periodo: '2024-Q3',
  deflator_disponivel: true,
  populacao_disponivel: true,
  fonte_deflator: 'silver.bcb_indice#433 (IPCA/IBGE via SGS-BCB)',
  fonte_populacao: 'silver.ibge_populacao (estimativas IBGE)',
  observacao: null,
  itens: [],
};

function mockComum(capacidades: string[] = ['ver']) {
  vi.spyOn(api, 'getToken').mockReturnValue('token-de-teste');
  vi.spyOn(backend, 'fetchPeriodos').mockImplementation((_ibge, relatorio) =>
    Promise.resolve((relatorio === 'RGF' ? PERIODOS_RGF : PERIODOS_RREO) as never),
  );
  vi.spyOn(backend, 'fetchMe').mockResolvedValue({
    usuario: { id: 'u1', email: 'gestor@ente.gov.br', nome: 'Gestor' },
    org_ativa: { id: 'o1', nome: 'Prefeitura', tipo: 'ente', capacidades },
    orgs: [],
  } as never);
}

// --- Pessoal -----------------------------------------------------------------
function pessoalFake(over: Partial<backend.PessoalDetalhe> = {}): backend.PessoalDetalhe {
  return {
    cod_ibge: '2304400',
    periodo: '2024-Q3',
    periodo_rreo: '2024-B6',
    versao_entrega: '1',
    esfera: 'municipal',
    rpps: false,
    cadencia_rgf: 'quadrimestral',
    totais: { despesa_bruta: 6_700_000_000, exclusoes: 1_200_000_000, despesa_liquida: 5_585_000_000, pct_rcl: 48.8 },
    rcl_12m: 11_400_000_000,
    executivo: {
      poder_codigo: 'ENTE.EXEC',
      descricao: 'Poder Executivo',
      despesa_bruta: 6_500_000_000,
      exclusoes: 1_100_000_000,
      despesa_liquida: 5_400_000_000,
      pct_rcl: 47.21,
      faixa: 'normal',
      teto_pct: 54,
      indicador: 'pessoal_executivo',
    },
    composicao: [],
    serie: [
      { periodo: '2023-Q3', despesa_liquida: 5_000_000_000, pct_rcl: 49.27, despesa_liquida_real: 5_300_000_000, despesa_liquida_per_capita: 1900, populacao: 2_600_000 },
      { periodo: '2024-Q3', despesa_liquida: 5_585_000_000, pct_rcl: 48.82, despesa_liquida_real: 5_585_000_000, despesa_liquida_per_capita: 2169, populacao: 2_574_412 },
    ],
    serie_ajuste: AJUSTE,
    comparacao: { periodo_anterior: '2023-Q3', despesa_liquida_anterior: 5_000_000_000, delta_pct: 11.7 },
    periodo_breadcrumb: [],
    source_ref: SRC_RGF,
    ...over,
  } as backend.PessoalDetalhe;
}

function mockPessoal() {
  vi.spyOn(backend, 'fetchPessoal').mockResolvedValue(pessoalFake());
  vi.spyOn(backend, 'fetchPessoalPorPoder').mockResolvedValue({
    cod_ibge: '2304400',
    periodo: '2024-Q3',
    versao_entrega: '1',
    esfera: 'municipal',
    rpps: false,
    consolidado: {
      poder_codigo: 'ENTE',
      descricao: 'Ente (Consolidado)',
      despesa_bruta: 6_700_000_000,
      exclusoes: 1_200_000_000,
      despesa_liquida: 5_585_000_000,
      pct_rcl: 48.82,
      faixa: null,
      teto_pct: 60,
      indicador: null,
    },
    itens: [
      {
        poder_codigo: 'ENTE.EXEC', descricao: 'Poder Executivo', despesa_bruta: 6_500_000_000,
        exclusoes: 1_100_000_000, despesa_liquida: 5_400_000_000, pct_rcl: 47.21,
        faixa: 'normal', teto_pct: 54, indicador: 'pessoal_executivo',
      },
      {
        poder_codigo: 'ENTE.LEG', descricao: 'Poder Legislativo', despesa_bruta: 200_000_000,
        exclusoes: 10_000_000, despesa_liquida: 185_000_000, pct_rcl: 1.62,
        faixa: null, teto_pct: null, indicador: null,
      },
    ],
    source_ref: SRC_RGF,
  } as never);
  vi.spyOn(backend, 'fetchPessoalArvore').mockImplementation((_ibge, params) =>
    Promise.resolve((
      params.node
        ? {
            node: { codigo: 'ENTE', descricao: 'Ente (Consolidado)', nivel: 1 },
            breadcrumb: [],
            children: [
              { codigo: 'ENTE.EXEC', descricao: 'Poder Executivo', nivel: 2, measures: { despesa_liquida: 5_400_000_000, despesa_bruta: 6_500_000_000, exclusoes: 1_100_000_000, pct_rcl: 47.21 }, has_children: false },
            ],
            measures: { despesa_liquida: 5_585_000_000 },
            period: '2024-Q3',
            source_ref: SRC_RGF,
          }
        : {
            node: null,
            breadcrumb: [],
            children: [
              { codigo: 'ENTE', descricao: 'Ente (Consolidado)', nivel: 1, measures: { despesa_liquida: 5_585_000_000, despesa_bruta: 6_700_000_000, exclusoes: 1_200_000_000, pct_rcl: 48.82 }, has_children: true },
            ],
            measures: {},
            period: '2024-Q3',
            source_ref: SRC_RGF,
          }) as never,
    ),
  );
  vi.spyOn(backend, 'fetchPessoalMemoria').mockResolvedValue({
    cod_ibge: '2304400',
    periodo: '2024-Q3',
    versao_entrega: '1',
    rpps: false,
    despesa_bruta: 6_700_000_000,
    exclusoes: 1_200_000_000,
    despesa_liquida: 5_585_000_000,
    despesa_liquida_reportada: 5_585_000_000,
    exclusoes_reportadas: 1_200_000_000,
    rcl_12m: 11_400_000_000,
    pct_rcl: 48.82,
    formula_liquida: 'liquida = bruta − exclusões (art. 19, §1º)',
    formula_pct: 'pct_rcl = liquida ÷ RCL 12m × 100',
    exclusoes_detalhe: [
      { componente: 'indenizacoes', valor: 2_025_651, incluida: true, motivo: null },
      {
        componente: 'inativos_pensionistas_rpps',
        valor: 1_157_200_559,
        incluida: false,
        motivo: 'ente sem RPPS: exclusão não se aplica',
      },
    ],
    hierarquia: 'Ente → Poder → Órgão',
    detalhes: {},
    source_ref: SRC_RGF,
  } as never);
  vi.spyOn(backend, 'fetchRcl').mockResolvedValue({
    cod_ibge: '2304400',
    periodo: '2024-B6',
    versao_entrega: '1',
    as_of: null,
    rcl_12m: 11_400_000_000,
    receita_corrente: 13_000_000_000,
    deducoes_total: 1_600_000_000,
    componentes: [],
    deducoes: [{ conta: 'Dedução FUNDEB', valor: 1_400_000_000 }],
    source_ref: { relatorio: 'RREO', anexo: 'Anexo 03', periodo: '2024-B6', versao_entrega: '1' },
  } as never);
  vi.spyOn(backend, 'fetchProjecao').mockResolvedValue({
    cod_ibge: '2304400',
    indicador: 'pessoal',
    descricao: 'Despesa com Pessoal — Executivo (% RCL)',
    unidade: 'PCT_RCL',
    modelo: 'holt',
    esfera: 'municipal',
    nivel_confianca: 95,
    horizonte: 4,
    as_of: null,
    gerado_em: null,
    historico: [],
    projecao: [
      { periodo_alvo: '2025-Q1', passo: 1, valor_previsto: 49.1, ic_inferior: 47.5, ic_superior: 50.7, teto_pct: 54, faixa: 'normal', cruza_limite: false },
    ],
    cruzamento: {
      aplicavel: true, cruza: false, periodo_cruzamento: null, passo_cruzamento: null,
      valor_no_cruzamento: null, teto_pct: 54, indicador_limite: 'pessoal_executivo', esfera: 'municipal',
    },
    memoria: {},
    source_ref: SRC_RGF,
  } as never);
}

function renderPessoal() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <PessoalPage />
      </AppProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('Pessoal — página nova (Sprint 25B)', () => {
  beforeEach(() => {
    mockComum();
    mockPessoal();
  });

  it('responde "estou dentro do limite?" com faixa esfera-aware e folga até o teto', async () => {
    renderPessoal();
    expect(await screen.findByText(/Despesa com pessoal · Poder Executivo/)).toBeInTheDocument();
    expect(screen.getByText(/teto 54% da RCL/)).toBeInTheDocument();
    expect(screen.getByText(/Folga até o teto/)).toBeInTheDocument();
    expect(screen.getByText(/6,79 p\.p\./)).toBeInTheDocument(); // 54 − 47,21
  });

  it('mostra cada poder com sua faixa e não inventa teto para o Legislativo', async () => {
    renderPessoal();
    expect(await screen.findByText('Poder Legislativo')).toBeInTheDocument();
    expect(screen.getByText('sem teto legal próprio')).toBeInTheDocument();
    expect(screen.getByText(/Somar percentuais de poderes distintos/)).toBeInTheDocument();
  });

  it('navega a árvore poder → órgão', async () => {
    renderPessoal();
    const raiz = await screen.findByRole('button', { name: /Ente \(Consolidado\)/ });
    await userEvent.click(raiz);
    await waitFor(() =>
      expect(backend.fetchPessoalArvore).toHaveBeenCalledWith(
        '2304400',
        expect.objectContaining({ node: 'ENTE' }),
      ),
    );
  });

  it('abre a memória com as exclusões e marca a que depende de RPPS', async () => {
    renderPessoal();
    await userEvent.click(await screen.findByRole('button', { name: /Memória de cálculo/ }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText(/liquida = bruta − exclusões/)).toBeInTheDocument();
    expect(within(dialogo).getByText('inativos_pensionistas_rpps')).toBeInTheDocument();
    expect(within(dialogo).getByText(/não — ente sem RPPS/)).toBeInTheDocument();
  });

  it('mostra a RCL (denominador) e a projeção com IC', async () => {
    renderPessoal();
    // a RCL é apurada no RREO: pedir no período RGF devolveria 404
    await waitFor(() => expect(backend.fetchRcl).toHaveBeenCalledWith('2304400', '2024-B6'));
    expect(await screen.findByText(/RCL · o denominador do limite/)).toBeInTheDocument();
    expect(screen.getByText(/Dedução FUNDEB/)).toBeInTheDocument();
    expect(await screen.findByText('2025-Q1')).toBeInTheDocument();
    expect(screen.getByText(/47,50% – 50,70%/)).toBeInTheDocument();
    expect(screen.getByText(/Sem cruzamento do teto/)).toBeInTheDocument();
  });

  it('simula o impacto de um reajuste na folha e mostra a faixa resultante', async () => {
    vi.spyOn(backend, 'simularLimite').mockResolvedValue({
      indicador: 'pessoal_executivo',
      valor_rs_atual: 5_400_000_000,
      valor_rs_simulado: 5_900_000_000,
      valor_pct_atual: 47.21,
      valor_pct_simulado: 51.58,
      faixa_atual: 'normal',
      faixa_simulada: 'alerta',
      teto_pct: 54,
      persistido: false,
    } as never);
    renderPessoal();
    const campo = await screen.findByLabelText(/Variação da despesa com pessoal/);
    await userEvent.type(campo, '500000000');
    await userEvent.click(screen.getByRole('button', { name: 'simular' }));
    await waitFor(() => expect(screen.getByText(/51,58%/)).toBeInTheDocument());
    expect(screen.getByText(/\(alerta\)/)).toBeInTheDocument();
    // o mart do limite e a RCL vivem no período RREO — simular no RGF não acharia o indicador
    expect(backend.simularLimite).toHaveBeenCalledWith(
      '2304400',
      'pessoal_executivo',
      '2024-B6',
      { delta_rs: 500000000 },
    );
  });

  it('série alterna nominal → real → per capita', async () => {
    renderPessoal();
    await userEvent.click(await screen.findByRole('button', { name: /Real \(preços 2024-Q3\)/ }));
    expect(await screen.findByText(/silver.bcb_indice#433/)).toBeInTheDocument();
  });

  it('sem dado do período, diz "sem dado" em vez de desenhar zero', async () => {
    vi.spyOn(backend, 'fetchPessoal').mockResolvedValue(
      pessoalFake({ totais: { despesa_liquida: null } as never, composicao: [], executivo: null }),
    );
    renderPessoal();
    expect(await screen.findByText(/Sem dado para/)).toBeInTheDocument();
  });

  it('rotula a cadência do RGF — quadrimestral ou semestral (U25)', async () => {
    // O cálculo (mapeamento Q→B) já tratava os dois casos certo; só o cabeçalho não dizia
    // qual cadência vale para este ente (semestral = município < 50 mil hab., LRF art. 63).
    renderPessoal();
    expect(await screen.findByText(/RGF quadrimestral/)).toBeInTheDocument();
  });

  it('cadência semestral também aparece, quando o backend a informa (U25)', async () => {
    vi.spyOn(backend, 'fetchPessoal').mockResolvedValue(pessoalFake({ cadencia_rgf: 'semestral' }));
    renderPessoal();
    expect(await screen.findByText(/RGF semestral/)).toBeInTheDocument();
    expect(screen.queryByText(/RGF quadrimestral/)).not.toBeInTheDocument();
  });
});

// --- Resultado: meta oficial × cadastrada -------------------------------------
function resultadoFake(): backend.ResultadoDetalhe {
  return {
    cod_ibge: '2304400',
    periodo: '2024-B6',
    as_of: '2026-07-31',
    versao_entrega: '1',
    valores: {
      receita_primaria: 12_000_000_000,
      despesa_primaria: 11_780_000_000,
      resultado_primario: 220_000_000,
      resultado_nominal: 150_000_000,
      juros_liquidos: 70_000_000,
      dcl_inicio: 3_000_000_000,
      dcl_fim: 3_900_000_000,
      variacao_dcl: 900_000_000,
      resultado_nominal_abaixo: -900_000_000,
      meta_primario: null,
      meta_nominal: null,
    },
    meta: {
      informada: false,
      meta_primario: null,
      realizado_primario: 220_000_000,
      esforco_primario: null,
      atingido_primario: null,
      meta_nominal: null,
      realizado_nominal: 150_000_000,
    },
    receita_componentes: [],
    despesa_componentes: [],
    serie: [
      { periodo: '2024-B6', resultado_primario: 220_000_000, resultado_nominal: 150_000_000, resultado_primario_real: 220_000_000, resultado_primario_per_capita: 85, populacao: 2_574_412 },
    ],
    serie_ajuste: { ...AJUSTE, base_periodo: '2024-B6' },
    comparacao: null,
    periodo_breadcrumb: [],
    source_ref: SRC_RREO,
  } as unknown as backend.ResultadoDetalhe;
}

function mockResultado(meta: Partial<backend.MetaResultado> = {}) {
  vi.spyOn(backend, 'fetchResultado').mockResolvedValue(resultadoFake());
  vi.spyOn(backend, 'fetchResultadoCascata').mockResolvedValue({
    cod_ibge: '2304400', periodo: '2024-B6', versao_entrega: '1',
    acima_da_linha: [], abaixo_da_linha: [], source_ref: SRC_RREO,
  } as never);
  vi.spyOn(backend, 'fetchResultadoReconciliacao').mockResolvedValue({
    cod_ibge: '2304400', periodo: '2024-B6', versao_entrega: '1',
    nominal_acima: 150_000_000, nominal_abaixo: -900_000_000, nominal_abaixo_ajustado: 150_000_000,
    ajustes: [], identidade_primario_ok: true, identidade_nominal_dcl_ok: true,
    dcl_fim: 3_900_000_000, dcl_sprint8: 3_900_000_000, dcl_sprint8_periodo: '2024-Q3',
    concilia_com_sprint8: true, observacao: '', source_ref: SRC_RREO,
  } as never);
  vi.spyOn(backend, 'fetchResultadoMeta').mockResolvedValue({
    cod_ibge: '2304400',
    periodo: '2024-B6',
    versao_entrega: '1',
    resumo: {
      informada: false, meta_primario: null, realizado_primario: 220_000_000,
      esforco_primario: null, atingido_primario: null, meta_nominal: null,
      realizado_nominal: 150_000_000,
    },
    bimestre: 6,
    fracao_exercicio: 1,
    projecao_primario: 220_000_000,
    esforco_necessario: null,
    origem: 'ausente',
    restrita_ao_ente: false,
    cadastros: [],
    observacao: 'Meta fiscal não informada no Anexo 6 deste ente/período.',
    source_ref: SRC_RREO,
    ...meta,
  } as never);
}

function renderResultado() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <ResultadoPage />
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('Resultado — meta da LDO (decisão §11.5)', () => {
  it('explica o resultado em reais pela tela, sem trocar pela razão sobre a RCL', async () => {
    mockComum();
    mockResultado();
    const buscar = vi.spyOn(backend, 'buscarCentralDados').mockReturnValue(new Promise(() => {}));
    const explicar = vi.spyOn(backend, 'explicarNumero');
    renderResultado();

    await screen.findByText(/2024-B6 · resultados primário e nominal/i);
    await userEvent.click(await screen.findByRole('button', { name: /Entenda a tela Resultado primário em reais/i }));
    await waitFor(() => expect(buscar).toHaveBeenCalledWith(expect.objectContaining({
      pagina: 'resultado', periodo: '2024-B6', as_of: '2026-07-31',
    })));
    expect(explicar).not.toHaveBeenCalled();
  });

  it('rotula a meta cadastrada pela organização como restrita a esta tela', async () => {
    mockComum();
    mockResultado({
      origem: 'manual',
      restrita_ao_ente: true,
      resumo: {
        informada: true, meta_primario: 250_000_000, realizado_primario: 220_000_000,
        esforco_primario: 30_000_000, atingido_primario: false, meta_nominal: null,
        realizado_nominal: 150_000_000,
      },
      cadastros: [
        {
          id: 'm1', exercicio: 2024, indicador: 'primario', valor: 250_000_000,
          fonte_declarada: 'LDO 2024, Anexo de Metas Fiscais', observacao: null,
          atualizado_em: '2026-07-27T12:00:00Z', atualizado_por: 'u1',
        },
      ],
      observacao: 'Meta da LDO cadastrada nesta organização — não entra em comparações agregadas.',
    } as never);
    renderResultado();
    expect(await screen.findByText(/Cadastro da organização · não sai desta tela/)).toBeInTheDocument();
    expect(screen.getByText(/LDO 2024, Anexo de Metas Fiscais/)).toBeInTheDocument();
    expect(screen.getByText('Abaixo da meta')).toBeInTheDocument();
  });

  it('quem administra pode cadastrar a meta; quem só vê, não', async () => {
    mockComum(['ver']);
    mockResultado();
    const { unmount } = renderResultado();
    expect(await screen.findByText(/Sem meta publicada nem cadastrada/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cadastrar meta da LDO/ })).not.toBeInTheDocument();
    unmount();

    vi.restoreAllMocks();
    mockComum(['ver', 'administrar']);
    mockResultado();
    vi.spyOn(backend, 'salvarMetaFiscal').mockResolvedValue({
      id: 'm1', exercicio: 2024, indicador: 'primario', valor: 250_000_000,
      fonte_declarada: 'LDO 2024', observacao: null,
      atualizado_em: '2026-07-27T12:00:00Z', atualizado_por: 'u1',
    } as never);
    renderResultado();
    await userEvent.click(await screen.findByRole('button', { name: /cadastrar meta da LDO/ }));
    await userEvent.type(await screen.findByLabelText(/Meta de resultado primário em reais/), '250000000');
    await userEvent.type(screen.getByLabelText(/Fonte declarada da meta/), 'LDO 2024');
    await userEvent.click(screen.getByRole('button', { name: 'salvar meta' }));
    await waitFor(() =>
      expect(backend.salvarMetaFiscal).toHaveBeenCalledWith('2304400', {
        exercicio: 2024,
        indicador: 'primario',
        valor: 250000000,
        fonte_declarada: 'LDO 2024',
      }),
    );
  });

  it('exige fonte declarada — número sem origem não entra', async () => {
    mockComum(['ver', 'administrar']);
    mockResultado();
    const salvar = vi.spyOn(backend, 'salvarMetaFiscal');
    renderResultado();
    await userEvent.click(await screen.findByRole('button', { name: /cadastrar meta da LDO/ }));
    await userEvent.type(await screen.findByLabelText(/Meta de resultado primário em reais/), '250000000');
    await userEvent.click(screen.getByRole('button', { name: 'salvar meta' }));
    expect(await screen.findByText(/Diga de onde veio o número/)).toBeInTheDocument();
    expect(salvar).not.toHaveBeenCalled();
  });

  it('diz "(com RPPS)"/"(sem RPPS)" no número principal, não só na nota recolhida (U27)', async () => {
    mockComum();
    mockResultado();
    renderResultado();
    expect(await screen.findByText(/Resultado primário \(com RPPS\)/)).toBeInTheDocument();
    expect(screen.getByText(/Resultado nominal \(sem RPPS\)/)).toBeInTheDocument();
  });

  it('exibe meta_nominal/realizado_nominal quando o ente só publica a meta nominal (U28)', async () => {
    // Antes: só meta_primario aparecia; um ente com meta SÓ nominal lia "Meta de resultado
    // primário —", indistinguível de não ter meta nenhuma.
    mockComum();
    mockResultado({
      origem: 'a6',
      resumo: {
        informada: true, meta_primario: null, realizado_primario: 220_000_000,
        esforco_primario: null, atingido_primario: null,
        meta_nominal: 100_000_000, realizado_nominal: 150_000_000,
      },
    } as never);
    renderResultado();
    expect(await screen.findByText('Meta de resultado nominal')).toBeInTheDocument();
    expect(screen.getByText('Realizado (nominal)')).toBeInTheDocument();
    expect(screen.queryByText('Meta de resultado primário')).not.toBeInTheDocument();
    expect(screen.queryByText(/Sem meta publicada nem cadastrada/)).not.toBeInTheDocument();
  });
});

// --- Caixa: RP sem lastro dedicado -------------------------------------------
describe('Caixa — RP sem lastro, árvore por fonte e série', () => {
  beforeEach(() => {
    mockComum();
    vi.spyOn(backend, 'fetchCaixaSuficiencia').mockResolvedValue({
      cod_ibge: '2304400', periodo: '2024-Q3', as_of: null, versao_entrega: '1',
      itens: [
        {
          fonte_codigo: '500', descricao: 'Recursos não vinculados', vinculada: false,
          grupo_codigo: 'G1', grupo_descricao: 'Recursos', disp_bruta: 200_000_000,
          obrigacoes: 50_000_000, disp_liquida_antes: 150_000_000, rpnp_exercicio: 200_000_000,
          disp_liquida_apos: -50_000_000, suficiente: false, status: 'insuficiente_rpnp',
          semaforo: 'vermelho', rpnp_sem_lastro: 50_000_000,
        },
      ],
      grupos: [],
      resumo: {
        n_fontes: 1, n_insuficientes: 1, n_deficit: 0,
        total_disp_liquida_apos_positiva: 0, total_rpnp_sem_lastro: 50_000_000,
      },
      observacao: '', source_ref: { ...SRC_RGF, anexo: 'Anexo 05' },
    } as never);
    vi.spyOn(backend, 'fetchCaixa').mockResolvedValue({
      cod_ibge: '2304400', periodo: '2024-Q3', periodo_rreo: '2024-B6', as_of: null,
      versao_entrega: '1', esfera: 'municipal',
      resumo: {
        n_fontes: 1, n_insuficientes: 1, n_deficit: 0,
        total_disp_liquida_apos_positiva: 0, total_rpnp_sem_lastro: 50_000_000,
      },
      disp_liquida_apos_total: -50_000_000, fontes_criticas: [], rap_consolidado: null,
      rap_por_orgao: [], art42_aplicavel: false,
      serie: [
        { periodo: '2023-Q3', disp_liquida_apos_total: 90_000_000, rpnp_sem_lastro_total: 97_947_852, rpnp_sem_lastro_real: 102_680_003, rpnp_sem_lastro_per_capita: 37, populacao: 2_600_000 },
        { periodo: '2024-Q3', disp_liquida_apos_total: -50_000_000, rpnp_sem_lastro_total: 50_505_918, rpnp_sem_lastro_real: 50_505_918, rpnp_sem_lastro_per_capita: 19, populacao: 2_574_412 },
      ],
      serie_ajuste: AJUSTE,
      comparacao: null, periodo_breadcrumb: [],
      source_ref: { ...SRC_RGF, anexo: 'Anexo 05' }, source_ref_rap: null,
    } as never);
    vi.spyOn(backend, 'fetchCaixaArt42').mockResolvedValue({
      cod_ibge: '2304400', periodo: '2024-Q3', as_of: null, versao_entrega: '1',
      esfera: 'municipal', ano: 2024, quadrimestre: 3, aplicavel: false, janela_vedacao: false,
      atende: null, n_descumprimentos: 0, total_lacuna: 0, fontes: [],
      observacao: 'Ano sem fim de mandato.', source_ref: null,
    } as never);
    vi.spyOn(backend, 'fetchCaixaRpnpSemLastro').mockResolvedValue({
      cod_ibge: '2304400', periodo: '2024-Q3', as_of: null, versao_entrega: '1',
      itens: [
        {
          fonte_codigo: '500', descricao: 'Recursos não vinculados', vinculada: false,
          rpnp_exercicio: 200_000_000, disp_liquida_antes: 150_000_000, rpnp_sem_lastro: 50_000_000,
        },
      ],
      total_rpnp_sem_lastro: 50_000_000, total_vinculada: 0, total_nao_vinculada: 50_000_000,
      observacao: 'RP não processados sem disponibilidade não contam nos mínimos.',
      source_ref: { ...SRC_RGF, anexo: 'Anexo 05' },
    } as never);
    vi.spyOn(backend, 'fetchCaixaArvore').mockResolvedValue({
      node: null, breadcrumb: [],
      children: [
        { codigo: '500', descricao: 'Recursos não vinculados', nivel: 2, measures: { disp_liquida_antes: 150_000_000, rpnp_exercicio: 200_000_000, disp_liquida_apos: -50_000_000 }, has_children: false },
      ],
      measures: {}, period: '2024-Q3', source_ref: { ...SRC_RGF, anexo: 'Anexo 05' },
    } as never);
    vi.spyOn(backend, 'fetchCaixaMemoria').mockResolvedValue({
      cod_ibge: '2304400', periodo: '2024-Q3', as_of: null, versao_entrega: '1', fontes: [],
      total_rpnp_sem_lastro: 50_000_000,
      formula_liquida_antes: 'disp_bruta − obrigações',
      formula_liquida_apos: 'disp_liquida_antes − RPNP inscrito',
      formula_rpnp_sem_lastro: 'max(0, RPNP − disp_liquida_antes)',
      regra_suficiencia: 'por fonte, nunca consolidada',
      detalhes: {}, source_ref: { ...SRC_RGF, anexo: 'Anexo 05' },
    } as never);
  });

  it('mostra a vista dedicada de RP sem lastro, fonte a fonte', async () => {
    render(
      <MemoryRouter>
        <AppProvider>
          <CaixaPage />
        </AppProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Restos a pagar sem lastro · fonte a fonte/)).toBeInTheDocument();
    expect(screen.getByText('Total sem lastro')).toBeInTheDocument();
    expect(screen.getByText(/não contam nos mínimos/)).toBeInTheDocument();
  });

  it('abre a memória de cálculo do caixa (endpoint antes ocioso)', async () => {
    render(
      <MemoryRouter>
        <AppProvider>
          <CaixaPage />
        </AppProvider>
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole('button', { name: /Memória de cálculo/ }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText(/max\(0, RPNP − disp_liquida_antes\)/)).toBeInTheDocument();
    expect(within(dialogo).getByText(/por fonte, nunca consolidada/)).toBeInTheDocument();
  });

  it('Art42Panel mostra o quadrimestre avaliado, não só o booleano da janela (U29)', async () => {
    vi.spyOn(backend, 'fetchCaixaArt42').mockResolvedValue({
      cod_ibge: '2304400', periodo: '2024-Q3', as_of: null, versao_entrega: '1',
      esfera: 'municipal', ano: 2024, quadrimestre: 3, aplicavel: true, janela_vedacao: true,
      atende: true, n_descumprimentos: 0, total_lacuna: 0, fontes: [],
      observacao: 'Último ano do mandato — art. 42 avaliado.',
      source_ref: { ...SRC_RGF, anexo: 'Anexo 05' },
    } as never);
    render(
      <MemoryRouter>
        <AppProvider>
          <CaixaPage />
        </AppProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/2024-Q3 · dentro da janela de vedação/)).toBeInTheDocument();
  });
});
