/**
 * Seletores de contexto fiscal do shell (Sprint 22): ente e período.
 *
 * Ambos são **funcionais** e escrevem no contexto único — trocar aqui muda todas as
 * páginas. O seletor de ente busca dentro do escopo (`/entes`) e destaca os recentes; o
 * de período só oferece períodos **com dado** do ente, por relatório (RREO/RGF conforme a
 * rota), eliminando o antigo período fixo por variável de ambiente.
 */
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { colors } from '../theme';
import { Icon } from '../components/Icon';
import { useApp, type EnteSel } from '../context/AppContext';
import { fetchEntes, type EnteBusca } from '../services/backend';

const painel: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: 0,
  zIndex: 50,
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
  width: 'min(340px, calc(100vw - 24px))',
  maxHeight: 380,
  overflowY: 'auto',
  padding: 6,
};

const botao: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '6px 10px',
  border: `1px solid ${colors.border}`,
  borderRadius: 4,
  background: colors.bg,
  minHeight: 36,
};

function useFechaFora(
  aberto: boolean,
  fechar: () => void,
  triggerRef?: RefObject<HTMLButtonElement>,
) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) fechar();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      fechar();
      triggerRef?.current?.focus();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [aberto, fechar, triggerRef]);
  return ref;
}

function navegarOpcoes(event: ReactKeyboardEvent<HTMLElement>) {
  const panel = event.currentTarget.closest('.context-selector__panel') as HTMLElement | null;
  const options = Array.from(
    (panel ?? event.currentTarget).querySelectorAll<HTMLElement>('[role="option"]:not([disabled])'),
  );
  if (options.length === 0) return;
  const current = document.activeElement instanceof HTMLElement
    ? options.indexOf(document.activeElement)
    : -1;
  const fromOption = current >= 0;
  let next: number | null = null;
  if (event.key === 'ArrowDown') next = current < options.length - 1 ? current + 1 : 0;
  else if (event.key === 'ArrowUp') next = current > 0 ? current - 1 : options.length - 1;
  else if (fromOption && event.key === 'Home') next = 0;
  else if (fromOption && event.key === 'End') next = options.length - 1;
  if (next != null) {
    event.preventDefault();
    options[next].focus();
  }
}

function abrirComSeta(
  event: ReactKeyboardEvent<HTMLButtonElement>,
  abrir: () => void,
) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  event.preventDefault();
  abrir();
}

export function SeletorEnte({
  aberto,
  setAberto,
}: {
  aberto: boolean;
  setAberto: (v: boolean) => void;
}) {
  const { ente, setEnte, recentes } = useApp();
  const [termo, setTermo] = useState('');
  const [itens, setItens] = useState<EnteBusca[]>([]);
  // Sprint 26: a lista é truncada; sem dizer o total, o usuário conclui que o escopo
  // dele é do tamanho da lista — foi exatamente o que aconteceu com a conta da Sefaz.
  const [total, setTotal] = useState(0);
  const [escopoTotal, setEscopoTotal] = useState(0);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const popupId = `ente-popup-${useId().replace(/:/g, '')}`;
  const listboxId = `${popupId}-listbox`;
  const ref = useFechaFora(aberto, () => setAberto(false), triggerRef);

  useEffect(() => {
    if (!aberto) return;
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    setBuscando(true);
    setErro(null);
    const t = setTimeout(() => {
      fetchEntes({ q: termo || undefined, limit: 30 })
        .then((r) => {
          if (!vivo) return;
          setItens(r.data);
          setTotal(r.total);
          setEscopoTotal(r.escopo_total);
        })
        .catch((e) => vivo && setErro(e?.detail || e?.message || 'Falha na busca'))
        .finally(() => vivo && setBuscando(false));
    }, 220); // debounce: evita uma requisição por tecla
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [termo, aberto]);

  const estaduais = itens.filter((e) => e.esfera === 'estadual');
  const municipais = itens.filter((e) => e.esfera !== 'estadual');

  const escolher = (e: EnteSel) => {
    setEnte(e);
    setAberto(false);
    setTermo('');
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <div ref={ref} className="context-selector">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setAberto(!aberto)}
        onKeyDown={(event) => abrirComSeta(event, () => setAberto(true))}
        aria-label="Selecionar ente"
        aria-expanded={aberto}
        aria-haspopup="dialog"
        aria-controls={popupId}
        style={botao}
      >
        <div
          style={{
            width: 22, height: 22, borderRadius: 3, background: colors.primary, color: colors.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600,
          }}
        >
          {ente.cod_ibge.slice(0, 2)}
        </div>
        <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
          <div style={{ fontSize: 11, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Ente
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{ente.nome}</div>
        </div>
        <Icon size={12} viewBox="0 0 12 12" stroke={colors.muted}>
          <path d="M3 5l3 3 3-3" />
        </Icon>
      </button>

      {aberto && (
        <div
          id={popupId}
          className="context-selector__panel"
          style={painel}
          role="dialog"
          aria-label="Selecionar ente do escopo"
        >
          <input
            ref={searchRef}
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onKeyDown={navegarOpcoes}
            placeholder="Buscar ente por nome ou código…"
            aria-label="Buscar ente"
            aria-controls={listboxId}
            aria-autocomplete="list"
            style={{
              width: '100%', padding: '8px 10px', border: `1px solid ${colors.border}`,
              borderRadius: 4, fontSize: 12.5, marginBottom: 6, background: colors.bg,
            }}
          />
          <div
            id={listboxId}
            role="listbox"
            aria-label="Entes do escopo"
            tabIndex={-1}
            onKeyDown={navegarOpcoes}
          >
          {!termo && recentes.length > 0 && (
            <>
              <Rotulo>Recentes</Rotulo>
              {recentes.map((r) => (
                <LinhaEnte
                  key={`r-${r.cod_ibge}`}
                  nome={r.nome}
                  cod={r.cod_ibge}
                  temDado
                  selected={r.cod_ibge === ente.cod_ibge}
                  onClick={() => escolher(r)}
                />
              ))}
              <Rotulo>Todos no escopo</Rotulo>
            </>
          )}
          {/* Sprint 26: o ente estadual fica no topo. Numa lista alfabética de 185
              municípios, "Ceará" some no meio — e o gestor da Sefaz conclui que só dá
              para ver municípios. Ele é um ente à parte, não a soma deles. */}
          {!erro && !buscando && estaduais.length > 0 && (
            <>
              <Rotulo>Ente estadual</Rotulo>
              {estaduais.map((e) => (
                <LinhaEnte
                  key={`uf-${e.cod_ibge}`}
                  nome={e.nome ?? e.cod_ibge}
                  cod={e.cod_ibge}
                  temDado={e.tem_dado}
                  periodo={e.periodo_mais_recente}
                  selected={e.cod_ibge === ente.cod_ibge}
                  onClick={() => escolher({ cod_ibge: e.cod_ibge, nome: e.nome ?? e.cod_ibge })}
                />
              ))}
              <div role="presentation" style={notaEstadual}>
                o Governo do Estado é um ente próprio — <b>não</b> é a soma dos municípios
                (essa é a visão “Consolidado da UF”)
              </div>
              <Rotulo>Municípios</Rotulo>
            </>
          )}
          {!erro &&
            !buscando &&
            municipais.map((e) => (
              <LinhaEnte
                key={e.cod_ibge}
                nome={e.nome ?? e.cod_ibge}
                cod={e.cod_ibge}
                temDado={e.tem_dado}
                periodo={e.periodo_mais_recente}
                selected={e.cod_ibge === ente.cod_ibge}
                onClick={() => escolher({ cod_ibge: e.cod_ibge, nome: e.nome ?? e.cod_ibge })}
              />
            ))}
          </div>
          {erro && <Vazio>{erro}</Vazio>}
          {!erro && buscando && <Vazio>Buscando…</Vazio>}
          {!erro && !buscando && itens.length === 0 && <Vazio>Nenhum ente no escopo para “{termo}”.</Vazio>}
          {!erro && !buscando && itens.length > 0 && (
            <div data-testid="escopo-resumo" style={rodapeEscopo}>
              {itens.length < total
                ? `mostrando ${itens.length} de ${total} — digite para filtrar`
                : `${itens.length} ente(s)`}
              {escopoTotal > 0 && ` · escopo total: ${escopoTotal}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <div role="presentation" style={{ fontSize: 11, color: colors.faint, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, padding: '6px 8px 3px' }}>
      {children}
    </div>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <div role="status" style={{ padding: '10px 8px', fontSize: 11.5, color: colors.muted }}>{children}</div>;
}

function LinhaEnte({
  nome, cod, temDado, periodo, selected = false, onClick,
}: {
  nome: string;
  cod: string;
  temDado: boolean;
  periodo?: string | null;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="option"
      aria-selected={selected}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
        padding: '7px 8px', borderRadius: 4, fontSize: 12.5,
      }}
    >
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</span>
      <span style={{ fontSize: 11, color: colors.faint, fontFamily: "'JetBrains Mono', monospace" }}>{cod}</span>
      {/* Um ente sem dado abriria tela vazia: o seletor avisa antes do clique. */}
      {!temDado ? (
        <span style={{ fontSize: 11, color: colors.muted, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 2, padding: '1px 4px' }}>
          sem dado
        </span>
      ) : (
        periodo && (
          <span style={{ fontSize: 11, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>{periodo}</span>
        )
      )}
    </button>
  );
}

export function SeletorPeriodo({ usaRgf }: { usaRgf: boolean }) {
  const {
    periodo, periodoRgf, periodosRreo, periodosRgf, setPeriodo, setPeriodoRgf,
    carregandoContexto, contextoIndisponivel,
  } = useApp();
  const [aberto, setAberto] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupId = `periodo-popup-${useId().replace(/:/g, '')}`;
  const ref = useFechaFora(aberto, () => setAberto(false), triggerRef);

  // A rota decide qual relatório governa o período — sem hack de "período por rota".
  const ativo = usaRgf ? periodoRgf : periodo;
  const lista = usaRgf ? periodosRgf : periodosRreo;
  const aplicar = usaRgf ? setPeriodoRgf : setPeriodo;
  const ordenados = useMemo(() => [...lista].sort().reverse(), [lista]);

  useEffect(() => {
    if (!aberto) return;
    const frame = window.requestAnimationFrame(() => {
      const selected = ref.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');
      (selected ?? ref.current?.querySelector<HTMLElement>('[role="option"]'))?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [aberto, ativo, ref]);

  return (
    <div ref={ref} className="context-selector">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setAberto(!aberto)}
        onKeyDown={(event) => abrirComSeta(event, () => setAberto(true))}
        aria-label="Selecionar período"
        aria-expanded={aberto}
        aria-haspopup="listbox"
        aria-controls={popupId}
        style={botao}
      >
        <Icon size={13} stroke={colors.muted}>
          <rect x="2.5" y="3.5" width="11" height="10" rx="1" />
          <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
        </Icon>
        <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
          <div style={{ fontSize: 11, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Período {usaRgf ? '(RGF)' : '(RREO)'}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}>
            {ativo || (carregandoContexto ? '…' : 'sem dado')}
          </div>
        </div>
        <Icon size={12} viewBox="0 0 12 12" stroke={colors.muted}>
          <path d="M3 5l3 3 3-3" />
        </Icon>
      </button>

      {aberto && (
        <div
          id={popupId}
          className="context-selector__panel"
          style={{ ...painel, width: 'min(220px, calc(100vw - 24px))' }}
          role="listbox"
          aria-label="Períodos com dado"
          tabIndex={-1}
          onKeyDown={navegarOpcoes}
        >
          {ordenados.length === 0 ? (
            /* O motivo vem do contexto: sem ele, um 403 de escopo era anunciado como
               ausência de dado — e o usuário ia procurar carga faltante em vez de permissão. */
            <Vazio>{contextoIndisponivel ?? 'Este ente não tem período com dado.'}</Vazio>
          ) : (
            ordenados.map((p) => (
              <button
                type="button"
                key={p}
                role="option"
                aria-selected={p === ativo}
                onClick={() => {
                  aplicar(p);
                  setAberto(false);
                  window.requestAnimationFrame(() => triggerRef.current?.focus());
                }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '7px 8px',
                  borderRadius: 4, fontSize: 12.5,
                  fontFamily: "'JetBrains Mono', monospace",
                  background: p === ativo ? colors.accentSoft : 'transparent',
                  color: p === ativo ? colors.primary : colors.ink,
                }}
              >
                {p}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Seletor de **visão** do contexto (Sprint 23): município · ente estadual · consolidado UF ·
 * carteira · grupos · comparação. Não inventa dado — apenas navega para a tela que
 * materializa cada visão (o consolidado deriva a UF do ente atual; o ente estadual é
 * resolvido pelo backend na própria página da Carteira/Estadual).
 */
const VISOES: { id: string; label: string; to: string }[] = [
  { id: 'municipio', label: 'Município (cockpit)', to: '/dashboard' },
  { id: 'consolidado', label: 'Consolidado da UF', to: '/carteira?aba=consolidado' },
  { id: 'estadual', label: 'Ente estadual', to: '/carteira?aba=estadual' },
  { id: 'carteira', label: 'Minha carteira', to: '/carteira?aba=carteira' },
  { id: 'grupos', label: 'Grupos', to: '/carteira?aba=grupos' },
  { id: 'comparacao', label: 'Comparação entre entes', to: '/benchmarking' },
];

export function SeletorVisao() {
  const navigate = useNavigate();
  const location = useLocation();
  const [aberto, setAberto] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupId = `visao-popup-${useId().replace(/:/g, '')}`;
  const ref = useFechaFora(aberto, () => setAberto(false), triggerRef);

  const params = new URLSearchParams(location.search);
  const abaAtual = params.get('aba');
  const ativa =
    location.pathname.startsWith('/carteira')
      ? VISOES.find((v) => v.to.includes(`aba=${abaAtual}`)) ?? VISOES[1]
        : location.pathname.startsWith('/benchmarking')
          ? VISOES.find((v) => v.id === 'comparacao')!
          : VISOES[0];

  useEffect(() => {
    if (!aberto) return;
    const frame = window.requestAnimationFrame(() => {
      const selected = ref.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');
      (selected ?? ref.current?.querySelector<HTMLElement>('[role="option"]'))?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [aberto, ativa.id, ref]);

  return (
    <div ref={ref} className="context-selector">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setAberto(!aberto)}
        onKeyDown={(event) => abrirComSeta(event, () => setAberto(true))}
        aria-label="Selecionar visão"
        aria-expanded={aberto}
        aria-haspopup="listbox"
        aria-controls={popupId}
        style={botao}
      >
        <Icon size={13} stroke={colors.muted}>
          <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="0.5" />
          <rect x="9" y="2.5" width="4.5" height="4.5" rx="0.5" />
          <rect x="2.5" y="9" width="4.5" height="4.5" rx="0.5" />
          <rect x="9" y="9" width="4.5" height="4.5" rx="0.5" />
        </Icon>
        <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
          <div style={{ fontSize: 11, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Visão</div>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{ativa.label}</div>
        </div>
        <Icon size={12} viewBox="0 0 12 12" stroke={colors.muted}>
          <path d="M3 5l3 3 3-3" />
        </Icon>
      </button>
      {aberto && (
        <div
          id={popupId}
          className="context-selector__panel"
          style={{ ...painel, width: 'min(260px, calc(100vw - 24px))' }}
          role="listbox"
          aria-label="Visões do contexto"
          tabIndex={-1}
          onKeyDown={navegarOpcoes}
        >
          {VISOES.map((v) => (
            <button
              type="button"
              key={v.id}
              role="option"
              aria-selected={v.id === ativa.id}
              onClick={() => {
                navigate(v.to);
                setAberto(false);
                window.requestAnimationFrame(() => triggerRef.current?.focus());
              }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '7px 9px',
                borderRadius: 4, fontSize: 12.5,
                background: v.id === ativa.id ? colors.accentSoft : 'transparent',
                color: v.id === ativa.id ? colors.primary : colors.ink,
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const rodapeEscopo = {
  padding: '7px 8px 4px',
  marginTop: 4,
  borderTop: `1px solid ${colors.rowBorder}`,
  fontSize: 11,
  color: colors.faint,
  fontFamily: "'JetBrains Mono', monospace",
} as const;

const notaEstadual = {
  padding: '2px 8px 8px',
  fontSize: 11,
  color: colors.faint,
  lineHeight: 1.45,
} as const;
