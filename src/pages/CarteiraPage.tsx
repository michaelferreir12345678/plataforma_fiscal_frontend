import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../theme';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Icon } from '../components/Icon';
import { classifyCeiling } from '../theme';
import { pct, fmt } from '../utils/format';
import { entes, carteiraResumo, buildHexes } from '../services/carteiraData';

const COLS = '1.7fr 0.7fr 0.7fr 0.7fr 0.7fr 0.7fr 0.7fr 0.8fr';

export function CarteiraPage() {
  const navigate = useNavigate();
  const { hexes, fortaleza } = useMemo(() => buildHexes(), []);

  const ranking = useMemo(
    () =>
      [...entes]
        .sort((a, b) => b.pessoal - a.pessoal)
        .slice(0, 5)
        .map((e, i) => ({ ...e, rank: String(i + 1).padStart(2, '0'), dist: 54 - e.pessoal })),
    [],
  );

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Carteira Estadual CE">
      {/* Header */}
      <Card style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }} pad={0}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 4, background: colors.primary, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>CE</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>Visão Estadual · Ceará</div>
            <div style={{ fontSize: 11, color: colors.muted, fontFamily: "'JetBrains Mono', monospace", display: 'flex', gap: 12 }}>
              <span>184 municípios + 1 estado</span>
              <span style={{ color: '#DAD6CA' }}>·</span>
              <span>RCL agregada R$ 47,2 bi</span>
              <span style={{ color: '#DAD6CA' }}>·</span>
              <span>cobertura SICONFI 99,5%</span>
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: colors.primary, color: colors.bg, borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
          <Icon size={13} stroke={colors.bg}>
            <path d="M8 2v8M5 7l3 3 3-3M3 13h10" />
          </Icon>
          Ações em lote
        </button>
      </Card>

      {/* Resumo chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {carteiraResumo.map((c) => (
          <Card key={c.label} pad={0} style={{ padding: '12px 14px', borderLeft: `3px solid ${c.accent}` }}>
            <div style={{ fontSize: 9.5, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{c.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 600 }}>{c.value}</div>
              <div style={{ fontSize: 10.5, color: colors.muted }}>{c.sub}</div>
            </div>
            <div style={{ fontSize: 10.5, color: c.footColor, marginTop: 2 }}>{c.foot}</div>
          </Card>
        ))}
      </div>

      {/* Mapa + Tabela */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 12 }}>
        {/* HEX MAP */}
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Risco por município</div>
            <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>cada hex = 1 ente · cor = pessoal</div>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0' }}>
            <svg viewBox="0 0 290 240" style={{ width: '100%', maxWidth: 320 }}>
              {hexes.map((h) => (
                <polygon key={h.id} points={h.points} fill={h.fill} stroke={h.stroke} strokeWidth={0.5} />
              ))}
              <circle cx={fortaleza.x} cy={fortaleza.y} r={11} fill="none" stroke={colors.primaryDeep} strokeWidth={1.5} />
              <line x1={fortaleza.x + 11} y1={fortaleza.y} x2={fortaleza.x + 24} y2={fortaleza.y - 6} stroke={colors.primaryDeep} strokeWidth={1} />
              <text x={fortaleza.x + 26} y={fortaleza.y - 8} fontSize={9} fontWeight={600} fill={colors.primaryDeep}>
                Fortaleza
              </text>
            </svg>
          </div>
          <div style={{ borderTop: `1px solid ${colors.borderSoft}`, paddingTop: 10 }}>
            <div style={{ fontSize: 9.5, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Legenda</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 10.5 }}>
              {[
                ['#9CD7B8', '#1F9D6B', 'Folga <48,6%'],
                ['#F2D886', '#E8B53A', 'Alerta'],
                ['#EFB287', '#E07A2F', 'Prudencial'],
                ['#E89999', '#D14343', 'Acima 54%'],
                ['#C0C7CE', '#5B6B7B', 'S/ MSC'],
              ].map(([f, s, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, background: f, border: `1px solid ${s}` }} />
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* TABELA */}
        <Card pad={0} style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ padding: '14px 16px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Grade de entes</div>
              <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>ordenado por pessoal · clique p/ drill-down</div>
            </div>
            <span style={{ fontSize: 10.5, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>20 de 184</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '6px 16px', background: colors.bg, borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`, fontSize: 9.5, fontWeight: 600, color: colors.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <div>Ente</div>
            <div style={{ textAlign: 'right' }}>População</div>
            <div style={{ textAlign: 'right', color: colors.orange }}>Pessoal ▾</div>
            <div style={{ textAlign: 'right' }}>DCL</div>
            <div style={{ textAlign: 'right' }}>Saúde</div>
            <div style={{ textAlign: 'right' }}>Educ.</div>
            <div style={{ textAlign: 'center' }}>MSC</div>
            <div style={{ textAlign: 'center' }}>Status</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {entes.map((e) => {
              const level = classifyCeiling(e.pessoal, 48.6, 51.3, 54);
              return (
                <button
                  key={e.name}
                  onClick={() => navigate('/dashboard')}
                  style={{ display: 'grid', gridTemplateColumns: COLS, padding: '7px 16px', borderBottom: `1px solid ${colors.rowBorder}`, fontSize: 12, width: '100%', textAlign: 'left', alignItems: 'center' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div style={{ width: 4, height: 18, background: colorOf(level), borderRadius: 2, flexShrink: 0 }} />
                    <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
                  </div>
                  <Mono>{e.pop}</Mono>
                  <Mono color={colorOf(level)} weight={500}>{pct(e.pessoal)}</Mono>
                  <Mono color={colors.muted}>{fmt(e.dcl, 1)}%</Mono>
                  <Mono color={colors.muted}>{pct(e.saude)}</Mono>
                  <Mono color={colors.muted}>{pct(e.educacao)}</Mono>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <span style={{ fontSize: 9.5, padding: '1px 6px', borderRadius: 2, fontWeight: 600, background: e.msc === 'OK' ? colors.greenBg : colors.orangeBg, color: e.msc === 'OK' ? colors.green : colors.orange }}>{e.msc}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <StatusBadge level={level} />
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Ranking */}
      <Card style={{ padding: '14px 16px' }} pad={0}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Ranking de risco · 5 entes mais próximos do teto de Pessoal</div>
            <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>classificação combinada · pessoal + MSC + recondução pendente</div>
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 11.5, fontWeight: 500 }}>
            Disparar alerta para 5 entes
            <Icon size={11} viewBox="0 0 12 12"><path d="M3 6h6M7 4l2 2-2 2" /></Icon>
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {ranking.map((r) => {
            const level = classifyCeiling(r.pessoal, 48.6, 51.3, 54);
            return (
              <div key={r.name} style={{ border: `1px solid ${colors.border}`, borderRadius: 4, padding: '10px 12px', borderTop: `3px solid ${colorOf(level)}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: colors.faint, letterSpacing: '0.06em' }}>#{r.rank}</div>
                  <StatusBadge level={level} />
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600, color: colorOf(level), letterSpacing: '-0.02em' }}>{pct(r.pessoal)}</div>
                  <div style={{ fontSize: 10.5, color: colors.muted }}>de 54%</div>
                </div>
                <div style={{ marginTop: 6, height: 4, background: colors.borderSoft, borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(95, (r.pessoal / 54) * 100)}%`, background: colorOf(level) }} />
                </div>
                <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 8, fontFamily: "'JetBrains Mono', monospace" }}>
                  {r.dist >= 0 ? `+${fmt(r.dist, 2)}` : fmt(r.dist, 2)} p.p. até o teto
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function colorOf(level: ReturnType<typeof classifyCeiling>) {
  return { folga: colors.green, atencao: colors.yellowText, prudencial: colors.orange, maximo: colors.red, neutro: colors.neutral }[level];
}

function Mono({ children, color = colors.ink, weight = 400 }: { children: React.ReactNode; color?: string; weight?: number }) {
  return <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, textAlign: 'right', color, fontWeight: weight }}>{children}</div>;
}
