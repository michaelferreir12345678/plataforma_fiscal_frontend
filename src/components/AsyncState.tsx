/** Blocos padrão de carregamento / erro para telas ligadas ao backend. */
import type { ReactNode } from 'react';
import { colors, font } from '../theme';
import type { Resource } from '../context/AppContext';

export function Loading({ label = 'Carregando dados reais…' }: { label?: string }) {
  return (
    <div style={box}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors.primary, animation: 'pulse-soft 1.2s ease-in-out infinite' }} />
      <span style={{ fontSize: 12, color: colors.muted }}>{label}</span>
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{ ...box, borderColor: '#E89999', background: colors.redBg }}>
      <span style={{ fontSize: 12, color: colors.red, fontFamily: font.mono }}>⚠ {message}</span>
    </div>
  );
}

/** Renderiza `children(data)` só quando o recurso carregou; senão loading/erro. */
export function Async<T>({ res, children }: { res: Resource<T>; children: (data: T) => ReactNode }) {
  if (res.loading && !res.data) return <Loading />;
  if (res.error) return <ErrorBox message={res.error} />;
  if (!res.data) return <Loading />;
  return <>{children(res.data)}</>;
}

const box = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '18px 16px',
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  background: colors.surface,
};
