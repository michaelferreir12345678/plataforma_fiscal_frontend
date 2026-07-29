import type { CSSProperties, ReactNode } from 'react';
import { colors } from '../theme';

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  pad?: number | false;
  accent?: string;
  className?: string;
}

/** Superfície branca padrão (borda + raio discreto). */
export function Card({ children, style, pad = 16, accent, className }: CardProps) {
  return (
    <div
      className={['ui-card', className].filter(Boolean).join(' ')}
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        ...(accent ? { borderTop: `3px solid ${accent}` } : {}),
        ...(pad !== false ? { padding: pad } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
