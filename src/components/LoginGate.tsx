/** Porta de autenticação: mostra o login enquanto não há sessão; depois libera o app. */
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { colors, font } from '../theme';
import { login } from '../services/api';
import { fetchHealth } from '../services/backend';
import { useApp } from '../context/AppContext';

/** Credencial de demonstração: o **backend** decide se pode aparecer. */
const DEMO_EMAIL = 'admin@municipio.gov.br';
const DEMO_SENHA = 'senha1234';

export function LoginGate({ children }: { children: ReactNode }) {
  const { token, setToken } = useApp();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [ambienteLocal, setAmbienteLocal] = useState(false);

  // Sem sessão ainda: /health é público e informa o ambiente. Fora de 'local' a
  // credencial de demonstração não é exibida nem pré-preenchida.
  useEffect(() => {
    let vivo = true;
    fetchHealth()
      .then((h) => {
        if (!vivo || h.app_env?.toLowerCase() !== 'local') return;
        setAmbienteLocal(true);
        setEmail((atual) => atual || DEMO_EMAIL);
        setSenha((atual) => atual || DEMO_SENHA);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  if (token) return <>{children}</>;

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const t = await login(email, senha);
      setToken(t);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Falha no login');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        background: colors.bg,
        fontFamily: font.ui,
        color: colors.ink,
      }}
    >
      <form
        onSubmit={entrar}
        aria-labelledby="login-title"
        aria-busy={carregando}
        style={{
          width: 'min(360px, 100%)',
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 18, height: 18, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 3, height: 2, background: colors.orange }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: 7, height: 7, background: colors.primary }} />
          </div>
          <div style={{ fontWeight: 600, fontSize: 20, color: colors.primary }}>erário</div>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', color: colors.faint, border: `1px solid ${colors.border}`, borderRadius: 3, padding: '2px 6px' }}>
            BETA
          </div>
        </div>
        <h1 id="login-title" style={{ margin: 0, fontSize: 18, lineHeight: 1.3, fontWeight: 600 }}>
          Acessar o Erário
        </h1>
        <div style={{ fontSize: 12.5, color: colors.muted, lineHeight: 1.5 }}>
          Inteligência fiscal sobre dados reais do SICONFI. Entre para acessar os indicadores do
          seu ente.
        </div>

        <label htmlFor="login-email" style={labelStyle}>E-mail</label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          style={inputStyle}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label htmlFor="login-senha" style={labelStyle}>Senha</label>
        <input
          id="login-senha"
          name="password"
          style={inputStyle}
          type="password"
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        {erro && (
          <div role="alert" aria-live="assertive" style={{ fontSize: 11.5, color: colors.red, background: colors.redBg, padding: '8px 10px', borderRadius: 4 }}>
            {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={carregando}
          style={{
            marginTop: 4,
            padding: '10px 14px',
            border: 'none',
            borderRadius: 5,
            background: colors.primary,
            color: colors.bg,
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            opacity: carregando ? 0.6 : 1,
          }}
        >
          {carregando ? 'Entrando…' : 'Entrar'}
        </button>
        {ambienteLocal && (
          <div style={{ fontSize: 11, color: colors.faint, fontFamily: font.mono }}>
            demo: {DEMO_EMAIL} · {DEMO_SENHA}
          </div>
        )}
      </form>
    </div>
  );
}

const labelStyle = {
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  color: colors.faint,
  fontWeight: 600,
};
const inputStyle = {
  padding: '9px 11px',
  border: `1px solid ${colors.border}`,
  borderRadius: 5,
  fontSize: 13,
  fontFamily: font.ui,
  background: colors.bg,
  color: colors.ink,
};
