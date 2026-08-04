/**
 * Nome legível de códigos técnicos — espelho do registro canônico do backend
 * (`app/modules/indicators/rotulos.py`).
 *
 * A maioria das telas já recebe `rotulo` pronto da API; este módulo cobre os pontos onde
 * só o código viaja (cenário salvo, chave de série, filtro construído no cliente). A regra
 * é a mesma dos dois lados: **nenhuma tela mostra `snake_case`**.
 */

const ROTULOS: Record<string, string> = {
  // Limites legais (LRF)
  pessoal_executivo: 'Pessoal do Executivo',
  pessoal_consolidado: 'Pessoal consolidado',
  divida_consolidada_liquida: 'Dívida consolidada líquida',
  operacoes_credito: 'Operações de crédito',
  garantias: 'Garantias e contragarantias',
  aro: 'Antecipação de receita orçamentária',
  // Mínimos constitucionais
  saude_minimo: 'Aplicação em saúde (ASPS)',
  educacao_mde: 'Aplicação em educação (MDE)',
  fundeb_profissionais: 'FUNDEB — profissionais da educação',
  // Gerenciais
  rcl_per_capita: 'RCL por habitante',
  investimento_rcl: 'Investimento sobre a RCL',
  resultado_primario_rcl: 'Resultado primário sobre a RCL',
  // Chaves curtas do catálogo de previsão (Sprint 14)
  pessoal: 'Despesa com pessoal',
  divida: 'Dívida consolidada líquida',
  rcl: 'Receita Corrente Líquida',
  disponibilidade: 'Disponibilidade de caixa (líquida)',
};

const SIGLAS = new Set(['rcl', 'rgf', 'rreo', 'dca', 'msc', 'mde', 'asps', 'aro', 'pib', 'fundeb', 'ipca', 'uf']);

/** `investimento_rcl` → `Investimento RCL`. Último recurso, nunca a via normal. */
export function humanizar(codigo: string): string {
  const palavras = codigo.replace(/-/g, '_').split('_').filter(Boolean);
  if (!palavras.length) return codigo;
  const saida = palavras.map((p) => (SIGLAS.has(p.toLowerCase()) ? p.toUpperCase() : p));
  const [primeira, ...resto] = saida;
  const cabeca = SIGLAS.has(palavras[0].toLowerCase())
    ? primeira
    : primeira.charAt(0).toUpperCase() + primeira.slice(1);
  return [cabeca, ...resto].join(' ');
}

/** Nome de exibição do código; `padrao` cobre um nome melhor vindo do próprio dado. */
export function rotuloIndicador(codigo: string, padrao?: string | null): string {
  return ROTULOS[codigo] ?? padrao ?? humanizar(codigo);
}


/**
 * Nome da faixa legal, em português e único.
 *
 * A mesma faixa tinha três vocabulários: `theme.riskColor` dizia "Folga"/"Alerta", o
 * cockpit dizia "Conforme"/"Em alerta", e Limites e Pessoal mostravam o código cru do
 * backend (`EXCEDIDO`, `INSUFICIENTE`). Quem ia do cockpit ao monitor e à página de
 * pessoal não sabia se estava vendo o mesmo estado.
 *
 * O número entre parênteses não é enfeite: a diferença entre alerta e prudencial é
 * exatamente onde cada faixa começa, e quem lê "Alerta" sem saber que são 90% do teto não
 * consegue dimensionar a urgência.
 */
const FAIXAS: Record<string, string> = {
  // Teto (LRF art. 59, §1º)
  normal: 'Folga',
  folga: 'Folga',
  conforme: 'Folga',
  alerta: 'Alerta (90% do teto)',
  atencao: 'Alerta (90% do teto)',
  prudencial: 'Prudencial (95% do teto)',
  excedido: 'Acima do teto',
  maximo: 'Acima do teto',
  // O farol da carteira e do cockpit usa `critico`/`sem_dados`; sem estes dois o mesmo
  // estado legal aparecia como "Crítico" numa tela e "Limite excedido" na outra.
  critico: 'Acima do teto',
  sem_dados: 'Sem dado apurado',
  // Piso (mínimos constitucionais) — semântica invertida
  adequado: 'Cumpre o mínimo',
  insuficiente: 'Abaixo do mínimo',
  abaixo_minimo: 'Abaixo do mínimo',
  neutro: 'Sem faixa aplicável',
};

export function rotuloFaixa(codigo: string | null | undefined): string {
  if (!codigo) return '—';
  return FAIXAS[codigo.trim().toLowerCase()] ?? humanizar(codigo);
}

/**
 * Unidade de medida, por extenso.
 *
 * `PCT_RCL` e `R$/hab` não são a mesma coisa, e "unidade PCT_RCL" na tela obriga o gestor a
 * decodificar o banco. Pior: um valor per capita apresentado como percentual da RCL é outro
 * número.
 */
const UNIDADES: Record<string, string> = {
  PCT_RCL: 'em % da RCL',
  PCT_RCL_AJUSTADA: 'em % da RCL Ajustada',
  PCT: 'em %',
  RS: 'em R$',
  BRL: 'em R$',
  RS_HAB: 'em R$ por habitante',
  PCT_IMPOSTOS: 'em % da receita de impostos e transferências',
};

export function rotuloUnidade(codigo: string | null | undefined): string {
  if (!codigo) return '';
  return UNIDADES[codigo.trim().toUpperCase()] ?? humanizar(codigo);
}

/**
 * Nome do modelo de projeção, em português.
 *
 * `holt_winters` é o nome do método na literatura, não o que o gestor precisa saber. O que
 * ele precisa saber é **o que o modelo assume** — porque é isso que decide se a projeção
 * serve para a pergunta dele. Por isso o rótulo diz o comportamento, não o autor.
 */
const MODELOS: Record<string, string> = {
  fechamento: 'Fechamento do exercício',
  holt_winters: 'Tendência com sazonalidade',
  regressao_exogenas: 'Regressão com variáveis externas',
};

export function rotuloModelo(codigo: string | null | undefined): string {
  if (!codigo) return '—';
  return MODELOS[codigo] ?? humanizar(codigo);
}
