/**
 * Tipos e fetchers tipados das respostas do backend (schemas Pydantic espelhados).
 * Valores monetários vêm em **reais**; a UI divide por 1e6 para exibir em R$ milhões.
 */
import { apiGet, apiPost } from './api';

export type Measures = Record<string, number | null>;

export interface DrillChild {
  codigo: string;
  descricao: string;
  nivel?: number | null;
  measures: Measures;
  has_children: boolean;
}
export interface DrillNodeRef {
  codigo: string;
  descricao: string;
  nivel?: number | null;
}
export interface DrillEnvelope {
  node: DrillNodeRef | null;
  breadcrumb: DrillNodeRef[];
  children: DrillChild[];
  measures: Measures;
  period?: string | null;
  as_of?: string | null;
  source_ref?: SourceRef | null;
}
export interface SourceRef {
  relatorio: string;
  anexo?: string | null;
  periodo?: string | null;
  versao_entrega?: string | null;
  as_of?: string | null;
}

export interface EnteOut {
  cod_ibge: string;
  nome: string | null;
  esfera: string | null;
  populacao: number | null;
  uf: string | null;
}

export interface ReceitaDetalhe {
  cod_ibge: string;
  periodo: string;
  versao_entrega: string;
  totais: Measures;
  realizacao_pct: number | null;
  rcl_12m: number | null;
  dependencia: {
    propria: number;
    transferida: number;
    total: number;
    pct_propria: number | null;
    pct_transferida: number | null;
  };
  composicao: DrillChild[];
  serie: { periodo: string; arrecadado_acum: number | null }[];
  source_ref: SourceRef;
}

export interface DespesaDetalhe {
  cod_ibge: string;
  periodo: string;
  versao_entrega: string;
  eixo: string;
  totais: Measures;
  potencial_rap: number | null;
  empenhado_pct_rcl: number | null;
  rcl_12m: number | null;
  composicao: DrillChild[];
  serie: { periodo: string; empenhado: number | null }[];
  source_ref: SourceRef;
}

export interface SemaforoItem {
  indicador: string;
  faixa: string | null;
  cor: string;
  valor_pct_rcl: number | null;
  teto_pct: number | null;
  sentido: string;
}
export interface KpiItem {
  chave: string;
  rotulo: string;
  unidade: string;
  valor: number | null;
  disponivel: boolean;
}
export interface DashboardResponse {
  cod_ibge: string;
  periodo: string;
  versao_entrega: string;
  conformidade: string;
  semaforo: SemaforoItem[];
  kpis: KpiItem[];
  destaques: { indicador: string; faixa: string; cor: string; mensagem: string }[];
  source_ref: SourceRef;
}

export interface LimiteItem {
  indicador: string;
  esfera: string;
  sentido: string;
  valor_rs: number | null;
  valor_pct_rcl: number | null;
  faixa: string | null;
  teto_pct: number | null;
  alerta_pct: number | null;
  prudencial_pct: number | null;
  distancia_teto: number | null;
  distancia_alerta: number | null;
}
export interface LimitesResponse {
  cod_ibge: string;
  periodo: string;
  itens: LimiteItem[];
  source_ref: SourceRef;
}

export interface PoderItem {
  poder_codigo: string;
  descricao: string;
  despesa_bruta: number | null;
  exclusoes: number | null;
  despesa_liquida: number | null;
  pct_rcl: number | null;
  faixa: string | null;
  teto_pct: number | null;
  indicador: string | null;
}
export interface PorPoderOut {
  cod_ibge: string;
  periodo: string;
  esfera: string | null;
  rpps: boolean;
  consolidado: PoderItem;
  itens: PoderItem[];
  source_ref: SourceRef;
}

export type DividaEixo = 'origem' | 'credor';
/** Pydantic v2 serializa ``Decimal`` como string JSON; a UI normaliza antes de calcular. */
export type FiscalDecimal = number | string;

export interface DclHero {
  rotulo: string;
  natureza: string;
  dc_bruta: FiscalDecimal | null;
  disponibilidades: FiscalDecimal | null;
  haveres: FiscalDecimal | null;
  dcl: FiscalDecimal | null;
  rcl_ajustada: FiscalDecimal | null;
  pct_rcl: FiscalDecimal | null;
  limite_pct: FiscalDecimal | null;
  faixa: string | null;
  as_of: string | null;
  source_ref: SourceRef;
}

export interface CapagHero {
  rotulo: string;
  natureza: string;
  ano_ref: number;
  nota_final: string | null;
  ind_endividamento: FiscalDecimal | null;
  endividamento_pct: FiscalDecimal | null;
  ind_poupanca: FiscalDecimal | null;
  ind_liquidez: FiscalDecimal | null;
  metodologia_versao: string | null;
  as_of: string | null;
  source_ref: SourceRef;
}

export interface SerieDividaItem {
  periodo: string;
  as_of: string;
  dc_bruta: FiscalDecimal;
  dcl: FiscalDecimal;
  pct_rcl: FiscalDecimal | null;
  source_ref: SourceRef;
}

export interface ComparacaoDivida {
  periodo_anterior: string;
  dcl_anterior: FiscalDecimal;
  variacao_rs: FiscalDecimal;
  variacao_pct: FiscalDecimal | null;
}

export interface DividaDetalhe {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  versao_entrega: string;
  esfera: string | null;
  dcl: DclHero;
  capag: CapagHero;
  composicao: DrillChild[];
  serie: SerieDividaItem[];
  comparacao: ComparacaoDivida | null;
  periodo_breadcrumb: DrillNodeRef[];
  source_ref: SourceRef;
}

export interface MemoriaDividaComponente {
  componente: string;
  operador: string;
  valor: FiscalDecimal;
  conta_origem?: string | null;
  coluna_origem?: string | null;
}

export interface DividaMemoria {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  versao_entrega: string;
  componentes: MemoriaDividaComponente[];
  dc_bruta: FiscalDecimal | null;
  disponibilidades: FiscalDecimal | null;
  haveres: FiscalDecimal | null;
  dcl: FiscalDecimal | null;
  rcl_ajustada: FiscalDecimal | null;
  pct_rcl: FiscalDecimal | null;
  formula_dcl: string;
  formula_pct: string;
  dcl_reportada?: FiscalDecimal | null;
  reconciliacao_ok: boolean | null;
  diferenca_reconciliacao: FiscalDecimal | null;
  detalhes?: Record<string, unknown>;
  source_ref: SourceRef;
}

export interface CapagMemoria {
  formula_endividamento: string;
  base_numerador: string;
  base_denominador: string;
  escala: string;
  observacoes: string[];
}

export interface DividaCapag {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  hero: CapagHero;
  memoria: CapagMemoria;
  source_ref: SourceRef;
}

export interface DividaArvore extends DrillEnvelope {
  eixo: DividaEixo;
  as_of: string | null;
  source_ref: SourceRef;
}

export interface VencimentoItem {
  ano: number;
  principal: FiscalDecimal | null;
  juros: FiscalDecimal | null;
  encargos: FiscalDecimal | null;
  valor: FiscalDecimal | null;
  operacoes: number;
}

export interface DividaCronograma {
  cod_ibge: string;
  periodo_ref: string;
  as_of: string | null;
  versao_entrega: string;
  itens: VencimentoItem[];
  total_principal: FiscalDecimal | null;
  total_juros: FiscalDecimal | null;
  total_encargos: FiscalDecimal | null;
  total_valor: FiscalDecimal | null;
  source_ref: SourceRef;
}

export interface SimularOperacaoInput {
  valor_operacao: number;
  valor_garantia: number;
  valor_aro: number;
  garantias_atuais?: number;
  aro_atual?: number;
}

export interface PosicaoSimulada {
  indicador: string;
  rotulo: string;
  valor_atual: FiscalDecimal | null;
  incremento: FiscalDecimal;
  valor_projetado: FiscalDecimal | null;
  pct_atual: FiscalDecimal | null;
  pct_projetado: FiscalDecimal | null;
  teto_pct: FiscalDecimal;
  faixa_atual: string | null;
  faixa_projetada: string | null;
  posicao_atual_conhecida: boolean;
}

export interface SimulacaoOperacao {
  cod_ibge: string;
  periodo: string;
  rcl_ajustada: FiscalDecimal | null;
  posicoes: PosicaoSimulada[];
  persistido: boolean;
  memoria: Record<string, string | number | boolean | null>;
  source_refs: SourceRef[];
  as_of: string | null;
}

// --- fetchers ---
export const fetchEnte = (ibge: string) => apiGet<EnteOut>(`/entes/${ibge}`);

export const fetchReceita = (ibge: string, periodo: string) =>
  apiGet<ReceitaDetalhe>(`/entes/${ibge}/receita`, { periodo });

export const fetchDespesa = (ibge: string, periodo: string, eixo = 'funcao') =>
  apiGet<DespesaDetalhe>(`/entes/${ibge}/despesa`, { periodo, eixo });

export const fetchDrill = (
  recurso: 'receita' | 'despesa',
  ibge: string,
  params: { periodo: string; node?: string; eixo?: string },
) => apiGet<DrillEnvelope>(`/entes/${ibge}/${recurso}/arvore`, params);

export const fetchDashboard = (ibge: string, periodo: string) =>
  apiGet<DashboardResponse>(`/entes/${ibge}/dashboard`, { periodo });

export const fetchLimites = (ibge: string, periodo: string) =>
  apiGet<LimitesResponse>(`/entes/${ibge}/limites`, { periodo });

export const fetchPessoalPorPoder = (ibge: string, periodo: string) =>
  apiGet<PorPoderOut>(`/entes/${ibge}/pessoal/por-poder`, { periodo });

export const fetchDivida = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<DividaDetalhe>(`/entes/${ibge}/divida`, { periodo, as_of: asOf });

export const fetchDividaMemoria = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<DividaMemoria>(`/entes/${ibge}/divida/memoria`, { periodo, as_of: asOf });

export const fetchDividaArvore = (
  ibge: string,
  params: { periodo: string; eixo: DividaEixo; node?: string; asOf?: string | null },
) =>
  apiGet<DividaArvore>(`/entes/${ibge}/divida/arvore`, {
    periodo: params.periodo,
    eixo: params.eixo,
    node: params.node,
    as_of: params.asOf,
  });

export const fetchDividaCapag = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<DividaCapag>(`/entes/${ibge}/divida/capag`, { periodo, as_of: asOf });

export const fetchDividaCronograma = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<DividaCronograma>(`/entes/${ibge}/divida/cronograma`, { periodo, as_of: asOf });

export const simularOperacaoDivida = (
  ibge: string,
  periodo: string,
  body: SimularOperacaoInput,
  asOf?: string | null,
) =>
  apiPost<SimulacaoOperacao, SimularOperacaoInput>(
    `/entes/${ibge}/divida/simular-operacao`,
    body,
    { periodo, as_of: asOf },
  );

// --- Resultado Fiscal (Sprint 9) ---
export interface ResultadoValores {
  receita_primaria: FiscalDecimal | null;
  despesa_primaria: FiscalDecimal | null;
  resultado_primario: FiscalDecimal | null;
  juros_liquidos: FiscalDecimal | null;
  resultado_nominal: FiscalDecimal | null;
  dcl_inicio: FiscalDecimal | null;
  dcl_fim: FiscalDecimal | null;
  variacao_dcl: FiscalDecimal | null;
  resultado_nominal_abaixo: FiscalDecimal | null;
  resultado_primario_abaixo: FiscalDecimal | null;
  meta_primario: FiscalDecimal | null;
  meta_nominal: FiscalDecimal | null;
}
export interface ResultadoComponente {
  codigo: string;
  descricao: string;
  valor: FiscalDecimal;
}
export interface MetaResumo {
  informada: boolean;
  meta_primario: FiscalDecimal | null;
  realizado_primario: FiscalDecimal | null;
  esforco_primario: FiscalDecimal | null;
  atingido_primario: boolean | null;
  meta_nominal: FiscalDecimal | null;
  realizado_nominal: FiscalDecimal | null;
}
export interface ResultadoDetalhe {
  cod_ibge: string;
  periodo: string;
  versao_entrega: string;
  valores: ResultadoValores;
  meta: MetaResumo;
  receita_componentes: ResultadoComponente[];
  despesa_componentes: ResultadoComponente[];
  serie: { periodo: string; resultado_primario: FiscalDecimal | null; resultado_nominal: FiscalDecimal | null }[];
  comparacao:
    | { periodo_anterior: string; resultado_primario_anterior: FiscalDecimal | null; delta_rs: FiscalDecimal | null }
    | null;
  periodo_breadcrumb: DrillNodeRef[];
  source_ref: SourceRef;
}
export interface CascataPasso {
  rotulo: string;
  valor: FiscalDecimal | null;
  tipo: string;
  acumulado: FiscalDecimal | null;
}
export interface CascataResultado {
  cod_ibge: string;
  periodo: string;
  versao_entrega: string;
  acima_da_linha: CascataPasso[];
  abaixo_da_linha: CascataPasso[];
  source_ref: SourceRef;
}
export interface ReconAjuste {
  codigo: string;
  descricao: string;
  valor: FiscalDecimal;
}
export interface ReconciliacaoResultado {
  cod_ibge: string;
  periodo: string;
  versao_entrega: string;
  nominal_acima: FiscalDecimal | null;
  nominal_abaixo: FiscalDecimal | null;
  ajustes: ReconAjuste[];
  soma_ajustes: FiscalDecimal;
  nominal_abaixo_ajustado: FiscalDecimal | null;
  divergencia_acima_abaixo: FiscalDecimal | null;
  variacao_dcl: FiscalDecimal | null;
  dcl_inicio: FiscalDecimal | null;
  dcl_fim: FiscalDecimal | null;
  dcl_sprint8: FiscalDecimal | null;
  dcl_sprint8_periodo: string | null;
  concilia_com_sprint8: boolean | null;
  identidade_primario_ok: boolean | null;
  identidade_nominal_dcl_ok: boolean | null;
  observacao: string;
  source_ref: SourceRef;
}
export interface MetaResultado {
  cod_ibge: string;
  periodo: string;
  versao_entrega: string;
  resumo: MetaResumo;
  bimestre: number;
  fracao_exercicio: FiscalDecimal;
  projecao_primario: FiscalDecimal | null;
  esforco_necessario: FiscalDecimal | null;
  observacao: string;
  source_ref: SourceRef;
}

export const fetchResultado = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<ResultadoDetalhe>(`/entes/${ibge}/resultado`, { periodo, as_of: asOf });

export const fetchResultadoCascata = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<CascataResultado>(`/entes/${ibge}/resultado/cascata`, { periodo, as_of: asOf });

export const fetchResultadoReconciliacao = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<ReconciliacaoResultado>(`/entes/${ibge}/resultado/reconciliacao`, { periodo, as_of: asOf });

export const fetchResultadoMeta = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<MetaResultado>(`/entes/${ibge}/resultado/meta`, { periodo, as_of: asOf });

// --- Caixa & Restos a Pagar (Sprint 10) ---
export interface FonteSuficienciaItem {
  fonte_codigo: string;
  descricao: string;
  vinculada: boolean;
  grupo_codigo: string;
  grupo_descricao: string;
  disp_bruta: FiscalDecimal | null;
  obrigacoes: FiscalDecimal | null;
  disp_liquida_antes: FiscalDecimal | null;
  rpnp_exercicio: FiscalDecimal | null;
  disp_liquida_apos: FiscalDecimal | null;
  rpnp_sem_lastro: FiscalDecimal | null;
  status: string; // suficiente | insuficiente_rpnp | deficit
  semaforo: string; // verde | amarelo | vermelho
  suficiente: boolean;
}
export interface GrupoSubtotal {
  grupo_codigo: string;
  descricao: string;
  vinculada: boolean;
  disp_liquida_antes: FiscalDecimal | null;
  rpnp_exercicio: FiscalDecimal | null;
  disp_liquida_apos: FiscalDecimal | null;
  rpnp_sem_lastro: FiscalDecimal | null;
  n_fontes: number;
}
export interface SuficienciaResumo {
  n_fontes: number;
  n_suficientes: number;
  n_insuficientes: number;
  n_deficit: number;
  total_rpnp_sem_lastro: FiscalDecimal;
  total_disp_liquida_apos_positiva: FiscalDecimal;
}
export interface SuficienciaMatriz {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  versao_entrega: string;
  esfera: string | null;
  itens: FonteSuficienciaItem[];
  grupos: GrupoSubtotal[];
  resumo: SuficienciaResumo;
  observacao: string;
  source_ref: SourceRef;
}

export interface RpnpSemLastroItem {
  fonte_codigo: string;
  descricao: string;
  vinculada: boolean;
  rpnp_exercicio: FiscalDecimal | null;
  disp_liquida_antes: FiscalDecimal | null;
  rpnp_sem_lastro: FiscalDecimal;
}
export interface RpnpSemLastroOut {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  versao_entrega: string;
  itens: RpnpSemLastroItem[];
  total_rpnp_sem_lastro: FiscalDecimal;
  total_vinculada: FiscalDecimal;
  total_nao_vinculada: FiscalDecimal;
  observacao: string;
  source_ref: SourceRef;
}

export interface Art42FonteItem {
  fonte_codigo: string;
  descricao: string;
  vinculada: boolean;
  disp_bruta: FiscalDecimal | null;
  obrigacoes_ate_fim: FiscalDecimal | null;
  lastro: FiscalDecimal | null;
  cumpre: boolean;
  lacuna: FiscalDecimal;
}
export interface Art42Out {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  versao_entrega: string | null;
  esfera: string | null;
  ano: number;
  quadrimestre: number | null;
  aplicavel: boolean;
  janela_vedacao: boolean;
  atende: boolean | null;
  n_descumprimentos: number;
  total_lacuna: FiscalDecimal;
  fontes: Art42FonteItem[];
  observacao: string;
  source_ref: SourceRef | null;
}

export interface RapOrgaoItem {
  orgao: string;
  rpp_inscritos: FiscalDecimal | null;
  rpp_pagos: FiscalDecimal | null;
  rpp_cancelados: FiscalDecimal | null;
  rpp_a_pagar: FiscalDecimal | null;
  rpnp_inscritos: FiscalDecimal | null;
  rpnp_liquidados: FiscalDecimal | null;
  rpnp_pagos: FiscalDecimal | null;
  rpnp_cancelados: FiscalDecimal | null;
  rpnp_a_pagar: FiscalDecimal | null;
  saldo_total: FiscalDecimal | null;
}
export interface CaixaDetalhe {
  cod_ibge: string;
  periodo: string;
  periodo_rreo: string | null;
  as_of: string | null;
  versao_entrega: string;
  esfera: string | null;
  resumo: SuficienciaResumo;
  disp_liquida_apos_total: FiscalDecimal;
  fontes_criticas: FonteSuficienciaItem[];
  rap_consolidado: RapOrgaoItem | null;
  rap_por_orgao: RapOrgaoItem[];
  art42_aplicavel: boolean;
  serie: { periodo: string; disp_liquida_apos_total: FiscalDecimal | null; rpnp_sem_lastro_total: FiscalDecimal | null }[];
  comparacao: { periodo_anterior: string; rpnp_sem_lastro_anterior: FiscalDecimal | null; delta_rs: FiscalDecimal | null } | null;
  periodo_breadcrumb: DrillNodeRef[];
  source_ref: SourceRef;
  source_ref_rap: SourceRef | null;
}

export const fetchCaixa = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<CaixaDetalhe>(`/entes/${ibge}/caixa`, { periodo, as_of: asOf });

export const fetchCaixaSuficiencia = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<SuficienciaMatriz>(`/entes/${ibge}/caixa/suficiencia`, { periodo, as_of: asOf });

export const fetchCaixaRpnpSemLastro = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<RpnpSemLastroOut>(`/entes/${ibge}/caixa/rpnp-sem-lastro`, { periodo, as_of: asOf });

export const fetchCaixaArt42 = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<Art42Out>(`/entes/${ibge}/caixa/art42`, { periodo, as_of: asOf });

export const fetchCaixaArvore = (
  ibge: string,
  params: { periodo: string; node?: string; asOf?: string | null },
) =>
  apiGet<DrillEnvelope>(`/entes/${ibge}/caixa/arvore`, {
    periodo: params.periodo,
    node: params.node,
    as_of: params.asOf,
  });

// --- Saúde & Educação (Sprint 11) ---
export interface MemoriaMinimoComponente {
  codigo: string;
  rotulo: string;
  valor: FiscalDecimal;
  operacao: 'base' | 'soma' | 'subtrai' | 'resultado' | 'referencia';
  source_ref: SourceRef;
  as_of: string;
}

export interface MemoriaCalculo {
  formula_aplicacao: string;
  formula_percentual: string;
  estagio_legal: 'liquidado' | 'empenhado';
  componentes: MemoriaMinimoComponente[];
  regra_expurgo: string;
  detalhes: Record<string, unknown>;
}

export interface SerieMinimoDetalhe {
  periodo: string;
  base_impostos_transferencias: FiscalDecimal;
  despesa_aplicada: FiscalDecimal;
  pct_aplicado: FiscalDecimal;
  minimo_pct: FiscalDecimal;
  abaixo_do_minimo: boolean;
  source_ref: SourceRef;
  as_of: string;
}

export interface MinimoDetalheBase {
  cod_ibge: string;
  periodo: string;
  esfera: string | null;
  base_impostos_transferencias: FiscalDecimal | null;
  despesa_bruta: FiscalDecimal | null;
  deducoes_outras: FiscalDecimal | null;
  rpnp_sem_lastro: FiscalDecimal | null;
  despesa_aplicada: FiscalDecimal | null;
  pct_aplicado: FiscalDecimal | null;
  minimo_pct: FiscalDecimal;
  valor_minimo: FiscalDecimal | null;
  abaixo_do_minimo: boolean;
  folga: FiscalDecimal | null;
  projecao_pct: FiscalDecimal | null;
  fonte_primaria: 'RREO';
  versao_entrega: string;
  source_ref: SourceRef;
  source_ref_expurgo: SourceRef | null;
  as_of: string | null;
  memoria_calculo: MemoriaCalculo;
  serie: SerieMinimoDetalhe[];
}

export interface SaudeDetalhe extends MinimoDetalheBase {}

export interface FundebMinimo {
  base: FiscalDecimal | null;
  aplicado_profissionais: FiscalDecimal | null;
  pct_aplicado: FiscalDecimal | null;
  minimo_pct: FiscalDecimal;
  valor_minimo: FiscalDecimal | null;
  abaixo_do_minimo: boolean;
  source_ref: SourceRef;
  as_of: string;
}

export interface EducacaoDetalhe extends MinimoDetalheBase {
  despesa_impostos: FiscalDecimal;
  despesa_fundeb: FiscalDecimal;
  fundeb: FundebMinimo;
}

export interface EnriquecimentoItem {
  codigo: string;
  descricao?: string | null;
  valor: FiscalDecimal | null;
  unidade?: string | null;
  periodo: string | null;
  source_ref: SourceRef;
  as_of: string;
}

export interface EnriquecimentoDetalhe {
  cod_ibge: string;
  periodo_solicitado: string;
  itens: EnriquecimentoItem[];
  ultima_atualizacao: string | null;
  periodo_fonte: string | null;
  defasado: boolean;
  defasagem_bimestres: number | null;
  selo: 'atualizado' | 'defasado' | 'indisponivel';
  source_ref: SourceRef | null;
  as_of: string | null;
  nao_substitui_base: true;
}

export interface ProjecaoMinimoItem {
  indicador: 'saude' | 'educacao';
  periodo: string;
  pct_atual: FiscalDecimal;
  pct_projetado: FiscalDecimal;
  minimo_pct: FiscalDecimal;
  valor_aplicado_projetado: FiscalDecimal;
  valor_minimo_projetado: FiscalDecimal;
  abaixo_do_minimo_projetado: boolean;
  metodo: string;
  source_ref: SourceRef;
  as_of: string;
}

export interface SerieMinimosItem {
  periodo: string;
  saude_pct: FiscalDecimal | null;
  educacao_pct: FiscalDecimal | null;
  source_ref_saude: SourceRef | null;
  source_ref_educacao: SourceRef | null;
  as_of: string;
}

export interface MinimosProjecao {
  cod_ibge: string;
  periodo: string;
  saude: ProjecaoMinimoItem;
  educacao: ProjecaoMinimoItem;
  serie: SerieMinimosItem[];
  source_ref: SourceRef;
  as_of: string | null;
}

export const fetchSaude = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<SaudeDetalhe>(`/entes/${ibge}/saude`, { periodo, as_of: asOf });

export const fetchSaudeArvore = (
  ibge: string,
  params: { periodo: string; node?: string; asOf?: string | null },
) =>
  apiGet<DrillEnvelope>(`/entes/${ibge}/saude/arvore`, {
    periodo: params.periodo,
    node: params.node,
    as_of: params.asOf,
  });

export const fetchSaudeDetalhamentoSiops = (
  ibge: string,
  periodo: string,
  asOf?: string | null,
) =>
  apiGet<EnriquecimentoDetalhe>(`/entes/${ibge}/saude/detalhamento-siops`, {
    periodo,
    as_of: asOf,
  });

export const fetchEducacao = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<EducacaoDetalhe>(`/entes/${ibge}/educacao`, { periodo, as_of: asOf });

export const fetchEducacaoArvore = (
  ibge: string,
  params: { periodo: string; node?: string; asOf?: string | null },
) =>
  apiGet<DrillEnvelope>(`/entes/${ibge}/educacao/arvore`, {
    periodo: params.periodo,
    node: params.node,
    as_of: params.asOf,
  });

export const fetchEducacaoDetalhamentoSiope = (
  ibge: string,
  periodo: string,
  asOf?: string | null,
) =>
  apiGet<EnriquecimentoDetalhe>(`/entes/${ibge}/educacao/detalhamento-siope`, {
    periodo,
    as_of: asOf,
  });

export const fetchMinimosProjecao = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<MinimosProjecao>(`/entes/${ibge}/minimos/projecao`, {
    periodo,
    as_of: asOf,
  });

// --- Patrimônio (DCA) & Explorador MSC (Sprint 12) ---
export interface PatrimonioDetalhe {
  cod_ibge: string;
  ano: number;
  as_of: string | null;
  esfera: string | null;
  uf: string | null;
  tem_msc: boolean;
  tem_dca: boolean;
  ativo: FiscalDecimal | null;
  passivo_pl: FiscalDecimal | null;
  patrimonio_liquido: FiscalDecimal | null;
  vpd: FiscalDecimal | null;
  vpa: FiscalDecimal | null;
  resultado_patrimonial: FiscalDecimal | null;
  balanco_fechado: boolean | null;
  meses_msc: string[];
  anos_disponiveis: number[];
  conciliado: boolean | null;
  n_divergencias: number | null;
  source_ref: SourceRef | null;
}

export interface MesSaldo {
  mes: number;
  periodo: string;
  saldo_inicial: FiscalDecimal | null;
  saldo_final: FiscalDecimal | null;
  movimento: FiscalDecimal | null;
}
export interface MatrizMensalOut {
  cod_ibge: string;
  ano: number;
  as_of: string | null;
  versao_entrega: string;
  cod_conta: string;
  descricao: string;
  nivel: number;
  classe: number;
  natureza: string;
  breadcrumb: DrillNodeRef[];
  meses: MesSaldo[];
  saldo_abertura: FiscalDecimal | null;
  saldo_encerramento: FiscalDecimal | null;
  variacao_exercicio: FiscalDecimal | null;
  memoria: Record<string, unknown>;
  source_ref: SourceRef;
}

export interface BalancoLinha {
  cod_conta: string;
  descricao: string | null;
  coluna: string | null;
  valor: FiscalDecimal | null;
  nivel: number | null;
  parent_conta: string | null;
  natureza: string | null;
}
export interface BalancoOut {
  cod_ibge: string;
  ano: number;
  tipo: string;
  anexo: string | null;
  as_of: string | null;
  versao_entrega: string;
  destaques: Record<string, FiscalDecimal | null>;
  linhas: BalancoLinha[];
  memoria: Record<string, unknown>;
  source_ref: SourceRef;
}
export interface BalancoTipoDisponivel {
  tipo: string;
  rotulo: string;
  anexo: string | null;
  disponivel: boolean;
}
export interface BalancosIndex {
  cod_ibge: string;
  ano: number;
  versao_entrega: string | null;
  tipos: BalancoTipoDisponivel[];
  source_ref: SourceRef | null;
}

export interface ConciliacaoCheck {
  chave: string;
  titulo: string;
  descricao: string;
  esquerda_rotulo: string;
  esquerda: FiscalDecimal | null;
  direita_rotulo: string;
  direita: FiscalDecimal | null;
  diferenca: FiscalDecimal | null;
  tolerancia: FiscalDecimal;
  divergente: boolean;
  aplicavel: boolean;
  detalhe: string | null;
  source_refs: SourceRef[];
}
export interface ConciliacaoOut {
  cod_ibge: string;
  ano: number;
  as_of: string | null;
  tem_msc: boolean;
  tem_dca: boolean;
  n_checks: number;
  n_divergencias: number;
  conciliado: boolean;
  checks: ConciliacaoCheck[];
  observacao: string;
  memoria: Record<string, unknown>;
  source_refs: SourceRef[];
}

export const fetchPatrimonio = (ibge: string, ano?: number | null, asOf?: string | null) =>
  apiGet<PatrimonioDetalhe>(`/entes/${ibge}/patrimonio`, { ano: ano ?? undefined, as_of: asOf });

export const fetchMscArvore = (
  ibge: string,
  params: { node?: string; periodo?: string; asOf?: string | null },
) =>
  apiGet<DrillEnvelope>(`/entes/${ibge}/msc/arvore`, {
    node: params.node,
    periodo: params.periodo,
    as_of: params.asOf,
  });

export const fetchMscConta = (
  ibge: string,
  codigo: string,
  ano?: number | null,
  asOf?: string | null,
) =>
  apiGet<MatrizMensalOut>(`/entes/${ibge}/msc/conta/${encodeURIComponent(codigo)}/saldos`, {
    ano: ano ?? undefined,
    as_of: asOf,
  });

export const fetchBalancosIndex = (ibge: string, ano?: number | null, asOf?: string | null) =>
  apiGet<BalancosIndex>(`/entes/${ibge}/balancos/tipos`, { ano: ano ?? undefined, as_of: asOf });

export const fetchBalanco = (
  ibge: string,
  tipo: string,
  ano?: number | null,
  asOf?: string | null,
) => apiGet<BalancoOut>(`/entes/${ibge}/balancos`, { tipo, ano: ano ?? undefined, as_of: asOf });

export const fetchMscConciliacao = (ibge: string, ano?: number | null, asOf?: string | null) =>
  apiGet<ConciliacaoOut>(`/entes/${ibge}/msc/conciliacao`, { ano: ano ?? undefined, as_of: asOf });

// --- Benchmarking (Sprint 13) ---

export type BenchmarkCriterio = 'porte' | 'regiao' | 'pib';
export type BenchmarkSentido = 'maior_melhor' | 'menor_melhor' | 'neutro';
export type BenchmarkOrdenacao = 'posicao' | 'nome' | 'cod_ibge' | 'valor' | 'percentil';
export type DirecaoOrdenacao = 'asc' | 'desc';

export interface BenchmarkCoorte {
  id: string;
  codigo: string;
  criterio: BenchmarkCriterio;
  faixa: string;
  rotulo: string;
  limite_inferior: FiscalDecimal | null;
  limite_superior: FiscalDecimal | null;
  inclusivo_superior: boolean;
  ordem: number;
  source_ref: SourceRef;
}

export interface BenchmarkIndicadorOption {
  codigo: string;
  rotulo: string;
  unidade: string;
  sentido?: BenchmarkSentido;
}

/** Um valor auditavel do ranking. Decimais Pydantic chegam como string JSON. */
export interface BenchmarkValue {
  cod_ibge: string;
  nome: string | null;
  uf?: string | null;
  valor: FiscalDecimal;
  percentil: FiscalDecimal;
  posicao: number;
  faixa?: string | null;
  destaque: boolean;
  as_of: string | null;
  source_ref: SourceRef;
  memoria?: Record<string, unknown> | null;
}

export interface BenchmarkCoverage {
  entes_elegiveis: number;
  entes_com_valor: number;
  entes_sem_valor: number;
  percentual: FiscalDecimal;
  amostra_parcial: boolean;
}

export interface BenchmarkStats {
  minimo: FiscalDecimal;
  p10: FiscalDecimal;
  p25: FiscalDecimal;
  mediana: FiscalDecimal;
  p75: FiscalDecimal;
  p90: FiscalDecimal;
  maximo: FiscalDecimal;
}

export interface BenchmarkResponse {
  indicador: string;
  indicador_rotulo: string;
  unidade: string;
  sentido: BenchmarkSentido;
  periodo: string;
  as_of: string | null;
  coorte: BenchmarkCoorte;
  coortes_disponiveis: BenchmarkCoorte[];
  indicadores_disponiveis: BenchmarkIndicadorOption[];
  quantidade: number;
  cobertura: BenchmarkCoverage;
  distribuicao: BenchmarkStats;
  ente: BenchmarkValue;
  memoria: Record<string, unknown>;
  source_ref?: SourceRef | null;
  source_refs: SourceRef[];
}

export interface BenchmarkRankingResponse {
  indicador: string;
  indicador_rotulo?: string;
  unidade?: string;
  sentido?: BenchmarkSentido;
  periodo: string;
  as_of: string | null;
  coorte: BenchmarkCoorte;
  coortes_disponiveis: BenchmarkCoorte[];
  indicadores_disponiveis: BenchmarkIndicadorOption[];
  ordenar: BenchmarkOrdenacao;
  ordem: DirecaoOrdenacao;
  itens: BenchmarkValue[];
  ente_ancora: BenchmarkValue;
  total: number;
  pagina: number;
  por_pagina: number;
  total_paginas: number;
  cobertura: BenchmarkCoverage;
  memoria: Record<string, unknown>;
  source_ref?: SourceRef | null;
  source_refs: SourceRef[];
}

export interface BenchmarkParams {
  indicador?: string;
  ente: string;
  coorte?: string;
  periodo?: string;
  asOf?: string | null;
}

export interface BenchmarkRankingParams extends BenchmarkParams {
  ordenarPor?: BenchmarkOrdenacao;
  ordem?: DirecaoOrdenacao;
  pagina?: number;
  porPagina?: number;
}

export const fetchBenchmark = (params: BenchmarkParams) =>
  apiGet<BenchmarkResponse>('/benchmark', {
    indicador: params.indicador,
    ente: params.ente,
    coorte: params.coorte,
    periodo: params.periodo,
    as_of: params.asOf,
  });

export const fetchBenchmarkRanking = (params: BenchmarkRankingParams) =>
  apiGet<BenchmarkRankingResponse>('/benchmark/ranking', {
    indicador: params.indicador,
    ente: params.ente,
    coorte: params.coorte,
    periodo: params.periodo,
    as_of: params.asOf,
    ordenar_por: params.ordenarPor,
    ordem: params.ordem,
    pagina: params.pagina,
    por_pagina: params.porPagina,
  });
