import { colors } from '../theme';
import type { Kpi, SemaforoItem } from '../types';

/** Identificação do ente (mock — trocar por API depois). */
export const ente = {
  nome: 'Fortaleza, CE',
  sigla: 'FOR',
  cnpj: '07.954.605/0001-60',
  pop: '2.703.391',
  rcl12m: 'R$ 12.847,3 M',
};

export const semaforo: SemaforoItem[] = [
  {
    label: 'Pessoal · Executivo',
    subLabel: 'art. 20 LRF',
    value: 52.82,
    gaugeMax: 60,
    alerta: 48.6,
    prud: 51.3,
    max: 54,
    status: 'prudencial',
    statusLabel: 'Prudencial',
    topLabel: 'Máximo',
    topValue: '54,00%',
    detail: 'R$ 6.786,4 M',
    delta: '+0,21 vs. quad. ant.',
    deltaColor: colors.orange,
  },
  {
    label: 'Dívida Consolidada',
    subLabel: 'Res. SF 40/01',
    value: 87.1,
    gaugeMax: 132,
    alerta: 108,
    prud: 114,
    max: 120,
    status: 'folga',
    statusLabel: 'Folga',
    topLabel: 'Máximo',
    topValue: '120,0%',
    detail: 'R$ 11.190,4 M',
    delta: '−0,8 vs. quad. ant.',
    deltaColor: colors.green,
  },
  {
    label: 'Saúde · ASPS',
    subLabel: 'CF 198 §2º',
    value: 16.42,
    gaugeMax: 30,
    alerta: 15,
    prud: 15,
    max: 15,
    status: 'folga',
    statusLabel: 'Conforme',
    topLabel: 'Mínimo',
    topValue: '15,00%',
    detail: 'R$ 1.019,5 M',
    delta: '+0,4 vs. quad. ant.',
    deltaColor: colors.green,
  },
  {
    label: 'Educação · MDE',
    subLabel: 'CF 212',
    value: 28.13,
    gaugeMax: 40,
    alerta: 25,
    prud: 25,
    max: 25,
    status: 'folga',
    statusLabel: 'Conforme',
    topLabel: 'Mínimo',
    topValue: '25,00%',
    detail: 'R$ 1.746,2 M',
    delta: '+0,3 vs. quad. ant.',
    deltaColor: colors.green,
  },
];

export const kpis: Kpi[] = [
  {
    label: 'RCL 12 meses',
    value: '12.847,3',
    unit: 'M',
    subtitle: 'sobre média trimestral',
    delta: '+3,2%',
    deltaArrow: '▲',
    deltaColor: colors.green,
    spark: [11.8, 12.0, 12.2, 12.3, 12.4, 12.6, 12.7, 12.85],
  },
  {
    label: 'Receita arrecadada',
    value: '6.210,5',
    unit: 'M / R$ 6.478,0 prev.',
    subtitle: '95,9% da meta YTD',
    delta: '−4,1%',
    deltaArrow: '▼',
    deltaColor: colors.orange,
    spark: [100, 98, 99, 97, 96, 95, 95.5, 95.9],
  },
  {
    label: 'Despesa empenhada',
    value: '5.890,4',
    unit: 'M / R$ 12.640,0 dot.',
    subtitle: '46,6% da dotação YTD',
    delta: '+1,8%',
    deltaArrow: '▲',
    deltaColor: colors.muted,
    spark: [40, 42, 43, 44, 45, 46, 46.4, 46.6],
  },
  {
    label: 'Resultado primário',
    value: '+320,1',
    unit: 'M',
    subtitle: 'superávit · meta R$ 280 M',
    delta: '+14,3%',
    deltaArrow: '▲',
    deltaColor: colors.green,
    spark: [180, 210, 230, 250, 270, 290, 305, 320],
  },
];

/** Série histórica de pessoal (% RCL) — 12 meses + 3 projetados. */
export const pessoalHist = [50.31, 50.55, 50.82, 51.1, 51.34, 51.62, 51.94, 52.13, 52.42, 52.61, 52.73, 52.82];
export const pessoalProj = [52.95, 53.1, 53.25];
export const pessoalMeses = ['JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ', 'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET'];

export interface Destaque {
  level: 'prudencial' | 'atencao' | 'folga';
  text: string;
}

export const destaques: Destaque[] = [
  { level: 'prudencial', text: 'Pessoal em 52,82% da RCL — faixa prudencial. Aplicam-se as vedações do art. 22, P.U. da LRF.' },
  { level: 'atencao', text: 'Receita corrente arrecadada em -4,1% vs. previsão. Considere reprogramação no LDO 2026.' },
  { level: 'folga', text: 'DCL em 87,1% da RCL (folga ampla). Capacidade adicional de op. de crédito ~ R$ 4,23 bi.' },
  { level: 'prudencial', text: 'MSC out/24 retificada em mai/2025 — risco de bloqueio CAUC se inconsistências persistirem.' },
  { level: 'folga', text: 'Saúde a 16,42% e Educação a 28,13% — pisos LRF/CF cumpridos com folga.' },
];
