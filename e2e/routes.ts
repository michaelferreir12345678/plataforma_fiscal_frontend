export interface AppRoute {
  path: string;
  screen: string;
  snapshot: string;
  heavy?: boolean;
}

/** As 18 rotas registradas em src/App.tsx, sem aliases ou redirects. */
export const APP_ROUTES: readonly AppRoute[] = [
  { path: '/dashboard', screen: 'Cockpit Executivo', snapshot: 'cockpit', heavy: true },
  { path: '/carteira', screen: 'Carteira & Visão Estadual', snapshot: 'carteira-uf', heavy: true },
  { path: '/limites', screen: 'Monitor de Limites', snapshot: 'limites' },
  { path: '/receita', screen: 'Detalhe · Receita', snapshot: 'receita' },
  { path: '/despesa', screen: 'Detalhe · Despesa', snapshot: 'despesa' },
  { path: '/pessoal', screen: 'Detalhe · Pessoal', snapshot: 'pessoal' },
  { path: '/divida', screen: 'Detalhe · Dívida', snapshot: 'divida' },
  { path: '/resultado', screen: 'Detalhe · Resultado Fiscal', snapshot: 'resultado' },
  { path: '/caixa', screen: 'Detalhe · Restos a Pagar e Caixa', snapshot: 'caixa' },
  {
    path: '/patrimonio',
    screen: 'Detalhe · Patrimônio & Explorador MSC',
    snapshot: 'patrimonio-msc',
    heavy: true,
  },
  {
    path: '/saude-educacao',
    screen: 'Detalhe · Saúde e Educação',
    snapshot: 'saude-educacao',
  },
  { path: '/previsoes', screen: 'Previsões e Cenários', snapshot: 'previsoes' },
  { path: '/benchmarking', screen: 'Benchmarking', snapshot: 'benchmarking', heavy: true },
  { path: '/alertas', screen: 'Alertas e Conformidade', snapshot: 'alertas' },
  { path: '/assistente', screen: 'Assistente de IA', snapshot: 'assistente' },
  {
    path: '/relatorios',
    screen: 'Relatórios e Exportação',
    snapshot: 'relatorios',
  },
  { path: '/admin', screen: 'Administração', snapshot: 'admin' },
  {
    path: '/central-dados',
    screen: 'Central de Dados',
    snapshot: 'central-dados',
    heavy: true,
  },
] as const;

export const HEAVY_ROUTES = APP_ROUTES.filter((route) => route.heavy);
