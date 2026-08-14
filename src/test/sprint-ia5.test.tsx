/**
 * Sprint IA-5 — IA nas telas.
 *
 * O que estes testes fixam:
 *
 * 1. **A explicação só é pedida quando o gestor pede.** Nenhuma página chama a IA ao
 *    carregar — a ficha manda medir o uso, e IA que roda sozinha custa sem ser pedida.
 * 2. **`source_ref` fica visível na tela**, nas quatro superfícies (critério de aceite).
 * 3. **Ausência é ausência declarada**: `disponivel: false` vira o motivo, não prosa vaga —
 *    e a tela diz que nenhum modelo foi acionado.
 * 4. **O aviso do G6 aparece**: número sem lastro é sinalizado em `role="alert"`, não
 *    escondido num campo que a tela pode ignorar.
 * 5. **Acessibilidade não regride**: axe-core sobre o diálogo aberto e sobre a resposta.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import axe from 'axe-core';

import { AppProvider } from '../context/AppContext';
import { ExplicacaoIA, Explicacao } from '../components/ExplicacaoIA';
import { AlertasPage } from '../pages/AlertasPage';
import * as backend from '../services/backend';
import * as api from '../services/api';

// Mesma régua da Sprint B3: jsdom não pinta, então `color-contrast` sai como
// "incomplete" em vez de violação real — o contraste é coberto pela Sprint 27.
const AXE_OPCOES = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  rules: { 'color-contrast': { enabled: false } },
};

const SRC = { relatorio: 'RGF', anexo: 'Anexo 01', periodo: '2024-B6', versao_entrega: '1' };

function insight(over: Partial<backend.InsightResposta> = {}): backend.InsightResposta {
  return {
    capacidade: 'explicar_numero',
    titulo: 'Explique este número',
    ente: '2304400',
    ente_nome: 'Fortaleza',
    periodo: '2024-B6',
    as_of: null,
    pergunta: 'Explique o indicador Pessoal · Poder Executivo de Fortaleza em 2024-B6.',
    resposta:
      'A despesa com pessoal do Executivo está em 48,10% da RCL Ajustada (fonte: RGF, ' +
      'Anexo 01, 2024-B6, versão 1), dentro do teto de 54%.',
    disponivel: true,
    ausencia: null,
    fatos: [
      {
        codigo: 'pessoal_executivo',
        rotulo: 'Pessoal · Poder Executivo',
        valor_formatado: '48,10%',
        valor: '48.10',
        unidade: 'pct_rcl',
        status: 'calculado',
        faixa: 'normal',
        disponivel: true,
        periodo: '2024-B6',
        as_of: null,
        source_ref: SRC,
        memoria: {},
      },
    ],
    notas: [
      {
        titulo: 'Memória de cálculo',
        linhas: ['Fórmula: valor_pct_rcl = valor_rs / rcl_12m × 100'],
        origem: 'indicador_do_ente',
      },
      {
        titulo: 'De onde vem este número (linhagem)',
        linhas: ['Fontes de origem: siconfi_rgf'],
        origem: 'gold.lineage_edge',
      },
    ],
    fontes: [{ tipo: 'indicador', rotulo: 'Pessoal · Poder Executivo', detalhe: '2024-B6 · 48,10%', source_ref: SRC }],
    source_refs: [SRC],
    dados_incompletos: [],
    ferramentas: ['indicador_do_ente', 'limites_do_ente', 'linhagem_do_indicador'],
    uso: { modelo: 'local-grounded', tokens_entrada: 120, tokens_saida: 90, latencia_ms: 30 },
    verificacao: { status: 'ok', total_citados: 2, com_lastro: 2, sem_lastro: [] },
    gerado_em: '2026-08-13T12:00:00Z',
    ...over,
  } as backend.InsightResposta;
}

function mockSessao(capacidades: string[] = ['ver', 'usar_ia', 'config_alerta']) {
  vi.spyOn(api, 'getToken').mockReturnValue('token-de-teste');
  vi.spyOn(backend, 'fetchPeriodos').mockResolvedValue({
    cod_ibge: '2304400',
    relatorio: 'RREO',
    default: '2024-B6',
    periodos: [{ periodo: '2024-B6', relatorio: 'RREO', versao_entrega: '1', vigente: true }],
  } as never);
  vi.spyOn(backend, 'fetchMe').mockResolvedValue({
    usuario: { id: 'u1', email: 'gestor@ente.gov.br', nome: 'Gestor' },
    org_ativa: { id: 'o1', nome: 'Prefeitura', tipo: 'ente', capacidades },
    orgs: [],
  } as never);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('ExplicacaoIA — o gatilho e a chamada sob demanda', () => {
  it('não chama a IA ao renderizar: só quando o gestor abre', async () => {
    const carregar = vi.fn().mockResolvedValue(insight());
    render(
      <MemoryRouter>
        <ExplicacaoIA
          rotulo="Explique este número"
          titulo="Pessoal · 2024-B6"
          descricao="Explicar como o indicador foi apurado"
          carregar={carregar}
        />
      </MemoryRouter>,
    );
    expect(carregar).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /Explicar como o indicador/i }));
    await waitFor(() => expect(carregar).toHaveBeenCalledTimes(1));
  });

  it('mostra a pergunta declarada, a resposta e a fonte de cada número', async () => {
    const carregar = vi.fn().mockResolvedValue(insight());
    render(
      <MemoryRouter>
        <ExplicacaoIA
          rotulo="Explique este número"
          titulo="Pessoal · 2024-B6"
          descricao="Explicar como o indicador foi apurado"
          carregar={carregar}
        />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /Explicar como o indicador/i }));

    expect(await screen.findByText(/Pergunta respondida/)).toBeInTheDocument();
    // Critério de aceite: a fonte fica visível na tela, não só no payload.
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveTextContent('RGF');
    expect(dialogo).toHaveTextContent('Anexo 01');
    expect(dialogo).toHaveTextContent('Memória de cálculo');
    expect(dialogo).toHaveTextContent('gold.lineage_edge');
    expect(dialogo).toHaveTextContent('indicador_do_ente');
  });

  it('ausência de dado vira ausência declarada, e diz que nenhum modelo foi acionado', async () => {
    const carregar = vi.fn().mockResolvedValue(
      insight({
        disponivel: false,
        ausencia:
          "O indicador 'operacoes_credito' não está materializado para 2304400 em 2024-B6. " +
          'A plataforma não estima o que não apurou.',
        resposta: 'irrelevante',
        fatos: [],
        notas: [],
        source_refs: [],
        verificacao: null,
        uso: { modelo: 'n/a', tokens_entrada: 0, tokens_saida: 0, latencia_ms: 0 },
      }),
    );
    render(
      <MemoryRouter>
        <ExplicacaoIA
          rotulo="Explique este número"
          titulo="Operações de crédito"
          descricao="Explicar operações de crédito"
          carregar={carregar}
        />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /Explicar operações/i }));

    const aviso = await screen.findByRole('status');
    expect(aviso).toHaveTextContent(/não está materializado/);
    expect(screen.getByRole('dialog')).toHaveTextContent(/Nenhum modelo de linguagem foi acionado/);
    // A prosa do modelo não é exibida quando não há dado — ausência não vira texto solto.
    expect(screen.queryByText('irrelevante')).not.toBeInTheDocument();
  });

  it('número sem lastro é sinalizado em destaque (G6), não escondido', async () => {
    const carregar = vi.fn().mockResolvedValue(
      insight({
        resposta: 'A despesa com pessoal está em 91,37% da RCL.',
        verificacao: { status: 'sinalizado', total_citados: 1, com_lastro: 0, sem_lastro: ['91,37%'] },
      }),
    );
    render(
      <MemoryRouter>
        <ExplicacaoIA
          rotulo="Explique este número"
          titulo="Pessoal"
          descricao="Explicar pessoal"
          carregar={carregar}
        />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /Explicar pessoal/i }));

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('91,37%');
    expect(alerta).toHaveTextContent(/Verificação automática/);
  });

  it('erro do provedor aparece como erro tratado, com opção de tentar de novo', async () => {
    const carregar = vi.fn().mockRejectedValue(
      new api.ApiError(502, 'Provedor de IA indisponível', 'O provedor não respondeu.'),
    );
    render(
      <MemoryRouter>
        <ExplicacaoIA rotulo="Explique" titulo="Pessoal" descricao="Explicar pessoal" carregar={carregar} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /Explicar pessoal/i }));
    expect(await screen.findByText(/não respondeu/i)).toBeInTheDocument();
  });
});

describe('ExplicacaoIA — acessibilidade (a plataforma está em Lighthouse a11y 99)', () => {
  it('o diálogo aberto não reporta violação axe', async () => {
    const carregar = vi.fn().mockResolvedValue(insight());
    const { container } = render(
      <MemoryRouter>
        <ExplicacaoIA
          rotulo="Explique este número"
          titulo="Pessoal · 2024-B6"
          descricao="Explicar como o indicador foi apurado"
          carregar={carregar}
        />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /Explicar como o indicador/i }));
    await screen.findByText(/Pergunta respondida/);

    const resultado = await axe.run(container, AXE_OPCOES);
    expect(resultado.violations.map((v) => v.id)).toEqual([]);
  });

  it('a resposta das quatro capacidades usa a mesma estrutura acessível', async () => {
    const capacidades: backend.InsightResposta['capacidade'][] = [
      'explicar_numero',
      'explicar_alertas',
      'narrar_relatorio',
      'central_dados',
    ];
    for (const capacidade of capacidades) {
      const { container, unmount } = render(
        <MemoryRouter>
          <Explicacao dado={insight({ capacidade })} />
        </MemoryRouter>,
      );
      const resultado = await axe.run(container, AXE_OPCOES);
      expect(resultado.violations.map((v) => v.id), `violação em ${capacidade}`).toEqual([]);
      unmount();
    }
  });
});

describe('Alertas — a IA explica a fila, não a reordena', () => {
  function mockAlertas() {
    vi.spyOn(backend, 'fetchAlertas').mockResolvedValue({
      escopo: 'ente',
      cod_ibge: '2304400',
      gerado_em: '2026-07-28T12:00:00Z',
      contadores: { critico: 1, atencao: 0, informativo: 0, total: 1 },
      alertas: [
        {
          id: 'a1',
          cod_ibge: '2304400',
          categoria: 'limite',
          severidade: 'critico',
          prioridade: 1,
          titulo: 'Despesa com pessoal excedeu o limite',
          motivo_legal: 'LRF art. 23',
          acao_sugerida: 'Reconduzir em dois quadrimestres.',
          prazo: null,
          link: '/pessoal',
          status: 'nova',
          indicador: 'pessoal_executivo',
          periodo: '2024-B6',
          source_ref: SRC,
          memoria: null,
          criado_em: '2026-07-01T10:00:00Z',
          atualizado_em: '2026-07-01T10:00:00Z',
        },
      ],
    } as never);
    vi.spyOn(backend, 'fetchCalendario').mockResolvedValue({
      cod_ibge: '2304400', gerado_em: '2026-07-28T12:00:00Z', itens: [],
    } as never);
    vi.spyOn(backend, 'fetchCarteiraAlertas').mockResolvedValue(null as never);
    vi.spyOn(backend, 'fetchAlertasHistorico').mockResolvedValue({
      escopo: 'ente', cod_ibge: '2304400', gerado_em: '2026-07-28T12:00:00Z',
      total: 0, resolvidos: 0, descartados: 0, tempo_medio_dias: null,
      por_categoria: {}, itens: [], observacao: null,
    } as never);
  }

  it('oferece a explicação da fila sem chamá-la ao carregar a página', async () => {
    mockSessao();
    mockAlertas();
    const explicar = vi.spyOn(backend, 'explicarAlertas').mockResolvedValue(
      insight({
        capacidade: 'explicar_alertas',
        titulo: 'Por que este alerta é o primeiro',
        pergunta: 'Explique a fila de alertas do ente 2304400.',
        notas: [
          {
            titulo: 'Como a fila foi ordenada',
            linhas: ['A fila é ordenada por severidade (crítico > atenção > informativo)…'],
            origem: 'alerts/rules.py::prioridade',
          },
        ],
      }),
    );
    render(
      <MemoryRouter initialEntries={['/alertas']}>
        <AppProvider>
          <AlertasPage />
        </AppProvider>
      </MemoryRouter>,
    );

    const botao = await screen.findByRole('button', { name: /Explicar por que o primeiro alerta/i });
    expect(explicar).not.toHaveBeenCalled();

    await userEvent.click(botao);
    await waitFor(() => expect(explicar).toHaveBeenCalledWith({ ente: '2304400' }));
    expect(await screen.findByText(/Como a fila foi ordenada/)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent('alerts/rules.py::prioridade');
  });
});
