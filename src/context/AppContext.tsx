/**
 * Estado global do app: sessão (JWT), ente e período selecionados, e um hook de fetch
 * (`useResource`) que padroniza loading/erro para as telas ligadas ao backend.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getToken, setToken as persistToken } from '../services/api';

const env = import.meta.env;

export interface EnteSel {
  cod_ibge: string;
  nome: string;
}

interface AppState {
  token: string | null;
  setToken: (t: string | null) => void;
  logout: () => void;
  ente: EnteSel;
  setEnte: (e: EnteSel) => void;
  periodo: string; // RREO bimestral (receita/despesa/dashboard/limites)
  periodoRgf: string; // RGF quadrimestral (pessoal)
  setPeriodo: (p: string) => void;
}

const AppCtx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getToken());
  const [ente, setEnte] = useState<EnteSel>({
    cod_ibge: (env.VITE_DEFAULT_ENTE_IBGE as string) || '2304400',
    nome: (env.VITE_DEFAULT_ENTE_NOME as string) || 'Município de Fortaleza · CE',
  });
  const [periodo, setPeriodo] = useState<string>((env.VITE_DEFAULT_PERIODO as string) || '2024-B6');
  const periodoRgf = (env.VITE_DEFAULT_PERIODO_RGF as string) || '2024-Q3';

  const setToken = useCallback((t: string | null) => {
    persistToken(t);
    setTokenState(t);
  }, []);
  const logout = useCallback(() => setToken(null), [setToken]);

  return (
    <AppCtx.Provider
      value={{ token, setToken, logout, ente, setEnte, periodo, periodoRgf, setPeriodo }}
    >
      {children}
    </AppCtx.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp precisa do <AppProvider>');
  return ctx;
}

export interface Resource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Executa ``fetcher`` quando ``deps`` mudam, padronizando loading/erro. */
export function useResource<T>(fetcher: () => Promise<T>, deps: unknown[]): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let vivo = true;
    setLoading(true);
    setError(null);
    setData(null);
    fetcher()
      .then((d) => vivo && setData(d))
      .catch((e) => vivo && setError(e?.detail || e?.message || 'Erro ao carregar'))
      .finally(() => vivo && setLoading(false));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, loading, error, reload: () => setTick((t) => t + 1) };
}
