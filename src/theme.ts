/**
 * Tokens de marca do Erário.
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
  muted: '#5B6B5F',
  faint: '#8A968C',

  // marca
  primary: '#1B3A2E',
  primaryDeep: '#0F1A14',
  primaryGrad: 'linear-gradient(135deg, #2D5A47, #1B3A2E)',
  accentSoft: '#E8F0EC',

  // risco (semânticas)
  green: '#1F9D6B',
  greenSoft: '#9CD7B8',
  greenBg: '#E8F5EE',
  yellow: '#E8B53A',
  yellowSoft: '#F2D886',
  yellowText: '#C49019',
  yellowBg: '#FBF4DC',
  orange: '#E07A2F',
  orangeSoft: '#EFB287',
  orangeBg: '#FBEADA',
  red: '#D14343',
  redSoft: '#E89999',
  redBg: '#FBDBDB',
  neutral: '#5B6B7B',
  neutralSoft: '#C0C7CE',
  neutralBg: '#EEF1F4',
} as const;

export const font = {
  ui: "'Space Grotesk', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', monospace",
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

/** Classifica um % sobre teto nas faixas da LRF (semântica de TETO). */
export function classifyCeiling(value: number, alerta: number, prud: number, max: number): RiskLevel {
  if (value >= max) return 'maximo';
  if (value >= prud) return 'prudencial';
  if (value >= alerta) return 'atencao';
  return 'folga';
}
