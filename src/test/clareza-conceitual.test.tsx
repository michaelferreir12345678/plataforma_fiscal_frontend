/**
 * Clareza conceitual: os rótulos que faziam o gestor concluir o oposto do dado.
 *
 * Não são questões de estilo. Cada caso aqui produzia uma leitura errada e verificável:
 * uma participação de 21% exibida como 34%, um cumprimento de mínimo anunciado como
 * ruptura de teto, um subtotal apresentado como o caixa do ente, e duas medidas
 * incompatíveis sob o mesmo cabeçalho com a mesma cor de risco.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { ArvoreDrill } from '../components/ArvoreDrill';
import type { DrillEnvelope } from '../services/backend';
import { SeloQualidadePagina } from '../components/SeloQualidade';
import { rotuloFaixa, rotuloModelo, rotuloUnidade } from '../utils/rotulos';

const COLUNAS = [{ chave: 'valor', rotulo: 'Valor', barra: true }];

function envelope(children: { codigo: string; valor: number }[], agregado?: number): DrillEnvelope {
  return {
    node: { codigo: 'raiz', descricao: 'Raiz', nivel: 1 },
    breadcrumb: [],
    children: children.map((c) => ({
      codigo: c.codigo,
      descricao: c.codigo,
      nivel: 2,
      has_children: false,
      measures: { valor: c.valor },
    })),
    measures: agregado === undefined ? {} : { valor: agregado },
    period: '2025-B6',
    source_ref: { relatorio: 'RREO', anexo: 'Anexo 01', periodo: '2025-B6', versao_entrega: '1' },
  } as unknown as DrillEnvelope;
}

function montar(env: DrillEnvelope) {
  return render(
    <MemoryRouter>
      <AppProvider>
        <ArvoreDrill carregar={() => Promise.resolve(env)} deps={['x']} colunas={COLUNAS} />
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('participação na árvore de drill', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('usa o agregado do nó como denominador, não a soma dos filhos', async () => {
    // Agregado 1000; filhos 300 e 200 (o nó tem mais do que os filhos abertos mostram).
    // Pela soma dos filhos, 300 seria 60%. Pelo agregado — o correto — é 30%.
    montar(envelope([{ codigo: 'a', valor: 300 }, { codigo: 'b', valor: 200 }], 1000));
    const linha = (await screen.findByText('a')).closest('tr')!;
    expect(within(linha).getByText('30.0%')).toBeInTheDocument();
  });

  it('omite a participação quando há valores negativos no nível', async () => {
    // Na árvore de Caixa a disponibilidade negativa é rotina. Com os negativos zerados por
    // clamp, as participações somavam mais de 100% e cada fonte superavitária aparecia
    // inflada — 21% do total exibido como 34%.
    montar(envelope([{ codigo: 'a', valor: 300 }, { codigo: 'b', valor: -100 }], 200));
    const linha = (await screen.findByText('a')).closest('tr')!;
    expect(within(linha).getByText('—')).toBeInTheDocument();
    expect(within(linha).queryByText(/%$/)).not.toBeInTheDocument();
  });

  it('o cabeçalho diz sobre o que é a participação', async () => {
    montar(envelope([{ codigo: 'a', valor: 100 }], 100));
    // "%" sozinho deixava por conta da adivinhação se era do nível ou da página.
    expect(await screen.findByRole('columnheader', { name: /% do nível/ })).toBeInTheDocument();
  });

  it('sem agregado publicado, cai na soma dos filhos', async () => {
    // Nem toda hierarquia publica o agregado do nó; aí a soma é a melhor aproximação.
    montar(envelope([{ codigo: 'a', valor: 300 }, { codigo: 'b', valor: 100 }]));
    const linha = (await screen.findByText('a')).closest('tr')!;
    expect(within(linha).getByText('75.0%')).toBeInTheDocument();
  });
});

describe('vocabulário: o que a tela escreve é o que o gestor lê', () => {
  it('o modelo de projeção diz o que assume, não o nome do autor', () => {
    // "holt_winters" é o nome do método na literatura. O gestor decide se a projeção
    // serve pela premissa dela, não pelo sobrenome de quem a publicou em 1960.
    expect(rotuloModelo('holt_winters')).toBe('Tendência com sazonalidade');
    expect(rotuloModelo('regressao_exogenas')).toBe('Regressão com variáveis externas');
    expect(rotuloModelo('fechamento')).toBe('Fechamento do exercício');
  });

  it('slug desconhecido vira frase legível em vez de vazar snake_case', () => {
    // Um modelo novo no backend não pode aparecer como `media_movel_ponderada` na tela.
    expect(rotuloModelo('media_movel')).not.toMatch(/_/);
    expect(rotuloModelo(null)).toBe('—');
  });

  it('a faixa diz o patamar, e o piso não é lido como teto', () => {
    expect(rotuloFaixa('prudencial')).toMatch(/95% do teto/);
    expect(rotuloFaixa('adequado')).toBe('Cumpre o mínimo');
    expect(rotuloFaixa('insuficiente')).toBe('Abaixo do mínimo');
  });

  it('a unidade não aparece como PCT_RCL', () => {
    expect(rotuloUnidade('PCT_RCL')).not.toMatch(/_/);
    expect(rotuloUnidade('PCT_RCL')).toMatch(/RCL/);
  });
});

describe('selo de qualidade', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('quando a verificação falha, diz que falhou — não finge conformidade', async () => {
    // `if (!res.data) return null` fazia erro de rede e "nenhuma divergência" produzirem
    // a mesma tela: nada. Quem não conseguiu verificar precisa saber que não verificou.
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('rede fora'));
    render(
      <MemoryRouter>
        <AppProvider>
          <SeloQualidadePagina />
        </AppProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/não foi possível verificar a qualidade/i)).toBeInTheDocument();
  });
});
