import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { colors } from '../theme';
import { Icon } from '../components/Icon';
import { navSections } from './navConfig';
import { SeletorEnte, SeletorPeriodo, SeletorVisao } from './ContextSelectors';
import { useApp, useResource } from '../context/AppContext';
import { fetchAlertas, fetchCarteiraResumo, fetchFontes, fetchMe } from '../services/backend';
import type { FonteCatalogo } from '../services/backend';

/** Versão do app vem do build (Vite), nunca de um literal na UI. */
const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string) || import.meta.env.MODE;

function Badge({ text, tone }: { text: string; tone: 'count' | 'new' | 'alerta' }) {
  if (tone === 'new') {
    return (
      <span
        style={{
          marginLeft: 'auto',
          fontSize: 8,
          fontWeight: 600,
          background: 'linear-gradient(135deg, #E07A2F, #D14343)',
          color: '#fff',
          padding: '2px 5px',
          borderRadius: 2,
          letterSpacing: '0.05em',
        }}
      >
        {text}
      </span>
    );
  }
  const critico = tone === 'alerta';
  return (
    <span
      style={{
        marginLeft: 'auto',
        fontSize: 9.5,
        fontFamily: "'JetBrains Mono', monospace",
        background: critico ? colors.red : colors.border,
        color: critico ? '#fff' : colors.muted,
        padding: '1px 6px',
        borderRadius: critico ? 8 : 2,
        fontWeight: 600,
      }}
    >
      {text}
    </span>
  );
}

/** Iniciais do nome real do usuário (sem inventar avatar). */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '—';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function horaCurta(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** Resumo factual das fontes — sem veredito inventado ("Conforme"). */
function resumoFontes(fontes: FonteCatalogo[]) {
  const ativas = fontes.filter((f) => f.ativo);
  const comDado = ativas.filter((f) => f.periodo_mais_recente);
  const execucoes = comDado
    .map((f) => f.ultima_execucao_ok)
    .filter((t): t is string => Boolean(t))
    .sort();
  const ultima = execucoes.length ? execucoes[execucoes.length - 1] : null;
  const siconfi = fontes.filter((f) => f.familia === 'siconfi' && f.periodo_mais_recente);
  const defasagem = siconfi
    .map((f) => f.defasagem_periodos)
    .filter((d): d is number => d !== null);
  return {
    totalAtivas: ativas.length,
    comDado: comDado.length,
    ultima,
    defasagemMax: defasagem.length ? Math.max(...defasagem) : null,
    porRelatorio: siconfi
      .slice()
      .sort((a, b) => a.relatorio.localeCompare(b.relatorio))
      .map((f) => `${f.relatorio} ${f.periodo_mais_recente}`),
  };
}

/**
 * Rotas cujo período é governado pelo **RGF** (quadrimestral), e não pelo RREO.
 * Fica declarado aqui, num lugar só, em vez de espalhado como condicional por página.
 */
const ROTAS_RGF = ['/divida', '/caixa'];

export function AppShell() {
  const location = useLocation();
  const { ente, periodo, logout } = useApp();
  const usaRgf = ROTAS_RGF.some((r) => location.pathname.startsWith(r));
  const [buscaAberta, setBuscaAberta] = useState(false);

  // ⌘K / Ctrl+K abre a busca de ente.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setBuscaAberta(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Contrato do shell: quem está logado, em qual organização e com quais capacidades.
  const me = useResource(() => fetchMe(), []);
  const capacidades = me.data?.org_ativa?.capacidades ?? [];
  const podeAdministrar = capacidades.includes('administrar');

  // Status das fontes só é buscado por quem pode administrar; sem permissão, some.
  const fontes = useResource(
    () => (podeAdministrar ? fetchFontes() : Promise.resolve(null)),
    [podeAdministrar],
  );
  const status = fontes.data ? resumoFontes(fontes.data) : null;

  // Badges do menu a partir de contagem real (nunca número fixo).
  const alertas = useResource(() => fetchAlertas(ente.cod_ibge, 'ente'), [ente.cod_ibge]);
  const carteira = useResource(() => fetchCarteiraResumo(periodo), [periodo]);
  const badges: Record<string, { text: string; tone: 'count' | 'new' | 'alerta' }> = {};
  const totalAlertas = alertas.data?.contadores.total ?? 0;
  if (totalAlertas > 0) {
    const criticos = alertas.data?.contadores.critico ?? 0;
    badges['/alertas'] = { text: String(totalAlertas), tone: criticos > 0 ? 'alerta' : 'count' };
  }
  if (carteira.data) {
    badges['/carteira'] = { text: String(carteira.data.total_entes), tone: 'count' };
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '220px 1fr',
        gridTemplateRows: '52px 1fr 24px',
        height: '100vh',
        minHeight: 880,
        minWidth: 1380,
        background: colors.bg,
        color: colors.ink,
      }}
    >
      {/* ====== TOP BAR ====== */}
      <header
        style={{
          gridColumn: '1 / -1',
          display: 'flex',
          alignItems: 'center',
          borderBottom: `1px solid ${colors.border}`,
          background: colors.surface,
          padding: '0 16px',
          gap: 16,
        }}
      >
        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, width: 188 }}>
          <div style={{ width: 18, height: 18, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 3, height: 2, background: colors.orange }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: 7, height: 7, background: colors.primary }} />
            <div style={{ position: 'absolute', left: 2, right: 2, top: 14, height: 2, background: colors.primary, opacity: 0.35 }} />
          </div>
          <div style={{ fontWeight: 600, fontSize: 17, letterSpacing: '-0.01em', color: colors.primary }}>erário</div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: colors.faint,
              padding: '2px 6px',
              border: `1px solid ${colors.border}`,
              borderRadius: 3,
            }}
          >
            BETA
          </div>
        </Link>

        <SeletorEnte aberto={buscaAberta} setAberto={setBuscaAberta} />
        <SeletorPeriodo usaRgf={usaRgf} />
        <SeletorVisao />

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setBuscaAberta(true)}
          aria-label="Buscar ente (Ctrl+K)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            border: `1px solid ${colors.border}`,
            borderRadius: 4,
            background: colors.bg,
            color: colors.muted,
          }}
        >
          <Icon size={13}>
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" />
          </Icon>
          <span style={{ fontSize: 12 }}>Buscar ente…</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, background: colors.surface, border: `1px solid ${colors.border}`, padding: '1px 5px', borderRadius: 3 }}>
            ⌘K
          </span>
        </button>

        {/* Status da ingestão: some sem permissão; erro é mostrado como erro. */}
        {podeAdministrar && <StatusChip carregando={fontes.loading} erro={fontes.error} status={status} />}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8, borderLeft: `1px solid ${colors.border}` }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: colors.primaryGrad, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>
            {me.data ? iniciais(me.data.nome) : '·'}
          </div>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>
              {me.data?.nome ?? (me.error ? 'Sessão indisponível' : 'Carregando…')}
            </div>
            <div style={{ fontSize: 10, color: colors.faint }}>
              {me.data?.org_ativa?.org_nome ?? (me.error ? me.error : '—')}
            </div>
          </div>
          <button
            onClick={logout}
            title="Sair"
            style={{ marginLeft: 4, padding: '5px 8px', border: `1px solid ${colors.border}`, borderRadius: 4, background: colors.bg, color: colors.muted, fontSize: 11 }}
          >
            Sair
          </button>
        </div>
      </header>

      {/* ====== SIDEBAR ====== */}
      <aside
        style={{
          borderRight: `1px solid ${colors.border}`,
          background: colors.surface,
          padding: '14px 10px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {navSections.map((section) => (
          <div key={section.title}>
            <div style={{ fontSize: 9, color: colors.faint, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, padding: '0 8px 6px' }}>
              {section.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {section.items.map((item) => {
                const badge = item.badge ?? badges[item.to];
                return (
                  <NavLink key={item.to} to={item.to} style={({ isActive }) => navLinkStyle(isActive)}>
                    {item.icon}
                    <span style={{ fontSize: 12.5, fontWeight: 500 }}>{item.label}</span>
                    {badge && <Badge text={badge.text} tone={badge.tone} />}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}

        <div style={{ flex: 1 }} />

        <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {podeAdministrar && (
            <>
              <NavLink to="/central-dados" style={({ isActive }) => navLinkStyle(isActive)}>
                <Icon>
                  <rect x="2.5" y="3" width="11" height="3" rx="0.5" />
                  <rect x="2.5" y="6.5" width="11" height="3" rx="0.5" />
                  <rect x="2.5" y="10" width="11" height="3" rx="0.5" />
                </Icon>
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>Central de Dados</span>
              </NavLink>
              <NavLink to="/admin" style={({ isActive }) => navLinkStyle(isActive)}>
                <Icon>
                  <path d="M8 2l5 2.5v3.5c0 3-2 5-5 6-3-1-5-3-5-6V4.5z" />
                  <circle cx="8" cy="7" r="1.6" />
                  <path d="M5.5 11c0-1.4 1.1-2.2 2.5-2.2s2.5.8 2.5 2.2" />
                </Icon>
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>Administração</span>
              </NavLink>
            </>
          )}
        </div>
      </aside>

      {/* ====== MAIN ====== */}
      <main style={{ overflow: 'auto', padding: '14px 16px', minWidth: 0 }}>
        <Outlet />
      </main>

      {/* ====== STATUS BAR ====== */}
      <footer
        style={{
          gridColumn: '1 / -1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          background: colors.primaryDeep,
          color: '#B8BFB8',
          fontSize: 10.5,
          fontFamily: "'JetBrains Mono', monospace",
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {podeAdministrar ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: fontes.error ? colors.red : status ? colors.green : '#5B6B7B',
                  }}
                />
                <span>
                  {fontes.error
                    ? 'ingestão indisponível'
                    : status
                      ? `${status.comDado}/${status.totalAtivas} fontes com dado`
                      : 'consultando fontes…'}
                </span>
              </div>
              {status && status.porRelatorio.length > 0 && (
                <>
                  <span style={{ color: '#3A4540' }}>·</span>
                  <span>{status.porRelatorio.join(' · ')}</span>
                </>
              )}
            </>
          ) : (
            <span style={{ color: '#7C8A82' }}>{ente.nome}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {podeAdministrar && (
            <>
              <span>
                {fontes.error
                  ? 'última carga indisponível'
                  : status?.ultima
                    ? `última carga ${horaCurta(status.ultima)}`
                    : 'sem carga registrada'}
              </span>
              <span style={{ color: '#3A4540' }}>·</span>
            </>
          )}
          <span>
            {APP_VERSION} · ambiente {import.meta.env.MODE}
          </span>
        </div>
      </footer>
    </div>
  );
}

/**
 * Chip de status da ingestão. Três estados **honestos**: carregando, erro (com a causa)
 * e o resumo factual — nunca um veredito de conformidade inventado.
 */
function StatusChip({
  carregando,
  erro,
  status,
}: {
  carregando: boolean;
  erro: string | null;
  status: ReturnType<typeof resumoFontes> | null;
}) {
  const tom = erro
    ? { borda: '#E8C0C0', fundo: colors.redBg, ponto: colors.red, rotulo: colors.red }
    : status
      ? { borda: '#C7E5D5', fundo: colors.greenBg, ponto: colors.green, rotulo: colors.green }
      : { borda: colors.border, fundo: colors.bg, ponto: colors.neutral, rotulo: colors.muted };

  const detalhe = erro
    ? erro
    : carregando || !status
      ? 'consultando…'
      : status.ultima
        ? `última carga ${horaCurta(status.ultima)}`
        : 'sem carga registrada';

  return (
    <div
      title={erro ? `Falha ao consultar /admin/ingestion/fontes: ${erro}` : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 10px',
        border: `1px solid ${tom.borda}`,
        background: tom.fundo,
        borderRadius: 4,
        maxWidth: 260,
      }}
    >
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: tom.ponto, flexShrink: 0 }} />
      <div style={{ lineHeight: 1.15, minWidth: 0 }}>
        <div style={{ fontSize: 9, color: tom.rotulo, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
          Ingestão
        </div>
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 500,
            color: colors.ink,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {detalhe}
        </div>
      </div>
    </div>
  );
}

function navLinkStyle(isActive: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '7px 8px',
    borderRadius: 4,
    textAlign: 'left',
    background: isActive ? colors.accentSoft : 'transparent',
    color: isActive ? colors.primary : colors.muted,
    borderLeft: `3px solid ${isActive ? colors.primary : 'transparent'}`,
  };
}
