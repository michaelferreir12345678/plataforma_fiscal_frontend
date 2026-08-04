/**
 * Receita (Módulo 4) — enriquecimento gerencial da Sprint 25A.
 *
 * Cada bloco responde a uma pergunta da auditoria (§2.4); nada aqui é decorativo:
 *  1. "Quanto entrou e o quanto isso representa do previsto?" → cabeçalho + realização
 *  2. "Quanto da minha receita é minha?" → dependência própria × transferida (/dependencia)
 *  3. "De onde vem cada real?" → árvore Categoria→Origem→Espécie→Rubrica→Alínea (/arvore)
 *  4. "O previsto foi só requentado ou de fato revisado?" → inicial × atualizado × arrecadado
 *  5. "Cresceu de verdade?" → série multi-exercício nominal × real (IPCA) × per capita
 *  6. "O que o RREO diz bate com o que a União/FNDE repassou?" → conciliação (/conciliacao)
 *  7. "Como este número foi apurado?" → memória de cálculo (/memoria)
 *  8. "Como levo isto para a reunião?" → exportação CSV + relatório institucional
 *  9. "Este dado ainda vale?" → FonteChip com versão de entrega e selo de defasagem
 * 10. "E se não houver dado?" → estado vazio nomeado, com caminho para a Central de Dados
 */
import { SeloCobertura } from '../components/SeloCobertura';
import { useState } from 'react';
import { colors, font } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { PageHeader } from '../components/PageHeader';
import { MetricHeader } from '../components/MetricHeader';
import { SectionLabel } from '../components/SectionLabel';
import { Async, EmptyState, Skeleton } from '../components/AsyncState';
import { FonteChip } from '../components/FonteChip';
import { SeloQualidadePagina } from '../components/SeloQualidade';
import { MemoriaDialog, LinhaMemoria } from '../components/MemoriaDialog';
import { SerieChart } from '../components/SerieChart';
import { ExportButton } from '../components/ExportButton';
import { ArvoreDrill, numero } from '../components/ArvoreDrill';
import { useApp, useResource } from '../context/AppContext';
import {
  fetchDrill,
  fetchMe,
  fetchReceita,
  fetchReceitaConciliacao,
  fetchReceitaDependencia,
  fetchReceitaMemoria,
  fetchReceitaRealizacao,
  type ConciliacaoItem,
  type DrillChild,
  type ReceitaDetalhe,
} from '../services/backend';
import { brl, fmt, pct } from '../utils/format';

const M = (v: number | null | undefined) => (v == null ? '—' : brl(Number(v) / 1e6));
const P = (v: number | null | undefined, casas = 1) => (v == null ? '—' : pct(Number(v), casas));

export function ReceitaPage() {
  const { ente, periodo, periodosRreo } = useApp();
  const det = useResource(() => fetchReceita(ente.cod_ibge, periodo), [ente.cod_ibge, periodo]);
  const me = useResource(fetchMe, []);
  const podeAdministrar = (me.data?.org_ativa?.capacidades ?? []).includes('administrar');
  const ultimoPeriodo = periodosRreo.length ? periodosRreo[periodosRreo.length - 1] : null;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Detalhe · Receita">
      <PageHeader
        title="Receita"
        context={`${ente.nome} · ${periodo || 'sem período selecionado'} · arrecadação, composição e dependência`}
        source="RREO Anexo 1 · SICONFI"
        breadcrumb={(
          <Breadcrumb
            crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Análise por bloco' }, { label: 'Receita' }]}
          />
        )}
      />

      <SeloQualidadePagina />
      <SeloCobertura pagina="receita" ente={ente.cod_ibge} periodo={periodo} />

      <Async
        res={det}
        skeleton={<Skeleton linhas={6} altura={22} />}
        vazio={{
          quando: (d) => (d.totais.arrecadado_acum ?? null) == null && d.composicao.length === 0,
          render: (
            <EmptyState
              ente={ente.nome}
              periodo={periodo}
              podeAdministrar={podeAdministrar}
              detalhe="O RREO Anexo 01 deste período não trouxe linhas de receita para o ente."
            />
          ),
        }}
      >
        {(d) => (
          <Conteudo
            key={`${d.cod_ibge}-${d.periodo}`}
            d={d}
            enteNome={ente.nome}
            ultimoPeriodo={ultimoPeriodo}
            podeAdministrar={podeAdministrar}
          />
        )}
      </Async>
    </div>
  );
}

function Conteudo({
  d,
  enteNome,
  ultimoPeriodo,
  podeAdministrar,
}: {
  d: ReceitaDetalhe;
  enteNome: string;
  ultimoPeriodo: string | null;
  podeAdministrar: boolean;
}) {
  const arrec = numero(d.totais.arrecadado_acum) ?? 0;
  const prev = numero(d.totais.previsto_atualizado) ?? 0;
  const prevInicial = numero(d.totais.previsto_inicial);
  const pctProp = numero(d.dependencia.pct_propria) ?? 0;
  const pctTransf = numero(d.dependencia.pct_transferida) ?? 0;
  const [nivelArvore, setNivelArvore] = useState<DrillChild[]>([]);

  const contexto = {
    ente: `${enteNome} (${d.cod_ibge})`,
    periodo: d.periodo,
    fonte: `${d.source_ref.relatorio} ${d.source_ref.anexo ?? ''} v${d.source_ref.versao_entrega}`.trim(),
  };

  return (
    <>
      <MetricHeader
        label={`Receita arrecadada · ${d.periodo} (acum.)`}
        value={fmt(arrec / 1e6)}
        suffix="M"
        valueColor={colors.primary}
        context={
          <span>
            RCL 12m {M(d.rcl_12m)} · realização {P(d.realizacao_pct)} do previsto
            {d.comparacao && (
              <>
                {' '}· {d.comparacao.periodo_anterior}: {M(d.comparacao.arrecadado_acum_anterior)}
                {d.comparacao.delta_pct != null && (
                  <strong style={{ color: Number(d.comparacao.delta_pct) >= 0 ? colors.green : colors.red }}>
                    {' '}({Number(d.comparacao.delta_pct) >= 0 ? '+' : ''}
                    {fmt(Number(d.comparacao.delta_pct), 1)}% nominal)
                  </strong>
                )}
              </>
            )}
          </span>
        }
        right={
          <div>
            <div style={{ fontSize: 11, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
              Dependência · própria × transferida
            </div>
            <div
              role="img"
              aria-label={`Composição da receita: própria ${fmt(pctProp, 0)}%; transferida ${fmt(pctTransf, 0)}%`}
              style={{ display: 'flex', height: 26, borderRadius: 4, overflow: 'hidden', border: `1px solid ${colors.border}` }}
            >
              <div style={{ width: `${pctProp}%`, background: colors.primary, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>
                Própria {fmt(pctProp, 0)}%
              </div>
              <div style={{ width: `${pctTransf}%`, background: colors.orangeSoft, color: colors.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>
                Transferida {fmt(pctTransf, 0)}%
              </div>
            </div>
            <div style={{ fontSize: 11, color: colors.muted, marginTop: 8, lineHeight: 1.45 }}>
              Própria {M(d.dependencia.propria)} · transferida {M(d.dependencia.transferida)}. Dependência
              alta = fragilidade estrutural mesmo com caixa folgado.
            </div>
          </div>
        }
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <FonteChip source={d.source_ref} ultimoPeriodo={ultimoPeriodo} />
        <div style={{ flex: 1 }} />
        <MemoriaReceitaDialog cod={d.cod_ibge} periodo={d.periodo} />
        <ExportButton
          nome="Receita — composição"
          linhas={nivelArvore}
          colunas={[
            { cabecalho: 'codigo', valor: (l) => l.codigo },
            { cabecalho: 'descricao', valor: (l) => l.descricao },
            { cabecalho: 'previsto_inicial', valor: (l) => numero(l.measures.previsto_inicial) },
            { cabecalho: 'previsto_atualizado', valor: (l) => numero(l.measures.previsto_atualizado) },
            { cabecalho: 'arrecadado_acum', valor: (l) => numero(l.measures.arrecadado_acum) },
          ]}
          contexto={contexto}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 12 }}>
        <Card>
          <SectionLabel note="Categoria → Origem → Espécie → Rubrica → Alínea">
            De onde vem cada real · árvore navegável
          </SectionLabel>
          <ArvoreDrill
            carregar={(node) =>
              fetchDrill('receita', d.cod_ibge, { periodo: d.periodo, node: node ?? undefined })
            }
            linkFundo={(codigo) =>
              `/receita/linha/${encodeURIComponent(codigo)}?periodo=${encodeURIComponent(d.periodo)}`
            }
            deps={[d.cod_ibge, d.periodo]}
            rotuloRaiz="Categorias econômicas"
            onNivel={setNivelArvore}
            colunas={[
              { chave: 'previsto_inicial', rotulo: 'Prev. inicial' },
              { chave: 'previsto_atualizado', rotulo: 'Prev. atualizado' },
              { chave: 'arrecadado_acum', rotulo: 'Arrecadado', barra: true },
              {
                chave: 'realizacao',
                rotulo: 'Realização',
                derivar: (m) => {
                  const a = numero(m.arrecadado_acum);
                  const p = numero(m.previsto_atualizado);
                  return a != null && p ? (a / p) * 100 : null;
                },
                formato: (v) => (v == null ? '—' : `${fmt(v, 1)}%`),
              },
            ]}
          />
          <div style={{ fontSize: 11, color: colors.muted, marginTop: 8, lineHeight: 1.45 }}>
            Previsto <strong>inicial</strong> × <strong>atualizado</strong> lado a lado: uma reestimativa
            generosa no meio do exercício maquia a frustração de receita.
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <RealizacaoCard cod={d.cod_ibge} periodo={d.periodo} prevInicial={prevInicial} prev={prev} arrec={arrec} realizacaoPct={numero(d.realizacao_pct)} />
          <DependenciaCard cod={d.cod_ibge} periodo={d.periodo} />
        </div>
      </div>

      <Card>
        <SectionLabel note="RREO Anexo 01 × FPM/FUNDEB/ICMS (Sprint 1B)">
          Conciliação de transferências · o repasse informado bate com o recebido?
        </SectionLabel>
        <ConciliacaoCard cod={d.cod_ibge} periodo={d.periodo} enteNome={enteNome} podeAdministrar={podeAdministrar} />
      </Card>

      <Card>
        <SerieChart
          titulo="A receita cresceu de verdade? · série multi-exercício"
          medida="Arrecadado acumulado"
          pontos={d.serie.map((s) => ({
            periodo: s.periodo,
            nominal: numero(s.arrecadado_acum),
            real: numero(s.arrecadado_real),
            perCapita: numero(s.arrecadado_per_capita),
            populacao: s.populacao,
          }))}
          ajuste={d.serie_ajuste}
          destaque={d.periodo}
          nota="Comparar bimestres homólogos: o acumulado do B6 não se compara ao do B2."
        />
      </Card>
    </>
  );
}

function RealizacaoCard({
  cod,
  periodo,
  prevInicial,
  prev,
  arrec,
  realizacaoPct,
}: {
  cod: string;
  periodo: string;
  prevInicial: number | null;
  prev: number;
  arrec: number;
  realizacaoPct: number | null;
}) {
  const res = useResource(() => fetchReceitaRealizacao(cod, periodo), [cod, periodo]);
  return (
    <Card>
      <SectionLabel note="arrecadado ÷ previsto atualizado">Realização da receita</SectionLabel>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontFamily: font.mono, fontSize: 30, fontWeight: 600, color: colors.orange }}>
          {P(realizacaoPct)}
        </div>
        <div style={{ fontSize: 11, color: colors.muted }}>
          {M(arrec)} de {M(prev)} previstos
        </div>
      </div>
      <div
        role="meter"
        aria-label={`Realização da receita: ${P(realizacaoPct)} do previsto atualizado`}
        aria-valuemin={0}
        aria-valuemax={Math.max(100, realizacaoPct ?? 0)}
        aria-valuenow={realizacaoPct ?? 0}
        style={{ position: 'relative', height: 14, background: colors.borderSoft, borderRadius: 3, marginTop: 12 }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(realizacaoPct ?? 0, 100)}%`, background: colors.orange, borderRadius: 3 }} />
        <div style={{ position: 'absolute', left: '100%', top: -4, bottom: -4, width: 2, background: colors.primaryDeep }} />
      </div>
      <div style={{ fontSize: 11, color: colors.muted, margin: '10px 0', lineHeight: 1.45 }}>
        Previsão inicial {M(prevInicial)} → atualizada {M(prev)}. Frustração de receita aciona
        contingenciamento (art. 9º LRF). Receita não tem teto — tem meta.
      </div>
      <Async res={res} skeleton={<Skeleton linhas={3} />}>
        {(r) => (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <caption className="sr-only">Realização da receita por categoria econômica</caption>
              <tbody>
                {r.por_categoria.map((c) => (
                  <tr key={c.codigo} style={{ borderBottom: `1px dashed ${colors.borderSoft}` }}>
                    <th scope="row" style={{ padding: '7px 4px', textAlign: 'left', fontWeight: 400 }}>{c.descricao}</th>
                    <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: font.mono }}>{M(c.arrecadado_acum)}</td>
                    <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: font.mono, color: colors.muted }}>
                      {P(c.realizacao_pct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <FonteChip source={r.source_ref} nota="realização por categoria econômica" />
          </>
        )}
      </Async>
    </Card>
  );
}

function DependenciaCard({ cod, periodo }: { cod: string; periodo: string }) {
  const res = useResource(() => fetchReceitaDependencia(cod, periodo), [cod, periodo]);
  return (
    <Card>
      <SectionLabel note="origens 1.7 e 2.4 do Anexo 01">Maiores transferências recebidas</SectionLabel>
      <Async res={res} skeleton={<Skeleton linhas={4} />}>
        {(dep) =>
          dep.maiores_transferencias.length === 0 ? (
            <div style={{ fontSize: 11.5, color: colors.muted }}>
              Nenhuma transferência corrente/de capital detalhada neste período.
            </div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <caption className="sr-only">Maiores transferências recebidas</caption>
                <tbody>
                  {dep.maiores_transferencias.map((t) => (
                    <tr key={t.codigo} style={{ borderBottom: `1px dashed ${colors.borderSoft}` }}>
                      <th scope="row" style={{ padding: '7px 4px', textAlign: 'left', fontWeight: 400 }}>{t.descricao}</th>
                      <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: font.mono }}>{M(t.arrecadado_acum)}</td>
                      <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: font.mono, color: colors.muted }}>
                        {P(t.pct_das_transferencias)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <FonteChip source={dep.source_ref} nota="dependência de transferências" />
            </>
          )
        }
      </Async>
    </Card>
  );
}

function ConciliacaoCard({
  cod,
  periodo,
  enteNome,
  podeAdministrar,
}: {
  cod: string;
  periodo: string;
  enteNome: string;
  podeAdministrar: boolean;
}) {
  const res = useResource(() => fetchReceitaConciliacao(cod, periodo), [cod, periodo]);
  return (
    <Async
      res={res}
      skeleton={<Skeleton linhas={3} />}
      vazio={{
        quando: (c) => c.itens.length === 0,
        render: (
          <EmptyState
            ente={enteNome}
            periodo={periodo}
            podeAdministrar={podeAdministrar}
            detalhe="Sem fontes externas de transferência ingeridas (FPM/FUNDEB/ICMS) para contrapor ao RREO."
          />
        ),
      }}
    >
      {(c) => {
        const divergentes = c.itens.filter(
          (i) => i.status === 'divergente' || i.status === 'excede_agregado',
        );
        return (
          <>
            <div style={{ fontSize: 11.5, color: divergentes.length ? colors.red : colors.muted, marginBottom: 8 }}>
              {divergentes.length
                ? `${divergentes.length} transferência(s) fora da tolerância de ${fmt(Number(c.tolerancia_pct), 0)}% — investigar a qualidade do dado.`
                : `Nenhuma divergência acima de ${fmt(Number(c.tolerancia_pct), 0)}%.`}{' '}
              {c.observacao}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <caption className="sr-only">Conciliação da receita com fontes externas</caption>
              <thead>
                <tr>
                  <th scope="col" style={th}>Transferência</th>
                  <th scope="col" style={{ ...th, textAlign: 'right' }}>RREO A01</th>
                  <th scope="col" style={{ ...th, textAlign: 'right' }}>Fonte externa</th>
                  <th scope="col" style={{ ...th, textAlign: 'right' }}>Divergência</th>
                  <th scope="col" style={th}>Situação</th>
                </tr>
              </thead>
              <tbody>
                {c.itens.map((i) => (
                  <LinhaConciliacao key={`${i.transferencia}-${i.fonte_externa}`} item={i} />
                ))}
              </tbody>
            </table>
            <FonteChip
              source={c.source_ref}
              nota={`lado externo: ${[...new Set(c.itens.map((i) => i.tabela_externa))].join(', ') || '—'}`}
            />
          </>
        );
      }}
    </Async>
  );
}

const CONCILIACAO_ROTULO: Record<ConciliacaoItem['status'], string> = {
  conciliado: 'conciliado',
  divergente: 'divergente',
  contido: 'contido no agregado',
  excede_agregado: 'excede o agregado',
  sem_dado_externo: 'sem fonte externa',
  sem_par_rreo: 'sem par no RREO',
};

function LinhaConciliacao({ item }: { item: ConciliacaoItem }) {
  const cor =
    item.status === 'divergente' || item.status === 'excede_agregado'
      ? colors.red
      : item.status === 'conciliado'
        ? colors.green
        : item.status === 'contido'
          ? // "contido" fica fora da paleta de risco (não é bom nem ruim), mas aqui a cor
            // é lida como texto — usa a variante de tinta, não a cor de traço.
            colors.serieAInk
          : colors.neutral;
  const rotulo = CONCILIACAO_ROTULO[item.status];
  const agregado = item.base_comparacao === 'agregado';
  return (
    <tr style={{ borderBottom: `1px solid ${colors.rowBorder}` }}>
      <td style={{ padding: '7px 4px' }}>
        <div style={{ fontWeight: 500 }}>{item.transferencia}</div>
        <div style={{ fontSize: 11, color: colors.faint, fontFamily: font.mono }}>
          {item.fonte_externa} · {item.tabela_externa}
          {item.periodo_externo ? ` · ${item.periodo_externo}` : ''}
          {item.nos_rreo.length > 0 && ` · RREO: ${item.nos_rreo.join(', ')}`}
        </div>
        {!item.independente && (
          <div style={{ fontSize: 11, color: colors.yellowText, marginTop: 2 }}>
            ⚠ série derivada do próprio RREO — consistência interna, não contraprova independente.
          </div>
        )}
        {agregado && (
          <div style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
            O ente não abre esta linha no Anexo 01: comparação por <strong>contenção</strong> contra o
            agregado que a contém — a parte tem de caber no todo.
          </div>
        )}
      </td>
      <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: font.mono }}>
        {M(item.rreo_acum)}
        {agregado && <div style={{ fontSize: 11, color: colors.faint }}>agregado</div>}
      </td>
      <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: font.mono }}>{M(item.externo_acum)}</td>
      <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: font.mono, color: cor }}>
        {agregado
          ? item.participacao_no_agregado_pct == null
            ? '—'
            : `${fmt(Number(item.participacao_no_agregado_pct), 1)}% do agregado`
          : item.divergencia_pct == null
            ? '—'
            : `${fmt(Number(item.divergencia_pct), 2)}%`}
        {!agregado && item.divergencia_rs != null && (
          <div style={{ fontSize: 11, color: colors.faint }}>{M(item.divergencia_rs)}</div>
        )}
      </td>
      <td style={{ padding: '7px 4px' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: cor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {rotulo}
        </span>
      </td>
    </tr>
  );
}

function MemoriaReceitaDialog({ cod, periodo }: { cod: string; periodo: string }) {
  return (
    <MemoriaDialog
      titulo="Memória de cálculo · Receita"
      subtitulo={`${cod} · ${periodo}`}
      carregar={() => fetchReceitaMemoria(cod, periodo)}
      deps={[cod, periodo]}
    >
      {(m) => (
        <div>
          <LinhaMemoria rotulo="Fórmula da realização">{m.formula_realizacao}</LinhaMemoria>
          <LinhaMemoria rotulo="Hierarquia">{m.hierarquia}</LinhaMemoria>
          <LinhaMemoria rotulo="Medidas mapeadas">{m.medidas.join(' · ')}</LinhaMemoria>
          <LinhaMemoria rotulo="Previsto inicial">{M(numero(m.totais.previsto_inicial))}</LinhaMemoria>
          <LinhaMemoria rotulo="Previsto atualizado">{M(numero(m.totais.previsto_atualizado))}</LinhaMemoria>
          <LinhaMemoria rotulo="Arrecadado (acum.)">{M(numero(m.totais.arrecadado_acum))}</LinhaMemoria>
          <LinhaMemoria rotulo="Versão de entrega">{m.versao_entrega}</LinhaMemoria>
          <LinhaMemoria rotulo="Verificação nó × soma dos filhos">
            {m.inconsistencias.length === 0
              ? 'sem divergência de agregação (tolerância R$ 0,01)'
              : `${m.inconsistencias.length} nó(s) divergente(s) — qualidade de dado, o valor oficial do RREO é mantido`}
          </LinhaMemoria>
          {m.inconsistencias.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, marginTop: 8 }}>
              <caption className="sr-only">Inconsistências na memória hierárquica da receita</caption>
              <thead>
                <tr>
                  <th scope="col" style={th}>Nó</th>
                  <th scope="col" style={th}>Medida</th>
                  <th scope="col" style={{ ...th, textAlign: 'right' }}>No nó</th>
                  <th scope="col" style={{ ...th, textAlign: 'right' }}>Soma dos filhos</th>
                </tr>
              </thead>
              <tbody>
                {m.inconsistencias.map((i, idx) => (
                  <tr key={`${i.codigo}-${i.medida}-${idx}`} style={{ borderBottom: `1px dashed ${colors.borderSoft}` }}>
                    <td style={{ padding: '5px 4px' }}>{i.codigo}</td>
                    <td style={{ padding: '5px 4px' }}>{i.medida}</td>
                    <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: font.mono }}>{M(i.valor_no)}</td>
                    <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: font.mono }}>{M(i.soma_filhos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <FonteChip source={m.source_ref} />
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
