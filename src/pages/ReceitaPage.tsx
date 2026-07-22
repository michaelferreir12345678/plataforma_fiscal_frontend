import { colors } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { MetricHeader } from '../components/MetricHeader';
import { SectionLabel } from '../components/SectionLabel';
import { Async } from '../components/AsyncState';
import { useApp, useResource } from '../context/AppContext';
import { fetchReceita, fetchDrill, type DrillChild } from '../services/backend';
import { brl, fmt, pct } from '../utils/format';

const M = (v: number | null | undefined) => (v == null ? '—' : brl(v / 1e6));

export function ReceitaPage() {
  const { ente, periodo } = useApp();
  const det = useResource(() => fetchReceita(ente.cod_ibge, periodo), [ente.cod_ibge, periodo]);
  const correntes = useResource(
    () => fetchDrill('receita', ente.cod_ibge, { periodo, node: 'ReceitasCorrentes' }),
    [ente.cod_ibge, periodo],
  );

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Detalhe · Receita">
      <Breadcrumb
        crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Análise por bloco' }, { label: 'Receita' }]}
        source="fonte: RREO Anexo 1 · SICONFI"
      />

      <Async res={det}>
        {(d) => {
          const arrec = d.totais.arrecadado_acum ?? 0;
          const prev = d.totais.previsto_atualizado ?? 0;
          const pctProp = d.dependencia.pct_propria ?? 0;
          const pctTransf = d.dependencia.pct_transferida ?? 0;
          return (
            <>
              <MetricHeader
                label={`Receita arrecadada · ${d.periodo} (acum.)`}
                value={fmt(arrec / 1e6)}
                suffix="M"
                valueColor={colors.primary}
                context={
                  <span>
                    RCL 12m {M(d.rcl_12m)} · realização {d.realizacao_pct != null ? pct(d.realizacao_pct, 1) : '—'} do previsto ·
                    fonte {d.source_ref.relatorio} {d.source_ref.anexo} v{d.source_ref.versao_entrega}
                  </span>
                }
                right={
                  <div>
                    <div style={{ fontSize: 10, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                      Dependência · própria × transferida
                    </div>
                    <div style={{ display: 'flex', height: 26, borderRadius: 4, overflow: 'hidden', border: `1px solid ${colors.border}` }}>
                      <div style={{ width: `${pctProp}%`, background: colors.primary, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 600 }}>
                        Própria {fmt(pctProp, 0)}%
                      </div>
                      <div style={{ width: `${pctTransf}%`, background: colors.orangeSoft, color: colors.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 600 }}>
                        Transferida {fmt(pctTransf, 0)}%
                      </div>
                    </div>
                    <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 8, lineHeight: 1.45 }}>
                      Própria {M(d.dependencia.propria)} · transferida {M(d.dependencia.transferida)}. Dependência
                      alta = fragilidade estrutural mesmo com caixa folgado.
                    </div>
                  </div>
                }
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 12 }}>
                <Card>
                  <SectionLabel note="corrente → origem (drill real)">Composição por origem</SectionLabel>
                  <Async res={correntes}>
                    {(env) => {
                      const origens = [...env.children].sort(
                        (a, b) => (b.measures.arrecadado_acum ?? 0) - (a.measures.arrecadado_acum ?? 0),
                      );
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {origens.map((o) => (
                            <OrigemRow key={o.codigo} o={o} total={arrec} />
                          ))}
                        </div>
                      );
                    }}
                  </Async>
                </Card>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Card>
                    <SectionLabel>Realização · arrecadado ÷ previsto</SectionLabel>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 30, fontWeight: 600, color: colors.orange }}>
                        {d.realizacao_pct != null ? pct(d.realizacao_pct, 1) : '—'}
                      </div>
                      <div style={{ fontSize: 11, color: colors.muted }}>
                        {M(arrec)} de {M(prev)} previstos
                      </div>
                    </div>
                    <div style={{ position: 'relative', height: 14, background: colors.borderSoft, borderRadius: 3, marginTop: 12 }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(d.realizacao_pct ?? 0, 100)}%`, background: colors.orange, borderRadius: 3 }} />
                      <div style={{ position: 'absolute', left: '100%', top: -4, bottom: -4, width: 2, background: colors.primaryDeep }} />
                    </div>
                    <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 10, lineHeight: 1.45 }}>
                      Frustração de receita aciona contingenciamento (art. 9º LRF). Receita não tem teto — tem meta.
                    </div>
                  </Card>

                  <Card>
                    <SectionLabel>Composição por categoria econômica</SectionLabel>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <tbody>
                        {d.composicao.map((c) => (
                          <tr key={c.codigo} style={{ borderBottom: `1px dashed ${colors.borderSoft}` }}>
                            <td style={{ padding: '8px 4px' }}>{c.descricao}</td>
                            <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
                              {M(c.measures.arrecadado_acum)}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ borderTop: `2px solid ${colors.primary}`, background: colors.accentSoft }}>
                          <td style={{ padding: '8px 4px', fontWeight: 600 }}>= Total arrecadado</td>
                          <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: colors.primary }}>
                            {M(arrec)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </Card>
                </div>
              </div>
            </>
          );
        }}
      </Async>
    </div>
  );
}

function OrigemRow({ o, total }: { o: DrillChild; total: number }) {
  const valor = o.measures.arrecadado_acum ?? 0;
  const share = total ? (valor / total) * 100 : 0;
  return (
    <div style={{ borderBottom: `1px solid ${colors.rowBorder}`, padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, fontSize: 12.5, fontWeight: 500 }}>{o.descricao}</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500 }}>{M(valor)}</div>
        <div style={{ width: 44, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: colors.muted }}>
          {fmt(share, 1)}%
        </div>
      </div>
      <div style={{ height: 4, background: colors.borderSoft, borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(share, 100)}%`, background: colors.primary }} />
      </div>
    </div>
  );
}
