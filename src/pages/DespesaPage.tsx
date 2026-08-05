/**
 * Despesa (Módulo 5) — enriquecimento gerencial da Sprint 25A.
 *
 * Perguntas da auditoria (§2.5) que cada bloco responde:
 *  1. "Quanto já comprometi do orçamento?" → cabeçalho empenhado × dotação × % RCL
 *  2. "Onde a execução trava?" → cascata completa dotação→empenhado→liquidado→**pago**
 *  3. "Quanto disso vira restos a pagar?" → lacunas + inscrito em RAP (/estagios)
 *  4. "Estou no ritmo do calendário?" → executado × esperado no período (/execucao)
 *  5. "Quanto da despesa eu consigo mexer?" → rigidez por natureza (/rigidez)
 *  6. "Em que estou gastando?" → árvore por **função** e por **natureza** (/arvore)
 *  7. "Cresceu de verdade?" → série nominal × real (IPCA) × per capita
 *  8. "Os dois eixos fecham?" → memória com reconciliação função × natureza (/memoria)
 *  9. "Como levo isto adiante?" → exportação CSV + relatório institucional
 * 10. "Este dado ainda vale / e se não houver?" → FonteChip + estado vazio nomeado
 */
import { useState } from 'react';
import { colors, font } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { PageHeader } from '../components/PageHeader';
import { MetricHeader } from '../components/MetricHeader';
import { SectionLabel } from '../components/SectionLabel';
import { Async, EmptyState, Skeleton } from '../components/AsyncState';
import { FonteChip } from '../components/FonteChip';
import { SeloCobertura } from '../components/SeloCobertura';
import { SeloQualidadePagina } from '../components/SeloQualidade';
import { MemoriaDialog, LinhaMemoria } from '../components/MemoriaDialog';
import { SerieChart } from '../components/SerieChart';
import { ExportButton } from '../components/ExportButton';
import { ArvoreDrill, numero } from '../components/ArvoreDrill';
import { useApp, useResource } from '../context/AppContext';
import {
  fetchDespesa,
  fetchDespesaEstagios,
  fetchDespesaExecucao,
  fetchDespesaMemoria,
  fetchDespesaRigidez,
  fetchDrill,
  fetchMe,
  type DespesaDetalhe,
  type DrillChild,
  type ExecucaoEstagio,
} from '../services/backend';
import { brl, fmt, pct } from '../utils/format';

type Eixo = 'funcao' | 'natureza';

const M = (v: number | null | undefined) => (v == null ? '—' : brl(Number(v) / 1e6));
const P = (v: number | null | undefined, casas = 1) => (v == null ? '—' : pct(Number(v), casas));

export function DespesaPage() {
  const { ente, periodo, periodosRreo } = useApp();
  const det = useResource(() => fetchDespesa(ente.cod_ibge, periodo, 'funcao'), [ente.cod_ibge, periodo]);
  const me = useResource(fetchMe, []);
  const podeAdministrar = (me.data?.org_ativa?.capacidades ?? []).includes('administrar');
  const ultimoPeriodo = periodosRreo.length ? periodosRreo[periodosRreo.length - 1] : null;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Detalhe · Despesa">
      <PageHeader
        title="Despesa"
        context={`${ente.nome} · ${periodo || 'sem período selecionado'} · execução, rigidez e composição`}
        source="RREO Anexo 2 (função) + Anexo 1 (natureza) · SICONFI"
        breadcrumb={(
          <Breadcrumb
            crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Análise por bloco' }, { label: 'Despesa' }]}
          />
        )}
      />

      <SeloQualidadePagina />
      {/* U21/U22: existia em Receita e faltava aqui — páginas irmãs, tratamento
          inconsistente. `siconfi_rreo` já declara "despesa" em paginas_impactadas
          (registry.py), só faltava consumir. */}
      <SeloCobertura pagina="despesa" ente={ente.cod_ibge} periodo={periodo} />

      <Async
        res={det}
        skeleton={<Skeleton linhas={6} altura={22} />}
        vazio={{
          quando: (d) => (d.totais.empenhado ?? null) == null && d.composicao.length === 0,
          render: (
            <EmptyState
              ente={ente.nome}
              periodo={periodo}
              podeAdministrar={podeAdministrar}
              detalhe="O RREO deste período não trouxe linhas de despesa para o ente."
            />
          ),
        }}
      >
        {(d) => (
          <Conteudo key={`${d.cod_ibge}-${d.periodo}-${d.as_of}`} d={d} enteNome={ente.nome} ultimoPeriodo={ultimoPeriodo} />
        )}
      </Async>
    </div>
  );
}

function Conteudo({
  d,
  enteNome,
  ultimoPeriodo,
}: {
  d: DespesaDetalhe;
  enteNome: string;
  ultimoPeriodo: string | null;
}) {
  const dot = numero(d.totais.dotacao_atualizada) ?? 0;
  const emp = numero(d.totais.empenhado) ?? 0;
  const [eixo, setEixo] = useState<Eixo>('funcao');
  const [nivelArvore, setNivelArvore] = useState<DrillChild[]>([]);

  const contexto = {
    ente: `${enteNome} (${d.cod_ibge})`,
    periodo: d.periodo,
    fonte: `${d.source_ref.relatorio} ${d.source_ref.anexo ?? ''} v${d.source_ref.versao_entrega}`.trim(),
  };

  return (
    <>
      <MetricHeader
        label={`Despesa empenhada · ${d.periodo} (acum.)`}
        value={fmt(emp / 1e6)}
        suffix="M"
        valueColor={colors.primary}
        context={
          <span>
            dotação {M(dot)} · execução {dot ? fmt((emp / dot) * 100, 1) : '—'}% · {P(d.empenhado_pct_rcl)} da RCL
            {d.comparacao && (
              <>
                {' '}· {d.comparacao.periodo_anterior}: {M(d.comparacao.empenhado_anterior)}
                {d.comparacao.delta_pct != null && (
                  <strong style={{ color: colors.muted }}>
                    {' '}({Number(d.comparacao.delta_pct) >= 0 ? '+' : ''}
                    {fmt(Number(d.comparacao.delta_pct), 1)}% nominal)
                  </strong>
                )}
              </>
            )}
          </span>
        }
        right={<CascataCard cod={d.cod_ibge} periodo={d.periodo} asOf={d.as_of} empenhadoFuncao={emp} />}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <FonteChip source={d.source_ref} asOf={d.as_of} ultimoPeriodo={ultimoPeriodo} />
        <div style={{ flex: 1 }} />
        <MemoriaDespesaDialog cod={d.cod_ibge} periodo={d.periodo} asOf={d.as_of} />
        <ExportButton
          nome={`Despesa — por ${eixo}`}
          linhas={nivelArvore}
          colunas={[
            { cabecalho: 'codigo', valor: (l) => l.codigo },
            { cabecalho: 'descricao', valor: (l) => l.descricao },
            { cabecalho: 'dotacao_atualizada', valor: (l) => numero(l.measures.dotacao_atualizada) },
            { cabecalho: 'empenhado', valor: (l) => numero(l.measures.empenhado) },
            { cabecalho: 'liquidado', valor: (l) => numero(l.measures.liquidado) },
            { cabecalho: 'pago', valor: (l) => numero(l.measures.pago) },
          ]}
          contexto={contexto}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <ExecucaoCard cod={d.cod_ibge} periodo={d.periodo} asOf={d.as_of} />
        <RigidezCard cod={d.cod_ibge} periodo={d.periodo} asOf={d.as_of} />
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            {/* U19: o eixo natureza (Anexo 01, lado despesa) só deriva Categoria →
                Grupo — 2 níveis (classificacao.py::NATUREZA_PARENT: raiz + filho
                direto), não os 4 que o rótulo anunciava. */}
            <SectionLabel note={eixo === 'funcao' ? 'Função → Subfunção (Portaria 42)' : 'Categoria Econômica → Grupo de Natureza'}>
              Em que se gasta · árvore navegável
            </SectionLabel>
          </div>
          <div role="group" aria-label="Eixo da árvore" style={{ display: 'flex', gap: 4 }}>
            <BotaoEixo ativo={eixo === 'funcao'} onClick={() => setEixo('funcao')} rotulo="Por função" />
            <BotaoEixo ativo={eixo === 'natureza'} onClick={() => setEixo('natureza')} rotulo="Por natureza" />
          </div>
        </div>
        {/* U23: cabeçalho e série (acima) sempre leem o eixo função (fetchDespesa é
            chamado fixo com 'funcao'); só a árvore abaixo muda com o seletor. Sem isto,
            trocar para "por natureza" e continuar vendo o mesmo número no topo parecia
            bug, não descompasso conhecido de fonte (Anexo 02 função × Anexo 01 natureza). */}
        {eixo === 'natureza' && (
          <div style={{ fontSize: 11, color: colors.muted, marginBottom: 8, lineHeight: 1.4 }}>
            O cabeçalho e a série acima continuam no eixo <strong>função</strong> (Anexo 02) —
            só esta árvore mudou para natureza (Anexo 01). Os dois eixos podem divergir; veja
            a memória de cálculo.
          </div>
        )}
        <ArvoreDrill
          carregar={(node) =>
            fetchDrill('despesa', d.cod_ibge, {
              periodo: d.periodo,
              node: node ?? undefined,
              eixo,
              asOf: d.as_of,
            })
          }
          linkFundo={(codigo) =>
            `/despesa/linha/${eixo}/${encodeURIComponent(codigo)}?periodo=${encodeURIComponent(d.periodo)}` +
            (d.as_of ? `&as_of=${encodeURIComponent(d.as_of)}` : '')
          }
          deps={[d.cod_ibge, d.periodo, eixo, d.as_of]}
          rotuloRaiz={eixo === 'funcao' ? 'Funções' : 'Categorias'}
          onNivel={setNivelArvore}
          colunas={[
            { chave: 'dotacao_atualizada', rotulo: 'Dotação' },
            { chave: 'empenhado', rotulo: 'Empenhado', barra: true },
            { chave: 'liquidado', rotulo: 'Liquidado' },
            { chave: 'pago', rotulo: 'Pago' },
          ]}
        />
      </Card>

      <Card>
        <SerieChart
          titulo="A despesa cresceu de verdade? · série multi-exercício"
          medida="Empenhado acumulado"
          pontos={d.serie.map((s) => ({
            periodo: s.periodo,
            nominal: numero(s.empenhado),
            real: numero(s.empenhado_real),
            perCapita: numero(s.empenhado_per_capita),
            populacao: s.populacao,
          }))}
          ajuste={d.serie_ajuste}
          destaque={d.periodo}
          nota="Empenho acumulado por bimestre — comparar sempre com o bimestre homólogo."
        />
      </Card>
    </>
  );
}

/**
 * Cascata dotação → empenhado → liquidado → pago, com as lacunas e o RAP inscrito.
 *
 * Vem do eixo **natureza** de propósito: o RREO Anexo 02 (função) não publica a coluna de
 * despesas pagas, e uma cascata que parasse em "liquidado" esconderia o potencial de
 * restos a pagar — exatamente a falta apontada na auditoria §2.5.
 */
function CascataCard({
  cod,
  periodo,
  asOf,
  empenhadoFuncao,
}: {
  cod: string;
  periodo: string;
  asOf: string | null;
  empenhadoFuncao: number;
}) {
  const res = useResource(
    () => fetchDespesaEstagios(cod, periodo, 'natureza', asOf),
    [cod, periodo, asOf],
  );
  return (
    <div>
      <div style={{ fontSize: 11, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
        Cascata de execução · dotação → empenhado → liquidado → pago
      </div>
      <Async res={res} skeleton={<Skeleton linhas={4} altura={12} />}>
        {(e) => {
          const base = numero(e.totais.dotacao_atualizada) ?? 0;
          const cores: Record<string, string> = {
            dotacao_atualizada: colors.neutral,
            empenhado: colors.primary,
            liquidado: colors.serieA,
            pago: colors.serieB,
          };
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {e.cascata.map((passo) => {
                  const v = numero(passo.valor) ?? 0;
                  return (
                    <div key={passo.estagio} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 132, fontSize: 11, color: colors.muted, textTransform: 'capitalize' }}>
                        {passo.estagio.replace(/_/g, ' ')}
                      </div>
                      <div style={{ flex: 1, height: 12, background: colors.borderSoft, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${base ? Math.min((v / base) * 100, 100) : 0}%`, background: cores[passo.estagio] ?? colors.neutral }} />
                      </div>
                      <div style={{ width: 96, textAlign: 'right', fontFamily: font.mono, fontSize: 11 }}>{M(passo.valor)}</div>
                    </div>
                  );
                })}
              </div>
              <table className="sr-only">
                <caption>Cascata de execução da despesa</caption>
                <thead>
                  <tr><th scope="col">Estágio</th><th scope="col">Valor</th><th scope="col">Percentual da dotação</th></tr>
                </thead>
                <tbody>
                  {e.cascata.map((passo) => {
                    const valor = numero(passo.valor) ?? 0;
                    return (
                      <tr key={passo.estagio}>
                        <th scope="row">{passo.estagio.replace(/_/g, ' ')}</th>
                        <td>{M(passo.valor)}</td>
                        <td>{fmt(base ? (valor / base) * 100 : 0, 1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                {e.lacunas.map((l) => (
                  <div key={l.nome} title={l.formula} style={{ fontSize: 11, color: colors.muted }}>
                    {l.nome}: <strong style={{ fontFamily: font.mono, color: colors.orange }}>{M(l.valor)}</strong>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: colors.muted }}>
                  inscrito em RAP:{' '}
                  <strong style={{ fontFamily: font.mono, color: colors.ink }}>{M(numero(e.totais.inscrito_rap))}</strong>
                </div>
              </div>
              {e.observacao && (
                <div style={{ fontSize: 11, color: colors.yellowText, lineHeight: 1.45 }}>{e.observacao}</div>
              )}
              <DiferencaEixos empenhadoFuncao={empenhadoFuncao} empenhadoNatureza={numero(e.totais.empenhado)} />
              <FonteChip source={e.source_ref} asOf={e.as_of} nota="estágios da despesa (eixo natureza)" />
            </div>
          );
        }}
      </Async>
    </div>
  );
}

/**
 * O cabeçalho lê o eixo função (Anexo 02) e a cascata o eixo natureza (Anexo 01, o único
 * com "pago"). Quando os dois anexos não fecham — acontece com dado real —, o usuário vê
 * dois "empenhado" diferentes; dizer isso é obrigação, não detalhe.
 */
function DiferencaEixos({
  empenhadoFuncao,
  empenhadoNatureza,
}: {
  empenhadoFuncao: number;
  empenhadoNatureza: number | null;
}) {
  if (empenhadoNatureza == null) return null;
  const diferenca = empenhadoFuncao - empenhadoNatureza;
  if (Math.abs(diferenca) < 0.01) return null;
  return (
    <div style={{ fontSize: 11, color: colors.muted, lineHeight: 1.45 }}>
      Empenhado por função {M(empenhadoFuncao)} × por natureza {M(empenhadoNatureza)}: os anexos
      divergem em <strong>{M(Math.abs(diferenca))}</strong> nesta entrega — qualidade de dado da
      fonte, detalhada na memória de cálculo. Nenhum dos dois valores é corrigido.
    </div>
  );
}

function ExecucaoCard({ cod, periodo, asOf }: { cod: string; periodo: string; asOf: string | null }) {
  const res = useResource(
    () => fetchDespesaExecucao(cod, periodo, 'natureza', asOf),
    [cod, periodo, asOf],
  );
  return (
    <Card>
      <SectionLabel note="executado ÷ dotação × esperado no calendário">Ritmo de execução</SectionLabel>
      <Async res={res} skeleton={<Skeleton linhas={3} />}>
        {(e) => (
          <>
            <div style={{ fontSize: 11, color: colors.muted, marginBottom: 8 }}>
              Bimestre {e.bimestre} de 6 · esperado linear {P(e.esperado_pct)} do exercício · base:
              dotação do eixo {e.eixo}.
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <caption className="sr-only">Execução da despesa por estágio</caption>
              <thead>
                <tr>
                  <th scope="col" style={th}>Estágio</th>
                  <th scope="col" style={{ ...th, textAlign: 'right' }}>Executado</th>
                  <th scope="col" style={{ ...th, textAlign: 'right' }}>% dotação</th>
                  <th scope="col" style={{ ...th, textAlign: 'right' }}>Ritmo</th>
                </tr>
              </thead>
              <tbody>
                {e.estagios.map((s) => (
                  <LinhaExecucao key={s.estagio} s={s} />
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: colors.muted, marginTop: 8, lineHeight: 1.45 }}>
              Ritmo abaixo do calendário sinaliza subexecução (ou empenho concentrado no fim do
              exercício, que empurra despesa para restos a pagar).
            </div>
            <FonteChip source={e.source_ref} asOf={e.as_of} nota="ritmo × calendário" />
          </>
        )}
      </Async>
    </Card>
  );
}

function LinhaExecucao({ s }: { s: ExecucaoEstagio }) {
  const cor =
    s.status === 'atrasado' ? colors.orange : s.status === 'adiantado' ? colors.serieA : s.status === 'sem_base' ? colors.faint : colors.green;
  return (
    <tr style={{ borderBottom: `1px dashed ${colors.borderSoft}` }}>
      <td style={{ padding: '7px 4px', textTransform: 'capitalize' }}>{s.estagio.replace(/_/g, ' ')}</td>
      <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: font.mono }}>{M(s.executado)}</td>
      <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: font.mono }}>{P(s.executado_pct)}</td>
      <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: font.mono, color: cor }}>
        {s.ritmo_pp == null ? '—' : `${Number(s.ritmo_pp) >= 0 ? '+' : ''}${fmt(Number(s.ritmo_pp), 1)} pp`}
        <div style={{ fontSize: 11, color: cor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {s.status.replace(/_/g, ' ')}
        </div>
      </td>
    </tr>
  );
}

function RigidezCard({ cod, periodo, asOf }: { cod: string; periodo: string; asOf: string | null }) {
  const res = useResource(
    () => fetchDespesaRigidez(cod, periodo, asOf),
    [cod, periodo, asOf],
  );
  return (
    <Card>
      <SectionLabel note="pessoal, juros e amortização = rígida">Rigidez orçamentária</SectionLabel>
      <Async res={res} skeleton={<Skeleton linhas={3} />}>
        {(r) => (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div style={{ fontFamily: font.mono, fontSize: 28, fontWeight: 600, color: colors.orange }}>
                {P(r.rigidez_pct)}
              </div>
              <div style={{ fontSize: 11, color: colors.muted }}>
                rígida {M(r.rigida)} · discricionária {M(r.discricionaria)} ({P(r.discricionaria_pct)})
              </div>
            </div>
            <div aria-hidden="true" style={{ display: 'flex', height: 14, borderRadius: 3, overflow: 'hidden', border: `1px solid ${colors.border}`, marginTop: 10 }}>
              <Faixa valor={numero(r.rigida)} total={numero(r.despesa_total)} cor={colors.orange} titulo="Rígida" />
              <Faixa valor={numero(r.semivariavel)} total={numero(r.despesa_total)} cor={colors.yellowSoft} titulo="Semivariável" />
              <Faixa valor={numero(r.discricionaria)} total={numero(r.despesa_total)} cor={colors.serieA} titulo="Discricionária" />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 10 }}>
              <caption className="sr-only">Composição da rigidez orçamentária por grupo de natureza</caption>
              <tbody>
                {r.componentes.map((c) => (
                  <tr key={c.grupo} style={{ borderBottom: `1px dashed ${colors.borderSoft}` }}>
                    <th scope="row" style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 400 }}>
                      {c.descricao}
                      <span style={{ fontSize: 11, color: colors.faint }}> · {c.tipo}</span>
                    </th>
                    <td style={{ padding: '6px 4px', textAlign: 'right', fontFamily: font.mono }}>{M(c.empenhado)}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right', fontFamily: font.mono, color: colors.muted }}>
                      {P(c.pct_despesa)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <FonteChip source={r.source_ref} asOf={r.as_of} nota="rigidez por grupo de natureza (GND)" />
          </>
        )}
      </Async>
    </Card>
  );
}

function Faixa({ valor, total, cor, titulo }: { valor: number | null; total: number | null; cor: string; titulo: string }) {
  const share = valor != null && total ? (valor / total) * 100 : 0;
  return <div title={`${titulo}: ${fmt(share, 1)}%`} style={{ width: `${Math.max(share, 0)}%`, background: cor }} />;
}

function BotaoEixo({ ativo, onClick, rotulo }: { ativo: boolean; onClick: () => void; rotulo: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      style={{
        border: `1px solid ${ativo ? colors.primary : colors.border}`,
        background: ativo ? colors.accentSoft : colors.surface,
        borderRadius: 4,
        padding: '3px 9px',
        fontSize: 11,
        color: colors.ink,
        cursor: 'pointer',
      }}
    >
      {rotulo}
    </button>
  );
}

function MemoriaDespesaDialog({
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
      titulo="Memória de cálculo · Despesa"
      subtitulo={`${cod} · ${periodo}`}
      carregar={() => fetchDespesaMemoria(cod, periodo, asOf)}
      deps={[cod, periodo, asOf]}
    >
      {(m) => (
        <div>
          <LinhaMemoria rotulo="Potencial de RAP">{m.formula_potencial_rap}</LinhaMemoria>
          <LinhaMemoria rotulo="Hierarquia (função)">{m.hierarquia_funcao}</LinhaMemoria>
          <LinhaMemoria rotulo="Hierarquia (natureza)">{m.hierarquia_natureza}</LinhaMemoria>
          <LinhaMemoria rotulo="Empenhado por função">{M(numero(m.totais_funcao.empenhado))}</LinhaMemoria>
          <LinhaMemoria rotulo="Empenhado por natureza">{M(numero(m.totais_natureza.empenhado))}</LinhaMemoria>
          <LinhaMemoria rotulo="Reconciliação dos eixos">
            {m.reconciliacao_eixos_ok ? (
              <span style={{ color: colors.green }}>✓ os dois eixos fecham</span>
            ) : (
              <span style={{ color: colors.red }}>
                ✗ diferença de {M(m.diferenca_eixos)} entre função e natureza — qualidade de dado da fonte
              </span>
            )}
          </LinhaMemoria>
          <LinhaMemoria rotulo="Invariante empenhado ≥ liquidado ≥ pago">
            {m.violacoes_estagio.length === 0
              ? 'sem violação'
              : `${m.violacoes_estagio.length} linha(s) violam a ordem dos estágios`}
          </LinhaMemoria>
          <LinhaMemoria rotulo="Verificação nó × soma dos filhos">
            {m.inconsistencias.length === 0
              ? 'sem divergência de agregação'
              : `${m.inconsistencias.length} nó(s) divergente(s)`}
          </LinhaMemoria>
          <LinhaMemoria rotulo="Versão de entrega">{m.versao_entrega}</LinhaMemoria>
          {m.violacoes_estagio.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, marginTop: 8 }}>
              <caption className="sr-only">Violações de consistência entre estágios da despesa</caption>
              <thead>
                <tr>
                  <th scope="col" style={th}>Eixo</th>
                  <th scope="col" style={th}>Nó</th>
                  <th scope="col" style={th}>Problema</th>
                </tr>
              </thead>
              <tbody>
                {m.violacoes_estagio.map((v, i) => (
                  <tr key={`${v.codigo}-${i}`} style={{ borderBottom: `1px dashed ${colors.borderSoft}` }}>
                    <td style={{ padding: '5px 4px' }}>{v.eixo}</td>
                    <td style={{ padding: '5px 4px' }}>{v.codigo}</td>
                    <td style={{ padding: '5px 4px' }}>{v.problema}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <FonteChip source={m.source_ref} asOf={m.as_of} />
        </div>
      )}
    </MemoriaDialog>
  );
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
