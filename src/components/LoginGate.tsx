/** Porta de autenticação: mostra o login enquanto não há sessão; depois libera o app. */
import { useState, type FormEvent, type ReactNode } from 'react';
import { colors, font } from '../theme';
import { login } from '../services/api';
import { useApp } from '../context/AppContext';

export function LoginGate({ children }: { children: ReactNode }) {
  const { token, setToken } = useApp();
  const [email, setEmail] = useState('admin@municipio.gov.br');
  const [senha, setSenha] = useState('senha1234');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

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
        background: colors.bg,
        fontFamily: font.ui,
        color: colors.ink,
      }}
    >
      <form
        onSubmit={entrar}
        style={{
          width: 360,
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
          <div style={{ fontSize: 9, letterSpacing: '0.12em', color: colors.faint, border: `1px solid ${colors.border}`, borderRadius: 3, padding: '2px 6px' }}>
            BETA
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: colors.muted, lineHeight: 1.5 }}>
          Inteligência fiscal sobre dados reais do SICONFI. Entre para acessar os indicadores do
          seu ente.
        </div>

        <label style={labelStyle}>E-mail</label>
        <input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        <label style={labelStyle}>Senha</label>
        <input style={inputStyle} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />

        {erro && (
          <div style={{ fontSize: 11.5, color: colors.red, background: colors.redBg, padding: '8px 10px', borderRadius: 4 }}>
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
        <div style={{ fontSize: 10.5, color: colors.faint, fontFamily: font.mono }}>
          demo: admin@municipio.gov.br · senha1234
        </div>
      </form>
    </div>
  );
}

const labelStyle = {
  fontSize: 10,
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
