import { useId, useState, type Key, type ReactNode } from 'react';
import { colors, font, typeScale } from '../theme';

export interface AccessibleChartColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T, index: number) => ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface AccessibleChartProps<T> {
  label: string;
  /** Resumo textual que comunica tendência/conclusão sem depender da geometria. */
  description: ReactNode;
  chart: ReactNode;
  rows: readonly T[];
  columns: readonly AccessibleChartColumn<T>[];
  rowKey: (row: T, index: number) => Key;
  tableCaption?: string;
  initialView?: 'chart' | 'table';
  empty?: ReactNode;
}

/**
 * Moldura acessível para gráficos artesanais.
 *
 * Exige descrição textual e oferece a mesma informação numa tabela real. O desenho
 * recebido em `chart` deve ser puramente visual; a moldura fornece nome, descrição,
 * foco e troca de representação.
 */
export function AccessibleChart<T>({
  label,
  description,
  chart,
  rows,
  columns,
  rowKey,
  tableCaption,
  initialView = 'chart',
  empty = 'Não há pontos para exibir.',
}: AccessibleChartProps<T>) {
  const [view, setView] = useState<'chart' | 'table'>(initialView);
  const generatedId = useId().replace(/:/g, '');
  const titleId = `chart-title-${generatedId}`;
  const descriptionId = `chart-description-${generatedId}`;
  const panelId = `chart-panel-${generatedId}`;

  return (
    <figure
      className="accessible-chart"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      style={{ margin: 0, minWidth: 0 }}
    >
      <figcaption
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 8,
        }}
      >
        <div style={{ flex: '1 1 280px' }}>
          <div id={titleId} style={{ color: colors.ink, fontSize: 13, fontWeight: 600 }}>
            {label}
          </div>
          <div
            id={descriptionId}
            style={{ color: colors.muted, fontSize: typeScale.caption, lineHeight: 1.5, marginTop: 2 }}
          >
            {description}
          </div>
        </div>
        <div className="no-print" role="group" aria-label={`Representação de ${label}`} style={{ display: 'flex', gap: 4 }}>
          <ViewButton active={view === 'chart'} controls={panelId} onClick={() => setView('chart')}>
            Gráfico
          </ViewButton>
          <ViewButton active={view === 'table'} controls={panelId} onClick={() => setView('table')}>
            Tabela
          </ViewButton>
        </div>
      </figcaption>

      <div id={panelId}>
        {rows.length === 0 ? (
          <div role="status" style={{ padding: 12, color: colors.muted, fontSize: 12 }}>
            {empty}
          </div>
        ) : view === 'chart' ? (
          <div
            role="img"
            aria-label={label}
            aria-describedby={descriptionId}
            style={{ minWidth: 0 }}
          >
            {chart}
          </div>
        ) : (
          <ChartTable
            caption={tableCaption ?? `${label} — alternativa tabular`}
            rows={rows}
            columns={columns}
            rowKey={rowKey}
          />
        )}
      </div>
    </figure>
  );
}

function ViewButton({
  active,
  controls,
  onClick,
  children,
}: {
  active: boolean;
  controls: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-controls={controls}
      onClick={onClick}
      style={{
        minHeight: 30,
        border: `1px solid ${active ? colors.primary : colors.border}`,
        borderRadius: 4,
        padding: '4px 9px',
        background: active ? colors.accentSoft : colors.surface,
        color: active ? colors.primary : colors.ink,
        fontSize: typeScale.caption,
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

function ChartTable<T>({
  caption,
  rows,
  columns,
  rowKey,
}: {
  caption: string;
  rows: readonly T[];
  columns: readonly AccessibleChartColumn<T>[];
  rowKey: (row: T, index: number) => Key;
}) {
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <caption style={{ textAlign: 'left', padding: '4px 0 8px', color: colors.muted }}>
          {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={{
                  padding: '7px 8px',
                  borderBottom: `1px solid ${colors.border}`,
                  color: colors.faint,
                  fontFamily: font.ui,
                  fontSize: typeScale.caption,
                  letterSpacing: '0.04em',
                  textAlign: column.align ?? 'left',
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  style={{
                    padding: '7px 8px',
                    borderBottom: `1px solid ${colors.rowBorder}`,
                    textAlign: column.align ?? 'left',
                  }}
                >
                  {column.render(row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
