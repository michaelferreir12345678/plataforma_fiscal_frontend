/**
 * Blocos padrão de estado para telas ligadas ao backend.
 *
 * Sprint 25 fixou os quatro estados que toda página fiscal precisa ter: **carregando**
 * (skeleton, não texto pulando), **erro** (com "tentar de novo"), **vazio** ("sem dado
 * para {ente}/{período}", com caminho para a Central de Dados quando o usuário pode
 * administrar) e **defasado** (selo, em `FonteChip`). Vazio nunca é desenhado como zero.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { colors, font } from '../theme';
import type { Resource } from '../context/AppContext';

export function Loading({ label = 'Carregando dados reais…' }: { label?: string }) {
  return (
    <div
      className="async-state"
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={box}
    >
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors.primary, animation: 'pulse-soft 1.2s ease-in-out infinite' }} />
      <span style={{ fontSize: 12, color: colors.muted }}>{label}</span>
    </div>
  );
}

/** Esqueleto do bloco enquanto o dado não chega (mantém o layout estável). */
export function Skeleton({
  linhas = 3,
  altura = 14,
  label = 'Carregando conteúdo',
}: {
  linhas?: number;
  altura?: number;
  label?: string;
}) {
  return (
    <div
      className="async-state"
      data-testid="skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
        {Array.from({ length: linhas }).map((_, i) => (
          <div
            key={i}
            style={{
              height: altura,
              borderRadius: 3,
              background: colors.borderSoft,
              width: `${100 - i * 12}%`,
              animation: 'pulse-soft 1.4s ease-in-out infinite',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      className="async-state"
      role="alert"
      aria-live="assertive"
      style={{ ...box, borderColor: colors.redSoft, background: colors.redBg, justifyContent: 'space-between' }}
    >
      <span style={{ fontSize: 12, color: colors.red, fontFamily: font.mono }}>
        <span aria-hidden>⚠ </span>
        {message}
      </span>
      {onRetry && (
        <button type="button" onClick={onRetry} aria-label="Tentar carregar novamente" style={botao}>
          Tentar de novo
        </button>
      )}
    </div>
  );
}

/** Ausência de dado — dita com todas as letras, com saída para quem pode resolvê-la. */
export function EmptyState({
  ente,
  periodo,
  detalhe,
  podeAdministrar = false,
}: {
  ente: string;
  periodo: string;
  detalhe?: ReactNode;
  podeAdministrar?: boolean;
}) {
  return (
    <div
      className="async-state"
      role="status"
      style={{ ...box, flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}
    >
      <span style={{ fontSize: 12.5, color: colors.ink, fontWeight: 600 }}>
        Sem dado para {ente} · {periodo}
      </span>
      {detalhe && <span style={{ fontSize: 11.5, color: colors.muted, lineHeight: 1.5 }}>{detalhe}</span>}
      {podeAdministrar && (
        <Link to="/central-dados" style={{ ...botao, textDecoration: 'none' }}>
          abrir a Central de Dados
        </Link>
      )}
    </div>
  );
}

/**
 * Contexto indisponível — o ente não tem período **porque** algo impede, não porque falta dado.
 *
 * Distinguir importa: "sem dado" manda o usuário à Central de Dados; "fora do escopo" manda
 * ao administrador da organização. Dizer o primeiro quando o caso é o segundo faz o usuário
 * procurar no lugar errado.
 */
export function ContextoIndisponivel({ motivo, ente }: { motivo: string; ente: string }) {
  return (
    <div
      className="async-state"
      role="status"
      style={{ ...box, flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}
    >
      <span style={{ fontSize: 12.5, color: colors.ink, fontWeight: 600 }}>
        {ente} sem período disponível
      </span>
      <span style={{ fontSize: 11.5, color: colors.muted, lineHeight: 1.5, maxWidth: 620 }}>
        {motivo}
      </span>
    </div>
  );
}

/** Renderiza `children(data)` só quando o recurso carregou; senão skeleton/erro/vazio. */
export function Async<T>({
  res,
  children,
  skeleton,
  vazio,
}: {
  res: Resource<T>;
  children: (data: T) => ReactNode;
  /** Esqueleto do bloco (default: `Skeleton`). */
  skeleton?: ReactNode;
  /** Substitui o conteúdo quando o dado chegou mas está vazio. */
  vazio?: { quando: (data: T) => boolean; render: ReactNode };
}) {
  // Antes de tudo: se o recurso não se aplica, dizer isso — não girar um esqueleto.
  if (res.indisponivel) return <>{res.indisponivel}</>;
  if (res.loading && !res.data) return <>{skeleton ?? <Skeleton />}</>;
  if (res.error) return <ErrorBox message={res.error} onRetry={res.reload} />;
  if (!res.data) return <>{skeleton ?? <Skeleton />}</>;
  if (vazio && vazio.quando(res.data)) return <>{vazio.render}</>;
  return <>{children(res.data)}</>;
}

const box = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '18px 16px',
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  background: colors.surface,
};

const botao = {
  border: `1px solid ${colors.border}`,
  background: colors.surface,
  borderRadius: 4,
  padding: '4px 10px',
  fontSize: 11,
  color: colors.ink,
  cursor: 'pointer',
} as const;
