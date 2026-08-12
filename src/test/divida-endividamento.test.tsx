/**
 * Sprint D1 — cartão de posição vigente de Garantias e Operações de Crédito na Dívida.
 *
 * Os dois limites (22%/16% da RCL Ajustada) já eram apurados e listados em
 * `GET /entes/{cod}/limites` — só apareciam na página de Dívida dentro do simulador, com o
 * gestor tendo que digitar a base atual à mão para ver qualquer número. Este teste cobre
 * que a página busca e mostra a posição vigente sozinha, sem exigir simulação, e que a
 * ausência de apuração (anexo não entregue) aparece como ausência, nunca como zero.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AppProvider } from '../context/AppContext';
import { DividaPage } from '../pages/DividaPage';
import * as backend from '../services/backend';
import * as api from '../services/api';

const SRC_RGF = { relatorio: 'RGF', anexo: 'Anexo 02 — DDCL', periodo: '2024-Q3', versao_entrega: '1' };
const SRC_RREO = { relatorio: 'RREO', periodo: '2024-B6', versao_entrega: '1' };

function mockComum() {
  vi.spyOn(api, 'getToken').mockReturnValue('token-de-teste');
  // O contexto pede os períodos de RREO e RGF separadamente (§6.6) — cada um com o seu
  // próprio formato (bimestre × quadrimestre). Diferenciar por argumento é o que garante
  // que `periodo` (RREO) chega correto ao cartão novo, que consulta /limites por bimestre.
  vi.spyOn(backend, 'fetchPeriodos').mockImplementation((_ibge: string, relatorio?: string) => {
    if (relatorio === 'RGF') {
      return Promise.resolve({
        cod_ibge: '2304400', relatorio: 'RGF', default: '2024-Q3',
        periodos: [{ periodo: '2024-Q3', relatorio: 'RGF', versao_entrega: '1', vigente: true }],
      } as never);
    }
    return Promise.resolve({
      cod_ibge: '2304400', relatorio: 'RREO', default: '2024-B6',
      periodos: [{ periodo: '2024-B6', relatorio: 'RREO', versao_entrega: '1', vigente: true }],
    } as never);
  });
  vi.spyOn(backend, 'fetchMe').mockResolvedValue({
    usuario: { id: 'u1', email: 'gestor@ente.gov.br', nome: 'Gestor' },
    org_ativa: { id: 'o1', nome: 'Prefeitura', tipo: 'ente', capacidades: ['ver'] },
    orgs: [],
  } as never);
  vi.spyOn(backend, 'fetchDivida').mockResolvedValue({
    cod_ibge: '2304400', periodo: '2024-Q3', as_of: '2026-01-01T00:00:00Z', versao_entrega: '1',
    esfera: 'municipal',
    dcl: {
      rotulo: 'DCL líquida', natureza: 'liquida',
      dc_bruta: 5_000_000_000, disponibilidades: 500_000_000, haveres: 100_000_000,
      dcl: 4_400_000_000, rcl_ajustada: 11_000_000_000, pct_rcl: 40,
      limite_pct: 120, faixa: 'normal', as_of: '2026-01-01T00:00:00Z', source_ref: SRC_RGF,
    },
    capag: {
      rotulo: 'CAPAG — endividamento bruto', natureza: 'bruta', ano_ref: 2024,
      nota_final: 'B', ind_endividamento: 0.6, endividamento_pct: 60,
      ind_poupanca: 0.1, ind_liquidez: 1.1, metodologia_versao: null, metodologia_rotulo: null,
      ano_base_fonte: null, ano_base_fonte_diverge: null,
      as_of: '2026-01-01T00:00:00Z', source_ref: { relatorio: 'CAPAG', periodo: '2024', versao_entrega: '1' },
    },
    composicao: [], serie: [], serie_ajuste: null, comparacao: null, periodo_breadcrumb: [],
    source_ref: SRC_RGF,
  } as never);
  vi.spyOn(backend, 'fetchDividaMemoria').mockRejectedValue(new Error('fora do escopo deste teste'));
  vi.spyOn(backend, 'fetchDividaCronograma').mockRejectedValue(new Error('fora do escopo deste teste'));
  vi.spyOn(backend, 'fetchDividaArvore').mockRejectedValue(new Error('fora do escopo deste teste'));
  vi.spyOn(backend, 'fetchBenchmark').mockRejectedValue(new Error('sem coorte neste teste'));
  vi.spyOn(backend, 'fetchDividaPvl').mockRejectedValue(new Error('fora do escopo deste teste'));
  vi.spyOn(backend, 'fetchCoberturaPagina').mockRejectedValue(new Error('sem cobertura neste teste'));
}

function renderDivida() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <DividaPage />
      </AppProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  mockComum();
});

describe('Dívida — posição vigente de Garantias e Operações de Crédito (Sprint D1)', () => {
  it('busca /limites pelo período RREO (bimestre) e mostra as duas posições sem simular', async () => {
    const fetchLimites = vi.spyOn(backend, 'fetchLimites').mockResolvedValue({
      cod_ibge: '2304400', periodo: '2024-B6', versao_entrega: '1',
      itens: [
        {
          indicador: 'garantias', esfera: 'municipal', sentido: 'teto',
          valor_rs: 50_000_000, valor_pct_rcl: 0.45, faixa: 'normal', teto_pct: 22,
          alerta_pct: 19.8, prudencial_pct: 20.9, distancia_teto: 21.55, distancia_alerta: 19.35,
          denominador: 'rcl_ajustada', base_valor: 11_000_000_000,
        },
        {
          indicador: 'operacoes_credito', esfera: 'municipal', sentido: 'teto',
          valor_rs: 495_000_000, valor_pct_rcl: 4.5, faixa: 'normal', teto_pct: 16,
          alerta_pct: 14.4, prudencial_pct: 15.2, distancia_teto: 11.5, distancia_alerta: 9.9,
          denominador: 'rcl_ajustada', base_valor: 11_000_000_000,
        },
      ],
      source_ref: SRC_RREO,
    } as never);

    renderDivida();
    await screen.findByText('Posição vigente de endividamento');
    expect(fetchLimites).toHaveBeenCalledWith('2304400', '2024-B6');

    expect(await screen.findByText('Garantias concedidas')).toBeInTheDocument();
    expect(screen.getByText('Operações de crédito')).toBeInTheDocument();
    // % correta, sem exigir clique no simulador.
    const meters = screen.getAllByRole('meter').filter((m) =>
      (m.getAttribute('aria-label') ?? '').includes('RCL Ajustada'),
    );
    expect(meters).toHaveLength(2);
  });

  it('anexo não entregue aparece como ausência, nunca como zero', async () => {
    vi.spyOn(backend, 'fetchLimites').mockResolvedValue({
      cod_ibge: '2304400', periodo: '2024-B6', versao_entrega: '1',
      itens: [], // nenhum dos dois indicadores foi materializado neste período
      source_ref: SRC_RREO,
    } as never);

    renderDivida();
    await screen.findByText('Posição vigente de endividamento');
    const avisos = await screen.findAllByText(/Não apurado/);
    expect(avisos).toHaveLength(2);
    expect(screen.queryByText('0,00%')).not.toBeInTheDocument();
  });
});
