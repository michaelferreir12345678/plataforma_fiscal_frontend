/**
 * Série observada + projeção com intervalo de confiança (camada 3 do Cockpit).
 *
 * Antes desta versão a camada de tendências desenhava um `Sparkline` de 220px fixos dentro
 * de uma coluna elástica: a curva ficava encolhida à esquerda, sem eixo, sem hover e sem o
 * limite legal — que o backend já mandava em `limite_pct` e ninguém plotava. Sem a linha do
 * limite, "para onde vai?" não tem resposta: a curva sobe, e sobe **em direção a quê**?
 *
 * Decisões de leitura:
 * - Observado e projetado são a **mesma** série: mesma cor, tracejado para o projetado.
 *   Cor diferente sugeriria indicador diferente.
 * - O intervalo de confiança é banda, não linha: projeção sem incerteza à vista lê-se como
 *   fato.
 * - Cor de risco (laranja/vermelho) fica reservada ao **cruzamento do limite**. Usá-la na
 *   curva inteira gastaria o único sinal que significa "faixa da LRF".
 * - Todo ponto tem `<title>`, foco por teclado e tooltip no hover; a tabela equivalente
 *   usa `AccessibleChart` (Sprint B3) — mesmo padrão do `SerieChart`, com alternância
 *   visível Gráfico/Tabela, em vez de um `sr-only` que só o leitor de tela alcançava.
 * - **Escala:** ao contrário do `SerieChart` (que ancora em zero), este gráfico usa uma
 *   janela em torno dos valores — colada no card do Cockpit, ancorar em zero achataria
 *   uma faixa estreita (ex.: 45%–52% de um limite de 54%) até a invisibilidade. A troca
 *   não é silenciosa: quando a janela não alcança o zero, a descrição visível do gráfico
 *   avisa "eixo não parte de zero" (Sprint B3 — a auditoria encontrou o corte sem aviso).
 */
import { useMemo, useState } from 'react';
import { colors, font } from '../theme';
import { AccessibleChart, type AccessibleChartColumn } from './AccessibleChart';

export interface PontoTendencia {
  periodo: string;
  valor: number | null;
  projetado: boolean;
  icInferior?: number | null;
  icSuperior?: number | null;
}

interface Props {
  pontos: PontoTendencia[];
  /** Formata o valor no eixo, no rótulo e no tooltip (a unidade é do indicador). */
  formatar: (v: number) => string;
  titulo: string;
  limite?: number | null;
  /** Período em que a projeção cruza o limite, quando cruza. */
  cruzamento?: string | null;
  altura?: number;
}

const LARGURA = 320; // unidades do viewBox; o SVG escala para a largura real do card
const PAD = { top: 12, right: 46, bottom: 20, left: 8 };

export function TendenciaChart({
  pontos,
  formatar,
  titulo,
  limite,
  cruzamento,
  altura = 108,
}: Props) {
  const [sob, setSob] = useState<number | null>(null);

  const comDado = useMemo(
    () => pontos.filter((p): p is PontoTendencia & { valor: number } => p.valor !== null),
    [pontos],
  );

  const escala = useMemo(() => {
    const valores = comDado.flatMap((p) => [
      p.valor,
      ...(p.icInferior != null ? [p.icInferior] : []),
      ...(p.icSuperior != null ? [p.icSuperior] : []),
    ]);
    if (limite != null) valores.push(limite);
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    // Uma folga proporcional impede que a linha do limite encoste na borda e suma.
    const folga = (max - min || Math.abs(max) || 1) * 0.12;
    return { min: min - folga, max: max + folga };
  }, [comDado, limite]);

  if (comDado.length < 2) return null;

  // O eixo não parte de zero quando a janela (com folga) fica inteira acima dele — é
  // exatamente o corte que a auditoria da Sprint B3 encontrou sem aviso nenhum. Diferente
  // do `SerieChart`, aqui a janela estreita é intencional (ver docstring); o que faltava
  // era dizer isso, não escondê-lo.
  const truncado = escala.min > 0;

  const innerW = LARGURA - PAD.left - PAD.right;
  const innerH = altura - PAD.top - PAD.bottom;
  const faixa = escala.max - escala.min || 1;
  const x = (i: number) => PAD.left + (i / (pontos.length - 1 || 1)) * innerW;
  const y = (v: number) => PAD.top + innerH - ((v - escala.min) / faixa) * innerH;

  const caminho = (filtro: (p: PontoTendencia, i: number) => boolean) => {
    const trechos = pontos
      .map((p, i) => ({ p, i }))
      .filter(({ p, i }) => p.valor !== null && filtro(p, i));
    if (trechos.length < 2) return '';
    return trechos
      .map(({ p, i }, ordem) => `${ordem === 0 ? 'M' : 'L'}${x(i)},${y(p.valor as number)}`)
      .join(' ');
  };

  const ultimoObservado = pontos.reduce(
    (acc, p, i) => (!p.projetado && p.valor !== null ? i : acc),
    -1,
  );
  // A projeção começa no último observado: sem essa emenda, a linha "salta" no meio.
  const caminhoObservado = caminho((p) => !p.projetado);
  const caminhoProjetado = caminho((p, i) => p.projetado || i === ultimoObservado);

  const bandaIC = (() => {
    const comIC = pontos
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.projetado && p.icInferior != null && p.icSuperior != null);
    if (comIC.length < 2) return '';
    const cima = comIC.map(({ p, i }) => `${x(i)},${y(p.icSuperior as number)}`);
    const baixo = [...comIC].reverse().map(({ p, i }) => `${x(i)},${y(p.icInferior as number)}`);
    return `M${cima.join(' L')} L${baixo.join(' L')} Z`;
  })();

  const ponto = sob != null ? pontos[sob] : null;
  const idxCruzamento = cruzamento ? pontos.findIndex((p) => p.periodo === cruzamento) : -1;

  // Resumo textual (mesmo papel do `descricaoSerie` do SerieChart): comunica tendência,
  // último valor e o cruzamento do limite sem depender da geometria do SVG.
  const ultimoComDado = [...pontos].reverse().find((p) => p.valor !== null) ?? null;
  const descricaoTendencia = [
    `${titulo}.`,
    `${comDado.length} ponto(s) observado(s)${pontos.some((p) => p.projetado) ? ' com projeção incluída' : ''}.`,
    ultimoComDado
      ? `Último ponto (${ultimoComDado.periodo}): ${formatar(ultimoComDado.valor as number)}${ultimoComDado.projetado ? ' (projetado)' : ''}.`
      : null,
    limite != null ? `Limite legal: ${formatar(limite)}.` : null,
    cruzamento ? `A projeção cruza o limite em ${cruzamento}.` : null,
    truncado ? 'Eixo vertical não parte de zero — a janela acompanha a variação da série.' : null,
  ]
    .filter(Boolean)
    .join(' ');

  const colunasTendencia: AccessibleChartColumn<PontoTendencia>[] = [
    { key: 'periodo', header: 'Período', render: (p) => p.periodo },
    { key: 'tipo', header: 'Tipo', render: (p) => (p.projetado ? 'Projetado' : 'Observado') },
    {
      key: 'valor',
      header: titulo,
      align: 'right',
      render: (p) => (p.valor != null ? formatar(p.valor) : '—'),
    },
    {
      key: 'ic_inferior',
      header: 'IC inferior',
      align: 'right',
      render: (p) => (p.icInferior != null ? formatar(p.icInferior) : '—'),
    },
    {
      key: 'ic_superior',
      header: 'IC superior',
      align: 'right',
      render: (p) => (p.icSuperior != null ? formatar(p.icSuperior) : '—'),
    },
  ];

  return (
    <AccessibleChart
      label={titulo}
      description={descricaoTendencia}
      rows={pontos}
      columns={colunasTendencia}
      rowKey={(p, i) => `${p.periodo}-${i}`}
      tableCaption={`${titulo} — alternativa tabular`}
      chart={
        <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${LARGURA} ${altura}`}
        width="100%"
        height={altura}
        focusable="false"
        onMouseLeave={() => setSob(null)}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Grade recessiva: referência sem competir com a curva. */}
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1={PAD.left}
            x2={LARGURA - PAD.right}
            y1={PAD.top + innerH * f}
            y2={PAD.top + innerH * f}
            stroke={colors.borderSoft}
            strokeWidth={1}
          />
        ))}

        {bandaIC && <path d={bandaIC} fill={colors.serieA} opacity={0.13} />}

        {limite != null && (
          <>
            <line
              x1={PAD.left}
              x2={LARGURA - PAD.right}
              y1={y(limite)}
              y2={y(limite)}
              stroke={colors.primaryDeep}
              strokeWidth={1.6}
              strokeDasharray="6 4"
            />
            <text
              x={LARGURA - PAD.right + 4}
              y={y(limite) + 3}
              fontSize={10}
              fontFamily={font.mono}
              fill={colors.primaryDeep}
              fontWeight={700}
            >
              limite
            </text>
          </>
        )}

        {caminhoObservado && (
          <path d={caminhoObservado} fill="none" stroke={colors.serieA} strokeWidth={2} strokeLinecap="round" />
        )}
        {caminhoProjetado && (
          <path
            d={caminhoProjetado}
            fill="none"
            stroke={colors.serieA}
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeLinecap="round"
            opacity={0.85}
          />
        )}

        {pontos.map((p, i) => {
          if (p.valor === null) return null;
          const cruza = i === idxCruzamento;
          return (
            <g
              key={`${p.periodo}-${i}`}
              role="img"
              tabIndex={0}
              aria-label={`${p.periodo}: ${formatar(p.valor)}${p.projetado ? ', projetado' : ''}${
                cruza ? ', cruza o limite legal' : ''
              }`}
              onFocus={() => setSob(i)}
              onBlur={() => setSob(null)}
            >
              <circle
                cx={x(i)}
                cy={y(p.valor)}
                r={cruza ? 4.5 : 3.2}
                fill={cruza ? colors.orange : colors.serieA}
                stroke={colors.surface}
                strokeWidth={1.6}
              >
                <title>
                  {`${p.periodo}: ${formatar(p.valor)}${p.projetado ? ' (projetado)' : ''}`}
                </title>
              </circle>
              {/* Alvo de hover maior que a marca — a marca tem 3px, o dedo/ponteiro não. */}
              <rect
                x={x(i) - innerW / (pontos.length * 2 || 1) - 4}
                y={PAD.top}
                width={innerW / (pontos.length || 1) + 8}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setSob(i)}
              />
            </g>
          );
        })}

        {/* Rótulo direto do último ponto — o número que mais importa, sem exigir hover. */}
        {(() => {
          const ultimo = [...pontos].reverse().find((p) => p.valor !== null);
          const idx = pontos.lastIndexOf(ultimo as PontoTendencia);
          if (!ultimo || ultimo.valor === null) return null;
          return (
            <text
              x={Math.min(x(idx) + 6, LARGURA - PAD.right + 2)}
              y={y(ultimo.valor) - 6}
              fontSize={10}
              fontFamily={font.mono}
              fill={colors.muted}
            >
              {formatar(ultimo.valor)}
            </text>
          );
        })()}

        {/* Só as pontas do eixo: rotular todos os períodos empilharia texto ilegível. */}
        {[0, pontos.length - 1].map((i) => (
          <text
            key={i}
            x={x(i)}
            y={altura - 6}
            fontSize={10}
            textAnchor={i === 0 ? 'start' : 'end'}
            fontFamily={font.mono}
            fill={colors.faint}
          >
            {pontos[i]?.periodo}
          </text>
        ))}
      </svg>

      {ponto?.valor != null && (
        <div
          role="status"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 4,
            padding: '5px 7px',
            fontSize: 10.5,
            fontFamily: font.mono,
            color: colors.ink,
            boxShadow: '0 6px 18px rgba(15,26,20,0.10)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <strong>{ponto.periodo}</strong>
          <div>{formatar(ponto.valor)}{ponto.projetado ? ' · projetado' : ''}</div>
          {ponto.projetado && ponto.icInferior != null && ponto.icSuperior != null && (
            <div style={{ color: colors.faint }}>
              IC {formatar(ponto.icInferior)}–{formatar(ponto.icSuperior)}
            </div>
          )}
        </div>
      )}
        </div>
      }
    />
  );
}
