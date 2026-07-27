/**
 * Sprint 22 — rede de proteção do shell e do cockpit.
 *
 * O shell mudou demais (contexto único, seletores funcionais) para seguir sem teste.
 * Cobre: troca de ente/período pelo contexto, período default vindo do backend, e os
 * estados do cockpit (carregando, erro, sem base de comparação).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { AppProvider, useApp } from '../context/AppContext';
import { SeletorEnte, SeletorPeriodo } from '../layouts/ContextSelectors';
import { CockpitPage } from '../pages/CockpitPage';
import * as backend from '../services/backend';
import * as api from '../services/api';

const PERIODOS_RREO = {
  cod_ibge: '2304400',
  relatorio: 'RREO',
  default: '2024-B6',
  periodos: [
    { periodo: '2024-B5', relatorio: 'RREO', versao_entrega: '1', vigente: true },
    { periodo: '2024-B6', relatorio: 'RREO', versao_entrega: '1', vigente: true },
  ],
};
const PERIODOS_RGF = {
  cod_ibge: '2304400',
  relatorio: 'RGF',
  default: '2024-Q3',
  periodos: [{ periodo: '2024-Q3', relatorio: 'RGF', versao_entrega: '1', vigente: true }],
};

function cockpitFake(overrides: Partial<backend.CockpitResponse> = {}): backend.CockpitResponse {
  return {
    cod_ibge: '2304400',
    nome: 'Fortaleza',
    esfera: 'municipal',
    periodo: '2024-B6',
    as_of: null,
    resumo: {
      farol: 'conforme',
      cor: 'verde',
      indicadores_avaliados: 2,
      n_alertas: 1,
      n_alertas_criticos: 0,
      mudancas_relevantes: [
        {
          indicador: 'pessoal_executivo',
          rotulo: 'Pessoal (Executivo)',
          valor_atual: 47.2,
          valor_anterior: 46.1,
          delta_pp: 1.1,
          faixa_atual: 'normal',
          faixa_anterior: 'normal',
          mudou_de_faixa: false,
          periodo_anterior: '2024-B5',
        },
      ],
      source_ref: { relatorio: 'RREO', periodo: '2024-B6', versao_entrega: '1' },
    },
    criticos: [
      {
        indicador: 'pessoal_executivo',
        rotulo: 'Pessoal (Executivo)',
        sentido: 'teto',
        valor_pct: 47.2,
        valor_rs: null,
        limite_pct: 54,
        faixa: 'normal',
        cor: 'verde',
        distancia_pp: 6.8,
        source_ref: { relatorio: 'RREO', periodo: '2024-B6', versao_entrega: '1' },
      },
    ],
    tendencias: [
      {
        indicador: 'pessoal',
        rotulo: 'Pessoal (% RCL)',
        unidade: '% RCL',
        modelo: 'holt_winters',
        historico: [
          { periodo: '2024-B5', valor: 46.1 },
          { periodo: '2024-B6', valor: 47.2 },
        ],
        projecao: [{ periodo: '2025-B1', previsto: 48.0, ic_inferior: 47, ic_superior: 49 }],
        limite_pct: 54,
        cruzamento_periodo: null,
        disponivel: true,
        motivo_indisponivel: null,
        source_ref: { relatorio: 'RREO', periodo: '2024-B6', versao_entrega: '1' },
      },
    ],
    explicadores: [
      {
        dimensao: 'receita_origem',
        rotulo: 'Receita por origem',
        medida: 'arrecadado_acum',
        periodo_atual: '2024-B6',
        periodo_anterior: '2024-B5',
        componentes: [
          {
            codigo: 'ReceitasCorrentes',
            descricao: 'ReceitasCorrentes',
            atual: 1200,
            anterior: 1000,
            delta_abs: 200,
            delta_pct: 20,
          },
        ],
        disponivel: true,
        motivo_indisponivel: null,
        source_ref: { relatorio: 'RREO', anexo: 'Anexo 01', periodo: '2024-B6', versao_entrega: '1' },
      },
    ],
    comparacoes: [
      {
        base: 'orcamento',
        rotulo: 'Orçamento (LDO/meta)',
        indicador: 'pessoal_executivo',
        disponivel: false,
        motivo_indisponivel: 'Sem base de comparação: metas da LDO não cadastradas.',
        valor_atual: null,
        valor_base: null,
        delta_abs: null,
        delta_pct: null,
        referencia: null,
        source_ref: null,
      },
    ],
    riscos: [],
    qualidade: {
      fontes: [
        {
          fonte: 'siconfi_rreo',
          relatorio: 'RREO',
          cadencia: 'bimestral',
          periodo_mais_recente: '2024-B6',
          defasagem_periodos: 9,
          ultima_carga: '2026-07-07T12:38:57Z',
          n_registros: 3671,
          versao_entrega_vigente: '1',
          retificacoes: 0,
        },
      ],
      defasagem_maxima: 9,
      confiavel: false,
      observacao: null,
    },
    source_ref: { relatorio: 'RREO', periodo: '2024-B6', versao_entrega: '1' },
    ...overrides,
  } as backend.CockpitResponse;
}

beforeEach(() => {
  vi.spyOn(api, 'getToken').mockReturnValue('token-de-teste');
  vi.spyOn(backend, 'fetchPeriodos').mockImplementation((_ibge, relatorio) =>
    Promise.resolve((relatorio === 'RGF' ? PERIODOS_RGF : PERIODOS_RREO) as never),
  );
});

function Sonda() {
  const { ente, periodo, periodoRgf } = useApp();
  return (
    <div>
      <span data-testid="ente">{ente.nome}</span>
      <span data-testid="periodo">{periodo}</span>
      <span data-testid="periodo-rgf">{periodoRgf}</span>
    </div>
  );
}

describe('contexto fiscal (ente + período)', () => {
  it('adota como período default o mais recente COM DADO, vindo do backend', async () => {
    render(
      <MemoryRouter>
        <AppProvider>
          <Sonda />
        </AppProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId('periodo')).toHaveTextContent('2024-B6'));
    // O período de RGF é independente do de RREO (rotas diferentes o consomem).
    expect(screen.getByTestId('periodo-rgf')).toHaveTextContent('2024-Q3');
  });

  it('trocar o ente no seletor atualiza o contexto (afeta todas as páginas)', async () => {
    vi.spyOn(backend, 'fetchEntes').mockResolvedValue({
      data: [
        {
          cod_ibge: '2307650',
          nome: 'Juazeiro do Norte',
          uf: 'CE',
          esfera: 'municipal',
          populacao: 278264,
          tem_dado: true,
          periodo_mais_recente: '2024-B6',
        },
      ],
      total: 1,
      escopo_total: 184,
    } as never);

    function Tela() {
      return (
        <>
          <SeletorEnte aberto setAberto={() => undefined} />
          <Sonda />
        </>
      );
    }
    render(
      <MemoryRouter>
        <AppProvider>
          <Tela />
        </AppProvider>
      </MemoryRouter>,
    );
    const opcao = await screen.findByText('Juazeiro do Norte');
    await userEvent.click(opcao);
    await waitFor(() =>
      expect(screen.getByTestId('ente')).toHaveTextContent('Juazeiro do Norte'),
    );
  });

  it('o seletor de período só oferece períodos com dado e marca o ativo', async () => {
    render(
      <MemoryRouter>
        <AppProvider>
          <SeletorPeriodo usaRgf={false} />
        </AppProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('2024-B6')).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText('Selecionar período'));
    const opcoes = await screen.findAllByRole('option');
    expect(opcoes.map((o) => o.textContent)).toEqual(['2024-B6', '2024-B5']);
  });
});

describe('cockpit', () => {
  it('renderiza as 7 camadas', async () => {
    vi.spyOn(backend, 'fetchCockpit').mockResolvedValue(cockpitFake() as never);
    render(
      <MemoryRouter>
        <AppProvider>
          <CockpitPage />
        </AppProvider>
      </MemoryRouter>,
    );
    for (const titulo of [
      'Resumo',
      'Indicadores críticos',
      'Tendências',
      'Explicadores',
      'Comparações',
      'Riscos e ações',
      'Qualidade do dado',
    ]) {
      expect(await screen.findByRole('heading', { name: titulo })).toBeInTheDocument();
    }
  });

  it('mostra "sem base de comparação" em vez de zero', async () => {
    vi.spyOn(backend, 'fetchCockpit').mockResolvedValue(cockpitFake() as never);
    render(
      <MemoryRouter>
        <AppProvider>
          <CockpitPage />
        </AppProvider>
      </MemoryRouter>,
    );
    expect(
      await screen.findByText(/Sem base de comparação: metas da LDO não cadastradas/),
    ).toBeInTheDocument();
    // Nenhum "0,00" fabricado na linha sem base.
    expect(screen.queryByText('0.00 p.p.')).not.toBeInTheDocument();
  });

  it('reporta a defasagem em vez de fingir que o dado é do mês corrente', async () => {
    vi.spyOn(backend, 'fetchCockpit').mockResolvedValue(cockpitFake() as never);
    render(
      <MemoryRouter>
        <AppProvider>
          <CockpitPage />
        </AppProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Defasagem de até 9 período/)).toBeInTheDocument();
  });

  it('mostra erro honesto quando o backend falha', async () => {
    vi.spyOn(backend, 'fetchCockpit').mockRejectedValue(new Error('backend indisponível'));
    render(
      <MemoryRouter>
        <AppProvider>
          <CockpitPage />
        </AppProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/backend indisponível/)).toBeInTheDocument();
  });
});
