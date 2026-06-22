import { colors } from '../theme';
import { Card } from './Card';
import { Sparkline } from './Sparkline';
import type { Kpi } from '../types';

/** Cartão de KPI: rótulo, valor mono grande, variação e sparkline. */
export function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <Card pad={14}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div
          style={{
            fontSize: 10,
            color: colors.faint,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          {kpi.label}
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10.5,
            fontWeight: 500,
            color: kpi.deltaColor,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <span>{kpi.deltaArrow}</span>
          {kpi.delta}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: '-0.02em',
          }}
        >
          {kpi.value}
        </div>
        <div style={{ fontSize: 11, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>
          {kpi.unit}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginTop: 6,
          gap: 12,
        }}
      >
        <div style={{ fontSize: 10.5, color: colors.muted, lineHeight: 1.35 }}>{kpi.subtitle}</div>
        <Sparkline values={kpi.spark} color={kpi.deltaColor} />
      </div>
    </Card>
  );
}
