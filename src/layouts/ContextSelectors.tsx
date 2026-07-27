/**
 * Seletores de contexto fiscal do shell (Sprint 22): ente e período.
 *
 * Ambos são **funcionais** e escrevem no contexto único — trocar aqui muda todas as
 * páginas. O seletor de ente busca dentro do escopo (`/entes`) e destaca os recentes; o
 * de período só oferece períodos **com dado** do ente, por relatório (RREO/RGF conforme a
 * rota), eliminando o antigo período fixo por variável de ambiente.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
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
  minWidth: 300,
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
};

function useFechaFora(aberto: boolean, fechar: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) fechar();
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && fechar();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [aberto, fechar]);
  return ref;
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
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ref = useFechaFora(aberto, () => setAberto(false));

  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    setBuscando(true);
    setErro(null);
    const t = setTimeout(() => {
      fetchEntes({ q: termo || undefined, limit: 30 })
        .then((r) => vivo && setItens(r.data))
        .catch((e) => vivo && setErro(e?.detail || e?.message || 'Falha na busca'))
        .finally(() => vivo && setBuscando(false));
    }, 220); // debounce: evita uma requisição por tecla
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [termo, aberto]);

  const escolher = (e: EnteSel) => {
    setEnte(e);
    setAberto(false);
    setTermo('');
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setAberto(!aberto)}
        aria-label="Selecionar ente"
        aria-expanded={aberto}
        style={botao}
      >
        <div
          style={{
            width: 22, height: 22, borderRadius: 3, background: colors.primary, color: colors.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600,
          }}
        >
          {ente.cod_ibge.slice(0, 2)}
        </div>
        <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
          <div style={{ fontSize: 9, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Ente
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{ente.nome}</div>
        </div>
        <Icon size={12} viewBox="0 0 12 12" stroke={colors.muted}>
          <path d="M3 5l3 3 3-3" />
        </Icon>
      </button>

      {aberto && (
        <div style={painel} role="listbox" aria-label="Entes do escopo">
          <input
            autoFocus
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar ente por nome ou código…"
            aria-label="Buscar ente"
            style={{
              width: '100%', padding: '8px 10px', border: `1px solid ${colors.border}`,
              borderRadius: 4, fontSize: 12.5, marginBottom: 6, background: colors.bg,
            }}
          />
          {!termo && recentes.length > 0 && (
            <>
              <Rotulo>Recentes</Rotulo>
              {recentes.map((r) => (
                <LinhaEnte key={`r-${r.cod_ibge}`} nome={r.nome} cod={r.cod_ibge} temDado onClick={() => escolher(r)} />
              ))}
              <Rotulo>Todos no escopo</Rotulo>
            </>
          )}
          {erro && <Vazio>{erro}</Vazio>}
          {!erro && buscando && <Vazio>Buscando…</Vazio>}
          {!erro && !buscando && itens.length === 0 && <Vazio>Nenhum ente no escopo para “{termo}”.</Vazio>}
          {!erro &&
            !buscando &&
            itens.map((e) => (
              <LinhaEnte
                key={e.cod_ibge}
                nome={e.nome ?? e.cod_ibge}
                cod={e.cod_ibge}
                temDado={e.tem_dado}
                periodo={e.periodo_mais_recente}
                onClick={() => escolher({ cod_ibge: e.cod_ibge, nome: e.nome ?? e.cod_ibge })}
              />
            ))}
        </div>
      )}
    </div>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, color: colors.faint, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, padding: '6px 8px 3px' }}>
      {children}
    </div>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '10px 8px', fontSize: 11.5, color: colors.muted }}>{children}</div>;
}

function LinhaEnte({
  nome, cod, temDado, periodo, onClick,
}: {
  nome: string; cod: string; temDado: boolean; periodo?: string | null; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      role="option"
      aria-selected={false}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
        padding: '7px 8px', borderRadius: 4, fontSize: 12.5,
      }}
    >
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</span>
      <span style={{ fontSize: 10, color: colors.faint, fontFamily: "'JetBrains Mono', monospace" }}>{cod}</span>
      {/* Um ente sem dado abriria tela vazia: o seletor avisa antes do clique. */}
      {!temDado ? (
        <span style={{ fontSize: 9, color: colors.muted, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 2, padding: '1px 4px' }}>
          sem dado
        </span>
      ) : (
        periodo && (
          <span style={{ fontSize: 9.5, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>{periodo}</span>
        )
      )}
    </button>
  );
}

export function SeletorPeriodo({ usaRgf }: { usaRgf: boolean }) {
  const { periodo, periodoRgf, periodosRreo, periodosRgf, setPeriodo, setPeriodoRgf, carregandoContexto } = useApp();
  const [aberto, setAberto] = useState(false);
  const ref = useFechaFora(aberto, () => setAberto(false));

  // A rota decide qual relatório governa o período — sem hack de "período por rota".
  const ativo = usaRgf ? periodoRgf : periodo;
  const lista = usaRgf ? periodosRgf : periodosRreo;
  const aplicar = usaRgf ? setPeriodoRgf : setPeriodo;
  const ordenados = useMemo(() => [...lista].sort().reverse(), [lista]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setAberto(!aberto)} aria-label="Selecionar período" aria-expanded={aberto} style={botao}>
        <Icon size={13} stroke={colors.muted}>
          <rect x="2.5" y="3.5" width="11" height="10" rx="1" />
          <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
        </Icon>
        <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
          <div style={{ fontSize: 9, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
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
        <div style={{ ...painel, minWidth: 190 }} role="listbox" aria-label="Períodos com dado">
          {ordenados.length === 0 ? (
            <Vazio>Este ente não tem período com dado.</Vazio>
          ) : (
            ordenados.map((p) => (
              <button
                key={p}
                role="option"
                aria-selected={p === ativo}
                onClick={() => {
                  aplicar(p);
                  setAberto(false);
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
  const ref = useFechaFora(aberto, () => setAberto(false));

  const params = new URLSearchParams(location.search);
  const abaAtual = params.get('aba');
  const ativa =
    location.pathname.startsWith('/carteira')
      ? VISOES.find((v) => v.to.includes(`aba=${abaAtual}`)) ?? VISOES[1]
      : location.pathname.startsWith('/benchmarking')
        ? VISOES.find((v) => v.id === 'comparacao')!
        : VISOES[0];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setAberto(!aberto)} aria-label="Selecionar visão" aria-expanded={aberto} style={botao}>
        <Icon size={13} stroke={colors.muted}>
          <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="0.5" />
          <rect x="9" y="2.5" width="4.5" height="4.5" rx="0.5" />
          <rect x="2.5" y="9" width="4.5" height="4.5" rx="0.5" />
          <rect x="9" y="9" width="4.5" height="4.5" rx="0.5" />
        </Icon>
        <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
          <div style={{ fontSize: 9, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Visão</div>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{ativa.label}</div>
        </div>
        <Icon size={12} viewBox="0 0 12 12" stroke={colors.muted}>
          <path d="M3 5l3 3 3-3" />
        </Icon>
      </button>
      {aberto && (
        <div style={{ ...painel, minWidth: 230 }} role="listbox" aria-label="Visões do contexto">
          {VISOES.map((v) => (
            <button
              key={v.id}
              role="option"
              aria-selected={v.id === ativa.id}
              onClick={() => {
                navigate(v.to);
                setAberto(false);
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
