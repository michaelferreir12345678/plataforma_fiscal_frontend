/**
 * Sprint 26 — qualidade, lineage e as três correções herdadas da conversa.
 *
 * O aceite visual da sprint é uma recusa em enganar: quando uma verificação está em
 * falha, o número continua na tela **com a ressalva**; quando está tudo certo, nenhum
 * selo aparece (selo verde em toda tela vira ruído e ensina a ignorar o vermelho).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { AppProvider } from '../context/AppContext';
import { CentralDadosPage } from '../pages/CentralDadosPage';
import { RelatoriosPage } from '../pages/RelatoriosPage';
import { SeloQualidade } from '../components/SeloQualidade';
import { SeletorEnte } from '../layouts/ContextSelectors';
import * as backend from '../services/backend';
import * as api from '../services/api';

const PERIODOS_RREO = {
  cod_ibge: '2304400',
  relatorio: 'RREO',
  default: '2024-B6',
  periodos: [{ periodo: '2024-B6', relatorio: 'RREO', versao_entrega: '1', vigente: true }],
};

function mockSessao(capacidades: string[] = ['ver', 'administrar', 'gerar_relatorio']) {
  vi.spyOn(api, 'getToken').mockReturnValue('token-de-teste');
  vi.spyOn(backend, 'fetchPeriodos').mockResolvedValue(PERIODOS_RREO as never);
  vi.spyOn(backend, 'fetchMe').mockResolvedValue({
    usuario: { id: 'u1', email: 'gestor@ente.gov.br', nome: 'Gestor' },
    org_ativa: { id: 'o1', nome: 'Sefaz', tipo: 'estado', capacidades },
    orgs: [],
  } as never);
}

const checkFalha: backend.CheckQualidade = {
  id: 'c1',
  job_id: null,
  fonte: 'siconfi_rreo',
  cod_ibge: '2304400',
  periodo: '2024-B6',
  check_codigo: 'rcl_calculada_vs_publicada',
  rotulo: 'RCL calculada = RCL publicada (A3)',
  status: 'falha',
  esquerda: 5_000_000_000,
  direita: 11_438_382_522,
  diferenca: -6_438_382_522,
  tolerancia: 1,
  detalhe: { regra: 'RCL 12m recalculada = RCL publicada' },
  executado_em: '2026-07-28T12:00:00Z',
};

const checkAviso: backend.CheckQualidade = {
  ...checkFalha,
  id: 'c2',
  check_codigo: 'freshness_msc',
  rotulo: 'Atualidade da MSC',
  status: 'aviso',
  esquerda: null,
  direita: null,
  diferenca: null,
  detalhe: { nao_aplicavel: true, motivo: 'nenhuma entrega de MSC ingerida para este ente' },
};

function mockQualidade(itens: backend.CheckQualidade[] = [checkFalha, checkAviso]) {
  vi.spyOn(backend, 'fetchQualidade').mockResolvedValue({
    gerado_em: '2026-07-28T12:00:00Z',
    resumo: {
      total: itens.length,
      ok: itens.filter((i) => i.status === 'ok').length,
      aviso: itens.filter((i) => i.status === 'aviso').length,
      falha: itens.filter((i) => i.status === 'falha').length,
      fontes_com_falha: [...new Set(itens.filter((i) => i.status === 'falha').map((i) => i.fonte))],
      checks_com_falha: [...new Set(itens.filter((i) => i.status === 'falha').map((i) => i.check_codigo))],
    },
    itens,
    total: itens.length,
    pagina: 1,
    por_pagina: 100,
    observacao: itens.length === 0 ? 'Nenhum check executado ainda no seu escopo.' : null,
  } as never);
  vi.spyOn(backend, 'fetchLineage').mockResolvedValue({
    no: 'silver.siconfi_rgf',
    camada: 'silver',
    montante: [
      { origem: 'bronze.siconfi_rgf', destino: 'silver.siconfi_rgf', tipo: 'bronze_silver', detalhe: {} },
      { origem: 'SICONFI/tt-rgf', destino: 'bronze.siconfi_rgf', tipo: 'fonte_bronze', detalhe: { nota: 'RGF quadrimestral' } },
    ],
    jusante: [
      { origem: 'silver.siconfi_rgf', destino: 'gold.fato_pessoal', tipo: 'silver_gold', detalhe: {} },
      { origem: 'gold.fato_pessoal', destino: 'GET /entes/{ibge}/pessoal', tipo: 'gold_endpoint', detalhe: {} },
      { origem: 'GET /entes/{ibge}/pessoal', destino: '/pessoal', tipo: 'endpoint_pagina', detalhe: {} },
    ],
    paginas_afetadas: ['/caixa', '/divida', '/limites', '/pessoal'],
    fontes_de_origem: ['SICONFI/tt-rgf'],
    nos: [
      { id: 'silver.siconfi_rgf', camada: 'silver' },
      { id: '/pessoal', camada: 'pagina' },
    ],
    arestas: [],
    total_arestas: 122,
  } as never);
  // Abas existentes da Central continuam carregando.
  vi.spyOn(backend, 'fetchIngestJobs').mockResolvedValue({ itens: [], total: 0 } as never);
  vi.spyOn(backend, 'fetchFontes').mockResolvedValue({ itens: [] } as never);
  vi.spyOn(backend, 'fetchCobertura').mockResolvedValue({ itens: [] } as never);
  vi.spyOn(backend, 'fetchRetificacoes').mockResolvedValue({ itens: [] } as never);
}

function renderCentral(rota = '/central-dados') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <AppProvider>
        <CentralDadosPage />
      </AppProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('Central de Dados — painel de Qualidade (Sprint 26)', () => {
  it('abre direto na aba de qualidade quando o alerta linka para cá', async () => {
    mockSessao();
    mockQualidade();
    renderCentral('/central-dados?painel=qualidade');
    expect(await screen.findByText('RCL calculada = RCL publicada (A3)')).toBeInTheDocument();
  });

  it('mostra os dois lados da conta que não fechou', async () => {
    mockSessao();
    mockQualidade();
    renderCentral('/central-dados?painel=qualidade');
    const linha = (await screen.findByText('RCL calculada = RCL publicada (A3)')).closest('tr');
    expect(linha).not.toBeNull();
    // 5.000 M (calculado) × 11.438,38 M (publicado) — o gestor consegue refazer a conta.
    expect(linha?.textContent).toContain('5.000');
    expect(linha?.textContent).toContain('11.438,38');
  });

  it('distingue "não deu para verificar" de "verificado e correto"', async () => {
    mockSessao();
    mockQualidade();
    renderCentral('/central-dados?painel=qualidade');
    await screen.findByText('Atualidade da MSC');
    expect(screen.getByText(/nenhuma entrega de MSC ingerida/)).toBeInTheDocument();
    expect(screen.getByText(/inclui o caso/)).toBeInTheDocument();
  });

  it('explica o painel vazio em vez de mostrar tabela em branco', async () => {
    mockSessao();
    mockQualidade([]);
    renderCentral('/central-dados?painel=qualidade');
    expect(
      await screen.findByText(/Nenhum check executado ainda no seu escopo/),
    ).toBeInTheDocument();
  });
});

describe('Central de Dados — Lineage (Sprint 26)', () => {
  it('responde "o que quebra se esta fonte falhar"', async () => {
    mockSessao();
    mockQualidade();
    renderCentral('/central-dados?painel=lineage');
    const afetadas = await screen.findByTestId('paginas-afetadas');
    expect(afetadas).toHaveTextContent('/pessoal');
    expect(afetadas).toHaveTextContent('/divida');
  });

  it('responde "de onde vem este número"', async () => {
    mockSessao();
    mockQualidade();
    renderCentral('/central-dados?painel=lineage');
    expect(await screen.findByText(/fontes de origem: SICONFI\/tt-rgf/)).toBeInTheDocument();
    // aparece nas duas colunas (montante e jusante do caminho)
    expect(screen.getAllByText('bronze.siconfi_rgf').length).toBeGreaterThan(0);
  });
});

describe('Selo de qualidade nas páginas fiscais (Sprint 26)', () => {
  const aberto = (status: 'falha' | 'aviso'): backend.ChecagemAberta => ({
    check_codigo: 'rcl_calculada_vs_publicada',
    rotulo: 'RCL calculada = RCL publicada (A3)',
    status,
    fonte: 'siconfi_rreo',
    periodo: '2024-B6',
    diferenca: -6_438_382_522,
    tolerancia: 1,
    motivo: null,
  });

  it('sela o número quando há verificação em falha, com caminho para a conta', () => {
    render(
      <MemoryRouter>
        <SeloQualidade checks={[aberto('falha')]} />
      </MemoryRouter>,
    );
    const selo = screen.getByTestId('selo-qualidade');
    expect(selo).toHaveTextContent('Uma verificação de qualidade em falha');
    expect(screen.getByRole('link', { name: /ver a conta que não fechou/ })).toHaveAttribute(
      'href',
      '/central-dados?painel=qualidade',
    );
  });

  it('fica calado quando há só aviso — alarme por ausência ensina a ignorar o selo', () => {
    render(
      <MemoryRouter>
        <SeloQualidade checks={[aberto('aviso')]} />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('selo-qualidade')).not.toBeInTheDocument();
  });

  it('fica calado quando está tudo certo', () => {
    render(
      <MemoryRouter>
        <SeloQualidade checks={[]} />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('selo-qualidade')).not.toBeInTheDocument();
  });
});

describe('Correções herdadas (Sprint 26)', () => {
  it('o seletor de ente declara que a lista está truncada', async () => {
    mockSessao();
    vi.spyOn(backend, 'fetchEntes').mockResolvedValue({
      data: Array.from({ length: 30 }, (_, i) => ({
        cod_ibge: `23001${String(i).padStart(2, '0')}`,
        nome: `Município ${i}`,
        uf: 'CE',
        esfera: 'municipal',
        populacao: 10000,
        tem_dado: true,
        periodo_mais_recente: '2024-B6',
      })),
      total: 185,
      escopo_total: 185,
    } as never);
    render(
      <MemoryRouter>
        <AppProvider>
          <SeletorEnte aberto setAberto={() => undefined} />
        </AppProvider>
      </MemoryRouter>,
    );
    const resumo = await screen.findByTestId('escopo-resumo');
    expect(resumo).toHaveTextContent('mostrando 30 de 185');
    expect(resumo).toHaveTextContent('escopo total: 185');
  });

  it('o ente estadual aparece no topo, separado dos municípios', async () => {
    mockSessao();
    vi.spyOn(backend, 'fetchEntes').mockResolvedValue({
      data: [
        { cod_ibge: '2300101', nome: 'Abaiara', uf: 'CE', esfera: 'municipal', populacao: 11000, tem_dado: true, periodo_mais_recente: '2024-B6' },
        { cod_ibge: '23', nome: 'Ceará', uf: 'BR', esfera: 'estadual', populacao: 8936431, tem_dado: true, periodo_mais_recente: '2024-B6' },
      ],
      total: 2,
      escopo_total: 185,
    } as never);
    render(
      <MemoryRouter>
        <AppProvider>
          <SeletorEnte aberto setAberto={() => undefined} />
        </AppProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Ente estadual')).toBeInTheDocument();
    expect(screen.getByText(/é a soma dos municípios/)).toBeInTheDocument();
    expect(screen.getByText('Municípios')).toBeInTheDocument();
  });

  it('o construtor de relatórios deixa escolher os entes do lote', async () => {
    mockSessao();
    vi.spyOn(backend, 'fetchRelatorioModelos').mockResolvedValue({
      modelos: [
        { codigo: 'executivo', nome: 'Resumo Executivo', publico: 'Prefeito', descricao: 'Visão geral', secoes: ['rcl'], formalidade: 'alta', modelo_versao: 'v1', formatos: ['pdf'] },
      ],
    } as never);
    vi.spyOn(backend, 'fetchRelatorios').mockResolvedValue({ itens: [], total: 0, gerado_em: '2026-07-28T12:00:00Z' } as never);
    vi.spyOn(backend, 'fetchAgendamentos').mockResolvedValue([] as never);
    vi.spyOn(backend, 'fetchEntes').mockResolvedValue({
      data: [
        { cod_ibge: '2304400', nome: 'Fortaleza', uf: 'CE', esfera: 'municipal', populacao: 2574412, tem_dado: true, periodo_mais_recente: '2024-B6' },
        { cod_ibge: '2307650', nome: 'Maracanaú', uf: 'CE', esfera: 'municipal', populacao: 233000, tem_dado: false, periodo_mais_recente: null },
      ],
      total: 2,
      escopo_total: 185,
    } as never);
    render(
      <MemoryRouter>
        <AppProvider>
          <RelatoriosPage />
        </AppProvider>
      </MemoryRouter>,
    );
    // Escopo "lote" revela o seletor; em "ente" continua sendo o do contexto.
    await userEvent.click(await screen.findByRole('button', { name: /Lote · carteira/ }));
    const seletor = await screen.findByTestId('seletor-entes-relatorio');
    expect(seletor).toHaveTextContent('Fortaleza');
    expect(seletor).toHaveTextContent('SEM DADO'); // Maracanaú sem ingestão
    expect(screen.getByText(/o relatório sai para todos os 185 entes/)).toBeInTheDocument();

    await userEvent.click(within(seletor).getAllByRole('checkbox')[0]);
    await waitFor(() =>
      expect(screen.getByText(/1 ente\(s\) selecionado\(s\) de 185/)).toBeInTheDocument(),
    );
  });
});
