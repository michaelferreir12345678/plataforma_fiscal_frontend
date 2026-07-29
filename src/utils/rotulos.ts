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
