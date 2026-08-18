import { useEffect } from 'react';
import { useApp, type ContextoTelaAssistente } from '../context/AppContext';

/** Registra e remove o recorte fiscal da rota sem deixar contexto órfão ao navegar. */
export function useContextoTelaAssistente(contexto: ContextoTelaAssistente): void {
  const { registrarContextoTelaAssistente } = useApp();
  const { pagina, ente, periodo, competencia, asOf } = contexto;
  useEffect(() => {
    registrarContextoTelaAssistente({ pagina, ente, periodo, competencia, asOf });
    return () => registrarContextoTelaAssistente(null);
  }, [asOf, competencia, ente, pagina, periodo, registrarContextoTelaAssistente]);
}

/** Serializa o recorte sem depender do contexto global da rota de destino. */
export function destinoAssistenteDaTela({
  pagina,
  periodo,
  competencia,
  asOf,
}: {
  pagina: string;
  periodo: string | null;
  competencia: string | null;
  asOf: string | null;
}): string {
  const params = new URLSearchParams({ de: pagina });
  if (periodo) params.set('periodo', periodo);
  if (competencia) params.set('competencia', competencia);
  if (asOf) params.set('as_of', asOf);
  return `/assistente?${params.toString()}`;
}
