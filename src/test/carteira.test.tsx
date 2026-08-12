/**
 * Sprint 23 — rede de proteção da Carteira & Visão Estadual.
 *
 * Cobre: o consolidado mostra Σnum/Σden e a cobertura honesta (n/184 + períodos mistos);
 * o clique no ranking **troca o ente do contexto** (drill território→ente); a aba "Minha
 * carteira" mostra a grade do escopo; e a troca de visão pelo shell navega para a aba certa.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';

import { AppProvider, useApp } from '../context/AppContext';
import { CarteiraPage } from '../pages/CarteiraPage';
import { SeletorVisao } from '../layouts/ContextSelectors';
import * as backend from '../services/backend';
import * as api from '../services/api';

const PERIODOS_RREO = {
  cod_ibge: '2304400',
  relatorio: 'RREO',
  default: '2024-B6',
  periodos: [{ periodo: '2024-B6', relatorio: 'RREO', versao_entrega: '1', vigente: true }],
};
const PERIODOS_RGF = { cod_ibge: '2304400', relatorio: 'RGF', default: '2024-Q3', periodos: [] };

const sref = { relatorio: 'RREO', periodo: '2024-B6', versao_entrega: '1' };

function consolidadoFake(): backend.ConsolidadoUfResponse {
  return {
    uf: '23',
    uf_nome: 'Ceará',
    periodo: '2024-B6',
    escopo: 'municipios_consolidado',
    ente_estadual: { cod_ibge: '23', nome: 'Ceará', acessivel: true, motivo_indisponivel: null },
    n_municipios: 184,
    n_municipios_com_dado: 170,
    cobertura_pct: '92.4',
    observacao: 'Consolidado dos municípios; o ente estadual não entra no consolidado.',
    indicadores: [
      {
        indicador: 'pessoal_executivo', rotulo: 'Despesa de Pessoal (Executivo)', tipo: 'ratio',
        unidade: 'PCT_RCL', numerador: '19400000000', denominador: '42800000000', valor_pct: '45.32',
        teto_pct: '54', sentido: 'teto', faixa: 'normal', cor: 'verde',
        n_entes_total: 184, n_entes_com_dado: 168, cobertura_pct: '91.3',
        entes_ausentes: ['2300000', '2300001'], periodos_mistos: true, versao_calculo: 'v1', source_ref: sref,
      },
    ],
    source_ref: sref,
  };
}

function malhaFake(): backend.MalhaResponse {
  return {
    uf: '23', formato: 'geojson', fonte: 'IBGE', ano: 2022, n_areas: 2, simplificacao: 'minima',
    malha: {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { codarea: '2304400' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] } },
        { type: 'Feature', properties: { codarea: '2307650' }, geometry: { type: 'Polygon', coordinates: [[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]] } },
      ],
    },
  };
}

function mapaFake(): backend.MapaUfResponse {
  return {
    uf: '23', periodo: '2024-B6', indicador: 'pessoal_executivo', rotulo: 'Pessoal',
    legenda: { normal: 'verde', 'sem dado / fora do escopo': 'cinza' }, malha_ref: '/geo/malha/23',
    entes: [
      { cod_ibge: '2304400', valor_pct: '47.2', faixa: 'normal', cor: 'verde', no_escopo: false },
      { cod_ibge: '2307650', valor_pct: '52.1', faixa: 'prudencial', cor: 'laranja', no_escopo: false },
    ],
    source_ref: sref,
  };
}

function distFake(): backend.DistribuicaoUfResponse {
  return {
    uf: '23', periodo: '2024-B6', indicador: 'pessoal_executivo', rotulo: 'Pessoal', unidade: 'PCT_RCL',
    n_com_valor: 168, minimo: '20', p10: '30', p25: '38', mediana: '45', p75: '50', p90: '53', maximo: '60',
    histograma: [{ faixa_inferior: '20', faixa_superior: '40', contagem: 60 }, { faixa_inferior: '40', faixa_superior: '60', contagem: 108 }],
    concentracao_top5_pct: '18.4', concentracao_top10_pct: '31.2', total: '19400000000', source_ref: sref,
  };
}

function rankingFake(): backend.RankingUfResponse {
  return {
    uf: '23', periodo: '2024-B6', indicador: 'pessoal_executivo', rotulo: 'Pessoal', sentido: 'teto',
    unidade: 'PCT_RCL', ordenar: 'valor', n_total: 2, n_com_valor: 2,
    itens: [
      { cod_ibge: '2307650', nome: 'Juazeiro do Norte', regiao: 'Cariri', porte: 'medio', populacao: 278264, valor_pct: '52.1', valor_rs: '600000000', faixa: 'prudencial', cor: 'laranja', posicao: 1, percentil: '100', destaque: true, no_escopo: true },
      { cod_ibge: '2304400', nome: 'Fortaleza', regiao: 'Grande Fortaleza', porte: 'metropole', populacao: 2700000, valor_pct: '47.2', valor_rs: '5000000000', faixa: 'normal', cor: 'verde', posicao: 2, percentil: '50', destaque: false, no_escopo: true },
    ],
    source_ref: sref,
  };
}

beforeEach(() => {
  vi.spyOn(api, 'getToken').mockReturnValue('token-de-teste');
  vi.spyOn(backend, 'fetchPeriodos').mockImplementation((_ibge, relatorio) =>
    Promise.resolve((relatorio === 'RGF' ? PERIODOS_RGF : PERIODOS_RREO) as never),
  );
  vi.spyOn(backend, 'fetchConsolidadoUf').mockResolvedValue(consolidadoFake() as never);
  vi.spyOn(backend, 'fetchMalha').mockResolvedValue(malhaFake() as never);
  vi.spyOn(backend, 'fetchUfMapa').mockResolvedValue(mapaFake() as never);
  vi.spyOn(backend, 'fetchUfDistribuicao').mockResolvedValue(distFake() as never);
  vi.spyOn(backend, 'fetchUfRanking').mockResolvedValue(rankingFake() as never);
});

function Sonda() {
  const { ente } = useApp();
  return <span data-testid="ente">{ente.nome}</span>;
}

/** Sprint D1: para conferir que a navegação para o Cockpit leva o indicador de origem
 * (?deCarteira=&uf=), sem depender de uma rota `/dashboard` de verdade neste teste. */
function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}{location.search}</span>;
}

function renderCarteira(initialEntries = ['/carteira']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppProvider>
        <Sonda />
        <LocationProbe />
        <CarteiraPage />
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('Consolidado UF', () => {
  it('mostra Σnum/Σden e a cobertura honesta (n/184 + períodos mistos)', async () => {
    renderCarteira();
    // consolidado ponderado: 45,32% (não uma média), com a memória Σ/Σ visível
    // pt-BR: vírgula decimal. O fixture manda '45.32' (JSON do backend, Decimal como
    // string); a tela renderiza '45,32%'. Estes testes travavam a formatação en-US —
    // `toFixed` produzia ponto, que em pt-BR é separador de milhar, e o consolidado de
    // uma UF inteira ficava ambíguo em três ordens de grandeza.
    expect(await screen.findByText('45,32%')).toBeInTheDocument();
    expect(screen.getByText(/Σ R\$ 19,40 bi \/ Σ R\$ 42,80 bi/)).toBeInTheDocument();
    // cobertura honesta do indicador
    expect(screen.getByText('168/184')).toBeInTheDocument();
    expect(screen.getByText('PERÍODOS MISTOS')).toBeInTheDocument();
    // o ente estadual é referenciado à parte (nunca somado ao consolidado)
    expect(screen.getByText(/é um ente à parte/i)).toBeInTheDocument();
  });

  it('o clique no ranking troca o ente do contexto (drill território→ente)', async () => {
    renderCarteira();
    // o contexto começa em Fortaleza (ente inicial)
    // pt-BR: vírgula decimal. O fixture manda '45.32' (JSON do backend, Decimal como
    // string); a tela renderiza '45,32%'. Estes testes travavam a formatação en-US —
    // `toFixed` produzia ponto, que em pt-BR é separador de milhar, e o consolidado de
    // uma UF inteira ficava ambíguo em três ordens de grandeza.
    expect(await screen.findByText('45,32%')).toBeInTheDocument();
    const alvo = await screen.findByText('Juazeiro do Norte');
    await userEvent.click(alvo);
    await waitFor(() => expect(screen.getByTestId('ente')).toHaveTextContent('Juazeiro do Norte'));
  });

  it('preserva o indicador do ranking na navegação para o Cockpit (Sprint D1)', async () => {
    renderCarteira();
    // Troca o indicador do ranking para Dívida antes de clicar num ente.
    await userEvent.click(await screen.findByRole('button', { name: 'Dívida (DCL)' }));
    await waitFor(() =>
      expect(backend.fetchUfRanking).toHaveBeenLastCalledWith(
        '23',
        expect.objectContaining({ indicador: 'divida_consolidada_liquida' }),
      ),
    );
    const alvo = await screen.findByText('Juazeiro do Norte');
    await userEvent.click(alvo);
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/dashboard?deCarteira=divida_consolidada_liquida&uf=23',
      ),
    );
  });

  it('abre o ranking já no indicador do deep-link ?indicador= (voltar ao ranking)', async () => {
    renderCarteira(['/carteira?indicador=divida_consolidada_liquida']);
    await waitFor(() =>
      expect(backend.fetchUfRanking).toHaveBeenCalledWith(
        '23',
        expect.objectContaining({ indicador: 'divida_consolidada_liquida' }),
      ),
    );
    expect(await screen.findByRole('button', { name: 'Dívida (DCL)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('abas', () => {
  it('a aba "Minha carteira" mostra a grade do escopo', async () => {
    vi.spyOn(backend, 'fetchCarteiraResumo').mockResolvedValue({
      periodo: '2024-B6', total_entes: 3, entes_com_dados: 3, por_conformidade: {}, por_indicador: [], source_ref: sref,
    } as never);
    vi.spyOn(backend, 'fetchCarteiraGrade').mockResolvedValue({
      data: [
        { cod_ibge: '2304400', nome: 'Fortaleza', uf: 'CE', regiao: null, porte: 'metropole', populacao: 2700000, grupo: 'Capitais', tag: null, conformidade: 'conforme', cor: 'verde', risco_score: 0, indicadores: [] },
      ],
      page: 1, page_size: 300, total: 1, source_ref: sref,
    } as never);

    renderCarteira();
    await screen.findByText('45,32%'); // consolidado carregou (pt-BR: vírgula decimal)
    await userEvent.click(screen.getByRole('tab', { name: 'Minha carteira' }));
    // botão de lote é exclusivo da aba da carteira; a grade traz o ente do escopo
    expect(await screen.findByText('Gerar relatório do escopo')).toBeInTheDocument();
    expect(await screen.findByText('Fortaleza')).toBeInTheDocument();
  });

  it('abre direto na aba vinda do seletor de visão (?aba=estadual)', async () => {
    renderCarteira(['/carteira?aba=estadual']);
    expect(
      await screen.findByRole('tab', { name: 'Ente estadual' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText(/Abrir cockpit de Ceará/)).toBeInTheDocument();
  });

  it('não oferece o cockpit do ente estadual quando ele está fora do escopo', async () => {
    // Ver o consolidado da UF não implica poder abrir o Governo do Estado. Antes, o botão
    // era oferecido a todos e o 403 chegava à tela como "ente sem período com dado".
    const motivo = 'O ente estadual não está na carteira/escopo deste usuário.';
    vi.mocked(backend.fetchConsolidadoUf).mockResolvedValue({
      ...consolidadoFake(),
      ente_estadual: { cod_ibge: '23', nome: 'Ceará', acessivel: false, motivo_indisponivel: motivo },
    } as never);

    renderCarteira(['/carteira?aba=estadual']);
    expect(await screen.findByText(motivo)).toBeInTheDocument();
    expect(screen.queryByText(/Abrir cockpit de Ceará/)).not.toBeInTheDocument();
  });
});

describe('SeletorVisao', () => {
  it('lista as visões (município, consolidado, estadual, carteira, grupos, comparação)', async () => {
    render(
      <MemoryRouter>
        <AppProvider>
          <SeletorVisao />
        </AppProvider>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByLabelText('Selecionar visão'));
    const lista = screen.getByRole('listbox', { name: 'Visões do contexto' });
    for (const rotulo of ['Município (cockpit)', 'Consolidado da UF', 'Ente estadual', 'Minha carteira', 'Grupos', 'Comparação entre entes']) {
      expect(within(lista).getByText(rotulo)).toBeInTheDocument();
    }
  });
});
