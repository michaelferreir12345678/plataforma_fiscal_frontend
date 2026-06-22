import type { ReactNode } from 'react';
import { colors } from '../theme';

/** Rótulo de seção em caixa-alta + divisória + nota opcional à direita. */
export function SectionLabel({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
      <div
        style={{
          fontSize: 10,
          color: colors.faint,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}
      >
        {children}
      </div>
      <div style={{ height: 1, flex: 1, background: colors.border }} />
      {note && <div style={{ fontSize: 10.5, color: colors.muted }}>{note}</div>}
    </div>
  );
}
