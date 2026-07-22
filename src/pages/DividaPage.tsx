import { useState, type CSSProperties, type FormEvent } from 'react';
import { colors, font } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { SectionLabel } from '../components/SectionLabel';
import { Async, ErrorBox, Loading } from '../components/AsyncState';
import { useApp, useResource } from '../context/AppContext';
import { ApiError } from '../services/api';
import {
  fetchDivida,
  fetchDividaArvore,
  fetchDividaCapag,
  fetchDividaCronograma,
  fetchDividaMemoria,
  simularOperacaoDivida,
  type CapagHero,
  type CapagMemoria,
  type DclHero,
  type DividaArvore,
  type DividaCronograma,
  type DividaDetalhe,
  type DividaEixo,
  type DividaMemoria,
  type PosicaoSimulada,
  type SimulacaoOperacao,
  type SimularOperacaoInput,
  type SourceRef,
} from '../services/backend';
import { brl, fmt, pct } from '../utils/format';

type MaybeNumber = number | string | null | undefined;

const numberValue = (value: MaybeNumber): number | null => {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const money = (value: MaybeNumber): string => {
  const parsed = numberValue(value);
  return parsed == null ? '—' : brl(parsed / 1e6);
};

const percent = (value: MaybeNumber, decimals = 2): string => {
  const parsed = numberValue(value);
  return parsed == null ? '—' : pct(parsed, decimals);
};

/** Os subindicadores publicados em ``silver.tesouro_capag`` são razões. */
const ratioPercent = (value: MaybeNumber): string => {
  const parsed = numberValue(value);
  if (parsed == null) return '—';
  return pct(parsed * 100, 2);
};

function faixaColor(faixa: string | null | undefined): string {
  const normalized = (faixa ?? '').toLocaleLowerCase('pt-BR');
  if (normalized.includes('exced') || normalized.includes('máxim') || normalized.includes('crit')) return colors.red;
  if (normalized.includes('prud')) return colors.orange;
  if (normalized.includes('alert') || normalized.includes('aten')) return colors.yellowText;
  if (normalized.includes('normal') || normalized.includes('adequ') || normalized.includes('folga')) return colors.green;
  return colors.neutral;
}

function sourceText(source: SourceRef | null | undefined): string {
  if (!source) return 'fonte não informada';
  return [source.relatorio, source.anexo, source.periodo, source.versao_entrega && `v${source.versao_entrega}`]
    .filter(Boolean)
    .join(' · ');
}

export function DividaPage() {
  const { ente, periodoRgf } = useApp();
  const detalhe = useResource(
    () => fetchDivida(ente.cod_ibge, periodoRgf),
    [ente.cod_ibge, periodoRgf],
  );

  return (
    <div
      className="fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      data-screen-label="Detalhe · Dívida"
    >
      <Breadcrumb
        crumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Análise por bloco' },
          { label: 'Dívida & Endividamento' },
        ]}
        source={
          detalhe.data
            ? `${sourceText(detalhe.data.dcl.source_ref)} · as_of ${detalhe.data.dcl.as_of}`
            : 'RGF Anexo 2 (DDCL) · SADIPEM · CAPAG/STN'
        }
      />

      <Async res={detalhe}>
        {(data) => (
          <DividaContent
            key={`${data.cod_ibge}-${data.periodo}-${data.as_of}`}
            detalhe={data}
          />
        )}
      </Async>
    </div>
  );
}

function DividaContent({ detalhe }: { detalhe: DividaDetalhe }) {
  const capag = useResource(
    () => fetchDividaCapag(detalhe.cod_ibge, detalhe.periodo, detalhe.capag.as_of),
    [detalhe.cod_ibge, detalhe.periodo, detalhe.capag.as_of],
  );
  const memoria = useResource(
    () => fetchDividaMemoria(detalhe.cod_ibge, detalhe.periodo, detalhe.dcl.as_of),
    [detalhe.cod_ibge, detalhe.periodo, detalhe.dcl.as_of],
  );
  const cronograma = useResource(
    () => fetchDividaCronograma(detalhe.cod_ibge, detalhe.periodo),
    [detalhe.cod_ibge, detalhe.periodo],
  );
  const [eixo, setEixo] = useState<DividaEixo>('origem');
  const [node, setNode] = useState<string | undefined>();
  const arvore = useResource(
    () =>
      fetchDividaArvore(detalhe.cod_ibge, {
        periodo: detalhe.periodo,
        eixo,
        node,
        asOf: eixo === 'origem' ? detalhe.dcl.as_of : undefined,
      }),
    [detalhe.cod_ibge, detalhe.periodo, detalhe.dcl.as_of, eixo, node],
  );

  const changeEixo = (next: DividaEixo) => {
    setNode(undefined);
    setEixo(next);
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 12 }}>
        <DclHeroCard hero={detalhe.dcl} esfera={detalhe.esfera} />
        <Async res={capag}>
          {(data) => <CapagHeroCard hero={data.hero} memoria={data.memoria} />}
        </Async>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: 12 }}>
        <Async res={memoria}>{(data) => <MemoriaCard data={data} />}</Async>
        <Async res={cronograma}>{(data) => <CronogramaCard data={data} />}</Async>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
        <ArvoreCard
          eixo={eixo}
          node={node}
          data={arvore}
          onEixo={changeEixo}
          onNode={setNode}
        />
        <SerieCard detalhe={detalhe} />
      </div>

      <SimuladorCard detalhe={detalhe} />
    </>
  );
}

function DclHeroCard({ hero, esfera }: { hero: DclHero; esfera: string | null }) {
  const value = numberValue(hero.pct_rcl);
  const ceiling = numberValue(hero.limite_pct);
  const width = value != null && ceiling && ceiling > 0 ? Math.min(Math.max((value / ceiling) * 100, 0), 100) : 0;
  const color = faixaColor(hero.faixa);

  return (
    <Card accent={color} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={eyebrow}>{hero.rotulo}</div>
        <Badge text={(hero.natureza || 'líquida').toLocaleUpperCase('pt-BR')} color={colors.primary} />
        {hero.faixa && <Badge text={hero.faixa.toLocaleUpperCase('pt-BR')} color={color} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ ...heroValue, color }}>{percent(hero.pct_rcl)}</div>
        <div style={{ fontSize: 11, color: colors.muted }}>da RCL ajustada</div>
      </div>
      <div style={{ fontSize: 12, color: colors.ink }}>
        <strong style={{ fontFamily: font.mono }}>{money(hero.dcl)}</strong>
        <span style={{ color: colors.muted }}> · teto {percent(hero.limite_pct, 0)} · esfera {esfera ?? '—'}</span>
      </div>
      <div style={{ position: 'relative', height: 12, background: colors.borderSoft, borderRadius: 3 }}>
        <div style={{ position: 'absolute', inset: 0, right: 'auto', width: `${width}%`, background: color, borderRadius: 3 }} />
        <div style={{ position: 'absolute', left: '100%', top: -3, bottom: -3, width: 2, background: colors.red }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MiniValue label="Dívida consolidada bruta" value={money(hero.dc_bruta)} />
        <MiniValue label="RCL ajustada" value={money(hero.rcl_ajustada)} />
      </div>
      <Provenance source={hero.source_ref} asOf={hero.as_of} />
    </Card>
  );
}

function CapagHeroCard({ hero, memoria }: { hero: CapagHero; memoria: CapagMemoria }) {
  const notaBase = hero.nota_final?.trim().toUpperCase().charAt(0);
  const noteColor = notaBase === 'A'
    ? colors.green
    : notaBase === 'B'
      ? colors.yellowText
      : notaBase === 'C'
        ? colors.orange
        : notaBase === 'D'
          ? colors.red
          : colors.neutral;
  const indicators = [
    { label: 'Endividamento bruto · DC/RCL', value: percent(hero.endividamento_pct) },
    { label: 'Poupança corrente', value: ratioPercent(hero.ind_poupanca) },
    { label: 'Liquidez relativa', value: numberValue(hero.ind_liquidez) == null ? '—' : fmt(Number(hero.ind_liquidez), 2) },
  ];

  return (
    <Card accent={noteColor} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={eyebrow}>{hero.rotulo}</div>
          <div style={{ fontSize: 10.5, color: colors.muted }}>{hero.natureza} · ano-base {hero.ano_ref}</div>
        </div>
        <div style={{ ...heroValue, color: noteColor, fontSize: 44 }}>{hero.nota_final ?? '—'}</div>
      </div>
      <div>
        {indicators.map((indicator) => (
          <div
            key={indicator.label}
            style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: `1px solid ${colors.rowBorder}` }}
          >
            <span style={{ fontSize: 11.5 }}>{indicator.label}</span>
            <strong style={{ fontFamily: font.mono, fontSize: 12 }}>{indicator.value}</strong>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10.5, color: colors.muted, lineHeight: 1.45 }}>
        {memoria.formula_endividamento}. Base: {memoria.base_numerador} ÷ {memoria.base_denominador}. {memoria.escala}.
        {numberValue(hero.ind_endividamento) != null && ` Índice publicado: ${ratioPercent(hero.ind_endividamento)}.`}
      </div>
      {hero.metodologia_versao && (
        <div style={{ fontSize: 10, color: colors.faint }}>Metodologia {hero.metodologia_versao}</div>
      )}
      {memoria.observacoes.length > 0 && (
        <div style={{ fontSize: 10, color: colors.faint }}>{memoria.observacoes.join(' · ')}</div>
      )}
      <Provenance source={hero.source_ref} asOf={hero.as_of} />
    </Card>
  );
}

function MemoriaCard({ data }: { data: DividaMemoria }) {
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionLabel note="cálculo executado no backend sobre o RGF">Memória rastreável da DCL</SectionLabel>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <tbody>
          {data.componentes.map((item, index) => (
            <tr key={`${item.componente}-${index}`} style={{ borderBottom: `1px dashed ${colors.borderSoft}` }}>
              <td style={{ width: 24, padding: '7px 4px', color: colors.muted, fontFamily: font.mono }}>{item.operador}</td>
              <td style={{ padding: '7px 4px' }}>
                <div>{humanize(item.componente)}</div>
                {(item.conta_origem || item.coluna_origem) && (
                  <div style={{ marginTop: 2, fontSize: 8.5, color: colors.faint, fontFamily: font.mono }}>
                    {[item.conta_origem, item.coluna_origem].filter(Boolean).join(' · ')}
                  </div>
                )}
              </td>
              <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: font.mono }}>{money(item.valor)}</td>
            </tr>
          ))}
          <tr style={{ borderTop: `2px solid ${colors.primary}`, background: colors.accentSoft }}>
            <td style={{ padding: '8px 4px', fontWeight: 700 }}>=</td>
            <td style={{ padding: '8px 4px', fontWeight: 700 }}>Dívida Consolidada Líquida</td>
            <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: font.mono, fontWeight: 700, color: colors.primary }}>
              {money(data.dcl)}
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MiniValue label="RCL ajustada" value={money(data.rcl_ajustada)} />
        <MiniValue label="DCL / RCL" value={percent(data.pct_rcl)} />
      </div>
      <div style={formulaBox}>
        <div>{data.formula_dcl}</div>
        <div>{data.formula_pct}</div>
      </div>
      <div style={{ fontSize: 10.5, color: data.reconciliacao_ok == null ? colors.muted : data.reconciliacao_ok ? colors.green : colors.red }}>
        Reconciliação com o DDCL: {data.reconciliacao_ok == null ? 'sem linha reportada para conferir' : data.reconciliacao_ok ? 'consistente' : 'divergente'}
        {numberValue(data.diferenca_reconciliacao) != null && ` · diferença ${money(data.diferenca_reconciliacao)}`}
      </div>
      <Provenance source={data.source_ref} asOf={data.as_of} />
    </Card>
  );
}

function CronogramaCard({ data }: { data: DividaCronograma }) {
  const maxValue = Math.max(...data.itens.map((item) => numberValue(item.valor) ?? 0), 0);

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionLabel note={`posição ${data.periodo_ref}`}>Cronograma do serviço da dívida · SADIPEM</SectionLabel>
      {data.itens.length === 0 ? (
        <Empty text="Não há vencimentos publicados para este ente e posição." />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 178, paddingTop: 8, overflowX: 'auto' }}>
            {data.itens.map((item) => {
              const value = numberValue(item.valor) ?? 0;
              const height = maxValue > 0 ? Math.max((value / maxValue) * 100, 4) : 4;
              return (
                <div
                  key={item.ano}
                  title={`Principal ${money(item.principal)} · juros ${money(item.juros)} · encargos ${money(item.encargos)} · ${item.operacoes} operação(ões)`}
                  style={{ minWidth: 56, flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}
                >
                  <div style={{ fontFamily: font.mono, fontSize: 9.5, color: colors.muted }}>{money(item.valor)}</div>
                  <div style={{ width: '100%', height: `${height}%`, background: colors.primary, borderRadius: '3px 3px 0 0' }} />
                  <div style={{ fontSize: 10, color: colors.muted, fontFamily: font.mono }}>{item.ano}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            <MiniValue label="Principal" value={money(data.total_principal)} />
            <MiniValue label="Juros" value={money(data.total_juros)} />
            <MiniValue label="Encargos" value={money(data.total_encargos)} />
            <MiniValue label="Serviço total" value={money(data.total_valor)} />
          </div>
        </>
      )}
      <Provenance source={data.source_ref} asOf={data.as_of} />
    </Card>
  );
}

function ArvoreCard({
  eixo,
  node,
  data,
  onEixo,
  onNode,
}: {
  eixo: DividaEixo;
  node: string | undefined;
  data: ReturnType<typeof useResource<DividaArvore>>;
  onEixo: (eixo: DividaEixo) => void;
  onNode: (node: string | undefined) => void;
}) {
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <SectionLabel note="clique em um nó para descer">Composição da dívida</SectionLabel>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['origem', 'credor'] as DividaEixo[]).map((item) => (
            <button key={item} type="button" onClick={() => onEixo(item)} style={segmentButton(eixo === item)}>
              {item === 'origem' ? 'Por origem' : 'Por credor'}
            </button>
          ))}
        </div>
      </div>
      <Async res={data}>
        {(tree) => {
          const responseNode = tree.node?.codigo;
          if (tree.eixo !== eixo || responseNode !== node) {
            return <Loading label="Carregando o nível selecionado…" />;
          }
          return (
            <>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5, minHeight: 24 }}>
              <button type="button" onClick={() => onNode(undefined)} style={crumbButton(!node)}>Raiz</button>
              {tree.breadcrumb.map((crumb) => (
                <span key={crumb.codigo} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: colors.faint }}>›</span>
                  <button type="button" onClick={() => onNode(crumb.codigo)} style={crumbButton(crumb.codigo === node)}>
                    {crumb.descricao}
                  </button>
                </span>
              ))}
              {tree.node && !tree.breadcrumb.some((crumb) => crumb.codigo === tree.node?.codigo) && (
                <span style={{ color: colors.ink, fontSize: 10.5 }}>› {tree.node.descricao}</span>
              )}
            </div>
            {Object.keys(tree.measures).length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '7px 9px', background: colors.surfaceAlt, border: `1px solid ${colors.borderSoft}`, borderRadius: 4 }}>
                <span style={{ fontSize: 10, color: colors.muted }}>Agregado do nó atual</span>
                <MeasureValues measures={tree.measures} />
              </div>
            )}
            {tree.children.length === 0 ? (
              <Empty text="Este nó não possui filhos na posição consultada." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {tree.children.map((child) => (
                  <button
                    key={child.codigo}
                    type="button"
                    disabled={!child.has_children}
                    onClick={() => child.has_children && onNode(child.codigo)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, border: 0, borderBottom: `1px solid ${colors.rowBorder}`, padding: '8px 4px', background: 'transparent', textAlign: 'left', color: colors.ink, cursor: child.has_children ? 'pointer' : 'default' }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{child.descricao}</div>
                      <div style={{ fontSize: 9.5, color: colors.faint, fontFamily: font.mono }}>{child.codigo}</div>
                    </div>
                    <MeasureValues measures={child.measures} />
                    <span style={{ color: child.has_children ? colors.primary : colors.faint }}>{child.has_children ? '›' : '·'}</span>
                  </button>
                ))}
              </div>
            )}
            <Provenance source={tree.source_ref} asOf={tree.as_of} />
            </>
          );
        }}
      </Async>
    </Card>
  );
}

function SerieCard({ detalhe }: { detalhe: DividaDetalhe }) {
  const serie = detalhe.serie.slice(-8);
  const maxValue = Math.max(...serie.map((item) => numberValue(item.dcl) ?? 0), 0);
  const comparisonItem = detalhe.comparacao
    ? detalhe.serie.find((item) => item.periodo === detalhe.comparacao?.periodo_anterior)
    : undefined;

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionLabel note="drill temporal RGF">Evolução da DCL</SectionLabel>
      {detalhe.periodo_breadcrumb.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', fontSize: 10.5, color: colors.muted }}>
          {detalhe.periodo_breadcrumb.map((period, index) => (
            <span key={period.codigo}>{index > 0 && '› '}{period.descricao}</span>
          ))}
          <span>› {detalhe.periodo}</span>
        </div>
      )}
      {serie.length === 0 ? (
        <Empty text="Não há série histórica materializada para esta posição." />
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 170, paddingTop: 6 }}>
          {serie.map((item) => {
            const value = numberValue(item.dcl) ?? 0;
            const height = maxValue > 0 ? Math.max((value / maxValue) * 100, 4) : 4;
            return (
              <div
                key={item.periodo}
                title={`${money(item.dcl)} · ${sourceText(item.source_ref)} · as_of ${item.as_of}`}
                style={{ flex: 1, height: '100%', minWidth: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}
              >
                <div style={{ fontSize: 9.5, color: colors.muted, fontFamily: font.mono }}>{percent(item.pct_rcl, 1)}</div>
                <div style={{ width: '100%', height: `${height}%`, background: colors.primary, borderRadius: '3px 3px 0 0' }} />
                <div style={{ fontSize: 9, color: colors.faint, fontFamily: font.mono }}>{item.periodo}</div>
                <div style={{ fontSize: 8, color: colors.faint, fontFamily: font.mono }}>v{item.source_ref.versao_entrega ?? '—'}</div>
              </div>
            );
          })}
        </div>
      )}
      {detalhe.comparacao && (
        <div style={{ fontSize: 10.5, color: colors.muted }}>
          Mesmo período anterior ({detalhe.comparacao.periodo_anterior}): {money(detalhe.comparacao.dcl_anterior)} · variação{' '}
          {money(detalhe.comparacao.variacao_rs)} ({percent(detalhe.comparacao.variacao_pct)})
        </div>
      )}
      <Provenance source={detalhe.dcl.source_ref} asOf={detalhe.dcl.as_of} />
      {comparisonItem && <Provenance source={comparisonItem.source_ref} asOf={comparisonItem.as_of} />}
    </Card>
  );
}

function SimuladorCard({ detalhe }: { detalhe: DividaDetalhe }) {
  const [valorOperacao, setValorOperacao] = useState('');
  const [valorGarantia, setValorGarantia] = useState('');
  const [valorAro, setValorAro] = useState('');
  const [garantiasAtuais, setGarantiasAtuais] = useState('');
  const [aroAtual, setAroAtual] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimulacaoOperacao | null>(null);

  const parseInput = (value: string): number | undefined => {
    if (!value.trim()) return undefined;
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const operation = parseInput(valorOperacao);
    const guarantee = parseInput(valorGarantia) ?? 0;
    const aro = parseInput(valorAro) ?? 0;
    const currentGuarantees = parseInput(garantiasAtuais);
    const currentAro = parseInput(aroAtual);

    if (operation == null || !Number.isFinite(operation) || operation <= 0) {
      setError('Informe um valor de operação maior que zero.');
      return;
    }
    if ([guarantee, aro, currentGuarantees, currentAro].some((value) => value != null && (!Number.isFinite(value) || value < 0))) {
      setError('Garantias e ARO devem ser valores não negativos.');
      return;
    }

    const body: SimularOperacaoInput = {
      valor_operacao: operation,
      valor_garantia: guarantee,
      valor_aro: aro,
      ...(currentGuarantees != null ? { garantias_atuais: currentGuarantees } : {}),
      ...(currentAro != null ? { aro_atual: currentAro } : {}),
    };

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await simularOperacaoDivida(
        detalhe.cod_ibge,
        detalhe.periodo,
        body,
        detalhe.dcl.as_of,
      );
      setResult(response);
    } catch (cause) {
      if (cause instanceof ApiError) setError(cause.detail || cause.message);
      else setError(cause instanceof Error ? cause.message : 'Não foi possível executar a simulação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SectionLabel note="cenário calculado pelo backend · não altera os fatos fiscais">Simular nova operação</SectionLabel>
      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto', alignItems: 'end', gap: 8 }}>
        <MoneyField label="Nova operação (R$)" value={valorOperacao} onChange={setValorOperacao} required />
        <MoneyField label="Garantia nova (R$)" value={valorGarantia} onChange={setValorGarantia} />
        <MoneyField label="ARO nova (R$)" value={valorAro} onChange={setValorAro} />
        <MoneyField label="Garantias atuais* (R$)" value={garantiasAtuais} onChange={setGarantiasAtuais} />
        <MoneyField label="ARO atual* (R$)" value={aroAtual} onChange={setAroAtual} />
        <button type="submit" disabled={loading} style={primaryButton}>
          {loading ? 'Calculando…' : 'Simular'}
        </button>
      </form>
      <div style={{ fontSize: 9.5, color: colors.faint }}>
        * Bases atuais opcionais; informe apenas quando não constarem da posição fiscal disponível.
      </div>
      {loading && <Loading label="Calculando impacto com a posição fiscal auditada…" />}
      {error && <ErrorBox message={error} />}
      {result && <SimulacaoResultado data={result} />}
    </Card>
  );
}

function SimulacaoResultado({ data }: { data: SimulacaoOperacao }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>Impacto projetado</div>
        <Badge text={data.persistido ? 'PERSISTIDO' : 'NÃO PERSISTIDO'} color={data.persistido ? colors.red : colors.green} />
        <span style={{ marginLeft: 'auto', fontSize: 10.5, color: colors.muted }}>RCL base {money(data.rcl_ajustada)}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {data.posicoes.map((position) => <PosicaoCard key={position.indicador} position={position} />)}
      </div>
      {Object.keys(data.memoria).length > 0 && (
        <div style={formulaBox}>
          {Object.entries(data.memoria).map(([key, value]) => (
            <div key={key}>
              <strong>{humanize(key)}:</strong> {formatMemoryValue(key, value)}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {data.source_refs.map((source, index) => (
          <Provenance key={`${source.relatorio}-${index}`} source={source} asOf={data.as_of} />
        ))}
      </div>
    </div>
  );
}

function PosicaoCard({ position }: { position: PosicaoSimulada }) {
  const ceiling = numberValue(position.teto_pct) ?? 0;
  const projected = numberValue(position.pct_projetado);
  const width = projected != null && ceiling > 0 ? Math.min(Math.max((projected / ceiling) * 100, 0), 100) : 0;
  const color = faixaColor(position.faixa_projetada);

  return (
    <div style={{ border: `1px solid ${colors.border}`, borderTop: `3px solid ${color}`, borderRadius: 5, padding: 10 }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, minHeight: 30 }}>{position.rotulo}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <strong style={{ fontFamily: font.mono, fontSize: 20, color }}>{percent(position.pct_projetado)}</strong>
        <span style={{ fontSize: 9.5, color: colors.muted }}>/ {percent(position.teto_pct, 0)}</span>
      </div>
      <div style={{ height: 7, background: colors.borderSoft, borderRadius: 2, margin: '7px 0' }}>
        <div style={{ width: `${width}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <div style={{ fontSize: 9.5, color: colors.muted, lineHeight: 1.45 }}>
        {position.posicao_atual_conhecida ? `Atual ${percent(position.pct_atual)} · ` : 'Posição atual não disponível · '}
        incremento {money(position.incremento)} · projetado {money(position.valor_projetado)}
      </div>
      {position.faixa_projetada && <div style={{ fontSize: 9.5, color, marginTop: 4 }}>Faixa: {position.faixa_projetada}</div>}
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 9.5, color: colors.muted }}>{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        style={inputStyle}
      />
    </label>
  );
}

function MeasureValues({ measures }: { measures: Record<string, number | null> }) {
  const values = Object.entries(measures);
  if (values.length === 0) return <span style={{ fontSize: 10, color: colors.faint }}>sem medida</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      {values.map(([key, value]) => (
        <span key={key} style={{ fontFamily: font.mono, fontSize: 10 }}>
          <span style={{ color: colors.faint }}>{humanize(key)} </span>{formatMeasure(key, value)}
        </span>
      ))}
    </div>
  );
}

function MiniValue({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: `1px solid ${colors.borderSoft}`, borderRadius: 4, padding: '7px 8px' }}>
      <div style={{ fontSize: 9, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontFamily: font.mono, fontSize: 11.5, fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{ fontSize: 8.5, padding: '2px 6px', border: `1px solid ${color}`, color, borderRadius: 3, fontWeight: 700, letterSpacing: '0.04em' }}>
      {text}
    </span>
  );
}

function Provenance({ source, asOf }: { source: SourceRef | null | undefined; asOf: string | null | undefined }) {
  return (
    <div style={{ fontSize: 9.5, color: colors.faint, fontFamily: font.mono, lineHeight: 1.45 }}>
      fonte: {sourceText(source)} · as_of {asOf ?? '—'}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ padding: '18px 10px', textAlign: 'center', color: colors.muted, fontSize: 11 }}>{text}</div>;
}

function formatMeasure(key: string, value: MaybeNumber): string {
  if (key.includes('pct') || key.includes('percent')) return percent(value);
  if (key.includes('quant') || key.includes('operac') || key.includes('count')) {
    const parsed = numberValue(value);
    return parsed == null ? '—' : fmt(parsed, 0);
  }
  return money(value);
}

function formatMemoryValue(key: string, value: string | number | boolean | null): string {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'sim' : 'não';
  if (typeof value === 'number') return formatMeasure(key, value);
  return value;
}

function humanize(value: string): string {
  return value.replace(/_/g, ' ').replace(/^./, (letter: string) => letter.toLocaleUpperCase('pt-BR'));
}

const eyebrow: CSSProperties = {
  fontSize: 10.5,
  color: colors.faint,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  fontWeight: 600,
};

const heroValue: CSSProperties = {
  fontFamily: font.mono,
  fontSize: 38,
  fontWeight: 600,
  letterSpacing: '-0.03em',
};

const formulaBox: CSSProperties = {
  padding: '8px 10px',
  border: `1px dashed ${colors.border}`,
  background: colors.surfaceAlt,
  borderRadius: 4,
  color: colors.muted,
  fontFamily: font.mono,
  fontSize: 9.5,
  lineHeight: 1.5,
};

const inputStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  padding: '8px 9px',
  border: `1px solid ${colors.border}`,
  borderRadius: 4,
  background: colors.bg,
  color: colors.ink,
  fontFamily: font.mono,
  fontSize: 11,
};

const primaryButton: CSSProperties = {
  padding: '9px 14px',
  border: 0,
  borderRadius: 4,
  background: colors.primary,
  color: '#fff',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
};

const segmentButton = (active: boolean): CSSProperties => ({
  border: `1px solid ${active ? colors.primary : colors.border}`,
  background: active ? colors.accentSoft : colors.surface,
  color: active ? colors.primary : colors.muted,
  borderRadius: 3,
  padding: '5px 8px',
  fontSize: 10,
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
});

const crumbButton = (active: boolean): CSSProperties => ({
  border: 0,
  background: 'transparent',
  padding: 0,
  color: active ? colors.primary : colors.muted,
  fontSize: 10.5,
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
});
