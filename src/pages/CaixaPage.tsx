/**
 * Restos a Pagar & Caixa (Módulo 9). A Sprint 25B acrescentou o que a auditoria (§2.8)
 * apontou como ocioso: a vista dedicada de **RP sem lastro**, a **árvore por fonte**, a
 * **série** multi-exercício, a **memória de cálculo** e a exportação.
 */
import { colors } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { PageHeader } from '../components/PageHeader';
import { MetricHeader } from '../components/MetricHeader';
import { SectionLabel } from '../components/SectionLabel';
import { Async, EmptyState, Skeleton } from '../components/AsyncState';
import { FonteChip } from '../components/FonteChip';
import { MemoriaDialog, LinhaMemoria } from '../components/MemoriaDialog';
import { SerieChart } from '../components/SerieChart';
import { ExportButton } from '../components/ExportButton';
import { ArvoreDrill } from '../components/ArvoreDrill';
import { useApp, useResource } from '../context/AppContext';
import {
  fetchCaixa,
  fetchCaixaArvore,
  fetchCaixaMemoria,
  fetchCaixaRpnpSemLastro,
  fetchCaixaSuficiencia,
  fetchCaixaArt42,
  type Art42Out,
  type FiscalDecimal,
  type FonteSuficienciaItem,
  type RapOrgaoItem,
} from '../services/backend';
import { fmt } from '../utils/format';
import { Termo } from '../components/NotaMetodologica';

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
  const { ente, periodoRgf, periodosRgf, carregandoContexto } = useApp();
  const ultimoPeriodo = periodosRgf.length ? periodosRgf[periodosRgf.length - 1] : null;
  // Enquanto o contexto procura o período, esperar é honesto. Depois que ele termina
  // sem achar RGF para o ente, esperar vira promessa falsa — vira ausência declarada.
  const pular = {
    pular: !periodoRgf,
    indisponivel: carregandoContexto ? undefined : (
      <EmptyState
        ente={ente.nome}
        periodo="sem período de RGF"
        detalhe="Caixa e restos a pagar vêm do RGF (Anexo 5) e do RREO (Anexo 7). Este ente não tem entrega de RGF ingerida — sem ela não há disponibilidade por fonte a apurar."
      />
    ),
  };
  const suf = useResource(
    () => fetchCaixaSuficiencia(ente.cod_ibge, periodoRgf),
    [ente.cod_ibge, periodoRgf],
    pular,
  );
  const det = useResource(
    () => fetchCaixa(ente.cod_ibge, periodoRgf),
    [ente.cod_ibge, periodoRgf],
    pular,
  );
  const art = useResource(
    () => fetchCaixaArt42(ente.cod_ibge, periodoRgf),
    [ente.cod_ibge, periodoRgf],
    pular,
  );

  return (
    <div
      className="fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      data-screen-label="Detalhe · Restos a Pagar e Caixa"
    >
      <PageHeader
        title="Restos a Pagar & Caixa"
        context={`${ente.nome} · ${periodoRgf || 'sem período selecionado'} · disponibilidade por fonte e Art. 42`}
        source="RGF Anexo 5 · RREO Anexo 7 · SICONFI"
        breadcrumb={(
          <Breadcrumb
            crumbs={[
              { label: 'Dashboard', to: '/dashboard' },
              { label: 'Análise por bloco' },
              { label: 'Restos a Pagar & Caixa' },
            ]}
          />
        )}
      />

      <Async res={suf}>
        {(s) => {
          const insuf = s.resumo.n_insuficientes;
          return (
            <>
              {/* O rótulo diz **o que o número é**. "Disponibilidade de caixa líquida"
                  prometia a posição do ente e entregava só a soma das fontes
                  superavitárias — a ressalva vivia em 11px, depois do número, e o gestor
                  lia "tenho R$ X em caixa". O déficit agora aparece ao lado, porque são
                  os dois lados juntos que descrevem a posição. */}
              <MetricHeader
                label={`Disponibilidade das fontes superavitárias · ${s.periodo}`}
                value={M(s.resumo.total_disp_liquida_apos_positiva)}
                context={
                  <span>
                    após inscrição em{' '}
                    <Termo sigla="RPNP">
                      <b>Restos a Pagar Não Processados.</b> Despesa empenhada e não liquidada
                      até 31/12 — o serviço não foi atestado, mas o compromisso já existe e
                      consome caixa do exercício seguinte. Inscrevê-la sem disponibilidade
                      financeira que a lastreie é o que a LRF (art. 42) veda no fim de mandato.
                    </Termo>{' '}
                    · <b>{s.resumo.n_fontes} fontes</b> · a análise é fonte a
                    fonte, nunca consolidada (LRF art. 50, I) · fonte {s.source_ref.relatorio}{' '}
                    {s.source_ref.anexo} v{s.source_ref.versao_entrega}
                  </span>
                }
                right={
                  <div style={{ display: 'flex', gap: 16 }}>
                    <StatBox
                      label="Déficit das demais fontes"
                      value={M(s.resumo.total_disp_liquida_apos_negativa)}
                      sub="não compensa o superávit: a suficiência é por fonte"
                      fg={colors.red}
                      bg={colors.redBg}
                    />
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
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.muted }}>
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

              {/* Sprint 25B: RP sem lastro dedicado, árvore por fonte, série e memória */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <FonteChip source={s.source_ref} asOf={s.as_of} ultimoPeriodo={ultimoPeriodo} />
                <div style={{ flex: 1 }} />
                <MemoriaCaixaDialog cod={ente.cod_ibge} periodo={periodoRgf} />
                <ExportButton
                  nome="Caixa — suficiência por fonte"
                  linhas={s.itens}
                  colunas={[
                    { cabecalho: 'fonte_codigo', valor: (l) => l.fonte_codigo },
                    { cabecalho: 'descricao', valor: (l) => l.descricao },
                    { cabecalho: 'vinculada', valor: (l) => (l.vinculada ? 'sim' : 'não') },
                    { cabecalho: 'disp_liquida_antes', valor: (l) => n(l.disp_liquida_antes) },
                    { cabecalho: 'rpnp_exercicio', valor: (l) => n(l.rpnp_exercicio) },
                    { cabecalho: 'disp_liquida_apos', valor: (l) => n(l.disp_liquida_apos) },
                    { cabecalho: 'status', valor: (l) => l.status },
                  ]}
                  contexto={{
                    ente: `${ente.nome} (${ente.cod_ibge})`,
                    periodo: periodoRgf,
                    fonte: `${s.source_ref.relatorio} ${s.source_ref.anexo ?? ''} v${s.source_ref.versao_entrega}`.trim(),
                  }}
                  modeloRelatorio="conformidade"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 12 }}>
                <RpnpSemLastroCard cod={ente.cod_ibge} periodo={periodoRgf} />
                <Card>
                  <SectionLabel note="abra um grupo para ver as fontes que o compõem">
                    Disponibilidade por fonte de recursos
                  </SectionLabel>
                  <ArvoreDrill
                    carregar={(node) =>
                      fetchCaixaArvore(ente.cod_ibge, { periodo: periodoRgf, node: node ?? undefined })
                    }
                    deps={[ente.cod_ibge, periodoRgf]}
                    rotuloRaiz="Total dos recursos"
                    colunas={[
                      { chave: 'disp_liquida_antes', rotulo: 'Disp. antes' },
                      { chave: 'rpnp_exercicio', rotulo: 'RPNP' },
                      { chave: 'disp_liquida_apos', rotulo: 'Disp. após', barra: true },
                    ]}
                    vazio="Esta fonte não desdobra em subfontes no Anexo 5 publicado."
                  />
                </Card>
              </div>

              <Async res={det} skeleton={<Skeleton linhas={4} />}>
                {(d) => (
                  <Card>
                    <SerieChart
                      titulo="O RP sem lastro está crescendo? · série RGF multi-exercício"
                      medida="RPNP sem lastro"
                      pontos={d.serie.map((item) => ({
                        periodo: item.periodo,
                        nominal: n(item.rpnp_sem_lastro_total),
                        real: n(item.rpnp_sem_lastro_real),
                        perCapita: n(item.rpnp_sem_lastro_per_capita),
                        populacao: item.populacao,
                      }))}
                      ajuste={d.serie_ajuste}
                      destaque={d.periodo}
                      nota="Restos a pagar não processados sem disponibilidade de caixa não contam na apuração dos mínimos (saúde/educação)."
                    />
                  </Card>
                )}
              </Async>
            </>
          );
        }}
      </Async>
    </div>
  );
}

/** Endpoint ocioso até a Sprint 25B: a vista dedicada do RP sem lastro, fonte a fonte. */
function RpnpSemLastroCard({ cod, periodo }: { cod: string; periodo: string }) {
  const res = useResource(() => fetchCaixaRpnpSemLastro(cod, periodo), [cod, periodo]);
  return (
    <Card>
      <SectionLabel note="empenhado e inscrito sem caixa que o lastreie">
        Restos a pagar sem lastro · fonte a fonte
      </SectionLabel>
      <Async
        res={res}
        skeleton={<Skeleton linhas={4} />}
        vazio={{
          quando: (r) => r.itens.length === 0,
          render: (
            <div style={{ fontSize: 12, color: colors.green, lineHeight: 1.5 }}>
              Nenhuma fonte inscreveu restos a pagar não processados além da disponibilidade de
              caixa neste período.
            </div>
          ),
        }}
      >
        {(r) => (
          <>
            <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
              <ValorDestaque rotulo="Total sem lastro" valor={M(r.total_rpnp_sem_lastro)} cor={colors.red} />
              <ValorDestaque rotulo="Em fontes vinculadas" valor={M(r.total_vinculada)} cor={colors.orange} />
              <ValorDestaque rotulo="Em fontes não vinculadas" valor={M(r.total_nao_vinculada)} cor={colors.neutral} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <caption className="sr-only">Restos a pagar sem lastro por fonte de recursos</caption>
              <thead>
                <tr style={{ fontSize: 11, color: colors.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  <th scope="col" style={{ textAlign: 'left', padding: '6px 4px' }}>Fonte</th>
                  <th scope="col" style={{ textAlign: 'right', padding: '6px 4px' }}>RPNP inscrito</th>
                  <th scope="col" style={{ textAlign: 'right', padding: '6px 4px' }}>Disp. antes</th>
                  <th scope="col" style={{ textAlign: 'right', padding: '6px 4px' }}>Sem lastro</th>
                </tr>
              </thead>
              <tbody>
                {r.itens.map((item) => (
                  <tr key={item.fonte_codigo} style={{ borderBottom: `1px dashed ${colors.borderSoft}` }}>
                    <td style={{ padding: '7px 4px' }}>
                      {item.descricao}
                      {item.vinculada && (
                        <span style={{ fontSize: 11, marginLeft: 6, padding: '1px 5px', background: colors.neutralBg, color: colors.muted, borderRadius: 2, fontWeight: 600 }}>
                          VINCULADA
                        </span>
                      )}
                    </td>
                    <td style={{ ...mono, padding: '7px 4px' }}>{M(item.rpnp_exercicio)}</td>
                    <td style={{ ...mono, padding: '7px 4px', color: colors.muted }}>{M(item.disp_liquida_antes)}</td>
                    <td style={{ ...mono, padding: '7px 4px', color: colors.red, fontWeight: 600 }}>{M(item.rpnp_sem_lastro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: colors.muted, marginTop: 8, lineHeight: 1.45 }}>{r.observacao}</div>
            <FonteChip source={r.source_ref} asOf={r.as_of} />
          </>
        )}
      </Async>
    </Card>
  );
}

function ValorDestaque({ rotulo, valor, cor }: { rotulo: string; valor: string; cor: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
        {rotulo}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: cor }}>{valor}</div>
    </div>
  );
}

function MemoriaCaixaDialog({ cod, periodo }: { cod: string; periodo: string }) {
  return (
    <MemoriaDialog
      titulo="Memória de cálculo · Caixa e Restos a Pagar"
      subtitulo={`${cod} · ${periodo}`}
      carregar={() => fetchCaixaMemoria(cod, periodo)}
      deps={[cod, periodo]}
    >
      {(m) => (
        <div>
          <LinhaMemoria rotulo="Disponibilidade líquida (antes)">{m.formula_liquida_antes}</LinhaMemoria>
          <LinhaMemoria rotulo="Disponibilidade líquida (após)">{m.formula_liquida_apos}</LinhaMemoria>
          <LinhaMemoria rotulo="RPNP sem lastro">{m.formula_rpnp_sem_lastro}</LinhaMemoria>
          <LinhaMemoria rotulo="Regra de suficiência">{m.regra_suficiencia}</LinhaMemoria>
          <LinhaMemoria rotulo="Total sem lastro">{M(m.total_rpnp_sem_lastro)}</LinhaMemoria>
          <LinhaMemoria rotulo="Fontes analisadas">{String(m.fontes.length)}</LinhaMemoria>
          <LinhaMemoria rotulo="Versão de entrega">{m.versao_entrega}</LinhaMemoria>
          <FonteChip source={m.source_ref} asOf={m.as_of} />
        </div>
      )}
    </MemoriaDialog>
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
          <span style={{ fontSize: 11, padding: '1px 5px', background: colors.neutralBg, color: colors.muted, borderRadius: 2, fontWeight: 600, letterSpacing: '0.04em' }}>
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
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 3, fontWeight: 600, background: sem.bg, color: sem.fg, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
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
          <span style={{ fontSize: 11, padding: '1px 6px', background: colors.neutralBg, color: colors.muted, borderRadius: 2, fontWeight: 600 }}>
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
        <span style={{ fontSize: 11, padding: '1px 6px', background: colors.redBg, color: colors.red, borderRadius: 2, fontWeight: 600, letterSpacing: '0.04em' }}>
          FIM DE MANDATO {a.ano}
        </span>
      </div>
      <div style={{ fontSize: 11, color: colors.muted, marginBottom: 14, lineHeight: 1.45 }}>{a.observacao}</div>
      <div style={{ textAlign: 'center', padding: 14, background: atende ? colors.greenBg : '#FDF4F4', borderRadius: 6 }}>
        <div style={{ fontSize: 11, color: atende ? colors.green : '#A33', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
          {atende ? 'Todas as fontes com lastro' : 'Fontes sem lastro'}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 30, fontWeight: 700, color: atende ? colors.green : colors.red, marginTop: 4 }}>
          {atende ? '✓' : a.n_descumprimentos}
        </div>
        <div style={{ fontSize: 11, color: colors.muted }}>
          {/* U29: o painel calculava o quadrimestre avaliado e não o exibia — só o
              booleano dentro/fora da janela. Sem o período, dois exercícios de fim de
              mandato ficam indistinguíveis na mesma tela. */}
          {a.quadrimestre != null ? `${a.ano}-Q${a.quadrimestre} · ` : ''}
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
          <caption className="sr-only">Restos a pagar por poder ou órgão</caption>
          <thead>
            <tr style={{ fontSize: 11, color: colors.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <th scope="col" style={{ textAlign: 'left', padding: '6px 4px' }}>Poder / órgão</th>
              <th scope="col" style={{ textAlign: 'right', padding: '6px 4px' }}>RP processados</th>
              <th scope="col" style={{ textAlign: 'right', padding: '6px 4px' }}>RP não processados</th>
              <th scope="col" style={{ textAlign: 'right', padding: '6px 4px' }}>Saldo total</th>
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
      <div style={{ fontSize: 11, color: fg, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 700, color: fg, marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 11, color: colors.muted, marginTop: 3 }}>{sub}</div>
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
  fontSize: 11,
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
