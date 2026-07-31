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
import { useApp } from '../context/AppContext';
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

export function ErrorBox({
  message,
  onRetry,
  acao,
  explicacao,
  severidade = 'erro',
}: {
  message: string;
  onRetry?: () => void;
  /** Ação que resolve a causa, quando ela é conhecida (ex.: ir ao período que tem dado). */
  acao?: ReactNode;
  /**
   * Por que o dado não está lá — em linha própria e em tom secundário.
   *
   * O fato ("sem RGF para 2026-Q2") e o motivo ("o quadrimestre ainda não venceu") são duas
   * informações; emendadas num parágrafo só, o gestor lê a primeira e para.
   */
  explicacao?: string | null;
  /**
   * `ausencia` para o que **não é falha**: dado que a fonte ainda não publicou. Pintar de
   * vermelho e oferecer "tentar de novo" faz o gestor insistir contra uma parede — o
   * relatório não vai aparecer porque ninguém o publicou ainda.
   */
  severidade?: 'erro' | 'ausencia';
}) {
  const ausencia = severidade === 'ausencia';
  return (
    <div
      className="async-state"
      role={ausencia ? 'status' : 'alert'}
      aria-live={ausencia ? 'polite' : 'assertive'}
      style={{
        ...box,
        borderColor: ausencia ? colors.border : colors.redSoft,
        background: ausencia ? colors.yellowBg : colors.redBg,
        justifyContent: 'space-between',
        gap: 14,
      }}
    >
      <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          style={{
            fontSize: 12,
            color: ausencia ? colors.ink : colors.red,
            fontFamily: ausencia ? 'inherit' : font.mono,
            lineHeight: 1.55,
          }}
        >
          <span aria-hidden>{ausencia ? 'ⓘ ' : '⚠ '}</span>
          {message}
        </span>
        {explicacao && (
          <span style={{ fontSize: 11.5, color: colors.muted, lineHeight: 1.5, maxWidth: 640 }}>
            {explicacao}
          </span>
        )}
      </span>
      <span style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {acao}
        {/* Sem ação conhecida, "tentar de novo" ainda faz sentido — a falha pode ser
            transitória. Com ação conhecida, repetir a chamada é o caminho errado. */}
        {onRetry && !acao && (
          <button type="button" onClick={onRetry} aria-label="Tentar carregar novamente" style={botao}>
            Tentar de novo
          </button>
        )}
      </span>
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

/**
 * Erro que oferece a saída, quando o backend disse qual é.
 *
 * A CAPAG de um exercício em curso não existe porque o Tesouro publica uma vez por ano —
 * insistir em "tentar de novo" não traz o dado nunca. Quando o backend indica um período
 * que **tem** dado (extensão `periodo_sugerido` do Problem Details), o botão leva até lá em
 * vez de convidar o gestor a repetir a mesma consulta.
 */
function ErroComSaida<T>({ res }: { res: Resource<T> }) {
  const { setPeriodo, setPeriodoRgf } = useApp();
  const sugerido = res.apiError?.periodoSugerido ?? null;
  const explicacao = res.apiError?.explicacao ?? null;

  // O formato do período diz qual seletor governa: quadrimestre/semestre é RGF, bimestre
  // é RREO. Trocar o seletor errado deixaria a tela pedindo o mesmo período de novo.
  const deRgf = sugerido !== null && /-[QS]\d/.test(sugerido);
  return (
    <ErrorBox
      // Explicação sem período alternativo já muda a leitura: diz que a ausência é da fonte,
      // não nossa. Sem nenhuma das duas, é falha de verdade e continua vermelha.
      severidade={explicacao || sugerido ? 'ausencia' : 'erro'}
      message={res.error ?? ''}
      explicacao={explicacao}
      // Sem alternativa, "tentar de novo" volta a fazer sentido: a entrega pode ter saído
      // entre esta consulta e a próxima.
      onRetry={res.reload}
      acao={
        sugerido && (
          <button
            type="button"
            onClick={() => (deRgf ? setPeriodoRgf(sugerido) : setPeriodo(sugerido))}
            style={{ ...botao, borderColor: colors.primary, color: colors.primary, fontWeight: 600 }}
          >
            {res.apiError?.rotuloSugerido ?? `Ir para ${sugerido}`}
          </button>
        )
      }
    />
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
  if (res.error) return <ErroComSaida res={res} />;
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
