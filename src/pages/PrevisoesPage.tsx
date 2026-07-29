/**
 * Previsões & Cenários (Módulo 13).
 *
 * Sprint 25E (auditoria §2.11): **horizonte configurável** (era fixo em 4), **comparação
 * das três camadas** de modelo — o gestor pergunta "por que esse número e não outro?", e
 * mostrar só o escolhido responde pela metade — e **exportação** da projeção.
 */
import { useId, useState } from 'react';
import { colors, font } from '../theme';
import { rotuloIndicador } from '../utils/rotulos';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { SectionLabel } from '../components/SectionLabel';
import { Async, Skeleton } from '../components/AsyncState';
import { ExportButton } from '../components/ExportButton';
import { FonteChip } from '../components/FonteChip';
import { useApp, useResource } from '../context/AppContext';
import { fmt, pct, brl } from '../utils/format';
import {
  fetchComparacaoModelos,
  fetchProjecao,
  fetchCenarios,
  simularCenario,
  type ForecastIndicador,
  type ModeloComparado,
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

/** Horizontes oferecidos; o backend aceita 1..24 (Sprint 25E). */
const HORIZONTES = [2, 4, 6, 8, 12] as const;
const num = (v: number | string | null | undefined): number => Number(v ?? 0);
const isPct = (unidade: string) => unidade === 'PCT_RCL';

/** Formata um valor conforme a unidade do indicador (R$ milhões ou % da RCL). */
function valorFmt(v: number, unidade: string): string {
  return isPct(unidade) ? pct(v) : brl(v / 1e6);
}

export function PrevisoesPage() {
  const { ente } = useApp();
  const [indicador, setIndicador] = useState<ForecastIndicador>('rcl');
  const [horizonte, setHorizonte] = useState<number>(4);

  const proj = useResource<ProjecaoResponse>(
    () => fetchProjecao(ente.cod_ibge, { indicador, horizonte }),
    [ente.cod_ibge, indicador, horizonte],
  );
  const cenarios = useResource(() => fetchCenarios(ente.cod_ibge), [ente.cod_ibge]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Previsões e Cenários">
      <PageHeader
        title="Previsões & Cenários"
        context={`Projeção com banda de incerteza (IC 95%) · ${ente.nome}`}
        source="Séries históricas gold · modelos estatísticos versionados"
        actions={(
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '4px 10px', background: colors.neutralBg, color: colors.neutral, borderRadius: 4, fontWeight: 600, letterSpacing: '0.05em' }}>
          ESTIMATIVA · NÃO É NÚMERO FECHADO
        </span>
        )}
      />

      {/* seletores de indicador e horizonte */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {INDICADORES.map((i) => (
          <button type="button" key={i.key} aria-pressed={indicador === i.key} onClick={() => setIndicador(i.key)} style={{ padding: '7px 16px', borderRadius: 4, fontSize: 12, fontWeight: 500, background: indicador === i.key ? colors.primary : colors.surface, color: indicador === i.key ? colors.bg : colors.muted, border: indicador === i.key ? 'none' : `1px solid ${colors.border}` }}>
            {i.label}
          </button>
        ))}
        <span style={{ marginLeft: 14, fontSize: 11, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
          Horizonte
        </span>
        <div role="group" aria-label="Horizonte da projeção" style={{ display: 'flex', gap: 4 }}>
          {HORIZONTES.map((h) => (
            <button
              key={h}
              type="button"
              aria-pressed={horizonte === h}
              onClick={() => setHorizonte(h)}
              style={{
                padding: '5px 10px', borderRadius: 4, fontSize: 11, fontFamily: font.mono,
                border: `1px solid ${horizonte === h ? colors.primary : colors.border}`,
                background: horizonte === h ? colors.accentSoft : colors.surface,
                color: horizonte === h ? colors.primary : colors.muted, cursor: 'pointer',
              }}
            >
              +{h}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 11, color: colors.muted }}>
          períodos à frente — quanto mais longe, mais larga a banda de incerteza
        </span>
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
                <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: colors.muted, flexWrap: 'wrap' }}>
                  <Legend color={colors.primary} label="Histórico (dado real)" solid />
                  <Legend color={colors.primary} label="Projeção (estimativa)" />
                  {data.cruzamento.aplicavel && <Legend color={colors.red} label={`Teto ${fmt(num(data.cruzamento.teto_pct))}%`} />}
                </div>
              </Card>

              <ModelPanel data={data} />
            </div>

            <CruzamentoBanner data={data} />

            <ComparacaoModelos
              cod={ente.cod_ibge}
              enteNome={ente.nome}
              indicador={indicador}
              horizonte={horizonte}
            />

            <ScenarioPanel
              ente={ente.cod_ibge}
              indicador={indicador}
              unidade={data.unidade}
              horizonte={horizonte}
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
          <div style={{ fontSize: 11, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
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
        <div style={{ fontSize: 11, color: colors.faint, lineHeight: 1.4, marginTop: 2 }}>
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
      <div style={{ fontSize: 11, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
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
function ScenarioPanel({ ente, indicador, unidade, horizonte, onSaved }: { ente: string; indicador: ForecastIndicador; unidade: string; horizonte: number; onSaved: () => void }) {
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
        horizonte,
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
        <SectionLabel>Controles de cenário · &quot;e se?&quot;</SectionLabel>
        <ScenarioSlider label="IPCA (a.a.)" value={ipca} min={0} max={15} step={0.5} suffix="%" onChange={setIpca} />
        <ScenarioSlider label="Selic (a.a.)" value={selic} min={0} max={20} step={0.25} suffix="%" onChange={setSelic} />
        <ScenarioSlider label="Variação do FPM" value={fpm} min={-15} max={15} step={0.5} suffix="%" onChange={setFpm} />
        <ScenarioSlider label="Crescimento do indicador" value={crescInd} min={-10} max={15} step={0.5} suffix="%" onChange={setCrescInd} />
        <ScenarioSlider label="Crescimento da RCL" value={crescRcl} min={-10} max={15} step={0.5} suffix="%" onChange={setCrescRcl} />
        <input
          aria-label="Nome do cenário"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do cenário"
          style={{ width: '100%', marginTop: 6, padding: '7px 10px', fontSize: 12, border: `1px solid ${colors.border}`, borderRadius: 4, background: colors.surface, color: colors.ink }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button type="button" onClick={() => run(false)} disabled={busy} style={btn(colors.primary, colors.bg)}>
            {busy ? 'Simulando…' : 'Simular'}
          </button>
          <button type="button" onClick={() => run(true)} disabled={busy} style={btn(colors.surface, colors.ink, colors.border)}>
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
                <div style={{ fontSize: 11, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Base</div>
                <div style={{ fontFamily: font.mono, fontSize: 18, fontWeight: 600 }}>{valorFmt(baseFinal ?? 0, unidade)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: colors.orange, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Cenário</div>
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
      <div style={{ fontSize: 11, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 4 }}>{titulo}</div>
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
            <div style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
              {rotuloIndicador(c.indicador)} · {new Date(c.criado_em).toLocaleDateString('pt-BR')}
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
  const titleId = useId();
  const descriptionId = useId();
  // Ler uma projeção é ler ponto a ponto ("quando cruza?", "quanto no 4º bimestre?"). Sem
  // hover, o gráfico só respondia isso na tabela sr-only — invisível para quem enxerga.
  const [sob, setSob] = useState<{ i: number; projetado: boolean } | null>(null);
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

  const formatarValor = (v: number) => (ehPct ? `${fmt(v, 2)}%` : fmt(v, 2));
  const pontoSob = sob
    ? sob.projetado
      ? { rotulo: proj[sob.i]?.x, valor: proj[sob.i]?.v, lo: proj[sob.i]?.lo, hi: proj[sob.i]?.hi }
      : { rotulo: hist[sob.i]?.x, valor: hist[sob.i]?.v, lo: null, hi: null }
    : null;

  return (
    <figure style={{ margin: 0, position: 'relative' }}>
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 230 }}
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
      focusable="false"
      onMouseLeave={() => setSob(null)}
    >
      <title id={titleId}>Histórico e projeção de {rotuloIndicador(data.indicador)}</title>
      <desc id={descriptionId}>
        Série com {hist.length} períodos históricos e {proj.length} períodos projetados,
        incluindo intervalo de confiança. A tabela seguinte contém os valores exatos.
      </desc>
      {/* grade Y */}
      {[0, 0.5, 1].map((f) => {
        const v = yMin + (yMax - yMin) * f;
        const y = yOf(v);
        return (
          <g key={f}>
            <line x1={padL} y1={y} x2={W - 14} y2={y} stroke={colors.border} strokeWidth={0.5} />
            <text x={padL - 6} y={y + 3} fontSize={11} fill={colors.faint} textAnchor="end" fontFamily={font.mono}>{yLabel(v)}</text>
          </g>
        );
      })}
      {/* teto legal */}
      {teto !== null && (
        <>
          <line x1={padL} y1={yOf(teto)} x2={W - 14} y2={yOf(teto)} stroke={colors.red} strokeWidth={1} strokeDasharray="4 3" />
          <text x={W - 14} y={yOf(teto) - 3} fontSize={11} fill={colors.red} textAnchor="end" fontWeight={600}>TETO {fmt(teto, 0)}%</text>
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
          <text key={k} x={xOf(idx)} y={H - 8} fontSize={11} fill={colors.faint} textAnchor="middle" fontFamily={font.mono}>{lbl}</text>
        ) : null;
      })}

      {/* Alvos de hover — uma faixa por período, sempre maior que a marca de 2,4px. */}
      {[...hist.map((_, i) => ({ i, projetado: false })), ...proj.map((_, i) => ({ i, projetado: true }))].map(
        (alvo, ordem) => {
          const largura = plotW / Math.max(nSeg, 1);
          const destacado =
            sob !== null && sob.i === alvo.i && sob.projetado === alvo.projetado;
          const cy = alvo.projetado ? yOf(proj[alvo.i].v) : yOf(hist[alvo.i].v);
          return (
            <g key={`alvo-${ordem}`}>
              {destacado && (
                <circle cx={xOf(ordem)} cy={cy} r={4.5} fill="none" stroke={colors.primary} strokeWidth={1.5} />
              )}
              <rect
                x={xOf(ordem) - largura / 2}
                y={padT}
                width={largura}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setSob(alvo)}
              />
            </g>
          );
        },
      )}
    </svg>
      {pontoSob?.valor !== undefined && pontoSob.rotulo && (
        <div
          role="status"
          style={{
            position: 'absolute', top: 0, right: 0,
            background: colors.surface, border: `1px solid ${colors.border}`,
            borderRadius: 4, padding: '6px 8px', fontSize: 11,
            fontFamily: font.mono, color: colors.ink, pointerEvents: 'none',
            boxShadow: '0 6px 18px rgba(15,26,20,0.10)', whiteSpace: 'nowrap',
          }}
        >
          <strong>{pontoSob.rotulo}</strong>
          <div>
            {formatarValor(pontoSob.valor)}
            {sob?.projetado ? ' · projetado' : ''}
          </div>
          {pontoSob.lo !== null && pontoSob.hi !== null && (
            <div style={{ color: colors.faint }}>
              IC {formatarValor(pontoSob.lo)}–{formatarValor(pontoSob.hi)}
            </div>
          )}
        </div>
      )}
      <table className="sr-only">
        <caption>Alternativa tabular do histórico e da projeção de {rotuloIndicador(data.indicador)}</caption>
        <thead>
          <tr>
            <th scope="col">Período</th>
            <th scope="col">Tipo</th>
            <th scope="col">Valor</th>
            <th scope="col">Intervalo inferior</th>
            <th scope="col">Intervalo superior</th>
          </tr>
        </thead>
        <tbody>
          {hist.map((point) => (
            <tr key={`historico-${point.x}`}>
              <td>{point.x}</td>
              <td>Histórico</td>
              <td>{yLabel(point.v)}</td>
              <td>não se aplica</td>
              <td>não se aplica</td>
            </tr>
          ))}
          {proj.map((point) => (
            <tr key={`projecao-${point.x}`}>
              <td>{point.x}</td>
              <td>Projeção</td>
              <td>{yLabel(point.v)}</td>
              <td>{yLabel(point.lo)}</td>
              <td>{yLabel(point.hi)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function ScenarioSlider({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (v: number) => void }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11.5, color: colors.muted }}>{label}</span>
        <span style={{ fontFamily: font.mono, fontSize: 12, fontWeight: 600 }}>{value > 0 ? '+' : ''}{value}{suffix}</span>
      </div>
      <input
        type="range"
        aria-label={label}
        aria-valuetext={`${value > 0 ? '+' : ''}${value}${suffix}`}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%' }}
      />
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

/**
 * Comparação das três camadas (Sprint 25E).
 *
 * Pergunta gerencial: **"por que esse número, e não outro?"**. Mostra o que cada modelo
 * projeta, a largura do IC (a medida honesta de incerteza) e — quando é o caso — por que
 * um deles **não** está disponível. Não há ranking por acurácia: a série é curta demais
 * para um backtest que não seja ruído, e o backend diz isso no critério.
 */
function ComparacaoModelos({
  cod,
  enteNome,
  indicador,
  horizonte,
}: {
  cod: string;
  enteNome: string;
  indicador: ForecastIndicador;
  horizonte: number;
}) {
  const res = useResource(
    () => fetchComparacaoModelos(cod, { indicador, horizonte }),
    [cod, indicador, horizonte],
  );
  return (
    <Card>
      <SectionLabel note="mesma série, mesmo horizonte — o que muda é o método">
        Comparação de modelos
      </SectionLabel>
      <Async res={res} skeleton={<Skeleton linhas={4} />}>
        {(c) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
              {c.modelos.map((m) => (
                <ModeloCard key={m.modelo} m={m} unidade={c.unidade} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: colors.muted, lineHeight: 1.5 }}>
              {c.criterio_escolha}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FonteChip
                source={c.source_ref}
                nota={`${c.n_periodos_historicos} períodos históricos · horizonte +${c.horizonte}`}
              />
              <div style={{ marginLeft: 'auto' }}>
                <ExportButton
                  nome={`Modelos ${indicador}`}
                  linhas={c.modelos}
                  colunas={[
                    { cabecalho: 'modelo', valor: (m) => m.modelo },
                    { cabecalho: 'disponivel', valor: (m) => (m.disponivel ? 'sim' : 'nao') },
                    { cabecalho: 'escolhido', valor: (m) => (m.escolhido ? 'sim' : 'nao') },
                    { cabecalho: 'valor_final', valor: (m) => (m.valor_final == null ? '' : Number(m.valor_final)) },
                    { cabecalho: 'ic_inferior_final', valor: (m) => (m.ic_inferior_final == null ? '' : Number(m.ic_inferior_final)) },
                    { cabecalho: 'ic_superior_final', valor: (m) => (m.ic_superior_final == null ? '' : Number(m.ic_superior_final)) },
                    { cabecalho: 'amplitude_ic_media', valor: (m) => (m.amplitude_ic_media == null ? '' : Number(m.amplitude_ic_media)) },
                    { cabecalho: 'r2', valor: (m) => (m.r2 == null ? '' : Number(m.r2)) },
                    { cabecalho: 'n_obs', valor: (m) => m.n_obs },
                    { cabecalho: 'cruza_limite', valor: (m) => (m.cruza_limite ? 'sim' : 'nao') },
                  ]}
                  contexto={{
                    ente: enteNome,
                    periodo: c.periodos_projetados.join(' '),
                    fonte: `${c.descricao} · ${c.aviso}`,
                  }}
                  modeloRelatorio="tecnico"
                />
              </div>
            </div>
          </div>
        )}
      </Async>
    </Card>
  );
}

function ModeloCard({ m, unidade }: { m: ModeloComparado; unidade: string }) {
  if (!m.disponivel) {
    return (
      <div
        data-testid={`modelo-${m.modelo}`}
        style={{ padding: '10px 12px', border: `1px dashed ${colors.border}`, borderRadius: 6, background: colors.bg }}
      >
        <div style={{ fontSize: 11.5, fontWeight: 600, color: colors.muted }}>{m.rotulo}</div>
        <div style={{ fontSize: 11, color: colors.faint, fontWeight: 700, letterSpacing: '0.05em', marginTop: 4 }}>
          INDISPONÍVEL
        </div>
        <div style={{ fontSize: 11, color: colors.muted, marginTop: 4, lineHeight: 1.45 }}>
          {m.motivo_indisponivel}
        </div>
      </div>
    );
  }
  return (
    <div
      data-testid={`modelo-${m.modelo}`}
      style={{
        padding: '10px 12px', borderRadius: 6,
        border: `1px solid ${m.escolhido ? colors.primary : colors.border}`,
        borderLeftWidth: m.escolhido ? 4 : 1,
        background: m.escolhido ? colors.accentSoft : colors.surface,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600 }}>{m.rotulo}</span>
        {m.escolhido && (
          <span style={{ fontSize: 11, fontWeight: 700, color: colors.primary, letterSpacing: '0.05em' }}>
            ● EM USO
          </span>
        )}
      </div>
      <div style={{ fontFamily: font.mono, fontSize: 20, fontWeight: 700, marginTop: 4 }}>
        {valorFmt(num(m.valor_final), unidade)}
      </div>
      <div style={{ fontSize: 11, color: colors.muted, fontFamily: font.mono }}>
        IC {valorFmt(num(m.ic_inferior_final), unidade)} — {valorFmt(num(m.ic_superior_final), unidade)}
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: colors.muted, lineHeight: 1.5 }}>
        amplitude média do IC{' '}
        <strong style={{ fontFamily: font.mono, color: colors.ink }}>
          {m.amplitude_ic_media == null ? '—' : valorFmt(num(m.amplitude_ic_media), unidade)}
        </strong>
        {m.r2 != null && (
          <>
            {' · '}R² <strong style={{ fontFamily: font.mono, color: colors.ink }}>{fmt(num(m.r2), 3)}</strong>
          </>
        )}
        {m.n_obs != null && <> · {m.n_obs} obs.</>}
      </div>
      {m.cruza_limite && (
        <div style={{ marginTop: 5, fontSize: 11, color: colors.red }}>
          cruza o limite {m.periodo_cruzamento ? `em ${m.periodo_cruzamento}` : ''}
        </div>
      )}
    </div>
  );
}
