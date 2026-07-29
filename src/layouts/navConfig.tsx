import type { ReactNode } from 'react';
import { Icon } from '../components/Icon';

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  /**
   * Rótulo **estático** de UI (ex.: "NOVO"). Contagens NÃO moram aqui: o AppShell as
   * injeta a partir do backend, para que nenhum número do menu seja fixo no código.
   */
  badge?: { text: string; tone: 'count' | 'new' | 'alerta' };
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    title: 'Visão',
    items: [
      {
        to: '/dashboard',
        label: 'Dashboard',
        icon: (
          <Icon>
            <rect x="2" y="2" width="5" height="6" rx="0.5" />
            <rect x="9" y="2" width="5" height="3.5" rx="0.5" />
            <rect x="2" y="10" width="5" height="4" rx="0.5" />
            <rect x="9" y="7.5" width="5" height="6.5" rx="0.5" />
          </Icon>
        ),
      },
      {
        to: '/carteira',
        label: 'Carteira / Estadual',
        icon: (
          <Icon>
            <circle cx="8" cy="8" r="0.9" fill="currentColor" />
            <circle cx="3" cy="8" r="0.9" fill="currentColor" />
            <circle cx="13" cy="8" r="0.9" fill="currentColor" />
            <circle cx="8" cy="3" r="0.9" fill="currentColor" />
            <circle cx="8" cy="13" r="0.9" fill="currentColor" />
            <circle cx="4.5" cy="4.5" r="0.9" fill="currentColor" />
            <circle cx="11.5" cy="11.5" r="0.9" fill="currentColor" />
          </Icon>
        ),
      },
    ],
  },
  {
    title: 'Conformidade',
    items: [
      {
        to: '/limites',
        label: 'Monitor de Limites',
        icon: (
          <Icon>
            <path d="M2.5 12a5.5 5.5 0 0111 0" />
            <path d="M8 12V8" />
            <circle cx="8" cy="12" r="1" fill="currentColor" />
          </Icon>
        ),
      },
      {
        to: '/alertas',
        label: 'Alertas',
        icon: (
          <Icon>
            <path d="M3.5 11.5V8a4.5 4.5 0 019 0v3.5l1 1.5h-11l1-1.5zM6.5 14a1.5 1.5 0 003 0" />
          </Icon>
        ),
      },
    ],
  },
  {
    title: 'Análise por bloco',
    items: [
      {
        to: '/receita',
        label: 'Receita',
        icon: (
          <Icon>
            <path d="M3 10l3-3 3 3 4-6" />
            <path d="M3 13h10" />
          </Icon>
        ),
      },
      {
        to: '/despesa',
        label: 'Despesa',
        icon: (
          <Icon>
            <path d="M3 6l3 3 3-3 4 6" />
            <path d="M3 13h10" />
          </Icon>
        ),
      },
      {
        to: '/pessoal',
        label: 'Pessoal',
        icon: (
          <Icon>
            <circle cx="8" cy="5" r="2.5" />
            <path d="M3 13.5a5 5 0 0110 0" />
          </Icon>
        ),
        badge: { text: 'NOVO', tone: 'new' },
      },
      {
        to: '/divida',
        label: 'Dívida e Crédito',
        icon: (
          <Icon>
            <path d="M2 13l4-5 3 3 5-7" />
            <path d="M10 4h4v4" />
          </Icon>
        ),
      },
      {
        to: '/resultado',
        label: 'Resultado Fiscal',
        icon: (
          <Icon>
            <path d="M8 2v12M4 6h8M4 10h8" />
          </Icon>
        ),
      },
      {
        to: '/caixa',
        label: 'Restos a Pagar & Caixa',
        icon: (
          <Icon>
            <rect x="2" y="4" width="12" height="9" rx="1" />
            <path d="M2 7h12M11 10h1.5" />
          </Icon>
        ),
      },
      {
        to: '/saude-educacao',
        label: 'Saúde e Educação',
        icon: (
          <Icon>
            <path d="M8 3v10M3 8h10" />
          </Icon>
        ),
      },
      {
        to: '/patrimonio',
        label: 'Patrimônio & MSC',
        icon: (
          <Icon>
            <rect x="2.5" y="6" width="11" height="8" rx="1" />
            <path d="M8 6V3M5 3h6M4.5 9.5h1.5M4.5 11.5h1.5" />
          </Icon>
        ),
      },
    ],
  },
  {
    title: 'Estratégia',
    items: [
      {
        to: '/previsoes',
        label: 'Previsões',
        icon: (
          <Icon>
            <path d="M2 12c2-4 4-4 6 0s4 4 6 0" />
          </Icon>
        ),
      },
      {
        to: '/benchmarking',
        label: 'Benchmarking',
        icon: (
          <Icon>
            <path d="M3 13V8M6.5 13V4M10 13V6.5M13.5 13V9.5" />
          </Icon>
        ),
      },
      {
        to: '/assistente',
        label: 'Assistente IA',
        icon: (
          <Icon>
            <path d="M8 2l1.5 4.5L14 8l-4.5 1.5L8 14l-1.5-4.5L2 8l4.5-1.5z" />
          </Icon>
        ),
        badge: { text: 'NOVO', tone: 'new' },
      },
      {
        to: '/relatorios',
        label: 'Relatórios',
        icon: (
          <Icon>
            <rect x="3" y="2" width="10" height="12" rx="1" />
            <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" />
          </Icon>
        ),
      },
    ],
  },
];
