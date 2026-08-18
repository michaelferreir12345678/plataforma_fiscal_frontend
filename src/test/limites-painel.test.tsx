/**
 * Sprint D1 — painel expansível de `/limites`.
 *
 * O backend já tem memória de cálculo, providências, série histórica e simulador prontos
 * e testados (`GET /entes/{cod}/limites/{indicador}`, `POST .../simular`); até esta sprint
 * o frontend não tinha `fetchLimiteDetail` e a lista de limites não abria nada. Este teste
 * cobre o contrato: expandir sem sair da página, deep-link `?indicador=` e o simulador
 * inline (não persiste).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { AppProvider } from '../context/AppContext';
import { LimitesPage } from '../pages/LimitesPage';
import * as backend from '../services/backend';
import * as api from '../services/api';

const SRC = { relatorio: 'RREO', anexo: 'Anexo 03', periodo: '2024-B6', versao_entrega: '1' };
const PERIODOS_RREO = {
  cod_ibge: '2304400',
  relatorio: 'RREO',
  default: '2024-B6',
  periodos: [{ periodo: '2024-B6', relatorio: 'RREO', versao_entrega: '1', vigente: true }],
};

function mockSessao() {
  vi.spyOn(api, 'getToken').mockReturnValue('token-de-teste');
  vi.spyOn(backend, 'fetchPeriodos').mockResolvedValue(PERIODOS_RREO as never);
  vi.spyOn(backend, 'fetchMe').mockResolvedValue({
    usuario: { id: 'u1', email: 'gestor@ente.gov.br', nome: 'Gestor' },
    org_ativa: { id: 'o1', nome: 'Prefeitura', tipo: 'ente', capacidades: ['ver'] },
    orgs: [],
  } as never);
}

function renderPagina(rota = '/') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <AppProvider>
        <LimitesPage />
      </AppProvider>
    </MemoryRouter>,
  );
}

/**
 * `AppContext` resolve `ente`/`periodo` de forma assíncrona (`fetchMe`/`fetchPeriodos`).
 * Como `fetchLimites` está mockado para responder sempre igual (independente do período
 * recebido), a lista pode renderizar **antes** desse acerto terminar — e terminar de
 * acertar depois reinicia o efeito de `useResource` (`res.data` volta a `null` por um
 * instante), remontando as linhas. Interagir nessa janela é uma corrida real: o clique
 * pode ser perdido se o nó DOM for desmontado no mesmo instante. Esperar o período
 * definitivo aparecer no cabeçalho antes de clicar elimina a corrida na raiz.
 */
async function aguardarContextoEstavel(): Promise<void> {
  await screen.findByText(/2024-B6 · posição contra tetos/);
}

const ITEM_PESSOAL = {
  indicador: 'pessoal_executivo', esfera: 'municipal', sentido: 'teto',
  valor_rs: 5_400_000_000, valor_pct_rcl: 47.21, faixa: 'normal', teto_pct: 54,
  alerta_pct: 48.6, prudencial_pct: 51.3, distancia_teto: 6.79, distancia_alerta: 1.39,
  denominador: 'rcl', base_valor: 11_400_000_000,
};

const DETALHE_PESSOAL = {
  cod_ibge: '2304400', periodo: '2024-B6', as_of: null,
  indicador: 'pessoal_executivo', esfera: 'municipal', faixa: 'normal',
  valor_rs: 5_400_000_000, valor_pct_rcl: 47.21, teto_pct: 54,
  memoria: {
    valor_rs: '5400000000', valor_pct_rcl: '47.21', teto_pct: '54', rcl_12m: '11400000000',
    formula: 'valor_pct_rcl = valor_rs / rcl_12m × 100',
  },
  providencias: [
    { faixa: 'alerta', texto: 'Emissão de alerta pelo Tribunal de Contas ao ente.', base_legal: 'LRF art. 59, §1º, II' },
  ],
  serie_historica: [
    { periodo: '2024-B6', valor_pct_rcl: 47.21, faixa: 'normal', valor_rs: 5_400_000_000 },
  ],
  periodo_breadcrumb: [{ codigo: '2024', descricao: '2024', nivel: 1 }],
  source_ref: SRC,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('Painel expansível de Limites (Sprint D1)', () => {
  it('abre a memória, providências e série do indicador sem sair da página', async () => {
    mockSessao();
    vi.spyOn(backend, 'fetchLimites').mockResolvedValue({
      cod_ibge: '2304400', periodo: '2024-B6', versao_entrega: '1',
      itens: [ITEM_PESSOAL], source_ref: SRC,
    } as never);
    const fetchDetail = vi.spyOn(backend, 'fetchLimiteDetail').mockResolvedValue(DETALHE_PESSOAL as never);

    renderPagina();
    await aguardarContextoEstavel();
    // O gatilho de IA ao lado do numero tambem nomeia o indicador (IA-7), e nomear e o
    // certo: "Explique este numero" sozinho nao diz QUAL numero a quem usa leitor de
    // tela. O toggle e identificado pelo proprio estado, nao pelo texto.
    const toggle = await screen.findByRole('button', {
      name: /pessoal.*executivo/i,
      expanded: false,
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(fetchDetail).not.toHaveBeenCalled(); // custo só quando o gestor pede (§6.1)

    await userEvent.click(toggle);
    // `waitFor` (não uma asserção síncrona logo após o clique): o ambiente deste
    // repositório já documenta RTL sob contenção de CPU/RAM como fonte de falso negativo
    // de tempo (vite.config.ts) — a leitura de `aria-expanded` ganha a mesma tolerância
    // que o resto da suíte já usa para esperas encadeadas.
    await waitFor(() => expect(toggle).toHaveAttribute('aria-expanded', 'true'));
    await waitFor(() => expect(fetchDetail).toHaveBeenCalledWith('2304400', 'pessoal_executivo', '2024-B6'));

    // O `region` (role="region") aparece assim que `aberto` vira true — não espera o
    // fetch interno de `LimiteDetailPanel`. `findByText` é quem de fato espera o
    // conteúdo assíncrono (memória/providências/série) resolver antes de conferir o resto.
    const painel = await screen.findByRole('region', { name: /pessoal.*executivo/i });
    await within(painel).findByText(/Memória de cálculo/);
    expect(within(painel).getByText(/LRF art\. 59/)).toBeInTheDocument();
    expect(within(painel).getByText('2024-B6')).toBeInTheDocument(); // linha da série

    // Recolhe sem perder o dado (não refaz a chamada ao reabrir com o mesmo cache útil).
    await userEvent.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute('aria-expanded', 'false'));
    expect(screen.queryByRole('region', { name: /pessoal.*executivo/i })).not.toBeInTheDocument();
  });

  it('abre já expandido quando chega via ?indicador= (crosslink do Cockpit)', async () => {
    mockSessao();
    vi.spyOn(backend, 'fetchLimites').mockResolvedValue({
      cod_ibge: '2304400', periodo: '2024-B6', versao_entrega: '1',
      itens: [ITEM_PESSOAL], source_ref: SRC,
    } as never);
    vi.spyOn(backend, 'fetchLimiteDetail').mockResolvedValue(DETALHE_PESSOAL as never);

    renderPagina('/limites?indicador=pessoal_executivo');
    await aguardarContextoEstavel();
    // O gatilho de IA ao lado do numero tambem nomeia o indicador (IA-7), e nomear e o
    // certo: "Explique este numero" sozinho nao diz QUAL numero a quem usa leitor de
    // tela. O toggle e identificado pelo proprio estado, nao pelo texto.
    const toggle = await screen.findByRole('button', {
      name: /pessoal.*executivo/i,
      expanded: true,
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const painel = await screen.findByRole('region', { name: /pessoal.*executivo/i });
    await within(painel).findByText(/Memória de cálculo/);
  });

  it('simula um novo valor sem persistir (POST .../simular)', async () => {
    mockSessao();
    vi.spyOn(backend, 'fetchLimites').mockResolvedValue({
      cod_ibge: '2304400', periodo: '2024-B6', versao_entrega: '1',
      itens: [ITEM_PESSOAL], source_ref: SRC,
    } as never);
    vi.spyOn(backend, 'fetchLimiteDetail').mockResolvedValue(DETALHE_PESSOAL as never);
    const simular = vi.spyOn(backend, 'simularLimite').mockResolvedValue({
      indicador: 'pessoal_executivo',
      valor_rs_atual: 5_400_000_000,
      valor_rs_simulado: 6_200_000_000,
      valor_pct_atual: 47.21,
      valor_pct_simulado: 54.2,
      faixa_atual: 'normal',
      faixa_simulada: 'excedido',
      teto_pct: 54,
      persistido: false,
    } as never);

    renderPagina('/limites?indicador=pessoal_executivo');
    await aguardarContextoEstavel();
    await screen.findByRole('region', { name: /pessoal.*executivo/i });

    const campo = await screen.findByLabelText(/Novo valor/i);
    await userEvent.type(campo, '6200000000');
    await userEvent.click(await screen.findByRole('button', { name: /^Simular$/ }));

    await waitFor(() =>
      expect(simular).toHaveBeenCalledWith(
        '2304400', 'pessoal_executivo', '2024-B6', { novo_valor_rs: 6200000000 },
      ),
    );
    expect(await screen.findByText(/não persistido/)).toBeInTheDocument();
    // `excedido` vem em caixa baixa do backend; a caixa alta é só efeito visual (CSS
    // text-transform), o nó de texto no DOM continua com o valor original do backend.
    expect(screen.getByText('excedido')).toBeInTheDocument();
  });
});
