/**
 * Sprint F2 — CAPAG: "Metodologia" misturava três grandezas (U26).
 *
 * O card já resolvia o achado-semente da B1 ("classificação de {ano} · dados de
 * {ano-1}"), mas o rótulo "Metodologia" continuava emprestado para três coisas
 * diferentes conforme o layout de origem do conector: o ICF (layout oficial), a versão
 * de metodologia (layout estadual) e o **ano-base real da planilha** (layout municipal
 * histórico, coluna `Ano_Base`) — um ano-calendário, não uma metodologia. O backend
 * (`debt/service.py::_parse_ano_base_fonte`) passou a separar os três sem tocar no valor
 * armazenado; aqui travamos que a tela usa os dois rótulos certos.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AppProvider } from '../context/AppContext';
import { DividaPage } from '../pages/DividaPage';
import * as backend from '../services/backend';
import * as api from '../services/api';

const PERIODOS_RGF = {
  cod_ibge: '2304400',
  relatorio: 'RGF',
  default: '2024-Q3',
  periodos: [{ periodo: '2024-Q3', relatorio: 'RGF', versao_entrega: '1', vigente: true }],
};
const SRC = { relatorio: 'RGF', anexo: 'Anexo 02 — DDCL', periodo: '2024-Q3', versao_entrega: '1' };
const SRC_CAPAG = { relatorio: 'CAPAG', periodo: '2024', versao_entrega: '1' };

function mockComum() {
  vi.spyOn(api, 'getToken').mockReturnValue('token-de-teste');
  vi.spyOn(backend, 'fetchPeriodos').mockResolvedValue(PERIODOS_RGF as never);
  vi.spyOn(backend, 'fetchMe').mockResolvedValue({
    usuario: { id: 'u1', email: 'gestor@ente.gov.br', nome: 'Gestor' },
    org_ativa: { id: 'o1', nome: 'Prefeitura', tipo: 'ente', capacidades: ['ver'] },
    orgs: [],
  } as never);
  vi.spyOn(backend, 'fetchDivida').mockResolvedValue({
    cod_ibge: '2304400',
    periodo: '2024-Q3',
    as_of: '2026-01-01T00:00:00Z',
    versao_entrega: '1',
    esfera: 'municipal',
    dcl: {
      rotulo: 'DCL líquida', natureza: 'liquida',
      dc_bruta: 5_000_000_000, disponibilidades: 500_000_000, haveres: 100_000_000,
      dcl: 4_400_000_000, rcl_ajustada: 11_000_000_000, pct_rcl: 40,
      limite_pct: 120, faixa: 'normal', as_of: '2026-01-01T00:00:00Z', source_ref: SRC,
    },
    capag: {
      rotulo: 'CAPAG — endividamento bruto', natureza: 'bruta', ano_ref: 2024,
      nota_final: 'B', ind_endividamento: 0.6, endividamento_pct: 60,
      ind_poupanca: 0.1, ind_liquidez: 1.1, metodologia_versao: null, metodologia_rotulo: null,
      ano_base_fonte: null, ano_base_fonte_diverge: null,
      as_of: '2026-01-01T00:00:00Z', source_ref: SRC_CAPAG,
    },
    composicao: [],
    serie: [],
    serie_ajuste: null,
    comparacao: null,
    periodo_breadcrumb: [],
    source_ref: SRC,
  } as never);
  // Os demais cards da página não fazem parte deste achado (U26 é só o CAPAG) — deixados
  // em falha controlada; cada um tem seu próprio <Async> e mostra erro, não quebra a tela.
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

describe('CAPAG — ano-base × metodologia/ICF não se misturam (U26)', () => {
  it('quando o layout traz Ano_Base, mostra "Ano-base da fonte" — não "Metodologia"', async () => {
    vi.spyOn(backend, 'fetchDividaCapag').mockResolvedValue({
      cod_ibge: '2304400', periodo: '2024-Q3', as_of: null,
      hero: {
        rotulo: 'CAPAG — endividamento bruto', natureza: 'bruta', ano_ref: 2024,
        nota_final: 'B', ind_endividamento: 0.6, endividamento_pct: 60,
        ind_poupanca: 0.1, ind_liquidez: 1.1,
        metodologia_versao: null, metodologia_rotulo: null, ano_base_fonte: 2023, ano_base_fonte_diverge: false,
        as_of: null, source_ref: SRC_CAPAG,
      },
      memoria: {
        formula_endividamento: 'Indicador 1 = DC bruta ÷ RCL', base_numerador: 'DC bruta',
        base_denominador: 'RCL', escala: 'razão', observacoes: [],
      },
      source_ref: SRC_CAPAG,
    } as never);
    renderDivida();
    expect(await screen.findByText(/Ano-base da fonte 2023/)).toBeInTheDocument();
    expect(screen.queryByText(/Metodologia\/ICF/)).not.toBeInTheDocument();
  });

  it('quando o layout é oficial (município), mostra "ICF" — não "Metodologia"', async () => {
    vi.spyOn(backend, 'fetchDividaCapag').mockResolvedValue({
      cod_ibge: '2304400', periodo: '2024-Q3', as_of: null,
      hero: {
        rotulo: 'CAPAG — endividamento bruto', natureza: 'bruta', ano_ref: 2024,
        nota_final: 'B', ind_endividamento: 0.6, endividamento_pct: 60,
        ind_poupanca: 0.1, ind_liquidez: 1.1,
        metodologia_versao: '0.87', metodologia_rotulo: 'ICF',
        ano_base_fonte: null, ano_base_fonte_diverge: null,
        as_of: null, source_ref: SRC_CAPAG,
      },
      memoria: {
        formula_endividamento: 'Indicador 1 = DC bruta ÷ RCL', base_numerador: 'DC bruta',
        base_denominador: 'RCL', escala: 'razão', observacoes: [],
      },
      source_ref: SRC_CAPAG,
    } as never);
    renderDivida();
    expect(await screen.findByText(/ICF 0\.87/)).toBeInTheDocument();
    expect(screen.queryByText(/Ano-base da fonte/)).not.toBeInTheDocument();
  });

  it('quando o layout é estadual, mostra "Metodologia" — não "ICF"', async () => {
    vi.spyOn(backend, 'fetchDividaCapag').mockResolvedValue({
      cod_ibge: '23', periodo: '2024-Q3', as_of: null,
      hero: {
        rotulo: 'CAPAG — endividamento bruto', natureza: 'bruta', ano_ref: 2024,
        nota_final: 'B', ind_endividamento: 0.6, endividamento_pct: 60,
        ind_poupanca: 0.1, ind_liquidez: 1.1,
        metodologia_versao: 'Metodologia estadual v1', metodologia_rotulo: 'Metodologia',
        ano_base_fonte: null, ano_base_fonte_diverge: null,
        as_of: null, source_ref: SRC_CAPAG,
      },
      memoria: {
        formula_endividamento: 'Indicador 1 = DC bruta ÷ RCL', base_numerador: 'DC bruta',
        base_denominador: 'RCL', escala: 'razão', observacoes: [],
      },
      source_ref: SRC_CAPAG,
    } as never);
    renderDivida();
    expect(await screen.findByText(/Metodologia Metodologia estadual v1/)).toBeInTheDocument();
    expect(screen.queryByText(/^ICF /)).not.toBeInTheDocument();
  });

  it('sinaliza quando o ano-base da fonte diverge do esperado (ano_ref - 1)', async () => {
    vi.spyOn(backend, 'fetchDividaCapag').mockResolvedValue({
      cod_ibge: '2304400', periodo: '2024-Q3', as_of: null,
      hero: {
        rotulo: 'CAPAG — endividamento bruto', natureza: 'bruta', ano_ref: 2024,
        nota_final: 'B', ind_endividamento: 0.6, endividamento_pct: 60,
        ind_poupanca: 0.1, ind_liquidez: 1.1,
        metodologia_versao: null, metodologia_rotulo: null, ano_base_fonte: 2021, ano_base_fonte_diverge: true,
        as_of: null, source_ref: SRC_CAPAG,
      },
      memoria: {
        formula_endividamento: 'Indicador 1 = DC bruta ÷ RCL', base_numerador: 'DC bruta',
        base_denominador: 'RCL', escala: 'razão', observacoes: [],
      },
      source_ref: SRC_CAPAG,
    } as never);
    renderDivida();
    expect(await screen.findByText(/diverge do ano-base esperado \(2023\)/)).toBeInTheDocument();
  });
});
