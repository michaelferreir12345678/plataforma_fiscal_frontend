/**
 * Resultado Fiscal (Módulo 8). A Sprint 25B acrescentou o que faltava (auditoria §2.7):
 * série multi-exercício, memória de cálculo em diálogo, exportação e a **meta da LDO** —
 * oficial (Anexo 6) ou cadastrada pela organização quando o ente não a publica (§11.5).
 */
import { NotaMetodologica } from '../components/NotaMetodologica';
import { useState, type FormEvent } from 'react';
import { colors } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { PageHeader } from '../components/PageHeader';
import { MetricHeader } from '../components/MetricHeader';
import { SectionLabel } from '../components/SectionLabel';
import { Async, Skeleton } from '../components/AsyncState';
import { FonteChip } from '../components/FonteChip';
import { SeloQualidadePagina } from '../components/SeloQualidade';
import { MemoriaDialog, LinhaMemoria } from '../components/MemoriaDialog';
import { SerieChart } from '../components/SerieChart';
import { ExportButton } from '../components/ExportButton';
import { PrintButton } from '../components/PrintButton';
import { useApp, useResource, type Resource } from '../context/AppContext';
import {
  fetchMe,
  fetchResultado,
  fetchResultadoCascata,
  fetchResultadoMemoria,
  fetchResultadoReconciliacao,
  fetchResultadoMeta,
  salvarMetaFiscal,
  type CascataPasso,
  type FiscalDecimal,
  type MetaResultado,
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
  const { ente, periodo, periodosRreo } = useApp();
  const me = useResource(fetchMe, []);
  const podeAdministrar = (me.data?.org_ativa?.capacidades ?? []).includes('administrar');
  const ultimoPeriodo = periodosRreo.length ? periodosRreo[periodosRreo.length - 1] : null;
  const pular = { pular: !periodo };
  const det = useResource(() => fetchResultado(ente.cod_ibge, periodo), [ente.cod_ibge, periodo], pular);
  // Sub-cards "pinados" no as_of que o cabeçalho já resolveu (§6.5, padrão de Dívida):
  // só disparam depois que `det` chega, e usam exatamente a mesma versão — uma
  // retificação no meio do carregamento não pode misturar versões na mesma tela.
  const asOf = det.data?.as_of ?? null;
  const subPular = { pular: !periodo || !det.data };
  const cas = useResource(
    () => fetchResultadoCascata(ente.cod_ibge, periodo, asOf),
    [ente.cod_ibge, periodo, asOf],
    subPular,
  );
  const rec = useResource(
    () => fetchResultadoReconciliacao(ente.cod_ibge, periodo, asOf),
    [ente.cod_ibge, periodo, asOf],
    subPular,
  );
  const meta = useResource(
    () => fetchResultadoMeta(ente.cod_ibge, periodo, asOf),
    [ente.cod_ibge, periodo, asOf],
    subPular,
  );

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Detalhe · Resultado Fiscal">
      <PageHeader
        title="Resultado Fiscal"
        context={`${ente.nome} · ${periodo || 'sem período selecionado'} · resultados primário e nominal`}
        source="RREO Anexo 6 · SICONFI"
        breadcrumb={(
          <Breadcrumb
            crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Análise por bloco' }, { label: 'Resultado' }]}
          />
        )}
        actions={<PrintButton />}
      />

      <SeloQualidadePagina />

      <Async res={det}>
        {(d) => {
          const primario = n(d.valores.resultado_primario);
          const nominal = n(d.valores.resultado_nominal);
          return (
            <>
              <MetricHeader
                label={`Resultado primário (com RPPS) · ${d.periodo}`}
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
                    {/* U27: "(com RPPS)"/"(sem RPPS)" movidos para o número principal — a
                        NotaRpps abaixo continua existindo, mas o regime não pode depender
                        de o gestor abrir um card recolhido para saber qual apuração está
                        vendo. */}
                    <div style={{ fontSize: 11, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                      Resultado nominal (sem RPPS) · variação da dívida
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 600, color: cor(nominal) }}>
                      {M(d.valores.resultado_nominal)}
                    </div>
                    <div style={{ fontSize: 11, color: colors.muted, marginTop: 6, lineHeight: 1.45 }}>
                      = primário (com RPPS) − juros líquidos {M(d.valores.juros_liquidos)}. DCL{' '}
                      {M(d.valores.dcl_inicio)} → {M(d.valores.dcl_fim)} (variação {M(d.valores.variacao_dcl)}).
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
                        <div style={{ fontSize: 11, color: colors.muted, marginTop: 6, lineHeight: 1.45 }}>
                          Cruzamento com Dívida (RGF {r.dcl_sprint8_periodo ?? '—'}): DCL Anexo 6 {M(r.dcl_fim)} vs Dívida{' '}
                          {M(r.dcl_sprint8)}{' '}
                          {r.concilia_com_sprint8 === null ? '(indisponível)' : r.concilia_com_sprint8 ? '· concilia ✓' : '· diverge ⚠'}
                        </div>
                        {/* A nota vive aqui, e não numa página de metodologia: é neste
                            card que a divergência acima × abaixo aparece, e parte dela é
                            diferença de escopo (com/sem RPPS), não erro do ente. */}
                        <NotaRpps />
                      </div>
                    )}
                  </Async>
                </Card>

                <MetaCard
                  meta={meta}
                  cod={d.cod_ibge}
                  periodo={d.periodo}
                  podeAdministrar={podeAdministrar}
                />
              </div>

              {/* Série, memória de cálculo, proveniência e exportação. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <FonteChip source={d.source_ref} asOf={d.as_of} ultimoPeriodo={ultimoPeriodo} />
                <div style={{ flex: 1 }} />
                <MemoriaResultadoDialog cod={d.cod_ibge} periodo={d.periodo} asOf={d.as_of} />
                <ExportButton
                  nome="Resultado fiscal — série"
                  linhas={d.serie}
                  colunas={[
                    { cabecalho: 'periodo', valor: (l) => l.periodo },
                    { cabecalho: 'resultado_primario', valor: (l) => n(l.resultado_primario) },
                    { cabecalho: 'resultado_nominal', valor: (l) => n(l.resultado_nominal) },
                    { cabecalho: 'resultado_primario_real', valor: (l) => n(l.resultado_primario_real) },
                    { cabecalho: 'populacao', valor: (l) => l.populacao },
                  ]}
                  contexto={{
                    ente: `${ente.nome} (${d.cod_ibge})`,
                    periodo: d.periodo,
                    fonte: `${d.source_ref.relatorio} ${d.source_ref.anexo ?? ''} v${d.source_ref.versao_entrega}`.trim(),
                  }}
                />
              </div>

              <Card>
                <SerieChart
                  titulo="O resultado primário melhorou de verdade? · série multi-exercício"
                  medida="Resultado primário"
                  pontos={d.serie.map((s) => ({
                    periodo: s.periodo,
                    nominal: n(s.resultado_primario),
                    real: n(s.resultado_primario_real),
                    perCapita: n(s.resultado_primario_per_capita),
                    populacao: s.populacao,
                  }))}
                  ajuste={d.serie_ajuste}
                  destaque={d.periodo}
                  nota="Resultado acumulado no exercício: comparar sempre com o mesmo bimestre de anos anteriores."
                />
              </Card>
            </>
          );
        }}
      </Async>
    </div>
  );
}

/**
 * Meta fiscal: oficial (A6) ou cadastrada pela organização (§11.5 da auditoria).
 * A meta manual é sempre rotulada e **não sai desta tela** — não entra em agregado de
 * carteira/UF nem em relatório institucional.
 */
function MetaCard({
  meta,
  cod,
  periodo,
  podeAdministrar,
}: {
  meta: Resource<MetaResultado>;
  cod: string;
  periodo: string;
  podeAdministrar: boolean;
}) {
  const [editando, setEditando] = useState(false);
  return (
    <Card>
      <SectionLabel note="realizado × meta (LDO)">Meta fiscal</SectionLabel>
      <Async res={meta} skeleton={<Skeleton linhas={3} />}>
        {(mt) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
            <OrigemMeta origem={mt.origem} />
            {/* U28: antes, `mt.resumo.informada` (true também quando só a meta NOMINAL
                existe) abria este bloco e ele só sabia desenhar linhas de primário — um
                ente que publica só meta nominal via "Meta de resultado primário —",
                indistinguível de não ter meta nenhuma. Os dois blocos agora aparecem
                cada um por sua própria presença. */}
            {mt.resumo.meta_primario != null || mt.resumo.meta_nominal != null ? (
              <>
                {mt.resumo.meta_primario != null && (
                  <>
                    <Linha k="Meta de resultado primário" v={M(mt.resumo.meta_primario)} />
                    <Linha k="Realizado (primário)" v={M(mt.resumo.realizado_primario)} />
                    <Linha k="Projeção de fechamento" v={M(mt.projecao_primario)} />
                    <Linha k="Esforço necessário" v={M(mt.esforco_necessario)} total />
                    <span
                      style={{
                        alignSelf: 'flex-start',
                        fontSize: 11,
                        fontWeight: 600,
                        color: mt.resumo.atingido_primario ? colors.green : colors.orange,
                        background: mt.resumo.atingido_primario ? colors.greenBg : colors.orangeBg,
                        padding: '2px 8px',
                        borderRadius: 3,
                      }}
                    >
                      {mt.resumo.atingido_primario ? 'Meta atingida' : 'Abaixo da meta'}
                    </span>
                  </>
                )}
                {mt.resumo.meta_nominal != null && (
                  <>
                    <Linha k="Meta de resultado nominal" v={M(mt.resumo.meta_nominal)} />
                    <Linha k="Realizado (nominal)" v={M(mt.resumo.realizado_nominal)} />
                  </>
                )}
              </>
            ) : (
              <div style={{ color: colors.muted, lineHeight: 1.5 }}>{mt.observacao}</div>
            )}
            {mt.origem === 'manual' && mt.cadastros.length > 0 && (
              <div style={{ fontSize: 11, color: colors.muted, lineHeight: 1.45 }}>
                {mt.cadastros.map((c) => (
                  <div key={c.id}>
                    {c.indicador === 'primario' ? 'Primário' : 'Nominal'} {M(c.valor)} · fonte
                    declarada: {c.fonte_declarada} · atualizada em{' '}
                    {new Date(c.atualizado_em).toLocaleDateString('pt-BR')}
                  </div>
                ))}
              </div>
            )}
            {mt.origem !== 'a6' && podeAdministrar && (
              <div>
                {editando ? (
                  <FormMetaFiscal
                    cod={cod}
                    periodo={periodo}
                    onPronto={() => {
                      setEditando(false);
                      meta.reload();
                    }}
                    onCancelar={() => setEditando(false)}
                  />
                ) : (
                  <button type="button" onClick={() => setEditando(true)} style={botaoSecundario}>
                    {mt.origem === 'manual' ? 'editar meta da LDO' : 'cadastrar meta da LDO'}
                  </button>
                )}
              </div>
            )}
            <FonteChip
              source={mt.source_ref}
              nota={mt.origem === 'manual' ? 'meta declarada pela organização' : undefined}
            />
          </div>
        )}
      </Async>
    </Card>
  );
}

function OrigemMeta({ origem }: { origem: MetaResultado['origem'] }) {
  const cfg = {
    a6: { texto: 'Oficial · RREO Anexo 6', fg: colors.green, bg: colors.greenBg },
    manual: { texto: 'Cadastro da organização · não sai desta tela', fg: colors.orange, bg: colors.orangeBg },
    ausente: { texto: 'Sem meta publicada nem cadastrada', fg: colors.neutral, bg: colors.neutralBg },
  }[origem];
  return (
    <span
      style={{
        alignSelf: 'flex-start',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: cfg.fg,
        background: cfg.bg,
        padding: '2px 8px',
        borderRadius: 3,
      }}
    >
      {cfg.texto}
    </span>
  );
}

function FormMetaFiscal({
  cod,
  periodo,
  onPronto,
  onCancelar,
}: {
  cod: string;
  periodo: string;
  onPronto: () => void;
  onCancelar: () => void;
}) {
  const exercicio = Number(periodo.slice(0, 4));
  const [valor, setValor] = useState('');
  const [fonte, setFonte] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    const numeroValor = Number(valor.replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(numeroValor)) {
      setErro('Informe a meta em R$ (pode ser negativa).');
      return;
    }
    if (fonte.trim().length < 3) {
      setErro('Diga de onde veio o número (ex.: "LDO 2024, Anexo de Metas Fiscais").');
      return;
    }
    setBusy(true);
    setErro(null);
    try {
      await salvarMetaFiscal(cod, {
        exercicio,
        indicador: 'primario',
        valor: numeroValor,
        fonte_declarada: fonte.trim(),
      });
      onPronto();
    } catch (err) {
      const e2 = err as { detail?: string; message?: string };
      setErro(e2.detail || e2.message || 'Falha ao salvar a meta');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
      <label style={{ fontSize: 11, color: colors.muted, display: 'flex', flexDirection: 'column', gap: 3 }}>
        Meta de resultado primário do exercício {exercicio} (R$)
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          aria-label="Meta de resultado primário em reais"
          placeholder="ex.: 150000000 ou -80000000"
          style={inputStyle}
        />
      </label>
      <label style={{ fontSize: 11, color: colors.muted, display: 'flex', flexDirection: 'column', gap: 3 }}>
        Fonte declarada (obrigatória — é o que torna o número auditável)
        <input
          value={fonte}
          onChange={(e) => setFonte(e.target.value)}
          aria-label="Fonte declarada da meta"
          placeholder="LDO 2024, Anexo de Metas Fiscais, art. 3º"
          style={inputStyle}
        />
      </label>
      {erro && <div style={{ fontSize: 11, color: colors.red }}>{erro}</div>}
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="submit" disabled={busy} style={botaoPrimario}>
          {busy ? 'salvando…' : 'salvar meta'}
        </button>
        <button type="button" onClick={onCancelar} style={botaoSecundario}>
          cancelar
        </button>
      </div>
      <div style={{ fontSize: 11, color: colors.faint, lineHeight: 1.45 }}>
        A meta cadastrada vale só nas telas deste ente: fica fora de comparações agregadas e
        de relatórios institucionais, e o registro é auditado.
      </div>
    </form>
  );
}

/**
 * A assimetria do RPPS, dita onde ela produz efeito.
 *
 * O Anexo 6 publica **duas** apurações do resultado, e a plataforma usa uma para o
 * primário e outra para o nominal — porque é assim que o demonstrativo as publica. Sem
 * dizer isso, o gestor vê acima e abaixo da linha não fecharem e conclui que o ente errou
 * a apuração, quando parte da diferença é de escopo.
 */
function NotaRpps() {
  return (
    <NotaMetodologica
      titulo="O que muda com e sem RPPS — e por que os dois aparecem juntos"
      fundamento="RREO Anexo 6 (Demonstrativo do Resultado Primário e Nominal) · LRF art. 53, III"
    >
      <p style={{ margin: 0 }}>
        O <strong>RPPS</strong> é o Regime Próprio de Previdência Social do ente — o fundo que
        paga aposentadorias e pensões dos servidores efetivos, com receita própria de
        contribuições.
      </p>
      <p style={{ margin: 0 }}>
        O Anexo 6 publica duas apurações. <strong>Com RPPS</strong>, entram nas receitas
        primárias as contribuições previdenciárias e, nas despesas, os benefícios pagos pelo
        regime. <strong>Sem RPPS</strong>, os dois lados são expurgados. A escolha não é da
        plataforma: é a do demonstrativo.
      </p>
      <p style={{ margin: 0 }}>
        Aqui o resultado <strong>primário</strong> vem da linha <strong>com</strong> RPPS; o{' '}
        <strong>nominal</strong> e o cálculo <strong>abaixo da linha</strong>, das linhas{' '}
        <strong>sem</strong> RPPS. Parte da divergência entre acima e abaixo da linha decorre
        dessa diferença de escopo — e não de erro de apuração do ente.
      </p>
    </NotaMetodologica>
  );
}

function MemoriaResultadoDialog({
  cod,
  periodo,
  asOf,
}: {
  cod: string;
  periodo: string;
  asOf: string | null;
}) {
  return (
    <MemoriaDialog
      titulo="Memória de cálculo · Resultado fiscal"
      subtitulo={`${cod} · ${periodo}`}
      carregar={() => fetchResultadoMemoria(cod, periodo, asOf)}
      deps={[cod, periodo, asOf]}
    >
      {(m) => (
        <div>
          <LinhaMemoria rotulo="Resultado primário">{m.formula_primario}</LinhaMemoria>
          <LinhaMemoria rotulo="Resultado nominal (acima)">{m.formula_nominal}</LinhaMemoria>
          <LinhaMemoria rotulo="Resultado nominal (abaixo)">{m.formula_nominal_abaixo}</LinhaMemoria>
          <LinhaMemoria rotulo="Identidade do primário">
            {m.identidade_primario_ok === null ? 'sem base para verificar' : m.identidade_primario_ok ? '✓ fecha' : '✗ não fecha'}
          </LinhaMemoria>
          <LinhaMemoria rotulo="Identidade nominal × ΔDCL">
            {m.identidade_nominal_dcl_ok === null ? 'sem base para verificar' : m.identidade_nominal_dcl_ok ? '✓ fecha' : '✗ não fecha (ver ajustes)'}
          </LinhaMemoria>
          {m.ajustes.map((a) => (
            <LinhaMemoria key={a.codigo} rotulo={`Ajuste · ${a.descricao}`}>{M(a.valor)}</LinhaMemoria>
          ))}
          <div style={{ marginTop: 10 }}>
            <SectionLabel note="medida → linha/coluna no Anexo 6">Origem de cada número</SectionLabel>
            {Object.entries(m.fontes).map(([medida, origem]) => (
              <LinhaMemoria key={medida} rotulo={medida}>{origem}</LinhaMemoria>
            ))}
          </div>
          <FonteChip source={m.source_ref} asOf={m.as_of} />
        </div>
      )}
    </MemoriaDialog>
  );
}

const inputStyle = {
  border: `1px solid ${colors.border}`,
  borderRadius: 4,
  padding: '6px 8px',
  fontSize: 12,
  fontFamily: "'JetBrains Mono', monospace",
} as const;
const botaoPrimario = {
  border: `1px solid ${colors.primary}`,
  background: colors.primary,
  color: colors.bg,
  borderRadius: 4,
  padding: '5px 12px',
  fontSize: 11,
  cursor: 'pointer',
} as const;
const botaoSecundario = {
  border: `1px solid ${colors.border}`,
  background: colors.surface,
  color: colors.ink,
  borderRadius: 4,
  padding: '5px 10px',
  fontSize: 11,
  cursor: 'pointer',
} as const;

function Waterfall({ passos }: { passos: CascataPasso[] }) {
  const vals = passos.map((p) => Math.abs(n(p.acumulado) ?? n(p.valor) ?? 0));
  const max = Math.max(...vals, 1);
  return (
    <>
      <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
      <table className="sr-only">
        <caption>Cascata do resultado fiscal</caption>
        <thead>
          <tr><th scope="col">Etapa</th><th scope="col">Tipo</th><th scope="col">Valor</th><th scope="col">Acumulado</th></tr>
        </thead>
        <tbody>
          {passos.map((passo) => (
            <tr key={passo.rotulo}>
              <th scope="row">{passo.rotulo}</th>
              <td>{passo.tipo}</td>
              <td>{M(passo.valor)}</td>
              <td>{M(passo.acumulado)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
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
        fontSize: 11,
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
