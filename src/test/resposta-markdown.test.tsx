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

  // Sprint B3: antes, a âncora só pegava quando o texto repetia `valor_formatado`
  // caractere a caractere — uma paráfrase do Gemini (arredondar, tirar separador de
  // milhar) perdia o link de fonte silenciosamente.
  it('casa um número parafraseado (arredondado, sem repetir valor_formatado) por proximidade numérica', async () => {
    const texto =
      'A Receita Corrente Líquida soma aproximadamente R$ 39.618.216.874 no período, dentro do esperado.';
    render(<RespostaMarkdown texto={texto} fatos={[FATO_RCL]} />);

    // A âncora envolve só o token numérico — o "R$" permanece como texto comum antes dele,
    // igual ao que já acontecia com o casamento exato de `valor_formatado`.
    const numero = screen.getByRole('button', {
      name: /39\.618\.216\.874 — Receita Corrente/,
    });
    await userEvent.click(numero);

    // O link continua apontando para a MESMA fonte do fato original, mesmo com o texto
    // do Gemini tendo arredondado os centavos (873,59 → 874).
    const ficha = screen.getByRole('tooltip');
    expect(ficha).toHaveTextContent('Receita Corrente Líquida (12 meses)');
    expect(ficha).toHaveTextContent('RREO · Anexo 03 · 2025-B6 · v.1');
  });

  it('casa um percentual parafraseado com uma casa decimal a menos', async () => {
    const fatoPessoal: AssistFato = {
      codigo: 'pessoal_executivo',
      rotulo: 'Despesa com Pessoal (Executivo)',
      valor_formatado: '40,92%',
      valor: '40.916',
      unidade: 'PCT',
      status: 'ok',
      faixa: 'atencao',
      disponivel: true,
      periodo: '2025-B6',
      as_of: null,
      source_ref: { relatorio: 'RGF', anexo: 'Anexo 01', periodo: '2025-Q2', versao_entrega: '1' },
      memoria: {},
    };
    render(
      <RespostaMarkdown
        texto="A despesa com pessoal do Executivo está em 40,9% da RCL."
        fatos={[fatoPessoal]}
      />,
    );
    expect(
      screen.getByRole('button', { name: /40,9% — Despesa com Pessoal/ }),
    ).toBeInTheDocument();
  });

  it('não cria âncora para um número solto que não corresponde a nenhum fato (sem falso positivo)', () => {
    // "6" (bimestre) e "2025" (ano) não têm vírgula decimal, separador de milhar nem "%" —
    // não são o tipo de token que um fato representa, e não devem virar link de fonte.
    render(
      <RespostaMarkdown
        texto="Isso vale para o 6º bimestre de 2025, conforme o art. 42 da LRF."
        fatos={[FATO_RCL]}
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
