import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Key,
  type KeyboardEvent,
  type ReactNode,
  type UIEvent,
} from 'react';
import { flushSync } from 'react-dom';
import { colors, font, typeScale } from '../theme';

export interface VirtualColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T, index: number) => ReactNode;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
}

export interface VirtualizedTableProps<T> {
  rows: readonly T[];
  columns: readonly VirtualColumn<T>[];
  rowKey: (row: T, index: number) => Key;
  /** Nome acessível e legenda da tabela. */
  caption: string;
  height?: number;
  rowHeight?: number;
  overscan?: number;
  empty?: ReactNode;
  className?: string;
  getRowLabel?: (row: T, index: number) => string;
  onRowActivate?: (row: T, index: number) => void;
}

/**
 * Tabela sem dependências externas, virtualizada por altura fixa.
 *
 * Mantém `<table>`/`<th>`/`<td>` reais, anuncia a quantidade total de linhas e oferece
 * navegação por setas, Home/End e Page Up/Down. Antes de imprimir, materializa todas as
 * linhas para que o relatório fiscal não seja truncado ao viewport.
 */
export function VirtualizedTable<T>({
  rows,
  columns,
  rowKey,
  caption,
  height = 420,
  rowHeight = 42,
  overscan = 6,
  empty = 'Nenhum registro.',
  className,
  getRowLabel,
  onRowActivate,
}: VirtualizedTableProps<T>) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [printing, setPrinting] = useState(false);
  const id = useId().replace(/:/g, '');

  useEffect(() => {
    const beforePrint = () => flushSync(() => setPrinting(true));
    const afterPrint = () => setPrinting(false);
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, []);

  useEffect(() => {
    if (activeIndex >= rows.length) {
      const next = Math.max(rows.length - 1, 0);
      activeIndexRef.current = next;
      setActiveIndex(next);
    }
  }, [activeIndex, rows.length]);

  const windowed = useMemo(() => {
    if (printing) {
      return { start: 0, end: rows.length, top: 0, bottom: 0 };
    }
    const visibleCount = Math.ceil(height / rowHeight);
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const end = Math.min(rows.length, start + visibleCount + overscan * 2);
    return {
      start,
      end,
      top: start * rowHeight,
      bottom: Math.max(0, (rows.length - end) * rowHeight),
    };
  }, [height, overscan, printing, rowHeight, rows.length, scrollTop]);

  const visibleRows = rows.slice(windowed.start, windowed.end);

  const moveTo = useCallback(
    (next: number) => {
      if (rows.length === 0) return;
      const index = Math.max(0, Math.min(rows.length - 1, next));
      activeIndexRef.current = index;
      setActiveIndex(index);
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rowTop = index * rowHeight;
      const rowBottom = rowTop + rowHeight;
      let nextScroll = viewport.scrollTop;
      if (rowTop < viewport.scrollTop) nextScroll = rowTop;
      else if (rowBottom > viewport.scrollTop + height) nextScroll = rowBottom - height;
      if (nextScroll !== viewport.scrollTop) {
        viewport.scrollTop = nextScroll;
        setScrollTop(nextScroll);
      }
    },
    [height, rowHeight, rows.length],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    const page = Math.max(1, Math.floor(height / rowHeight) - 1);
    let next: number | null = null;
    if (event.key === 'ArrowDown') next = activeIndex + 1;
    else if (event.key === 'ArrowUp') next = activeIndex - 1;
    else if (event.key === 'PageDown') next = activeIndex + page;
    else if (event.key === 'PageUp') next = activeIndex - page;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = rows.length - 1;
    else if ((event.key === 'Enter' || event.key === ' ') && onRowActivate && rows[activeIndex]) {
      event.preventDefault();
      onRowActivate(rows[activeIndex], activeIndex);
      return;
    }
    if (next != null) {
      event.preventDefault();
      moveTo(next);
    }
  };

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const nextScrollTop = event.currentTarget.scrollTop;
    setScrollTop(nextScrollTop);
    const firstVisible = Math.min(
      Math.max(0, Math.floor(nextScrollTop / rowHeight)),
      Math.max(rows.length - 1, 0),
    );
    const lastVisible = Math.min(
      rows.length - 1,
      firstVisible + Math.max(1, Math.ceil(height / rowHeight)) - 1,
    );
    const current = activeIndexRef.current;
    if (rows.length > 0 && (current < firstVisible || current > lastVisible)) {
      activeIndexRef.current = firstVisible;
      setActiveIndex(firstVisible);
    }
  };

  const colgroup = columns.map((column) => (
    <col key={column.key} style={column.width ? { width: column.width } : undefined} />
  ));

  return (
    <div
      className={['virtualized-table', className].filter(Boolean).join(' ')}
      role="region"
      aria-label={caption}
      style={{ minWidth: 0 }}
    >
      <div
        ref={viewportRef}
        className="virtualized-table__viewport"
        onScroll={onScroll}
        style={{
          width: '100%',
          height: printing ? 'auto' : height,
          overflow: printing ? 'visible' : 'auto',
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
          background: colors.surface,
        }}
      >
        <table
          role="grid"
          aria-rowcount={rows.length + 1}
          aria-colcount={columns.length}
          aria-activedescendant={rows.length ? `virtual-row-${id}-${activeIndex}` : undefined}
          tabIndex={0}
          onKeyDown={onKeyDown}
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            fontSize: 12,
          }}
        >
          <caption className="sr-only">{caption}</caption>
          <colgroup>{colgroup}</colgroup>
          <thead>
            <tr aria-rowindex={1}>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={{
                    position: printing ? 'static' : 'sticky',
                    top: 0,
                    zIndex: 2,
                    padding: '8px 10px',
                    borderBottom: `1px solid ${colors.border}`,
                    background: colors.surfaceAlt,
                    color: colors.faint,
                    fontSize: typeScale.caption,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textAlign: column.align ?? 'left',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {windowed.top > 0 && (
              <tr aria-hidden="true" style={{ height: windowed.top }}>
                <td colSpan={columns.length} style={{ padding: 0, border: 0 }} />
              </tr>
            )}
            {visibleRows.map((row, localIndex) => {
              const index = windowed.start + localIndex;
              const active = index === activeIndex;
              return (
                <tr
                  id={`virtual-row-${id}-${index}`}
                  key={rowKey(row, index)}
                  aria-rowindex={index + 2}
                  aria-selected={active}
                  aria-label={getRowLabel?.(row, index)}
                  onClick={() => {
                    activeIndexRef.current = index;
                    setActiveIndex(index);
                  }}
                  onDoubleClick={() => onRowActivate?.(row, index)}
                  style={{
                    height: rowHeight,
                    background: active ? colors.accentSoft : colors.surface,
                    cursor: onRowActivate ? 'pointer' : 'default',
                  }}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      style={{
                        height: rowHeight,
                        padding: '7px 10px',
                        borderBottom: `1px solid ${colors.rowBorder}`,
                        color: colors.ink,
                        fontFamily: font.ui,
                        textAlign: column.align ?? 'left',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {column.render(row, index)}
                    </td>
                  ))}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={Math.max(columns.length, 1)}
                  style={{ padding: 20, color: colors.muted, textAlign: 'center' }}
                >
                  {empty}
                </td>
              </tr>
            )}
            {windowed.bottom > 0 && (
              <tr aria-hidden="true" style={{ height: windowed.bottom }}>
                <td colSpan={columns.length} style={{ padding: 0, border: 0 }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > 0 && !printing && (
        <div
          aria-live="polite"
          style={{
            marginTop: 5,
            color: colors.faint,
            fontFamily: font.mono,
            fontSize: typeScale.caption,
            textAlign: 'right',
          }}
        >
          {rows.length.toLocaleString('pt-BR')} linha(s) · use ↑/↓ para navegar
        </div>
      )}
    </div>
  );
}

/** Estilo de célula para consumidores que precisam compor conteúdo sem inline repetido. */
export const virtualCellTruncate: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};
