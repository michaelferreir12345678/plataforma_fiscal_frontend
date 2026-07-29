/**
 * A resposta do assistente chega em Markdown e precisa **chegar renderizada** ao gestor:
 * antes, `**Despesa com Pessoal:**` e `### 1. Indicadores` apareciam com os símbolos à
 * mostra. E o número calculado precisa dizer de qual fonte veio — um `title` genérico
 * ("Número rastreável até a fonte") não é rastreabilidade.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RespostaMarkdown } from '../components/RespostaMarkdown';
import type { AssistFato } from '../services/backend';

// Trecho real devolvido pelo gemini-3.5-flash para o ente estadual 23 em 2025-B6.
const RESPOSTA = `Com base exclusivamente nos dados fornecidos, apresentamos a análise.

---

### 1. Indicadores Calculados dos Dados do Ente

*   **Receita Corrente Líquida (RCL) acumulada em 12 meses:** R$ 39.618.216.873,59 *(Fonte: RREO, Anexo 03)*
*   **Despesa com Pessoal:** 40,92% da RCL

1. Primeiro passo
2. Segundo passo`;

const FATO_RCL: AssistFato = {
  codigo: 'rcl',
  rotulo: 'Receita Corrente Líquida (12 meses)',
  valor_formatado: 'R$ 39.618.216.873,59',
  valor: '39618216873.59',
  unidade: 'BRL',
  status: 'ok',
  faixa: null,
  disponivel: true,
  periodo: '2025-B6',
  as_of: null,
  source_ref: { relatorio: 'RREO', anexo: 'Anexo 03', periodo: '2025-B6', versao_entrega: '1' },
  memoria: {},
};

describe('RespostaMarkdown', () => {
  it('não deixa a sintaxe de Markdown vazar para a tela', () => {
    const { container } = render(<RespostaMarkdown texto={RESPOSTA} />);
    const texto = container.textContent ?? '';
    expect(texto).not.toContain('**');
    expect(texto).not.toContain('### ');
    expect(texto).toContain('Despesa com Pessoal:');
  });

  it('renderiza título, negrito e as duas formas de lista', () => {
    const { container } = render(<RespostaMarkdown texto={RESPOSTA} />);
    expect(screen.getByRole('heading', { name: /1\. Indicadores Calculados/ })).toBeInTheDocument();
    expect(container.querySelector('strong')?.textContent).toContain('Receita Corrente Líquida');
    expect(container.querySelectorAll('ul li')).toHaveLength(2);
    expect(container.querySelectorAll('ol li')).toHaveLength(2);
    expect(container.querySelector('hr')).toBeInTheDocument();
  });

  it('ancora o número calculado à sua fonte, alcançável por teclado', async () => {
    render(<RespostaMarkdown texto={RESPOSTA} fatos={[FATO_RCL]} />);
    const numero = screen.getByRole('button', { name: /R\$ 39\.618\.216\.873,59 — Receita Corrente/ });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    await userEvent.click(numero);

    const ficha = screen.getByRole('tooltip');
    expect(ficha).toHaveTextContent('Receita Corrente Líquida (12 meses)');
    // O que faltava: dizer QUAL fonte, com anexo, período e versão.
    expect(ficha).toHaveTextContent('RREO · Anexo 03 · 2025-B6 · v.1');
  });

  it('texto sem fato correspondente não vira âncora falsa', () => {
    render(<RespostaMarkdown texto={RESPOSTA} fatos={[]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
