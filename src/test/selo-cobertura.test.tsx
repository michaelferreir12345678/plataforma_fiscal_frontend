/**
 * O selo de cobertura declara para quantos entes a página responde.
 *
 * O que ele resolve: os mínimos constitucionais estão apurados para **1** ente contra 180
 * com RREO, e a página de Saúde & Educação abria para qualquer um sem dizer isso. Quem via
 * "sem dado para este ente" concluía que o **ente** não entregou — e ia cobrar o próprio
 * setor contábil por uma ausência que é da nossa carga.
 *
 * O comportamento mais importante testado aqui é o **silêncio**: um selo que aparece em
 * toda página vira moldura e deixa de ser lido justamente onde importa.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { SeloCobertura } from '../components/SeloCobertura';
import * as backend from '../services/backend';

const BEM_COBERTA: backend.CoberturaPagina = {
  pagina: 'patrimonio',
  ente: { cod_ibge: '2304400', tem_dado: true, periodo_mais_recente: '2024', periodo_solicitado: null },
  escopo: { entes_no_escopo: 185, entes_com_dado: 184 },
  fontes: [
    { fonte: 'siconfi_dca', descricao: 'Declaração de Contas Anuais', orgao: 'STN', entes_com_dado: 184, periodo_mais_recente: '2024' },
  ],
  indicadores: [],
  lacunas: [],
  observacao: null,
};

const COM_LACUNA: backend.CoberturaPagina = {
  pagina: 'saude-educacao',
  ente: { cod_ibge: '2304400', tem_dado: true, periodo_mais_recente: '2025-B6', periodo_solicitado: '2025-B6' },
  escopo: { entes_no_escopo: 185, entes_com_dado: 1 },
  fontes: [
    { fonte: 'siconfi_rreo', descricao: 'Relatório Resumido da Execução Orçamentária', orgao: 'STN', entes_com_dado: 171, periodo_mais_recente: '2025-B6' },
    { fonte: 'siops_saude', descricao: 'Indicadores de saúde (ASPS)', orgao: 'Ministério da Saúde', entes_com_dado: 1, periodo_mais_recente: '2024-B6' },
  ],
  indicadores: [
    { indicador: 'saude_minimo', entes_com_dado: 1, periodo_mais_recente: '2024-B6' },
    { indicador: 'educacao_mde', entes_com_dado: 1, periodo_mais_recente: '2024-B6' },
  ],
  lacunas: ['saude_minimo', 'educacao_mde'],
  observacao:
    'Esta página depende de dados que a plataforma ainda não carregou para a maior parte dos entes (saude_minimo, educacao_mde). A ausência aqui é da nossa carga, não da entrega do ente.',
};

function montar(dados: backend.CoberturaPagina) {
  vi.spyOn(backend, 'fetchCoberturaPagina').mockResolvedValue(dados);
  return render(
    <MemoryRouter>
      <AppProvider>
        <SeloCobertura pagina={dados.pagina} ente="2304400" periodo="2025-B6" />
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('selo de cobertura', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('cala quando a cobertura é boa — selo em toda página vira moldura', async () => {
    montar(BEM_COBERTA);
    // Espera o recurso resolver antes de afirmar a ausência.
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByText(/Responde para/)).not.toBeInTheDocument();
  });

  it('declara a fração real do escopo quando há lacuna', async () => {
    montar(COM_LACUNA);
    const selo = await screen.findByRole('button', { name: /Responde para/ });
    // 1 de 185: o número do **produto** da página, não o das 171 com RREO.
    expect(selo).toHaveTextContent('1 de 185');
  });

  it('ao abrir, atribui a ausência a quem ela pertence', async () => {
    montar(COM_LACUNA);
    await userEvent.click(await screen.findByRole('button', { name: /Responde para/ }));
    expect(screen.getByRole('note')).toHaveTextContent(/da nossa carga, não da entrega do ente/);
  });

  it('mostra insumo e produto lado a lado, para a diferença ficar visível', async () => {
    montar(COM_LACUNA);
    await userEvent.click(await screen.findByRole('button', { name: /Responde para/ }));
    // A fonte alcança 171; o indicador que a página apresenta alcança 1.
    expect(screen.getByText('171/185')).toBeInTheDocument();
    expect(screen.getAllByText('1/185').length).toBeGreaterThanOrEqual(2);
  });

  it('traduz o código do indicador, em vez de mostrar snake_case', async () => {
    montar(COM_LACUNA);
    await userEvent.click(await screen.findByRole('button', { name: /Responde para/ }));
    expect(screen.queryByText('saude_minimo')).not.toBeInTheDocument();
  });

  it('falha de rede não vira alarme — cobertura é informação sobre a informação', async () => {
    vi.spyOn(backend, 'fetchCoberturaPagina').mockRejectedValue(new Error('rede'));
    render(
      <MemoryRouter>
        <AppProvider>
          <SeloCobertura pagina="receita" ente="2304400" />
        </AppProvider>
      </MemoryRouter>,
    );
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByRole('button', { name: /Responde para/ })).not.toBeInTheDocument();
  });
});
