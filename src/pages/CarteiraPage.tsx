/**
 * Carteira & Visão Estadual (Sprint 23) — reescrita.
 *
 * Separa, sem nunca confundir, quatro contextos:
 *  - **Consolidado UF** — o agregado dos municípios (Σnum/Σden, jamais média de %), com
 *    cobertura explícita (n/184 + ausentes + períodos mistos), mapa coroplético REAL
 *    (malha do IBGE), distribuição/concentração e ranking clicável.
 *  - **Ente estadual** — o Governo do Estado (um ente distinto, com seu próprio cockpit).
 *  - **Minha carteira** — o escopo do usuário (consultoria).
 *  - **Grupos** — a carteira agrupada por rótulo.
 *
 * Cada número vem do backend com `source_ref`; entes sem dado aparecem como "sem dado",
 * nunca como zero. Clicar num município (ranking ou mapa) **troca o ente do contexto** e
 * abre o cockpit — o drill do território para o ente.
 */
import { fmt as fmtNum } from '../utils/format';
import { useId, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { colors, font } from '../theme';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { Async } from '../components/AsyncState';
import { AccessibleTabs, tabId, tabPanelId } from '../components/AccessibleTabs';
import { PageHeader } from '../components/PageHeader';
import { VirtualizedTable, type VirtualColumn } from '../components/VirtualizedTable';
import { ExportButton } from '../components/ExportButton';
import { useApp, useResource, type EnteSel } from '../context/AppContext';
import {
  acaoLoteCarteira,
  fetchCarteiraGrade,
  fetchCarteiraResumo,
  fetchConsolidadoUf,
  fetchMalha,
  fetchUfDistribuicao,
  fetchUfMapa,
  fetchUfRanking,
} from '../services/backend';
import type {
  CarteiraEnteRow,
  GeoFeature,
  IndicadorConsolidado,
  MalhaResponse,
  MapaUfResponse,
  RankingItem,
} from '../services/backend';

// faixa/conformidade nomeada pelo backend → tema
const COR: Record<string, { fill: string; stroke: string; text: string }> = {
  verde: { fill: colors.greenSoft, stroke: colors.green, text: colors.green },
  amarelo: { fill: colors.yellowSoft, stroke: colors.yellow, text: colors.yellowText },
  laranja: { fill: colors.orangeSoft, stroke: colors.orange, text: colors.orange },
  vermelho: { fill: colors.redSoft, stroke: colors.red, text: colors.red },
  cinza: { fill: colors.neutralSoft, stroke: colors.neutral, text: colors.neutral },
};
const corDe = (n: string | null | undefined) => COR[n ?? 'cinza'] ?? COR.cinza;

const num = (v: number | string | null | undefined): number | null =>
  v === null || v === undefined ? null : Number(v);

/**
 * Formatação pt-BR. `toFixed` produz **ponto** decimal — e em pt-BR ponto é separador de
 * milhar: "R$ 1234.56 bi" é ambíguo em três ordens de grandeza, justamente no consolidado
 * de uma UF inteira. As demais 22 páginas usam `fmt`; esta era a exceção, e ainda era
 * inconsistente consigo mesma (a última linha de `brl` já usava `toLocaleString`).
 */
function pct(v: number | string | null | undefined, casas = 2): string {
  const n = num(v);
  return n === null ? '—' : fmtNum(n, casas) + '%';
}
function brl(v: number | string | null | undefined): string {
  const n = num(v);
  if (n === null) return '—';
  if (Math.abs(n) >= 1e9) return `R$ ${fmtNum(n / 1e9, 2)} bi`;
  if (Math.abs(n) >= 1e6) return `R$ ${fmtNum(n / 1e6, 1)} mi`;
  return `R$ ${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

const INDICADORES: { codigo: string; rotulo: string }[] = [
  { codigo: 'pessoal_executivo', rotulo: 'Pessoal' },
  { codigo: 'divida_consolidada_liquida', rotulo: 'Dívida (DCL)' },
  { codigo: 'rcl', rotulo: 'RCL' },
  { codigo: 'disponibilidade', rotulo: 'Disponibilidade' },
];

type Aba = 'consolidado' | 'estadual' | 'carteira' | 'grupos';

const ABAS_VALIDAS: Aba[] = ['consolidado', 'estadual', 'carteira', 'grupos'];

export function CarteiraPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { ente, setEnte, periodo } = useApp();
  // A aba inicial pode vir do seletor de visão do shell (?aba=…).
  const abaInicial = searchParams.get('aba') as Aba | null;
  const [aba, setAba] = useState<Aba>(
    abaInicial && ABAS_VALIDAS.includes(abaInicial) ? abaInicial : 'consolidado',
  );
  const uf = ente.cod_ibge.slice(0, 2);

  // Trocar o ente do contexto e abrir o cockpit — o drill do território para o ente.
  const abrirEnte = (e: EnteSel) => {
    setEnte(e);
    navigate('/dashboard');
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Carteira & Visão Estadual">
      <PageHeader
        title="Carteira & Visão Estadual"
        context={`UF ${uf} · período ${periodo || '—'} · consolidado municipal, ente estadual e carteira`}
        source="SICONFI · indicadores gold · malha territorial IBGE"
        actions={<TabBar aba={aba} setAba={setAba} />}
      />

      <div
        id={tabPanelId('carteira-visao', aba)}
        role="tabpanel"
        aria-labelledby={tabId('carteira-visao', aba)}
        tabIndex={0}
      >
        {!periodo ? (
          <Card style={{ padding: '18px 16px', fontSize: 12.5, color: colors.muted }} pad={0}>
            Selecione um período com dado no seletor do topo para ver o consolidado.
          </Card>
        ) : aba === 'consolidado' ? (
          <ConsolidadoTab uf={uf} periodo={periodo} onEscolherEnte={abrirEnte} />
        ) : aba === 'estadual' ? (
          <EnteEstadualTab uf={uf} periodo={periodo} onEscolherEnte={abrirEnte} />
        ) : aba === 'carteira' ? (
          <CarteiraTab periodo={periodo} onEscolherEnte={abrirEnte} />
        ) : (
          <GruposTab periodo={periodo} onEscolherEnte={abrirEnte} />
        )}
      </div>
    </div>
  );
}

function TabBar({ aba, setAba }: { aba: Aba; setAba: (a: Aba) => void }) {
  const abas: { id: Aba; label: string }[] = [
    { id: 'consolidado', label: 'Consolidado UF' },
    { id: 'estadual', label: 'Ente estadual' },
    { id: 'carteira', label: 'Minha carteira' },
    { id: 'grupos', label: 'Grupos' },
  ];
  return (
    <AccessibleTabs
      tabs={abas}
      value={aba}
      onChange={setAba}
      label="Contexto da carteira"
      idPrefix="carteira-visao"
    />
  );
}

// ============================ Consolidado UF ============================
function ConsolidadoTab({
  uf, periodo, onEscolherEnte,
}: {
  uf: string; periodo: string; onEscolherEnte: (e: EnteSel) => void;
}) {
  const [indicador, setIndicador] = useState('pessoal_executivo');
  const consolidado = useResource(() => fetchConsolidadoUf(uf, periodo), [uf, periodo]);
  const malha = useResource(() => fetchMalha(uf), [uf]);
  const mapa = useResource(() => fetchUfMapa(uf, indicador, periodo), [uf, indicador, periodo]);
  const dist = useResource(() => fetchUfDistribuicao(uf, indicador, periodo), [uf, indicador, periodo]);
  const ranking = useResource(() => fetchUfRanking(uf, { indicador, periodo }), [uf, indicador, periodo]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Cabeçalho: consolidado ≠ ente estadual, cobertura honesta */}
      <Async res={consolidado}>
        {(c) => (
          <Card pad={0} style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                Municípios {c.uf_nome ?? `da UF ${c.uf}`} — consolidado
              </div>
              <span style={{ fontSize: 11, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                {c.n_municipios_com_dado}/{c.n_municipios} com dado em {c.periodo}
              </span>
              {c.ente_estadual && (
                <span style={{ fontSize: 11, color: colors.faint }}>
                  · o Governo {c.uf_nome ? `do ${c.uf_nome}` : 'do estado'} é um ente à parte (aba “Ente estadual”)
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: colors.faint, marginTop: 4 }}>{c.observacao}</div>
          </Card>
        )}
      </Async>

      {/* Cartões de indicador consolidado (Σnum/Σden, nunca média) */}
      <Async res={consolidado}>
        {(c) => (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${c.indicadores.length}, 1fr)`, gap: 10 }}>
            {c.indicadores.map((i) => (
              <IndicadorCard key={i.indicador} ind={i} />
            ))}
          </div>
        )}
      </Async>

      {/* seletor de indicador para mapa/ranking/distribuição */}
      <div role="group" aria-label="Indicador do mapa e do ranking" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Indicador</span>
        {INDICADORES.map((ind) => (
          <button
            key={ind.codigo}
            type="button"
            aria-pressed={indicador === ind.codigo}
            onClick={() => setIndicador(ind.codigo)}
            style={{
              fontSize: 11.5, padding: '4px 10px', borderRadius: 4,
              border: `1px solid ${indicador === ind.codigo ? colors.primary : colors.border}`,
              background: indicador === ind.codigo ? colors.accentSoft : colors.surface,
              color: indicador === ind.codigo ? colors.primary : colors.muted, fontWeight: 500,
            }}
          >
            {ind.rotulo}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Mapa coroplético REAL (malha do IBGE) */}
        <Card style={{ display: 'flex', flexDirection: 'column', minHeight: 380 }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Mapa coroplético</div>
            <div style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
              malha real do IBGE · clique num município para abrir o cockpit
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Async res={malha}>
              {(m) => (
                <Async res={mapa}>
                  {(mp) => <Choropleth malha={m} mapa={mp} onClickEnte={onEscolherEnte} />}
                </Async>
              )}
            </Async>
          </div>
        </Card>

        {/* Distribuição + concentração */}
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Distribuição no território</div>
            <div style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
              percentis e concentração — “sou exceção ou regra?”
            </div>
          </div>
          <Async res={dist}>{(d) => <Distribuicao dist={d} />}</Async>
        </Card>
      </div>

      {/* Ranking clicável (troca o ente do contexto) */}
      <Card pad={0} style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Ranking municipal</div>
            <div style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
              percentil e destaque · clique para trocar o ente e abrir o cockpit
            </div>
          </div>
          {ranking.data && (
            <>
              <span style={{ fontSize: 11, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                {ranking.data.n_com_valor} com valor de {ranking.data.n_total}
              </span>
              <ExportButton
                nome={`Ranking ${indicador}`}
                linhas={ranking.data.itens}
                colunas={[
                  { cabecalho: 'posicao', valor: (i) => i.posicao },
                  { cabecalho: 'cod_ibge', valor: (i) => i.cod_ibge },
                  { cabecalho: 'municipio', valor: (i) => i.nome ?? '' },
                  { cabecalho: 'valor_pct', valor: (i) => i.valor_pct },
                  { cabecalho: 'valor_rs', valor: (i) => i.valor_rs },
                  { cabecalho: 'faixa', valor: (i) => i.faixa ?? '' },
                  { cabecalho: 'percentil', valor: (i) => i.percentil },
                ]}
                contexto={{
                  ente: `Municípios ${uf}`,
                  periodo,
                  fonte: `ranking ${indicador} · ${ranking.data.unidade}`,
                }}
                modeloRelatorio="comparativo"
              />
            </>
          )}
        </div>
        <Async res={ranking}>
          {(r) => <RankingLista itens={r.itens} tipoRatio={r.unidade === 'PCT_RCL'} onEscolherEnte={onEscolherEnte} />}
        </Async>
      </Card>
    </div>
  );
}

function IndicadorCard({ ind }: { ind: IndicadorConsolidado }) {
  const c = corDe(ind.cor);
  const ratio = ind.tipo === 'ratio';
  return (
    <Card pad={0} style={{ padding: '12px 14px', borderLeft: `3px solid ${c.stroke}` }}>
      <div style={{ fontSize: 11, color: colors.faint, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>
        {ind.rotulo}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600, color: ratio ? c.text : colors.ink }}>
          {ratio ? pct(ind.valor_pct) : brl(ind.numerador)}
        </div>
        {ratio && ind.teto_pct && (
          <div style={{ fontSize: 11, color: colors.muted }}>/ teto {pct(ind.teto_pct, 0)}</div>
        )}
      </div>
      {ratio && (
        <div style={{ fontSize: 11, color: colors.faint, marginTop: 1, fontFamily: "'JetBrains Mono', monospace" }}>
          Σ {brl(ind.numerador)} / Σ {brl(ind.denominador)}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>
          {ind.n_entes_com_dado}/{ind.n_entes_total}
        </span>
        <span style={{ fontSize: 11, color: colors.faint }}>· cobertura {pct(ind.cobertura_pct, 0)}</span>
        {ind.periodos_mistos && (
          <span title="Há municípios reportando em período/cadência diferente" style={{ fontSize: 11, color: colors.orange, background: colors.orangeBg, border: `1px solid ${colors.orangeSoft}`, borderRadius: 2, padding: '1px 4px', fontWeight: 600 }}>
            PERÍODOS MISTOS
          </span>
        )}
      </div>
      {ind.entes_ausentes.length > 0 && (
        <div style={{ fontSize: 11, color: colors.faint, marginTop: 3 }}>
          {ind.entes_ausentes.length} sem dado no período
        </div>
      )}
    </Card>
  );
}

function Distribuicao({ dist }: { dist: import('../services/backend').DistribuicaoUfResponse }) {
  const ratio = dist.unidade === 'PCT_RCL';
  const fmt = (v: number | string | null) => (ratio ? pct(v) : brl(v));
  const maxCont = Math.max(1, ...dist.histograma.map((b) => b.contagem));
  const perc: [string, number | string | null][] = [
    ['mín', dist.minimo], ['p10', dist.p10], ['p25', dist.p25], ['mediana', dist.mediana],
    ['p75', dist.p75], ['p90', dist.p90], ['máx', dist.maximo],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {dist.n_com_valor === 0 ? (
        <div style={{ fontSize: 12, color: colors.muted }}>Sem municípios com valor neste período.</div>
      ) : (
        <>
          <div
            role="img"
            aria-label={`Histograma de ${dist.n_com_valor} municípios em ${dist.histograma.length} faixas. A tabela seguinte contém os valores exatos.`}
          >
            <div aria-hidden style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 90 }}>
              {dist.histograma.map((b, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }} title={`${fmt(b.faixa_inferior)}–${fmt(b.faixa_superior)}: ${b.contagem}`}>
                  <div style={{ width: '100%', height: `${(b.contagem / maxCont) * 100}%`, background: colors.greenSoft, border: `1px solid ${colors.green}`, borderRadius: '2px 2px 0 0', minHeight: b.contagem ? 2 : 0 }} />
                </div>
              ))}
            </div>
          </div>
          <table className="sr-only">
            <caption>Alternativa tabular do histograma territorial</caption>
            <thead>
              <tr>
                <th scope="col">Faixa inicial</th>
                <th scope="col">Faixa final</th>
                <th scope="col">Municípios</th>
              </tr>
            </thead>
            <tbody>
              {dist.histograma.map((b, i) => (
                <tr key={i}>
                  <td>{fmt(b.faixa_inferior)}</td>
                  <td>{fmt(b.faixa_superior)}</td>
                  <td>{b.contagem}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {perc.map(([k, v]) => (
              <div key={k} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: colors.faint, textTransform: 'uppercase' }}>{k}</div>
                <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>{fmt(v)}</div>
              </div>
            ))}
          </div>
          {(dist.concentracao_top5_pct !== null || dist.total !== null) && (
            <div style={{ borderTop: `1px solid ${colors.borderSoft}`, paddingTop: 8, fontSize: 11, color: colors.muted }}>
              Concentração: os 5 maiores respondem por{' '}
              <b style={{ color: colors.ink }}>{pct(dist.concentracao_top5_pct, 1)}</b>
              {dist.concentracao_top10_pct !== null && <> · top 10: <b style={{ color: colors.ink }}>{pct(dist.concentracao_top10_pct, 1)}</b></>}
              {dist.total !== null && <> · total {brl(dist.total)}</>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RankingLista({
  itens, tipoRatio, onEscolherEnte,
}: {
  itens: RankingItem[]; tipoRatio: boolean; onEscolherEnte: (e: EnteSel) => void;
}) {
  if (itens.length === 0) {
    return <div style={{ padding: '16px', fontSize: 12, color: colors.muted }}>Nenhum município no escopo com dado.</div>;
  }
  const abrir = (e: RankingItem) =>
    onEscolherEnte({ cod_ibge: e.cod_ibge, nome: e.nome ?? e.cod_ibge });
  const columns: VirtualColumn<RankingItem>[] = [
    {
      key: 'posicao',
      header: 'Posição',
      width: 68,
      render: (e) => (
        <span style={{ color: colors.faint, fontFamily: "'JetBrains Mono', monospace" }}>
          #{String(e.posicao).padStart(2, '0')}
        </span>
      ),
    },
    {
      key: 'ente',
      header: 'Município',
      width: '38%',
      render: (e) => {
        const c = corDe(e.cor);
        return (
          <button
            type="button"
            onClick={() => abrir(e)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              width: '100%',
              minWidth: 0,
              textAlign: 'left',
              fontWeight: 500,
            }}
          >
            <span aria-hidden style={{ width: 4, height: 16, background: c.stroke, borderRadius: 2, flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {e.nome ?? e.cod_ibge}
            </span>
            {e.destaque && (
              <span role="img" aria-label="Destaque de risco" style={{ color: colors.red, background: colors.redBg, borderRadius: 2, padding: '0 4px', fontWeight: 700 }}>
                !
              </span>
            )}
          </button>
        );
      },
    },
    { key: 'regiao', header: 'Região', width: '18%', render: (e) => e.regiao ?? '—' },
    {
      key: 'valor',
      header: 'Valor',
      width: '20%',
      align: 'right',
      render: (e) => (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: corDe(e.cor).text }}>
          {tipoRatio ? pct(e.valor_pct) : brl(e.valor_rs)}
        </span>
      ),
    },
    {
      key: 'percentil',
      header: 'Percentil',
      width: '16%',
      align: 'right',
      render: (e) => (
        <span style={{ color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>
          p{e.percentil !== null ? Math.round(Number(e.percentil)) : '—'}
        </span>
      ),
    },
  ];
  return (
    <VirtualizedTable
      rows={itens}
      columns={columns}
      rowKey={(e) => e.cod_ibge}
      caption={`Ranking municipal com ${itens.length} entes`}
      height={360}
      rowHeight={44}
      onRowActivate={abrir}
      getRowLabel={(e) => `${e.posicao}º, ${e.nome ?? e.cod_ibge}`}
    />
  );
}

// ============================ Choropleth (GeoJSON → SVG) ============================
function coordsRings(geom: { type: string; coordinates: unknown }): number[][][] {
  // Normaliza Polygon (rings) e MultiPolygon (polígonos de rings) numa lista de anéis.
  const co = geom.coordinates as unknown;
  if (geom.type === 'Polygon') return co as number[][][];
  if (geom.type === 'MultiPolygon') return (co as number[][][][]).flat();
  return [];
}

type Point = [number, number];

function distanceToSegmentSquared(point: Point, start: Point, end: Point): number {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) {
    return (point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2;
  }
  const t = Math.max(
    0,
    Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)),
  );
  const projected: Point = [start[0] + t * dx, start[1] + t * dy];
  return (point[0] - projected[0]) ** 2 + (point[1] - projected[1]) ** 2;
}

/** Ramer–Douglas–Peucker em coordenadas já projetadas, com tolerância subpixel. */
function simplifyRing(points: Point[], tolerance = 0.7): Point[] {
  if (points.length <= 4) return points;
  const first = points[0];
  const last = points[points.length - 1];
  let farthest = 0;
  let index = -1;
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = distanceToSegmentSquared(points[i], first, last);
    if (distance > farthest) {
      farthest = distance;
      index = i;
    }
  }
  if (index < 0 || farthest <= tolerance * tolerance) return [first, last];
  const left = simplifyRing(points.slice(0, index + 1), tolerance);
  const right = simplifyRing(points.slice(index), tolerance);
  return [...left.slice(0, -1), ...right];
}

function Choropleth({
  malha, mapa, onClickEnte,
}: {
  malha: MalhaResponse; mapa: MapaUfResponse; onClickEnte: (e: EnteSel) => void;
}) {
  const W = 520;
  const H = 520;
  const { paths, originalPoints, renderedPoints } = useMemo(() => {
    const feats = malha.malha.features as GeoFeature[];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const f of feats) {
      for (const ring of coordsRings(f.geometry)) {
        for (const [x, y] of ring) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const dx = maxX - minX || 1;
    const dy = maxY - minY || 1;
    const escala = Math.min((W - 12) / dx, (H - 12) / dy);
    const offX = (W - dx * escala) / 2;
    const offY = (H - dy * escala) / 2;
    const px = (x: number) => offX + (x - minX) * escala;
    const py = (y: number) => offY + (maxY - y) * escala; // inverte o eixo Y

    let originalPoints = 0;
    let renderedPoints = 0;
    const paths = feats.map((f) => {
      const d = coordsRings(f.geometry)
        .map((ring) => {
          const projected = ring.map(([x, y]) => [px(x), py(y)] as Point);
          const simplified = simplifyRing(projected);
          originalPoints += projected.length;
          renderedPoints += simplified.length;
          return `M${simplified.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')}Z`;
        })
        .join(' ');
      return { cod: String(f.properties.codarea), d };
    });
    return { paths, originalPoints, renderedPoints };
  }, [malha]);
  const corPorCod = useMemo(() => new Map(mapa.entes.map((e) => [e.cod_ibge, e])), [mapa.entes]);
  const codigosInterativos = useMemo(
    () => paths.filter((path) => {
      const ente = corPorCod.get(path.cod);
      return Boolean(ente && !ente.no_escopo);
    }).map((path) => path.cod),
    [corPorCod, paths],
  );
  const [municipioAtivo, setMunicipioAtivo] = useState(() => codigosInterativos[0] ?? '');
  // Tooltip próprio em vez do `title` nativo: aquele leva ~1s para aparecer e não
  // mostra a faixa. Num mapa, a informação tem de vir junto com o ponteiro.
  const [sob, setSob] = useState<{ nome: string; valor: string; x: number; y: number } | null>(null);
  const codigoComTab = codigosInterativos.includes(municipioAtivo)
    ? municipioAtivo
    : codigosInterativos[0] ?? '';
  const mapId = useId();

  const ratio = mapa.entes.some((e) => e.valor_pct !== null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%' }}>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: '100%' }}
        role="group"
        aria-labelledby="mapa-uf-titulo mapa-uf-descricao"
      >
        <title id="mapa-uf-titulo">Mapa de {mapa.rotulo}</title>
        <desc id="mapa-uf-descricao">
          Mapa municipal da UF {mapa.uf}. Use as setas para percorrer os municípios no escopo
          e Enter ou Espaço para abrir.
          O ranking logo abaixo oferece a mesma navegação em formato tabular.
        </desc>
        {paths.map((p) => {
          const ente = corPorCod.get(p.cod);
          const c = corDe(ente?.cor);
          const interativo = Boolean(ente && !ente.no_escopo);
          const nome = ente?.nome || p.cod;
          const valor =
            ente && ente.valor_pct !== null
              ? `${mapa.rotulo}: ${pct(ente.valor_pct)}`
              : ente?.no_escopo
                ? 'fora do escopo'
                : 'sem dado';
          const descricao = `${nome} · ${valor}`;
          const ativar = () => {
            if (interativo) onClickEnte({ cod_ibge: p.cod, nome });
          };
          return (
            <path
              key={p.cod}
              id={`${mapId}-${p.cod}`}
              d={p.d}
              fill={c.fill}
              stroke={colors.surface}
              strokeWidth={0.4}
              role={interativo ? 'button' : undefined}
              tabIndex={interativo && p.cod === codigoComTab ? 0 : -1}
              aria-label={interativo ? `Abrir município ${descricao}` : descricao}
              aria-hidden={interativo ? undefined : true}
              style={{ cursor: interativo ? 'pointer' : 'default' }}
              onClick={ativar}
              onMouseEnter={(event) =>
                setSob({
                  nome,
                  valor,
                  x: event.nativeEvent.offsetX,
                  y: event.nativeEvent.offsetY,
                })
              }
              onMouseMove={(event) =>
                setSob((atual) =>
                  atual
                    ? { ...atual, x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY }
                    : atual,
                )
              }
              onMouseLeave={() => setSob(null)}
              onFocus={() => {
                if (interativo) setMunicipioAtivo(p.cod);
                setSob({ nome, valor, x: 0, y: 0 });
              }}
              onBlur={() => setSob(null)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  ativar();
                  return;
                }
                if (!interativo) return;
                const atual = codigosInterativos.indexOf(p.cod);
                let proximo = atual;
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                  proximo = (atual + 1) % codigosInterativos.length;
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                  proximo = (atual - 1 + codigosInterativos.length) % codigosInterativos.length;
                } else if (event.key === 'Home') {
                  proximo = 0;
                } else if (event.key === 'End') {
                  proximo = codigosInterativos.length - 1;
                } else {
                  return;
                }
                event.preventDefault();
                const proximoCodigo = codigosInterativos[proximo];
                setMunicipioAtivo(proximoCodigo);
                window.requestAnimationFrame(() => document.getElementById(`${mapId}-${proximoCodigo}`)?.focus());
              }}
            >
              <title>{descricao}</title>
            </path>
          );
        })}
      </svg>
        {sob && (
          <div
            role="presentation"
            style={{
              position: 'absolute',
              // Desloca do cursor para não tapar justamente o município apontado.
              left: Math.min(sob.x + 14, 260),
              top: Math.max(sob.y - 10, 0),
              pointerEvents: 'none',
              background: colors.ink,
              color: colors.bg,
              borderRadius: 4,
              padding: '6px 9px',
              fontSize: 11.5,
              lineHeight: 1.4,
              maxWidth: 240,
              boxShadow: '0 2px 8px rgba(15, 26, 20, 0.25)',
              zIndex: 2,
            }}
          >
            <div style={{ fontWeight: 700 }}>{sob.nome}</div>
            <div style={{ fontFamily: font.mono, opacity: 0.92 }}>{sob.valor}</div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11 }}>
        {Object.entries(mapa.legenda).map(([faixa, cor]) => (
          <span key={faixa} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 9, height: 9, background: corDe(cor).fill, border: `1px solid ${corDe(cor).stroke}` }} />
            {faixa}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', color: colors.faint }}>
          {ratio ? '% da RCL' : 'valor absoluto'} · {malha.n_areas} municípios · malha otimizada{' '}
          {renderedPoints.toLocaleString('pt-BR')}/{originalPoints.toLocaleString('pt-BR')} pontos
        </span>
      </div>
    </div>
  );
}

// ============================ Ente estadual ============================
function EnteEstadualTab({
  uf, periodo, onEscolherEnte,
}: {
  uf: string; periodo: string; onEscolherEnte: (e: EnteSel) => void;
}) {
  const consolidado = useResource(() => fetchConsolidadoUf(uf, periodo), [uf, periodo]);
  return (
    <Async res={consolidado}>
      {(c) => {
        const est = c.ente_estadual;
        return (
          <Card style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }} pad={0}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              Governo {c.uf_nome ? `do ${c.uf_nome}` : `da UF ${c.uf}`} — ente estadual
            </div>
            <div style={{ fontSize: 12, color: colors.muted, maxWidth: 640, lineHeight: 1.5 }}>
              Este é o <b>ente estadual</b>: os dados do próprio Governo do Estado (RREO/RGF do
              tesouro estadual). Ele é <b>distinto</b> do consolidado dos municípios — não se somam
              nem se comparam diretamente. Abra o cockpit para os indicadores do estado.
            </div>
            {est ? (
              <div>
                {est.acessivel ? (
                  <button
                    type="button"
                    onClick={() => onEscolherEnte({ cod_ibge: est.cod_ibge, nome: est.nome ?? est.cod_ibge })}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: colors.primary, color: colors.bg, borderRadius: 5, fontSize: 12.5, fontWeight: 500 }}
                  >
                    <Icon size={13} stroke={colors.bg}><path d="M3 8h10M9 4l4 4-4 4" /></Icon>
                    Abrir cockpit de {est.nome ?? est.cod_ibge}
                  </button>
                ) : (
                  /* Sem acesso, o botão levava a 403 — e o 403 chegava à tela disfarçado de
                     "ente sem período com dado". Dizer o motivo é mais útil que oferecer. */
                  <div
                    role="note"
                    style={{
                      display: 'flex', gap: 8, alignItems: 'flex-start', maxWidth: 560,
                      padding: '10px 12px', borderRadius: 5,
                      background: colors.yellowSoft, border: `1px solid ${colors.border}`,
                    }}
                  >
                    <Icon size={14} stroke={colors.muted}>
                      <circle cx="8" cy="8" r="6" /><path d="M8 5v4M8 11h.01" />
                    </Icon>
                    <span style={{ fontSize: 12, color: colors.muted, lineHeight: 1.5 }}>
                      {est.motivo_indisponivel ??
                        'O cockpit do ente estadual não está disponível para este usuário.'}
                    </span>
                  </div>
                )}
                <div style={{ fontSize: 11, color: colors.faint, marginTop: 8, fontFamily: "'JetBrains Mono', monospace" }}>
                  código IBGE {est.cod_ibge} · esfera estadual
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: colors.muted }}>Ente estadual ainda não cadastrado para esta UF.</div>
            )}
          </Card>
        );
      }}
    </Async>
  );
}

// ============================ Minha carteira ============================
function CarteiraTab({ periodo, onEscolherEnte }: { periodo: string; onEscolherEnte: (e: EnteSel) => void }) {
  const resumo = useResource(() => fetchCarteiraResumo(periodo), [periodo]);
  const grade = useResource(() => fetchCarteiraGrade(periodo, { ordenar: 'risco', page_size: 300 }), [periodo]);
  const [loteMsg, setLoteMsg] = useState<string | null>(null);

  const disparar = async (acao: 'relatorio' | 'alerta') => {
    setLoteMsg('enfileirando…');
    try {
      const job = await acaoLoteCarteira(acao, { periodo });
      setLoteMsg(`Job de ${acao} enfileirado para ${job.total_entes} ente(s).`);
    } catch (e) {
      setLoteMsg((e as { detail?: string })?.detail ?? 'Falha ao enfileirar.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Async res={resumo}>
        {(r) => (
          <Card pad={0} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>Minha carteira</div>
            <span style={{ fontSize: 11, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>
              {r.total_entes} entes · {r.entes_com_dados} com dado em {r.periodo}
            </span>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={() => disparar('relatorio')} style={loteBtn}>Gerar relatório do escopo</button>
            <button type="button" onClick={() => disparar('alerta')} style={loteBtn}>Configurar alerta do escopo</button>
          </Card>
        )}
      </Async>
      {loteMsg && (
        <div style={{ fontSize: 11.5, color: colors.muted, background: colors.accentSoft, border: `1px solid ${colors.border}`, borderRadius: 4, padding: '7px 12px' }}>
          {loteMsg}
        </div>
      )}
      <Card pad={0} style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 16px 8px', fontSize: 13, fontWeight: 600 }}>
          Grade de entes <span style={{ fontSize: 11, color: colors.muted, fontWeight: 400 }}>· clique para trocar o ente e abrir o cockpit</span>
        </div>
        <Async res={grade}>
          {(g) => <GradeCarteira linhas={g.data} onEscolherEnte={onEscolherEnte} />}
        </Async>
      </Card>
    </div>
  );
}

const loteBtn: React.CSSProperties = {
  fontSize: 11.5, padding: '6px 11px', borderRadius: 4, border: `1px solid ${colors.border}`,
  background: colors.surface, color: colors.primary, fontWeight: 500,
};

function GradeCarteira({ linhas, onEscolherEnte }: { linhas: CarteiraEnteRow[]; onEscolherEnte: (e: EnteSel) => void }) {
  const ROTULO: Record<string, string> = { conforme: 'Conforme', alerta: 'Alerta', prudencial: 'Prudencial', critico: 'Crítico', sem_dados: 'Sem dados' };
  const ind = (e: CarteiraEnteRow, k: string) => e.indicadores.find((i) => i.indicador === k) ?? null;
  if (linhas.length === 0) return <div style={{ padding: '16px', fontSize: 12, color: colors.muted }}>Nenhum ente com dado no período.</div>;
  const abrir = (e: CarteiraEnteRow) =>
    onEscolherEnte({ cod_ibge: e.cod_ibge, nome: e.nome ?? e.cod_ibge });
  const columns: VirtualColumn<CarteiraEnteRow>[] = [
    {
      key: 'ente',
      header: 'Ente',
      width: '46%',
      render: (e) => (
        <button
          type="button"
          onClick={() => abrir(e)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0, textAlign: 'left' }}
        >
          <span aria-hidden style={{ width: 4, height: 16, background: corDe(e.cor).stroke, borderRadius: 2, flexShrink: 0 }} />
          <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {e.nome ?? e.cod_ibge}
          </span>
        </button>
      ),
    },
    {
      key: 'pessoal',
      header: 'Pessoal',
      width: '18%',
      align: 'right',
      render: (e) => {
        const pessoal = ind(e, 'pessoal_executivo');
        return <span style={{ fontFamily: "'JetBrains Mono', monospace", color: corDe(pessoal?.cor).text }}>{pct(pessoal?.valor_pct)}</span>;
      },
    },
    {
      key: 'dcl',
      header: 'DCL',
      width: '18%',
      align: 'right',
      render: (e) => (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: colors.muted }}>
          {pct(ind(e, 'divida_consolidada_liquida')?.valor_pct, 1)}
        </span>
      ),
    },
    {
      key: 'conformidade',
      header: 'Conformidade',
      width: '18%',
      align: 'right',
      render: (e) => {
        const c = corDe(e.cor);
        return (
          <span style={{ padding: '1px 7px', borderRadius: 2, fontWeight: 600, background: c.fill, color: colors.ink }}>
            {ROTULO[e.conformidade] ?? e.conformidade}
          </span>
        );
      },
    },
  ];
  return (
    <VirtualizedTable
      rows={linhas}
      columns={columns}
      rowKey={(e) => e.cod_ibge}
      caption={`Grade da carteira com ${linhas.length} entes`}
      height={Math.min(460, Math.max(160, linhas.length * 44 + 46))}
      rowHeight={44}
      onRowActivate={abrir}
      getRowLabel={(e) => `${e.nome ?? e.cod_ibge}, ${ROTULO[e.conformidade] ?? e.conformidade}`}
    />
  );
}

// ============================ Grupos ============================
function GruposTab({ periodo, onEscolherEnte }: { periodo: string; onEscolherEnte: (e: EnteSel) => void }) {
  const grade = useResource(() => fetchCarteiraGrade(periodo, { ordenar: 'risco', page_size: 300 }), [periodo]);
  return (
    <Async res={grade}>
      {(g) => {
        const grupos = new Map<string, CarteiraEnteRow[]>();
        for (const e of g.data) {
          const chave = e.grupo ?? 'Sem grupo';
          (grupos.get(chave) ?? grupos.set(chave, []).get(chave)!).push(e);
        }
        const chaves = [...grupos.keys()].sort();
        if (chaves.length === 0) return <Card style={{ padding: 16, fontSize: 12, color: colors.muted }} pad={0}>Nenhum ente na carteira.</Card>;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {chaves.map((chave) => {
              const entes = grupos.get(chave)!;
              const criticos = entes.filter((e) => e.conformidade === 'critico' || e.conformidade === 'prudencial').length;
              return (
                <Card key={chave} pad={0} style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${colors.border}` }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{chave}</div>
                    <span style={{ fontSize: 11, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>{entes.length} entes</span>
                    {criticos > 0 && <span style={{ fontSize: 11, color: colors.red, background: colors.redBg, borderRadius: 2, padding: '1px 6px', fontWeight: 600 }}>{criticos} em atenção</span>}
                  </div>
                  <GradeCarteira linhas={entes} onEscolherEnte={onEscolherEnte} />
                </Card>
              );
            })}
          </div>
        );
      }}
    </Async>
  );
}
