/**
 * O painel de explicação nasce **onde o gestor clicou** — e não rouba a posição de leitura.
 *
 * Relatado em uso: apertar "Explicar" jogava a visão para o início da tela. Numa página
 * longa, isso tira de vista justamente o número que motivou a pergunta — o oposto do que
 * uma explicação contextual serve para fazer.
 *
 * O que se trava aqui é o contrato observável (posição fixa ancorada, área de rolagem
 * própria, cabeçalho fora dela), não pixel: jsdom não faz layout, então medir posição
 * exata seria medir a implementação do mock, não o comportamento.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ExplicacaoIA } from '../components/ExplicacaoIA';

const RESPOSTA = {
  capacidade: 'explicar_numero',
  titulo: 'Explique este número',
  ente: '2304400',
  ente_nome: 'Fortaleza',
  periodo: '2024-B6',
  as_of: null,
  pergunta: 'Explique a despesa empenhada',
  // Prosa longa de propósito: é o caso que motivou o teto de altura e a rolagem própria.
  resposta: 'A Receita Corrente Líquida (RCL) mede a arrecadação do ente. '.repeat(40),
  disponivel: true,
  ausencia: null,
  fatos: [],
  notas: [],
  fontes: [],
  source_refs: [],
  dados_incompletos: [],
  ferramentas: [],
  uso: { tokens_entrada: 10, tokens_saida: 20, latencia_ms: 1200, modelo: 'gemini-3.5-flash' },
  verificacao: null,
  gerado_em: '2026-08-18T10:00:00Z',
};

function montar() {
  return render(
    <div>
      {/* Espaço antes do gatilho: reproduz o gatilho no meio de uma página longa. */}
      <div style={{ height: 2000 }} />
      <ExplicacaoIA
        rotulo="Explique este número"
        titulo="Despesa empenhada · 2025-B6"
        descricao="Explique a despesa empenhada"
        contextKey="teste"
        carregar={() => Promise.resolve(RESPOSTA as never)}
      />
    </div>,
  );
}

describe('Painel de explicação da IA', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('abre ancorado (posição fixa própria), não no fluxo do topo da janela', async () => {
    montar();
    await userEvent.click(screen.getByRole('button', { name: /Explique este número/ }));

    const painel = await screen.findByRole('dialog');
    // Ancorado ⇒ o painel posiciona a si mesmo; sem âncora ele herdava a posição do
    // contêiner e ficava sempre no alto da janela.
    expect(painel.style.position).toBe('fixed');
    expect(painel.style.top).not.toBe('');
    expect(painel.style.left).not.toBe('');
  });

  it('o texto rola dentro do painel, com o botão Fechar sempre fora da rolagem', async () => {
    montar();
    await userEvent.click(screen.getByRole('button', { name: /Explique este número/ }));

    const painel = await screen.findByRole('dialog');
    const conteudo = painel.querySelector('[role="document"]') as HTMLElement;
    expect(conteudo).not.toBeNull();
    // A área de texto tem teto e rolagem próprios: numa resposta didática longa, o
    // cabeçalho não pode sair de vista junto com a prosa.
    expect(conteudo.style.overflowY).toBe('auto');
    expect(conteudo.style.maxHeight).not.toBe('');

    const fechar = screen.getByRole('button', { name: /Fechar/ });
    expect(conteudo.contains(fechar)).toBe(false);
  });

  it('fecha com Escape sem exigir que o gestor role até o botão', async () => {
    montar();
    await userEvent.click(screen.getByRole('button', { name: /Explique este número/ }));
    await screen.findByRole('dialog');

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
