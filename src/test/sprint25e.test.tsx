/**
 * Sprint 25E — Alertas, Previsões, Relatórios e Assistente.
 *
 * Aceite: toda página fiscal tem export próprio + caminho de 1 clique para o relatório
 * institucional. Aqui verificamos os quatro módulos que a sub-sprint tocou e o atalho
 * "pergunte sobre esta tela".
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { AppProvider } from '../context/AppContext';
import { AlertasPage } from '../pages/AlertasPage';
import { PrevisoesPage } from '../pages/PrevisoesPage';
import { RelatoriosPage } from '../pages/RelatoriosPage';
import { AssistentePage } from '../pages/AssistentePage';
import { LimitesPage } from '../pages/LimitesPage';
import * as backend from '../services/backend';
import * as api from '../services/api';

const PERIODOS_RREO = {
  cod_ibge: '2304400',
  relatorio: 'RREO',
  default: '2024-B6',
  periodos: [{ periodo: '2024-B6', relatorio: 'RREO', versao_entrega: '1', vigente: true }],
};
const SRC = { relatorio: 'RREO', anexo: 'Anexo 03', periodo: '2024-B6', versao_entrega: '1' };

function mockSessao(capacidades: string[] = ['ver', 'config_alerta', 'gerar_relatorio', 'usar_ia']) {
  vi.spyOn(api, 'getToken').mockReturnValue('token-de-teste');
  vi.spyOn(backend, 'fetchPeriodos').mockResolvedValue(PERIODOS_RREO as never);
  vi.spyOn(backend, 'fetchMe').mockResolvedValue({
    usuario: { id: 'u1', email: 'gestor@ente.gov.br', nome: 'Gestor' },
    org_ativa: { id: 'o1', nome: 'Prefeitura', tipo: 'ente', capacidades },
    orgs: [],
  } as never);
}

function alerta(over: Partial<backend.AlertaOut> = {}): backend.AlertaOut {
  return {
    id: 'a1',
    cod_ibge: '2304400',
    categoria: 'limite',
    severidade: 'critico',
    prioridade: 1,
    titulo: 'Despesa com pessoal em faixa prudencial',
    motivo_legal: 'LRF art. 22',
    acao_sugerida: 'Vedações do parágrafo único.',
    prazo: null,
    link: '/pessoal',
    status: 'nova',
    indicador: 'pessoal_executivo',
    periodo: '2024-B6',
    source_ref: SRC,
    memoria: null,
    criado_em: '2026-07-01T10:00:00Z',
    atualizado_em: '2026-07-01T10:00:00Z',
    ...over,
  } as backend.AlertaOut;
}

function mockAlertas(historicoVazio = false) {
  vi.spyOn(backend, 'fetchAlertas').mockResolvedValue({
    escopo: 'ente',
    cod_ibge: '2304400',
    gerado_em: '2026-07-28T12:00:00Z',
    contadores: { critico: 1, atencao: 0, informativo: 0, total: 1 },
    alertas: [alerta()],
  } as never);
  vi.spyOn(backend, 'fetchCalendario').mockResolvedValue({
    cod_ibge: '2304400', gerado_em: '2026-07-28T12:00:00Z', itens: [],
  } as never);
  vi.spyOn(backend, 'fetchCarteiraAlertas').mockResolvedValue(null as never);
  vi.spyOn(backend, 'fetchAlertasHistorico').mockResolvedValue({
    escopo: 'ente',
    cod_ibge: '2304400',
    gerado_em: '2026-07-28T12:00:00Z',
    total: historicoVazio ? 0 : 2,
    resolvidos: historicoVazio ? 0 : 1,
    descartados: historicoVazio ? 0 : 1,
    tempo_medio_dias: historicoVazio ? null : 4.5,
    por_categoria: historicoVazio ? {} : { limite: 1, prazo: 1 },
    itens: historicoVazio
      ? []
      : [
          {
            ...alerta({ id: 'h1', status: 'resolvida', titulo: 'RREO 2024-B4 entregue com atraso' }),
            resolvido_em: '2026-07-20T09:00:00Z',
            resolvido_por: 'contador@ente.gov.br',
            dias_ate_resolver: 4,
          },
          {
            ...alerta({ id: 'h2', status: 'descartada', titulo: 'SIOPS defasado' }),
            resolvido_em: '2026-07-18T09:00:00Z',
            resolvido_por: 'gestor@ente.gov.br',
            dias_ate_resolver: 5,
          },
        ],
    observacao: null,
  } as never);
}

function renderPagina(Componente: () => JSX.Element, rota = '/') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <AppProvider>
        <Componente />
      </AppProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('Alertas — histórico de tratados (Sprint 25E)', () => {
  it('mostra quem resolveu, quando e em quantos dias', async () => {
    mockSessao();
    mockAlertas();
    renderPagina(AlertasPage);
    const itens = await screen.findAllByTestId('historico-item');
    expect(itens.length).toBeGreaterThan(0);
    expect(itens[0]).toHaveTextContent('contador@ente.gov.br');
    expect(itens[0]).toHaveTextContent('4 d na fila');
    expect(screen.getByText(/4\.5 d|4,5 d/)).toBeInTheDocument();
  });

  it('distingue resolvida de descartada', async () => {
    mockSessao();
    mockAlertas();
    renderPagina(AlertasPage);
    await screen.findAllByTestId('historico-item');
    expect(screen.getByText('RESOLVIDA')).toBeInTheDocument();
    expect(screen.getByText('DESCARTADA')).toBeInTheDocument();
  });

  it('explica o histórico vazio em vez de mostrar uma lista muda', async () => {
    mockSessao();
    mockAlertas(true);
    renderPagina(AlertasPage);
    expect(
      await screen.findByText(/Nenhum alerta tratado ainda neste escopo/),
    ).toBeInTheDocument();
  });

  it('exporta a fila ativa em CSV', async () => {
    mockSessao();
    mockAlertas();
    renderPagina(AlertasPage);
    await screen.findAllByTestId('historico-item');
    expect(screen.getAllByRole('button', { name: /CSV/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /relatório completo/ }).length).toBeGreaterThan(0);
  });
});

// --- Previsões ---------------------------------------------------------------
function mockPrevisoes() {
  vi.spyOn(backend, 'fetchProjecao').mockImplementation((_ibge, params) =>
    Promise.resolve({
      cod_ibge: '2304400',
      indicador: params.indicador,
      descricao: 'Receita Corrente Líquida',
      unidade: 'BRL',
      modelo: 'holt_winters',
      esfera: 'municipal',
      nivel_confianca: 95,
      horizonte: params.horizonte ?? 4,
      as_of: null,
      gerado_em: '2026-07-28T12:00:00Z',
      historico: [
        { periodo: '2024-B5', valor: 11_000_000_000, versao_entrega: '1', as_of: null, source_ref: SRC },
        { periodo: '2024-B6', valor: 11_400_000_000, versao_entrega: '1', as_of: null, source_ref: SRC },
      ],
      projecao: Array.from({ length: params.horizonte ?? 4 }, (_, i) => ({
        periodo_alvo: `2025-B${i + 1}`,
        passo: i + 1,
        valor_previsto: 11_500_000_000 + i * 100_000_000,
        ic_inferior: 11_000_000_000,
        ic_superior: 12_000_000_000,
        faixa: null,
        cruza_limite: false,
      })),
      cruzamento: { aplicavel: false, cruza: false, periodo_cruzamento: null, valor_no_cruzamento: null, teto_pct: null },
      memoria: {},
      source_ref: SRC,
    } as never),
  );
  vi.spyOn(backend, 'fetchCenarios').mockResolvedValue([] as never);
  vi.spyOn(backend, 'fetchComparacaoModelos').mockImplementation((_ibge, params) =>
    Promise.resolve({
      cod_ibge: '2304400',
      indicador: params.indicador,
      descricao: 'Receita Corrente Líquida',
      unidade: 'BRL',
      horizonte: params.horizonte ?? 4,
      periodos_projetados: ['2025-B1', '2025-B2'],
      n_periodos_historicos: 3,
      criterio_escolha:
        'Ordem de preferência: regressão → Holt → fechamento. Não é escolha por acurácia medida.',
      modelos: [
        {
          modelo: 'regressao_exogenas', rotulo: 'Regressão com exógenas (FPM/IPCA/Selic)',
          disponivel: false, motivo_indisponivel: 'Exige graus de liberdade suficientes.',
          escolhido: false, valor_final: null, ic_inferior_final: null, ic_superior_final: null,
          amplitude_ic_media: null, erro_padrao: null, r2: null, n_obs: null,
          cruza_limite: false, periodo_cruzamento: null, memoria: {},
        },
        {
          modelo: 'holt_winters', rotulo: 'Holt (nível + tendência)', disponivel: true,
          motivo_indisponivel: null, escolhido: true, valor_final: 11_800_000_000,
          ic_inferior_final: 11_000_000_000, ic_superior_final: 12_600_000_000,
          amplitude_ic_media: 1_600_000_000, erro_padrao: 400_000_000, r2: null, n_obs: 3,
          cruza_limite: false, periodo_cruzamento: null, memoria: {},
        },
        {
          modelo: 'fechamento', rotulo: 'Fechamento (run-rate)', disponivel: true,
          motivo_indisponivel: null, escolhido: false, valor_final: 11_600_000_000,
          ic_inferior_final: 11_400_000_000, ic_superior_final: 11_800_000_000,
          amplitude_ic_media: 400_000_000, erro_padrao: 100_000_000, r2: null, n_obs: 3,
          cruza_limite: false, periodo_cruzamento: null, memoria: {},
        },
      ],
      exogenas_fontes: {},
      aviso: 'Projeção estatística; não é garantia de execução. IC a 95%.',
      source_ref: SRC,
    } as never),
  );
}

describe('Previsões — horizonte e comparação de modelos (Sprint 25E)', () => {
  it('permite mudar o horizonte da projeção', async () => {
    mockSessao();
    mockPrevisoes();
    renderPagina(PrevisoesPage);
    await screen.findByTestId('modelo-holt_winters');
    await userEvent.click(screen.getByRole('button', { name: '+8' }));
    await waitFor(() =>
      expect(backend.fetchProjecao).toHaveBeenCalledWith('2304400', expect.objectContaining({ horizonte: 8 })),
    );
  });

  it('mostra as três camadas — inclusive a indisponível, com o motivo', async () => {
    mockSessao();
    mockPrevisoes();
    renderPagina(PrevisoesPage);
    expect(await screen.findByTestId('modelo-regressao_exogenas')).toHaveTextContent('INDISPONÍVEL');
    expect(screen.getByTestId('modelo-regressao_exogenas')).toHaveTextContent(/graus de liberdade/);
    expect(screen.getByTestId('modelo-holt_winters')).toHaveTextContent('EM USO');
    expect(screen.getByTestId('modelo-fechamento')).toBeInTheDocument();
  });

  it('declara que a escolha não é por acurácia medida', async () => {
    mockSessao();
    mockPrevisoes();
    renderPagina(PrevisoesPage);
    await screen.findByTestId('modelo-holt_winters');
    expect(screen.getByText(/Não é escolha por acurácia medida/)).toBeInTheDocument();
  });
});

// --- Relatórios --------------------------------------------------------------
function mockRelatorios(agendamentos: backend.RelatorioAgendamento[]) {
  vi.spyOn(backend, 'fetchRelatorioModelos').mockResolvedValue({
    modelos: [
      {
        codigo: 'executivo', nome: 'Resumo Executivo', publico: 'Prefeito', descricao: 'Visão geral',
        secoes: ['rcl'], formalidade: 'alta', modelo_versao: 'v1', formatos: ['pdf'],
      },
    ],
  } as never);
  vi.spyOn(backend, 'fetchRelatorios').mockResolvedValue({ itens: [], total: 0, gerado_em: '2026-07-28T12:00:00Z' } as never);
  vi.spyOn(backend, 'fetchAgendamentos').mockResolvedValue(agendamentos as never);
  vi.spyOn(backend, 'editarAgendamento').mockResolvedValue(agendamentos[0] as never);
  vi.spyOn(backend, 'excluirAgendamento').mockResolvedValue(undefined as never);
}

const agendamentoFake: backend.RelatorioAgendamento = {
  id: 'ag-1',
  modelo: 'executivo',
  formato: 'pdf',
  escopo: 'ente',
  entes: ['2304400'],
  periodo: '2024-B6',
  periodicidade: 'mensal',
  parametros: {},
  proxima_execucao: '2026-08-01T07:00:00Z',
  ultima_execucao: null,
  ativo: true,
  criado_em: '2026-07-01T10:00:00Z',
  atualizado_em: '2026-07-01T10:00:00Z',
};

describe('Relatórios — UI de agendamentos (Sprint 25E)', () => {
  it('lista as recorrências criadas', async () => {
    mockSessao();
    mockRelatorios([agendamentoFake]);
    renderPagina(RelatoriosPage);
    const linha = await screen.findByTestId('agendamento');
    expect(linha).toHaveTextContent('executivo');
    expect(linha).toHaveTextContent('ATIVO');
    expect(linha).toHaveTextContent('nunca executou');
  });

  it('desativa sem excluir — o registro da regra permanece', async () => {
    mockSessao();
    mockRelatorios([agendamentoFake]);
    renderPagina(RelatoriosPage);
    await screen.findByTestId('agendamento');
    await userEvent.click(screen.getByRole('button', { name: 'desativar' }));
    await waitFor(() =>
      expect(backend.editarAgendamento).toHaveBeenCalledWith('ag-1', { ativo: false }),
    );
    expect(screen.getByText(/Desativar preserva o registro/)).toBeInTheDocument();
  });

  it('explica o estado vazio em vez de mostrar tabela em branco', async () => {
    mockSessao();
    mockRelatorios([]);
    renderPagina(RelatoriosPage);
    expect(await screen.findByText(/Nenhuma recorrência criada/)).toBeInTheDocument();
  });
});

// --- Assistente --------------------------------------------------------------
describe('Assistente — contexto da tela e histórico (Sprint 25E)', () => {
  function mockAssistente() {
    vi.spyOn(backend, 'fetchAssistenteUso').mockResolvedValue({
      mes: '2026-07', consultas: 3, tokens_entrada: 100, tokens_saida: 200,
      gerado_em: '2026-07-28T12:00:00Z',
    } as never);
    vi.spyOn(backend, 'fetchConversas').mockResolvedValue({
      itens: [
        {
          id: 'c1', tipo: 'pergunta', cod_ibge: '2304400', periodo: '2024-B6',
          pergunta: 'Como está a despesa com pessoal?', resposta: '47,21% da RCL.',
          recusa: false, modelo: 'gemini-2.5-flash', criado_em: '2026-07-27T10:00:00Z',
        },
        {
          id: 'c2', tipo: 'pergunta', cod_ibge: '2304400', periodo: '2024-B6',
          pergunta: 'Qual o IDH do município?', resposta: 'Fora do escopo fiscal.',
          recusa: true, modelo: 'gemini-2.5-flash', criado_em: '2026-07-26T10:00:00Z',
        },
      ],
    } as never);
    vi.spyOn(backend, 'perguntarAssistente').mockResolvedValue({
      conversa_id: 'nova', resposta: 'Resposta fundamentada.', recusa: false,
      fatos: [], normas: [], fontes: [], uso: { consultas_mes: 4 },
      source_refs: [SRC], gerado_em: '2026-07-28T12:00:00Z',
    } as never);
  }

  it('anuncia o contexto da tela de onde a pergunta veio', async () => {
    mockSessao();
    mockAssistente();
    renderPagina(AssistentePage, '/assistente?de=%2Fpessoal');
    const chip = await screen.findByTestId('contexto-pagina');
    expect(chip).toHaveTextContent('Contexto: Pessoal');
  });

  it('não inventa contexto quando a rota não é reconhecida', async () => {
    mockSessao();
    mockAssistente();
    renderPagina(AssistentePage, '/assistente?de=%2Finexistente');
    await screen.findByPlaceholderText(/Pergunte sobre seus indicadores/);
    expect(screen.queryByTestId('contexto-pagina')).not.toBeInTheDocument();
  });

  it('envia a página de origem junto com a pergunta', async () => {
    mockSessao();
    mockAssistente();
    renderPagina(AssistentePage, '/assistente?de=%2Fdivida');
    const input = await screen.findByPlaceholderText(/Pergunte sobre seus indicadores/);
    await userEvent.type(input, 'e isto aqui, está bom?{Enter}');
    await waitFor(() =>
      expect(backend.perguntarAssistente).toHaveBeenCalledWith(
        expect.objectContaining({ pagina: '/divida' }),
      ),
    );
  });

  it('abre o histórico de conversas sob demanda, marcando as recusas', async () => {
    mockSessao();
    mockAssistente();
    renderPagina(AssistentePage, '/assistente');
    await screen.findByPlaceholderText(/Pergunte sobre seus indicadores/);
    expect(backend.fetchConversas).not.toHaveBeenCalled(); // não pesa a primeira tela
    await userEvent.click(screen.getByRole('button', { name: /histórico de conversas/ }));
    const painel = await screen.findByTestId('historico-conversas');
    expect(painel).toHaveTextContent('Como está a despesa com pessoal?');
    expect(painel).toHaveTextContent('RECUSA FUNDAMENTADA');
  });
});

// --- Aceite transversal ------------------------------------------------------
describe('Aceite 25E — export + relatório institucional em página fiscal', () => {
  it('Limites exporta a tabela e leva ao relatório em um clique', async () => {
    mockSessao();
    vi.spyOn(backend, 'fetchLimites').mockResolvedValue({
      cod_ibge: '2304400',
      periodo: '2024-B6',
      versao_entrega: '1',
      itens: [
        {
          indicador: 'pessoal_executivo', esfera: 'municipal', sentido: 'teto',
          valor_rs: 5_400_000_000, valor_pct_rcl: 47.21, faixa: 'normal', teto_pct: 54,
          alerta_pct: 48.6, prudencial_pct: 51.3, distancia_teto: 6.79, distancia_alerta: 1.39,
          denominador: 'rcl', base_valor: 11_400_000_000,
        },
      ],
      source_ref: SRC,
    } as never);
    renderPagina(LimitesPage);
    expect(await screen.findByRole('button', { name: /CSV/ })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /relatório completo/ });
    expect(link).toHaveAttribute('href', '/relatorios?modelo=limites');
  });
});
