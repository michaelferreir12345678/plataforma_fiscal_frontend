import { useState } from 'react';
import { colors } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { SectionLabel } from '../components/SectionLabel';
import { pct, fmt } from '../utils/format';

interface PisoCfg {
  label: string;
  piso: number;
  aplicado: number;
  base: number;
  aplicadoR: number;
  norma: string;
  hist: number[];
  proj: number[];
  subfuncoes: { nome: string; valor: string; pct: string }[];
  rpExpurgo: string;
  rpImpacto: string;
}

const saude: PisoCfg = {
  label: 'Saúde · ASPS',
  piso: 15,
  aplicado: 16.42,
  base: 6210.5,
  aplicadoR: 1019.5,
  norma: 'LC 141/2012 · CF art. 198',
  hist: [14.8, 15.2, 15.6, 15.9, 16.2, 16.42],
  proj: [16.42, 16.6, 16.8],
  rpExpurgo: '142,8',
  rpImpacto: '−0,18 p.p.',
  subfuncoes: [
    { nome: 'Atenção básica', valor: '486,2', pct: '47,7%' },
    { nome: 'Assist. hospitalar e ambulatorial', valor: '342,8', pct: '33,6%' },
    { nome: 'Suporte profilático e terapêutico', valor: '98,4', pct: '9,7%' },
    { nome: 'Vigilância sanitária', valor: '54,6', pct: '5,4%' },
    { nome: 'Vigilância epidemiológica', valor: '37,5', pct: '3,7%' },
  ],
};

const educacao: PisoCfg = {
  label: 'Educação · MDE',
  piso: 25,
  aplicado: 28.13,
  base: 6210.5,
  aplicadoR: 1746.2,
  norma: 'CF art. 212 · LDB art. 72',
  hist: [24.2, 25.1, 26.0, 26.9, 27.6, 28.13],
  proj: [28.13, 28.4, 28.7],
  rpExpurgo: '0,0',
  rpImpacto: '0,00 p.p.',
  subfuncoes: [
    { nome: 'Ensino fundamental', valor: '1.024,8', pct: '58,7%' },
    { nome: 'Educação infantil', valor: '452,6', pct: '25,9%' },
    { nome: 'Ensino superior / outros', valor: '142,4', pct: '8,2%' },
    { nome: 'Educação especial', valor: '78,2', pct: '4,5%' },
    { nome: 'Administração educacional', valor: '48,2', pct: '2,8%' },
  ],
};

export function SaudeEducacaoPage() {
  const [tab, setTab] = useState<'saude' | 'educacao'>('saude');
  const cfg = tab === 'saude' ? saude : educacao;
  const cumprido = cfg.aplicado >= cfg.piso;
  const color = cumprido ? colors.green : colors.red;
  const gaugeMax = cfg.piso * 1.6;
  const pisoLeft = (cfg.piso / gaugeMax) * 100;
  const valLeft = (cfg.aplicado / gaugeMax) * 100;
  const projVal = cfg.proj[cfg.proj.length - 1];
  const projLeft = (projVal / gaugeMax) * 100;
  const folga = ((cfg.aplicado - cfg.piso) / 100) * cfg.base;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Detalhe · Saúde e Educação">
      <Breadcrumb crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Análise por bloco' }, { label: 'Saúde & Educação' }]} source="fonte: RREO Anexo 8 (MDE) · Anexo 12 (ASPS) · SIOPE/SIOPS" />

      <div style={{ display: 'flex', gap: 6 }}>
        {(['saude', 'educacao'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ padding: '7px 16px', borderRadius: 4, fontSize: 12, fontWeight: 500, background: tab === t ? colors.primary : colors.bg, color: tab === t ? colors.bg : colors.muted, border: tab === t ? 'none' : `1px solid ${colors.border}` }}
          >
            {t === 'saude' ? 'Saúde · ASPS' : 'Educação · MDE'}
          </button>
        ))}
      </div>

      {/* Header + piso meter (cor invertida) */}
      <Card style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 11, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>% aplicado · {cfg.label}</div>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: cumprido ? colors.greenBg : colors.redBg, borderRadius: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
              <span style={{ fontSize: 10, fontWeight: 600, color, letterSpacing: '0.04em' }}>{cumprido ? 'CUMPRIDO' : 'ABAIXO DO MÍNIMO'}</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 40, fontWeight: 600, letterSpacing: '-0.03em', color }}>{pct(cfg.aplicado)}</div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 500 }}>mínimo {fmt(cfg.piso, 0)}%</div>
              <div style={{ fontSize: 10.5, color: colors.faint }}>{cfg.norma}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: colors.muted, marginTop: 8 }}>
            Base (impostos + transf.): <span style={{ fontFamily: "'JetBrains Mono', monospace", color: colors.ink }}>R$ {fmt(cfg.base, 1)} M</span> · aplicado <span style={{ fontFamily: "'JetBrains Mono', monospace", color: colors.ink }}>R$ {fmt(cfg.aplicadoR, 1)} M</span>
          </div>
        </div>
        <div style={{ width: 1, alignSelf: 'stretch', background: colors.border }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Medidor de piso · abaixo da linha é vermelho</div>
            <span style={{ fontSize: 10.5, color, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{folga >= 0 ? 'Folga +' : 'Faltam '}R$ {fmt(Math.abs(folga), 1)} M</span>
          </div>
          <div style={{ position: 'relative', height: 18, background: colors.borderSoft, borderRadius: 4, marginTop: 20 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pisoLeft}%`, background: 'repeating-linear-gradient(45deg, #FBDBDB, #FBDBDB 5px, #F5CBCB 5px, #F5CBCB 10px)', borderRadius: '4px 0 0 4px' }} />
            <div style={{ position: 'absolute', left: `${pisoLeft}%`, right: 0, top: 0, bottom: 0, background: colors.greenBg, borderRadius: '0 4px 4px 0' }} />
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${valLeft}%`, background: color, borderRadius: '4px 0 0 4px', opacity: 0.85 }} />
            <div style={{ position: 'absolute', left: `${pisoLeft}%`, top: -6, bottom: -6, width: 2, background: colors.primaryDeep }} />
            <div style={{ position: 'absolute', left: `${pisoLeft}%`, top: -20, transform: 'translateX(-50%)', fontSize: 9, color: colors.primaryDeep, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>MÍNIMO {fmt(cfg.piso, 0)}%</div>
            <div style={{ position: 'absolute', left: `${projLeft}%`, top: -4, bottom: -4, borderLeft: `2px dashed ${colors.muted}` }} />
            <div style={{ position: 'absolute', left: `${projLeft}%`, bottom: -20, transform: 'translateX(-50%)', fontSize: 9, color: colors.muted, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>proj. {pct(projVal)}</div>
          </div>
          <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 28 }}>
            Mínimo verificado no <b>encerramento do exercício</b>. Trajetória projetada mantém o cumprimento — não cumprir gera rejeição de contas e risco de improbidade.
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 12 }}>
        {/* Trajetória × mínimo */}
        <Card>
          <SectionLabel note="5 bim. por liquidada · último por empenhada">Trajetória × mínimo</SectionLabel>
          <PisoChart cfg={cfg} color={color} />
        </Card>

        {/* Memória + expurgo + composição */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card>
            <SectionLabel>Memória de cálculo + expurgo de RP sem lastro</SectionLabel>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                <tr style={{ borderBottom: `1px dashed ${colors.borderSoft}` }}>
                  <td style={{ padding: '7px 0' }}>Receita resultante de impostos + transf. (base)</td>
                  <td style={{ padding: '7px 0', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>R$ {fmt(cfg.base, 1)}</td>
                </tr>
                <tr style={{ borderBottom: `1px dashed ${colors.borderSoft}` }}>
                  <td style={{ padding: '7px 0' }}>Despesa aplicada (liquidada + empenhada)</td>
                  <td style={{ padding: '7px 0', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>R$ {fmt(cfg.aplicadoR, 1)}</td>
                </tr>
                <tr style={{ borderBottom: `1px dashed ${colors.borderSoft}` }}>
                  <td style={{ padding: '7px 0', color: colors.red }}>(−) RPNP sem disponibilidade (expurgo)</td>
                  <td style={{ padding: '7px 0', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: colors.red }}>−{cfg.rpExpurgo}</td>
                </tr>
                <tr style={{ borderTop: `2px solid ${colors.primary}`, background: colors.accentSoft }}>
                  <td style={{ padding: '10px 6px', fontWeight: 600 }}>= % aplicado válido</td>
                  <td style={{ padding: '10px 6px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color }}>{pct(cfg.aplicado)}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ marginTop: 10, padding: '8px 12px', background: colors.orangeBg, borderRadius: 4, fontSize: 10.5, color: '#6B5A2E', lineHeight: 1.4 }}>
              Impacto do expurgo de RP sem lastro: <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: colors.orange }}>{cfg.rpImpacto}</span>. Sem o expurgo, o número estaria inflado.
            </div>
          </Card>

          <Card>
            <SectionLabel>Composição por subfunção / área</SectionLabel>
            {cfg.subfuncoes.map((s) => (
              <div key={s.nome} style={{ display: 'grid', gridTemplateColumns: '1.6fr 90px 56px', gap: 10, alignItems: 'center', padding: '5px 0' }}>
                <span style={{ fontSize: 11.5 }}>{s.nome}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, textAlign: 'right' }}>R$ {s.valor}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, textAlign: 'right', color: colors.muted }}>{s.pct}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

function PisoChart({ cfg, color }: { cfg: PisoCfg; color: string }) {
  const W = 340;
  const H = 180;
  const padL = 36;
  const padT = 16;
  const padB = 24;
  const plotW = W - padL - 12;
  const plotH = H - padT - padB;
  const all = [...cfg.hist, ...cfg.proj, cfg.piso];
  const yMax = Math.max(...all) * 1.04;
  const yMin = Math.min(...all) * 0.96;
  const n = cfg.hist.length + cfg.proj.length - 1;
  const xOf = (i: number) => padL + (plotW * i) / n;
  const yOf = (v: number) => padT + plotH * (1 - (v - yMin) / (yMax - yMin));
  const hist = cfg.hist.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
  const proj = cfg.proj.map((v, i) => `${xOf(cfg.hist.length - 1 + i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
  const pisoY = yOf(cfg.piso);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 180 }}>
      {[16, 80, 156].map((y) => (
        <line key={y} x1={padL} y1={y} x2={W - 12} y2={y} stroke={colors.borderSoft} strokeWidth={1} />
      ))}
      <line x1={padL} y1={pisoY} x2={W - 12} y2={pisoY} stroke={colors.primaryDeep} strokeWidth={1.5} strokeDasharray="4 3" />
      <text x={W - 12} y={pisoY - 4} fontSize={9} fill={colors.primaryDeep} textAnchor="end" fontWeight={700}>
        MÍNIMO {fmt(cfg.piso, 0)}%
      </text>
      <polyline points={hist} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={proj} stroke={color} strokeWidth={1.6} fill="none" strokeDasharray="3 3" strokeLinecap="round" />
    </svg>
  );
}
