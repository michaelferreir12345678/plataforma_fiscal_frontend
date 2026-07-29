/**
 * Sprint 25A — rede de proteção das páginas Receita e Despesa.
 *
 * Cobre o que a auditoria (§2.4/§2.5) apontou como ausente e a sprint exigiu:
 * drill navegável de verdade, memória de cálculo visível, série com base real/per capita,
 * conciliação de transferências com os dois lados, exportação, proveniência e os estados
 * de vazio/defasado.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { AppProvider } from '../context/AppContext';
import { ReceitaPage } from '../pages/ReceitaPage';
import { DespesaPage } from '../pages/DespesaPage';
import { montarCsv } from '../components/ExportButton';
import * as backend from '../services/backend';
import * as api from '../services/api';

const PERIODOS_RREO = {
  cod_ibge: '2304400',
  relatorio: 'RREO',
  default: '2024-B6',
  periodos: [
    { periodo: '2023-B6', relatorio: 'RREO', versao_entrega: '1', vigente: true },
    { periodo: '2024-B6', relatorio: 'RREO', versao_entrega: '1', vigente: true },
  ],
};
const PERIODOS_RGF = { cod_ibge: '2304400', relatorio: 'RGF', default: '2024-Q3', periodos: [] };

const SOURCE = { relatorio: 'RREO', anexo: 'Anexo 01', periodo: '2024-B6', versao_entrega: '1' };

const AJUSTE: backend.SerieAjuste = {
  base_periodo: '2024-B6',
  deflator_disponivel: true,
  populacao_disponivel: true,
  fonte_deflator: 'silver.bcb_indice#433 (IPCA/IBGE via SGS-BCB)',
  fonte_populacao: 'silver.ibge_populacao (estimativas IBGE)',
  observacao: null,
  itens: [
    { periodo: '2023-B6', fator_deflator: 1.1268, ipca_acum_pct: 12.68, populacao: 1000000, pop_ano_ref: 2023 },
    { periodo: '2024-B6', fator_deflator: 1, ipca_acum_pct: 0, populacao: 1100000, pop_ano_ref: 2024 },
  ],
};

function receitaFake(overrides: Partial<backend.ReceitaDetalhe> = {}): backend.ReceitaDetalhe {
  return {
    cod_ibge: '2304400',
    periodo: '2024-B6',
    versao_entrega: '1',
    totais: {
      previsto_inicial: 9_000_000,
      previsto_atualizado: 10_000_000,
      arrecadado_acum: 8_000_000,
      arrecadado_bimestre: 1_000_000,
      deducoes: null,
    },
    realizacao_pct: 80,
    rcl_12m: 12_000_000,
    dependencia: { propria: 3_000_000, transferida: 5_000_000, total: 8_000_000, pct_propria: 37.5, pct_transferida: 62.5 },
    composicao: [
      {
        codigo: 'ReceitasCorrentes',
        descricao: 'RECEITAS CORRENTES',
        nivel: 1,
        measures: { arrecadado_acum: 7_000_000, previsto_atualizado: 9_000_000, previsto_inicial: 8_000_000 },
        has_children: true,
      },
    ],
    serie: [
      { periodo: '2023-B6', arrecadado_acum: 7_000_000, arrecadado_real: 7_887_600, arrecadado_per_capita: 7, populacao: 1_000_000 },
      { periodo: '2024-B6', arrecadado_acum: 8_000_000, arrecadado_real: 8_000_000, arrecadado_per_capita: 7.27, populacao: 1_100_000 },
    ],
    serie_ajuste: AJUSTE,
    comparacao: { periodo_anterior: '2023-B6', arrecadado_acum_anterior: 7_000_000, delta_pct: 14.3 },
    source_ref: SOURCE,
    ...overrides,
  } as backend.ReceitaDetalhe;
}

function despesaFake(overrides: Partial<backend.DespesaDetalhe> = {}): backend.DespesaDetalhe {
  return {
    cod_ibge: '2304400',
    periodo: '2024-B6',
    versao_entrega: '1',
    eixo: 'funcao',
    totais: {
      dotacao_atualizada: 10_000_000,
      empenhado: 7_000_000,
      liquidado: 6_000_000,
      pago: 5_000_000,
      inscrito_rap: 900_000,
      dotacao_inicial: 9_500_000,
    },
    potencial_rap: 2_000_000,
    empenhado_pct_rcl: 58.3,
    rcl_12m: 12_000_000,
    composicao: [
      {
        codigo: '10',
        descricao: 'Saúde',
        nivel: 1,
        measures: { empenhado: 4_000_000, dotacao_atualizada: 5_000_000, liquidado: 3_500_000, pago: 3_000_000 },
        has_children: true,
      },
    ],
    serie: [
      { periodo: '2023-B6', empenhado: 6_000_000, empenhado_real: 6_760_800, empenhado_per_capita: 6, populacao: 1_000_000 },
      { periodo: '2024-B6', empenhado: 7_000_000, empenhado_real: 7_000_000, empenhado_per_capita: 6.36, populacao: 1_100_000 },
    ],
    serie_ajuste: AJUSTE,
    comparacao: { periodo_anterior: '2023-B6', empenhado_anterior: 6_000_000, delta_pct: 16.7 },
    source_ref: { relatorio: 'RREO', anexo: 'Anexo 01/02', periodo: '2024-B6', versao_entrega: '1' },
    ...overrides,
  } as backend.DespesaDetalhe;
}

function arvoreFake(node: string | null): backend.DrillEnvelope {
  if (node === null) {
    return {
      node: null,
      breadcrumb: [],
      children: [
        {
          codigo: 'ReceitasCorrentes',
          descricao: 'RECEITAS CORRENTES',
          nivel: 1,
          measures: { arrecadado_acum: 7_000_000, previsto_atualizado: 9_000_000, previsto_inicial: 8_000_000, empenhado: 4_000_000, dotacao_atualizada: 5_000_000, liquidado: 3_500_000, pago: 3_000_000 },
          has_children: true,
        },
      ],
      measures: {},
      period: '2024-B6',
      source_ref: SOURCE,
    };
  }
  return {
    node: { codigo: 'ReceitasCorrentes', descricao: 'RECEITAS CORRENTES', nivel: 1 },
    breadcrumb: [],
    children: [
      {
        codigo: 'ReceitaTributaria',
        descricao: 'IMPOSTOS, TAXAS E CONTRIBUIÇÕES DE MELHORIA',
        nivel: 2,
        measures: { arrecadado_acum: 3_000_000, previsto_atualizado: 4_000_000, previsto_inicial: 3_500_000, empenhado: 2_000_000, dotacao_atualizada: 2_500_000, liquidado: 1_800_000, pago: 1_500_000 },
        has_children: false,
      },
    ],
    measures: { arrecadado_acum: 7_000_000 },
    period: '2024-B6',
    source_ref: SOURCE,
  };
}

const CONCILIACAO: backend.ReceitaConciliacao = {
  cod_ibge: '2304400',
  periodo: '2024-B6',
  versao_entrega: '1',
  tolerancia_pct: 1,
  observacao: 'Divergência sinalizada como qualidade de dado: o valor oficial do RREO permanece inalterado.',
  source_ref: SOURCE,
  itens: [
    {
      transferencia: 'FPM',
      fonte_externa: 'tesouro_fpm',
      rreo_acum: 3_000_000,
      externo_acum: 3_300_000,
      divergencia_pct: 10,
      divergencia_rs: 300_000,
      status: 'divergente',
      tabela_externa: 'silver.tesouro_fpm',
      periodo_externo: '2024 · meses 1–12',
      nos_rreo: ['TransferenciasDaUniao'],
      independente: true,
      base_comparacao: 'linha_especifica',
      participacao_no_agregado_pct: null,
    },
    {
      transferencia: 'Cota-Parte do ICMS',
      fonte_externa: 'derivado_rreo_a1',
      rreo_acum: 1_000_000,
      externo_acum: 1_000_000,
      divergencia_pct: 0,
      divergencia_rs: 0,
      status: 'conciliado',
      tabela_externa: 'silver.transferencia_generica',
      periodo_externo: '2024 · meses 1–12',
      nos_rreo: ['TransferenciasDosEstados'],
      independente: false,
      base_comparacao: 'linha_especifica',
      participacao_no_agregado_pct: null,
    },
  ],
};

function mockComum() {
  vi.spyOn(api, 'getToken').mockReturnValue('token-de-teste');
  vi.spyOn(backend, 'fetchPeriodos').mockImplementation((_ibge, relatorio) =>
    Promise.resolve((relatorio === 'RGF' ? PERIODOS_RGF : PERIODOS_RREO) as never),
  );
  vi.spyOn(backend, 'fetchMe').mockResolvedValue({
    usuario: { id: 'u1', email: 'gestor@ente.gov.br', nome: 'Gestor' },
    org_ativa: { id: 'o1', nome: 'Prefeitura', tipo: 'ente', capacidades: ['ver'] },
    orgs: [],
  } as never);
  vi.spyOn(backend, 'fetchDrill').mockImplementation((_r, _ibge, params) =>
    Promise.resolve(arvoreFake(params.node ?? null)),
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  mockComum();
});

function renderReceita() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <ReceitaPage />
      </AppProvider>
    </MemoryRouter>,
  );
}

function renderDespesa() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <DespesaPage />
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('exportação CSV', () => {
  it('escreve a proveniência no cabeçalho do arquivo (ente, período, fonte)', () => {
    const csv = montarCsv(
      'Receita — composição',
      [{ codigo: 'ReceitasCorrentes', valor: 7_000_000 }],
      [
        { cabecalho: 'codigo', valor: (l) => l.codigo },
        { cabecalho: 'arrecadado_acum', valor: (l) => l.valor },
      ],
      { ente: 'Fortaleza (2304400)', periodo: '2024-B6', fonte: 'RREO Anexo 01 v1' },
    );
    const linhas = csv.split('\r\n');
    expect(linhas[0]).toBe('# Receita — composição');
    expect(linhas).toContain('# periodo;2024-B6');
    expect(linhas).toContain('# fonte;RREO Anexo 01 v1');
    expect(linhas).toContain('codigo;arrecadado_acum');
    // decimal em pt-BR (o destino é o Excel brasileiro) e separador ';'
    expect(linhas[linhas.length - 1]).toBe('ReceitasCorrentes;7000000');
  });
});

describe('Receita — enriquecimento gerencial (Sprint 25A)', () => {
  beforeEach(() => {
    vi.spyOn(backend, 'fetchReceita').mockResolvedValue(receitaFake());
    vi.spyOn(backend, 'fetchReceitaRealizacao').mockResolvedValue({
      cod_ibge: '2304400',
      periodo: '2024-B6',
      versao_entrega: '1',
      total: { codigo: 'total', descricao: 'Total', previsto_atualizado: 10_000_000, arrecadado_acum: 8_000_000, realizacao_pct: 80 },
      por_categoria: [
        { codigo: 'ReceitasCorrentes', descricao: 'RECEITAS CORRENTES', previsto_atualizado: 9_000_000, arrecadado_acum: 7_000_000, realizacao_pct: 77.8 },
      ],
      source_ref: SOURCE,
    });
    vi.spyOn(backend, 'fetchReceitaDependencia').mockResolvedValue({
      cod_ibge: '2304400',
      periodo: '2024-B6',
      versao_entrega: '1',
      resumo: { propria: 3_000_000, transferida: 5_000_000, total: 8_000_000, pct_propria: 37.5, pct_transferida: 62.5 },
      maiores_transferencias: [
        { codigo: 'TransferenciasDaUniao', descricao: 'Cota-Parte do FPM', arrecadado_acum: 3_000_000, pct_das_transferencias: 60 },
      ],
      rcl_12m: 12_000_000,
      source_ref: SOURCE,
    });
    vi.spyOn(backend, 'fetchReceitaConciliacao').mockResolvedValue(CONCILIACAO);
    vi.spyOn(backend, 'fetchReceitaMemoria').mockResolvedValue({
      cod_ibge: '2304400',
      periodo: '2024-B6',
      versao_entrega: '1',
      medidas: ['previsto_inicial', 'arrecadado_acum'],
      totais: { previsto_inicial: 9_000_000, previsto_atualizado: 10_000_000, arrecadado_acum: 8_000_000 },
      formula_realizacao: 'realizacao_pct = arrecadado_acum ÷ previsto_atualizado × 100',
      hierarquia: 'Categoria → Origem → Espécie → Rubrica → Alínea',
      inconsistencias: [],
      detalhes: {},
      source_ref: SOURCE,
    });
  });

  it('navega a árvore de receita drill DOWN (pergunta: de onde vem cada real?)', async () => {
    renderReceita();
    const raiz = await screen.findByRole('button', { name: /RECEITAS CORRENTES/ });
    await userEvent.click(raiz);
    expect(await screen.findByText(/IMPOSTOS, TAXAS/)).toBeInTheDocument();
    // drill UP disponível pelo breadcrumb da hierarquia
    const caminho = screen.getByRole('navigation', { name: /Caminho da hierarquia/ });
    expect(within(caminho).getByRole('button', { name: 'Categorias econômicas' })).toBeEnabled();
  });

  it('mostra previsto inicial × atualizado × arrecadado e a realização por linha', async () => {
    renderReceita();
    const tabela = await screen.findByRole('columnheader', { name: /Prev. inicial/ });
    expect(tabela).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Prev. atualizado/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Realização/ })).toBeInTheDocument();
  });

  it('abre a memória de cálculo em diálogo (endpoint /memoria antes ocioso)', async () => {
    renderReceita();
    const botao = await screen.findByRole('button', { name: /Memória de cálculo/ });
    await userEvent.click(botao);
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText(/arrecadado_acum ÷ previsto_atualizado/)).toBeInTheDocument();
    expect(within(dialogo).getByText(/sem divergência de agregação/)).toBeInTheDocument();
  });

  it('sinaliza a divergência da conciliação com a fonte dos dois lados', async () => {
    renderReceita();
    expect(await screen.findByText(/1 transferência\(s\) fora da tolerância/)).toBeInTheDocument();
    // lado externo (tabela silver) e lado RREO (nós casados) visíveis na mesma linha
    expect(screen.getAllByText(/silver\.tesouro_fpm/).length).toBeGreaterThan(0);
    expect(screen.getByText(/RREO: TransferenciasDaUniao/)).toBeInTheDocument();
    // série derivada do próprio RREO não pode passar por contraprova independente
    expect(screen.getByText(/não contraprova independente/)).toBeInTheDocument();
  });

  it('quando o ente não abre a linha, mostra contenção no agregado (caso Fortaleza)', async () => {
    vi.spyOn(backend, 'fetchReceitaConciliacao').mockResolvedValue({
      ...CONCILIACAO,
      itens: [
        {
          ...CONCILIACAO.itens[0],
          status: 'contido',
          base_comparacao: 'agregado',
          rreo_acum: 3_955_788_046,
          externo_acum: 1_547_501_180,
          divergencia_pct: null,
          divergencia_rs: null,
          participacao_no_agregado_pct: 39.1,
          nos_rreo: ['TransferenciasCorrentesDaUniaoEDeSuasEntidades'],
        },
      ],
    });
    renderReceita();
    expect(await screen.findByText('contido no agregado')).toBeInTheDocument();
    expect(screen.getByText('39,1% do agregado')).toBeInTheDocument();
    expect(screen.getByText(/comparação por/)).toHaveTextContent('contenção');
  });

  it('série alterna nominal → real (IPCA) → per capita, com a base declarada', async () => {
    renderReceita();
    const real = await screen.findByRole('button', { name: /Real \(preços 2024-B6\)/ });
    await userEvent.click(real);
    expect(await screen.findByText(/silver.bcb_indice#433/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Per capita' }));
    expect(await screen.findByText(/estimativas IBGE/)).toBeInTheDocument();
  });

  it('exporta a tabela visível em CSV (download disparado do nível aberto)', async () => {
    const criarUrl = vi.fn(() => 'blob:fake');
    Object.assign(URL, { createObjectURL: criarUrl, revokeObjectURL: vi.fn() });
    renderReceita();
    const botao = await screen.findByRole('button', { name: /CSV/ });
    await waitFor(() => expect(botao).toBeEnabled()); // habilita quando a árvore carrega
    await userEvent.click(botao);
    await waitFor(() => expect(criarUrl).toHaveBeenCalled());
  });

  it('sem dado do período, diz "sem dado" em vez de desenhar zero', async () => {
    vi.spyOn(backend, 'fetchReceita').mockResolvedValue(
      receitaFake({ totais: { arrecadado_acum: null }, composicao: [] }),
    );
    renderReceita();
    const vazio = await screen.findByText(/Sem dado para/);
    expect(vazio).toHaveTextContent('2024-B6');
    // sem dado ⇒ nenhum número inventado no lugar
    expect(screen.queryByText(/Receita arrecadada/)).not.toBeInTheDocument();
  });

  it('marca defasagem quando o período exibido não é o mais recente com dado', async () => {
    vi.spyOn(backend, 'fetchReceita').mockResolvedValue(
      receitaFake({ source_ref: { ...SOURCE, periodo: '2023-B6' } }),
    );
    renderReceita();
    expect(await screen.findByTestId('selo-defasado')).toHaveTextContent('2024-B6');
  });
});

describe('Despesa — enriquecimento gerencial (Sprint 25A)', () => {
  beforeEach(() => {
    vi.spyOn(backend, 'fetchDespesa').mockResolvedValue(despesaFake());
    vi.spyOn(backend, 'fetchDespesaEstagios').mockResolvedValue({
      cod_ibge: '2304400',
      periodo: '2024-B6',
      versao_entrega: '1',
      eixo: 'funcao',
      totais: { dotacao_atualizada: 10_000_000, empenhado: 7_000_000, liquidado: 6_000_000, pago: 5_000_000, inscrito_rap: 900_000 },
      cascata: [
        { estagio: 'dotacao_atualizada', valor: 10_000_000, delta_anterior: null },
        { estagio: 'empenhado', valor: 7_000_000, delta_anterior: -3_000_000 },
        { estagio: 'liquidado', valor: 6_000_000, delta_anterior: -1_000_000 },
        { estagio: 'pago', valor: 5_000_000, delta_anterior: -1_000_000 },
      ],
      lacunas: [{ nome: 'potencial de RAP', valor: 2_000_000, formula: 'empenhado − pago' }],
      por_eixo: [],
      estagios_ausentes: [],
      observacao: null,
      source_ref: SOURCE,
    });
    vi.spyOn(backend, 'fetchDespesaExecucao').mockResolvedValue({
      cod_ibge: '2304400',
      periodo: '2024-B6',
      versao_entrega: '1',
      eixo: 'natureza',
      bimestre: 6,
      esperado_pct: 100,
      estagios: [
        { estagio: 'empenhado', executado: 7_000_000, base_dotacao: 10_000_000, executado_pct: 70, esperado_pct: 100, ritmo_pp: -30, status: 'atrasado' },
      ],
      source_ref: SOURCE,
    });
    vi.spyOn(backend, 'fetchDespesaRigidez').mockResolvedValue({
      cod_ibge: '2304400',
      periodo: '2024-B6',
      versao_entrega: '1',
      despesa_total: 7_000_000,
      rigida: 4_000_000,
      discricionaria: 2_000_000,
      semivariavel: 1_000_000,
      rigidez_pct: 57.1,
      discricionaria_pct: 28.6,
      componentes: [
        { grupo: '1', descricao: 'Pessoal e encargos', tipo: 'rigida', empenhado: 3_500_000, pct_despesa: 50 },
      ],
      source_ref: SOURCE,
    });
    vi.spyOn(backend, 'fetchDespesaMemoria').mockResolvedValue({
      cod_ibge: '2304400',
      periodo: '2024-B6',
      versao_entrega: '1',
      medidas: ['empenhado', 'pago'],
      totais_funcao: { empenhado: 7_000_000 },
      totais_natureza: { empenhado: 7_000_000 },
      reconciliacao_eixos_ok: true,
      diferenca_eixos: 0,
      formula_potencial_rap: 'potencial_rap = empenhado − pago',
      hierarquia_funcao: 'Função → Subfunção',
      hierarquia_natureza: 'Categoria → Grupo → Modalidade → Elemento',
      inconsistencias: [],
      violacoes_estagio: [],
      detalhes: {},
      source_ref: SOURCE,
    });
  });

  it('mostra a cascata completa até PAGO e o inscrito em restos a pagar', async () => {
    renderDespesa();
    expect(
      await screen.findByRole('rowheader', { name: 'pago' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/inscrito em RAP/)).toBeInTheDocument();
    expect(screen.getByText(/potencial de RAP/)).toBeInTheDocument();
  });

  it('mostra o ritmo de execução contra o esperado no calendário', async () => {
    renderDespesa();
    expect(await screen.findByText(/esperado linear/)).toBeInTheDocument();
    expect(screen.getByText('-30,0 pp')).toBeInTheDocument();
    expect(screen.getByText('atrasado')).toBeInTheDocument();
  });

  it('mostra a rigidez por natureza (quanto o gestor consegue mexer)', async () => {
    renderDespesa();
    expect(await screen.findByText(/Rigidez orçamentária/)).toBeInTheDocument();
    expect(screen.getByText('57,1%')).toBeInTheDocument();
    expect(screen.getByText(/Pessoal e encargos/)).toBeInTheDocument();
  });

  it('troca o eixo da árvore entre função e natureza', async () => {
    renderDespesa();
    const porNatureza = await screen.findByRole('button', { name: 'Por natureza' });
    await userEvent.click(porNatureza);
    await waitFor(() =>
      expect(backend.fetchDrill).toHaveBeenCalledWith(
        'despesa',
        '2304400',
        expect.objectContaining({ eixo: 'natureza' }),
      ),
    );
  });

  it('abre a memória com a reconciliação dos dois eixos', async () => {
    renderDespesa();
    await userEvent.click(await screen.findByRole('button', { name: /Memória de cálculo/ }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText(/os dois eixos fecham/)).toBeInTheDocument();
    expect(within(dialogo).getByText(/empenhado − pago/)).toBeInTheDocument();
  });
});
