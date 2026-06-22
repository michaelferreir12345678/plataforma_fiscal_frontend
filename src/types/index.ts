import type { RiskLevel } from '../theme';

export interface SemaforoItem {
  label: string;
  subLabel: string;
  value: number;
  gaugeMax: number;
  alerta: number;
  prud: number;
  max: number;
  status: RiskLevel;
  statusLabel: string;
  topLabel: string;
  topValue: string;
  detail: string;
  delta: string;
  deltaColor: string;
}

export interface Kpi {
  label: string;
  value: string;
  unit: string;
  subtitle: string;
  delta: string;
  deltaArrow: string;
  deltaColor: string;
  spark: number[];
}

export interface Ente {
  name: string;
  pop: string;
  pessoal: number;
  dcl: number;
  saude: number;
  educacao: number;
  msc: 'OK' | 'Pend';
}

export interface LimitDef {
  key: string;
  label: string;
  badge: string;
  atualR: number;
  atualPct: number;
  alerta: number;
  prud: number;
  max: number;
  gaugeMax: number;
  rcl: number;
  history: number[];
  unit: string;
}

export interface Alerta {
  severidade: 'Crítico' | 'Atenção' | 'Informativo';
  categoria: string;
  level: RiskLevel;
  titulo: string;
  motivo: string;
  norma: string;
  consequencia: string;
  prazoLabel: string;
  prazoValor: string;
  actionLabel: string;
  actionTarget: string;
  primary?: boolean;
}

export interface Obrigacao {
  dia: string;
  mes: string;
  demonstrativo: string;
  periodo: string;
  status: 'A entregar' | 'Agendado' | 'Entregue';
  level: RiskLevel;
}

export interface HistoricoEvento {
  evento: string;
  data: string;
  detalhe: string;
  level: RiskLevel;
}

export type ScreenKey =
  | 'dashboard'
  | 'carteira'
  | 'limites'
  | 'receita'
  | 'despesa'
  | 'divida'
  | 'resultado'
  | 'caixa'
  | 'saude'
  | 'previsoes'
  | 'benchmarking'
  | 'alertas'
  | 'assistente'
  | 'relatorios'
  | 'admin';
