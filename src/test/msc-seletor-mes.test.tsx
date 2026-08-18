/**
 * O seletor de mês do Explorador MSC — relatado como "M01, M02 não funcionam".
 *
 * O backend foi conferido em produção antes deste teste: `build_arvore` devolve período e
 * saldos diferentes para 2026-M01, M03 e M06, inclusive com o `as_of` da página. Então, se
 * a tela não muda, o defeito é do lado do cliente — e é isso que aqui se prova ou se
 * refuta, em vez de se supor.
 *
 * O teste é sobre o **contrato da interação**: clicar numa pastilha tem de refetchar a
 * árvore com aquele mês. Um seletor que não repassa o filtro mostra o mês errado com ar de
 * certeza, que num explorador de saldos contábeis é pior do que não mostrar nada.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { AppProvider } from '../context/AppContext';
import { PatrimonioPage } from '../pages/PatrimonioPage';
import * as backend from '../services/backend';
import * as api from '../services/api';

const MESES = ['2026-M01', '2026-M02', '2026-M03', '2026-M04', '2026-M05', '2026-M06'];
const AS_OF = '2026-07-29T14:31:46.843799-03:00';
const SRC_MSC = { relatorio: 'MSC', anexo: 'MSC', periodo: '2026-M06', versao_entrega: '1' };

/** Saldo distinto por mês — é o que torna observável se o filtro chegou ao backend. */
const SALDO_POR_MES: Record<string, number> = {
  '2026-M01': 82_006_726_847.13,
  '2026-M03': 77_876_991_809.5,
  '2026-M06': 76_762_675_059.03,
};

function arvoreDoMes(periodo: string) {
  return {
    node: null,
    breadcrumb: [],
    children: [
      {
        codigo: '1.0.0.0.0.00.00',
        descricao: 'Ativo',
        nivel: 1,
        measures: { saldo: SALDO_POR_MES[periodo] ?? 0 },
        has_children: true,
      },
    ],
    measures: {},
    period: periodo,
    as_of: AS_OF,
    source_ref: SRC_MSC,
  };
}

function mockSessao() {
  vi.spyOn(api, 'getToken').mockReturnValue('token-de-teste');
  vi.spyOn(backend, 'fetchPeriodos').mockResolvedValue({
    cod_ibge: '23', relatorio: 'RREO', default: '2026-B3',
    periodos: [{ periodo: '2026-B3', relatorio: 'RREO', versao_entrega: '1', vigente: true }],
  } as never);
  vi.spyOn(backend, 'fetchMe').mockResolvedValue({
    usuario: { id: 'u1', email: 'gestor@ce.gov.br', nome: 'Gestor' },
    org_ativa: { id: 'o1', nome: 'Sefaz', tipo: 'estadual', capacidades: ['ver'] },
    orgs: [],
  } as never);
}

describe('Explorador MSC — seletor de mês', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSessao();
    vi.spyOn(backend, 'fetchPatrimonio').mockResolvedValue({
      cod_ibge: '23', ano: 2026, as_of: AS_OF, esfera: 'estadual', uf: 'CE',
      tem_msc: true, tem_dca: true,
      ativo: 76_762_675_059, passivo_pl: 76_762_675_059, patrimonio_liquido: 1,
      vpd: 1, vpa: 1, resultado_patrimonial: 0, balanco_fechado: true,
      meses_msc: MESES, anos_disponiveis: [2024, 2025, 2026],
      conciliado: true, n_divergencias: 0,
      cobertura: { tem_dca: true, tem_msc: true, anos_dca: [2026], meses_msc: MESES, fontes_ausentes: [], mensagem: '' },
      source_ref: SRC_MSC,
    } as never);
    vi.spyOn(backend, 'fetchMscConciliacao').mockResolvedValue({
      cod_ibge: '23', ano: 2026, tem_msc: true, tem_dca: true, titulo: 'Conciliação MSC ↔ DCA',
      conciliado: true, n_checks: 3, n_divergencias: 0, checks: [], observacao: null,
      source_ref: SRC_MSC, as_of: AS_OF,
    } as never);
  });

  it('clicar em M01 refetcha a árvore com aquele mês', async () => {
    const arvore = vi
      .spyOn(backend, 'fetchMscArvore')
      .mockImplementation((_ibge, params) =>
        Promise.resolve(arvoreDoMes(params.periodo ?? '2026-M06') as never),
      );

    render(
      <MemoryRouter initialEntries={['/patrimonio']}>
        <AppProvider>
          <PatrimonioPage />
        </AppProvider>
      </MemoryRouter>,
    );

    // Abre no mês mais recente — é o default honesto para um explorador mensal.
    await waitFor(() => expect(arvore).toHaveBeenCalled());
    await waitFor(() =>
      expect(arvore.mock.calls.at(-1)?.[1].periodo).toBe('2026-M06'),
    );

    await userEvent.click(await screen.findByRole('button', { name: /M01/ }));

    await waitFor(() =>
      expect(arvore.mock.calls.at(-1)?.[1].periodo).toBe('2026-M01'),
    );
  });

  it('o mês selecionado é anunciado, não apenas colorido', async () => {
    // Sprint 27 levou a a11y a 99; um filtro que só muda de cor é invisível para quem usa
    // leitor de tela, e "M01" sozinho não diz nem que é mês nem que está selecionado.
    vi.spyOn(backend, 'fetchMscArvore').mockImplementation((_ibge, params) =>
      Promise.resolve(arvoreDoMes(params.periodo ?? '2026-M06') as never),
    );

    render(
      <MemoryRouter initialEntries={['/patrimonio']}>
        <AppProvider>
          <PatrimonioPage />
        </AppProvider>
      </MemoryRouter>,
    );

    const m06 = await screen.findByRole('button', { name: /M06/ });
    expect(m06).toHaveAttribute('aria-pressed', 'true');

    const m01 = await screen.findByRole('button', { name: /M01/ });
    expect(m01).toHaveAttribute('aria-pressed', 'false');
  });
});
