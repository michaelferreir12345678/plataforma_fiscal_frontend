/**
 * Sprint IA-7 — a resposta que o gestor lê (frontend).
 *
 * O que estes testes fixam:
 *
 * 1. **A conversa continua.** O `conversa_id` do turno anterior volta ao backend, e a
 *    pergunta de acompanhamento **não** repete ente nem período. Sem isto, a tela parecia
 *    um chat e era uma sequência de perguntas isoladas.
 * 2. **"Nova conversa" corta o fio de verdade** — não é só limpar a tela.
 * 3. **A explicação por IA está nas telas de indicador**, no indicador específico e com o
 *    período que a tela mostra (a chamada carrega o código certo, não um genérico).
 * 4. **Identidade visual**: a marca é um símbolo próprio, `aria-hidden` (redundante com o
 *    texto do botão), e o carregamento é anunciado por `role="status"` sem travar a tela.
 * 5. **Acessibilidade não regride** — axe-core sobre a superfície nova.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import axe from 'axe-core';

import { AppProvider, useApp } from '../context/AppContext';
import { AssistentePage } from '../pages/AssistentePage';
import { Explicacao, ExplicacaoIA } from '../components/ExplicacaoIA';
import { ExplicacaoIndicador, ExplicacaoTela } from '../components/ExplicacaoIndicador';
import { CarregandoIA, IconeIA, SeloIA } from '../components/MarcaIA';
import * as backend from '../services/backend';
import * as api from '../services/api';
import { emBimestre } from '../utils/periodo';
import { INDICADOR_APURADO_PREVISAO } from '../utils/previsoes';
import { destinoAssistenteDaTela } from '../utils/contextoAssistente';

const AXE_OPCOES = {
  runOnly: {
    type: 'tag' as const,
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
  },
  rules: { 'color-contrast': { enabled: false } },
};

const SRC = { relatorio: 'RGF', anexo: 'Anexo 01', periodo: '2024-B6', versao_entrega: '1' };

function resposta(over: Partial<backend.AssistResposta> = {}): backend.AssistResposta {
  return {
    conversa_id: 'conv-1',
    tipo: 'pergunta',
    ente: '2304400',
    ente_nome: 'Fortaleza',
    periodo: '2024-B6',
    as_of: null,
    titulo: null,
    pergunta: 'Como está a despesa com pessoal do Executivo?',
    resposta:
      'A despesa com pessoal mede quanto da receita do município é consumida pela folha. ' +
      'Pessoal do Executivo: 48,10% da RCL (Receita Corrente Líquida).',
    recusa: false,
    dado_disponivel: true,
    fatos: [],
    normas: [],
    fontes: [],
    dados_incompletos: [],
    uso: { modelo: 'gemini-3.5-flash', tokens_entrada: 900, tokens_saida: 320, latencia_ms: 4100 },
    source_refs: [SRC],
    turnos_no_contexto: 0,
    turnos_descartados: 0,
    verificacao: null,
    gerado_em: '2026-08-14T12:00:00Z',
    ...over,
  };
}

function insight(over: Partial<backend.InsightResposta> = {}): backend.InsightResposta {
  return {
    capacidade: 'explicar_numero',
    titulo: 'Explique este número',
    ente: '2304400',
    ente_nome: 'Fortaleza',
    periodo: '2024-B6',
    as_of: null,
    pergunta: 'Explique o indicador Pessoal do Executivo.',
    resposta: 'O indicador mede a folha sobre a RCL. Está em 48,10% (fonte: RGF, Anexo 01).',
    disponivel: true,
    ausencia: null,
    fatos: [],
    notas: [],
    fontes: [],
    source_refs: [SRC],
    dados_incompletos: [],
    ferramentas: ['indicador_do_ente'],
    uso: { modelo: 'local-grounded', tokens_entrada: 100, tokens_saida: 80, latencia_ms: 20 },
    verificacao: { status: 'ok', total_citados: 1, com_lastro: 1, sem_lastro: [] },
    gerado_em: '2026-08-14T12:00:00Z',
    ...over,
  } as backend.InsightResposta;
}

function mockSessao() {
  vi.spyOn(api, 'getToken').mockReturnValue('token-de-teste');
  vi.spyOn(backend, 'fetchPeriodos').mockResolvedValue({
    cod_ibge: '2304400',
    relatorio: 'RREO',
    default: '2024-B6',
    periodos: [{ periodo: '2024-B6', relatorio: 'RREO', versao_entrega: '1', vigente: true }],
  } as never);
  vi.spyOn(backend, 'fetchMe').mockResolvedValue({
    usuario: { id: 'u1', email: 'gestor@ente.gov.br', nome: 'Gestor' },
    org_ativa: { id: 'o1', nome: 'Prefeitura', tipo: 'ente', capacidades: ['ver', 'usar_ia'] },
    orgs: [],
  } as never);
  vi.spyOn(backend, 'fetchAssistenteUso').mockResolvedValue({
    mes: '2026-08', consultas: 3, tokens_entrada: 10, tokens_saida: 5,
    gerado_em: '2026-08-14T12:00:00Z',
  } as never);
}

function renderAssistente(rota = '/assistente') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <AppProvider>
        <AssistentePage />
      </AppProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

// --------------------------------------------------------------------------- //
// 1. Conversa multi-turno
// --------------------------------------------------------------------------- //
describe('Assistente — a conversa continua (Sprint IA-7)', () => {
  it('o acompanhamento manda conversa_id e NÃO repete ente nem período', async () => {
    mockSessao();
    const perguntar = vi
      .spyOn(backend, 'perguntarAssistente')
      .mockResolvedValueOnce(resposta({ conversa_id: 'conv-1' }))
      .mockResolvedValueOnce(
        resposta({ conversa_id: 'conv-2', turnos_no_contexto: 1, pergunta: 'E por que isso aconteceu?' }),
      );

    renderAssistente();
    const campo = await screen.findByPlaceholderText(/Pergunte sobre seus indicadores/i);
    await userEvent.type(campo, 'Como está a despesa com pessoal do Executivo?');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar pergunta' }));

    await waitFor(() => expect(perguntar).toHaveBeenCalledTimes(1));
    expect(perguntar.mock.calls[0][0]).toMatchObject({ ente: '2304400' });
    expect(perguntar.mock.calls[0][0].conversa_id).toBeNull();

    // O segundo turno: a tela avisa que há conversa em curso e muda o convite do campo.
    expect(await screen.findByTestId('fio-da-conversa')).toBeInTheDocument();
    const campo2 = await screen.findByPlaceholderText(/Continue a conversa/i);
    await userEvent.type(campo2, 'E por que isso aconteceu?');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar pergunta' }));

    await waitFor(() => expect(perguntar).toHaveBeenCalledTimes(2));
    const segundo = perguntar.mock.calls[1][0];
    expect(segundo.conversa_id).toBe('conv-1');
    expect(segundo.ente).toBeUndefined();
    expect(segundo.periodo).toBeUndefined();
  });

  it('"Nova conversa" corta o fio: a próxima pergunta volta a informar o ente', async () => {
    mockSessao();
    const perguntar = vi
      .spyOn(backend, 'perguntarAssistente')
      .mockResolvedValue(resposta({ conversa_id: 'conv-1' }));

    renderAssistente();
    const campo = await screen.findByPlaceholderText(/Pergunte sobre seus indicadores/i);
    await userEvent.type(campo, 'Como está a despesa com pessoal?');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar pergunta' }));
    await waitFor(() => expect(perguntar).toHaveBeenCalledTimes(1));

    await userEvent.click(await screen.findByRole('button', { name: 'Nova conversa' }));
    expect(screen.queryByTestId('fio-da-conversa')).not.toBeInTheDocument();

    const campo2 = await screen.findByPlaceholderText(/Pergunte sobre seus indicadores/i);
    await userEvent.type(campo2, 'E a dívida consolidada?');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar pergunta' }));
    await waitFor(() => expect(perguntar).toHaveBeenCalledTimes(2));
    expect(perguntar.mock.calls[1][0]).toMatchObject({ ente: '2304400' });
    expect(perguntar.mock.calls[1][0].conversa_id).toBeNull();
  });

  it('descarta a resposta assíncrona antiga e corta o fio quando o período muda', async () => {
    mockSessao();
    let resolver!: (valor: backend.AssistResposta) => void;
    const pendente = new Promise<backend.AssistResposta>((resolve) => { resolver = resolve; });
    vi.spyOn(backend, 'perguntarAssistente').mockReturnValue(pendente);

    function AssistenteComTrocaDePeriodo() {
      const { setPeriodo } = useApp();
      return (
        <>
          <button type="button" onClick={() => setPeriodo('2023-B6')}>Trocar período</button>
          <AssistentePage />
        </>
      );
    }

    render(
      <MemoryRouter initialEntries={['/assistente']}>
        <AppProvider><AssistenteComTrocaDePeriodo /></AppProvider>
      </MemoryRouter>,
    );
    const campo = await screen.findByPlaceholderText(/Pergunte sobre seus indicadores/i);
    await userEvent.type(campo, 'Pergunta ainda em voo');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar pergunta' }));
    await userEvent.click(screen.getByRole('button', { name: 'Trocar período' }));

    await act(async () => {
      resolver(resposta({ resposta: 'RESPOSTA OBSOLETA', periodo: '2024-B6' }));
      await pendente;
    });

    await waitFor(() => expect(screen.queryByText('RESPOSTA OBSOLETA')).not.toBeInTheDocument());
    expect(screen.queryByTestId('fio-da-conversa')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Pergunte sobre seus indicadores/i)).not.toBeDisabled();
    expect(screen.queryByText(/Consultando indicadores e a norma/i)).not.toBeInTheDocument();
  });

  it('transporta origem, competência RGF convertida e as_of no primeiro payload', async () => {
    mockSessao();
    const perguntar = vi.spyOn(backend, 'perguntarAssistente').mockResolvedValue(resposta());
    renderAssistente(
      '/assistente?de=%2Fdivida&periodo=2024-B6&competencia=2024-Q3&as_of=2026-07-31',
    );

    expect(await screen.findByTestId('contexto-pagina')).toHaveTextContent(
      'Contexto: Dívida · 2024-Q3 · as_of 31/07/2026',
    );
    const campo = screen.getByPlaceholderText(/Pergunte sobre seus indicadores/i);
    await userEvent.type(campo, 'E isto aqui, está dentro do limite?');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar pergunta' }));

    await waitFor(() => expect(perguntar).toHaveBeenCalledTimes(1));
    expect(perguntar.mock.calls[0][0]).toMatchObject({
      ente: '2304400',
      pagina: '/divida',
      periodo: '2024-B6',
      as_of: '2026-07-31',
    });
  });

  it('inclui a origem na chave e reinicia o fio ao trocar somente a tela de origem', async () => {
    mockSessao();
    vi.spyOn(backend, 'perguntarAssistente').mockResolvedValue(resposta());

    function AssistenteComTrocaDeOrigem() {
      const navigate = useNavigate();
      return (
        <>
          <button
            type="button"
            onClick={() => navigate('/assistente?de=%2Freceita&periodo=2024-B6&competencia=2024-B6')}
          >
            Trocar origem
          </button>
          <AssistentePage />
        </>
      );
    }

    render(
      <MemoryRouter initialEntries={['/assistente?de=%2Fdivida&periodo=2024-B6&competencia=2024-Q3']}>
        <AppProvider><AssistenteComTrocaDeOrigem /></AppProvider>
      </MemoryRouter>,
    );
    const campo = await screen.findByPlaceholderText(/Pergunte sobre seus indicadores/i);
    await userEvent.type(campo, 'Analise o contexto atual');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar pergunta' }));
    expect(await screen.findByTestId('fio-da-conversa')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Trocar origem' }));
    await waitFor(() => expect(screen.queryByTestId('fio-da-conversa')).not.toBeInTheDocument());
    expect(screen.getByTestId('contexto-pagina')).toHaveTextContent('Contexto: Receita · 2024-B6');
  });

  it('mostra contexto retornado, verificação e turnos usados/descartados', async () => {
    mockSessao();
    vi.spyOn(backend, 'perguntarAssistente').mockResolvedValue(resposta({
      ente_nome: 'Ente retornado',
      periodo: '2023-B4',
      turnos_no_contexto: 2,
      turnos_descartados: 1,
      verificacao: {
        status: 'sinalizado', total_citados: 2, com_lastro: 1, sem_lastro: ['99,9%'],
      },
    }));

    renderAssistente();
    const campo = await screen.findByPlaceholderText(/Pergunte sobre seus indicadores/i);
    await userEvent.type(campo, 'Qual é o contexto?');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar pergunta' }));

    expect(await screen.findByTestId('contexto-resposta')).toHaveTextContent('Ente retornado · 2023-B4');
    expect(screen.getByRole('alert')).toHaveTextContent('99,9%');
    expect(screen.getByTestId('turnos-contexto')).toHaveTextContent('2 turno(s) anterior(es) usado(s)');
    expect(screen.getByTestId('turnos-contexto')).toHaveTextContent('1 turno(s) descartado(s)');
    expect(screen.getByTestId('fio-da-conversa')).toHaveTextContent('Ente retornado · 2023-B4');
  });

  it('gera o resumo com ente, período e as_of devolvidos pela resposta', async () => {
    mockSessao();
    const contexto = resposta({
      ente: '3550308', ente_nome: 'São Paulo', periodo: '2023-B4', as_of: '2026-07-31',
    });
    vi.spyOn(backend, 'perguntarAssistente').mockResolvedValue(contexto);
    const gerar = vi.spyOn(backend, 'gerarResumoExecutivo').mockResolvedValue(
      resposta({ ...contexto, conversa_id: 'resumo-1', tipo: 'resumo_executivo' }),
    );

    renderAssistente();
    const campo = await screen.findByPlaceholderText(/Pergunte sobre seus indicadores/i);
    await userEvent.type(campo, 'Faça a análise');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar pergunta' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Gerar resumo executivo' }));

    await waitFor(() => expect(gerar).toHaveBeenCalledWith({
      ente: '3550308', periodo: '2023-B4', as_of: '2026-07-31',
    }));
  });

  it('impede pergunta e resumo simultâneos com um único lock de operação', async () => {
    mockSessao();
    const perguntar = vi.spyOn(backend, 'perguntarAssistente').mockResolvedValue(resposta());
    let resolverResumo!: (valor: backend.AssistResposta) => void;
    const resumoPendente = new Promise<backend.AssistResposta>((resolve) => {
      resolverResumo = resolve;
    });
    vi.spyOn(backend, 'gerarResumoExecutivo').mockReturnValue(resumoPendente);

    renderAssistente();
    const campo = await screen.findByPlaceholderText(/Pergunte sobre seus indicadores/i);
    await userEvent.type(campo, 'Faça uma análise');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar pergunta' }));
    const gerar = await screen.findByRole('button', { name: 'Gerar resumo executivo' });
    await userEvent.click(gerar);

    expect(gerar).toBeDisabled();
    expect(screen.getByPlaceholderText(/Continue a conversa/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enviar pergunta' })).toBeDisabled();
    expect(perguntar).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolverResumo(resposta({ conversa_id: 'resumo-1', tipo: 'resumo_executivo' }));
      await resumoPendente;
    });
    await waitFor(() => expect(screen.getByPlaceholderText(/Continue a conversa/i)).not.toBeDisabled());
  });
});

// --------------------------------------------------------------------------- //
// 2. A explicação chega às telas de indicador — no indicador específico
// --------------------------------------------------------------------------- //
describe('ExplicacaoIndicador — o alcance da Sprint IA-7', () => {
  it('invalida conteúdo e promise antigos quando o contextKey muda com o painel aberto', async () => {
    let resolverAntiga!: (valor: backend.InsightResposta) => void;
    let resolverNova!: (valor: backend.InsightResposta) => void;
    const antiga = new Promise<backend.InsightResposta>((resolve) => { resolverAntiga = resolve; });
    const nova = new Promise<backend.InsightResposta>((resolve) => { resolverNova = resolve; });

    function Cenario() {
      const [alvo, setAlvo] = useState<'antigo' | 'novo'>('antigo');
      return (
        <>
          <button type="button" onClick={() => setAlvo('novo')}>Trocar indicador</button>
          <ExplicacaoIA
            contextKey={`2304400\u0000${alvo}\u00002024-B6`}
            rotulo="Explique este número"
            titulo={`Indicador ${alvo}`}
            descricao={`Explique o indicador ${alvo}`}
            carregar={() => (alvo === 'antigo' ? antiga : nova)}
          />
        </>
      );
    }

    render(<MemoryRouter><Cenario /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /^Explique este número\./i }));
    await userEvent.click(screen.getByRole('button', { name: 'Trocar indicador' }));

    await act(async () => {
      resolverNova(insight({ pergunta: 'Pergunta nova', resposta: 'RESPOSTA NOVA' }));
      await nova;
    });
    expect(await screen.findByText('RESPOSTA NOVA')).toBeInTheDocument();

    await act(async () => {
      resolverAntiga(insight({ pergunta: 'Pergunta antiga', resposta: 'RESPOSTA OBSOLETA' }));
      await antiga;
    });
    expect(screen.queryByText('RESPOSTA OBSOLETA')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Indicador novo');
  });

  it('serializa origem, período consultável, competência visível e as_of no atalho', () => {
    const destino = destinoAssistenteDaTela({
      pagina: '/divida',
      periodo: '2024-B6',
      competencia: '2024-Q3',
      asOf: '2026-07-31',
    });
    const url = new URL(destino, 'https://prumo.local');
    expect(url.pathname).toBe('/assistente');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      de: '/divida', periodo: '2024-B6', competencia: '2024-Q3', as_of: '2026-07-31',
    });

    const anual = new URL(destinoAssistenteDaTela({
      pagina: '/patrimonio', periodo: '2024-B6', competencia: '2024', asOf: null,
    }), 'https://prumo.local');
    expect(anual.searchParams.get('competencia')).toBe('2024');
  });

  it('pede a explicação do indicador e do período que a tela mostra', async () => {
    mockSessao();
    const explicar = vi.spyOn(backend, 'explicarNumero').mockResolvedValue(insight());

    render(
      <MemoryRouter>
        <AppProvider>
          <ExplicacaoIndicador
            indicador="divida_consolidada_liquida"
            rotulo="Dívida consolidada líquida"
            periodo="2024-B6"
            asOf="2026-07-31"
          />
        </AppProvider>
      </MemoryRouter>,
    );

    // Sob demanda: nada de IA rodando ao carregar a tela.
    expect(explicar).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole('button', { name: /Explique Dívida consolidada líquida/i }));

    await waitFor(() => expect(explicar).toHaveBeenCalledTimes(1));
    expect(explicar.mock.calls[0][0]).toMatchObject({
      indicador: 'divida_consolidada_liquida',
      periodo: '2024-B6',
      as_of: '2026-07-31',
    });
    expect(await screen.findByText(/Procedência dos números/i)).toBeInTheDocument();
  });

  it('nas telas sem indicador no mart (Caixa, Patrimônio) explica a tela, não um número alheio', async () => {
    mockSessao();
    const buscar = vi
      .spyOn(backend, 'buscarCentralDados')
      .mockResolvedValue(insight({ capacidade: 'central_dados' }));

    render(
      <MemoryRouter>
        <AppProvider>
          <ExplicacaoTela
            pagina="caixa"
            rotulo="Restos a Pagar & Caixa"
            periodo="2024-Q3"
            asOf="2026-07-31"
            pergunta="De onde vem a disponibilidade de caixa desta tela?"
          />
        </AppProvider>
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole('button', { name: /Entenda a tela Restos a Pagar/i }));
    await waitFor(() => expect(buscar).toHaveBeenCalledTimes(1));
    expect(buscar.mock.calls[0][0]).toMatchObject({
      pagina: 'caixa', periodo: '2024-Q3', as_of: '2026-07-31',
    });
  });

  it('não associa RCL/receita absolutas a RCL per capita e converte RGF para o RREO equivalente', () => {
    expect(INDICADOR_APURADO_PREVISAO.rcl).toBeUndefined();
    expect(INDICADOR_APURADO_PREVISAO.receita).toBeUndefined();
    expect(INDICADOR_APURADO_PREVISAO.pessoal).toBe('pessoal_executivo');
    expect(INDICADOR_APURADO_PREVISAO.divida).toBe('divida_consolidada_liquida');
    expect(emBimestre('2024-Q3')).toBe('2024-B6');
    expect(emBimestre('2024-S1')).toBe('2024-B3');
    expect(emBimestre('2024-B4')).toBe('2024-B4');
    expect(emBimestre('2024-A1')).toBeNull();
  });
});

// --------------------------------------------------------------------------- //
// 3. Identidade visual + acessibilidade
// --------------------------------------------------------------------------- //
describe('Marca da IA (Sprint IA-7)', () => {
  it('o símbolo é decorativo para o leitor de tela — quem nomeia a ação é o texto', () => {
    const { container } = render(<IconeIA />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
  });

  it('o carregamento é anunciado e não bloqueia a tela', async () => {
    render(<CarregandoIA />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveTextContent(/Consultando as fontes/i);
    expect(await axe.run(status, AXE_OPCOES)).toMatchObject({ violations: [] });
  });

  it('o selo diz de quem é o texto, sem esconder a procedência', async () => {
    const { container } = render(<SeloIA />);
    expect(container).toHaveTextContent('Explicação por IA');
    expect(await axe.run(container, AXE_OPCOES)).toMatchObject({ violations: [] });
  });

  it('axe-core no gatilho e no diálogo aberto: sem violações', async () => {
    mockSessao();
    vi.spyOn(backend, 'explicarNumero').mockResolvedValue(insight());
    const { container } = render(
      <MemoryRouter>
        <AppProvider>
          <ExplicacaoIndicador indicador="pessoal_executivo" rotulo="Pessoal do Executivo" periodo="2024-B6" />
        </AppProvider>
      </MemoryRouter>,
    );
    expect(await axe.run(container, AXE_OPCOES)).toMatchObject({ violations: [] });

    const gatilho = await screen.findByRole('button', { name: /Explique Pessoal do Executivo/i });
    expect(gatilho).toHaveAccessibleName(/^Explique este número\./i);
    expect(gatilho).toHaveStyle({ minWidth: '24px', minHeight: '24px' });
    await userEvent.click(gatilho);
    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).not.toHaveAttribute('aria-modal');
    expect(document.body.style.overflow).not.toBe('hidden');
    await screen.findByText(/Procedência dos números/i);
    expect(await axe.run(dialogo, AXE_OPCOES)).toMatchObject({ violations: [] });
  });

  it('distingue ausência determinística de texto composto por IA', () => {
    render(
      <Explicacao
        dado={insight({
          disponivel: false,
          ausencia: 'Indicador não materializado para a competência.',
          source_refs: [],
          uso: { modelo: 'n/a', tokens_entrada: 0, tokens_saida: 0, latencia_ms: 0 },
        })}
      />,
    );
    expect(screen.getByText('Resposta da plataforma')).toBeInTheDocument();
    expect(screen.queryByText('Explicação por IA')).not.toBeInTheDocument();
    expect(screen.getByText(/nenhum texto gerado por modelo/i)).toBeInTheDocument();
  });
});
