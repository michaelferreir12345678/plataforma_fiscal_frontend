import { colors } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { MetricHeader } from '../components/MetricHeader';
import { SectionLabel } from '../components/SectionLabel';
import { Async } from '../components/AsyncState';
import { useApp, useResource } from '../context/AppContext';
import { fetchDespesa } from '../services/backend';
import { brl, fmt } from '../utils/format';

const M = (v: number | null | undefined) => (v == null ? '—' : brl(v / 1e6));

export function DespesaPage() {
  const { ente, periodo } = useApp();
  const funcao = useResource(() => fetchDespesa(ente.cod_ibge, periodo, 'funcao'), [ente.cod_ibge, periodo]);
  const natureza = useResource(() => fetchDespesa(ente.cod_ibge, periodo, 'natureza'), [ente.cod_ibge, periodo]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Detalhe · Despesa">
      <Breadcrumb
        crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Análise por bloco' }, { label: 'Despesa' }]}
        source="fonte: RREO Anexo 2 (função) + Anexo 1 (natureza) · SICONFI"
      />

      <Async res={funcao}>
        {(d) => {
          const dot = d.totais.dotacao_atualizada ?? 0;
          const emp = d.totais.empenhado ?? 0;
          const liq = d.totais.liquidado ?? 0;
          const funcoes = [...d.composicao].sort(
            (a, b) => (b.measures.empenhado ?? 0) - (a.measures.empenhado ?? 0),
          );
          const estagios: [string, number, string][] = [
            ['Dotação atualizada', dot, colors.neutral],
            ['Empenhado', emp, colors.primary],
            ['Liquidado', liq, colors.orange],
          ];
          return (
            <>
              <MetricHeader
                label={`Despesa empenhada · ${d.periodo} (acum.)`}
                value={fmt(emp / 1e6)}
                suffix="M"
                valueColor={colors.primary}
                context={
                  <span>
                    dotação {M(dot)} · execução {dot ? fmt((emp / dot) * 100, 1) : '—'}% · fonte{' '}
                    {d.source_ref.relatorio} {d.source_ref.anexo} v{d.source_ref.versao_entrega}
                  </span>
                }
                right={
                  <div>
                    <div style={{ fontSize: 10, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                      Cascata de execução · dotação → empenhado → liquidado
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {estagios.map(([label, valor, cor]) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 130, fontSize: 11, color: colors.muted }}>{label}</div>
                          <div style={{ flex: 1, height: 12, background: colors.borderSoft, borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${dot ? Math.min((valor / dot) * 100, 100) : 0}%`, background: cor }} />
                          </div>
                          <div style={{ width: 92, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{M(valor)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                }
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 12 }}>
                <Card>
                  <SectionLabel note="por função (Portaria 42) — drill real">Composição por função</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {funcoes.map((f) => {
                      const v = f.measures.empenhado ?? 0;
                      const share = emp ? (v / emp) * 100 : 0;
                      return (
                        <div key={f.codigo} style={{ borderBottom: `1px solid ${colors.rowBorder}`, padding: '7px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1, fontSize: 12.5, fontWeight: 500 }}>{f.descricao}</div>
                            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{M(v)}</div>
                            <div style={{ width: 44, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: colors.muted }}>{fmt(share, 1)}%</div>
                          </div>
                          <div style={{ height: 4, background: colors.borderSoft, borderRadius: 2, marginTop: 5, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(share, 100)}%`, background: colors.primary }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <Card>
                  <SectionLabel note="pessoal/juros/amortização = rígida">Rigidez · por natureza</SectionLabel>
                  <Async res={natureza}>
                    {(n) => {
                      const grupos = [...n.composicao]; // categorias
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ fontSize: 11, color: colors.muted }}>
                            Potencial de RAP (empenhado − pago): <strong style={{ color: colors.orange }}>{M(n.potencial_rap)}</strong>
                          </div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <tbody>
                              {grupos.map((g) => (
                                <tr key={g.codigo} style={{ borderBottom: `1px dashed ${colors.borderSoft}` }}>
                                  <td style={{ padding: '7px 4px' }}>{g.descricao}</td>
                                  <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{M(g.measures.empenhado)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div style={{ fontSize: 10.5, color: colors.muted, lineHeight: 1.45 }}>
                            Despesa rígida (pessoal, juros, amortização) limita a margem discricionária do gestor.
                          </div>
                        </div>
                      );
                    }}
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
