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
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { colors } from '../theme';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { Async } from '../components/AsyncState';
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

function pct(v: number | string | null | undefined, casas = 2): string {
  const n = num(v);
  return n === null ? '—' : `${n.toFixed(casas)}%`;
}
function brl(v: number | string | null | undefined): string {
  const n = num(v);
  if (n === null) return '—';
  if (Math.abs(n) >= 1e9) return `R$ ${(n / 1e9).toFixed(2)} bi`;
  if (Math.abs(n) >= 1e6) return `R$ ${(n / 1e6).toFixed(1)} mi`;
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>Carteira &amp; Visão Estadual</div>
        <span style={{ fontSize: 11, color: colors.faint, fontFamily: "'JetBrains Mono', monospace" }}>
          UF {uf} · período {periodo || '—'}
        </span>
        <div style={{ flex: 1 }} />
        <TabBar aba={aba} setAba={setAba} />
      </div>

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
    <div role="tablist" aria-label="Contexto" style={{ display: 'flex', gap: 2, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 6, padding: 2 }}>
      {abas.map((a) => (
        <button
          key={a.id}
          role="tab"
          aria-selected={aba === a.id}
          onClick={() => setAba(a.id)}
          style={{
            fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 4,
            background: aba === a.id ? colors.surface : 'transparent',
            color: aba === a.id ? colors.primary : colors.muted,
            border: aba === a.id ? `1px solid ${colors.border}` : '1px solid transparent',
          }}
        >
          {a.label}
        </button>
      ))}
    </div>
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
                <span style={{ fontSize: 10.5, color: colors.faint }}>
                  · o Governo {c.uf_nome ? `do ${c.uf_nome}` : 'do estado'} é um ente à parte (aba “Ente estadual”)
                </span>
              )}
            </div>
            <div style={{ fontSize: 10.5, color: colors.faint, marginTop: 4 }}>{c.observacao}</div>
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
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 10.5, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Indicador</span>
        {INDICADORES.map((ind) => (
          <button
            key={ind.codigo}
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
            <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>
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
            <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>
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
            <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>
              percentil e destaque · clique para trocar o ente e abrir o cockpit
            </div>
          </div>
          {ranking.data && (
            <span style={{ fontSize: 10.5, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>
              {ranking.data.n_com_valor} com valor de {ranking.data.n_total}
            </span>
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
      <div style={{ fontSize: 9.5, color: colors.faint, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>
        {ind.rotulo}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600, color: ratio ? c.text : colors.ink }}>
          {ratio ? pct(ind.valor_pct) : brl(ind.numerador)}
        </div>
        {ratio && ind.teto_pct && (
          <div style={{ fontSize: 10, color: colors.muted }}>/ teto {pct(ind.teto_pct, 0)}</div>
        )}
      </div>
      {ratio && (
        <div style={{ fontSize: 10, color: colors.faint, marginTop: 1, fontFamily: "'JetBrains Mono', monospace" }}>
          Σ {brl(ind.numerador)} / Σ {brl(ind.denominador)}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>
          {ind.n_entes_com_dado}/{ind.n_entes_total}
        </span>
        <span style={{ fontSize: 9.5, color: colors.faint }}>· cobertura {pct(ind.cobertura_pct, 0)}</span>
        {ind.periodos_mistos && (
          <span title="Há municípios reportando em período/cadência diferente" style={{ fontSize: 8.5, color: colors.orange, background: colors.orangeBg, border: `1px solid ${colors.orangeSoft}`, borderRadius: 2, padding: '1px 4px', fontWeight: 600 }}>
            PERÍODOS MISTOS
          </span>
        )}
      </div>
      {ind.entes_ausentes.length > 0 && (
        <div style={{ fontSize: 9.5, color: colors.faint, marginTop: 3 }}>
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
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 90 }}>
            {dist.histograma.map((b, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }} title={`${fmt(b.faixa_inferior)}–${fmt(b.faixa_superior)}: ${b.contagem}`}>
                <div style={{ width: '100%', height: `${(b.contagem / maxCont) * 100}%`, background: colors.greenSoft, border: `1px solid ${colors.green}`, borderRadius: '2px 2px 0 0', minHeight: b.contagem ? 2 : 0 }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {perc.map(([k, v]) => (
              <div key={k} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 8.5, color: colors.faint, textTransform: 'uppercase' }}>{k}</div>
                <div style={{ fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>{fmt(v)}</div>
              </div>
            ))}
          </div>
          {(dist.concentracao_top5_pct !== null || dist.total !== null) && (
            <div style={{ borderTop: `1px solid ${colors.borderSoft}`, paddingTop: 8, fontSize: 10.5, color: colors.muted }}>
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
  return (
    <div style={{ maxHeight: 360, overflowY: 'auto' }}>
      {itens.map((e) => {
        const c = corDe(e.cor);
        const valor = tipoRatio ? pct(e.valor_pct) : brl(e.valor_rs);
        return (
          <button
            key={e.cod_ibge}
            onClick={() => onEscolherEnte({ cod_ibge: e.cod_ibge, nome: e.nome ?? e.cod_ibge })}
            style={{
              display: 'grid', gridTemplateColumns: '28px 1.6fr 0.7fr 0.9fr 0.5fr', gap: 8, alignItems: 'center',
              width: '100%', textAlign: 'left', padding: '7px 16px', borderBottom: `1px solid ${colors.rowBorder}`, fontSize: 12,
            }}
          >
            <span style={{ fontSize: 10, color: colors.faint, fontFamily: "'JetBrains Mono', monospace" }}>
              #{String(e.posicao).padStart(2, '0')}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <span style={{ width: 4, height: 16, background: c.stroke, borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.nome ?? e.cod_ibge}</span>
              {e.destaque && <span style={{ fontSize: 8, color: colors.red, background: colors.redBg, borderRadius: 2, padding: '0 4px', fontWeight: 700 }}>!</span>}
            </span>
            <span style={{ fontSize: 10, color: colors.faint }}>{e.regiao ?? '—'}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: c.text, textAlign: 'right' }}>{valor}</span>
            <span style={{ fontSize: 9.5, color: colors.muted, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
              p{e.percentil !== null ? Math.round(Number(e.percentil)) : '—'}
            </span>
          </button>
        );
      })}
    </div>
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

function Choropleth({
  malha, mapa, onClickEnte,
}: {
  malha: MalhaResponse; mapa: MapaUfResponse; onClickEnte: (e: EnteSel) => void;
}) {
  const W = 520;
  const H = 520;
  const { paths, corPorCod } = useMemo(() => {
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

    const paths = feats.map((f) => {
      const d = coordsRings(f.geometry)
        .map((ring) => 'M' + ring.map(([x, y]) => `${px(x).toFixed(1)} ${py(y).toFixed(1)}`).join(' L') + 'Z')
        .join(' ');
      return { cod: String(f.properties.codarea), d };
    });
    const corPorCod = new Map(mapa.entes.map((e) => [e.cod_ibge, e]));
    return { paths, corPorCod };
  }, [malha, mapa]);

  const ratio = mapa.entes.some((e) => e.valor_pct !== null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', flex: 1, minHeight: 0 }} role="img" aria-label={`Mapa de ${mapa.rotulo}`}>
        {paths.map((p) => {
          const ente = corPorCod.get(p.cod);
          const c = corDe(ente?.cor);
          return (
            <path
              key={p.cod}
              d={p.d}
              fill={c.fill}
              stroke={colors.surface}
              strokeWidth={0.4}
              style={{ cursor: ente && !ente.no_escopo ? 'pointer' : 'default' }}
              onClick={() => ente && !ente.no_escopo && onClickEnte({ cod_ibge: p.cod, nome: p.cod })}
            >
              <title>{`${p.cod}${ente && ente.valor_pct !== null ? ` · ${pct(ente.valor_pct)}` : ente?.no_escopo ? ' · fora do escopo' : ' · sem dado'}`}</title>
            </path>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 10 }}>
        {Object.entries(mapa.legenda).map(([faixa, cor]) => (
          <span key={faixa} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 9, height: 9, background: corDe(cor).fill, border: `1px solid ${corDe(cor).stroke}` }} />
            {faixa}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', color: colors.faint }}>{ratio ? '% da RCL' : 'valor absoluto'} · {malha.n_areas} municípios</span>
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
                <button
                  onClick={() => onEscolherEnte({ cod_ibge: est.cod_ibge, nome: est.nome ?? est.cod_ibge })}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: colors.primary, color: colors.bg, borderRadius: 5, fontSize: 12.5, fontWeight: 500 }}
                >
                  <Icon size={13} stroke={colors.bg}><path d="M3 8h10M9 4l4 4-4 4" /></Icon>
                  Abrir cockpit de {est.nome ?? est.cod_ibge}
                </button>
                <div style={{ fontSize: 10, color: colors.faint, marginTop: 8, fontFamily: "'JetBrains Mono', monospace" }}>
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
            <button onClick={() => disparar('relatorio')} style={loteBtn}>Gerar relatório do escopo</button>
            <button onClick={() => disparar('alerta')} style={loteBtn}>Configurar alerta do escopo</button>
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
          Grade de entes <span style={{ fontSize: 10.5, color: colors.muted, fontWeight: 400 }}>· clique para trocar o ente e abrir o cockpit</span>
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
  return (
    <div style={{ maxHeight: 460, overflowY: 'auto' }}>
      {linhas.map((e) => {
        const c = corDe(e.cor);
        const pessoal = ind(e, 'pessoal_executivo');
        const dcl = ind(e, 'divida_consolidada_liquida');
        return (
          <button
            key={e.cod_ibge}
            onClick={() => onEscolherEnte({ cod_ibge: e.cod_ibge, nome: e.nome ?? e.cod_ibge })}
            style={{ display: 'grid', gridTemplateColumns: '1.8fr 0.8fr 0.8fr 1fr', gap: 8, alignItems: 'center', width: '100%', textAlign: 'left', padding: '7px 16px', borderBottom: `1px solid ${colors.rowBorder}`, fontSize: 12 }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{ width: 4, height: 16, background: c.stroke, borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.nome ?? e.cod_ibge}</span>
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", textAlign: 'right', color: corDe(pessoal?.cor).text }}>{pct(pessoal?.valor_pct)}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", textAlign: 'right', color: colors.muted }}>{pct(dcl?.valor_pct, 1)}</span>
            <span style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 9.5, padding: '1px 7px', borderRadius: 2, fontWeight: 600, background: c.fill, color: '#2A2A28' }}>{ROTULO[e.conformidade] ?? e.conformidade}</span>
            </span>
          </button>
        );
      })}
    </div>
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
                    <span style={{ fontSize: 10.5, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>{entes.length} entes</span>
                    {criticos > 0 && <span style={{ fontSize: 9.5, color: colors.red, background: colors.redBg, borderRadius: 2, padding: '1px 6px', fontWeight: 600 }}>{criticos} em atenção</span>}
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
