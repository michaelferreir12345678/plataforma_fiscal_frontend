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
import { ApiError, getToken, setToken as persistToken } from '../services/api';
import { fetchMe, fetchPeriodos } from '../services/backend';

const CHAVE_CONTEXTO = 'prumo_contexto';
const MAX_RECENTES = 5;

export interface EnteSel {
  cod_ibge: string;
  nome: string;
}

/** Recorte exato que o atalho "Pergunte sobre esta tela" deve transportar. */
export interface ContextoTelaAssistente {
  pagina: string;
  ente: string;
  /** Período aceito pelo Assistente (RREO); em telas RGF já vem convertido. */
  periodo: string | null;
  /** Competência que a tela efetivamente mostra (RREO, RGF ou exercício anual). */
  competencia: string | null;
  asOf: string | null;
}

interface ContextoPersistido {
  ente: EnteSel;
  periodo: string | null;
  periodoRgf: string | null;
  recentes: EnteSel[];
  /**
   * A qual organização este contexto pertence. Sem isso, quem troca de organização
   * continua vendo o ente da anterior — que costuma estar fora do novo escopo e devolve
   * 403 na primeira tela.
   */
  orgId?: string | null;
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
  /**
   * Por que o ente ficou sem período, quando não foi por ausência de dado.
   *
   * O `catch` desta busca engolia a razão e toda tela concluía "sem período com dado" —
   * inclusive quando a resposta tinha sido **403 fora do escopo**. Um problema de
   * permissão contado como ausência de dado manda o usuário procurar no lugar errado.
   */
  contextoIndisponivel: string | null;
  contextoTelaAssistente: ContextoTelaAssistente | null;
  registrarContextoTelaAssistente: (contexto: ContextoTelaAssistente | null) => void;
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

/** Traduz a falha da busca de períodos para uma frase que aponta a causa certa. */
function motivoDoContexto(erro: unknown, nome: string): string {
  if (erro instanceof ApiError) {
    if (erro.status === 403) {
      return (
        erro.detail ||
        `${nome} não está na carteira/escopo do seu usuário — por isso nenhum período aparece.`
      );
    }
    return `Não foi possível carregar os períodos de ${nome}: ${erro.detail || erro.title}`;
  }
  return `Não foi possível carregar os períodos de ${nome}.`;
}

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
  const [contextoIndisponivel, setContextoIndisponivel] = useState<string | null>(null);
  const [contextoTelaAssistente, setContextoTelaAssistente] =
    useState<ContextoTelaAssistente | null>(null);
  const [orgId, setOrgId] = useState<string | null>(persistido?.orgId ?? null);

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
    setContextoTelaAssistente(null);
    setRecentes((atuais) =>
      [e, ...atuais.filter((r) => r.cod_ibge !== e.cod_ibge)].slice(0, MAX_RECENTES),
    );
  }, []);
  const registrarContextoTelaAssistente = useCallback(
    (contexto: ContextoTelaAssistente | null) => setContextoTelaAssistente(contexto),
    [],
  );

  const nomeDoEnte = ente.nome || ente.cod_ibge;

  /**
   * Adota o ente padrão da organização — o backend é quem sabe qual é, porque depende do
   * tipo da conta (uma Sefaz abre no Governo do Estado; uma prefeitura, no seu município).
   *
   * Só adota quando **não há escolha do usuário a respeitar**: primeiro acesso, ou
   * contexto salvo que pertence a outra organização. Aplicar sempre desfaria a seleção
   * feita no seletor de ente a cada recarga da página.
   */
  useEffect(() => {
    if (!token) return;
    let vivo = true;
    fetchMe()
      .then((me) => {
        if (!vivo) return;
        const orgAtual = me.org_ativa?.org_id ?? null;
        setOrgId(orgAtual);
        const outraOrg = (persistido?.orgId ?? null) !== orgAtual;
        if (me.ente_padrao && (!persistido || outraOrg)) {
          setEnteState({ cod_ibge: me.ente_padrao.cod_ibge, nome: me.ente_padrao.nome });
          setPeriodoState('');
          setPeriodoRgfState('');
        }
      })
      .catch(() => {
        /* sem /me o app segue com o contexto salvo; nenhuma tela depende disto */
      });
    return () => {
      vivo = false;
    };
  }, [token, persistido]);

  // Descobre os períodos COM DADO do ente e escolhe o default (o mais recente).
  useEffect(() => {
    if (!token) return;
    let vivo = true;
    setCarregandoContexto(true);
    setContextoIndisponivel(null);
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
      .catch((erro: unknown) => {
        if (!vivo) return;
        setPeriodosRreo([]);
        setPeriodosRgf([]);
        // Guardar o motivo é o ponto: sem ele, um 403 de escopo vira "sem período com
        // dado" e o usuário vai procurar dado faltante onde falta é permissão.
        setContextoIndisponivel(motivoDoContexto(erro, nomeDoEnte));
      })
      .finally(() => vivo && setCarregandoContexto(false));
    return () => {
      vivo = false;
    };
  }, [ente.cod_ibge, nomeDoEnte, token]);

  // Persiste o contexto para o próximo acesso.
  useEffect(() => {
    try {
      localStorage.setItem(
        CHAVE_CONTEXTO,
        JSON.stringify({ ente, periodo, periodoRgf, recentes, orgId } satisfies ContextoPersistido),
      );
    } catch {
      /* localStorage indisponível: o contexto apenas não persiste */
    }
  }, [ente, periodo, periodoRgf, recentes, orgId]);

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
    contextoIndisponivel,
    contextoTelaAssistente,
    registrarContextoTelaAssistente,
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
  /**
   * O erro em si, quando veio do backend. A mensagem sozinha só permite **contar** o
   * problema; o objeto permite **agir** sobre ele — é daqui que sai o botão "ir para o
   * último período com dado", usando o campo de extensão em vez de interpretar texto.
   */
  apiError: ApiError | null;
  /**
   * Preenchido quando a chamada **não se aplica** — e não vai se aplicar. É estado
   * distinto de `loading`: o bloco que espera para sempre promete um dado que nunca
   * vem, o que mente mais do que dizer "não há".
   */
  indisponivel: ReactNode | null;
  reload: () => void;
}

/**
 * Executa ``fetcher`` quando ``deps`` mudam, padronizando loading/erro.
 *
 * ``opcoes.pular`` segura a chamada enquanto o contexto ainda não tem período (o
 * AppContext descobre o período do ente de forma assíncrona): sem isso a página dispara
 * uma requisição sabidamente inválida antes da primeira útil.
 *
 * Quando a espera **deixa de ser temporária** — o contexto terminou e o período
 * simplesmente não existe para este ente —, passe ``opcoes.indisponivel``. O recurso
 * então para de carregar e a página diz o que não há, em vez de girar para sempre.
 */
export function useResource<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  opcoes?: { pular?: boolean; indisponivel?: ReactNode },
): Resource<T> {
  const pular = opcoes?.pular ?? false;
  const indisponivel = pular ? (opcoes?.indisponivel ?? null) : null;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (pular) {
      setLoading(true);
      setError(null);
      setApiError(null);
      setData(null);
      return;
    }
    let vivo = true;
    setLoading(true);
    setError(null);
    setApiError(null);
    setData(null);
    fetcher()
      .then((d) => vivo && setData(d))
      .catch((e) => {
        if (!vivo) return;
        setError(e?.detail || e?.message || 'Erro ao carregar');
        setApiError(e instanceof ApiError ? e : null);
      })
      .finally(() => vivo && setLoading(false));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, pular]);

  return {
    data,
    loading: indisponivel !== null ? false : loading,
    error,
    apiError,
    indisponivel,
    reload: () => setTick((t) => t + 1),
  };
}
