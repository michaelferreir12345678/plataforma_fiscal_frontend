import { riskColor, type RiskLevel } from '../theme';

interface StatusBadgeProps {
  level: RiskLevel;
  label?: string;
  dot?: boolean;
}

/** Pílula de status com cor semântica de risco. */
export function StatusBadge({ level, label, dot = false }: StatusBadgeProps) {
  const r = riskColor[level];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 9.5,
        padding: '2px 8px',
        borderRadius: 3,
        fontWeight: 600,
        background: r.bg,
        color: r.color,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.color }} />}
      {label ?? r.label}
    </span>
  );
}
