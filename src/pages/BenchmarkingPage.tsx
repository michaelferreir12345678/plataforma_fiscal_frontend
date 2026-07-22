import { useState, type CSSProperties } from 'react';
import { colors, font, type RiskLevel } from '../theme';
import { Card } from '../components/Card';
import { SectionLabel } from '../components/SectionLabel';
import { StatusBadge } from '../components/StatusBadge';
import { Async } from '../components/AsyncState';
import { useApp, useResource } from '../context/AppContext';
import {
  fetchBenchmark,
  fetchBenchmarkRanking,
  type BenchmarkOrdenacao,
  type BenchmarkRankingResponse,
  type BenchmarkResponse,
  type BenchmarkSentido,
  type BenchmarkValue,
  type DirecaoOrdenacao,
  type FiscalDecimal,
  type SourceRef,
} from '../services/backend';
import { fmt, pct } from '../utils/format';

const DEFAULT_COHORT = '';
const DEFAULT_INDICATOR = '';
const RANKING_COLUMNS = '70px minmax(220px, 2fr) minmax(140px, 1fr) 110px minmax(170px, 1.2fr) 120px';

const CRITERIO_LABEL: Record<string, string> = {
  porte: 'Porte populacional',
  regiao: 'Região',
  pib: 'Faixa de PIB',
};

const FAIXA_NIVEL: Record<string, RiskLevel> = {
  normal: 'folga',
  adequado: 'folga',
  alerta: 'atencao',
  prudencial: 'prudencial',
  excedido: 'maximo',
  insuficiente: 'maximo',
};

export function BenchmarkingPage() {
  const { ente, periodo } = useApp();
  const [coorte, setCoorte] = useState(DEFAULT_COHORT);
  const [indicador, setIndicador] = useState(DEFAULT_INDICATOR);
  const [ordenarPor, setOrdenarPor] = useState<BenchmarkOrdenacao>('posicao');
  const [ordem, setOrdem] = useState<DirecaoOrdenacao>('asc');
  const [pagina, setPagina] = useState(1);
  const [drilledEnte, setDrilledEnte] = useState<BenchmarkValue | null>(null);

  const benchmark = useResource(
    () =>
      fetchBenchmark({
        indicador: indicador || undefined,
        ente: ente.cod_ibge,
        coorte: coorte || undefined,
        periodo,
      }),
    [indicador, ente.cod_ibge, coorte, periodo],
  );
  const benchmarkMatchesFilters = Boolean(
    benchmark.data &&
      (!indicador || benchmark.data.indicador === indicador) &&
      (!coorte ||
        benchmark.data.coorte.codigo === coorte ||
        benchmark.data.coorte.criterio === coorte) &&
      benchmark.data.periodo === periodo,
  );
  const resolvedBenchmark = benchmarkMatchesFilters ? benchmark.data : null;
  const snapshotAsOf = resolvedBenchmark?.as_of;
  const ranking = useResource(
    () =>
      fetchBenchmarkRanking({
        indicador: resolvedBenchmark?.indicador || indicador || undefined,
        ente: ente.cod_ibge,
        coorte: resolvedBenchmark?.coorte.codigo || coorte || undefined,
        periodo,
        asOf: snapshotAsOf,
        ordenarPor,
        ordem,
        pagina,
        porPagina: 100,
      }),
    [indicador, ente.cod_ibge, coorte, periodo, snapshotAsOf, ordenarPor, ordem, pagina],
  );

  const chooseCohort = (id: string) => {
    setCoorte(id);
    setOrdenarPor('posicao');
    setOrdem('asc');
    setPagina(1);
    setDrilledEnte(null);
  };

  const chooseIndicator = (codigo: string) => {
    setIndicador(codigo);
    setOrdenarPor('posicao');
    setOrdem('asc');
    setPagina(1);
    setDrilledEnte(null);
  };

  const changeSort = (field: BenchmarkOrdenacao) => {
    setPagina(1);
    if (ordenarPor === field) {
      setOrdem((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setOrdenarPor(field);
    setOrdem(field === 'valor' || field === 'percentil' ? 'desc' : 'asc');
  };

  const drillToEnte = (item: BenchmarkValue) => {
    setDrilledEnte(item);
  };

  return (
    <div
      className="fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      data-screen-label="Benchmarking"
    >
      <Card pad={0} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Benchmarking &amp; Comparativos</div>
          <div style={{ fontSize: 11, color: colors.muted }}>
            coortes explícitas · percentil materializado · dado fiscal real
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11.5, fontWeight: 600 }}>{ente.nome}</div>
          <div style={{ fontSize: 9.5, color: colors.faint, fontFamily: font.mono }}>
            IBGE {ente.cod_ibge} · período {periodo}
          </div>
        </div>
      </Card>

      <Async res={benchmark}>
        {(data) => (
          <>
            <Selectors
              data={data}
              selectedCohort={coorte || data.coorte.codigo}
              selectedIndicator={indicador || data.indicador}
              onCohort={chooseCohort}
              onIndicator={chooseIndicator}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 12 }}>
              <Distribution data={data} />
              <Comparison data={data} />
            </div>

            <Async res={ranking}>
              {(rankingData) => (
                <>
                  <Ranking
                    data={rankingData}
                    benchmark={data}
                    selectedIbge={drilledEnte?.cod_ibge ?? ente.cod_ibge}
                    ordenarPor={ordenarPor}
                    ordem={ordem}
                    onSort={changeSort}
                    onEnte={drillToEnte}
                    onPage={setPagina}
                  />
                  {drilledEnte && (
                    <EntityPositionDrill
                      item={drilledEnte}
                      unidade={data.unidade}
                      onClose={() => setDrilledEnte(null)}
                    />
                  )}
                  <MemoryPanel benchmark={data} ranking={rankingData} />
                </>
              )}
            </Async>
          </>
        )}
      </Async>
    </div>
  );
}

function Selectors({
  data,
  selectedCohort,
  selectedIndicator,
  onCohort,
  onIndicator,
}: {
  data: BenchmarkResponse;
  selectedCohort: string;
  selectedIndicator: string;
  onCohort: (id: string) => void;
  onIndicator: (codigo: string) => void;
}) {
  const cohorts = data.coortes_disponiveis.length > 0 ? data.coortes_disponiveis : [data.coorte];
  const indicators =
    data.indicadores_disponiveis.length > 0
      ? data.indicadores_disponiveis
      : [{ codigo: data.indicador, rotulo: data.indicador_rotulo, unidade: data.unidade, sentido: data.sentido }];

  return (
    <Card pad={14}>
      <SectionLabel note="porte · região · PIB; a faixa é resolvida com dados do IBGE">
        Coorte de comparação
      </SectionLabel>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }} role="group" aria-label="Selecionar coorte">
        {cohorts.map((item) => {
          const active =
            selectedCohort === item.codigo ||
            (selectedCohort === item.criterio && data.coorte.codigo === item.codigo);
          return (
            <button key={item.id} type="button" onClick={() => onCohort(item.codigo)} style={selectorStyle(active)} title={sourceText(item.source_ref)}>
              <span>{item.rotulo}</span>
              <span style={{ opacity: 0.72, fontFamily: font.mono, fontSize: 9 }}>
                {CRITERIO_LABEL[item.criterio] ?? item.criterio} · {item.faixa}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ height: 1, background: colors.borderSoft, margin: '12px 0' }} />
      <SectionLabel note="somente indicadores materializados para o período">Indicador</SectionLabel>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }} role="group" aria-label="Selecionar indicador">
        {indicators.map((item) => {
          const active = selectedIndicator === item.codigo;
          return (
            <button key={item.codigo} type="button" onClick={() => onIndicator(item.codigo)} style={indicatorStyle(active)}>
              {item.rotulo}
              <span style={{ opacity: 0.7, marginLeft: 6, fontFamily: font.mono, fontSize: 9 }}>{item.unidade}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function Distribution({ data }: { data: BenchmarkResponse }) {
  const percentile = clamp(numberValue(data.ente.percentil) ?? 0, 0, 100);
  const entityValue = numberValue(data.ente.valor);
  const medianValue = numberValue(data.distribuicao.mediana);
  const medianSentence =
    entityValue === null || medianValue === null
      ? 'não pôde ser comparado com a mediana numérica da coorte'
      : entityValue === medianValue
        ? 'é igual à mediana numérica da coorte'
        : `está ${entityValue > medianValue ? 'acima' : 'abaixo'} da mediana numérica da coorte`;
  const markerTransform = percentile < 12 ? 'translateX(0)' : percentile > 88 ? 'translateX(-100%)' : 'translateX(-50%)';
  const quantiles: Array<[string, FiscalDecimal]> = [
    ['p10', data.distribuicao.p10],
    ['p25', data.distribuicao.p25],
    ['mediana', data.distribuicao.mediana],
    ['p75', data.distribuicao.p75],
    ['p90', data.distribuicao.p90],
  ];

  return (
    <Card>
      <SectionLabel note={`${data.quantidade} de ${data.cobertura.entes_elegiveis} entes elegíveis · ${data.coorte.rotulo}`}>Posição na distribuição da coorte</SectionLabel>
      {data.cobertura.amostra_parcial && (
        <div style={{ marginTop: 7, padding: '7px 9px', borderRadius: 4, background: colors.yellowSoft, color: colors.muted, fontSize: 10.5 }}>
          Cobertura parcial: {fmt(numberValue(data.cobertura.percentual) ?? 0, 1)}% dos entes elegíveis têm valor real comparável neste indicador/período. O percentil usa somente esses {data.cobertura.entes_com_valor} entes.
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
        <div style={{ fontFamily: font.mono, fontSize: 30, fontWeight: 700, color: colors.primary }}>
          P{fmt(percentile, 1)}
        </div>
        <div style={{ fontSize: 12, color: colors.muted }}>
          {formatBenchmarkValue(data.ente.valor, data.unidade)}
        </div>
      </div>

      <div style={{ position: 'relative', height: 70, margin: '22px 4px 4px' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 25,
            height: 8,
            borderRadius: 4,
            background: distributionGradient(data.sentido),
          }}
        />
        {[10, 25, 50, 75, 90].map((point) => (
          <div key={point} style={{ position: 'absolute', left: `${point}%`, top: 20, height: 18, width: 1, background: colors.surface, opacity: 0.85 }} />
        ))}
        <div style={{ position: 'absolute', left: '50%', top: 8, height: 40, width: 1, background: colors.muted }} />
        <div style={{ position: 'absolute', left: '50%', top: -6, transform: 'translateX(-50%)', fontSize: 9, color: colors.muted, fontWeight: 600 }}>
          mediana
        </div>
        <div style={{ position: 'absolute', left: `${percentile}%`, top: 18, transform: 'translateX(-50%)' }}>
          <div style={{ width: 21, height: 21, borderRadius: '50%', background: colors.primaryDeep, border: '3px solid #fff', boxShadow: '0 1px 5px rgba(0,0,0,.28)' }} />
        </div>
        <div
          style={{
            position: 'absolute',
            left: `${percentile}%`,
            top: 48,
            transform: markerTransform,
            maxWidth: 180,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 9.5,
            color: colors.primaryDeep,
            fontWeight: 700,
          }}
        >
          {entityName(data.ente)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5, marginTop: 4 }}>
        {quantiles.map(([label, value]) => (
          <div key={label} style={{ padding: '6px 5px', background: colors.bg, border: `1px solid ${colors.borderSoft}`, borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontSize: 8.5, color: colors.faint, textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: 9.5, fontFamily: font.mono, marginTop: 2 }}>{formatBenchmarkValue(value, data.unidade)}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: colors.muted, marginTop: 12, lineHeight: 1.5 }}>
        O valor de {entityName(data.ente)} {medianSentence}.
        {' '}{senseText(data.sentido)} O percentil exibido vem do cálculo materializado no backend, inclusive para empates.
      </div>
      <AuditLine sources={benchmarkSources(data)} asOf={data.as_of} />
    </Card>
  );
}

function Comparison({ data }: { data: BenchmarkResponse }) {
  const minimum = numberValue(data.distribuicao.minimo) ?? 0;
  const maximum = numberValue(data.distribuicao.maximo) ?? minimum;
  const higherIsBetter = data.sentido === 'maior_melhor';
  const lowerIsBetter = data.sentido === 'menor_melhor';
  const best = higherIsBetter ? data.distribuicao.maximo : data.distribuicao.minimo;
  const worst = higherIsBetter ? data.distribuicao.minimo : data.distribuicao.maximo;
  const rows = [
    { label: 'Este ente', value: data.ente.valor, color: colors.primaryDeep, strong: true },
    { label: 'Mediana da coorte', value: data.distribuicao.mediana, color: colors.muted, strong: false },
    { label: lowerIsBetter || higherIsBetter ? 'Melhor da coorte' : 'Mínimo da coorte', value: best, color: colors.green, strong: false },
    { label: lowerIsBetter || higherIsBetter ? 'Pior da coorte' : 'Máximo da coorte', value: worst, color: colors.red, strong: false },
  ];

  return (
    <Card>
      <SectionLabel note={`${CRITERIO_LABEL[data.coorte.criterio] ?? data.coorte.criterio} · ${data.coorte.faixa}`}>
        Ente × mediana × extremos
      </SectionLabel>
      <div style={{ marginTop: 8 }}>
        {rows.map((row) => {
          const value = numberValue(row.value) ?? minimum;
          const position = normalize(value, minimum, maximum);
          return (
            <div key={row.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 5 }}>
                <span style={{ fontSize: 11.5, fontWeight: row.strong ? 700 : 400 }}>{row.label}</span>
                <span style={{ fontFamily: font.mono, fontSize: 11.5, fontWeight: row.strong ? 700 : 500 }}>
                  {formatBenchmarkValue(row.value, data.unidade)}
                </span>
              </div>
              <div style={{ position: 'relative', height: row.strong ? 13 : 9, background: colors.borderSoft, borderRadius: 4 }}>
                <div style={{ position: 'absolute', inset: 0, right: `${100 - position}%`, background: row.color, borderRadius: 4, opacity: row.strong ? 1 : 0.78 }} />
                <div style={{ position: 'absolute', left: `calc(${position}% - 3px)`, top: -2, width: 6, height: row.strong ? 17 : 13, background: row.color, borderRadius: 2 }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: font.mono, fontSize: 9, color: colors.faint }}>
        <span>{formatBenchmarkValue(data.distribuicao.minimo, data.unidade)}</span>
        <span>{formatBenchmarkValue(data.distribuicao.maximo, data.unidade)}</span>
      </div>
      <AuditLine sources={benchmarkSources(data)} asOf={data.as_of} />
    </Card>
  );
}

function Ranking({
  data,
  benchmark,
  selectedIbge,
  ordenarPor,
  ordem,
  onSort,
  onEnte,
  onPage,
}: {
  data: BenchmarkRankingResponse;
  benchmark: BenchmarkResponse;
  selectedIbge: string;
  ordenarPor: BenchmarkOrdenacao;
  ordem: DirecaoOrdenacao;
  onSort: (field: BenchmarkOrdenacao) => void;
  onEnte: (item: BenchmarkValue) => void;
  onPage: (page: number) => void;
}) {
  const anchor = data.ente_ancora;
  const sources = rankingSources(data);

  return (
    <Card pad={0}>
      <div style={{ padding: '14px 16px 10px', display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Ranking da coorte · ente ancorado</div>
          <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>
            {data.coorte.rotulo} · {data.total} entes com valor · clique numa linha para abrir sua posição e memória
          </div>
        </div>
        <AuditLine sources={sources} asOf={data.as_of} compact />
      </div>

      <div style={{ margin: '0 16px 12px', padding: '10px 12px', border: `1px solid ${colors.primary}`, borderLeftWidth: 4, borderRadius: 5, background: colors.accentSoft }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr repeat(3, minmax(100px, 0.6fr))', gap: 12, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 9, color: colors.primary, letterSpacing: '0.06em', fontWeight: 700 }}>● ESTE ENTE</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{entityName(anchor)}{anchor.uf ? ` · ${anchor.uf}` : ''}</div>
            <div style={{ fontSize: 9, color: colors.faint, fontFamily: font.mono }}>IBGE {anchor.cod_ibge}</div>
          </div>
          <AnchorMetric label="posição" value={`#${anchor.posicao}`} />
          <AnchorMetric label={benchmark.indicador_rotulo} value={formatBenchmarkValue(anchor.valor, benchmark.unidade)} />
          <AnchorMetric label="percentil" value={`P${formatPercentile(anchor.percentil)}`} />
        </div>
        <div style={{ marginTop: 6 }}>
          <AuditLine sources={[anchor.source_ref]} asOf={anchor.as_of ?? data.as_of} compact />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: RANKING_COLUMNS, ...tableHeaderStyle }}>
        <SortHeader label="#" field="posicao" selected={ordenarPor} direction={ordem} onSort={onSort} />
        <SortHeader label="Ente" field="nome" selected={ordenarPor} direction={ordem} onSort={onSort} />
        <SortHeader label={benchmark.indicador_rotulo} field="valor" selected={ordenarPor} direction={ordem} onSort={onSort} align="right" />
        <SortHeader label="Percentil" field="percentil" selected={ordenarPor} direction={ordem} onSort={onSort} align="right" />
        <div>Fonte / as_of</div>
        <div style={{ textAlign: 'center' }}>Faixa</div>
      </div>

      {data.itens.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: colors.muted, fontSize: 11.5 }}>
          A coorte não possui linhas para o indicador e período selecionados.
        </div>
      ) : (
        data.itens.map((item) => {
          const highlighted = item.destaque || item.cod_ibge === selectedIbge;
          return (
            <button
              key={item.cod_ibge}
              type="button"
              onClick={() => onEnte(item)}
              aria-current={highlighted ? 'true' : undefined}
              title={`Selecionar ${entityName(item)} e abrir sua posição na coorte`}
              style={{
                display: 'grid',
                gridTemplateColumns: RANKING_COLUMNS,
                width: '100%',
                padding: '9px 16px',
                border: 0,
                borderBottom: `1px solid ${colors.rowBorder}`,
                background: highlighted ? colors.accentSoft : 'transparent',
                color: colors.ink,
                fontSize: 12,
                textAlign: 'left',
                alignItems: 'center',
              }}
            >
              <div style={{ fontFamily: font.mono, color: highlighted ? colors.primary : colors.muted, fontWeight: highlighted ? 700 : 400 }}>
                {item.posicao}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: highlighted ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entityName(item)}{item.uf ? ` · ${item.uf}` : ''}
                  {highlighted && <span style={{ marginLeft: 8, fontSize: 8.5, color: colors.primary }}>● ESTE ENTE</span>}
                </div>
                <div style={{ fontFamily: font.mono, fontSize: 8.5, color: colors.faint }}>IBGE {item.cod_ibge}</div>
              </div>
              <div style={{ textAlign: 'right', fontFamily: font.mono, fontWeight: highlighted ? 700 : 500 }}>
                {formatBenchmarkValue(item.valor, benchmark.unidade)}
              </div>
              <div style={{ textAlign: 'right', fontFamily: font.mono, color: highlighted ? colors.primary : colors.muted }}>
                P{formatPercentile(item.percentil)}
              </div>
              <div style={{ minWidth: 0, fontFamily: font.mono, fontSize: 8.5, color: colors.faint, lineHeight: 1.4 }} title={sourceText(item.source_ref)}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sourceText(item.source_ref)}</div>
                <div>as_of {item.as_of ?? data.as_of ?? '—'}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <FaixaBadge faixa={item.faixa} />
              </div>
            </button>
          );
        })
      )}
      {data.total_paginas > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, padding: '10px 16px' }}>
          <button type="button" disabled={data.pagina <= 1} onClick={() => onPage(data.pagina - 1)} style={pageButtonStyle}>
            Anterior
          </button>
          <span style={{ fontSize: 10, color: colors.muted, fontFamily: font.mono }}>
            página {data.pagina} de {data.total_paginas}
          </span>
          <button type="button" disabled={data.pagina >= data.total_paginas} onClick={() => onPage(data.pagina + 1)} style={pageButtonStyle}>
            Próxima
          </button>
        </div>
      )}
    </Card>
  );
}


function EntityPositionDrill({
  item,
  unidade,
  onClose,
}: {
  item: BenchmarkValue;
  unidade: string;
  onClose: () => void;
}) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <SectionLabel note={`IBGE ${item.cod_ibge}`}>Drill ente → posição</SectionLabel>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {entityName(item)}{item.uf ? ` · ${item.uf}` : ''}
          </div>
        </div>
        <button type="button" onClick={onClose} style={pageButtonStyle}>Fechar</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(120px, 1fr))', gap: 12, marginTop: 12 }}>
        <AnchorMetric label="posição" value={`#${item.posicao}`} />
        <AnchorMetric label="valor" value={formatBenchmarkValue(item.valor, unidade)} />
        <AnchorMetric label="percentil" value={`P${formatPercentile(item.percentil)}`} />
      </div>
      <div style={{ marginTop: 12 }}>
        <MemoryBlock title="Memória deste ente" value={item.memoria ?? {}} />
      </div>
      <AuditLine sources={[item.source_ref]} asOf={item.as_of} />
    </Card>
  );
}


function MemoryPanel({ benchmark, ranking }: { benchmark: BenchmarkResponse; ranking: BenchmarkRankingResponse }) {
  const sources = uniqueSources([...benchmarkSources(benchmark), ...rankingSources(ranking)]);
  return (
    <Card>
      <details open>
        <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: colors.ink }}>
          Memória de cálculo rastreável
        </summary>
        <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 4 }}>
          Critérios, fórmula de percentil, tratamento de empates e ordenação executados no backend.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <MemoryBlock title="Distribuição e percentil" value={benchmark.memoria} />
          <MemoryBlock title="Ranking" value={ranking.memoria} />
        </div>
      </details>
      <AuditLine sources={sources} asOf={benchmark.as_of ?? ranking.as_of} />
    </Card>
  );
}

function MemoryBlock({ title, value }: { title: string; value: Record<string, unknown> }) {
  return (
    <div style={{ border: `1px solid ${colors.borderSoft}`, borderRadius: 5, overflow: 'hidden' }}>
      <div style={{ padding: '7px 10px', background: colors.bg, fontSize: 9.5, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </div>
      <div style={{ padding: '7px 10px' }}>
        {Object.keys(value).length === 0 ? (
          <span style={{ fontSize: 10.5, color: colors.faint }}>Memória não informada.</span>
        ) : (
          Object.entries(value).map(([key, item]) => (
            <div key={key} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, .7fr) minmax(0, 1.3fr)', gap: 10, padding: '5px 0', borderBottom: `1px dashed ${colors.borderSoft}`, fontSize: 10.5 }}>
              <span style={{ color: colors.muted }}>{humanize(key)}</span>
              <MemoryValue value={item} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MemoryValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span style={{ fontFamily: font.mono }}>—</span>;
  if (typeof value === 'boolean') return <span style={{ fontFamily: font.mono }}>{value ? 'sim' : 'não'}</span>;
  if (typeof value === 'string' || typeof value === 'number') return <span style={{ fontFamily: font.mono, overflowWrap: 'anywhere' }}>{String(value)}</span>;
  if (Array.isArray(value)) {
    return <span style={{ fontFamily: font.mono, overflowWrap: 'anywhere' }}>{value.map(memoryScalar).join(' · ')}</span>;
  }
  if (typeof value === 'object') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {Object.entries(value as Record<string, unknown>).map(([key, item]) => (
          <span key={key} style={{ fontFamily: font.mono, overflowWrap: 'anywhere' }}>
            <span style={{ color: colors.faint }}>{humanize(key)}:</span> {memoryScalar(item)}
          </span>
        ))}
      </div>
    );
  }
  return <span style={{ fontFamily: font.mono }}>{String(value)}</span>;
}

function AnchorMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 8.5, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontFamily: font.mono, fontSize: 14, fontWeight: 700, color: colors.primary, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function SortHeader({
  label,
  field,
  selected,
  direction,
  onSort,
  align = 'left',
}: {
  label: string;
  field: BenchmarkOrdenacao;
  selected: BenchmarkOrdenacao;
  direction: DirecaoOrdenacao;
  onSort: (field: BenchmarkOrdenacao) => void;
  align?: 'left' | 'right';
}) {
  const active = field === selected;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      aria-label={`Ordenar por ${label}`}
      style={{ border: 0, padding: 0, background: 'transparent', color: active ? colors.primary : colors.muted, font: 'inherit', fontWeight: active ? 700 : 600, textTransform: 'inherit', letterSpacing: 'inherit', textAlign: align, cursor: 'pointer' }}
    >
      {label} {active ? (direction === 'asc' ? '▲' : '▼') : '↕'}
    </button>
  );
}

function FaixaBadge({ faixa }: { faixa: string | null | undefined }) {
  if (!faixa) return <StatusBadge level="neutro" label="—" />;
  return <StatusBadge level={FAIXA_NIVEL[faixa.toLowerCase()] ?? 'neutro'} label={faixa} />;
}

function AuditLine({ sources, asOf, compact = false }: { sources: SourceRef[]; asOf: string | null | undefined; compact?: boolean }) {
  const refs = uniqueSources(sources);
  return (
    <div
      style={{
        marginTop: compact ? 0 : 10,
        paddingTop: compact ? 0 : 8,
        borderTop: compact ? 0 : `1px solid ${colors.borderSoft}`,
        fontFamily: font.mono,
        fontSize: 8.8,
        color: colors.faint,
        lineHeight: 1.45,
        textAlign: compact ? 'right' : 'left',
      }}
    >
      fonte: {refs.length > 0 ? refs.map(sourceText).join(' + ') : '—'} · as_of {asOf ?? '—'}
    </div>
  );
}

function benchmarkSources(data: BenchmarkResponse): SourceRef[] {
  return uniqueSources([
    ...(data.source_refs ?? []),
    ...(data.source_ref ? [data.source_ref] : []),
    data.coorte.source_ref,
    data.ente.source_ref,
  ]);
}

function rankingSources(data: BenchmarkRankingResponse): SourceRef[] {
  return uniqueSources([
    ...(data.source_refs ?? []),
    ...(data.source_ref ? [data.source_ref] : []),
    data.coorte.source_ref,
    data.ente_ancora.source_ref,
  ]);
}

function uniqueSources(sources: Array<SourceRef | null | undefined>): SourceRef[] {
  const seen = new Set<string>();
  return sources.flatMap((source) => {
    if (!source) return [];
    const key = `${source.relatorio}|${source.anexo ?? ''}|${source.periodo ?? ''}|${source.versao_entrega ?? ''}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [source];
  });
}

function sourceText(source: SourceRef): string {
  return [source.relatorio, source.anexo, source.periodo, source.versao_entrega ? `v${source.versao_entrega}` : null]
    .filter(Boolean)
    .join(' · ');
}

function entityName(item: BenchmarkValue): string {
  return item.nome?.trim() || `Ente ${item.cod_ibge}`;
}

function formatBenchmarkValue(value: FiscalDecimal, unidade: string): string {
  const parsed = numberValue(value);
  if (parsed === null) return '—';
  const normalized = unidade.toLocaleLowerCase('pt-BR');
  if (normalized.includes('%') || normalized.includes('percent')) {
    return `${pct(parsed, 2)}${normalized.includes('rcl') ? ' RCL' : ''}`;
  }
  if (normalized === 'brl' || normalized.includes('r$') || normalized.includes('real')) {
    return `R$ ${fmt(parsed, 2)}${normalized.includes('per capita') ? ' per capita' : ''}`;
  }
  return unidade ? `${fmt(parsed, 2)} ${unidade}` : fmt(parsed, 2);
}

function formatPercentile(value: FiscalDecimal): string {
  const parsed = numberValue(value);
  return parsed === null ? '—' : fmt(clamp(parsed, 0, 100), 1);
}

function numberValue(value: FiscalDecimal | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalize(value: number, minimum: number, maximum: number): number {
  if (maximum === minimum) return 50;
  return clamp(((value - minimum) / (maximum - minimum)) * 100, 0, 100);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function distributionGradient(sentido: BenchmarkSentido): string {
  if (sentido === 'maior_melhor') {
    return `linear-gradient(90deg, ${colors.redSoft}, ${colors.yellowSoft}, ${colors.greenSoft})`;
  }
  if (sentido === 'menor_melhor') {
    return `linear-gradient(90deg, ${colors.greenSoft}, ${colors.yellowSoft}, ${colors.redSoft})`;
  }
  return `linear-gradient(90deg, ${colors.neutralSoft}, ${colors.accentSoft}, ${colors.neutralSoft})`;
}

function senseText(sentido: BenchmarkSentido): string {
  if (sentido === 'maior_melhor') return 'Para este indicador, valores maiores são favoráveis.';
  if (sentido === 'menor_melhor') return 'Para este indicador, valores menores são favoráveis.';
  return 'O indicador não possui direção normativa de melhor ou pior.';
}

function memoryScalar(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'sim' : 'não';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function humanize(value: string): string {
  const text = value.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function selectorStyle(active: boolean): CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
    padding: '7px 12px',
    borderRadius: 5,
    fontSize: 11.5,
    fontWeight: active ? 700 : 500,
    background: active ? colors.primary : colors.bg,
    color: active ? colors.bg : colors.ink,
    border: `1px solid ${active ? colors.primary : colors.border}`,
  };
}

function indicatorStyle(active: boolean): CSSProperties {
  return {
    padding: '7px 13px',
    borderRadius: 4,
    fontSize: 11.5,
    fontWeight: active ? 700 : 500,
    background: active ? colors.accentSoft : colors.surface,
    color: active ? colors.primary : colors.muted,
    border: `1px solid ${active ? colors.primary : colors.border}`,
  };
}

const tableHeaderStyle: CSSProperties = {
  padding: '7px 16px',
  background: colors.bg,
  borderTop: `1px solid ${colors.border}`,
  borderBottom: `1px solid ${colors.border}`,
  fontSize: 9,
  fontWeight: 600,
  color: colors.muted,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  alignItems: 'center',
};

const pageButtonStyle: CSSProperties = {
  padding: '6px 10px',
  borderRadius: 4,
  border: `1px solid ${colors.border}`,
  background: colors.surface,
  color: colors.primary,
  fontSize: 10.5,
  fontWeight: 600,
};
