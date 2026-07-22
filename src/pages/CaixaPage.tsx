import { colors } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { MetricHeader } from '../components/MetricHeader';
import { SectionLabel } from '../components/SectionLabel';
import { Async } from '../components/AsyncState';
import { useApp, useResource } from '../context/AppContext';
import {
  fetchCaixa,
  fetchCaixaSuficiencia,
  fetchCaixaArt42,
  type Art42Out,
  type FiscalDecimal,
  type FonteSuficienciaItem,
  type RapOrgaoItem,
} from '../services/backend';
import { fmt } from '../utils/format';

/** Coage FiscalDecimal (string ou número) para número; null-safe. */
const n = (v: FiscalDecimal | null | undefined): number | null =>
  v === null || v === undefined || v === '' ? null : Number(v);
/** R$ milhões (o backend serializa em reais). */
const M = (v: FiscalDecimal | null | undefined): string => {
  const x = n(v);
  return x === null ? '—' : `R$ ${fmt(x / 1e6, 1)} M`;
};

/** Cores por semáforo (verde/amarelo/vermelho) da suficiência. */
const SEM: Record<string, { fg: string; bg: string }> = {
  verde: { fg: colors.green, bg: colors.greenBg },
  amarelo: { fg: colors.orange, bg: colors.orangeBg },
  vermelho: { fg: colors.red, bg: colors.redBg },
};
const STATUS_LABEL: Record<string, string> = {
  suficiente: 'Suficiente',
  insuficiente_rpnp: 'RP sem lastro',
  deficit: 'Déficit de caixa',
};

export function CaixaPage() {
  const { ente, periodoRgf } = useApp();
  const suf = useResource(
    () => fetchCaixaSuficiencia(ente.cod_ibge, periodoRgf),
    [ente.cod_ibge, periodoRgf],
  );
  const det = useResource(() => fetchCaixa(ente.cod_ibge, periodoRgf), [ente.cod_ibge, periodoRgf]);
  const art = useResource(() => fetchCaixaArt42(ente.cod_ibge, periodoRgf), [ente.cod_ibge, periodoRgf]);

  return (
    <div
      className="fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      data-screen-label="Detalhe · Restos a Pagar e Caixa"
    >
      <Breadcrumb
        crumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Análise por bloco' },
          { label: 'Restos a Pagar & Caixa' },
        ]}
        source="fonte: RGF Anexo 5 · RREO Anexo 7 · SICONFI"
      />

      <Async res={suf}>
        {(s) => {
          const insuf = s.resumo.n_insuficientes;
          return (
            <>
              <MetricHeader
                label={`Disponibilidade de caixa líquida · ${s.periodo}`}
                value={M(s.resumo.total_disp_liquida_apos_positiva)}
                context={
                  <span>
                    soma das fontes superavitárias (após inscrição em RPNP) ·{' '}
                    <b>{s.resumo.n_fontes} fontes</b> · a análise é fonte a fonte (nunca consolidada) ·
                    fonte {s.source_ref.relatorio} {s.source_ref.anexo} v{s.source_ref.versao_entrega}
                  </span>
                }
                right={
                  <div style={{ display: 'flex', gap: 16 }}>
                    <StatBox
                      label="Fontes com insuficiência"
                      value={String(insuf)}
                      sub={`de ${s.resumo.n_fontes} fontes${s.resumo.n_deficit ? ` · ${s.resumo.n_deficit} em déficit` : ''}`}
                      fg={insuf ? colors.red : colors.green}
                      bg={insuf ? colors.redBg : colors.greenBg}
                    />
                    <StatBox
                      label="RPNP sem lastro"
                      value={M(s.resumo.total_rpnp_sem_lastro)}
                      sub="não conta nos mínimos · risco art. 359-C CP"
                      fg={colors.orange}
                      bg={colors.orangeBg}
                    />
                  </div>
                }
              />

              {/* Matriz de suficiência por fonte */}
              <Card pad={0}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 18px 12px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Matriz de suficiência financeira por fonte</div>
                  <span style={{ marginLeft: 'auto', fontSize: 10.5, color: colors.muted }}>
                    a análise é <b>fonte a fonte</b> — nunca consolidada (LRF art. 8º)
                  </span>
                </div>
                <div style={header}>
                  <div>Fonte / destinação</div>
                  <div style={{ textAlign: 'right' }}>Disp. líquida</div>
                  <div style={{ textAlign: 'right' }}>RPNP inscrito</div>
                  <div style={{ textAlign: 'right' }}>Resultado</div>
                  <div style={{ textAlign: 'center' }}>Status</div>
                </div>
                {s.itens.map((f) => (
                  <FonteRow key={f.fonte_codigo} f={f} />
                ))}
              </Card>

              {/* Art 42 + Restos a Pagar por poder */}
              <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 12 }}>
                <Async res={art}>{(a) => <Art42Panel a={a} />}</Async>
                <Async res={det}>{(d) => <RapPanel rap={d.rap_por_orgao} consolidado={d.rap_consolidado} periodo={d.periodo_rreo} />}</Async>
              </div>
            </>
          );
        }}
      </Async>
    </div>
  );
}

function FonteRow({ f }: { f: FonteSuficienciaItem }) {
  const sem = SEM[f.semaforo] ?? SEM.verde;
  const apos = n(f.disp_liquida_apos);
  return (
    <div
      style={{
        ...rowGrid,
        background: f.semaforo === 'vermelho' ? '#FDF4F4' : f.semaforo === 'amarelo' ? '#FEF9F0' : 'transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 4, height: 22, background: sem.fg, borderRadius: 2 }} />
        <span style={{ fontWeight: 500 }}>{f.descricao}</span>
        {f.vinculada && (
          <span style={{ fontSize: 8.5, padding: '1px 5px', background: colors.neutralBg, color: colors.muted, borderRadius: 2, fontWeight: 600, letterSpacing: '0.04em' }}>
            VINCULADA
          </span>
        )}
      </div>
      <div style={mono}>{M(f.disp_liquida_antes)}</div>
      <div style={{ ...mono, color: colors.muted }}>{M(f.rpnp_exercicio)}</div>
      <div style={{ ...mono, fontWeight: 600, color: apos !== null && apos < 0 ? colors.red : colors.green }}>
        {apos !== null && apos >= 0 ? '+' : ''}
        {M(f.disp_liquida_apos)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span style={{ fontSize: 9.5, padding: '2px 8px', borderRadius: 3, fontWeight: 600, background: sem.bg, color: sem.fg, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {STATUS_LABEL[f.status] ?? f.status}
        </span>
      </div>
    </div>
  );
}

function Art42Panel({ a }: { a: Art42Out }) {
  if (!a.aplicavel) {
    return (
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Painel do art. 42 LRF</div>
          <span style={{ fontSize: 8.5, padding: '1px 6px', background: colors.neutralBg, color: colors.muted, borderRadius: 2, fontWeight: 600 }}>
            NÃO APLICÁVEL
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: colors.muted, lineHeight: 1.5 }}>{a.observacao}</div>
      </Card>
    );
  }
  const atende = a.atende === true;
  return (
    <Card accent={atende ? colors.green : colors.red} style={{ border: `1px solid ${atende ? '#A9CFA9' : '#E0A0A0'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Painel do art. 42 LRF</div>
        <span style={{ fontSize: 8.5, padding: '1px 6px', background: colors.redBg, color: colors.red, borderRadius: 2, fontWeight: 600, letterSpacing: '0.04em' }}>
          FIM DE MANDATO {a.ano}
        </span>
      </div>
      <div style={{ fontSize: 10.5, color: colors.muted, marginBottom: 14, lineHeight: 1.45 }}>{a.observacao}</div>
      <div style={{ textAlign: 'center', padding: 14, background: atende ? colors.greenBg : '#FDF4F4', borderRadius: 6 }}>
        <div style={{ fontSize: 9.5, color: atende ? colors.green : '#A33', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
          {atende ? 'Todas as fontes com lastro' : 'Fontes sem lastro'}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 30, fontWeight: 700, color: atende ? colors.green : colors.red, marginTop: 4 }}>
          {atende ? '✓' : a.n_descumprimentos}
        </div>
        <div style={{ fontSize: 10.5, color: colors.muted }}>
          {a.janela_vedacao ? 'dentro da janela de vedação (Q2–Q3)' : 'fora da janela de vedação'}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
        <Line k="Fontes analisadas" v={String(a.fontes.length)} />
        <Line k="Fontes em descumprimento" v={String(a.n_descumprimentos)} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, paddingTop: 8, borderTop: `2px solid ${atende ? colors.green : colors.red}` }}>
          <span style={{ fontWeight: 600, color: atende ? colors.green : colors.red }}>Lacuna sem lastro (total)</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: atende ? colors.green : colors.red }}>
            {M(a.total_lacuna)}
          </span>
        </div>
      </div>
    </Card>
  );
}

function RapPanel({ rap, consolidado, periodo }: { rap: RapOrgaoItem[]; consolidado: RapOrgaoItem | null; periodo: string | null }) {
  const rows = consolidado ? [...rap, consolidado] : rap;
  return (
    <Card>
      <SectionLabel note={periodo ? `RREO Anexo 7 · ${periodo}` : 'RREO Anexo 7'}>
        Restos a pagar por poder · saldo a pagar
      </SectionLabel>
      {rows.length === 0 ? (
        <div style={{ fontSize: 12, color: colors.muted }}>Sem RREO Anexo 7 para o período correspondente.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ fontSize: 9.5, color: colors.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <th style={{ textAlign: 'left', padding: '6px 4px' }}>Poder / órgão</th>
              <th style={{ textAlign: 'right', padding: '6px 4px' }}>RP processados</th>
              <th style={{ textAlign: 'right', padding: '6px 4px' }}>RP não processados</th>
              <th style={{ textAlign: 'right', padding: '6px 4px' }}>Saldo total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const total = r.orgao === 'CONSOLIDADO';
              return (
                <tr key={r.orgao} style={{ borderTop: total ? `2px solid ${colors.primary}` : `1px dashed ${colors.borderSoft}`, background: total ? colors.accentSoft : 'transparent' }}>
                  <td style={{ padding: '8px 4px', fontWeight: total ? 700 : 500 }}>{total ? 'Consolidado' : r.orgao}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: colors.muted }}>{M(r.rpp_a_pagar)}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: colors.muted }}>{M(r.rpnp_a_pagar)}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: total ? 700 : 600, color: total ? colors.primary : colors.ink }}>{M(r.saldo_total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function StatBox({ label, value, sub, fg, bg }: { label: string; value: string; sub: string; fg: string; bg: string }) {
  return (
    <div style={{ padding: '12px 16px', background: bg, borderRadius: 6, borderLeft: `3px solid ${fg}` }}>
      <div style={{ fontSize: 9.5, color: fg, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 700, color: fg, marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 10, color: colors.muted, marginTop: 3 }}>{sub}</div>
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
      <span style={{ color: colors.muted }}>{k}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>{v}</span>
    </div>
  );
}

const header = {
  display: 'grid',
  gridTemplateColumns: '1.9fr 1fr 1fr 1fr 1fr',
  padding: '7px 18px',
  background: colors.bg,
  borderTop: `1px solid ${colors.border}`,
  borderBottom: `1px solid ${colors.border}`,
  fontSize: 9.5,
  fontWeight: 600,
  color: colors.muted,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
};
const rowGrid = {
  display: 'grid',
  gridTemplateColumns: '1.9fr 1fr 1fr 1fr 1fr',
  padding: '10px 18px',
  borderBottom: `1px solid ${colors.rowBorder}`,
  fontSize: 12,
  alignItems: 'center' as const,
};
const mono = { fontFamily: "'JetBrains Mono', monospace", textAlign: 'right' as const };
