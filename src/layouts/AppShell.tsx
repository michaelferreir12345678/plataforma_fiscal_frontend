import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { colors } from '../theme';
import { Icon } from '../components/Icon';
import { navSections } from './navConfig';

function Badge({ text, tone }: { text: string; tone: 'count' | 'new' | 'dot' }) {
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
  return (
    <span
      style={{
        marginLeft: 'auto',
        fontSize: 9.5,
        fontFamily: "'JetBrains Mono', monospace",
        background: text === '3' ? colors.red : colors.border,
        color: text === '3' ? '#fff' : colors.muted,
        padding: '1px 6px',
        borderRadius: text === '3' ? 8 : 2,
        fontWeight: 600,
      }}
    >
      {text}
    </span>
  );
}

export function AppShell() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

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

        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 10px',
            border: `1px solid ${colors.border}`,
            borderRadius: 4,
            background: colors.bg,
          }}
        >
          <div style={{ width: 22, height: 22, borderRadius: 3, background: colors.primary, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>
            CE
          </div>
          <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
            <div style={{ fontSize: 9, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Ente</div>
            <div style={{ fontSize: 12.5, fontWeight: 500 }}>Município de Fortaleza · CE</div>
          </div>
          <Icon size={12} viewBox="0 0 12 12" stroke={colors.muted}>
            <path d="M3 5l3 3 3-3" />
          </Icon>
        </button>

        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            border: `1px solid ${colors.border}`,
            borderRadius: 4,
            background: colors.bg,
          }}
        >
          <Icon size={13} stroke={colors.muted}>
            <rect x="2.5" y="3.5" width="11" height="10" rx="1" />
            <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
          </Icon>
          <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
            <div style={{ fontSize: 9, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Período</div>
            <div style={{ fontSize: 12.5, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}>2025 · 2º quadrimestre</div>
          </div>
          <Icon size={12} viewBox="0 0 12 12" stroke={colors.muted}>
            <path d="M3 5l3 3 3-3" />
          </Icon>
        </button>

        <div style={{ flex: 1 }} />

        <button
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
          <span style={{ fontSize: 12 }}>Buscar ente, limite, conta…</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, background: colors.surface, border: `1px solid ${colors.border}`, padding: '1px 5px', borderRadius: 3 }}>
            ⌘K
          </span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', border: '1px solid #C7E5D5', background: colors.greenBg, borderRadius: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: colors.green, animation: 'pulse-soft 2s ease-in-out infinite' }} />
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 9, color: colors.green, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>SICONFI</div>
            <div style={{ fontSize: 11.5, fontWeight: 500, color: colors.ink }}>Conforme · sync 12 min</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8, borderLeft: `1px solid ${colors.border}` }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: colors.primaryGrad, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>
            MV
          </div>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>Marina Vasconcelos</div>
            <div style={{ fontSize: 10, color: colors.faint }}>Secretaria de Finanças</div>
          </div>
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
              {section.items.map((item) => (
                <NavLink key={item.to} to={item.to} style={({ isActive }) => navLinkStyle(isActive)}>
                  {item.icon}
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>{item.label}</span>
                  {item.badge && <Badge text={item.badge.text} tone={item.badge.tone} />}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        <div style={{ flex: 1 }} />

        <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <NavLink to="/admin" style={({ isActive }) => navLinkStyle(isActive)}>
            <Icon>
              <path d="M8 2l5 2.5v3.5c0 3-2 5-5 6-3-1-5-3-5-6V4.5z" />
              <circle cx="8" cy="7" r="1.6" />
              <path d="M5.5 11c0-1.4 1.1-2.2 2.5-2.2s2.5.8 2.5 2.2" />
            </Icon>
            <span style={{ fontSize: 12.5, fontWeight: 500 }}>Administração</span>
          </NavLink>
          <Link to="/onboarding" style={navLinkStyle(false)}>
            <Icon>
              <circle cx="8" cy="8" r="2" />
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3" />
            </Icon>
            <span style={{ fontSize: 12 }}>Conta &amp; contexto fiscal</span>
          </Link>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: colors.green }} />
            <span>SICONFI online</span>
          </div>
          <span style={{ color: '#3A4540' }}>·</span>
          <span>RREO 2025/2 OK · RGF 2025/1 OK · DCA 2024 OK · MSC Mai/2025 OK</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span>última carga 14/06/2025 03:12</span>
          <span style={{ color: '#3A4540' }}>·</span>
          <span>v2.4.1 · ambiente {isAdmin ? 'admin' : 'prod'}</span>
        </div>
      </footer>
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
