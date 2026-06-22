import { useState } from 'react';
import { colors } from '../theme';
import { Card } from '../components/Card';
import { SectionLabel } from '../components/SectionLabel';
import { pct } from '../utils/format';

const indicadores = [
  { key: 'pessoal', label: 'Pessoal' },
  { key: 'rcl', label: 'RCL' },
  { key: 'divida', label: 'Dívida' },
  { key: 'resultado', label: 'Resultado' },
];

export function PrevisoesPage() {
  const [indicador, setIndicador] = useState('pessoal');
  const [reajuste, setReajuste] = useState(0);
  const [contratacao, setContratacao] = useState(0);
  const [fpm, setFpm] = useState(0);

  // efeito combinado dos controles no fechamento projetado (p.p.)
  const baseFechamento = 53.25;
  const efeito = reajuste * 0.18 + contratacao * 0.04 - fpm * 0.06;
  const projetado = baseFechamento + efeito;
  const cruzaPrudencial = projetado >= 51.3;
  const cruzaMax = projetado >= 54;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Previsões e Cenários">
      <Card style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px' }} pad={0}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Previsões &amp; Cenários</div>
          <div style={{ fontSize: 11, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>projeção com banda de incerteza · simule decisões antes de tomá-las</div>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, padding: '4px 10px', background: colors.neutralBg, color: colors.neutral, borderRadius: 4, fontWeight: 600, letterSpacing: '0.05em' }}>
          ESTIMATIVA · NÃO É NÚMERO FECHADO
        </span>
      </Card>

      {/* seletor de indicador */}
      <div style={{ display: 'flex', gap: 6 }}>
        {indicadores.map((i) => (
          <button key={i.key} onClick={() => setIndicador(i.key)} style={{ padding: '7px 16px', borderRadius: 4, fontSize: 12, fontWeight: 500, background: indicador === i.key ? colors.primary : colors.surface, color: indicador === i.key ? colors.bg : colors.muted, border: indicador === i.key ? 'none' : `1px solid ${colors.border}` }}>
            {i.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
        {/* Gráfico de projeção com banda */}
        <Card>
          <SectionLabel note="sólido = real · tracejado = projeção · sombra = intervalo">Projeção de {indicadores.find((i) => i.key === indicador)?.label}</SectionLabel>
          <ProjectionChart projetado={projetado} />
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 10.5, color: colors.muted }}>
            <Legend color={colors.primary} label="Histórico (dado real)" solid />
            <Legend color={colors.primary} label="Projeção (estimativa)" />
            <Legend color={colors.orange} label="Cenário simulado" />
          </div>
        </Card>

        {/* Controles de cenário */}
        <Card>
          <SectionLabel>Controles de cenário · "e se?"</SectionLabel>
          <ScenarioSlider label="Reajuste salarial" value={reajuste} min={0} max={15} step={0.5} suffix="%" onChange={setReajuste} />
          <ScenarioSlider label="Novas contratações" value={contratacao} min={0} max={20} step={1} suffix=" cargos" onChange={setContratacao} />
          <ScenarioSlider label="Variação do FPM" value={fpm} min={-10} max={10} step={0.5} suffix="%" onChange={setFpm} />

          <div style={{ marginTop: 16, padding: 14, background: cruzaMax ? colors.redBg : cruzaPrudencial ? colors.orangeBg : colors.greenBg, borderRadius: 6 }}>
            <div style={{ fontSize: 9.5, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Fechamento projetado · pessoal</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, color: cruzaMax ? colors.red : cruzaPrudencial ? colors.orange : colors.green }}>{pct(projetado)}</div>
              <div style={{ fontSize: 11, color: colors.muted }}>{efeito >= 0 ? '+' : ''}{efeito.toFixed(2)} p.p. vs. base</div>
            </div>
            <div style={{ fontSize: 11, color: colors.ink, marginTop: 8, lineHeight: 1.4 }}>
              {cruzaMax
                ? 'Cenário cruza o teto de 54% — exigiria rito de recondução (art. 23 LRF).'
                : cruzaPrudencial
                  ? 'Cenário cruza a faixa prudencial (51,3%) — vedações do art. 22, P.U. passam a valer.'
                  : 'Cenário permanece abaixo da faixa prudencial. Sem vedações automáticas.'}
            </div>
          </div>
        </Card>
      </div>

      {/* Comparador de cenários */}
      <Card>
        <SectionLabel>Comparador de cenários · impacto nos limites</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { nome: 'Base', pessoal: 53.25, color: colors.primary },
            { nome: 'Cenário A · este', pessoal: projetado, color: colors.orange },
            { nome: 'Cenário B · conservador', pessoal: 52.4, color: colors.green },
          ].map((c) => (
            <div key={c.nome} style={{ border: `1px solid ${colors.border}`, borderRadius: 5, padding: 12, borderTop: `3px solid ${c.color}` }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{c.nome}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 600, marginTop: 6, color: c.color }}>{pct(c.pessoal)}</div>
              <div style={{ fontSize: 10.5, color: colors.muted }}>pessoal projetado · fechamento</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ScenarioSlider({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (v: number) => void }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11.5, color: colors.muted }}>{label}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600 }}>{value > 0 ? '+' : ''}{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: '100%' }} />
    </div>
  );
}

function Legend({ color, label, solid }: { color: string; label: string; solid?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 14, height: 0, borderTop: `2px ${solid ? 'solid' : 'dashed'} ${color}` }} />
      <span>{label}</span>
    </div>
  );
}

function ProjectionChart({ projetado }: { projetado: number }) {
  const hist = [50.82, 51.34, 51.94, 52.42, 52.73, 52.82];
  const proj = [52.82, 53.0, 53.12, 53.25];
  const W = 460;
  const H = 220;
  const padL = 36;
  const padT = 16;
  const padB = 24;
  const plotW = W - padL - 12;
  const plotH = H - padT - padB;
  const yMin = 48;
  const yMax = 56;
  const n = hist.length + proj.length - 1;
  const xOf = (i: number) => padL + (plotW * i) / n;
  const yOf = (v: number) => padT + plotH * (1 - (v - yMin) / (yMax - yMin));
  const histPts = hist.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
  const projPts = proj.map((v, i) => `${xOf(hist.length - 1 + i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
  // banda
  const bandHi = proj.map((v, i) => ({ x: xOf(hist.length - 1 + i), y: yOf(v + 0.5) }));
  const bandLo = proj.map((v, i) => ({ x: xOf(hist.length - 1 + i), y: yOf(v - 0.5) }));
  const band = `M ${bandHi.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')} L ${bandLo.reverse().map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')} Z`;
  const simY = yOf(projetado);
  const simX = xOf(n);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 220 }}>
      <line x1={padL} y1={yOf(54)} x2={W - 12} y2={yOf(54)} stroke={colors.red} strokeWidth={1} strokeDasharray="4 3" />
      <text x={W - 12} y={yOf(54) - 3} fontSize={9} fill={colors.red} textAnchor="end" fontWeight={600}>MÁX 54%</text>
      <line x1={padL} y1={yOf(51.3)} x2={W - 12} y2={yOf(51.3)} stroke={colors.orange} strokeWidth={1} strokeDasharray="4 3" />
      <text x={W - 12} y={yOf(51.3) - 3} fontSize={9} fill={colors.orange} textAnchor="end" fontWeight={600}>PRUD 51,3%</text>
      <path d={band} fill={colors.primary} fillOpacity={0.1} />
      <polyline points={histPts} stroke={colors.primary} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={projPts} stroke={colors.primary} strokeWidth={1.6} fill="none" strokeDasharray="3 3" strokeLinecap="round" />
      {/* marcador de cenário simulado */}
      <circle cx={simX} cy={simY} r={4} fill={colors.orange} />
      <line x1={simX} y1={simY} x2={simX} y2={padT} stroke={colors.orange} strokeWidth={1} strokeDasharray="2 2" />
      <text x={simX} y={simY - 8} fontSize={9} fill={colors.orange} textAnchor="end" fontWeight={700} fontFamily="JetBrains Mono, monospace">{pct(projetado)}</text>
    </svg>
  );
}
