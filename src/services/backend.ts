/**
 * Tipos e fetchers tipados das respostas do backend (schemas Pydantic espelhados).
 * Valores monetários vêm em **reais**; a UI divide por 1e6 para exibir em R$ milhões.
 */
import { apiDownload, apiGet, apiPatch, apiPost } from './api';

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

// --- Previsões & Cenários (Sprint 14) ---
export type ForecastIndicador = 'rcl' | 'receita' | 'pessoal' | 'divida';
export type ForecastModelo = 'fechamento' | 'holt_winters' | 'regressao_exogenas';

export interface PontoHistorico {
  periodo: string;
  valor: FiscalDecimal;
  versao_entrega: string;
  as_of: string | null;
  source_ref: SourceRef;
}
export interface PontoProjecao {
  periodo_alvo: string;
  passo: number;
  valor_previsto: FiscalDecimal;
  ic_inferior: FiscalDecimal;
  ic_superior: FiscalDecimal;
  teto_pct: FiscalDecimal | null;
  faixa: string | null;
  cruza_limite: boolean;
}
export interface CruzamentoLimite {
  aplicavel: boolean;
  cruza: boolean;
  periodo_cruzamento: string | null;
  passo_cruzamento: number | null;
  valor_no_cruzamento: FiscalDecimal | null;
  teto_pct: FiscalDecimal | null;
  indicador_limite: string | null;
  esfera: string | null;
}
export interface ProjecaoResponse {
  cod_ibge: string;
  indicador: string;
  descricao: string;
  unidade: string; // BRL | PCT_RCL
  modelo: string;
  esfera: string | null;
  nivel_confianca: FiscalDecimal;
  horizonte: number;
  as_of: string | null;
  gerado_em: string | null;
  historico: PontoHistorico[];
  projecao: PontoProjecao[];
  cruzamento: CruzamentoLimite;
  memoria: Record<string, unknown>;
  source_ref: SourceRef;
}

export interface CenarioSimularInput {
  nome?: string;
  horizonte?: number;
  modelo?: string | null;
  ipca_aa_pct?: number | null;
  selic_aa_pct?: number | null;
  fpm_variacao_pct?: number | null;
  crescimento_indicador_pct?: number | null;
  crescimento_rcl_pct?: number | null;
  salvar?: boolean;
}
export interface LimiteImpacto {
  indicador: string;
  descricao: string | null;
  sentido: string; // teto | piso
  limite_pct: FiscalDecimal;
  valor_limite_rs: FiscalDecimal | null;
  pct_projetado: FiscalDecimal | null;
  faixa: string | null;
  cruza: boolean;
}
export interface CenarioSimularResponse {
  persistido: boolean;
  cenario_id: string | null;
  cod_ibge: string;
  indicador: string;
  horizonte: number;
  base: ProjecaoResponse;
  cenario: ProjecaoResponse;
  impacto_limites: LimiteImpacto[];
  impacto_minimos: LimiteImpacto[];
  memoria: Record<string, unknown>;
  source_refs: SourceRef[];
}
export interface CenarioSalvo {
  id: string;
  ente: string;
  indicador: string;
  nome: string;
  parametros: Record<string, unknown>;
  criado_em: string;
}

export const fetchProjecao = (
  ibge: string,
  params: { indicador: ForecastIndicador; horizonte?: number; modelo?: string | null; asOf?: string | null },
) =>
  apiGet<ProjecaoResponse>(`/entes/${ibge}/projecao`, {
    indicador: params.indicador,
    horizonte: params.horizonte,
    modelo: params.modelo ?? undefined,
    as_of: params.asOf,
  });

export const simularCenario = (
  ibge: string,
  indicador: ForecastIndicador,
  body: CenarioSimularInput,
) =>
  apiPost<CenarioSimularResponse, CenarioSimularInput>(
    `/entes/${ibge}/cenario/simular`,
    body,
    { indicador },
  );

export const fetchCenarios = (ibge: string) =>
  apiGet<CenarioSalvo[]>(`/entes/${ibge}/cenarios`);

// --- Alertas & Conformidade (Sprint 15) ---
export type AlertaSeveridade = 'critico' | 'atencao' | 'informativo';
export type AlertaStatus = 'nova' | 'reconhecida' | 'resolvida' | 'descartada';

export interface AlertaOut {
  id: string;
  cod_ibge: string;
  categoria: string;
  severidade: AlertaSeveridade;
  prioridade: number;
  titulo: string;
  motivo_legal: string;
  acao_sugerida: string;
  prazo: string | null;
  link: string | null;
  status: AlertaStatus;
  indicador: string | null;
  periodo: string | null;
  source_ref: SourceRef | null;
  memoria: Record<string, unknown> | null;
  criado_em: string;
  atualizado_em: string;
}
export interface Contadores {
  critico: number;
  atencao: number;
  informativo: number;
  total: number;
}
export interface FilaAlertasResponse {
  escopo: string;
  cod_ibge: string | null;
  gerado_em: string;
  contadores: Contadores;
  alertas: AlertaOut[];
}
export interface CalendarioItem {
  relatorio: string;
  periodo: string;
  periodicidade: string;
  prazo: string | null;
  status: string; // entregue | pendente | atrasado
  entregue_em: string | null;
  versao_entrega: string | null;
  base_legal: string | null;
  source_ref: SourceRef | null;
}
export interface CalendarioResponse {
  cod_ibge: string;
  esfera: string | null;
  populacao: number | null;
  periodicidade_rgf: string;
  gerado_em: string;
  itens: CalendarioItem[];
}
export interface CarteiraEnteAlertas {
  cod_ibge: string;
  nome: string | null;
  contadores: Contadores;
  pior_severidade: string | null;
}
export interface CarteiraCategoriaAgg {
  categoria: string;
  total: number;
}
export interface CarteiraAlertasResponse {
  n_entes: number;
  gerado_em: string;
  contadores: Contadores;
  por_categoria: CarteiraCategoriaAgg[];
  por_ente: CarteiraEnteAlertas[];
  top_alertas: AlertaOut[];
}

export const fetchAlertas = (ente: string, escopo: 'ente' | 'carteira' = 'ente') =>
  apiGet<FilaAlertasResponse>('/alertas', { escopo, ente: escopo === 'ente' ? ente : undefined });

export const fetchCalendario = (ente: string) =>
  apiGet<CalendarioResponse>(`/entes/${ente}/calendario`);

export const fetchCarteiraAlertas = () =>
  apiGet<CarteiraAlertasResponse>('/carteira/alertas');

export const patchAlerta = (id: string, status: AlertaStatus) =>
  apiPatch<AlertaOut, { status: AlertaStatus }>(`/alertas/${id}`, { status });

// --- Contexto: busca de entes e períodos com dado (Sprint 22) ---
export interface EnteBusca {
  cod_ibge: string;
  nome: string | null;
  uf: string | null;
  esfera: string | null;
  populacao: number | null;
  tem_dado: boolean;
  periodo_mais_recente: string | null;
}
export interface EntesBuscaResponse {
  data: EnteBusca[];
  total: number;
  escopo_total: number;
}
/** Busca de entes **dentro do escopo** (seletor de ente e ⌘K). */
export const fetchEntes = (params?: { q?: string; uf?: string; limit?: number }) =>
  apiGet<EntesBuscaResponse>('/entes', params);

export interface PeriodoDisponivel {
  periodo: string;
  relatorio: string;
  versao_entrega: string | null;
  vigente: boolean;
}
export interface PeriodosResponse {
  cod_ibge: string;
  relatorio: string | null;
  default: string | null;
  periodos: PeriodoDisponivel[];
}
/** Períodos com dado do ente; `default` = o mais recente (nunca período fixo por env). */
export const fetchPeriodos = (ibge: string, relatorio?: string) =>
  apiGet<PeriodosResponse>(`/entes/${ibge}/periodos`, { relatorio });

// --- Cockpit executivo em 7 camadas (Sprint 22) ---
export interface MudancaRelevante {
  indicador: string;
  rotulo: string;
  valor_atual: number | null;
  valor_anterior: number | null;
  delta_pp: number | null;
  faixa_atual: string | null;
  faixa_anterior: string | null;
  mudou_de_faixa: boolean;
  periodo_anterior: string | null;
}
export interface CockpitResumo {
  farol: string;
  cor: string;
  indicadores_avaliados: number;
  n_alertas: number;
  n_alertas_criticos: number;
  mudancas_relevantes: MudancaRelevante[];
  source_ref: SourceRef;
}
export interface CriticoItem {
  indicador: string;
  rotulo: string;
  sentido: string;
  valor_pct: number | null;
  valor_rs: number | null;
  limite_pct: number;
  faixa: string | null;
  cor: string;
  distancia_pp: number | null;
  source_ref: SourceRef;
}
export interface PontoSerie {
  periodo: string;
  valor: number | null;
}
export interface PontoProjetado {
  periodo: string;
  previsto: number;
  ic_inferior: number;
  ic_superior: number;
}
export interface TendenciaItem {
  indicador: string;
  rotulo: string;
  unidade: string;
  modelo: string | null;
  historico: PontoSerie[];
  projecao: PontoProjetado[];
  limite_pct: number | null;
  cruzamento_periodo: string | null;
  disponivel: boolean;
  motivo_indisponivel: string | null;
  source_ref: SourceRef | null;
}
export interface ComponenteVariacao {
  codigo: string;
  descricao: string;
  atual: number | null;
  anterior: number | null;
  delta_abs: number | null;
  delta_pct: number | null;
}
export interface ExplicadorItem {
  dimensao: string;
  rotulo: string;
  medida: string;
  periodo_atual: string;
  periodo_anterior: string | null;
  componentes: ComponenteVariacao[];
  disponivel: boolean;
  motivo_indisponivel: string | null;
  source_ref: SourceRef | null;
}
export interface ComparacaoItem {
  base: string;
  rotulo: string;
  indicador: string;
  disponivel: boolean;
  motivo_indisponivel: string | null;
  valor_atual: number | null;
  valor_base: number | null;
  delta_abs: number | null;
  delta_pct: number | null;
  referencia: string | null;
  source_ref: SourceRef | null;
}
export interface RiscoItem {
  id: string;
  severidade: string;
  categoria: string;
  titulo: string;
  motivo_legal: string;
  acao_sugerida: string;
  prazo: string | null;
  link: string | null;
  indicador: string | null;
  periodo: string | null;
  source_ref: SourceRef | null;
}
export interface QualidadeFonte {
  fonte: string;
  relatorio: string;
  cadencia: string;
  periodo_mais_recente: string | null;
  defasagem_periodos: number | null;
  ultima_carga: string | null;
  n_registros: number;
  versao_entrega_vigente: string | null;
  retificacoes: number;
}
export interface CockpitQualidade {
  fontes: QualidadeFonte[];
  defasagem_maxima: number | null;
  confiavel: boolean;
  observacao: string | null;
}
export interface CockpitResponse {
  cod_ibge: string;
  nome: string | null;
  esfera: string | null;
  periodo: string;
  as_of: string | null;
  resumo: CockpitResumo;
  criticos: CriticoItem[];
  tendencias: TendenciaItem[];
  explicadores: ExplicadorItem[];
  comparacoes: ComparacaoItem[];
  riscos: RiscoItem[];
  qualidade: CockpitQualidade;
  source_ref: SourceRef;
}
export const fetchCockpit = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<CockpitResponse>(`/entes/${ibge}/cockpit`, { periodo, as_of: asOf });

// --- Sessão, saúde e catálogo de fontes (Sprint 20) ---
export type Capacidade =
  | 'ver'
  | 'exportar'
  | 'config_alerta'
  | 'gerar_relatorio'
  | 'usar_ia'
  | 'administrar';
export type TipoConta = 'prefeitura' | 'estado' | 'consultoria';

export interface MembershipInfo {
  org_id: string;
  org_nome: string;
  tipo_conta: TipoConta;
  papel: string;
  capacidades: Capacidade[];
  escopo_ibges: string[] | null;
}
export interface MeResponse {
  usuario_id: string;
  email: string;
  nome: string;
  org_ativa: MembershipInfo | null;
  memberships: MembershipInfo[];
}
/** Contrato do shell: quem está logado e em qual organização. */
export const fetchMe = () => apiGet<MeResponse>('/me');

export interface OrgOut {
  id: string;
  nome: string;
  tipo_conta: TipoConta;
  metrica_cobranca: string | null;
  criada_em: string;
}
export interface OrgCreate {
  nome: string;
  tipo_conta: TipoConta;
  metrica_cobranca?: string | null;
}
/** Organizações reais do plano de controle. */
export const fetchOrgs = () => apiGet<OrgOut[]>('/orgs');
export const criarOrg = (body: OrgCreate) => apiPost<OrgOut, OrgCreate>('/orgs', body);

export interface UserOut {
  id: string;
  email: string;
  nome: string;
  mfa_ativo: boolean;
  papel_id?: string | null;
  papel_nome?: string | null;
}
export interface UserCreate {
  email: string;
  nome: string;
  senha: string;
  mfa_ativo?: boolean;
  papel_id?: string | null;
}
/** Usuários reais expostos pelo plano de controle. */
export const fetchUsuarios = () => apiGet<UserOut[]>('/users');
export const criarUsuario = (body: UserCreate) => apiPost<UserOut, UserCreate>('/users', body);

export interface PapelOut {
  id: string;
  org_id: string;
  nome: string;
  capacidades: Capacidade[];
}
export interface PapelCreate {
  nome: string;
  capacidades: Capacidade[];
}
/** Papéis reais da organização com suas capacidades (matriz RBAC). */
export const fetchPapeis = () => apiGet<PapelOut[]>('/papeis');
export const criarPapel = (body: PapelCreate) => apiPost<PapelOut, PapelCreate>('/papeis', body);

/** Capacidades do domínio (op.papel_capacidade) e seus rótulos de UI. */
export const CAPACIDADES: { cap: Capacidade; label: string }[] = [
  { cap: 'ver', label: 'Visualizar painéis' },
  { cap: 'exportar', label: 'Exportar dados' },
  { cap: 'gerar_relatorio', label: 'Gerar relatórios' },
  { cap: 'config_alerta', label: 'Configurar alertas' },
  { cap: 'usar_ia', label: 'Usar Assistente de IA' },
  { cap: 'administrar', label: 'Administrar' },
];

export interface HealthResponse {
  status: string;
  app_env: string;
  version: string;
}
/** Saúde + ambiente (não autenticado) — usado antes do login. */
export const fetchHealth = () => apiGet<HealthResponse>('/health');

export interface FonteCatalogo {
  fonte: string;
  familia: string;
  relatorio: string;
  descricao: string | null;
  cadencia: string;
  orgao: string | null;
  url_origem: string | null;
  escopo: string | null;
  parser_versao: string | null;
  paginas_impactadas: string[];
  dependencias: string[];
  ativo: boolean;
  ultima_execucao: string | null;
  ultima_execucao_ok: string | null;
  periodo_mais_recente: string | null;
  defasagem_periodos: number | null;
  entes_cobertos: number;
  registros_cobertos: number;
}
/** Catálogo + observabilidade por fonte. Alimenta o chip/rodapé de status do shell. */
export const fetchFontes = () => apiGet<FonteCatalogo[]>('/admin/ingestion/fontes');

export interface CoberturaItem {
  fonte: string;
  cod_ibge: string;
  uf: string | null;
  ano: number;
  periodo: string;
  n_registros: number;
  versao_entrega_vigente: string | null;
  ingerido_em: string | null;
  defasagem_periodos: number | null;
}
export interface CoberturaResumo {
  total_linhas: number;
  entes: number;
  periodos: number;
  fontes: string[];
}
export interface CoberturaResponse {
  data: CoberturaItem[];
  page: number;
  page_size: number;
  total: number;
  resumo: CoberturaResumo;
}
export const fetchCobertura = (params?: {
  fonte?: string;
  uf?: string;
  ano?: number;
  page?: number;
  page_size?: number;
}) => apiGet<CoberturaResponse>('/admin/ingestion/cobertura', params);

// --- Carteira / visão estadual consolidada (Sprint 4, religada na Sprint 20) ---
export interface IndicadorFaixa {
  indicador: string;
  faixa: string | null;
  cor: string;
  valor_pct: number | null;
  conformidade_status: string;
}
export interface CarteiraEnteRow {
  cod_ibge: string;
  nome: string | null;
  uf: string | null;
  regiao: string | null;
  porte: string | null;
  populacao: number | null;
  grupo: string | null;
  tag: string | null;
  conformidade: string;
  cor: string;
  risco_score: number;
  indicadores: IndicadorFaixa[];
}
export interface ResumoIndicador {
  indicador: string;
  total: number;
  por_faixa: Record<string, number>;
  por_conformidade: Record<string, number>;
}
export interface CarteiraResumoResponse {
  periodo: string;
  total_entes: number;
  entes_com_dados: number;
  por_conformidade: Record<string, number>;
  por_indicador: ResumoIndicador[];
  source_ref: SourceRef;
}
export interface MapaEnte {
  cod_ibge: string;
  uf: string | null;
  faixa: string | null;
  cor: string;
  valor_pct: number | null;
  conformidade_status: string;
}
export interface CarteiraMapaResponse {
  periodo: string;
  indicador: string | null;
  legenda: Record<string, string>;
  entes: MapaEnte[];
  source_ref: SourceRef;
}
export interface ListEnvelope<T> {
  data: T[];
  page: number;
  page_size: number;
  total: number;
  source_ref?: SourceRef | null;
}

export const fetchCarteiraResumo = (periodo: string) =>
  apiGet<CarteiraResumoResponse>('/carteira/resumo', { periodo });

/**
 * Grade consolidada do escopo (`/carteira/entes`) — com faixas por indicador.
 * Não confundir com `fetchCarteiraEntes` (`/carteira`), que é a **gestão** da carteira.
 */
export const fetchCarteiraGrade = (
  periodo: string,
  params?: { ordenar?: string; porte?: string; regiao?: string; tag?: string; page?: number; page_size?: number },
) => apiGet<ListEnvelope<CarteiraEnteRow>>('/carteira/entes', { periodo, ...params });

export const fetchCarteiraMapa = (periodo: string, indicador?: string) =>
  apiGet<CarteiraMapaResponse>('/carteira/mapa', { periodo, indicador });

// --- Relatórios & Exportação (Sprint 16) ---
export type RelatorioFormato = 'pdf' | 'xlsx' | 'pptx';
export type RelatorioEscopo = 'ente' | 'lote' | 'estadual';
export type RelatorioStatus = 'enfileirado' | 'processando' | 'gerado' | 'parcial' | 'falhou';

export interface RelatorioModelo {
  codigo: string;
  nome: string;
  publico: string;
  descricao: string;
  secoes: string[];
  formatos: RelatorioFormato[];
  formalidade: string;
  modelo_versao: string;
}
export interface RelatorioModelosResponse {
  modelos: RelatorioModelo[];
  gerado_em: string;
}
export interface DadoIncompletoRelatorio {
  tipo: 'ausente' | 'defasado' | string;
  codigo: string;
  mensagem: string;
  periodo_esperado: string | null;
  periodo_encontrado: string | null;
}
export interface RelatorioItem {
  id: string;
  lote_id: string;
  modelo: string;
  modelo_versao: string;
  formato: RelatorioFormato;
  escopo: RelatorioEscopo;
  cod_ibge: string;
  periodo: string;
  as_of: string;
  status: RelatorioStatus;
  progresso: number;
  cabecalho: Record<string, unknown>;
  source_refs: SourceRef[];
  memoria: Record<string, unknown>;
  dados_incompletos: DadoIncompletoRelatorio[];
  arquivo_nome: string | null;
  arquivo_url: string | null;
  mime_type: string | null;
  tamanho_bytes: number | null;
  conteudo_hash: string | null;
  gerado_em: string | null;
  erro: string | null;
  criado_em: string;
  atualizado_em: string;
}
export interface RelatorioSolicitacao {
  lote_id: string;
  total_entes: number;
  status: RelatorioStatus;
  relatorios: RelatorioItem[];
}
export interface RelatorioDetalhe extends RelatorioItem {
  lote_itens: RelatorioItem[];
}
export interface RelatorioLista {
  itens: RelatorioItem[];
  total: number;
  gerado_em: string;
}
export interface RelatorioCreateInput {
  modelo: string;
  formato: RelatorioFormato;
  escopo: RelatorioEscopo;
  ente?: string;
  entes?: string[];
  periodo: string;
  secoes?: string[];
  as_of?: string;
  parametros?: Record<string, unknown>;
}
export interface AgendamentoCreateInput extends Omit<RelatorioCreateInput, 'as_of'> {
  periodicidade: 'diario' | 'semanal' | 'mensal' | 'bimestral';
  proxima_execucao: string;
}
export interface RelatorioAgendamento {
  id: string;
  modelo: string;
  formato: RelatorioFormato;
  escopo: RelatorioEscopo;
  entes: string[];
  periodo: string;
  periodicidade: string;
  parametros: Record<string, unknown>;
  proxima_execucao: string;
  ultima_execucao: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export const fetchRelatorioModelos = () =>
  apiGet<RelatorioModelosResponse>('/relatorios/modelos');

export const fetchRelatorios = (limit = 50) =>
  apiGet<RelatorioLista>('/relatorios', { limit });

export const fetchRelatorio = (id: string) =>
  apiGet<RelatorioDetalhe>(`/relatorios/${id}`);

export const criarRelatorio = (body: RelatorioCreateInput) =>
  apiPost<RelatorioSolicitacao, RelatorioCreateInput>('/relatorios', body);

export const criarAgendamentoRelatorio = (body: AgendamentoCreateInput) =>
  apiPost<RelatorioAgendamento, AgendamentoCreateInput>('/relatorios/agendamentos', body);

export const baixarRelatorio = (item: RelatorioItem) => {
  if (!item.arquivo_url || !item.arquivo_nome) {
    return Promise.reject(new Error('Arquivo ainda não disponível.'));
  }
  return apiDownload(item.arquivo_url, item.arquivo_nome);
};

// --- Assistente de IA (Sprint 17) ---
export interface AssistFato {
  codigo: string;
  rotulo: string;
  valor_formatado: string;
  valor: string | null;
  unidade: string;
  status: string;
  faixa: string | null;
  disponivel: boolean;
  periodo: string;
  as_of: string | null;
  source_ref: SourceRef | null;
  memoria: Record<string, unknown>;
}
export interface AssistNorma {
  fonte: string; // LRF | CF | MDF
  dispositivo: string;
  titulo: string | null;
  trecho: string;
  score: number;
}
export interface AssistFonteChip {
  tipo: 'indicador' | 'norma';
  rotulo: string;
  detalhe: string | null;
  source_ref: SourceRef | null;
}
export interface AssistDadoIncompleto {
  tipo: string;
  codigo: string;
  mensagem: string;
  periodo_esperado: string | null;
  periodo_encontrado: string | null;
}
export interface AssistUsoInfo {
  modelo: string;
  tokens_entrada: number;
  tokens_saida: number;
  latencia_ms: number;
}
export interface AssistResposta {
  conversa_id: string;
  tipo: 'pergunta' | 'resumo_executivo';
  ente: string;
  ente_nome: string | null;
  periodo: string | null;
  as_of: string | null;
  titulo: string | null;
  pergunta: string;
  resposta: string;
  recusa: boolean;
  dado_disponivel: boolean;
  fatos: AssistFato[];
  normas: AssistNorma[];
  fontes: AssistFonteChip[];
  dados_incompletos: AssistDadoIncompleto[];
  uso: AssistUsoInfo;
  source_refs: SourceRef[];
  gerado_em: string;
}
export interface AssistUsoResumo {
  mes: string;
  consultas: number;
  tokens_entrada: number;
  tokens_saida: number;
  gerado_em: string;
}

export const perguntarAssistente = (body: {
  ente: string;
  pergunta: string;
  periodo?: string | null;
  as_of?: string | null;
}) => apiPost<AssistResposta, typeof body>('/assistant/perguntar', body);

export const gerarResumoExecutivo = (body: {
  ente: string;
  periodo?: string | null;
  as_of?: string | null;
  foco?: string | null;
}) => apiPost<AssistResposta, typeof body>('/assistant/resumo-executivo', body);

export const fetchAssistenteUso = () => apiGet<AssistUsoResumo>('/assistant/uso');

// --- Administração, Carteira & Billing (Sprint 18) ---
export type MetricaCobranca = 'por_ente' | 'por_populacao' | 'por_consulta_ia' | 'fixo';

export interface AssinaturaOut {
  id: string;
  org_id: string;
  plano: string;
  metrica_cobranca: MetricaCobranca;
  preco_unitario: FiscalDecimal;
  moeda: string;
  ciclo: string;
  status: string;
  inicio_vigencia: string | null;
  fim_vigencia: string | null;
  atualizada_em: string;
}
export interface FaturaOut {
  id: string;
  org_id: string;
  competencia: string;
  metrica_cobranca: MetricaCobranca;
  quantidade: FiscalDecimal;
  preco_unitario: FiscalDecimal;
  valor_total: FiscalDecimal;
  moeda: string;
  status: string;
  empenho_ref: string | null;
  contrato_ref: string | null;
  vencimento: string | null;
  memoria: Record<string, unknown>;
  source_refs: SourceRef[];
  emitida_em: string;
}
export interface FaturaPreview {
  competencia: string;
  metrica_cobranca: MetricaCobranca;
  quantidade: FiscalDecimal;
  preco_unitario: FiscalDecimal;
  valor_total: FiscalDecimal;
  moeda: string;
  ja_emitida: boolean;
  memoria: Record<string, unknown>;
  source_refs: SourceRef[];
}
export interface BillingOverview {
  org_id: string;
  metrica_cobranca: MetricaCobranca;
  assinatura: AssinaturaOut | null;
  preview: FaturaPreview;
  faturas: FaturaOut[];
}
export interface FaturaEmitInput {
  competencia?: string | null;
  empenho_ref?: string | null;
  contrato_ref?: string | null;
  vencimento?: string | null;
}

export interface IntegracaoOut {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  ativo: boolean;
  fontes: string[];
  atualizado_em: string;
}
export interface AuditoriaItem {
  id: string;
  usuario_id: string | null;
  acao: string;
  recurso: string;
  ts: string;
}
export interface AuditoriaPage {
  itens: AuditoriaItem[];
  total: number;
  limit: number;
  offset: number;
}
export interface CarteiraEnteOut {
  id: string;
  org_id: string;
  cod_ibge: string;
  grupo: string | null;
  tag: string | null;
}
export interface CarteiraLoteResult {
  adicionados: string[];
  removidos: string[];
  ignorados: string[];
  total_carteira: number;
}

export const fetchBilling = () => apiGet<BillingOverview>('/billing');
export const emitirFatura = (body: FaturaEmitInput) =>
  apiPost<FaturaOut, FaturaEmitInput>('/billing/faturas', body);

export const fetchIntegracoes = () => apiGet<IntegracaoOut[]>('/admin/integracoes');

export const fetchAuditoria = (params?: {
  acao?: string;
  q?: string;
  limit?: number;
  offset?: number;
}) => apiGet<AuditoriaPage>('/admin/auditoria', params);

export const fetchCarteiraEntes = () => apiGet<CarteiraEnteOut[]>('/carteira');
export const carteiraLote = (body: {
  adicionar: { cod_ibge: string; grupo?: string | null; tag?: string | null }[];
  remover: string[];
}) => apiPost<CarteiraLoteResult, typeof body>('/carteira/lote', body);

// --- Visão Estadual & Consolidação Territorial da UF (Sprint 23) ---
export interface EnteRef {
  cod_ibge: string;
  nome: string | null;
}
export interface IndicadorConsolidado {
  indicador: string;
  rotulo: string;
  tipo: 'ratio' | 'absoluto';
  unidade: string; // PCT_RCL | BRL
  numerador: FiscalDecimal | null;
  denominador: FiscalDecimal | null;
  valor_pct: FiscalDecimal | null;
  teto_pct: FiscalDecimal | null;
  sentido: string | null;
  faixa: string | null;
  cor: string;
  n_entes_total: number;
  n_entes_com_dado: number;
  cobertura_pct: FiscalDecimal | null;
  entes_ausentes: string[];
  periodos_mistos: boolean;
  versao_calculo: string;
  source_ref: SourceRef;
}
export interface ConsolidadoUfResponse {
  uf: string;
  uf_nome: string | null;
  periodo: string;
  escopo: string;
  ente_estadual: EnteRef | null;
  n_municipios: number;
  n_municipios_com_dado: number;
  cobertura_pct: FiscalDecimal | null;
  indicadores: IndicadorConsolidado[];
  observacao: string;
  source_ref: SourceRef;
}
export interface RankingItem {
  cod_ibge: string;
  nome: string | null;
  regiao: string | null;
  porte: string | null;
  populacao: number | null;
  valor_pct: FiscalDecimal | null;
  valor_rs: FiscalDecimal | null;
  faixa: string | null;
  cor: string;
  posicao: number;
  percentil: FiscalDecimal | null;
  destaque: boolean;
  no_escopo: boolean;
}
export interface RankingUfResponse {
  uf: string;
  periodo: string;
  indicador: string;
  rotulo: string;
  sentido: string;
  unidade: string;
  ordenar: string;
  n_total: number;
  n_com_valor: number;
  itens: RankingItem[];
  source_ref: SourceRef;
}
export interface HistogramaBin {
  faixa_inferior: FiscalDecimal;
  faixa_superior: FiscalDecimal;
  contagem: number;
}
export interface DistribuicaoUfResponse {
  uf: string;
  periodo: string;
  indicador: string;
  rotulo: string;
  unidade: string;
  n_com_valor: number;
  minimo: FiscalDecimal | null;
  p10: FiscalDecimal | null;
  p25: FiscalDecimal | null;
  mediana: FiscalDecimal | null;
  p75: FiscalDecimal | null;
  p90: FiscalDecimal | null;
  maximo: FiscalDecimal | null;
  histograma: HistogramaBin[];
  concentracao_top5_pct: FiscalDecimal | null;
  concentracao_top10_pct: FiscalDecimal | null;
  total: FiscalDecimal | null;
  source_ref: SourceRef;
}
export interface MapaUfEnte {
  cod_ibge: string;
  valor_pct: FiscalDecimal | null;
  faixa: string | null;
  cor: string;
  no_escopo: boolean;
}
export interface MapaUfResponse {
  uf: string;
  periodo: string;
  indicador: string;
  rotulo: string;
  legenda: Record<string, string>;
  malha_ref: string;
  entes: MapaUfEnte[];
  source_ref: SourceRef;
}
/** GeoJSON cru do IBGE (FeatureCollection de polígonos municipais). */
export interface GeoFeature {
  type: string;
  properties: { codarea: string; [k: string]: unknown };
  geometry: { type: string; coordinates: unknown };
}
export interface MalhaResponse {
  uf: string;
  formato: string;
  fonte: string | null;
  ano: number | null;
  n_areas: number | null;
  simplificacao: string | null;
  malha: { type: string; features: GeoFeature[] };
}
export interface ArvoreUfResponse extends DrillEnvelope {
  uf: string;
  indicador: string;
  agrupar: string;
}

export const fetchConsolidadoUf = (uf: string, periodo: string) =>
  apiGet<ConsolidadoUfResponse>(`/uf/${uf}/consolidado`, { periodo });

export const fetchUfRanking = (
  uf: string,
  params: { indicador: string; periodo: string; regiao?: string; porte?: string; ordenar?: string },
) => apiGet<RankingUfResponse>(`/uf/${uf}/ranking`, params);

export const fetchUfDistribuicao = (uf: string, indicador: string, periodo: string) =>
  apiGet<DistribuicaoUfResponse>(`/uf/${uf}/distribuicao`, { indicador, periodo });

export const fetchUfMapa = (uf: string, indicador: string, periodo: string) =>
  apiGet<MapaUfResponse>(`/uf/${uf}/mapa`, { indicador, periodo });

export const fetchUfArvore = (
  uf: string,
  params: { indicador: string; periodo: string; agrupar?: string; node?: string },
) => apiGet<ArvoreUfResponse>(`/uf/${uf}/arvore`, params);

export const fetchMalha = (uf: string) => apiGet<MalhaResponse>(`/geo/malha/${uf}`);

/** Ação em lote da carteira (Sprint 4): 'relatorio' | 'alerta'. Enfileira um job (202). */
export const acaoLoteCarteira = (
  acao: 'relatorio' | 'alerta',
  body: { entes?: string[]; periodo?: string | null },
) => apiPost<LoteJobOut, typeof body>(`/carteira/lote/${acao}`, body);

export interface LoteJobOut {
  id: string;
  acao: string;
  status: string;
  periodo: string | null;
  total_entes: number;
  entes: string[];
  criado_em: string | null;
}

// --- Central de Dados: jobs assíncronos de ingestão (Sprint 24) ---
export type IngestJobStatus = 'na_fila' | 'executando' | 'concluido' | 'falhou' | 'cancelado';
export type IngestJobTipo = 'run' | 'backfill' | 'replay';

export interface IngestJobItem {
  ente: string;
  chave: string;
  ok: boolean;
  erro: string | null;
  silver_rows: number;
  detalhe?: Record<string, unknown> | null;
}
export interface IngestJobResultado {
  itens: IngestJobItem[];
  indicadores_recalculados: string[];
  cobertura_antes: number | null;
  cobertura_depois: number | null;
  delta_cobertura: number | null;
  erro_sistema?: { fase?: string; erro?: string } | null;
  resumo_execucao?: Record<string, unknown> | null;
}
export interface IngestionLog {
  id: string;
  job_id: string;
  fonte: string;
  cod_ibge: string | null;
  periodo: string | null;
  versao: string | null;
  status: string;
  mensagem: string | null;
  ts: string;
}
export interface IngestJob {
  id: string;
  org_id: string;
  criado_por: string | null;
  fonte: string;
  tipo: IngestJobTipo;
  entes: string[];
  periodos: string[];
  parametros: Record<string, unknown> | null;
  status: IngestJobStatus;
  progresso_pct: number;
  itens_total: number;
  itens_ok: number;
  itens_erro: number;
  tentativas: number;
  erro_resumo: string | null;
  log_ref: string | null;
  resultado: IngestJobResultado | null;
  logs: IngestionLog[];
  criado_em: string | null;
  iniciado_em: string | null;
  terminado_em: string | null;
}
export interface IngestJobCreateResult {
  precisa_confirmacao: boolean;
  estimativa_itens: number;
  limiar: number;
  job: IngestJob | null;
}
export interface IngestJobCreateInput {
  fonte: string;
  tipo?: IngestJobTipo;
  entes: string[];
  anos?: number[];
  periodos?: string[];
  versao?: string | null;
  parametros?: Record<string, unknown>;
  confirmar?: boolean;
}
export interface RetificacaoItem {
  cod_ibge: string;
  relatorio: string;
  periodo: string;
  versao_entrega: string;
  homologada_em: string | null;
  versoes_anteriores: number;
}

export const criarIngestJob = (body: IngestJobCreateInput) =>
  apiPost<IngestJobCreateResult, IngestJobCreateInput>('/admin/ingestion/jobs', body);
export const fetchIngestJobs = (params?: { status?: string; fonte?: string }) =>
  apiGet<IngestJob[]>('/admin/ingestion/jobs', params);
export const fetchIngestJob = (id: string) =>
  apiGet<IngestJob>(`/admin/ingestion/jobs/${id}`);
export const cancelarIngestJob = (id: string) =>
  apiPost<IngestJob, Record<string, never>>(`/admin/ingestion/jobs/${id}/cancelar`, {});
export const retryIngestJob = (id: string) =>
  apiPost<IngestJob, Record<string, never>>(`/admin/ingestion/jobs/${id}/retry`, {});
export const fetchRetificacoes = (desde?: string) =>
  apiGet<RetificacaoItem[]>('/admin/ingestion/retificacoes', { desde });

/** Atualiza as capacidades de um papel (aba Permissões — fim do mock). */
export const atualizarPapelCapacidades = (papelId: string, capacidades: Capacidade[]) =>
  apiPatch<PapelOut, { capacidades: Capacidade[] }>(`/papeis/${papelId}`, { capacidades });
