import { useNavigate } from 'react-router-dom';
import { colors, riskColor } from '../theme';
import { Card } from '../components/Card';
import { SectionLabel } from '../components/SectionLabel';
import { StatusBadge } from '../components/StatusBadge';
import { KpiCard } from '../components/KpiCard';
import { Icon } from '../components/Icon';
import { arcPath, pointAt, pct, fmt } from '../utils/format';
import {
  ente,
  semaforo,
  kpis,
  destaques,
  pessoalHist,
  pessoalProj,
  pessoalMeses,
} from '../services/dashboardData';
import type { SemaforoItem } from '../types';

/** Mini-medidor circular (270°) usado nos cartões do semáforo. */
function MiniGauge({ item }: { item: SemaforoItem }) {
  const cx = 38;
  const cy = 38;
  const r = 30;
  const start = -135;
  const sweep = 270;
  const ratio = Math.min(item.value / item.gaugeMax, 1);
  const valEnd = start + sweep * ratio;
  const color = riskColor[item.status].color;
  const alertaDeg = start + sweep * (item.alerta / item.gaugeMax);
  const prudDeg = start + sweep * (item.prud / item.gaugeMax);
  const tA1 = pointAt(cx, cy, r - 6, alertaDeg);
  const tA2 = pointAt(cx, cy, r + 4, alertaDeg);
  const tP1 = pointAt(cx, cy, r - 6, prudDeg);
  const tP2 = pointAt(cx, cy, r + 4, prudDeg);
  return (
    <div style={{ position: 'relative', width: 76, height: 76 }}>
      <svg width={76} height={76} viewBox="0 0 76 76">
        <path d={arcPath(cx, cy, r, start, start + sweep)} stroke={colors.borderSoft} strokeWidth={6} fill="none" strokeLinecap="round" />
        <path d={arcPath(cx, cy, r, start, valEnd)} stroke={color} strokeWidth={6} fill="none" strokeLinecap="round" />
        <line x1={tA1.x} y1={tA1.y} x2={tA2.x} y2={tA2.y} stroke={colors.muted} strokeWidth={1} />
        <line x1={tP1.x} y1={tP1.y} x2={tP2.x} y2={tP2.y} stroke={colors.muted} strokeWidth={1} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' }}>
          {fmt(item.value, item.value % 1 === 0 ? 0 : 1)}%
        </div>
        <div style={{ fontSize: 8, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase' }}>% RCL</div>
      </div>
    </div>
  );
}

/** Gráfico de trajetória de pessoal (histórico sólido + projeção + cone). */
function TrajectoryChart() {
  const padL = 40;
  const padR = 16;
  const padT = 20;
  const padB = 28;
  const W = 720;
  const H = 260;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const yMin = 48;
  const yMax = 56;
  const all = [...pessoalHist, ...pessoalProj];
  const n = all.length;
  const xOf = (i: number) => padL + (plotW * i) / (n - 1);
  const yOf = (v: number) => padT + plotH * (1 - (v - yMin) / (yMax - yMin));
  const histPts = pessoalHist.map((v, i) => ({ x: xOf(i), y: yOf(v) }));
  const projPts = pessoalProj.map((v, i) => ({ x: xOf(pessoalHist.length + i), y: yOf(v) }));
  const last = histPts[histPts.length - 1];
  const projLine = [last, ...projPts].map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const coneHi = projPts.map((p, i) => ({ x: p.x, y: yOf(pessoalProj[i] + 0.4) }));
  const coneLo = projPts.map((p, i) => ({ x: p.x, y: yOf(pessoalProj[i] - 0.4) }));
  const cone = `M ${last.x} ${last.y} ${coneHi.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')} ${coneLo
    .reverse()
    .map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')} Z`;

  return (
    <svg viewBox="0 0 720 260" style={{ width: '100%', height: 260, display: 'block' }}>
      {[20, 68, 116, 164, 212].map((y) => (
        <line key={y} x1={40} y1={y} x2={710} y2={y} stroke={colors.borderSoft} strokeWidth={1} />
      ))}
      {['56%', '54%', '52%', '50%', '48%'].map((t, i) => (
        <text key={t} x={34} y={23 + i * 48} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize={9.5} fill={colors.faint}>
          {t}
        </text>
      ))}
      <line x1={40} y1={68} x2={710} y2={68} stroke={colors.red} strokeWidth={1} strokeDasharray="4 3" />
      <text x={708} y={64} fontSize={9} fill={colors.red} textAnchor="end" fontWeight={600}>
        MÁXIMO · 54,00%
      </text>
      <line x1={40} y1={100} x2={710} y2={100} stroke={colors.orange} strokeWidth={1} strokeDasharray="4 3" />
      <text x={708} y={96} fontSize={9} fill={colors.orange} textAnchor="end" fontWeight={600}>
        PRUDENCIAL · 51,30%
      </text>
      <line x1={40} y1={164} x2={710} y2={164} stroke={colors.yellow} strokeWidth={1} strokeDasharray="4 3" />
      <text x={708} y={160} fontSize={9} fill={colors.yellowText} textAnchor="end" fontWeight={600}>
        ALERTA · 48,60%
      </text>
      <path d={cone} fill={colors.primary} fillOpacity={0.08} />
      <line x1={xOf(11.5)} y1={20} x2={xOf(11.5)} y2={240} stroke="#DAD6CA" strokeWidth={1} strokeDasharray="2 3" />
      <text x={xOf(11.5)} y={14} fontSize={9} fontWeight={600} fill={colors.faint} textAnchor="middle">
        PROJEÇÃO →
      </text>
      <polyline points={histPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} stroke={colors.primary} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={projLine} stroke={colors.primary} strokeWidth={1.6} fill="none" strokeDasharray="3 3" strokeLinecap="round" />
      {histPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#fff" stroke={colors.primary} strokeWidth={1.5} />
      ))}
      <circle cx={last.x} cy={last.y} r={4} fill={colors.primary} />
      <g transform={`translate(${last.x}, ${last.y})`}>
        <rect x={-32} y={-22} width={64} height={20} rx={3} fill={colors.primaryDeep} />
        <text x={0} y={-8} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize={10.5} fontWeight={600} fill={colors.bg}>
          52,82%
        </text>
      </g>
      {pessoalMeses.map((m, i) => (
        <text key={i} x={xOf(i)} y={252} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize={9} fill={colors.faint}>
          {m}
        </text>
      ))}
    </svg>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Dashboard Executivo">
      {/* Identificação */}
      <Card pad={0} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 4, background: colors.primaryGrad, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>
            {ente.sigla}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>{ente.nome}</div>
            <div style={{ fontSize: 11, color: colors.muted, fontFamily: "'JetBrains Mono', monospace", display: 'flex', gap: 12 }}>
              <span>CNPJ {ente.cnpj}</span>
              <span style={{ color: '#DAD6CA' }}>·</span>
              <span>Pop. {ente.pop}</span>
              <span style={{ color: '#DAD6CA' }}>·</span>
              <span>RCL12M {ente.rcl12m}</span>
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: colors.primary, color: colors.bg, borderRadius: 4, fontSize: 12, fontWeight: 500 }}
        >
          <Icon size={13} stroke={colors.bg}>
            <path d="M3 8l3 3 7-7" />
          </Icon>
          Exportar relatório
        </button>
      </Card>

      {/* Semáforo */}
      <div>
        <SectionLabel note="posição vs. teto legal · LRF/LC 101">Semáforo de limites</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {semaforo.map((s) => {
            const rc = riskColor[s.status];
            return (
              <Card key={s.label} pad={14} accent={rc.color} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 10, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</div>
                    <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>{s.subLabel}</div>
                  </div>
                  <StatusBadge level={s.status} label={s.statusLabel} dot />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                  <MiniGauge item={s} />
                  <div style={{ flex: 1, fontSize: 10.5, color: colors.muted, lineHeight: 1.4 }}>
                    <Row k="Alerta" v={`${fmt(s.alerta, s.alerta % 1 === 0 ? 0 : 1)}%`} />
                    <Row k="Prudencial" v={s.alerta === s.prud ? '—' : `${fmt(s.prud, s.prud % 1 === 0 ? 0 : 1)}%`} />
                    <Row k={s.topLabel} v={s.topValue} last />
                  </div>
                </div>
                <div style={{ fontSize: 10.5, color: colors.muted, paddingTop: 8, borderTop: `1px solid ${colors.borderSoft}`, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{s.detail}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: s.deltaColor }}>{s.delta}</span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* KPIs */}
      <div>
        <SectionLabel note="comparativo vs. 2024 mesmo período">Período · 2025 acumulado</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {kpis.map((k) => (
            <KpiCard key={k.label} kpi={k} />
          ))}
        </div>
      </div>

      {/* Chart + Riscos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 12 }}>
        <Card pad={0} style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Trajetória fiscal · 12m + projeção</div>
              <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>Despesa de Pessoal (% RCL) · linha legal e cone de projeção 95%</div>
            </div>
          </div>
          <TrajectoryChart />
        </Card>

        <Card pad={0} style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon size={14} stroke={colors.primary}>
                <path d="M8 2l1.5 4.5L14 8l-4.5 1.5L8 14l-1.5-4.5L2 8l4.5-1.5z" />
              </Icon>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Destaques e riscos</div>
            </div>
            <div style={{ fontSize: 9, padding: '2px 6px', background: 'linear-gradient(135deg, #E07A2F, #D14343)', color: '#fff', borderRadius: 2, fontWeight: 600, letterSpacing: '0.05em' }}>IA · GERADO</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
            {destaques.map((d, i) => {
              const rc = riskColor[d.level];
              return (
                <div key={i} style={{ display: 'flex', gap: 10, padding: 10, background: rc.bg, borderLeft: `2px solid ${rc.color}`, borderRadius: 3 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, color: rc.color, flexShrink: 0 }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.45 }}>{d.text}</div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => navigate('/limites')}
            style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8, border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 11.5, fontWeight: 500, color: colors.primary }}
          >
            Abrir Monitor de Limites
            <Icon size={11} viewBox="0 0 12 12">
              <path d="M3 6h6M7 4l2 2-2 2" />
            </Icon>
          </button>
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: last ? 'none' : `1px dashed ${colors.border}` }}>
      <span>{k}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: colors.ink }}>{v}</span>
    </div>
  );
}
