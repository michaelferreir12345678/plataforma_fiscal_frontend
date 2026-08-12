/**
 * Série multi-exercício com três leituras: **nominal**, **real** (deflacionada pelo
 * IPCA a preços do período consultado) e **per capita** (Sprint 25 — transversal).
 *
 * Pergunta gerencial que responde: **"a receita/despesa cresceu de verdade, ou só
 * acompanhou a inflação e a população?"** — a auditoria (§2.4/§2.5) registrou que o
 * backend já devolvia `serie[]` e nenhuma tela desenhava.
 *
 * Decisões de leitura:
 * - No modo real, a linha **nominal** fica junto (tracejado × sólido + rótulo direto):
 *   a comparação é o ponto, não a curva isolada.
 * - Cores de série vêm de `colors.serieA/serieB`, fora da paleta de risco — verde ou
 *   laranja aqui significariam faixa da LRF.
 * - Ponto sem base (sem IPCA ou sem população) **não é plotado como zero**: o modo
 *   correspondente fica desabilitado com o motivo à vista.
 * - Tabela equivalente sempre disponível (leitor de tela, conferência e cópia).
 */
import { useMemo, useState, type ReactNode } from 'react';
import { colors, font } from '../theme';
import { fmt, pct as pctFmt } from '../utils/format';
import type { SerieAjuste } from '../services/backend';
import { AccessibleChart, type AccessibleChartColumn } from './AccessibleChart';

export interface PontoSerie {
  periodo: string;
  nominal: number | null;
  real?: number | null;
  perCapita?: number | null;
  populacao?: number | null;
}

type Modo = 'nominal' | 'real' | 'per_capita';

/**
 * Linha de referência legal (Sprint 25C). Um percentual constitucional só se lê contra
 * o seu piso/teto: sem a linha, "25,3%" não diz se cumpre a Constituição.
 */
export interface LimiarSerie {
  valor: number;
  rotulo: string;
  sentido: 'piso' | 'teto';
}

interface SerieChartProps {
  titulo: string;
  pontos: PontoSerie[];
  ajuste?: SerieAjuste | null;
  /** Período em foco na página (marcado no eixo). */
  destaque?: string;
  /** Rótulo da medida (ex.: "Arrecadado acumulado"). */
  medida: string;
  altura?: number;
  nota?: ReactNode;
  /**
   * `pct` desliga deflator e per capita: um percentual já é uma razão — deflacioná-lo
   * ou dividi-lo pela população produziria um número sem significado fiscal.
   */
  formato?: 'brl' | 'pct';
  limiar?: LimiarSerie;
}

const LARGURA = 640;
const PAD = { top: 18, right: 74, bottom: 26, left: 58 };

const milhoes = (v: number) => `${fmt(v / 1e6, 1)} M`;
const reais = (v: number) => `R$ ${fmt(v, 2)}`;

export function SerieChart({
  titulo,
  pontos,
  ajuste,
  destaque,
  medida,
  altura = 210,
  nota,
  formato = 'brl',
  limiar,
}: SerieChartProps) {
  const percentual = formato === 'pct';
  const temReal = !percentual && pontos.some((p) => p.real != null);
  const temPerCapita = !percentual && pontos.some((p) => p.perCapita != null);
  const [modo, setModo] = useState<Modo>('nominal');
  const [hover, setHover] = useState<number | null>(null);

  const modoEfetivo: Modo =
    (modo === 'real' && !temReal) || (modo === 'per_capita' && !temPerCapita) ? 'nominal' : modo;

  const valor = (p: PontoSerie): number | null =>
    modoEfetivo === 'real' ? (p.real ?? null) : modoEfetivo === 'per_capita' ? (p.perCapita ?? null) : p.nominal;
  const formatar = percentual
    ? (v: number) => pctFmt(v, 2)
    : modoEfetivo === 'per_capita'
      ? reais
      : milhoes;
  const viola = (v: number | null): boolean =>
    v != null && limiar != null && (limiar.sentido === 'piso' ? v < limiar.valor : v > limiar.valor);

  const series = useMemo(() => {
    const principal = pontos.map((p) => valor(p));
    // No modo real, a nominal entra como referência (a pergunta é a diferença).
    const referencia = modoEfetivo === 'real' ? pontos.map((p) => p.nominal) : null;
    const todos = [...principal, ...(referencia ?? [])].filter((v): v is number => v != null);
    // A escala precisa conter o limiar: um piso fora da área de plotagem não compara nada.
    const comLimiar = limiar ? [...todos, limiar.valor] : todos;
    const max = comLimiar.length ? Math.max(...comLimiar) : 0;
    const min = comLimiar.length ? Math.min(...comLimiar) : 0;
    return { principal, referencia, max, min };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pontos, modoEfetivo, limiar?.valor]);

  if (pontos.length === 0) {
    return (
      <div style={{ fontSize: 11.5, color: colors.muted }}>
        Série indisponível: nenhum exercício materializado para este ente.
      </div>
    );
  }

  const largura = LARGURA;
  const innerW = largura - PAD.left - PAD.right;
  const innerH = altura - PAD.top - PAD.bottom;
  const teto = series.max > 0 ? series.max * 1.08 : 1;
  // Baseline zero é a leitura honesta de valor monetário acumulado; mas resultado fiscal
  // pode ser negativo (déficit), e nesse caso a escala precisa descer abaixo de zero —
  // senão o ponto sairia da área do gráfico em vez de aparecer como déficit.
  const piso = Math.min(0, series.min * 1.08);
  const x = (i: number) => PAD.left + (pontos.length === 1 ? innerW / 2 : (i * innerW) / (pontos.length - 1));
  const y = (v: number) => PAD.top + innerH - ((v - piso) / (teto - piso || 1)) * innerH;
  const yZero = y(0);

  const caminho = (valores: (number | null)[]) =>
    valores
      .map((v, i) => (v == null ? null : `${i === 0 || valores[i - 1] == null ? 'M' : 'L'} ${x(i)} ${y(v)}`))
      .filter(Boolean)
      .join(' ');

  const ultimoIdx = series.principal.reduce<number>((acc, v, i) => (v != null ? i : acc), -1);
  const ultimoValor = ultimoIdx >= 0 ? series.principal[ultimoIdx] : null;
  const pontoHover = hover != null ? pontos[hover] : null;

  // Resumo textual (Sprint B3 — AccessibleChart): comunica a tendência sem depender da
  // geometria, para quem usa leitor de tela ou só quer o número sem abrir o gráfico.
  const descricaoSerie = [
    `${medida}.`,
    `Série com ${pontos.length} período(s).`,
    ultimoValor != null ? `Último valor (${pontos[ultimoIdx]?.periodo}): ${formatar(ultimoValor)}.` : null,
    limiar ? `${limiar.sentido === 'piso' ? 'Mínimo' : 'Teto'} legal (${limiar.rotulo}): ${formatar(limiar.valor)}.` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const colunas: AccessibleChartColumn<PontoSerie>[] = [];
  if (percentual) {
    colunas.push(
      { key: 'periodo', header: 'Período', render: (p) => p.periodo },
      {
        key: 'valor',
        header: medida,
        align: 'right',
        render: (p) => (p.nominal != null ? pctFmt(p.nominal, 2) : '—'),
      },
    );
    if (limiar) {
      colunas.push({
        key: 'limiar',
        header: limiar.rotulo,
        align: 'right',
        render: (p) => (p.nominal == null ? '—' : viola(p.nominal) ? 'não cumpre' : 'cumpre'),
      });
    }
  } else {
    colunas.push(
      { key: 'periodo', header: 'Período', render: (p) => p.periodo },
      {
        key: 'nominal',
        header: `${medida} (nominal)`,
        align: 'right',
        render: (p) => (p.nominal != null ? milhoes(p.nominal) : '—'),
      },
      { key: 'real', header: 'real', align: 'right', render: (p) => (p.real != null ? milhoes(p.real) : '—') },
      {
        key: 'per_capita',
        header: 'per capita',
        align: 'right',
        render: (p) => (p.perCapita != null ? reais(p.perCapita) : '—'),
      },
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <div style={{ fontSize: 11.5, color: colors.ink, fontWeight: 600, flex: 1 }}>{titulo}</div>
        {!percentual && (
          <div role="group" aria-label="Base de comparação da série" style={{ display: 'flex', gap: 4 }}>
            <Alternativa ativo={modoEfetivo === 'nominal'} onClick={() => setModo('nominal')} rotulo="Nominal" />
            <Alternativa
              ativo={modoEfetivo === 'real'}
              onClick={() => setModo('real')}
              rotulo={ajuste ? `Real (preços ${ajuste.base_periodo})` : 'Real'}
              desabilitado={!temReal}
              motivo={ajuste?.observacao ?? 'Sem IPCA (série 433) para deflacionar esta série.'}
            />
            <Alternativa
              ativo={modoEfetivo === 'per_capita'}
              onClick={() => setModo('per_capita')}
              rotulo="Per capita"
              desabilitado={!temPerCapita}
              motivo="Sem população conhecida para este ente (IBGE)."
            />
          </div>
        )}
      </div>

      <AccessibleChart
        label={titulo}
        description={descricaoSerie}
        rows={pontos}
        columns={colunas}
        rowKey={(p) => p.periodo}
        tableCaption={`${titulo} — alternativa tabular`}
        chart={
          <div style={{ position: 'relative' }}>
          <svg
            viewBox={`0 0 ${largura} ${altura}`}
            width="100%"
            height={altura}
            onMouseLeave={() => setHover(null)}
          >
            {/* grade recessiva + eixo */}
            {[0, 0.5, 1].map((f) => (
              <line
                key={f}
                x1={PAD.left}
                x2={largura - PAD.right}
                y1={PAD.top + innerH * f}
                y2={PAD.top + innerH * f}
                stroke={colors.borderSoft}
                strokeWidth={1}
              />
            ))}
            <text x={4} y={PAD.top + 4} fontSize={11} fill={colors.faint} fontFamily={font.mono}>
              {formatar(teto)}
            </text>
            {piso < 0 && (
              // Linha do zero: sem ela, "abaixo da linha" (déficit) não se distingue de "pouco".
              <>
                <line
                  x1={PAD.left}
                  x2={largura - PAD.right}
                  y1={yZero}
                  y2={yZero}
                  stroke={colors.neutralSoft}
                  strokeWidth={1}
                />
                <text x={4} y={yZero + 3} fontSize={11} fill={colors.faint} fontFamily={font.mono}>
                  0
                </text>
              </>
            )}

            {limiar && (
              // Referência legal: tracejada e rotulada — cor sozinha não informa piso.
              <>
                <line
                  x1={PAD.left}
                  x2={largura - PAD.right}
                  y1={y(limiar.valor)}
                  y2={y(limiar.valor)}
                  stroke={colors.primaryDeep}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
                <text
                  x={largura - PAD.right + 4}
                  y={y(limiar.valor) + 3}
                  fontSize={11}
                  fontFamily={font.mono}
                  fill={colors.primaryDeep}
                  fontWeight={700}
                >
                  {limiar.rotulo}
                </text>
              </>
            )}

            {series.referencia && (
              <path d={caminho(series.referencia)} fill="none" stroke={colors.serieA} strokeWidth={2} opacity={0.9} />
            )}
            <path
              d={caminho(series.principal)}
              fill="none"
              stroke={modoEfetivo === 'real' ? colors.serieB : colors.serieA}
              strokeWidth={2}
              strokeDasharray={modoEfetivo === 'real' ? '5 4' : undefined}
            />

            {pontos.map((p, i) => {
              const v = series.principal[i];
              if (v == null) return null;
              const emFoco = p.periodo === destaque;
              return (
                <g
                  key={p.periodo}
                  role="img"
                  tabIndex={0}
                  aria-label={`${p.periodo}: ${formatar(v)}${
                    limiar
                      ? viola(v)
                        ? `, não cumpre ${limiar.rotulo}`
                        : `, cumpre ${limiar.rotulo}`
                      : ''
                  }`}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                >
                  <circle
                    cx={x(i)}
                    cy={y(v)}
                    r={emFoco ? 5 : 4}
                    fill={
                      viola(v) ? colors.red : modoEfetivo === 'real' ? colors.serieB : colors.serieA
                    }
                    stroke={colors.surface}
                    strokeWidth={2}
                  >
                    <title>
                      {`${p.periodo}: ${formatar(v)}${
                        limiar ? (viola(v) ? ` — abaixo do ${limiar.rotulo}` : ` — cumpre o ${limiar.rotulo}`) : ''
                      }`}
                    </title>
                  </circle>
                  {/* alvo de hover maior que a marca */}
                  <rect
                    x={x(i) - innerW / (pontos.length * 2 || 1) - 6}
                    y={PAD.top}
                    width={innerW / (pontos.length || 1) + 12}
                    height={innerH}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                  />
                </g>
              );
            })}

            {ultimoValor != null && (
              <text x={x(ultimoIdx) + 8} y={y(ultimoValor) + 3} fontSize={11} fontFamily={font.mono} fill={colors.muted}>
                {formatar(ultimoValor)}
              </text>
            )}

            {pontos.map((p, i) => (
              <text
                key={p.periodo}
                x={x(i)}
                y={altura - 8}
                fontSize={11}
                textAnchor="middle"
                fontFamily={font.mono}
                fill={p.periodo === destaque ? colors.ink : colors.faint}
                fontWeight={p.periodo === destaque ? 700 : 400}
              >
                {p.periodo}
              </text>
            ))}
          </svg>

          {pontoHover && (
            <div
              role="status"
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 4,
                padding: '6px 8px',
                fontSize: 11,
                fontFamily: font.mono,
                color: colors.ink,
                boxShadow: '0 6px 18px rgba(15,26,20,0.10)',
              }}
            >
              <strong>{pontoHover.periodo}</strong>
              {percentual ? (
                <>
                  <div>{pontoHover.nominal != null ? pctFmt(pontoHover.nominal, 2) : '—'}</div>
                  {limiar && (
                    <div style={{ color: viola(pontoHover.nominal) ? colors.red : colors.green }}>
                      {viola(pontoHover.nominal) ? 'abaixo do' : 'cumpre o'} {limiar.rotulo}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>nominal {pontoHover.nominal != null ? milhoes(pontoHover.nominal) : '—'}</div>
                  {pontoHover.real != null && <div>real {milhoes(pontoHover.real)}</div>}
                  {pontoHover.perCapita != null && <div>per capita {reais(pontoHover.perCapita)}</div>}
                </>
              )}
            </div>
          )}
          </div>
        }
      />

      {modoEfetivo === 'real' && (
        <Legenda
          itens={[
            { cor: colors.serieA, rotulo: 'Nominal', tracejado: false },
            { cor: colors.serieB, rotulo: `Real (preços ${ajuste?.base_periodo ?? '—'})`, tracejado: true },
          ]}
        />
      )}

      <div style={{ fontSize: 11, color: colors.faint, marginTop: 6, lineHeight: 1.5, fontFamily: font.mono }}>
        {modoEfetivo === 'real' && ajuste && <>deflator: {ajuste.fonte_deflator} · </>}
        {modoEfetivo === 'per_capita' && ajuste?.fonte_populacao && <>população: {ajuste.fonte_populacao} · </>}
        {nota}
        {ajuste?.observacao && <div style={{ color: colors.yellowText }}>{ajuste.observacao}</div>}
      </div>
    </div>
  );
}

function Legenda({ itens }: { itens: { cor: string; rotulo: string; tracejado: boolean }[] }) {
  return (
    <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
      {itens.map((i) => (
        <div key={i.rotulo} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: colors.muted }}>
          <svg width={18} height={6} aria-hidden>
            <line
              x1={0}
              y1={3}
              x2={18}
              y2={3}
              stroke={i.cor}
              strokeWidth={2}
              strokeDasharray={i.tracejado ? '5 4' : undefined}
            />
          </svg>
          {i.rotulo}
        </div>
      ))}
    </div>
  );
}

function Alternativa({
  ativo,
  onClick,
  rotulo,
  desabilitado,
  motivo,
}: {
  ativo: boolean;
  onClick: () => void;
  rotulo: string;
  desabilitado?: boolean;
  motivo?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      title={desabilitado ? motivo : undefined}
      aria-pressed={ativo}
      style={botaoStyle(ativo, desabilitado)}
    >
      {rotulo}
    </button>
  );
}

function botaoStyle(ativo: boolean, desabilitado = false) {
  return {
    border: `1px solid ${ativo ? colors.primary : colors.border}`,
    background: ativo ? colors.accentSoft : colors.surface,
    color: desabilitado ? colors.faint : colors.ink,
    borderRadius: 4,
    padding: '3px 8px',
    fontSize: 11,
    cursor: desabilitado ? 'not-allowed' : 'pointer',
    opacity: desabilitado ? 0.55 : 1,
  } as const;
}

