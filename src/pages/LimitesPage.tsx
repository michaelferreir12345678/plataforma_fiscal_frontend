import { useState } from 'react';
import { colors, classifyCeiling, riskColor } from '../theme';
import { Card } from '../components/Card';
import { RadialMeter } from '../components/RadialMeter';
import { Icon } from '../components/Icon';
import { fmt, pct, brl } from '../utils/format';
import { limits, vedacoes } from '../services/limitesData';

export function LimitesPage() {
  const [tabKey, setTabKey] = useState('pessoal');
  const [memoryOpen, setMemoryOpen] = useState(true);
  const [sim, setSim] = useState(60);
  const L = limits.find((l) => l.key === tabKey)!;

  const alertaR = (L.alerta / 100) * L.rcl;
  const prudR = (L.prud / 100) * L.rcl;
  const maxR = (L.max / 100) * L.rcl;

  // simulador
  const newR = L.atualR + sim;
  const newPct = (newR / L.rcl) * 100;
  const simLevel = classifyCeiling(newPct, L.alerta, L.prud, L.max);
  const simRC = riskColor[simLevel];
  const capAlerta = alertaR - newR;
  const capPrud = prudR - newR;
  const capMax = maxR - newR;

  const verdict =
    newPct >= L.max
      ? `Esse aumento levaria ${pct(newPct)} — acima do teto de ${pct(L.max)}. Não é possível sem rito de recondução em 2 quadrimestres (art. 23 LRF).`
      : newPct >= L.prud
        ? `Esse aumento levaria ${pct(newPct)} — faixa prudencial. As vedações do art. 22, P.U. continuam ativas e novas contratações ficam vedadas.`
        : newPct >= L.alerta
          ? `Aumento absorvível com folga estreita: novo nível ${pct(newPct)} em alerta. Não há vedação automática, mas o TCE será notificado.`
          : `Aumento absorvível com folga: novo nível em ${pct(newPct)}, abaixo do alerta. Capacidade adicional de R$ ${fmt(capAlerta, 1)} M.`;

  const seg = (lo: number, hi: number) => ((hi - lo) / L.gaugeMax) * 100;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Monitor de Limites">
      {/* Header + tabs */}
      <Card pad={0}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 4, background: colors.primaryGrad, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>FOR</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>Monitor de Limites · Fortaleza, CE</div>
              <div style={{ fontSize: 11, color: colors.muted, fontFamily: "'JetBrains Mono', monospace", display: 'flex', gap: 12 }}>
                <span>esfera Municipal · Poder Executivo</span>
                <span style={{ color: '#DAD6CA' }}>·</span>
                <span>base RREO 2025 · 2º bim</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', padding: '0 18px' }}>
          {limits.map((l) => {
            const active = l.key === tabKey;
            return (
              <button
                key={l.key}
                onClick={() => setTabKey(l.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: `2px solid ${active ? colors.primary : 'transparent'}`, color: active ? colors.ink : colors.faint }}
              >
                <div style={{ fontSize: 13, fontWeight: 500 }}>{labelOf(l.key)}</div>
                <div style={{ fontSize: 10, padding: '2px 6px', borderRadius: 2, fontWeight: 600, background: active ? colors.orangeBg : colors.bg, color: active ? colors.orange : colors.faint, letterSpacing: '0.04em' }}>{l.badge}</div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Medidor + faixas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card style={{ display: 'flex', gap: 16, padding: '18px 20px' }} pad={0}>
          <RadialMeter atualPct={L.atualPct} alerta={L.alerta} prud={L.prud} max={L.max} gaugeMax={L.gaugeMax} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 10, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{L.label}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginTop: -2 }}>
              R$ {fmt(L.atualR, 1)} <span style={{ fontSize: 14, color: colors.muted }}>M</span>
            </div>
            <div style={{ fontSize: 11, color: colors.muted, paddingBottom: 8, borderBottom: `1px solid ${colors.borderSoft}` }}>despesa líquida sobre RCL12M de R$ {fmt(L.rcl, 1)} M</div>
            <FaixaRow color={colors.yellow} title="Limite Alerta" sub={`${pct(L.alerta)} da RCL · art. 59 LRF`} value={brl(alertaR)} dist={alertaR - L.atualR} />
            <FaixaRow color={colors.orange} title="Limite Prudencial" sub={`${pct(L.prud)} da RCL · art. 22, P.U.`} value={brl(prudR)} dist={prudR - L.atualR} />
            <FaixaRow color={colors.red} title="Limite Máximo" sub={`${pct(L.max)} da RCL · art. 20 LRF`} value={brl(maxR)} dist={maxR - L.atualR} last />
          </div>
        </Card>

        {/* Trajetória */}
        <Card style={{ display: 'flex', flexDirection: 'column', padding: '14px 16px' }} pad={0}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Trajetória 12 meses</div>
          <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2, marginBottom: 10 }}>aproximação ao teto · base RGF</div>
          <TrajChart L={L} />
        </Card>
      </div>

      {/* Memória de cálculo */}
      <Card pad={0}>
        <button onClick={() => setMemoryOpen((v) => !v)} style={{ display: 'flex', width: '100%', alignItems: 'center', padding: '14px 18px', textAlign: 'left', borderBottom: memoryOpen ? `1px solid ${colors.border}` : 'none' }}>
          <Icon size={14} stroke={colors.primary}>
            <rect x="2.5" y="2.5" width="11" height="11" rx="1" />
            <path d="M5 6h6M5 8.5h6M5 11h4" />
          </Icon>
          <div style={{ marginLeft: 10, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Memória de cálculo</div>
            <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 1 }}>despesa bruta − exclusões legais ÷ RCL · art. 18 e 19 da LRF</div>
          </div>
          <Icon size={14} stroke={colors.muted} style={{ transform: memoryOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <path d="M4 6l4 4 4-4" />
          </Icon>
        </button>
        {memoryOpen && tabKey === 'pessoal' && <MemoriaPessoal />}
        {memoryOpen && tabKey !== 'pessoal' && (
          <div style={{ padding: '16px 18px', fontSize: 12, color: colors.muted }}>
            Memória de cálculo detalhada disponível para o limite de Pessoal nesta demonstração. Os demais limites seguem o mesmo padrão (base − exclusões ÷ RCL).
          </div>
        )}
      </Card>

      {/* Vedações + Simulador */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card pad={0}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${colors.border}` }}>
            <Icon size={14} stroke={colors.orange}>
              <path d="M8 1.5l5.5 2v4c0 4-2.5 6-5.5 7-3-1-5.5-3-5.5-7v-4l5.5-2z" />
              <path d="M6 8l1.5 1.5L10 7" />
            </Icon>
            <div style={{ marginLeft: 10, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Providências legais aplicáveis</div>
              <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 1 }}>Vedações ativas · faixa prudencial · LC 101, art. 22, P.U.</div>
            </div>
            <div style={{ fontSize: 10, padding: '3px 8px', borderRadius: 3, background: colors.orangeBg, color: colors.orange, fontWeight: 600, letterSpacing: '0.04em' }}>5 VEDAÇÕES</div>
          </div>
          <div style={{ padding: '12px 18px' }}>
            {vedacoes.map((v, i) => (
              <div key={v.num} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < vedacoes.length - 1 ? `1px solid ${colors.rowBorder}` : 'none' }}>
                <div style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 3, background: colors.orangeBg, color: colors.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600 }}>{v.num}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{v.titulo}</div>
                  {v.sub && <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>{v.sub}</div>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Simulador */}
        <Card pad={0}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${colors.border}` }}>
            <Icon size={14} stroke={colors.primary}>
              <circle cx="8" cy="8" r="6" />
              <path d="M8 4v4l2.5 2" />
            </Icon>
            <div style={{ marginLeft: 10, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Simulador · quanto posso contratar?</div>
              <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 1 }}>projete o efeito de um aumento anual de despesa</div>
            </div>
          </div>
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: colors.muted }}>Aumento anual de despesa</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>R$ {sim}</div>
                  <div style={{ fontSize: 11, color: colors.muted }}>milhões / ano</div>
                </div>
              </div>
              <input type="range" min={0} max={300} step={5} value={sim} onChange={(e) => setSim(Number(e.target.value))} style={{ width: '100%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: colors.faint, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
                <span>R$ 0</span><span>R$ 150</span><span>R$ 300 M</span>
              </div>
            </div>

            <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 5, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 9.5, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Novo % projetado</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 600, color: simRC.color, letterSpacing: '-0.02em' }}>{pct(newPct)}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: colors.muted }}>
                      {newPct - L.atualPct >= 0 ? '+' : ''}{fmt(newPct - L.atualPct, 2)} p.p.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: simRC.bg, borderRadius: 3 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: simRC.color }} />
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: simRC.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{simRC.label}</span>
                </div>
              </div>
              {/* gauge linear */}
              <div style={{ position: 'relative', height: 18, background: colors.borderSoft, borderRadius: 3 }}>
                <Seg left={0} w={seg(0, L.alerta)} color={colors.greenSoft} />
                <Seg left={seg(0, L.alerta)} w={seg(L.alerta, L.prud)} color={colors.yellowSoft} />
                <Seg left={seg(0, L.prud)} w={seg(L.prud, L.max)} color={colors.orangeSoft} />
                <Seg left={seg(0, L.max)} w={seg(L.max, L.gaugeMax)} color={colors.redSoft} />
                <div style={{ position: 'absolute', left: `${(L.atualPct / L.gaugeMax) * 100}%`, top: -3, bottom: -3, width: 1, background: colors.muted }} />
                <div style={{ position: 'absolute', left: `${(Math.min(newPct, L.gaugeMax) / L.gaugeMax) * 100}%`, top: -5, bottom: -5, width: 2, background: colors.primaryDeep }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <Cap label="Folga até alerta" v={capAlerta} bg={colors.greenBg} color={colors.green} />
              <Cap label="Até prudencial" v={capPrud} bg={colors.orangeBg} color={colors.orange} />
              <Cap label="Até o teto" v={capMax} bg={colors.redBg} color={colors.red} />
            </div>

            <div style={{ display: 'flex', gap: 10, padding: '10px 12px', borderLeft: `3px solid ${simRC.color}`, background: simRC.bg }}>
              <Icon size={14} stroke={simRC.color} style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="8" cy="8" r="6" />
                <path d="M8 5v3.5M8 11v0.1" />
              </Icon>
              <div style={{ fontSize: 11.5, lineHeight: 1.4, color: colors.ink }}>{verdict}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function labelOf(key: string) {
  return { pessoal: 'Pessoal', dcl: 'Dívida Consolidada', opCredito: 'Op. de Crédito', garantias: 'Garantias', aro: 'ARO' }[key];
}

function FaixaRow({ color, title, sub, value, dist, last }: { color: string; title: string; sub: string; value: string; dist: number; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: last ? 'none' : `1px dashed ${colors.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, background: color }} />
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 500 }}>{title}</div>
          <div style={{ fontSize: 10, color: colors.faint }}>{sub}</div>
        </div>
      </div>
      <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
        <div style={{ fontSize: 10, color: dist > 0 ? colors.green : colors.red }}>
          {dist > 0 ? `+R$ ${fmt(dist, 1)} M de folga` : `−R$ ${fmt(-dist, 1)} M`}
        </div>
      </div>
    </div>
  );
}

function Seg({ left, w, color }: { left: number; w: number; color: string }) {
  return <div style={{ position: 'absolute', left: `${left}%`, top: 0, bottom: 0, width: `${w}%`, background: color }} />;
}

function Cap({ label, v, bg, color }: { label: string; v: number; bg: string; color: string }) {
  return (
    <div style={{ background: bg, borderLeft: `2px solid ${color}`, padding: '8px 10px', borderRadius: 3 }}>
      <div style={{ fontSize: 9, color, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, marginTop: 2, color: v < 0 ? colors.red : colors.ink }}>
        {v >= 0 ? '+' : '−'}R$ {fmt(Math.abs(v), 1)} M
      </div>
    </div>
  );
}

function TrajChart({ L }: { L: (typeof limits)[number] }) {
  const W = 400;
  const H = 200;
  const padL = 36;
  const padT = 14;
  const padB = 18;
  const plotW = W - padL - 12;
  const plotH = H - padT - padB;
  const vals = L.history;
  const maxV = Math.max(L.max * 1.02, Math.max(...vals));
  const minV = Math.min(Math.min(...vals) * 0.97, L.alerta * 0.95);
  const yOf = (v: number) => padT + plotH * (1 - (v - minV) / (maxV - minV));
  const xOf = (i: number) => padL + (plotW * i) / (vals.length - 1);
  const pts = vals.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
  const level = classifyCeiling(L.atualPct, L.alerta, L.prud, L.max);
  const c = riskColor[level].color;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 200, flex: 1 }}>
      {[L.max, L.prud, L.alerta].map((lim, i) => (
        <g key={i}>
          <line x1={padL} y1={yOf(lim)} x2={W - 12} y2={yOf(lim)} stroke={[colors.red, colors.orange, colors.yellow][i]} strokeWidth={1} strokeDasharray="3 3" />
          <text x={W - 14} y={yOf(lim) - 3} fontSize={9} fontWeight={600} fill={[colors.red, colors.orange, colors.yellowText][i]} textAnchor="end">
            {fmt(lim, lim % 1 === 0 ? 0 : 1)}%
          </text>
        </g>
      ))}
      <polyline points={pts} stroke={c} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {vals.map((v, i) => (
        <circle key={i} cx={xOf(i)} cy={yOf(v)} r={2.2} fill="#fff" stroke={c} strokeWidth={1.5} />
      ))}
    </svg>
  );
}

function MemoriaPessoal() {
  const rows: [string, string, string][] = [
    ['3.1.1', 'Vencimentos, vantagens e outras', 'R$ 5.342,8'],
    ['3.1.5', 'Encargos sociais (patronais)', 'R$ 1.034,1'],
    ['3.1.9', 'Inativos e pensionistas (RPPS)', 'R$ 985,3'],
    ['3.1.7', 'Outras desp. com pessoal (terceirização)', 'R$ 136,0'],
  ];
  const exclusoes: [string, string, string][] = [
    ['B.I', 'Indenizações por demissão', '−R$ 12,3'],
    ['B.II', 'Programa Saúde da Família (PSF)', '−R$ 188,4'],
    ['B.III', 'Sentenças judiciais anteriores ao LRF', '−R$ 25,6'],
    ['B.IV', 'Inativos custeados com recursos vinculados', '−R$ 485,5'],
  ];
  return (
    <div style={{ padding: '16px 18px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <tbody>
          <Head text="A · Despesa bruta de pessoal" />
          {rows.map((r) => <Tr key={r[0]} cells={r} />)}
          <Total label="Despesa Bruta = Σ A" value="R$ 7.498,2" />
          <Head text="B · Exclusões legais (art. 19, §1º LRF)" />
          {exclusoes.map((r) => <Tr key={r[0]} cells={r} red />)}
          <Total label="Despesa Líquida = A − Σ B" value="R$ 6.786,4" />
          <tr>
            <td style={{ padding: '8px 0', fontWeight: 600 }} colSpan={2}>÷ RCL12M</td>
            <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: colors.muted }}>R$ 12.847,3</td>
          </tr>
          <tr style={{ borderTop: `2px solid ${colors.primary}`, background: colors.orangeBg }}>
            <td style={{ padding: '10px 6px', fontWeight: 600 }} colSpan={2}>% Pessoal · Executivo Municipal</td>
            <td style={{ padding: '10px 6px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: colors.orange }}>52,82%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Head({ text }: { text: string }) {
  return (
    <tr style={{ borderBottom: `1px solid ${colors.borderSoft}` }}>
      <td style={{ padding: '10px 0 7px', fontSize: 10.5, color: colors.faint, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }} colSpan={3}>
        {text}
      </td>
    </tr>
  );
}
function Tr({ cells, red }: { cells: [string, string, string]; red?: boolean }) {
  return (
    <tr style={{ borderBottom: `1px dashed ${colors.borderSoft}` }}>
      <td style={{ padding: '6px 0', fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: colors.muted, width: 60 }}>{cells[0]}</td>
      <td style={{ padding: '6px 0' }}>{cells[1]}</td>
      <td style={{ padding: '6px 0', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: red ? colors.red : colors.ink }}>{cells[2]}</td>
    </tr>
  );
}
function Total({ label, value }: { label: string; value: string }) {
  return (
    <tr style={{ borderBottom: `2px solid ${colors.primaryDeep}`, background: colors.bg }}>
      <td style={{ padding: '8px 0', fontWeight: 600 }} colSpan={2}>{label}</td>
      <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{value}</td>
    </tr>
  );
}
