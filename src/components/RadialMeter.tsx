import { colors, classifyCeiling, classifyFloor } from '../theme';
import { arcPath, pointAt, pct, fmt } from '../utils/format';
import { riskColor } from '../theme';

interface RadialMeterProps {
  atualPct: number;
  alerta: number;
  prud: number;
  max: number;
  gaugeMax: number;
  size?: number;
  /**
   * Sentido do limite. **Não é detalhe de estilo:** num teto, subir é ruim; num piso,
   * subir é bom. O medidor tratava tudo como teto e pintava de vermelho quem cumpre o
   * mínimo — um município com 27% em saúde (piso 15%) lia "Acima do teto", enquanto a
   * legenda logo abaixo dizia, correta, "12 p.p. acima do mínimo".
   */
  sentido?: 'teto' | 'piso';
}

/**
 * Tamanho da leitura central em função do quanto ela ocupa.
 *
 * A fonte é monoespaçada, então o comprimento em caracteres prevê a largura com
 * precisão suficiente — não é preciso medir no DOM. O limite é o círculo interno do
 * mostrador (raio 78 de 240): ultrapassá-lo faz o número invadir o trilho das faixas,
 * que é a parte que dá sentido ao valor.
 */
function tamanhoDaLeitura(texto: string, size: number): number {
  const larguraDisponivel = (156 / 240) * size;
  // ~0,62 em de avanço por caractere na JetBrains Mono, com folga de 2px nas bordas.
  const idealPorCaractere = (larguraDisponivel - 4) / (texto.length * 0.62);
  const base = (36 / 240) * size;
  return Math.max(14, Math.min(base, idealPorCaractere));
}

/**
 * Medidor de faixa LRF (componente-assinatura).
 * Trilho com bandas folga/alerta/prudencial/máximo + ponteiro e leitura central.
 */
export function RadialMeter({
  atualPct,
  alerta,
  prud,
  max,
  gaugeMax,
  size = 240,
  sentido = 'teto',
}: RadialMeterProps) {
  const piso = sentido === 'piso';
  const cx = 120;
  const cy = 120;
  const r = 88;
  const start = -135;
  const end = 135;
  const sweep = 270;
  const pctToDeg = (p: number) => start + sweep * (p / gaugeMax);

  const level = piso ? classifyFloor(atualPct, max) : classifyCeiling(atualPct, alerta, prud, max);
  const color = riskColor[level].color;
  const statusLabel = piso
    ? level === 'maximo'
      ? 'Abaixo do mínimo'
      : level === 'prudencial'
        ? 'No limite do mínimo'
        : level === 'atencao'
          ? 'Pouco acima do mínimo'
          : 'Cumpre o mínimo'
    : level === 'maximo'
      ? 'Acima do teto'
      : level === 'prudencial'
        ? 'Faixa Prudencial'
        : level === 'atencao'
          ? 'Faixa de Alerta'
          : 'Folga';

  const folgaEnd = pctToDeg(alerta);
  const alertaEnd = pctToDeg(prud);
  const prudEnd = pctToDeg(max);
  const valEnd = pctToDeg(Math.min(atualPct, gaugeMax));

  const tickInner = r - 10;
  const tickOuter = r + 8;
  const tickLabelR = r + 22;
  const mkTick = (deg: number) => ({
    a: pointAt(cx, cy, tickInner, deg),
    b: pointAt(cx, cy, tickOuter, deg),
    lab: pointAt(cx, cy, tickLabelR, deg),
  });
  const tAlerta = mkTick(folgaEnd);
  const tPrud = mkTick(alertaEnd);
  const tMax = mkTick(prudEnd);
  const needle = pointAt(cx, cy, r + 4, valEnd);

  const fmtTick = (v: number) => (v % 1 === 0 ? fmt(v, 0) : fmt(v, 1)) + '%';
  const leitura = pct(atualPct);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg
        viewBox="0 0 240 240"
        role="img"
        aria-label={`${statusLabel}: ${pct(atualPct)}. Alerta ${fmtTick(alerta)}, prudencial ${fmtTick(prud)}, máximo ${fmtTick(max)}.`}
        style={{ width: '100%', height: '100%' }}
      >
        <path d={arcPath(cx, cy, r, start, end)} stroke={colors.borderSoft} strokeWidth={14} fill="none" strokeLinecap="round" />
        {/* As bandas seguem o sentido do limite. Num teto o vermelho fica no fim do
            trilho (ultrapassar é a violação); num piso ele fica no começo — a violação é
            ficar **abaixo**, e um trilho com o vermelho no lugar errado ensina o oposto
            do que a regra diz, mesmo com a cor do ponteiro correta. */}
        <path
          d={arcPath(cx, cy, r, start, folgaEnd)}
          stroke={piso ? colors.redSoft : colors.greenSoft}
          strokeWidth={14}
          fill="none"
        />
        <path
          d={arcPath(cx, cy, r, folgaEnd, alertaEnd)}
          stroke={piso ? colors.orangeSoft : colors.yellowSoft}
          strokeWidth={14}
          fill="none"
        />
        <path
          d={arcPath(cx, cy, r, alertaEnd, prudEnd)}
          stroke={piso ? colors.yellowSoft : colors.orangeSoft}
          strokeWidth={14}
          fill="none"
        />
        <path
          d={arcPath(cx, cy, r, prudEnd, end)}
          stroke={piso ? colors.greenSoft : colors.redSoft}
          strokeWidth={14}
          fill="none"
        />
        <path d={arcPath(cx, cy, r, start, valEnd)} stroke={color} strokeWidth={16} fill="none" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={78} fill="none" stroke={colors.borderSoft} strokeWidth={1} />
        {[tAlerta, tPrud, tMax].map((t, i) => (
          <line key={i} x1={t.a.x} y1={t.a.y} x2={t.b.x} y2={t.b.y} stroke={colors.ink} strokeWidth={1.5} />
        ))}
        <text x={tAlerta.lab.x} y={tAlerta.lab.y} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize={11} fontWeight={600} fill={colors.muted}>
          {fmtTick(alerta)}
        </text>
        <text x={tPrud.lab.x} y={tPrud.lab.y} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize={11} fontWeight={600} fill={colors.muted}>
          {fmtTick(prud)}
        </text>
        <text x={tMax.lab.x} y={tMax.lab.y} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize={11} fontWeight={600} fill={colors.muted}>
          {fmtTick(max)}
        </text>
        <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke={colors.ink} strokeWidth={2} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={5} fill={colors.ink} />
        <circle cx={cx} cy={cy} r={2} fill={colors.bg} />
      </svg>
      <div
        style={{
          position: 'absolute',
          // O texto vive dentro do círculo interno (raio 78 num viewBox de 240). Deixá-lo
          // à largura total do componente fazia o número transbordar o mostrador assim
          // que passava de cinco caracteres — "100,00%" já estourava.
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: (156 / 240) * size,
          bottom: 28,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            // Encolhe com o comprimento em vez de vazar: um indicador acima de 100%
            // é justamente o que o gestor mais precisa ler.
            fontSize: tamanhoDaLeitura(leitura, size),
            fontWeight: 600,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            whiteSpace: 'nowrap',
            color,
          }}
        >
          {leitura}
        </div>
        <div
          style={{
            fontSize: 11,
            color: colors.faint,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 600,
            marginTop: -2,
          }}
        >
          {statusLabel}
        </div>
      </div>
    </div>
  );
}
