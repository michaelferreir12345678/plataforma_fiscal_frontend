/**
 * Estado global do app: sessão (JWT), **contexto fiscal** (ente + período) e um hook de
 * fetch (`useResource`) que padroniza loading/erro.
 *
 * Contexto único (Sprint 22): trocar o ente ou o período no topo afeta todas as páginas.
 * O período **não** vem de variável de ambiente — é derivado do ente (o mais recente com
 * dado, via `/entes/{ibge}/periodos`) e persistido em `localStorage`, de modo que o app
 * nunca fica preso num período que o ente não possui.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getToken, setToken as persistToken } from '../services/api';
import { fetchPeriodos } from '../services/backend';

const CHAVE_CONTEXTO = 'erario_contexto';
const MAX_RECENTES = 5;

export interface EnteSel {
  cod_ibge: string;
  nome: string;
}

interface ContextoPersistido {
  ente: EnteSel;
  periodo: string | null;
  periodoRgf: string | null;
  recentes: EnteSel[];
}

interface AppState {
  token: string | null;
  setToken: (t: string | null) => void;
  logout: () => void;
  ente: EnteSel;
  setEnte: (e: EnteSel) => void;
  /** Períodos disponíveis do ente por relatório (alimenta o seletor). */
  periodosRreo: string[];
  periodosRgf: string[];
  periodo: string; // RREO (dashboard/receita/despesa/limites/resultado)
  periodoRgf: string; // RGF (pessoal/dívida/caixa)
  setPeriodo: (p: string) => void;
  setPeriodoRgf: (p: string) => void;
  /** Entes recentes (atalho do seletor e do ⌘K). */
  recentes: EnteSel[];
  carregandoContexto: boolean;
}

const AppCtx = createContext<AppState | null>(null);

function lerPersistido(): ContextoPersistido | null {
  try {
    const bruto = localStorage.getItem(CHAVE_CONTEXTO);
    return bruto ? (JSON.parse(bruto) as ContextoPersistido) : null;
  } catch {
    return null;
  }
}

const env = import.meta.env;
const ENTE_INICIAL: EnteSel = {
  cod_ibge: (env.VITE_DEFAULT_ENTE_IBGE as string) || '2304400',
  nome: (env.VITE_DEFAULT_ENTE_NOME as string) || 'Fortaleza',
};

export function AppProvider({ children }: { children: ReactNode }) {
  const persistido = useMemo(lerPersistido, []);
  const [token, setTokenState] = useState<string | null>(getToken());
  const [ente, setEnteState] = useState<EnteSel>(persistido?.ente ?? ENTE_INICIAL);
  const [recentes, setRecentes] = useState<EnteSel[]>(persistido?.recentes ?? []);
  const [periodo, setPeriodoState] = useState<string>(persistido?.periodo ?? '');
  const [periodoRgf, setPeriodoRgfState] = useState<string>(persistido?.periodoRgf ?? '');
  const [periodosRreo, setPeriodosRreo] = useState<string[]>([]);
  const [periodosRgf, setPeriodosRgf] = useState<string[]>([]);
  const [carregandoContexto, setCarregandoContexto] = useState(true);

  const setToken = useCallback((t: string | null) => {
    persistToken(t);
    setTokenState(t);
  }, []);
  const logout = useCallback(() => setToken(null), [setToken]);

  const setEnte = useCallback((e: EnteSel) => {
    setEnteState(e);
    // Trocar de ente invalida o período: o novo ente pode não ter o período atual.
    setPeriodoState('');
    setPeriodoRgfState('');
    setRecentes((atuais) =>
      [e, ...atuais.filter((r) => r.cod_ibge !== e.cod_ibge)].slice(0, MAX_RECENTES),
    );
  }, []);

  // Descobre os períodos COM DADO do ente e escolhe o default (o mais recente).
  useEffect(() => {
    if (!token) return;
    let vivo = true;
    setCarregandoContexto(true);
    Promise.all([fetchPeriodos(ente.cod_ibge, 'RREO'), fetchPeriodos(ente.cod_ibge, 'RGF')])
      .then(([rreo, rgf]) => {
        if (!vivo) return;
        const listaRreo = rreo.periodos.map((p) => p.periodo);
        const listaRgf = rgf.periodos.map((p) => p.periodo);
        setPeriodosRreo(listaRreo);
        setPeriodosRgf(listaRgf);
        setPeriodoState((atual) =>
          atual && listaRreo.includes(atual) ? atual : (rreo.default ?? ''),
        );
        setPeriodoRgfState((atual) =>
          atual && listaRgf.includes(atual) ? atual : (rgf.default ?? ''),
        );
      })
      .catch(() => {
        if (!vivo) return;
        setPeriodosRreo([]);
        setPeriodosRgf([]);
      })
      .finally(() => vivo && setCarregandoContexto(false));
    return () => {
      vivo = false;
    };
  }, [ente.cod_ibge, token]);

  // Persiste o contexto para o próximo acesso.
  useEffect(() => {
    try {
      localStorage.setItem(
        CHAVE_CONTEXTO,
        JSON.stringify({ ente, periodo, periodoRgf, recentes } satisfies ContextoPersistido),
      );
    } catch {
      /* localStorage indisponível: o contexto apenas não persiste */
    }
  }, [ente, periodo, periodoRgf, recentes]);

  const value: AppState = {
    token,
    setToken,
    logout,
    ente,
    setEnte,
    periodosRreo,
    periodosRgf,
    periodo,
    periodoRgf,
    setPeriodo: setPeriodoState,
    setPeriodoRgf: setPeriodoRgfState,
    recentes,
    carregandoContexto,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
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
