import type { ForecastIndicador } from '../services/backend';

/**
 * Indicadores cuja grandeza no mart é idêntica à série da previsão.
 *
 * A ausência de `rcl` e `receita` é deliberada: ambas as previsões são valores
 * absolutos, enquanto `rcl_per_capita` é outra grandeza e não pode explicá-las.
 */
export const INDICADOR_APURADO_PREVISAO: Partial<Record<ForecastIndicador, string>> = {
  pessoal: 'pessoal_executivo',
  divida: 'divida_consolidada_liquida',
};
