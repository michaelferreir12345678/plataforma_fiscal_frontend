import type { Alerta, Obrigacao, HistoricoEvento } from '../types';

export const alertas: Alerta[] = [
  {
    severidade: 'Crítico',
    categoria: 'CONFORMIDADE',
    level: 'maximo',
    titulo: 'RGF do 2º quadrimestre vence em 9 dias',
    motivo: 'A publicação do Relatório de Gestão Fiscal ainda não foi transmitida ao SICONFI. O prazo final é 30/09.',
    norma: 'LRF art. 55, §2º + LC 101 art. 51',
    consequencia: 'o atraso suspende transferências voluntárias e impede contratar operações de crédito (CAUC).',
    prazoLabel: 'Faltam',
    prazoValor: '9 dias',
    actionLabel: 'Ir à Conferência',
    actionTarget: '/limites',
    primary: true,
  },
  {
    severidade: 'Atenção',
    categoria: 'RISCO FISCAL · PREDITIVO',
    level: 'prudencial',
    titulo: 'Projeção indica cruzar o limite prudencial em ~14 meses',
    motivo: 'Mantida a tendência atual de pessoal (+0,23 p.p./mês), a despesa atinge a faixa prudencial de 51,3% no 2º quadrimestre de 2026.',
    norma: 'LRF art. 22, P.U.',
    consequencia: 'na faixa prudencial passam a valer vedações a reajuste, contratação e hora extra.',
    prazoLabel: 'Estimativa',
    prazoValor: '~14 m',
    actionLabel: 'Ver Previsões',
    actionTarget: '/previsoes',
  },
  {
    severidade: 'Atenção',
    categoria: 'RISCO FISCAL',
    level: 'prudencial',
    titulo: 'Restos a Pagar sem disponibilidade de caixa',
    motivo: 'R$ 142,8 M inscritos em RP processados sem lastro financeiro correspondente no 2º quadrimestre.',
    norma: 'LRF art. 42 (ano eleitoral)',
    consequencia: 'inscrição de RP sem cobertura em fim de mandato é vedada e pode gerar responsabilização.',
    prazoLabel: 'Em aberto',
    prazoValor: 'R$ 142,8M',
    actionLabel: 'Abrir Caixa',
    actionTarget: '/caixa',
  },
  {
    severidade: 'Informativo',
    categoria: 'DADOS',
    level: 'neutro',
    titulo: 'MSC de set/2024 foi retificada — reprocessamento concluído',
    motivo: 'Os indicadores que dependiam da competência set/2024 foram recalculados com os dados retificados.',
    norma: 'Portaria STN 1.339/2024',
    consequencia: 'nenhuma ação necessária; histórico atualizado para auditoria.',
    prazoLabel: 'Concluído',
    prazoValor: 'ok',
    actionLabel: 'Ver histórico',
    actionTarget: '/caixa',
  },
];

export const obrigacoes: Obrigacao[] = [
  { dia: '30', mes: 'Set', demonstrativo: 'RGF · 2º quadrimestre', periodo: 'Poder Executivo', status: 'A entregar', level: 'maximo' },
  { dia: '30', mes: 'Set', demonstrativo: 'RREO · 4º bimestre', periodo: 'consolidado', status: 'A entregar', level: 'atencao' },
  { dia: '30', mes: 'Nov', demonstrativo: 'RREO · 5º bimestre', periodo: 'consolidado', status: 'Agendado', level: 'neutro' },
  { dia: '30', mes: 'Jan', demonstrativo: 'RGF · 3º quadrimestre', periodo: 'Poder Executivo', status: 'Agendado', level: 'neutro' },
  { dia: '30', mes: 'Abr', demonstrativo: 'DCA · exercício 2025', periodo: 'balanço anual', status: 'Agendado', level: 'neutro' },
];

export const historico: HistoricoEvento[] = [
  { evento: 'RREO 2º bimestre homologado', data: '30/05/25', detalhe: 'transmitido no prazo · sem ressalvas', level: 'folga' },
  { evento: 'MSC set/2024 retificada', data: '14/05/25', detalhe: 'reenvio aceito pela STN', level: 'prudencial' },
  { evento: 'RGF 1º quadrimestre homologado', data: '30/01/25', detalhe: 'transmitido no prazo', level: 'folga' },
  { evento: 'DCA 2024 homologada', data: '30/04/25', detalhe: 'balanço anual completo', level: 'folga' },
];

export const agregados = [
  { count: '5', label: 'sem RGF do 1º quadrimestre', level: 'maximo' as const },
  { count: '22', label: 'pessoal em faixa prudencial', level: 'prudencial' as const },
  { count: '13', label: 'MSC com retificação pendente', level: 'atencao' as const },
];
