import { useState } from 'react';
import { colors, font } from '../theme';
import { Card } from '../components/Card';
import { SectionLabel } from '../components/SectionLabel';
import { Async } from '../components/AsyncState';
import { useApp, useResource } from '../context/AppContext';
import { fmt, pct, brl } from '../utils/format';
import {
  fetchProjecao,
  fetchCenarios,
  simularCenario,
  type ForecastIndicador,
  type ProjecaoResponse,
  type CenarioSimularResponse,
  type PontoProjecao,
  type LimiteImpacto,
} from '../services/backend';

const INDICADORES: { key: ForecastIndicador; label: string }[] = [
  { key: 'rcl', label: 'RCL' },
  { key: 'receita', label: 'Receita' },
  { key: 'pessoal', label: 'Pessoal' },
  { key: 'divida', label: 'Dívida' },
];

const HORIZONTE = 4;
const num = (v: number | string | null | undefined): number => Number(v ?? 0);
const isPct = (unidade: string) => unidade === 'PCT_RCL';

/** Formata um valor conforme a unidade do indicador (R$ milhões ou % da RCL). */
function valorFmt(v: number, unidade: string): string {
  return isPct(unidade) ? pct(v) : brl(v / 1e6);
}

const faixaColor: Record<string, string> = {
  normal: colors.green,
  adequado: colors.green,
  alerta: colors.orange,
  prudencial: colors.orange,
  excedido: colors.red,
  insuficiente: colors.red,
};

export function PrevisoesPage() {
  const { ente } = useApp();
  const [indicador, setIndicador] = useState<ForecastIndicador>('rcl');

  const proj = useResource<ProjecaoResponse>(
    () => fetchProjecao(ente.cod_ibge, { indicador, horizonte: HORIZONTE }),
    [ente.cod_ibge, indicador],
  );
  const cenarios = useResource(() => fetchCenarios(ente.cod_ibge), [ente.cod_ibge]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Previsões e Cenários">
      <Card style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px' }} pad={0}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Previsões &amp; Cenários</div>
          <div style={{ fontSize: 11, color: colors.muted, fontFamily: font.mono }}>
            projeção com banda de incerteza (IC 95%) · {ente.nome}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, padding: '4px 10px', background: colors.neutralBg, color: colors.neutral, borderRadius: 4, fontWeight: 600, letterSpacing: '0.05em' }}>
          ESTIMATIVA · NÃO É NÚMERO FECHADO
        </span>
      </Card>

      {/* seletor de indicador */}
      <div style={{ display: 'flex', gap: 6 }}>
        {INDICADORES.map((i) => (
          <button key={i.key} onClick={() => setIndicador(i.key)} style={{ padding: '7px 16px', borderRadius: 4, fontSize: 12, fontWeight: 500, background: indicador === i.key ? colors.primary : colors.surface, color: indicador === i.key ? colors.bg : colors.muted, border: indicador === i.key ? 'none' : `1px solid ${colors.border}` }}>
            {i.label}
          </button>
        ))}
      </div>

      <Async res={proj}>
        {(data) => (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 12 }}>
              <Card>
                <SectionLabel note="sólido = real · tracejado = projeção · sombra = IC 95%">
                  Projeção · {data.descricao}
                </SectionLabel>
                <ProjectionChart data={data} />
                <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 10.5, color: colors.muted, flexWrap: 'wrap' }}>
                  <Legend color={colors.primary} label="Histórico (dado real)" solid />
                  <Legend color={colors.primary} label="Projeção (estimativa)" />
                  {data.cruzamento.aplicavel && <Legend color={colors.red} label={`Teto ${fmt(num(data.cruzamento.teto_pct))}%`} />}
                </div>
              </Card>

              <ModelPanel data={data} />
            </div>

            <CruzamentoBanner data={data} />

            <ScenarioPanel
              ente={ente.cod_ibge}
              indicador={indicador}
              unidade={data.unidade}
              onSaved={cenarios.reload}
            />

            <SavedScenarios res={cenarios} />
          </>
        )}
      </Async>
    </div>
  );
}

// --------------------------------------------------------------------------- //
// Painel do modelo (memória de cálculo auditável)
// --------------------------------------------------------------------------- //
function ModelPanel({ data }: { data: ProjecaoResponse }) {
  const exog = (data.memoria['exogenas_usadas'] as string[] | undefined) ?? [];
  const fontes = (data.memoria['exogenas_fontes'] as Record<string, string> | undefined) ?? {};
  const ultimo = data.projecao[data.projecao.length - 1];
  return (
    <Card>
      <SectionLabel>Modelo &amp; memória de cálculo</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ fontSize: 9.5, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
            Fechamento projetado · {ultimo?.periodo_alvo}
          </div>
          <div style={{ fontFamily: font.mono, fontSize: 26, fontWeight: 700, color: colors.primary, marginTop: 2 }}>
            {valorFmt(num(ultimo?.valor_previsto), data.unidade)}
          </div>
          <div style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
            IC 95%: {valorFmt(num(ultimo?.ic_inferior), data.unidade)} — {valorFmt(num(ultimo?.ic_superior), data.unidade)}
          </div>
        </div>
        <InfoRow label="Modelo" value={modeloLabel(data.modelo)} />
        <InfoRow label="Exógenas usadas" value={exog.length ? exog.join(' · ') : 'nenhuma (série sem exógenas completas)'} />
        {exog.map((e) => (
          <InfoRow key={e} label={`Fonte ${e}`} value={fontes[e] ?? '—'} mono />
        ))}
        <InfoRow label="Fonte" value={`${data.source_ref.relatorio}${data.source_ref.anexo ? ' · ' + data.source_ref.anexo : ''}`} />
        <InfoRow label="Base (as of)" value={data.as_of ? new Date(data.as_of).toLocaleString('pt-BR') : '—'} mono />
        <div style={{ fontSize: 10, color: colors.faint, lineHeight: 1.4, marginTop: 2 }}>
          {String(data.memoria['aviso'] ?? '')}
        </div>
      </div>
    </Card>
  );
}

function modeloLabel(m: string): string {
  return (
    { fechamento: 'Projeção de fechamento (run-rate)', holt_winters: 'Holt-Winters (nível + tendência)', regressao_exogenas: 'Regressão com exógenas (FPM/IPCA/Selic)' } as Record<string, string>
  )[m] ?? m;
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11.5 }}>
      <span style={{ color: colors.muted }}>{label}</span>
      <span style={{ color: colors.ink, textAlign: 'right', fontFamily: mono ? font.mono : undefined }}>{value}</span>
    </div>
  );
}

// --------------------------------------------------------------------------- //
// Banner de cruzamento de limite
// --------------------------------------------------------------------------- //
function CruzamentoBanner({ data }: { data: ProjecaoResponse }) {
  const c = data.cruzamento;
  if (!c.aplicavel) {
    return (
      <Card pad={0} style={{ padding: '10px 16px', background: colors.neutralBg }}>
        <span style={{ fontSize: 11.5, color: colors.muted }}>
          Indicador em R$ — sem teto legal direto. O cenário abaixo traduz a projeção em tetos e mínimos legais.
        </span>
      </Card>
    );
  }
  const bg = c.cruza ? colors.redBg : colors.greenBg;
  const fg = c.cruza ? colors.red : colors.green;
  return (
    <Card pad={0} style={{ padding: '12px 16px', background: bg }}>
      <div style={{ fontSize: 9.5, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
        Cruzamento de limite · {c.indicador_limite} · teto {fmt(num(c.teto_pct))}%
      </div>
      <div style={{ fontSize: 12.5, color: fg, fontWeight: 600, marginTop: 3 }}>
        {c.cruza
          ? `Projeção cruza o teto em ${c.periodo_cruzamento} (${pct(num(c.valor_no_cruzamento))}) — exige providências da LRF.`
          : 'Projeção permanece dentro do teto ao longo do horizonte.'}
      </div>
    </Card>
  );
}

// --------------------------------------------------------------------------- //
// Painel de cenário ("e se?") — chama o backend, não persiste salvo se salvar
// --------------------------------------------------------------------------- //
function ScenarioPanel({ ente, indicador, unidade, onSaved }: { ente: string; indicador: ForecastIndicador; unidade: string; onSaved: () => void }) {
  const [ipca, setIpca] = useState(4.5);
  const [selic, setSelic] = useState(10.5);
  const [fpm, setFpm] = useState(0);
  const [crescInd, setCrescInd] = useState(0);
  const [crescRcl, setCrescRcl] = useState(0);
  const [nome, setNome] = useState('Cenário sem título');
  const [res, setRes] = useState<CenarioSimularResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function run(salvar: boolean) {
    setBusy(true);
    setErro(null);
    try {
      const r = await simularCenario(ente, indicador, {
        nome,
        horizonte: HORIZONTE,
        ipca_aa_pct: ipca,
        selic_aa_pct: selic,
        fpm_variacao_pct: fpm,
        crescimento_indicador_pct: crescInd,
        crescimento_rcl_pct: crescRcl,
        salvar,
      });
      setRes(r);
      if (salvar) onSaved();
    } catch (e) {
      setErro((e as { detail?: string; message?: string })?.detail || (e as Error)?.message || 'Erro na simulação');
    } finally {
      setBusy(false);
    }
  }

  const baseFinal = res ? num(res.base.projecao[res.base.projecao.length - 1]?.valor_previsto) : null;
  const cenFinal = res ? num(res.cenario.projecao[res.cenario.projecao.length - 1]?.valor_previsto) : null;
  const delta = baseFinal !== null && cenFinal !== null ? cenFinal - baseFinal : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 12 }}>
      <Card>
        <SectionLabel>Controles de cenário · "e se?"</SectionLabel>
        <ScenarioSlider label="IPCA (a.a.)" value={ipca} min={0} max={15} step={0.5} suffix="%" onChange={setIpca} />
        <ScenarioSlider label="Selic (a.a.)" value={selic} min={0} max={20} step={0.25} suffix="%" onChange={setSelic} />
        <ScenarioSlider label="Variação do FPM" value={fpm} min={-15} max={15} step={0.5} suffix="%" onChange={setFpm} />
        <ScenarioSlider label="Crescimento do indicador" value={crescInd} min={-10} max={15} step={0.5} suffix="%" onChange={setCrescInd} />
        <ScenarioSlider label="Crescimento da RCL" value={crescRcl} min={-10} max={15} step={0.5} suffix="%" onChange={setCrescRcl} />
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do cenário"
          style={{ width: '100%', marginTop: 6, padding: '7px 10px', fontSize: 12, border: `1px solid ${colors.border}`, borderRadius: 4, background: colors.surface, color: colors.ink }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={() => run(false)} disabled={busy} style={btn(colors.primary, colors.bg)}>
            {busy ? 'Simulando…' : 'Simular'}
          </button>
          <button onClick={() => run(true)} disabled={busy} style={btn(colors.surface, colors.ink, colors.border)}>
            Salvar cenário
          </button>
        </div>
        {erro && <div style={{ marginTop: 8, fontSize: 11, color: colors.red, fontFamily: font.mono }}>⚠ {erro}</div>}
      </Card>

      <Card>
        <SectionLabel note="premissas de gestor → recálculo no backend (não persiste até salvar)">
          Impacto do cenário
        </SectionLabel>
        {!res ? (
          <div style={{ fontSize: 12, color: colors.muted, padding: '18px 4px' }}>
            Ajuste os controles e clique em <strong>Simular</strong> para ver o impacto na projeção, nos limites e nos mínimos.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 20, alignItems: 'baseline', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 9.5, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Base</div>
                <div style={{ fontFamily: font.mono, fontSize: 18, fontWeight: 600 }}>{valorFmt(baseFinal ?? 0, unidade)}</div>
              </div>
              <div>
                <div style={{ fontSize: 9.5, color: colors.orange, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Cenário</div>
                <div style={{ fontFamily: font.mono, fontSize: 18, fontWeight: 600, color: colors.orange }}>{valorFmt(cenFinal ?? 0, unidade)}</div>
              </div>
              {delta !== null && (
                <div style={{ fontSize: 11, color: colors.muted }}>
                  {delta >= 0 ? '+' : ''}{valorFmt(delta, unidade)} vs. base
                  {res.persistido && <span style={{ marginLeft: 8, color: colors.green, fontWeight: 600 }}>· salvo ✓</span>}
                </div>
              )}
            </div>
            <LimitImpactTable titulo="Impacto nos limites (tetos)" itens={res.impacto_limites} unidade={unidade} />
            <LimitImpactTable titulo="Impacto nos mínimos (pisos)" itens={res.impacto_minimos} unidade={unidade} />
          </>
        )}
      </Card>
    </div>
  );
}

function LimitImpactTable({ titulo, itens, unidade }: { titulo: string; itens: LimiteImpacto[]; unidade: string }) {
  if (!itens.length) return null;
  const ehPct = isPct(unidade);
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 10, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 4 }}>{titulo}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {itens.map((l) => (
          <div key={l.indicador} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, padding: '4px 8px', borderRadius: 4, background: l.cruza ? colors.redBg : colors.surface, border: `1px solid ${colors.border}` }}>
            <span style={{ color: colors.ink }}>{l.indicador}</span>
            <span style={{ fontFamily: font.mono, color: l.cruza ? colors.red : colors.muted }}>
              {l.pct_projetado !== null && ehPct
                ? `${pct(num(l.pct_projetado))} / teto ${fmt(num(l.limite_pct))}%`
                : `${fmt(num(l.limite_pct))}% → ${brl(num(l.valor_limite_rs) / 1e6)}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------- //
// Cenários salvos
// --------------------------------------------------------------------------- //
function SavedScenarios({ res }: { res: ReturnType<typeof useResource> }) {
  const list = (res.data as { id: string; nome: string; indicador: string; criado_em: string }[] | null) ?? [];
  if (!list.length) return null;
  return (
    <Card>
      <SectionLabel>Cenários salvos · {list.length}</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
        {list.map((c) => (
          <div key={c.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 5, padding: 12, borderTop: `3px solid ${colors.orange}` }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{c.nome}</div>
            <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 4 }}>
              {c.indicador} · {new Date(c.criado_em).toLocaleDateString('pt-BR')}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// --------------------------------------------------------------------------- //
// Gráfico de projeção (data-driven: histórico + projeção + banda IC + teto)
// --------------------------------------------------------------------------- //
function ProjectionChart({ data }: { data: ProjecaoResponse }) {
  const hist = data.historico.map((p) => ({ x: p.periodo, v: num(p.valor) }));
  const proj = data.projecao.map((p) => ({
    x: p.periodo_alvo,
    v: num(p.valor_previsto),
    lo: num(p.ic_inferior),
    hi: num(p.ic_superior),
  }));
  if (!hist.length) return null;

  const W = 500;
  const H = 230;
  const padL = 52;
  const padT = 16;
  const padB = 28;
  const plotW = W - padL - 14;
  const plotH = H - padT - padB;

  const teto = data.cruzamento.aplicavel ? num(data.cruzamento.teto_pct) : null;
  const allV = [
    ...hist.map((p) => p.v),
    ...proj.flatMap((p) => [p.lo, p.hi]),
    ...(teto !== null ? [teto] : []),
  ];
  let yMin = Math.min(...allV);
  let yMax = Math.max(...allV);
  const span = yMax - yMin || Math.abs(yMax) || 1;
  yMin -= span * 0.12;
  yMax += span * 0.12;

  const nSeg = hist.length + proj.length - 1;
  const xOf = (i: number) => padL + (plotW * i) / Math.max(nSeg, 1);
  const yOf = (v: number) => padT + plotH * (1 - (v - yMin) / (yMax - yMin));

  const histPts = hist.map((p, i) => `${xOf(i).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ');
  const projPts = proj.map((p, i) => `${xOf(hist.length - 1 + i).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ');
  // Conecta o último histórico ao primeiro projetado.
  const bridge = proj.length
    ? `${xOf(hist.length - 1).toFixed(1)},${yOf(hist[hist.length - 1].v).toFixed(1)} ${projPts.split(' ')[0]}`
    : '';

  const bandHi = proj.map((p, i) => ({ x: xOf(hist.length - 1 + i), y: yOf(p.hi) }));
  const bandLo = proj.map((p, i) => ({ x: xOf(hist.length - 1 + i), y: yOf(p.lo) }));
  const band =
    bandHi.length > 0
      ? `M ${bandHi.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')} L ${bandLo
          .slice()
          .reverse()
          .map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
          .join(' L ')} Z`
      : '';

  const ehPct = isPct(data.unidade);
  const yLabel = (v: number) => (ehPct ? `${fmt(v, 0)}%` : fmt(v / 1e6, 0));
  const cross = data.projecao.find((p: PontoProjecao) => p.cruza_limite);
  const crossIdx = cross ? data.projecao.indexOf(cross) : -1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 230 }}>
      {/* grade Y */}
      {[0, 0.5, 1].map((f) => {
        const v = yMin + (yMax - yMin) * f;
        const y = yOf(v);
        return (
          <g key={f}>
            <line x1={padL} y1={y} x2={W - 14} y2={y} stroke={colors.border} strokeWidth={0.5} />
            <text x={padL - 6} y={y + 3} fontSize={8.5} fill={colors.faint} textAnchor="end" fontFamily={font.mono}>{yLabel(v)}</text>
          </g>
        );
      })}
      {/* teto legal */}
      {teto !== null && (
        <>
          <line x1={padL} y1={yOf(teto)} x2={W - 14} y2={yOf(teto)} stroke={colors.red} strokeWidth={1} strokeDasharray="4 3" />
          <text x={W - 14} y={yOf(teto) - 3} fontSize={9} fill={colors.red} textAnchor="end" fontWeight={600}>TETO {fmt(teto, 0)}%</text>
        </>
      )}
      {/* banda IC */}
      {band && <path d={band} fill={colors.primary} fillOpacity={0.12} />}
      {/* histórico */}
      <polyline points={histPts} stroke={colors.primary} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* ponte + projeção tracejada */}
      {bridge && <polyline points={bridge} stroke={colors.primary} strokeWidth={1.6} fill="none" strokeDasharray="3 3" />}
      <polyline points={projPts} stroke={colors.primary} strokeWidth={1.6} fill="none" strokeDasharray="3 3" strokeLinecap="round" />
      {/* pontos históricos */}
      {hist.map((p, i) => (
        <circle key={`h${i}`} cx={xOf(i)} cy={yOf(p.v)} r={2.4} fill={colors.primary} />
      ))}
      {/* marcador de cruzamento */}
      {crossIdx >= 0 && (
        <>
          <circle cx={xOf(hist.length - 1 + crossIdx + 1)} cy={yOf(num(cross!.valor_previsto))} r={4} fill={colors.red} />
          <line x1={xOf(hist.length - 1 + crossIdx + 1)} y1={yOf(num(cross!.valor_previsto))} x2={xOf(hist.length - 1 + crossIdx + 1)} y2={padT} stroke={colors.red} strokeWidth={1} strokeDasharray="2 2" />
        </>
      )}
      {/* rótulos X (primeiro, virada, último) */}
      {[hist[0]?.x, hist[hist.length - 1]?.x, proj[proj.length - 1]?.x].map((lbl, k) => {
        const idx = k === 0 ? 0 : k === 1 ? hist.length - 1 : nSeg;
        return lbl ? (
          <text key={k} x={xOf(idx)} y={H - 8} fontSize={8.5} fill={colors.faint} textAnchor="middle" fontFamily={font.mono}>{lbl}</text>
        ) : null;
      })}
    </svg>
  );
}

function ScenarioSlider({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (v: number) => void }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11.5, color: colors.muted }}>{label}</span>
        <span style={{ fontFamily: font.mono, fontSize: 12, fontWeight: 600 }}>{value > 0 ? '+' : ''}{value}{suffix}</span>
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

function btn(bg: string, fg: string, border?: string): React.CSSProperties {
  return {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
    background: bg,
    color: fg,
    border: border ? `1px solid ${border}` : 'none',
    cursor: 'pointer',
  };
}
