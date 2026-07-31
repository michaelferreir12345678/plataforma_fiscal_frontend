/**
 * Erro que não é falha merece saída, não "tentar de novo".
 *
 * A CAPAG de um exercício em curso não existe porque o Tesouro publica uma vez por ano.
 * Oferecer "tentar de novo" convida o gestor a insistir contra uma parede; o botão certo
 * leva ao último período que **tem** o dado — e o período vem do campo de extensão do
 * Problem Details, não de leitura do texto da mensagem.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Async } from '../components/AsyncState';
import { AppProvider, useApp, type Resource } from '../context/AppContext';
import { ApiError } from '../services/api';

function recurso(erro: ApiError | null, mensagem: string): Resource<unknown> {
  return {
    data: null,
    loading: false,
    error: mensagem,
    apiError: erro,
    indisponivel: null,
    reload: vi.fn(),
  };
}

/** Espelha o período do contexto para provar que o clique realmente o trocou. */
function Sonda() {
  const { periodoRgf, periodo } = useApp();
  return (
    <>
      <span data-testid="rgf">{periodoRgf}</span>
      <span data-testid="rreo">{periodo}</span>
    </>
  );
}

const montar = (res: Resource<unknown>) =>
  render(
    <MemoryRouter>
      <AppProvider>
        <Async res={res}>{() => <div>conteúdo</div>}</Async>
        <Sonda />
      </AppProvider>
    </MemoryRouter>,
  );

describe('erro com saída', () => {
  it('oferece o período sugerido em vez de "tentar de novo"', async () => {
    const erro = new ApiError(404, 'CAPAG de 2026 ainda não publicada', 'A nota de 2026 não saiu.', {
      periodo_sugerido: '2025-Q3',
      rotulo_sugerido: 'Ir para 2025-Q3',
    });
    montar(recurso(erro, 'A nota de 2026 não saiu.'));

    expect(screen.getByRole('button', { name: 'Ir para 2025-Q3' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tentar carregar novamente/ })).not.toBeInTheDocument();
  });

  it('clicar troca o período do contexto — o quadrimestre vai para o seletor de RGF', async () => {
    const erro = new ApiError(404, 'CAPAG não publicada', 'sem nota', {
      periodo_sugerido: '2025-Q3',
    });
    montar(recurso(erro, 'sem nota'));

    await userEvent.click(screen.getByRole('button', { name: /Ir para 2025-Q3/ }));
    expect(screen.getByTestId('rgf')).toHaveTextContent('2025-Q3');
  });

  it('bimestre vai para o seletor de RREO, não para o de RGF', async () => {
    const erro = new ApiError(404, 'sem dado', 'sem dado', { periodo_sugerido: '2025-B4' });
    montar(recurso(erro, 'sem dado'));

    await userEvent.click(screen.getByRole('button', { name: /Ir para 2025-B4/ }));
    expect(screen.getByTestId('rreo')).toHaveTextContent('2025-B4');
  });

  it('mostra a explicação da cadência em linha própria', () => {
    const erro = new ApiError(404, 'RGF ausente', 'Sem RGF vigente para 2304400 em 2026-Q2.', {
      periodo_sugerido: '2025-Q3',
      explicacao: 'O RGF é quadrimestral (LRF, art. 63) e é publicado após o fim do período.',
    });
    montar(recurso(erro, 'Sem RGF vigente para 2304400 em 2026-Q2.'));

    expect(screen.getByText(/quadrimestral \(LRF, art\. 63\)/)).toBeInTheDocument();
    // Fato e motivo em nós distintos: emendados num parágrafo, o gestor lê o primeiro e para.
    expect(screen.getByText(/Sem RGF vigente para 2304400/).textContent).not.toMatch(
      /quadrimestral/,
    );
  });

  it('explicação sem alternativa ainda desmarca a falha, mas mantém "tentar de novo"', () => {
    const erro = new ApiError(404, 'RREO ausente', 'Sem RREO vigente.', {
      explicacao: 'O RREO é bimestral (LRF, art. 52).',
    });
    montar(recurso(erro, 'Sem RREO vigente.'));

    // Sem período para onde ir, repetir a consulta volta a ser razoável — a entrega pode ter
    // saído nesse meio-tempo. O que muda é o tom: ausência da fonte, não falha nossa.
    expect(screen.getByRole('button', { name: /Tentar carregar novamente/ })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('bimestral');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('erro sem saída conhecida mantém "tentar de novo"', () => {
    montar(recurso(null, 'backend indisponível'));
    expect(screen.getByRole('button', { name: /Tentar carregar novamente/ })).toBeInTheDocument();
  });

  it('ausência não é anunciada como alerta', () => {
    const erro = new ApiError(404, 'não publicada', 'ainda não saiu', {
      periodo_sugerido: '2025-Q3',
    });
    montar(recurso(erro, 'ainda não saiu'));
    // `status` (e não `alert`): o leitor de tela não deve interromper por um dado que a
    // fonte ainda não publicou.
    expect(screen.getByRole('status')).toHaveTextContent('ainda não saiu');
  });
});
