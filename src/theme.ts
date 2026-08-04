/**
 * Tokens de marca do Prumo.
 * Cores funcionais (risco) são semânticas — não decorativas.
 */
export const colors = {
  // superfícies
  bg: '#FAF9F6',
  surface: '#FFFFFF',
  surfaceAlt: '#FCFBF8',
  border: '#ECEAE2',
  borderSoft: '#F0EEE7',
  rowBorder: '#F4F2EC',

  // texto
  ink: '#0F1A14',
  /**
   * Texto secundário. Precisa passar AA também sobre `yellowSoft`, onde aparece em
   * caixas de aviso: 4,65:1 (era 4,02:1 quando o token só fora aferido contra as
   * superfícies claras). Sobre branco, 6,54:1.
   */
  muted: '#536156',
  /**
   * Texto terciário. Aferido contra **todos** os fundos em que de fato assenta —
   * inclusive `accentSoft`, usado na linha selecionada das tabelas: 4,60:1
   * (era 4,34:1). Sobre o fundo institucional, 5,07:1.
   */
  faint: '#626E64',

  // marca
  primary: '#1B3A2E',
  primaryDeep: '#0F1A14',
  primaryGrad: 'linear-gradient(135deg, #2D5A47, #1B3A2E)',
  accentSoft: '#E8F0EC',

  // risco (semânticas)
  green: '#136B4A',
  greenSoft: '#9CD7B8',
  greenBg: '#E8F5EE',
  yellow: '#E8B53A',
  yellowSoft: '#F2D886',
  yellowText: '#7A5A00',
  yellowBg: '#FBF4DC',
  orange: '#A84F13',
  orangeSoft: '#EFB287',
  orangeBg: '#FBEADA',
  red: '#B4232D',
  redSoft: '#E89999',
  redBg: '#FBDBDB',
  neutral: '#5B6B7B',
  neutralSoft: '#C0C7CE',
  neutralBg: '#EEF1F4',

  /**
   * Cores de **série** (gráficos). Deliberadamente fora da paleta de risco: verde,
   * amarelo, laranja e vermelho estão reservados às faixas da LRF e não podem
   * significar "linha 2". Par validado para daltonismo sobre superfície branca
   * (ΔE deutan 9,5 · tritan 13,2 · normal 18,9), com traço sólido × tracejado e
   * rótulo direto como codificação secundária.
   */
  serieA: '#0F8CA8',
  serieB: '#8054C7',
  serieBSoft: '#EDE6F8',
  /**
   * A mesma identidade da série A quando ela precisa virar **texto**. `serieA` é
   * validada como marca gráfica (3:1, WCAG SC 1.4.11) e reprova como texto — são
   * critérios distintos. Rótulo, célula e legenda usam esta; traço e preenchimento
   * continuam em `serieA`. 5,40:1 sobre branco.
   */
  serieAInk: '#0C748B',

  // interação
  focus: '#0B7189',
  focusHalo: 'rgba(15, 140, 168, 0.24)',
  overlay: 'rgba(15, 26, 20, 0.50)',
} as const;

export const font = {
  ui: "'Space Grotesk', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', monospace",
} as const;

/** Escala compartilhada; conteúdo informativo nunca usa menos de 11px. */
export const typeScale = {
  caption: 11,
  body: 13,
  bodyStrong: 14,
  title: 24,
  display: 38,
} as const;

export const layout = {
  sidebar: 220,
  sidebarCollapsed: 64,
  compactBreakpoint: 1024,
  contentMax: 1600,
} as const;

export type RiskLevel = 'folga' | 'atencao' | 'prudencial' | 'maximo' | 'neutro';

/** Mapa de cor por estado de risco (faixas da LRF). */
export const riskColor: Record<RiskLevel, { color: string; bg: string; soft: string; label: string }> = {
  folga: { color: colors.green, bg: colors.greenBg, soft: colors.greenSoft, label: 'Folga' },
  atencao: { color: colors.yellowText, bg: colors.yellowBg, soft: colors.yellowSoft, label: 'Alerta' },
  prudencial: { color: colors.orange, bg: colors.orangeBg, soft: colors.orangeSoft, label: 'Prudencial' },
  maximo: { color: colors.red, bg: colors.redBg, soft: colors.redSoft, label: 'Acima' },
  neutro: { color: colors.neutral, bg: colors.neutralBg, soft: colors.neutralSoft, label: 'Neutro' },
};

/**
 * Classifica um % sobre **piso** — mínimo constitucional (semântica INVERTIDA).
 *
 * Num teto, subir é ruim; num piso, subir é bom. Aplicar `classifyCeiling` a um mínimo
 * pinta de vermelho quem **cumpre** a obrigação: um município que aplica 27% em saúde,
 * onde o piso é 15%, apareceria como "Acima do teto" — a leitura exatamente oposta.
 *
 * As faixas espelham as do teto: abaixo do piso é a violação; até 5% acima é a margem
 * apertada (equivalente ao prudencial); até 10% acima é atenção; daí para cima é folga.
 */
export function classifyFloor(value: number, piso: number): RiskLevel {
  if (value < piso) return 'maximo'; // abaixo do mínimo: é o estado grave deste sentido
  if (value < piso * 1.05) return 'prudencial';
  if (value < piso * 1.1) return 'atencao';
  return 'folga';
}

/** Classifica um % sobre teto nas faixas da LRF (semântica de TETO). */
export function classifyCeiling(value: number, alerta: number, prud: number, max: number): RiskLevel {
  if (value >= max) return 'maximo';
  if (value >= prud) return 'prudencial';
  if (value >= alerta) return 'atencao';
  return 'folga';
}
