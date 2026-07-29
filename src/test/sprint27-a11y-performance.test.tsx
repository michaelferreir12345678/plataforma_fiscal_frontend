import { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AccessibleTabs, tabPanelId, tabId } from '../components/AccessibleTabs';
import { ArvoreDrill } from '../components/ArvoreDrill';
import { Async } from '../components/AsyncState';
import { MemoriaDialog } from '../components/MemoriaDialog';
import { VirtualizedTable } from '../components/VirtualizedTable';
import { useResource } from '../context/AppContext';
import type { DrillEnvelope } from '../services/backend';
import { colors } from '../theme';

function relativeLuminance(hex: string): number {
  const [red, green, blue] = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.03928
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function TabsHarness() {
  const [selected, setSelected] = useState<'resumo' | 'detalhe' | 'fonte'>('resumo');
  const tabs = [
    { id: 'resumo' as const, label: 'Resumo' },
    { id: 'detalhe' as const, label: 'Detalhe' },
    { id: 'fonte' as const, label: 'Fonte' },
  ];

  return (
    <>
      <AccessibleTabs
        tabs={tabs}
        value={selected}
        onChange={setSelected}
        label="Visões do indicador"
        idPrefix="indicador"
      />
      <section
        id={tabPanelId('indicador', selected)}
        role="tabpanel"
        aria-labelledby={tabId('indicador', selected)}
      >
        Conteúdo de {selected}
      </section>
    </>
  );
}

describe('Sprint 27 — teclado e desempenho dos componentes transversais', () => {
  it('mantém contraste AA nos tokens usados como texto informativo', () => {
    const textOnSurfaces = [
      colors.ink,
      colors.muted,
      colors.faint,
      colors.primary,
      colors.green,
      colors.yellowText,
      colors.orange,
      colors.red,
      colors.neutral,
    ];
    for (const foreground of textOnSurfaces) {
      expect(contrast(foreground, colors.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(foreground, colors.surface)).toBeGreaterThanOrEqual(4.5);
    }

    for (const [foreground, background] of [
      [colors.green, colors.greenBg],
      [colors.yellowText, colors.yellowBg],
      [colors.orange, colors.orangeBg],
      [colors.red, colors.redBg],
      [colors.neutral, colors.neutralBg],
    ]) {
      expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  /**
   * O teste acima só aferia `bg` e `surface`, e foi por aí que 24 violações reais
   * escaparam: o texto secundário também assenta na linha selecionada (`accentSoft`)
   * e na caixa de aviso (`yellowSoft`). Um token só está aprovado contra os fundos
   * em que de fato aparece.
   */
  it('mantém contraste AA também nos fundos de destaque, não só nas superfícies', () => {
    expect(contrast(colors.faint, colors.accentSoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.muted, colors.accentSoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.muted, colors.yellowSoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.ink, colors.accentSoft)).toBeGreaterThanOrEqual(4.5);
  });

  /**
   * `serieA` é cor de **marca gráfica**: 3:1 basta (WCAG SC 1.4.11) e ela reprova
   * como texto. São critérios distintos e o par de tokens existe para isso —
   * traço em `serieA`, rótulo em `serieAInk`.
   */
  it('separa a cor de série da tinta de texto da série', () => {
    expect(contrast(colors.serieA, colors.surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(colors.serieA, colors.surface)).toBeLessThan(4.5);

    for (const fundo of [colors.surface, colors.bg, colors.surfaceAlt, colors.accentSoft]) {
      expect(contrast(colors.serieAInk, fundo)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('virtualiza 184 entes, preserva a contagem semântica e ativa uma linha pelo teclado', async () => {
    const rows = Array.from({ length: 184 }, (_, index) => ({
      id: index + 1,
      nome: `Ente ${index + 1}`,
    }));
    const onActivate = vi.fn();

    const { container } = render(
      <VirtualizedTable
        rows={rows}
        columns={[
          { key: 'id', header: '#', width: 70, render: (row) => row.id },
          { key: 'nome', header: 'Ente', render: (row) => row.nome },
        ]}
        rowKey={(row) => row.id}
        caption="Ranking municipal com 184 entes"
        height={220}
        rowHeight={44}
        onRowActivate={onActivate}
      />,
    );

    const grid = screen.getByRole('grid', { name: 'Ranking municipal com 184 entes' });
    expect(grid).toHaveAttribute('aria-rowcount', '185');
    expect(container.querySelectorAll('tbody tr').length).toBeLessThan(40);

    fireEvent.keyDown(grid, { key: 'End' });
    await waitFor(() =>
      expect(within(grid).getByRole('row', { name: /Ente 184/ })).toHaveAttribute(
        'aria-rowindex',
        '185',
      ),
    );

    fireEvent.keyDown(grid, { key: 'Enter' });
    expect(onActivate).toHaveBeenCalledWith(rows[183], 183);
    expect(container.querySelectorAll('tbody tr').length).toBeLessThan(40);
  });

  it('move seleção e foco das abas com setas, Home e End', async () => {
    const user = userEvent.setup();
    render(<TabsHarness />);

    const resumo = screen.getByRole('tab', { name: 'Resumo' });
    const detalhe = screen.getByRole('tab', { name: 'Detalhe' });
    const fonte = screen.getByRole('tab', { name: 'Fonte' });

    resumo.focus();
    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(detalhe).toHaveFocus());
    expect(detalhe).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{End}');
    await waitFor(() => expect(fonte).toHaveFocus());
    expect(fonte).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Home}');
    await waitFor(() => expect(resumo).toHaveFocus());
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Conteúdo de resumo');
  });

  it('mantém o foco dentro do diálogo, fecha com Escape e o devolve ao gatilho', async () => {
    const user = userEvent.setup();
    render(
      <MemoriaDialog
        titulo="Memória da RCL"
        carregar={() => Promise.resolve({ formula: 'receita - deduções' })}
        deps={[]}
      >
        {(data) => (
          <>
            <p>{data.formula}</p>
            <button type="button">Copiar fórmula</button>
          </>
        )}
      </MemoriaDialog>,
    );

    const trigger = screen.getByRole('button', { name: /memória de cálculo/i });
    await user.click(trigger);

    const dialog = await screen.findByRole('dialog', { name: 'Memória da RCL' });
    const close = within(dialog).getByRole('button', { name: /fechar diálogo/i });
    const last = await within(dialog).findByRole('button', { name: 'Copiar fórmula' });
    await waitFor(() => expect(close).toHaveFocus());

    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(last).toHaveFocus();
    await user.keyboard('{Tab}');
    expect(close).toHaveFocus();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('executa drill-down por Enter e mantém breadcrumb navegável', async () => {
    const root: DrillEnvelope = {
      node: null,
      breadcrumb: [],
      children: [
        {
          codigo: '1',
          descricao: 'Receitas correntes',
          nivel: 1,
          measures: { arrecadado: 100 },
          has_children: true,
        },
      ],
      measures: { arrecadado: 100 },
    };
    const child: DrillEnvelope = {
      node: { codigo: '1', descricao: 'Receitas correntes', nivel: 1 },
      breadcrumb: [],
      children: [
        {
          codigo: '1.1',
          descricao: 'Receita tributária',
          nivel: 2,
          measures: { arrecadado: 100 },
          has_children: false,
        },
      ],
      measures: { arrecadado: 100 },
    };
    const carregar = vi.fn((node: string | null) =>
      Promise.resolve(node === '1' ? child : root),
    );
    const user = userEvent.setup();

    render(
      <ArvoreDrill
        carregar={carregar}
        deps={['2304400', '2024-B6']}
        colunas={[{ chave: 'arrecadado', rotulo: 'Arrecadado', barra: true }]}
      />,
    );

    const drill = await screen.findByRole('button', { name: /Receitas correntes/ });
    drill.focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByText('Receita tributária')).toBeInTheDocument();
    expect(carregar).toHaveBeenLastCalledWith('1');
    expect(screen.getByRole('navigation', { name: 'Caminho da hierarquia' })).toBeInTheDocument();
  });

  /**
   * A /caixa girava um esqueleto para sempre quando o ente não tinha período de RGF:
   * `pular` mantinha `loading` ligado sem chamada nenhuma para resolvê-lo. Bloco que
   * espera eternamente promete um dado que não existe — e ainda prendia a auditoria
   * axe, que aguarda `aria-busy` zerar.
   */
  it('espera enquanto o contexto resolve, mas declara a ausência quando ela é definitiva', async () => {
    const buscar = vi.fn(() => Promise.resolve('valor'));

    function Bloco({ contextoPronto }: { contextoPronto: boolean }) {
      const res = useResource(buscar, ['x'], {
        pular: true,
        indisponivel: contextoPronto ? <p>Sem período de RGF para este ente</p> : undefined,
      });
      return <Async res={res}>{(d) => <span>{d}</span>}</Async>;
    }

    const { rerender } = render(<Bloco contextoPronto={false} />);
    expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-busy', 'true');

    rerender(<Bloco contextoPronto />);
    expect(await screen.findByText('Sem período de RGF para este ente')).toBeInTheDocument();
    expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    expect(document.querySelectorAll('[aria-busy="true"]')).toHaveLength(0);
    expect(buscar).not.toHaveBeenCalled();
  });
});
