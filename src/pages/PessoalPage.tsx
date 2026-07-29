/**
 * Pessoal (Módulo 6) — página nova da Sprint 25B.
 *
 * A auditoria (§2.19) registrou o pior caso do produto: quatro endpoints prontos desde a
 * Sprint 7 e **nenhuma tela**. O indicador-assinatura da LRF (art. 20) não tinha página.
 *
 * As 10 perguntas do domínio e onde cada uma é respondida:
 *  1. "Estou dentro do limite?" → medidor do Executivo com faixa esfera-aware (54%/49%)
 *  2. "Quanto falta para o teto?" → distância em p.p. e em R$ até alerta/prudencial/máximo
 *  3. "Quem gasta o quê?" → por poder (/por-poder), cada um com sua faixa quando há teto
 *  4. "Qual órgão puxa a folha?" → árvore poder → órgão (/arvore, drill §6.1)
 *  5. "O que entra e o que sai da conta?" → memória com as exclusões do art. 19, §1º,
 *     marcando o que é sensível a RPPS (/memoria)
 *  6. "Qual é o denominador?" → RCL 12m com seus componentes e deduções (/rcl)
 *  7. "Para onde a folha vem andando?" → série RGF multi-exercício (nominal/real/per capita)
 *  8. "Para onde vai?" → projeção da Sprint 14 com IC e período de cruzamento do teto
 *  9. "E se eu reajustar a folha?" → simulador de impacto (/limites/pessoal_executivo/simular)
 * 10. "Posso confiar / e se não houver dado?" → FonteChip com versão e estado vazio nomeado
 */
import { useState, type FormEvent } from 'react';
import { colors, font } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { PageHeader } from '../components/PageHeader';
import { SectionLabel } from '../components/SectionLabel';
import { RadialMeter } from '../components/RadialMeter';
import { Async, EmptyState, ErrorBox, Skeleton } from '../components/AsyncState';
import { FonteChip } from '../components/FonteChip';
import { SeloQualidadePagina } from '../components/SeloQualidade';
import { MemoriaDialog, LinhaMemoria } from '../components/MemoriaDialog';
import { SerieChart } from '../components/SerieChart';
import { ExportButton } from '../components/ExportButton';
import { ArvoreDrill, numero } from '../components/ArvoreDrill';
import { useApp, useResource } from '../context/AppContext';
import {
  fetchMe,
  fetchPessoal,
  fetchPessoalArvore,
  fetchPessoalMemoria,
  fetchPessoalPorPoder,
  fetchProjecao,
  fetchRcl,
  simularLimite,
  type PessoalDetalhe,
  type PoderItem,
  type SimularLimiteResponse,
} from '../services/backend';
import { brl, fmt, pct } from '../utils/format';

const INDICADOR_EXECUTIVO = 'pessoal_executivo';

const M = (v: number | string | null | undefined) => {
  const n = numero(v as number | null);
  return n == null ? '—' : brl(n / 1e6);
};
const P = (v: number | string | null | undefined, casas = 2) => {
  const n = numero(v as number | null);
  return n == null ? '—' : pct(n, casas);
};

export function PessoalPage() {
  const { ente, periodoRgf, periodosRgf } = useApp();
  const det = useResource(
    () => fetchPessoal(ente.cod_ibge, periodoRgf),
    [ente.cod_ibge, periodoRgf],
    { pular: !periodoRgf },
  );
  const me = useResource(fetchMe, []);
  const podeAdministrar = (me.data?.org_ativa?.capacidades ?? []).includes('administrar');
  const ultimoPeriodo = periodosRgf.length ? periodosRgf[periodosRgf.length - 1] : null;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Detalhe · Pessoal">
      <PageHeader
        title="Pessoal"
        context={`${ente.nome} · ${periodoRgf || 'sem período selecionado'} · despesa com pessoal e limites da LRF`}
        source="RGF Anexo 1 (Despesa com Pessoal) · SICONFI"
        breadcrumb={(
          <Breadcrumb
            crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Análise por bloco' }, { label: 'Pessoal' }]}
          />
        )}
      />

      <SeloQualidadePagina />

      <Async
        res={det}
        skeleton={<Skeleton linhas={6} altura={22} />}
        vazio={{
          quando: (d) => (d.totais.despesa_liquida ?? null) == null && d.composicao.length === 0,
          render: (
            <EmptyState
              ente={ente.nome}
              periodo={periodoRgf || '—'}
              podeAdministrar={podeAdministrar}
              detalhe="O RGF deste período não trouxe o Anexo 1 (despesa com pessoal) para o ente."
            />
          ),
        }}
      >
        {(d) => <Conteudo key={`${d.cod_ibge}-${d.periodo}`} d={d} enteNome={ente.nome} ultimoPeriodo={ultimoPeriodo} />}
      </Async>
    </div>
  );
}

function Conteudo({
  d,
  enteNome,
  ultimoPeriodo,
}: {
  d: PessoalDetalhe;
  enteNome: string;
  ultimoPeriodo: string | null;
}) {
  const exec = d.executivo;
  const contexto = {
    ente: `${enteNome} (${d.cod_ibge})`,
    periodo: d.periodo,
    fonte: `${d.source_ref.relatorio} ${d.source_ref.anexo ?? ''} v${d.source_ref.versao_entrega}`.trim(),
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 12 }}>
        <ExecutivoCard d={d} exec={exec} />
        <PorPoderCard cod={d.cod_ibge} periodo={d.periodo} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <FonteChip source={d.source_ref} ultimoPeriodo={ultimoPeriodo} nota={`esfera ${d.esfera ?? '—'} · RPPS ${d.rpps ? 'sim' : 'não'}`} />
        <div style={{ flex: 1 }} />
        <MemoriaPessoalDialog cod={d.cod_ibge} periodo={d.periodo} />
        <ExportButton
          nome="Pessoal — série RGF"
          linhas={d.serie}
          colunas={[
            { cabecalho: 'periodo', valor: (l) => l.periodo },
            { cabecalho: 'despesa_liquida', valor: (l) => numero(l.despesa_liquida as number | null) },
            { cabecalho: 'pct_rcl', valor: (l) => numero(l.pct_rcl as number | null) },
            { cabecalho: 'despesa_liquida_real', valor: (l) => numero(l.despesa_liquida_real as number | null) },
            { cabecalho: 'populacao', valor: (l) => l.populacao },
          ]}
          contexto={contexto}
          modeloRelatorio="limites"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 12 }}>
        <Card>
          <SectionLabel note="poder → órgão (drill §6.1)">Quem puxa a folha</SectionLabel>
          <ArvoreDrill
            carregar={(node) =>
              fetchPessoalArvore(d.cod_ibge, { periodo: d.periodo, node: node ?? undefined })
            }
            deps={[d.cod_ibge, d.periodo]}
            rotuloRaiz="Ente"
            colunas={[
              { chave: 'despesa_bruta', rotulo: 'Bruta' },
              { chave: 'exclusoes', rotulo: 'Exclusões' },
              { chave: 'despesa_liquida', rotulo: 'Líquida', barra: true },
              {
                chave: 'pct_rcl',
                rotulo: '% RCL',
                formato: (v) => (v == null ? '—' : `${fmt(v, 2)}%`),
              },
            ]}
            vazio="Este órgão não desdobra em unidades no RGF publicado."
          />
        </Card>
        <RclCard cod={d.cod_ibge} periodoRreo={d.periodo_rreo} rclDoDetalhe={d.rcl_12m} />
      </div>

      <Card>
        <SerieChart
          titulo="A folha cresceu de verdade? · série RGF multi-exercício"
          medida="Despesa líquida com pessoal"
          pontos={d.serie.map((s) => ({
            periodo: s.periodo,
            nominal: numero(s.despesa_liquida as number | null),
            real: numero(s.despesa_liquida_real as number | null),
            perCapita: numero(s.despesa_liquida_per_capita as number | null),
            populacao: s.populacao,
          }))}
          ajuste={d.serie_ajuste}
          destaque={d.periodo}
          nota="A folha é medida contra a RCL (12 meses móveis): olhar só o valor nominal engana quando a RCL cresce junto."
        />
        <div style={{ marginTop: 10 }}>
          <SectionLabel note="mesmo período, em % da RCL">Trajetória contra o teto</SectionLabel>
          <TrilhaPct serie={d.serie} teto={numero(exec?.teto_pct as number | null)} destaque={d.periodo} />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <ProjecaoCard cod={d.cod_ibge} />
        <SimuladorCard cod={d.cod_ibge} periodoRreo={d.periodo_rreo} exec={exec} />
      </div>
    </>
  );
}

/** Pergunta 1 e 2: estou dentro do limite e quanto falta para o teto? */
function ExecutivoCard({ d, exec }: { d: PessoalDetalhe; exec: PoderItem | null }) {
  if (!exec || exec.pct_rcl == null || exec.teto_pct == null) {
    return (
      <Card>
        <SectionLabel>Despesa com pessoal · Poder Executivo</SectionLabel>
        <div style={{ fontSize: 12, color: colors.muted, lineHeight: 1.5 }}>
          O RGF deste período não permite apurar o percentual do Executivo (falta despesa
          líquida ou RCL). Sem base, a plataforma não estima faixa.
        </div>
      </Card>
    );
  }
  const atual = Number(exec.pct_rcl);
  const teto = Number(exec.teto_pct);
  const alerta = teto * 0.9;
  const prudencial = teto * 0.95;
  const rcl = numero(d.rcl_12m as number | null);
  const folgaPp = teto - atual;
  const folgaRs = rcl != null ? (folgaPp / 100) * rcl : null;

  return (
    <Card>
      <SectionLabel note={`teto ${fmt(teto, 0)}% da RCL · esfera ${d.esfera ?? '—'}`}>
        Despesa com pessoal · Poder Executivo
      </SectionLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <RadialMeter atualPct={atual} alerta={alerta} prud={prudencial} max={teto} gaugeMax={Math.max(teto * 1.15, atual * 1.05)} size={210} />
        <div style={{ flex: 1, minWidth: 190, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Linha rotulo="Despesa líquida" valor={M(exec.despesa_liquida)} />
          <Linha rotulo="Despesa bruta" valor={M(exec.despesa_bruta)} />
          <Linha rotulo="Exclusões (art. 19, §1º)" valor={M(exec.exclusoes)} />
          <Linha rotulo="RCL 12m (denominador)" valor={M(d.rcl_12m)} />
          <Linha
            rotulo="Folga até o teto"
            valor={`${fmt(folgaPp, 2)} p.p.${folgaRs != null ? ` · ${brl(folgaRs / 1e6)}` : ''}`}
            destaque={folgaPp <= 0 ? colors.red : folgaPp <= teto * 0.05 ? colors.orange : colors.green}
          />
          <div style={{ fontSize: 11, color: colors.muted, lineHeight: 1.45, marginTop: 4 }}>
            Faixas da LRF: alerta {fmt(alerta, 1)}% (art. 59, §1º, II) · prudencial {fmt(prudencial, 1)}%
            (art. 22, parágrafo único) · máximo {fmt(teto, 0)}% (art. 20).
          </div>
        </div>
      </div>
    </Card>
  );
}

/** Pergunta 3: quem gasta o quê, cada poder com a sua faixa. */
function PorPoderCard({ cod, periodo }: { cod: string; periodo: string }) {
  const res = useResource(() => fetchPessoalPorPoder(cod, periodo), [cod, periodo]);
  return (
    <Card>
      <SectionLabel note="cada poder tem teto próprio; sem teto cadastrado, sem faixa">
        Por poder
      </SectionLabel>
      <Async res={res} skeleton={<Skeleton linhas={4} />}>
        {(pp) => (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <caption className="sr-only">Despesa com pessoal e limites por poder</caption>
              <thead>
                <tr>
                  <th scope="col" style={th}>Poder</th>
                  <th scope="col" style={{ ...th, textAlign: 'right' }}>Líquida</th>
                  <th scope="col" style={{ ...th, textAlign: 'right' }}>% RCL</th>
                  <th scope="col" style={{ ...th, textAlign: 'right' }}>Teto</th>
                  <th scope="col" style={th}>Faixa</th>
                </tr>
              </thead>
              <tbody>
                {[pp.consolidado, ...pp.itens].map((item, i) => (
                  <tr
                    key={item.poder_codigo}
                    style={{
                      borderBottom: `1px solid ${colors.rowBorder}`,
                      background: i === 0 ? colors.accentSoft : undefined,
                      fontWeight: i === 0 ? 600 : 400,
                    }}
                  >
                    <td style={td}>{item.descricao}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: font.mono }}>{M(item.despesa_liquida)}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: font.mono }}>{P(item.pct_rcl)}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: font.mono, color: colors.muted }}>
                      {item.teto_pct == null ? '—' : `${fmt(Number(item.teto_pct), 0)}%`}
                    </td>
                    <td style={td}>
                      {item.faixa ? (
                        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: corFaixa(item.faixa) }}>
                          {item.faixa}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: colors.faint }}>
                          {item.teto_pct == null ? 'sem teto legal próprio' : 'faixa não apurada'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: colors.muted, marginTop: 8, lineHeight: 1.45 }}>
              O consolidado do ente (60%/50% da RCL) soma todos os poderes; o teto de 54%/49% é
              só do Executivo. Somar percentuais de poderes distintos não produz limite algum.
            </div>
            <FonteChip source={pp.source_ref} nota={`RPPS ${pp.rpps ? 'sim' : 'não'}`} />
          </>
        )}
      </Async>
    </Card>
  );
}

/** Pergunta 6: qual é o denominador — e como ele foi apurado? */
function RclCard({
  cod,
  periodoRreo,
  rclDoDetalhe,
}: {
  cod: string;
  periodoRreo: string | null;
  rclDoDetalhe: number | string | null;
}) {
  // A RCL é apurada no RREO (Anexo 03): pedir no período RGF devolveria 404.
  const res = useResource(
    () => fetchRcl(cod, periodoRreo ?? ''),
    [cod, periodoRreo],
    { pular: !periodoRreo },
  );
  return (
    <Card>
      <SectionLabel note={`12 meses móveis · apurada no RREO ${periodoRreo ?? '—'}`}>
        RCL · o denominador do limite
      </SectionLabel>
      <Async
        res={res}
        skeleton={<Skeleton linhas={3} />}
      >
        {(rcl) => (
          <>
            <div style={{ fontFamily: font.mono, fontSize: 26, fontWeight: 600, color: colors.primary }}>
              {M(rcl.rcl_12m)}
            </div>
            <div style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
              receita corrente {M(rcl.receita_corrente)} − deduções {M(rcl.deducoes_total)}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, marginTop: 10 }}>
              <caption className="sr-only">Deduções da receita corrente para cálculo da RCL ajustada</caption>
              <tbody>
                {rcl.deducoes.slice(0, 4).map((dd) => (
                  <tr key={dd.conta} style={{ borderBottom: `1px dashed ${colors.borderSoft}` }}>
                    <th scope="row" style={{ padding: '5px 4px', color: colors.muted, textAlign: 'left', fontWeight: 400 }}>− {dd.conta}</th>
                    <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: font.mono }}>{M(dd.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {numero(rclDoDetalhe as number | null) != null &&
              numero(rcl.rcl_12m as number | null) !== numero(rclDoDetalhe as number | null) && (
                <div style={{ fontSize: 11, color: colors.yellowText, marginTop: 6 }}>
                  Diverge da RCL usada no cabeçalho ({M(rclDoDetalhe)}) — confira a versão de
                  entrega dos dois lados antes de usar o número.
                </div>
              )}
            <FonteChip source={rcl.source_ref} asOf={rcl.as_of} />
          </>
        )}
      </Async>
    </Card>
  );
}

/** Pergunta 8: para onde vai (projeção da Sprint 14, com IC e cruzamento do teto). */
function ProjecaoCard({ cod }: { cod: string }) {
  const res = useResource(() => fetchProjecao(cod, { indicador: 'pessoal', horizonte: 4 }), [cod]);
  return (
    <Card>
      <SectionLabel note="modelo da Sprint 14 · intervalo de confiança sempre visível">
        Para onde a folha vai
      </SectionLabel>
      <Async res={res} skeleton={<Skeleton linhas={4} />}>
        {(p) => (
          <>
            <div style={{ fontSize: 11, color: colors.muted, marginBottom: 8 }}>
              modelo <strong>{p.modelo}</strong> · unidade {p.unidade} · confiança {P(p.nivel_confianca, 0)}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <caption className="sr-only">Projeção da despesa com pessoal</caption>
              <thead>
                <tr>
                  <th scope="col" style={th}>Período</th>
                  <th scope="col" style={{ ...th, textAlign: 'right' }}>Previsto</th>
                  <th scope="col" style={{ ...th, textAlign: 'right' }}>IC</th>
                  <th scope="col" style={th}>Faixa</th>
                </tr>
              </thead>
              <tbody>
                {p.projecao.map((ponto) => (
                  <tr key={ponto.periodo_alvo} style={{ borderBottom: `1px dashed ${colors.borderSoft}` }}>
                    <td style={td}>{ponto.periodo_alvo}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: font.mono }}>{P(ponto.valor_previsto)}</td>
                    <td style={{ ...td, textAlign: 'right', fontFamily: font.mono, color: colors.muted }}>
                      {P(ponto.ic_inferior)} – {P(ponto.ic_superior)}
                    </td>
                    <td style={{ ...td, color: ponto.cruza_limite ? colors.red : colors.muted, fontSize: 11 }}>
                      {ponto.faixa ?? '—'}
                      {ponto.cruza_limite && ' · cruza o teto'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: p.cruzamento.cruza ? colors.red : colors.muted, marginTop: 8, lineHeight: 1.45 }}>
              {p.cruzamento.aplicavel
                ? p.cruzamento.cruza
                  ? `Projeção cruza o teto de ${P(p.cruzamento.teto_pct, 0)} em ${p.cruzamento.periodo_cruzamento}.`
                  : `Sem cruzamento do teto de ${P(p.cruzamento.teto_pct, 0)} no horizonte projetado.`
                : 'Sem limite legal aplicável a este indicador.'}
            </div>
            <FonteChip source={p.source_ref} asOf={p.as_of} />
          </>
        )}
      </Async>
    </Card>
  );
}

/** Pergunta 9: e se a folha subir/descer — em que faixa eu caio? */
function SimuladorCard({
  cod,
  periodoRreo,
  exec,
}: {
  cod: string;
  /** O mart do limite e a RCL vivem no período RREO — simular no RGF não acha o indicador. */
  periodoRreo: string | null;
  exec: PoderItem | null;
}) {
  const [delta, setDelta] = useState('');
  const [resultado, setResultado] = useState<SimularLimiteResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submeter = async (e: FormEvent) => {
    e.preventDefault();
    const valor = Number(delta.replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(valor) || valor === 0) {
      setErro('Informe a variação da folha em R$ (positiva ou negativa).');
      return;
    }
    if (!periodoRreo) {
      setErro('Sem período RREO correspondente a este quadrimestre: o limite não é apurável.');
      return;
    }
    setBusy(true);
    setErro(null);
    try {
      setResultado(
        await simularLimite(cod, INDICADOR_EXECUTIVO, periodoRreo, { delta_rs: valor }),
      );
    } catch (err) {
      const e2 = err as { detail?: string; message?: string };
      setErro(e2.detail || e2.message || 'Falha ao simular');
      setResultado(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <SectionLabel note="não persiste nada: é cenário, não lançamento">
        Simulador de impacto na folha
      </SectionLabel>
      <form onSubmit={submeter} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 11, color: colors.muted, display: 'flex', flexDirection: 'column', gap: 4 }}>
          Variação da despesa com pessoal (R$)
          <input
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            placeholder="ex.: 50000000 (ou -20000000)"
            aria-label="Variação da despesa com pessoal em reais"
            style={{
              border: `1px solid ${colors.border}`,
              borderRadius: 4,
              padding: '6px 8px',
              fontSize: 12,
              fontFamily: font.mono,
              width: 230,
            }}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          style={{
            border: `1px solid ${colors.primary}`,
            background: colors.primary,
            color: colors.bg,
            borderRadius: 4,
            padding: '7px 12px',
            fontSize: 11.5,
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          {busy ? 'simulando…' : 'simular'}
        </button>
      </form>

      {erro && <div style={{ marginTop: 10 }}><ErrorBox message={erro} /></div>}

      {resultado && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Linha rotulo="Hoje" valor={`${M(resultado.valor_rs_atual)} · ${P(resultado.valor_pct_atual)} (${resultado.faixa_atual ?? '—'})`} />
          <Linha
            rotulo="Simulado"
            valor={`${M(resultado.valor_rs_simulado)} · ${P(resultado.valor_pct_simulado)} (${resultado.faixa_simulada})`}
            destaque={corFaixa(resultado.faixa_simulada)}
          />
          <div style={{ fontSize: 11, color: colors.muted, lineHeight: 1.45 }}>
            Teto de {P(resultado.teto_pct, 0)} da RCL apurada no RREO {periodoRreo}. A RCL fica
            constante na simulação: só a folha muda — reajuste que eleve a RCL não é suposto aqui.
          </div>
        </div>
      )}
      {!resultado && !erro && (
        <div style={{ fontSize: 11, color: colors.muted, marginTop: 10, lineHeight: 1.45 }}>
          {exec?.pct_rcl != null
            ? `Posição atual: ${P(exec.pct_rcl)} da RCL. Informe a variação para ver em que faixa o ente cairia.`
            : 'Sem percentual apurado no período — a simulação exige a posição atual.'}
        </div>
      )}
    </Card>
  );
}

function MemoriaPessoalDialog({ cod, periodo }: { cod: string; periodo: string }) {
  return (
    <MemoriaDialog
      titulo="Memória de cálculo · Pessoal"
      subtitulo={`${cod} · ${periodo}`}
      carregar={() => fetchPessoalMemoria(cod, periodo)}
      deps={[cod, periodo]}
    >
      {(m) => (
        <div>
          <LinhaMemoria rotulo="Fórmula da despesa líquida">{m.formula_liquida}</LinhaMemoria>
          <LinhaMemoria rotulo="Fórmula do percentual">{m.formula_pct}</LinhaMemoria>
          <LinhaMemoria rotulo="Despesa bruta">{M(m.despesa_bruta)}</LinhaMemoria>
          <LinhaMemoria rotulo="Exclusões aplicadas">{M(m.exclusoes)}</LinhaMemoria>
          <LinhaMemoria rotulo="Despesa líquida">{M(m.despesa_liquida)}</LinhaMemoria>
          <LinhaMemoria rotulo="Líquida reportada (linha III)">
            {M(m.despesa_liquida_reportada)}
            {numero(m.despesa_liquida as number | null) != null &&
              numero(m.despesa_liquida_reportada as number | null) != null &&
              Math.abs(
                (numero(m.despesa_liquida as number | null) ?? 0) -
                  (numero(m.despesa_liquida_reportada as number | null) ?? 0),
              ) > 0.01 && <span style={{ color: colors.yellowText }}> · difere do apurado</span>}
          </LinhaMemoria>
          <LinhaMemoria rotulo="RCL 12m">{M(m.rcl_12m)}</LinhaMemoria>
          <LinhaMemoria rotulo="Regime previdenciário">
            {m.rpps ? 'RPPS próprio — inativos e pensionistas entram nas exclusões' : 'Sem RPPS — inativos e pensionistas do RGPS não são excluídos'}
          </LinhaMemoria>
          <div style={{ marginTop: 10 }}>
            <SectionLabel note="art. 19, §1º da LRF">Exclusões, uma a uma</SectionLabel>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
              <caption className="sr-only">Exclusões do cálculo da despesa com pessoal</caption>
              <thead>
                <tr>
                  <th scope="col" style={th}>Componente</th>
                  <th scope="col" style={{ ...th, textAlign: 'right' }}>Valor</th>
                  <th scope="col" style={th}>Aplicada?</th>
                </tr>
              </thead>
              <tbody>
                {m.exclusoes_detalhe.map((ex) => (
                  <tr key={ex.componente} style={{ borderBottom: `1px dashed ${colors.borderSoft}` }}>
                    <td style={{ padding: '5px 4px' }}>{ex.componente}</td>
                    <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: font.mono }}>{M(ex.valor)}</td>
                    <td style={{ padding: '5px 4px', fontSize: 11, color: ex.incluida ? colors.green : colors.muted }}>
                      {ex.incluida ? 'sim' : `não${ex.motivo ? ` — ${ex.motivo}` : ''}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <FonteChip source={m.source_ref} />
        </div>
      )}
    </MemoriaDialog>
  );
}

/** Trajetória do % da RCL contra o teto — barras horizontais por período. */
function TrilhaPct({
  serie,
  teto,
  destaque,
}: {
  serie: { periodo: string; pct_rcl: number | string | null }[];
  teto: number | null;
  destaque: string;
}) {
  const escala = Math.max(teto ?? 0, ...serie.map((s) => numero(s.pct_rcl as number | null) ?? 0)) * 1.1 || 1;
  return (
    <>
      <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {serie.map((s) => {
        const v = numero(s.pct_rcl as number | null);
        const largura = v == null ? 0 : Math.min((v / escala) * 100, 100);
        const cor = teto != null && v != null ? corPorFolga(v, teto) : colors.neutral;
        return (
          <div key={s.periodo} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 62, fontSize: 11, color: s.periodo === destaque ? colors.ink : colors.muted, fontWeight: s.periodo === destaque ? 700 : 400 }}>
              {s.periodo}
            </div>
            <div style={{ flex: 1, height: 10, background: colors.borderSoft, borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${largura}%`, background: cor }} />
              {teto != null && (
                <div style={{ position: 'absolute', left: `${Math.min((teto / escala) * 100, 100)}%`, top: -2, bottom: -2, width: 2, background: colors.red }} />
              )}
            </div>
            <div style={{ width: 60, textAlign: 'right', fontFamily: font.mono, fontSize: 11 }}>{P(v)}</div>
          </div>
        );
        })}
        {teto != null && (
          <div style={{ fontSize: 11, color: colors.faint, marginTop: 2 }}>
            linha vermelha = teto de {fmt(teto, 0)}% da RCL (art. 20 da LRF)
          </div>
        )}
      </div>
      <table className="sr-only">
        <caption>Série histórica da despesa com pessoal em percentual da RCL</caption>
        <thead>
          <tr><th scope="col">Período</th><th scope="col">Percentual da RCL</th><th scope="col">Teto</th></tr>
        </thead>
        <tbody>
          {serie.map((item) => (
            <tr key={item.periodo}>
              <th scope="row">{item.periodo}</th>
              <td>{P(numero(item.pct_rcl as number | null))}</td>
              <td>{P(teto)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Linha({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, borderBottom: `1px dashed ${colors.borderSoft}`, padding: '4px 0' }}>
      <span style={{ color: colors.muted }}>{rotulo}</span>
      <span style={{ fontFamily: font.mono, color: destaque ?? colors.ink, fontWeight: destaque ? 600 : 400 }}>{valor}</span>
    </div>
  );
}

function corFaixa(faixa: string | null | undefined): string {
  const f = (faixa ?? '').toLocaleLowerCase('pt-BR');
  if (f.includes('exced') || f.includes('máxim') || f.includes('maxim')) return colors.red;
  if (f.includes('prud')) return colors.orange;
  if (f.includes('alert') || f.includes('aten')) return colors.yellowText;
  if (f.includes('normal') || f.includes('folga')) return colors.green;
  return colors.neutral;
}

function corPorFolga(valor: number, teto: number): string {
  if (valor >= teto) return colors.red;
  if (valor >= teto * 0.95) return colors.orange;
  if (valor >= teto * 0.9) return colors.yellowText;
  return colors.green;
}

const th = {
  padding: '6px 4px',
  fontSize: 11,
  color: colors.faint,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  textAlign: 'left',
  borderBottom: `1px solid ${colors.border}`,
} as const;
const td = { padding: '7px 4px' } as const;
