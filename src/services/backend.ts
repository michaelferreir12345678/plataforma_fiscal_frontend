/**
 * Tipos e fetchers tipados das respostas do backend (schemas Pydantic espelhados).
 * Valores monetários vêm em **reais**; a UI divide por 1e6 para exibir em R$ milhões.
 */
import {
  apiDelete,
  apiDeleteJson,
  apiDownload,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
} from './api';

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

/** Insumos de comparabilidade da série (deflator IPCA + população) — Sprint 25. */
export interface AjustePeriodo {
  periodo: string;
  fator_deflator: number | null;
  ipca_acum_pct: number | null;
  populacao: number | null;
  pop_ano_ref: number | null;
}
export interface SerieAjuste {
  base_periodo: string;
  deflator_disponivel: boolean;
  populacao_disponivel: boolean;
  fonte_deflator: string;
  fonte_populacao: string | null;
  observacao: string | null;
  itens: AjustePeriodo[];
}

export interface SerieReceitaItem {
  periodo: string;
  arrecadado_acum: number | null;
  arrecadado_real: number | null;
  arrecadado_per_capita: number | null;
  populacao: number | null;
}

export interface DependenciaResumo {
  propria: number;
  transferida: number;
  total: number;
  pct_propria: number | null;
  pct_transferida: number | null;
  /** Desdobramento de `transferida` por categoria econômica (U21/U22). */
  transferida_corrente: number | null;
  transferida_capital: number | null;
  pct_transferida_corrente: number | null;
  pct_transferida_capital: number | null;
}

export interface ReceitaDetalhe {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  versao_entrega: string;
  totais: Measures;
  realizacao_pct: number | null;
  rcl_12m: number | null;
  dependencia: DependenciaResumo;
  composicao: DrillChild[];
  serie: SerieReceitaItem[];
  serie_ajuste: SerieAjuste | null;
  comparacao: {
    periodo_anterior: string;
    arrecadado_acum_anterior: number | null;
    delta_pct: number | null;
  } | null;
  source_ref: SourceRef;
}

export interface InconsistenciaAgregacao {
  eixo?: string;
  codigo: string;
  medida: string;
  valor_no: number;
  soma_filhos: number;
}

export interface ReceitaMemoria {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  versao_entrega: string;
  medidas: string[];
  totais: Measures;
  formula_realizacao: string;
  hierarquia: string;
  inconsistencias: InconsistenciaAgregacao[];
  detalhes: Record<string, unknown>;
  source_ref: SourceRef;
}

export interface TransferenciaTop {
  codigo: string;
  descricao: string;
  arrecadado_acum: number;
  pct_das_transferencias: number | null;
}

export interface ReceitaDependencia {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  versao_entrega: string;
  resumo: DependenciaResumo;
  maiores_transferencias: TransferenciaTop[];
  rcl_12m: number | null;
  source_ref: SourceRef;
}

export interface RealizacaoItem {
  codigo: string;
  descricao: string;
  previsto_atualizado: number | null;
  arrecadado_acum: number | null;
  realizacao_pct: number | null;
}

export interface ReceitaRealizacao {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  versao_entrega: string;
  total: RealizacaoItem;
  por_categoria: RealizacaoItem[];
  source_ref: SourceRef;
}

export type ConciliacaoStatus =
  | 'conciliado'
  | 'divergente'
  | 'contido'
  | 'excede_agregado'
  | 'sem_dado_externo'
  | 'sem_par_rreo';

export interface ConciliacaoItem {
  transferencia: string;
  fonte_externa: string;
  rreo_acum: number | null;
  externo_acum: number | null;
  divergencia_pct: number | null;
  divergencia_rs: number | null;
  status: ConciliacaoStatus;
  tabela_externa: string;
  periodo_externo: string | null;
  nos_rreo: string[];
  independente: boolean;
  /** Linha própria da transferência no RREO ou o agregado que a contém. */
  base_comparacao: 'linha_especifica' | 'agregado' | 'ausente';
  participacao_no_agregado_pct: number | null;
}

export interface ReceitaConciliacao {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  versao_entrega: string;
  itens: ConciliacaoItem[];
  tolerancia_pct: number;
  observacao: string;
  source_ref: SourceRef;
}

export interface SerieDespesaItem {
  periodo: string;
  empenhado: number | null;
  empenhado_real: number | null;
  empenhado_per_capita: number | null;
  populacao: number | null;
}

export interface DespesaDetalhe {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  versao_entrega: string;
  eixo: string;
  totais: Measures;
  potencial_rap: number | null;
  empenhado_pct_rcl: number | null;
  rcl_12m: number | null;
  composicao: DrillChild[];
  serie: SerieDespesaItem[];
  serie_ajuste: SerieAjuste | null;
  comparacao: {
    periodo_anterior: string;
    empenhado_anterior: number | null;
    delta_pct: number | null;
  } | null;
  source_ref: SourceRef;
}

export interface ViolacaoEstagio {
  eixo: string;
  codigo: string;
  empenhado: number | null;
  liquidado: number | null;
  pago: number | null;
  problema: string;
}

export interface DespesaMemoria {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  versao_entrega: string;
  medidas: string[];
  totais_funcao: Measures;
  totais_natureza: Measures;
  reconciliacao_eixos_ok: boolean;
  diferenca_eixos: number | null;
  formula_potencial_rap: string;
  hierarquia_funcao: string;
  hierarquia_natureza: string;
  inconsistencias: InconsistenciaAgregacao[];
  violacoes_estagio: ViolacaoEstagio[];
  detalhes: Record<string, unknown>;
  source_ref: SourceRef;
}

export interface EstagioPasso {
  estagio: string;
  valor: number | null;
  delta_anterior: number | null;
}

export interface LacunaEstagio {
  nome: string;
  valor: number;
  formula: string;
}

export interface EstagioItem {
  codigo: string;
  descricao: string;
  dotacao_atualizada: number | null;
  empenhado: number | null;
  liquidado: number | null;
  pago: number | null;
  inscrito_rap: number | null;
  potencial_rap: number | null;
}

export interface DespesaEstagios {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  versao_entrega: string;
  eixo: string;
  totais: Measures;
  cascata: EstagioPasso[];
  lacunas: LacunaEstagio[];
  por_eixo: EstagioItem[];
  estagios_ausentes: string[];
  observacao: string | null;
  source_ref: SourceRef;
}

export interface ExecucaoEstagio {
  estagio: string;
  executado: number | null;
  base_dotacao: number | null;
  executado_pct: number | null;
  esperado_pct: number;
  ritmo_pp: number | null;
  status: 'adiantado' | 'no_ritmo' | 'atrasado' | 'sem_base';
}

export interface DespesaExecucao {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  versao_entrega: string;
  eixo: string;
  bimestre: number;
  esperado_pct: number;
  estagios: ExecucaoEstagio[];
  source_ref: SourceRef;
}

export interface RigidezComponente {
  grupo: string;
  descricao: string;
  tipo: 'rigida' | 'discricionaria' | 'semivariavel';
  empenhado: number;
  pct_despesa: number | null;
}

export interface DespesaRigidez {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  versao_entrega: string;
  despesa_total: number;
  rigida: number;
  discricionaria: number;
  semivariavel: number;
  rigidez_pct: number | null;
  discricionaria_pct: number | null;
  componentes: RigidezComponente[];
  source_ref: SourceRef;
}

export interface SemaforoItem {
  indicador: string;
  faixa: string | null;
  cor: string;
  valor_pct_rcl: number | null;
  teto_pct: number | null;
  sentido: string;
  /** Base do percentual (Sprint 25C) — o semáforo passou a misturar denominadores. */
  denominador: string;
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
  /** Base do percentual (Sprint 25C): 'rcl' | 'impostos_transferencias' | 'fundeb'. */
  denominador: string;
  base_valor: FiscalDecimal | null;
}
export interface LimitesResponse {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  itens: LimiteItem[];
  source_ref: SourceRef;
}

/** Providência legal (base normativa) para a faixa vigente — dado, não decisão (§9). */
export interface ProvidenciaLimite {
  faixa: string;
  texto: string;
  base_legal: string | null;
}
export interface SerieLimiteItem {
  periodo: string;
  valor_pct_rcl: FiscalDecimal | null;
  faixa: string | null;
  valor_rs: FiscalDecimal | null;
}
/** Painel expansível de `/limites` (Sprint D1): memória, providências e série sem sair da página. */
export interface LimiteDetail {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  indicador: string;
  esfera: string;
  faixa: string | null;
  valor_rs: FiscalDecimal | null;
  valor_pct_rcl: FiscalDecimal | null;
  /** `null` = indicador sem limite legal (gerencial). Zero significaria teto igual a zero. */
  teto_pct: FiscalDecimal | null;
  memoria: Record<string, unknown> | null;
  providencias: ProvidenciaLimite[];
  serie_historica: SerieLimiteItem[];
  periodo_breadcrumb: DrillNodeRef[];
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
  as_of: string | null;
  esfera: string | null;
  rpps: boolean;
  consolidado: PoderItem;
  itens: PoderItem[];
  source_ref: SourceRef;
}

// --- Pessoal (Sprint 25B: página nova consome os 4 endpoints prontos) ---
export interface PessoalTotais {
  despesa_bruta: FiscalDecimal | null;
  exclusoes: FiscalDecimal | null;
  despesa_liquida: FiscalDecimal | null;
  pct_rcl: FiscalDecimal | null;
}
export interface SeriePessoalItem {
  periodo: string;
  despesa_liquida: FiscalDecimal | null;
  pct_rcl: FiscalDecimal | null;
  despesa_liquida_real: FiscalDecimal | null;
  despesa_liquida_per_capita: FiscalDecimal | null;
  populacao: number | null;
}
export interface PessoalDetalhe {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  /** Período RREO correspondente: base da RCL e do limite (Q1→B2, Q2→B4, Q3→B6). */
  periodo_rreo: string | null;
  versao_entrega: string;
  esfera: string | null;
  rpps: boolean;
  /** RGF quadrimestral, salvo município < 50 mil hab. (semestral — LRF art. 63, II). */
  cadencia_rgf: 'quadrimestral' | 'semestral';
  totais: PessoalTotais;
  rcl_12m: FiscalDecimal | null;
  executivo: PoderItem | null;
  composicao: DrillChild[];
  serie: SeriePessoalItem[];
  serie_ajuste: SerieAjuste | null;
  comparacao: {
    periodo_anterior: string;
    despesa_liquida_anterior: FiscalDecimal | null;
    delta_pct: FiscalDecimal | null;
  } | null;
  periodo_breadcrumb: DrillNodeRef[];
  source_ref: SourceRef;
}
export interface ExclusaoItem {
  componente: string;
  valor: FiscalDecimal;
  incluida: boolean;
  motivo: string | null;
}
export interface PessoalMemoria {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  versao_entrega: string;
  rpps: boolean;
  despesa_bruta: FiscalDecimal | null;
  exclusoes: FiscalDecimal | null;
  despesa_liquida: FiscalDecimal | null;
  despesa_liquida_reportada: FiscalDecimal | null;
  exclusoes_reportadas: FiscalDecimal | null;
  rcl_12m: FiscalDecimal | null;
  pct_rcl: FiscalDecimal | null;
  formula_liquida: string;
  formula_pct: string;
  exclusoes_detalhe: ExclusaoItem[];
  hierarquia: string;
  detalhes: Record<string, unknown>;
  source_ref: SourceRef;
}

/** Simulação de limite (Sprint 3) — impacto de um delta na folha sobre a faixa. */
export interface SimularLimiteInput {
  novo_valor_rs?: number | null;
  delta_rs?: number | null;
}
export interface SimularLimiteResponse {
  indicador: string;
  valor_rs_atual: FiscalDecimal | null;
  valor_rs_simulado: FiscalDecimal;
  valor_pct_atual: FiscalDecimal | null;
  valor_pct_simulado: FiscalDecimal;
  faixa_atual: string | null;
  faixa_simulada: string;
  teto_pct: FiscalDecimal;
  persistido: boolean;
}

/** RCL 12 meses com memória de cálculo (denominador de quase todo limite). */
export interface RclComponente {
  conta: string;
  valor: FiscalDecimal;
}
export interface RclResponse {
  cod_ibge: string;
  periodo: string;
  versao_entrega: string;
  as_of: string | null;
  rcl_12m: FiscalDecimal;
  receita_corrente: FiscalDecimal;
  deducoes_total: FiscalDecimal;
  componentes: RclComponente[];
  deducoes: RclComponente[];
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
  /** ICF (layout oficial) ou versão de metodologia (layout estadual) — nunca o ano-base. */
  metodologia_versao: string | null;
  /** "ICF" (município) ou "Metodologia" (estado); null quando não há o que rotular. */
  metodologia_rotulo: string | null;
  /** Ano-base real da planilha, quando o layout municipal histórico trouxe `Ano_Base`. */
  ano_base_fonte: number | null;
  /** true ⇒ `ano_base_fonte` diverge do esperado (`ano_ref - 1`). */
  ano_base_fonte_diverge: boolean | null;
  as_of: string | null;
  source_ref: SourceRef;
}

export interface SerieDividaItem {
  periodo: string;
  as_of: string;
  dc_bruta: FiscalDecimal;
  dcl: FiscalDecimal;
  pct_rcl: FiscalDecimal | null;
  dcl_real: FiscalDecimal | null;
  dcl_per_capita: FiscalDecimal | null;
  populacao: number | null;
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
  serie_ajuste: SerieAjuste | null;
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
  /** Inclui os juros — o SADIPEM publica encargos sem discriminá-los. */
  encargos: FiscalDecimal | null;
  valor: FiscalDecimal | null;
  /** Dívida consolidada (estoque) × operações contratadas (assumido de novo). */
  dc_amortizacao: FiscalDecimal | null;
  dc_encargos: FiscalDecimal | null;
  oc_amortizacao: FiscalDecimal | null;
  oc_encargos: FiscalDecimal | null;
  operacoes: number;
}

export interface DividaCronograma {
  cod_ibge: string;
  periodo_ref: string;
  as_of: string | null;
  versao_entrega: string;
  itens: VencimentoItem[];
  total_principal: FiscalDecimal | null;
  total_encargos: FiscalDecimal | null;
  total_valor: FiscalDecimal | null;
  total_dc: FiscalDecimal | null;
  total_oc: FiscalDecimal | null;
  /** O que vence além do horizonte publicado — a linha "Restante a pagar" da fonte. */
  restante_amortizacao: FiscalDecimal | null;
  restante_encargos: FiscalDecimal | null;
  /** Último ano explícito: é o "após" que rotula o residual. */
  horizonte_ate: number | null;
  /** Soma dos anos + residual: o compromisso remanescente inteiro. */
  total_com_residual: FiscalDecimal | null;
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

export const fetchReceita = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<ReceitaDetalhe>(`/entes/${ibge}/receita`, { periodo, as_of: asOf });

export const fetchDespesa = (ibge: string, periodo: string, eixo = 'funcao', asOf?: string | null) =>
  apiGet<DespesaDetalhe>(`/entes/${ibge}/despesa`, { periodo, eixo, as_of: asOf });

export const fetchDrill = (
  recurso: 'receita' | 'despesa',
  ibge: string,
  params: { periodo: string; node?: string; eixo?: string; asOf?: string | null },
) =>
  apiGet<DrillEnvelope>(`/entes/${ibge}/${recurso}/arvore`, {
    periodo: params.periodo,
    node: params.node,
    eixo: params.eixo,
    as_of: params.asOf,
  });

// --- Receita (Sprint 25A: fim dos endpoints ociosos da auditoria §6) ---
export const fetchReceitaMemoria = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<ReceitaMemoria>(`/entes/${ibge}/receita/memoria`, { periodo, as_of: asOf });

export const fetchReceitaDependencia = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<ReceitaDependencia>(`/entes/${ibge}/receita/dependencia`, { periodo, as_of: asOf });

export const fetchReceitaRealizacao = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<ReceitaRealizacao>(`/entes/${ibge}/receita/realizacao`, { periodo, as_of: asOf });

/** Contraprova RREO × FPM/FUNDEB/ICMS (Sprint 1B): divergência = qualidade de dado. */
export const fetchReceitaConciliacao = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<ReceitaConciliacao>(`/entes/${ibge}/receita/transferencias/conciliacao`, {
    periodo,
    as_of: asOf,
  });

// --- Despesa ---
export const fetchDespesaMemoria = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<DespesaMemoria>(`/entes/${ibge}/despesa/memoria`, { periodo, as_of: asOf });

export const fetchDespesaEstagios = (
  ibge: string,
  periodo: string,
  eixo = 'funcao',
  asOf?: string | null,
) => apiGet<DespesaEstagios>(`/entes/${ibge}/despesa/estagios`, { periodo, eixo, as_of: asOf });

/** Eixo natureza por padrão: é o Anexo (01) que publica o estágio "pago". */
export const fetchDespesaExecucao = (
  ibge: string,
  periodo: string,
  eixo = 'natureza',
  asOf?: string | null,
) => apiGet<DespesaExecucao>(`/entes/${ibge}/despesa/execucao`, { periodo, eixo, as_of: asOf });

export const fetchDespesaRigidez = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<DespesaRigidez>(`/entes/${ibge}/despesa/rigidez`, { periodo, as_of: asOf });

export const fetchDashboard = (ibge: string, periodo: string) =>
  apiGet<DashboardResponse>(`/entes/${ibge}/dashboard`, { periodo });

export const fetchLimites = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<LimitesResponse>(`/entes/${ibge}/limites`, { periodo, as_of: asOf });

/**
 * Painel expansível de `/limites` (Sprint D1): memória de cálculo, providências (base
 * legal por faixa) e série histórica de um único indicador — sem sair da página.
 */
export const fetchLimiteDetail = (
  ibge: string,
  indicador: string,
  periodo: string,
  asOf?: string | null,
) => apiGet<LimiteDetail>(`/entes/${ibge}/limites/${indicador}`, { periodo, as_of: asOf });

export const fetchPessoalPorPoder = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<PorPoderOut>(`/entes/${ibge}/pessoal/por-poder`, { periodo, as_of: asOf });

export const fetchPessoal = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<PessoalDetalhe>(`/entes/${ibge}/pessoal`, { periodo, as_of: asOf });

export const fetchPessoalArvore = (
  ibge: string,
  params: { periodo: string; node?: string; asOf?: string | null },
) =>
  apiGet<DrillEnvelope>(`/entes/${ibge}/pessoal/arvore`, {
    periodo: params.periodo,
    node: params.node,
    as_of: params.asOf,
  });

export const fetchPessoalMemoria = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<PessoalMemoria>(`/entes/${ibge}/pessoal/memoria`, { periodo, as_of: asOf });

/** RCL 12m com memória — o denominador de quase todo limite da LRF. */
export const fetchRcl = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<RclResponse>(`/entes/${ibge}/rcl`, { periodo, as_of: asOf });

/** Simulador de impacto: delta na folha (ou novo valor) → nova faixa do limite. */
export const simularLimite = (
  ibge: string,
  indicador: string,
  periodo: string,
  body: SimularLimiteInput,
) =>
  apiPost<SimularLimiteResponse, SimularLimiteInput>(
    `/entes/${ibge}/limites/${indicador}/simular`,
    body,
    { periodo },
  );

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

/** PVL/CDP do SADIPEM: pedidos de verificação de limites e decisões do Tesouro. */
export interface PvlItem {
  id_pvl: string | null;
  /** Identificadores do processo no Tesouro — a âncora documental da operação. */
  num_pvl: string | null;
  num_processo: string | null;
  tipo_operacao: string | null;
  /** Para que serve o dinheiro e quem empresta. */
  finalidade: string | null;
  credor: string | null;
  tipo_credor: string | null;
  moeda: string | null;
  valor: FiscalDecimal | null;
  status: string | null;
  data_protocolo: string | null;
  data_analise: string | null;
}
export interface PvlOut {
  cod_ibge: string;
  itens: PvlItem[];
  total_valor: FiscalDecimal | null;
  versao_entrega: string | null;
  observacao: string | null;
  source_ref: SourceRef;
}

export const fetchDividaPvl = (ibge: string) => apiGet<PvlOut>(`/entes/${ibge}/divida/pvl`);

export interface CoberturaFonteItem {
  fonte: string;
  descricao: string | null;
  orgao: string | null;
  entes_com_dado: number;
  periodo_mais_recente: string | null;
}

export interface CoberturaIndicadorItem {
  indicador: string;
  entes_com_dado: number;
  periodo_mais_recente: string | null;
}

export interface CoberturaPagina {
  pagina: string;
  ente: {
    cod_ibge: string;
    tem_dado: boolean;
    periodo_mais_recente: string | null;
    periodo_solicitado: string | null;
  };
  /** Denominador que o gestor reconhece: a carteira dele, não o país. */
  escopo: { entes_no_escopo: number; entes_com_dado: number };
  fontes: CoberturaFonteItem[];
  indicadores: CoberturaIndicadorItem[];
  /** Indicadores com cobertura residual — a ausência é da nossa carga, não do ente. */
  lacunas: string[];
  observacao: string | null;
}

/** Para quantos entes e períodos esta página de fato responde. */
export const fetchCoberturaPagina = (pagina: string, ibge: string, periodo?: string) =>
  apiGet<CoberturaPagina>(`/cobertura/pagina/${encodeURIComponent(pagina)}`, {
    ente: ibge,
    periodo,
  });

export interface LinhaRelatorio {
  anexo: string | null;
  /** Descrição publicada pelo ente, como aparece no demonstrativo. */
  conta: string | null;
  /** Slug estável do STN — distingue a seção principal da intra-orçamentária. */
  cod_conta: string | null;
  coluna: string | null;
  valor: FiscalDecimal | null;
  linha_seq: number | null;
  /** Medida do mart que esta coluna alimentou. `null` = a entrega publica, o modelo não guarda. */
  medida: string | null;
}

export interface LinhaBruta {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  codigo: string;
  descricao: string | null;
  medidas: Record<string, FiscalDecimal | null>;
  linhas: LinhaRelatorio[];
  /** Soma das colunas por medida — a contraprova contra `medidas`. */
  conferencia: Record<string, FiscalDecimal>;
  observacao: string | null;
  source_ref: SourceRef;
}

/** Fundo do drill da receita: as linhas do RREO Anexo 01 que produziram o nó. */
export const fetchReceitaLinha = (
  ibge: string,
  periodo: string,
  origem: string,
  asOf?: string | null,
) =>
  apiGet<LinhaBruta>(`/entes/${ibge}/receita/linha/${encodeURIComponent(origem)}`, {
    periodo,
    as_of: asOf,
  });

/** Fundo do drill da despesa. O eixo importa: função vem do Anexo 02, natureza do 01. */
export const fetchDespesaLinha = (
  ibge: string,
  periodo: string,
  eixo: string,
  codigo: string,
  asOf?: string | null,
) =>
  apiGet<LinhaBruta>(
    `/entes/${ibge}/despesa/linha/${encodeURIComponent(eixo)}/${encodeURIComponent(codigo)}`,
    { periodo, as_of: asOf },
  );

export interface CdpSituacao {
  num_pvl: string | null;
  num_processo: string | null;
  data_ref: string | null;
  situacao: string | null;
  motivo: string | null;
}

export interface OperacaoDetalhe {
  cod_ibge: string;
  pleito: PvlItem;
  /** Situação no Cadastro da Dívida Pública, casada pelo pleito exato. */
  cdp: CdpSituacao[];
  cronograma: VencimentoItem[];
  total_amortizacao: FiscalDecimal | null;
  total_encargos: FiscalDecimal | null;
  restante_amortizacao: FiscalDecimal | null;
  restante_encargos: FiscalDecimal | null;
  horizonte_ate: number | null;
  /** Por que uma seção está vazia (ou qual o escopo real dela) — nunca espaço em branco. */
  observacoes: Record<string, string>;
  source_refs: SourceRef[];
}

/** Fundo do drill: a operação de crédito inteira, do pedido ao cronograma. */
export const fetchDividaOperacao = (ibge: string, idPleito: string) =>
  apiGet<OperacaoDetalhe>(`/entes/${ibge}/divida/operacao/${encodeURIComponent(idPleito)}`);

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
  as_of: string | null;
  versao_entrega: string;
  valores: ResultadoValores;
  meta: MetaResumo;
  receita_componentes: ResultadoComponente[];
  despesa_componentes: ResultadoComponente[];
  serie: SerieResultadoItem[];
  serie_ajuste: SerieAjuste | null;
  comparacao:
    | { periodo_anterior: string; resultado_primario_anterior: FiscalDecimal | null; delta_rs: FiscalDecimal | null }
    | null;
  periodo_breadcrumb: DrillNodeRef[];
  source_ref: SourceRef;
}

export interface SerieResultadoItem {
  periodo: string;
  resultado_primario: FiscalDecimal | null;
  resultado_nominal: FiscalDecimal | null;
  resultado_primario_real: FiscalDecimal | null;
  resultado_primario_per_capita: FiscalDecimal | null;
  populacao: number | null;
}

/** Meta da LDO cadastrada pela organização (§11.5): restrita às telas do ente. */
export interface MetaCadastro {
  id: string;
  exercicio: number;
  indicador: 'primario' | 'nominal';
  valor: FiscalDecimal;
  fonte_declarada: string;
  observacao: string | null;
  atualizado_em: string;
  atualizado_por: string | null;
}
export interface MetaFiscalUpsert {
  exercicio: number;
  indicador: 'primario' | 'nominal';
  valor: number;
  fonte_declarada: string;
  observacao?: string | null;
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
  as_of: string | null;
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
  as_of: string | null;
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
export interface MemoriaResultado {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  versao_entrega: string;
  valores: ResultadoValores;
  ajustes: { codigo: string; descricao: string; valor: FiscalDecimal }[];
  formula_primario: string;
  formula_nominal: string;
  formula_nominal_abaixo: string;
  identidade_primario_ok: boolean | null;
  identidade_nominal_dcl_ok: boolean | null;
  fontes: Record<string, string>;
  detalhes: Record<string, unknown>;
  source_ref: SourceRef;
}

export interface MetaResultado {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  versao_entrega: string;
  resumo: MetaResumo;
  bimestre: number;
  fracao_exercicio: FiscalDecimal;
  projecao_primario: FiscalDecimal | null;
  esforco_necessario: FiscalDecimal | null;
  /** a6 = publicada pelo ente; manual = cadastrada nesta organização; ausente. */
  origem: 'a6' | 'manual' | 'ausente';
  restrita_ao_ente: boolean;
  cadastros: MetaCadastro[];
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

export const fetchResultadoMemoria = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<MemoriaResultado>(`/entes/${ibge}/resultado/memoria`, { periodo, as_of: asOf });

// Meta da LDO cadastrada pela organização (§11.5 — nunca entra em agregado/relatório).
export const fetchMetasFiscais = (ibge: string) =>
  apiGet<MetaCadastro[]>(`/entes/${ibge}/meta-fiscal`);

export const salvarMetaFiscal = (ibge: string, body: MetaFiscalUpsert) =>
  apiPut<MetaCadastro, MetaFiscalUpsert>(`/entes/${ibge}/meta-fiscal`, body);

export const excluirMetaFiscal = (ibge: string, metaId: string) =>
  apiDelete(`/entes/${ibge}/meta-fiscal/${metaId}`);

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
  /** Soma dos déficits (negativa) — sem ela a tela anuncia o superávit como se fosse o caixa. */
  total_disp_liquida_apos_negativa: FiscalDecimal;
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
export interface SerieCaixaItem {
  periodo: string;
  disp_liquida_apos_total: FiscalDecimal | null;
  rpnp_sem_lastro_total: FiscalDecimal | null;
  rpnp_sem_lastro_real: FiscalDecimal | null;
  rpnp_sem_lastro_per_capita: FiscalDecimal | null;
  populacao: number | null;
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
  serie: SerieCaixaItem[];
  serie_ajuste: SerieAjuste | null;
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

export interface CaixaMemoria {
  cod_ibge: string;
  periodo: string;
  as_of: string | null;
  versao_entrega: string;
  fontes: FonteSuficienciaItem[];
  total_rpnp_sem_lastro: FiscalDecimal;
  formula_liquida_antes: string;
  formula_liquida_apos: string;
  formula_rpnp_sem_lastro: string;
  regra_suficiencia: string;
  detalhes: Record<string, unknown>;
  source_ref: SourceRef;
}

export const fetchCaixaMemoria = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<CaixaMemoria>(`/entes/${ibge}/caixa/memoria`, { periodo, as_of: asOf });

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
  source_ref?: SourceRef;
  as_of?: string;
}

export interface SerieMinimoDetalhe {
  periodo: string;
  exercicio: number;
  parcial: boolean;
  estagio_legal: 'liquidado' | 'empenhado';
  base_impostos_transferencias: FiscalDecimal;
  despesa_aplicada: FiscalDecimal;
  pct_aplicado: FiscalDecimal;
  minimo_pct: FiscalDecimal;
  abaixo_do_minimo: boolean;
  source_ref: SourceRef;
  as_of: string;
}

/** Série plurianual de um mínimo (Sprint 25C) — com a cobertura declarada. */
export interface SerieMinimoResposta {
  cod_ibge: string;
  periodo: string;
  indicador: 'saude' | 'educacao';
  minimo_pct: FiscalDecimal;
  anos_solicitados: number;
  exercicios_com_dado: number[];
  exercicios_sem_dado: number[];
  cobertura_completa: boolean;
  observacao: string | null;
  data: SerieMinimoDetalhe[];
  trajetoria_exercicio: SerieMinimoDetalhe[];
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

export type SaudeDetalhe = MinimoDetalheBase;

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

// Endpoints ociosos até a Sprint 25C (auditoria §2.9): série plurianual e memória.
export const fetchSaudeSerie = (
  ibge: string,
  params: { periodo: string; anos?: number; asOf?: string | null },
) =>
  apiGet<SerieMinimoResposta>(`/entes/${ibge}/saude/serie`, {
    periodo: params.periodo,
    anos: params.anos,
    as_of: params.asOf,
  });

export const fetchEducacaoSerie = (
  ibge: string,
  params: { periodo: string; anos?: number; asOf?: string | null },
) =>
  apiGet<SerieMinimoResposta>(`/entes/${ibge}/educacao/serie`, {
    periodo: params.periodo,
    anos: params.anos,
    as_of: params.asOf,
  });

export const fetchSaudeMemoria = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<MemoriaCalculo>(`/entes/${ibge}/saude/memoria`, { periodo, as_of: asOf });

export const fetchEducacaoMemoria = (ibge: string, periodo: string, asOf?: string | null) =>
  apiGet<MemoriaCalculo>(`/entes/${ibge}/educacao/memoria`, { periodo, as_of: asOf });

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
  cobertura: CoberturaPatrimonio | null;
  source_ref: SourceRef | null;
}

/** O que o ente publicou de patrimônio — substitui o seletor-demo (Sprint 25D). */
export interface CoberturaPatrimonio {
  tem_dca: boolean;
  tem_msc: boolean;
  anos_dca: number[];
  meses_msc: string[];
  fontes_ausentes: string[];
  mensagem: string;
}

export interface ComparacaoLinha {
  cod_conta: string;
  descricao: string | null;
  nivel: number | null;
  valores: Record<string, FiscalDecimal | null>;
  variacao_abs: FiscalDecimal | null;
  variacao_pct: FiscalDecimal | null;
  anos_com_valor: number[];
}

export interface BalancoComparacaoOut {
  cod_ibge: string;
  tipo: string;
  anexo: string | null;
  anos: number[];
  anos_sem_balanco: number[];
  observacao: string | null;
  linhas: ComparacaoLinha[];
  memoria: Record<string, unknown>;
  source_refs: SourceRef[];
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
  /** "Conciliação MSC ↔ DCA" com MSC; "Balanço fecha" sem MSC (só 1 dos 3 checks roda). */
  titulo: string;
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

/** Comparação anual do mesmo balanço, conta a conta (Sprint 25D). */
export const fetchBalancoComparacao = (
  ibge: string,
  params: { tipo?: string; anos?: number; asOf?: string | null } = {},
) =>
  apiGet<BalancoComparacaoOut>(`/entes/${ibge}/balancos/comparacao`, {
    tipo: params.tipo,
    anos: params.anos,
    as_of: params.asOf,
  });

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
  /** Leitura per capita — só existe em métricas em R$ (Sprint 25D). */
  valor_per_capita?: FiscalDecimal | null;
  populacao?: number | null;
  pop_ano_ref?: number | null;
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

/** Trajetória do ente na mesma coorte, período a período (Sprint 25D). */
export interface BenchmarkEvolucaoPonto {
  periodo: string;
  valor_ente: FiscalDecimal;
  posicao: number;
  quantidade: number;
  percentil: FiscalDecimal;
  mediana: FiscalDecimal;
  p10: FiscalDecimal;
  p90: FiscalDecimal;
  valor_ente_per_capita: FiscalDecimal | null;
  cobertura: BenchmarkCoverage;
  as_of: string;
  source_ref: SourceRef;
}

export interface BenchmarkEvolucaoResponse {
  cod_ibge: string;
  indicador: string;
  indicador_rotulo: string;
  unidade: string;
  sentido: BenchmarkSentido;
  coorte: BenchmarkCoorte;
  periodos_solicitados: number;
  periodos_sem_comparacao: string[];
  observacao: string | null;
  pontos: BenchmarkEvolucaoPonto[];
  memoria: Record<string, unknown>;
  source_refs: SourceRef[];
}

export const fetchBenchmarkEvolucao = (params: {
  ente: string;
  indicador?: string;
  coorte?: string;
  periodos?: number;
}) =>
  apiGet<BenchmarkEvolucaoResponse>('/benchmark/evolucao', {
    ente: params.ente,
    indicador: params.indicador,
    coorte: params.coorte,
    periodos: params.periodos,
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
export interface EspacoFiscal {
  indicador: string;
  sentido: 'teto' | 'piso';
  /** `folga` ou `excedido` — a margem é sempre positiva; quem diz o sentido é este campo. */
  situacao: 'folga' | 'excedido' | 'nao_aplicavel';
  limite_pct: FiscalDecimal;
  projetado_pct: FiscalDecimal;
  margem_pp: FiscalDecimal;
  /** A mesma margem em reais — é o que se leva à mesa, porque empenho não se assina em p.p. */
  margem_rs: FiscalDecimal | null;
  base_rs: FiscalDecimal | null;
  base_nome: string;
  /** De qual período a base saiu — observada, ao contrário de `periodo_alvo`. */
  base_periodo: string | null;
  periodo_alvo: string | null;
}
export interface Reconducao {
  aplicavel: boolean;
  excesso_pp: FiscalDecimal;
  excesso_rs: FiscalDecimal | null;
  primeiro_quadrimestre_pp: FiscalDecimal;
  primeiro_quadrimestre_rs: FiscalDecimal | null;
  segundo_quadrimestre_pp: FiscalDecimal;
  segundo_quadrimestre_rs: FiscalDecimal | null;
  fundamento: string;
}
export interface PremissaObservada {
  chave: string;
  rotulo: string;
  unidade: string;
  /** `null` quando a série não sustenta o cálculo — a tela pede o valor, não sugere um. */
  observado: FiscalDecimal | null;
  motivo: string | null;
  referencia: string | null;
  fonte: string | null;
  n_observacoes: number | null;
}
export interface PremissasResponse {
  cod_ibge: string;
  premissas: PremissaObservada[];
  nota: string;
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
  /** Quanto ainda cabe até o limite. Ausente quando o indicador não tem limite legal. */
  espaco_fiscal: EspacoFiscal | null;
  reconducao: Reconducao | null;
  memoria: Record<string, unknown>;
  source_ref: SourceRef;
}

/** Nova operação de crédito hipotética — impacto no teto de DCL, sem persistir o contrato. */
export interface NovoContratoDivida {
  principal_rs: number;
  prazo_meses: number;
  carencia_meses?: number;
  taxa_aa_pct?: number;
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
  /** Separado do choque de FPM (Sprint G1) — aplica-se à projeção de RCL/receita. */
  fundeb_variacao_pct?: number | null;
  /** Reajuste/variação de folha, distinto do choque genérico — só vale para 'pessoal'. */
  reajuste_folha_pct?: number | null;
  /** Simulador estruturado de dívida — só vale para o indicador 'divida'. */
  novo_contrato_divida?: NovoContratoDivida | null;
  salvar?: boolean;
  cenario_id?: string | null;
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
/** Impacto do contrato hipotético no teto de 120%/200% da RCL (DCL). */
export interface ImpactoContratoDivida {
  principal_rs: FiscalDecimal;
  prazo_meses: number;
  carencia_meses: number;
  taxa_aa_pct: FiscalDecimal;
  pct_rcl_adicional: FiscalDecimal | null;
  pct_rcl_resultante: FiscalDecimal | null;
  teto_pct: FiscalDecimal;
  faixa: string | null;
  cruza: boolean;
  base_rs: FiscalDecimal | null;
  base_periodo: string | null;
  fundamento: string;
}
export interface CenarioSimularResponse {
  persistido: boolean;
  cenario_id: string | null;
  versao: number | null;
  cod_ibge: string;
  indicador: string;
  horizonte: number;
  base: ProjecaoResponse;
  cenario: ProjecaoResponse;
  impacto_limites: LimiteImpacto[];
  impacto_minimos: LimiteImpacto[];
  impacto_contrato_divida: ImpactoContratoDivida | null;
  memoria: Record<string, unknown>;
  source_refs: SourceRef[];
}
export interface ProcedenciaCenario {
  as_of: string | null;
  /** Entregas que alimentaram a série: `{"2025-B6": "1"}`. */
  versoes_entrega: Record<string, string>;
  /** As premissas macro vigentes quando o cenário foi salvo. */
  premissas_observadas: Record<string, { observado: string | null; referencia: string | null; fonte: string | null }>;
  /** Falso nas versões migradas do formato anterior, que não têm procedência. */
  registrada: boolean;
}
export interface VersaoCenario {
  versao: number;
  nome: string;
  parametros: Record<string, unknown>;
  modelo: string | null;
  horizonte: number | null;
  nota: string | null;
  procedencia: ProcedenciaCenario;
  criado_em: string;
  /** E-mail de quem gravou esta versão; `null` sem registro de autoria (Sprint G1). */
  criado_por: string | null;
}
export interface CenarioDetalhe {
  id: string;
  ente: string;
  indicador: string;
  nome: string;
  versao_atual: number;
  arquivado: boolean;
  /** E-mail de quem criou o cenário (Sprint G1). */
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string | null;
  versoes: VersaoCenario[];
}
export interface DivergenciaCenario {
  /** `false` significa "não deu para comparar" — diferente de "está tudo igual". */
  comparavel: boolean;
  diverge: boolean;
  motivo: string | null;
  valor_guardado: FiscalDecimal | null;
  valor_recalculado: FiscalDecimal | null;
  delta: FiscalDecimal | null;
  entregas_novas: string[];
}
export interface CenarioAberto {
  cenario: CenarioDetalhe;
  versao: VersaoCenario;
  /** O que foi salvo — a peça que embasou a decisão. */
  guardado: { projecao?: PontoProjecao[]; cruzamento?: CruzamentoLimite } | null;
  /** O mesmo cenário rodado agora; `null` quando o recálculo não é possível. */
  recalculado: CenarioSimularResponse | null;
  divergencia: DivergenciaCenario;
}
export interface CenarioComparadoItem {
  cenario_id: string;
  nome: string;
  versao: number;
  encontrado: boolean;
  motivo_ausencia: string | null;
  indicador: string | null;
  unidade: string | null;
  modelo: string | null;
  parametros: Record<string, unknown>;
  projecao: PontoProjecao[];
  valor_final: FiscalDecimal | null;
  espaco_fiscal: EspacoFiscal | null;
  criado_em: string | null;
}
export interface ComparacaoCenarios {
  cod_ibge: string;
  indicador: string | null;
  /** Interseção dos horizontes — não a união. */
  periodos: string[];
  itens: CenarioComparadoItem[];
  aviso: string | null;
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

/** Comparação das três camadas de projeção (Sprint 25E). */
export interface ModeloComparado {
  modelo: string;
  rotulo: string;
  disponivel: boolean;
  motivo_indisponivel: string | null;
  escolhido: boolean;
  valor_final: FiscalDecimal | null;
  ic_inferior_final: FiscalDecimal | null;
  ic_superior_final: FiscalDecimal | null;
  amplitude_ic_media: FiscalDecimal | null;
  erro_padrao: FiscalDecimal | null;
  r2: FiscalDecimal | null;
  n_obs: number | null;
  cruza_limite: boolean;
  periodo_cruzamento: string | null;
  memoria: Record<string, unknown>;
}

export interface ComparacaoModelosResponse {
  cod_ibge: string;
  indicador: string;
  descricao: string;
  unidade: string;
  horizonte: number;
  periodos_projetados: string[];
  n_periodos_historicos: number;
  criterio_escolha: string;
  modelos: ModeloComparado[];
  exogenas_fontes: Record<string, unknown>;
  aviso: string;
  source_ref: SourceRef;
}

export const fetchComparacaoModelos = (
  ibge: string,
  params: { indicador: ForecastIndicador; horizonte?: number },
) =>
  apiGet<ComparacaoModelosResponse>(`/entes/${ibge}/projecao/comparacao`, {
    indicador: params.indicador,
    horizonte: params.horizonte,
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

export const fetchCenarios = (ibge: string, incluirArquivados = false) =>
  apiGet<CenarioDetalhe[]>(
    `/entes/${ibge}/cenarios${incluirArquivados ? '?incluir_arquivados=true' : ''}`,
  );

/** Reabre o cenário com o guardado e o recalculado lado a lado. */
export const fetchCenario = (id: string, opts: { versao?: number; recalcular?: boolean } = {}) => {
  const q = new URLSearchParams();
  if (opts.versao != null) q.set('versao', String(opts.versao));
  if (opts.recalcular === false) q.set('recalcular', 'false');
  const s = q.toString();
  return apiGet<CenarioAberto>(`/cenarios/${id}${s ? `?${s}` : ''}`);
};

export const renomearCenario = (id: string, nome: string) =>
  apiPatch<CenarioDetalhe>(`/cenarios/${id}`, { nome });

/** Arquiva (não apaga). `desarquivar` traz de volta à lista. */
export const arquivarCenario = (id: string, desarquivar = false) =>
  apiDeleteJson<CenarioDetalhe>(`/cenarios/${id}?desarquivar=${desarquivar}`);

/** Copia o cenário para um cabeçalho novo e independente (Sprint G1). */
export const duplicarCenario = (id: string, nome?: string) =>
  apiPost<CenarioDetalhe, { nome?: string }>(`/cenarios/${id}/duplicar`, { nome });

/** Apaga o cenário e todo o histórico de versões — irreversível, distinto de arquivar. */
export const excluirCenarioDefinitivo = (id: string) =>
  apiDelete(`/cenarios/${id}/definitivo`);

export const compararCenarios = (ibge: string, cenarioIds: string[]) =>
  apiPost<ComparacaoCenarios>(`/entes/${ibge}/cenarios/comparar`, { cenario_ids: cenarioIds });

export const exportarCenario = (id: string, versao: number | null, formato: 'csv' | 'json') =>
  apiDownload(
    `/cenarios/${id}/exportar?formato=${formato}${versao != null ? `&versao=${versao}` : ''}`,
    `cenario-v${versao ?? 'atual'}.${formato}`,
  );

/** Premissas macro **observadas** — o cenário abre ancorado no dado, não em valor de fábrica. */
export const fetchPremissasCenario = (ibge: string) =>
  apiGet<PremissasResponse>(`/entes/${ibge}/cenario/premissas`);

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

/** Alertas já tratados, com quem resolveu e em quantos dias (Sprint 25E). */
export interface HistoricoItem extends AlertaOut {
  resolvido_em: string | null;
  resolvido_por: string | null;
  dias_ate_resolver: number | null;
}

export interface HistoricoAlertasResponse {
  escopo: string;
  cod_ibge: string | null;
  gerado_em: string;
  total: number;
  resolvidos: number;
  descartados: number;
  tempo_medio_dias: number | null;
  por_categoria: Record<string, number>;
  itens: HistoricoItem[];
  observacao: string | null;
}

export const fetchAlertasHistorico = (params: {
  ente: string;
  escopo?: 'ente' | 'carteira';
  categoria?: string;
  limite?: number;
}) =>
  apiGet<HistoricoAlertasResponse>('/alertas/historico', {
    escopo: params.escopo ?? 'ente',
    ente: (params.escopo ?? 'ente') === 'ente' ? params.ente : undefined,
    categoria: params.categoria,
    limite: params.limite,
  });

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
  /** `null` = indicador sem limite legal (gerencial). Zero significaria teto igual a zero. */
  limite_pct: number | null;
  faixa: string | null;
  cor: string;
  distancia_pp: number | null;
  /** Base do valor: `populacao` é R$/hab; as demais são percentuais. */
  denominador?: string;
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
/** Verificação aberta que recai sobre os números da tela (Sprint 26). */
export interface ChecagemAberta {
  check_codigo: string;
  rotulo: string;
  status: 'ok' | 'aviso' | 'falha';
  fonte: string;
  periodo: string | null;
  diferenca: FiscalDecimal | null;
  tolerancia: FiscalDecimal | null;
  motivo: string | null;
}

export interface CockpitQualidade {
  fontes: QualidadeFonte[];
  defasagem_maxima: number | null;
  confiavel: boolean;
  observacao: string | null;
  checks_abertos: ChecagemAberta[];
  n_checks_falha: number;
  n_checks_aviso: number;
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
  | 'editar'
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
  /**
   * Operador da plataforma (Sprint 19). Serve para não oferecer uma rota que
   * devolveria 403 — a garantia continua no backend, não nesta flag.
   */
  is_superuser?: boolean;
  /**
   * Ente com que a sessão deve abrir, derivado do tipo da conta pelo backend: uma Sefaz
   * abre no próprio Governo do Estado; uma prefeitura, no seu município. O contexto já
   * salvo do usuário continua tendo precedência sobre esta sugestão.
   */
  ente_padrao?: { cod_ibge: string; nome: string } | null;
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
  { cap: 'editar', label: 'Editar (renomear/arquivar cenários)' },
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
  /** Como se chega ao dado (api_rest, api_odata, catalogo_ckan, arquivo, raspagem_pdf). */
  tipo_acesso: string | null;
}
/** Catálogo + observabilidade por fonte. Alimenta o chip/rodapé de status do shell. */
export const fetchFontes = () => apiGet<FonteCatalogo[]>('/admin/ingestion/fontes');

export interface ProcedenciaParametro {
  nome: string;
  exemplo: string;
  significado: string;
}

export interface ProcedenciaEndpoint {
  metodo: string;
  url: string;
  formato: string;
  o_que_traz: string;
  parametros: ProcedenciaParametro[];
  /** URL real e clicável que devolve o mesmo dado ingerido. */
  exemplo: string | null;
  observacao: string | null;
}

export interface Procedencia {
  fonte: string;
  descricao: string | null;
  orgao: string | null;
  familia: string;
  cadencia: string;
  acesso: string;
  acesso_rotulo: string;
  portal: string;
  documentacao: string | null;
  licenca: string;
  autenticacao: string;
  como_funciona: string;
  endpoints: ProcedenciaEndpoint[];
  paginas_impactadas: string[];
  dependencias: string[];
  requer_configuracao: string | null;
}

/**
 * Origem completa de uma fonte: endereços, parâmetros explicados e exemplos reais.
 *
 * É a contraparte, no plano da ingestão, do `source_ref` que acompanha cada número: o
 * `source_ref` diz de qual entrega o valor saiu; isto diz de qual endereço a entrega saiu.
 */
export const fetchProcedencia = (fonte: string) =>
  apiGet<Procedencia>(`/admin/ingestion/fontes/${encodeURIComponent(fonte)}/procedencia`);

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

/** UI de agendamentos (Sprint 25E): listar, editar/desativar e excluir. */
export interface AgendamentoPatchInput {
  ativo?: boolean;
  periodicidade?: string;
  periodo?: string;
  formato?: RelatorioFormato;
  proxima_execucao?: string;
}

export const fetchAgendamentos = () =>
  apiGet<RelatorioAgendamento[]>('/relatorios/agendamentos');

export const editarAgendamento = (id: string, body: AgendamentoPatchInput) =>
  apiPatch<RelatorioAgendamento, AgendamentoPatchInput>(`/relatorios/agendamentos/${id}`, body);

export const excluirAgendamento = (id: string) =>
  apiDelete(`/relatorios/agendamentos/${id}`);

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
  /** Rota da tela de onde veio a pergunta — "pergunte sobre esta tela" (Sprint 25E). */
  pagina?: string | null;
}) => apiPost<AssistResposta, typeof body>('/assistant/perguntar', body);

/** Histórico de conversas da organização (endpoint ocioso até a Sprint 25E). */
export interface ConversaResumo {
  id: string;
  tipo: string;
  cod_ibge: string | null;
  periodo: string | null;
  pergunta: string;
  resposta: string;
  recusa: boolean;
  modelo: string | null;
  criado_em: string;
}

export interface ConversasOut {
  itens: ConversaResumo[];
}

export const fetchConversas = (limit = 20) =>
  apiGet<ConversasOut>('/assistant/conversas', { limit });

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
  /** Autor da ação (join com op.usuario — Sprint H1). `null` quando não há autor humano. */
  usuario_nome?: string | null;
  usuario_email?: string | null;
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
  /**
   * Recusados por falta de licença ativa (Sprint 19). Lista separada de `ignorados`
   * — ali a causa é duplicidade/inexistência; aqui é comercial, e quem resolve é o
   * operador da plataforma, não o administrador do tenant.
   */
  nao_licenciados?: string[];
  total_carteira: number;
}

export const fetchBilling = () => apiGet<BillingOverview>('/billing');
export const emitirFatura = (body: FaturaEmitInput) =>
  apiPost<FaturaOut, FaturaEmitInput>('/billing/faturas', body);

export const fetchIntegracoes = () => apiGet<IntegracaoOut[]>('/admin/integracoes');

export const fetchAuditoria = (params?: {
  acao?: string;
  q?: string;
  usuario_id?: string;
  de?: string;
  ate?: string;
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
  /** Ver o consolidado da UF não implica poder abrir o cockpit do Governo do Estado. */
  acessivel: boolean;
  motivo_indisponivel: string | null;
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
  /** Nome do município — sem ele o mapa obriga a decorar código IBGE. */
  nome?: string | null;
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
/** Estado do consumidor da fila: sem isso, "Na fila" não distingue espera de abandono. */
export interface SaudeFila {
  consumidores: number;
  consumidores_vivos: number;
  aguardando: number;
  executando: number;
  fila_redis: number | null;
  redis_disponivel: boolean;
  detalhe: string | null;
}
export const fetchSaudeFila = () => apiGet<SaudeFila>('/admin/ingestion/jobs/saude');
export const cancelarIngestJob = (id: string) =>
  apiPost<IngestJob, Record<string, never>>(`/admin/ingestion/jobs/${id}/cancelar`, {});
export const retryIngestJob = (id: string) =>
  apiPost<IngestJob, Record<string, never>>(`/admin/ingestion/jobs/${id}/retry`, {});
export const fetchRetificacoes = (desde?: string) =>
  apiGet<RetificacaoItem[]>('/admin/ingestion/retificacoes', { desde });

/** Atualiza as capacidades de um papel (aba Permissões — fim do mock). */
export const atualizarPapelCapacidades = (papelId: string, capacidades: Capacidade[]) =>
  apiPatch<PapelOut, { capacidades: Capacidade[] }>(`/papeis/${papelId}`, { capacidades });


// --- Qualidade do dado & lineage (Sprint 26) ---
export type StatusCheck = 'ok' | 'aviso' | 'falha';

export interface CheckQualidade {
  id: string;
  job_id: string | null;
  fonte: string;
  cod_ibge: string | null;
  periodo: string | null;
  check_codigo: string;
  rotulo: string;
  status: StatusCheck;
  esquerda: FiscalDecimal | null;
  direita: FiscalDecimal | null;
  diferenca: FiscalDecimal | null;
  tolerancia: FiscalDecimal | null;
  detalhe: Record<string, unknown>;
  executado_em: string;
  /**
   * Entrega sobre a qual o veredito foi dado (Sprint E1/A26). `null` no check de
   * atualidade, que mede justamente a **ausência** da entrega. Opcional porque respostas
   * anteriores à E1 não trazem o campo.
   */
  versao_entrega?: string | null;
  /** Procedência do número comparado (§6.3); `null` quando não há entrega conferida. */
  source_ref?: SourceRef | null;
}

export interface ResumoQualidade {
  total: number;
  ok: number;
  aviso: number;
  falha: number;
  fontes_com_falha: string[];
  checks_com_falha: string[];
}

export interface QualidadeResponse {
  gerado_em: string;
  resumo: ResumoQualidade;
  itens: CheckQualidade[];
  total: number;
  pagina: number;
  por_pagina: number;
  observacao: string | null;
}

export const fetchQualidade = (params: {
  fonte?: string;
  status?: StatusCheck;
  ente?: string;
  pagina?: number;
  porPagina?: number;
} = {}) =>
  apiGet<QualidadeResponse>('/admin/qualidade', {
    fonte: params.fonte,
    status: params.status,
    ente: params.ente,
    pagina: params.pagina,
    por_pagina: params.porPagina,
  });

export type CamadaLineage = 'fonte' | 'bronze' | 'silver' | 'gold' | 'endpoint' | 'pagina';

export interface LineageNo {
  id: string;
  camada: CamadaLineage;
}

export interface LineageAresta {
  origem: string;
  destino: string;
  tipo: string;
  detalhe: Record<string, unknown>;
}

export interface LineageResponse {
  no: string | null;
  camada: string | null;
  montante: LineageAresta[];
  jusante: LineageAresta[];
  paginas_afetadas: string[];
  fontes_de_origem: string[];
  nos: LineageNo[];
  arestas: LineageAresta[];
  total_arestas: number;
}

export const fetchLineage = (no?: string) =>
  apiGet<LineageResponse>('/admin/lineage', { no });

// --- Control plane da plataforma (Sprint 19) --------------------------------
// Exclusivo do operador (`is_superuser`). Um usuário de tenant recebe 403 aqui —
// a UI usa isso para nem oferecer a rota, e o backend para garanti-la.

export type TipoLicenca = 'ente' | 'uf' | 'global';
export type StatusLicenca = 'ativa' | 'suspensa' | 'expirada';

export interface Licenca {
  id: string;
  org_id: string;
  tipo: TipoLicenca;
  cod_ibge: string | null;
  uf: string | null;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  status: StatusLicenca;
  /** Status efetivo hoje: `ativa` com prazo vencido já não vale. */
  vigente: boolean;
  observacao: string | null;
  criada_em: string;
}

export interface OrgUso {
  org_id: string;
  nome: string;
  tipo_conta: string;
  logo_url: string | null;
  criada_em: string;
  licencas_ativas: number;
  /** Nulo sob licença global — o alcance não é enumerável. */
  entes_licenciados: number | null;
  entes_na_carteira: number;
  usuarios: number;
  relatorios_gerados: number;
  consultas_ia: number;
  entes_com_dado: number;
}

export interface LicencaCreate {
  tipo: TipoLicenca;
  cod_ibge?: string | null;
  uf?: string | null;
  vigencia_inicio?: string | null;
  vigencia_fim?: string | null;
  observacao?: string | null;
}

export interface ProvisionamentoOut {
  org_id: string;
  nome: string;
  admin_usuario_id: string;
  admin_email: string;
  papel_admin_id: string;
  licencas: Licenca[];
  /** `null` quando o formulário não informou métrica/preço — a org nasce sem billing. */
  assinatura: AssinaturaOut | null;
}

export const fetchPlatformOrgs = () => apiGet<OrgUso[]>('/platform/orgs');

export const fetchPlatformUso = (orgId?: string) =>
  apiGet<OrgUso[]>('/platform/uso', { org_id: orgId });

export const fetchLicencas = (orgId: string) =>
  apiGet<Licenca[]>(`/platform/orgs/${orgId}/licencas`);

export const concederLicenca = (orgId: string, body: LicencaCreate) =>
  apiPost<Licenca, LicencaCreate>(`/platform/orgs/${orgId}/licencas`, body);

export const alterarLicenca = (
  licencaId: string,
  body: { status?: StatusLicenca; vigencia_fim?: string | null; observacao?: string | null },
) => apiPatch<Licenca, typeof body>(`/platform/licencas/${licencaId}`, body);

export const provisionarOrg = (body: {
  nome: string;
  tipo_conta: string;
  metrica_cobranca?: MetricaCobranca | null;
  preco_unitario?: FiscalDecimal | null;
  admin_email: string;
  admin_nome: string;
  admin_senha: string;
  licencas?: LicencaCreate[];
}) => apiPost<ProvisionamentoOut, typeof body>('/platform/orgs', body);

// --- Assinatura via control plane (Sprint H1) --------------------------------
// POST/PATCH /platform/orgs/{id}/assinatura — só o operador da plataforma fixa
// métrica/preço; emitir_fatura calcula valor_total > 0 só depois disso existir.
export const definirAssinatura = (
  orgId: string,
  body: {
    plano?: string;
    metrica_cobranca: MetricaCobranca;
    preco_unitario?: FiscalDecimal;
    moeda?: string;
    ciclo?: 'mensal' | 'anual';
    status?: 'ativa' | 'suspensa' | 'cancelada';
    inicio_vigencia?: string | null;
    fim_vigencia?: string | null;
  },
) => apiPost<AssinaturaOut, typeof body>(`/platform/orgs/${orgId}/assinatura`, body);

export const alterarAssinatura = (
  orgId: string,
  body: Partial<{
    plano: string;
    metrica_cobranca: MetricaCobranca;
    preco_unitario: FiscalDecimal;
    moeda: string;
    ciclo: 'mensal' | 'anual';
    status: 'ativa' | 'suspensa' | 'cancelada';
    inicio_vigencia: string | null;
    fim_vigencia: string | null;
  }>,
) => apiPatch<AssinaturaOut, typeof body>(`/platform/orgs/${orgId}/assinatura`, body);

// --- Auditoria própria do control plane (Sprint H1) --------------------------
// O superusuário nunca tem org_id de sessão e por isso nunca poderia usar
// GET /admin/auditoria (que filtra pelo org_id do principal).
export interface AuditoriaPlataformaItem {
  id: string;
  org_id: string | null;
  org_nome: string | null;
  usuario_id: string | null;
  usuario_nome: string | null;
  usuario_email: string | null;
  acao: string;
  recurso: string;
  ts: string;
}
export interface AuditoriaPlataformaPage {
  itens: AuditoriaPlataformaItem[];
  total: number;
  limit: number;
  offset: number;
}
export const fetchAuditoriaPlataforma = (params?: {
  org_id?: string;
  acao?: string;
  q?: string;
  usuario_id?: string;
  de?: string;
  ate?: string;
  limit?: number;
  offset?: number;
}) => apiGet<AuditoriaPlataformaPage>('/platform/auditoria', params);

// --- Licença, do ponto de vista do tenant (Sprint H1) ------------------------
// Hoje só se descobre por um 403 ao tentar adicionar um ente fora da licença à
// carteira. GET /me/licencas devolve o mesmo `vigente` que o control plane vê —
// sem org_id/criada_em: essa projeção é só o que a própria organização precisa saber.
export interface MinhaLicenca {
  id: string;
  tipo: TipoLicenca;
  cod_ibge: string | null;
  uf: string | null;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  status: StatusLicenca;
  vigente: boolean;
  observacao: string | null;
}
export const fetchMinhasLicencas = () => apiGet<MinhaLicenca[]>('/me/licencas');

// --- Perfil e organização ativa ---------------------------------------------
// Trocar de organização **reautentica**: muda tudo o que a sessão enxerga, então o
// crivo é o mesmo de uma operação sensível. Não cria vínculo — entrar numa organização
// de que não se participa é concessão do operador da plataforma.

export const trocarOrganizacao = (org_id: string, senha: string) =>
  apiPost<{ access_token: string; token_type: string }, { org_id: string; senha: string }>(
    '/me/organizacao',
    { org_id, senha },
  );

export const atualizarPerfil = (nome: string) =>
  apiPatch<MeResponse, { nome: string }>('/me', { nome });

export const alterarSenha = (senha_atual: string, senha_nova: string) =>
  apiPost<void, { senha_atual: string; senha_nova: string }>('/me/senha', {
    senha_atual,
    senha_nova,
  });
