import { colors } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { MetricHeader } from '../components/MetricHeader';
import { SectionLabel } from '../components/SectionLabel';
import { Async } from '../components/AsyncState';
import { useApp, useResource } from '../context/AppContext';
import {
  fetchResultado,
  fetchResultadoCascata,
  fetchResultadoReconciliacao,
  fetchResultadoMeta,
  type CascataPasso,
  type FiscalDecimal,
} from '../services/backend';
import { fmt } from '../utils/format';

/** Coage FiscalDecimal (string ou número) para número; null-safe. */
const n = (v: FiscalDecimal | null | undefined): number | null =>
  v === null || v === undefined || v === '' ? null : Number(v);
/** R$ milhões com sinal (resultado fiscal tem superávit/déficit). */
const M = (v: FiscalDecimal | null | undefined): string => {
  const x = n(v);
  return x === null ? '—' : `R$ ${fmt(x / 1e6, 1)} M`;
};
const cor = (v: number | null): string =>
  v === null ? colors.muted : v >= 0 ? colors.green : colors.red;

export function ResultadoPage() {
  const { ente, periodo } = useApp();
  const det = useResource(() => fetchResultado(ente.cod_ibge, periodo), [ente.cod_ibge, periodo]);
  const cas = useResource(() => fetchResultadoCascata(ente.cod_ibge, periodo), [ente.cod_ibge, periodo]);
  const rec = useResource(
    () => fetchResultadoReconciliacao(ente.cod_ibge, periodo),
    [ente.cod_ibge, periodo],
  );
  const meta = useResource(() => fetchResultadoMeta(ente.cod_ibge, periodo), [ente.cod_ibge, periodo]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Detalhe · Resultado Fiscal">
      <Breadcrumb
        crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Análise por bloco' }, { label: 'Resultado' }]}
        source="fonte: RREO Anexo 6 · SICONFI"
      />

      <Async res={det}>
        {(d) => {
          const primario = n(d.valores.resultado_primario);
          const nominal = n(d.valores.resultado_nominal);
          return (
            <>
              <MetricHeader
                label={`Resultado primário · ${d.periodo}`}
                value={M(d.valores.resultado_primario)}
                valueColor={cor(primario)}
                context={
                  <span>
                    receita primária {M(d.valores.receita_primaria)} − despesa primária{' '}
                    {M(d.valores.despesa_primaria)} · {primario !== null && primario >= 0 ? 'superávit' : 'déficit'}{' '}
                    primário · fonte {d.source_ref.relatorio} {d.source_ref.anexo} v{d.source_ref.versao_entrega}
                  </span>
                }
                right={
                  <div>
                    <div style={{ fontSize: 10, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                      Resultado nominal (variação da dívida)
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 600, color: cor(nominal) }}>
                      {M(d.valores.resultado_nominal)}
                    </div>
                    <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 6, lineHeight: 1.45 }}>
                      = primário − juros líquidos {M(d.valores.juros_liquidos)}. DCL {M(d.valores.dcl_inicio)} →{' '}
                      {M(d.valores.dcl_fim)} (variação {M(d.valores.variacao_dcl)}).
                    </div>
                  </div>
                }
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Card>
                  <SectionLabel note="receita→−despesa→primário→−juros→nominal">Cascata · acima da linha</SectionLabel>
                  <Async res={cas}>{(c) => <Waterfall passos={c.acima_da_linha} />}</Async>
                </Card>
                <Card>
                  <SectionLabel note="início → variação → fim da DCL">Cascata · abaixo da linha</SectionLabel>
                  <Async res={cas}>{(c) => <Waterfall passos={c.abaixo_da_linha} />}</Async>
                </Card>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                <Card>
                  <SectionLabel note="acima × abaixo da linha · ajustes explicam a divergência">
                    Reconciliação
                  </SectionLabel>
                  <Async res={rec}>
                    {(r) => (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                        <Linha k="Nominal (acima da linha)" v={M(r.nominal_acima)} />
                        <Linha k="Nominal (abaixo, bruto)" v={M(r.nominal_abaixo)} />
                        {r.ajustes.map((a) => (
                          <Linha key={a.codigo} k={`(±) ${a.descricao}`} v={M(a.valor)} sub />
                        ))}
                        <Linha k="Nominal (abaixo, ajustado)" v={M(r.nominal_abaixo_ajustado)} total />
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                          <Badge ok={r.identidade_primario_ok} label="primário = rec − desp" />
                          <Badge ok={r.identidade_nominal_dcl_ok} label="nominal = −ΔDCL" />
                        </div>
                        <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 6, lineHeight: 1.45 }}>
                          Cruzamento com Dívida (RGF {r.dcl_sprint8_periodo ?? '—'}): DCL Anexo 6 {M(r.dcl_fim)} vs Dívida{' '}
                          {M(r.dcl_sprint8)}{' '}
                          {r.concilia_com_sprint8 === null ? '(indisponível)' : r.concilia_com_sprint8 ? '· concilia ✓' : '· diverge ⚠'}
                        </div>
                      </div>
                    )}
                  </Async>
                </Card>

                <Card>
                  <SectionLabel note="realizado × meta (LDO)">Meta fiscal</SectionLabel>
                  <Async res={meta}>
                    {(mt) =>
                      mt.resumo.informada ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                          <Linha k="Meta de resultado primário" v={M(mt.resumo.meta_primario)} />
                          <Linha k="Realizado" v={M(mt.resumo.realizado_primario)} />
                          <Linha k="Projeção de fechamento" v={M(mt.projecao_primario)} />
                          <Linha k="Esforço necessário" v={M(mt.esforco_necessario)} total />
                          <span
                            style={{
                              alignSelf: 'flex-start',
                              fontSize: 10.5,
                              fontWeight: 600,
                              color: mt.resumo.atingido_primario ? colors.green : colors.orange,
                              background: mt.resumo.atingido_primario ? colors.greenBg : colors.orangeBg,
                              padding: '2px 8px',
                              borderRadius: 3,
                            }}
                          >
                            {mt.resumo.atingido_primario ? 'Meta atingida' : 'Abaixo da meta'}
                          </span>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: colors.muted, lineHeight: 1.5 }}>{mt.observacao}</div>
                      )
                    }
                  </Async>
                </Card>
              </div>
            </>
          );
        }}
      </Async>
    </div>
  );
}

function Waterfall({ passos }: { passos: CascataPasso[] }) {
  const vals = passos.map((p) => Math.abs(n(p.acumulado) ?? n(p.valor) ?? 0));
  const max = Math.max(...vals, 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {passos.map((p) => {
        const base = p.tipo === 'subtotal' || p.tipo === 'resultado';
        const v = n(p.valor);
        const w = (Math.abs(n(p.acumulado) ?? v ?? 0) / max) * 100;
        return (
          <div key={p.rotulo} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 150, fontSize: 11, color: base ? colors.ink : colors.muted, fontWeight: base ? 600 : 400 }}>
              {p.rotulo}
            </div>
            <div style={{ flex: 1, height: 12, background: colors.borderSoft, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(w, 100)}%`, background: base ? colors.primary : v !== null && v < 0 ? colors.red : colors.green }} />
            </div>
            <div style={{ width: 96, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: cor(v), fontWeight: base ? 600 : 400 }}>
              {M(p.valor)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Linha({ k, v, sub, total }: { k: string; v: string; sub?: boolean; total?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '5px 0',
        borderTop: total ? `2px solid ${colors.primary}` : 'none',
        borderBottom: total ? 'none' : `1px dashed ${colors.borderSoft}`,
        background: total ? colors.accentSoft : 'transparent',
        paddingLeft: sub ? 12 : 0,
      }}
    >
      <span style={{ color: sub ? colors.muted : colors.ink, fontWeight: total ? 600 : 400 }}>{k}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: total ? 700 : 400 }}>{v}</span>
    </div>
  );
}

function Badge({ ok, label }: { ok: boolean | null; label: string }) {
  const good = ok === true;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: good ? colors.green : ok === false ? colors.red : colors.muted,
        background: good ? colors.greenBg : ok === false ? colors.redBg : colors.neutralBg,
        padding: '2px 7px',
        borderRadius: 3,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {good ? '✓' : ok === false ? '⚠' : '—'} {label}
    </span>
  );
}
