import { useEffect, useState, type ReactNode } from 'react';
import { fetchMe, type MeResponse } from '../services/backend';
import { colors, font } from '../theme';
import { ErrorBox, Loading } from './AsyncState';

type GateState =
  | { status: 'carregando' }
  | { status: 'erro'; mensagem: string }
  | { status: 'pronto'; me: MeResponse };

/**
 * Guarda do control plane (Sprint 19).
 *
 * Deliberadamente **não** aceita a capacidade `administrar`: ela é o topo do RBAC
 * dentro de uma organização, e quem administra a própria conta não licencia a si
 * mesmo mais entes. O backend continua sendo a autoridade — esta guarda só evita
 * disparar requisições que voltariam 403 e explica o motivo em vez de mostrar erro cru.
 */
export function RequireSuperuser({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>({ status: 'carregando' });

  useEffect(() => {
    let ativo = true;
    fetchMe()
      .then((me) => {
        if (ativo) setState({ status: 'pronto', me });
      })
      .catch((erro) => {
        if (!ativo) return;
        const mensagem =
          (erro as { detail?: string; message?: string })?.detail ||
          (erro as { message?: string })?.message ||
          'Não foi possível verificar as permissões.';
        setState({ status: 'erro', mensagem });
      });
    return () => {
      ativo = false;
    };
  }, []);

  if (state.status === 'carregando') {
    return <Loading label="Verificando acesso ao control plane…" />;
  }
  if (state.status === 'erro') {
    return <ErrorBox message={state.mensagem} />;
  }

  if (!state.me.is_superuser) {
    return (
      <section
        role="alert"
        aria-label="Acesso negado"
        data-testid="superuser-403"
        style={{
          maxWidth: 680,
          margin: '48px auto',
          padding: 24,
          border: `1px solid ${colors.red}`,
          borderRadius: 8,
          background: colors.redBg,
          color: colors.ink,
        }}
      >
        <div
          style={{
            color: colors.red,
            fontFamily: font.mono,
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          403 · ACESSO NEGADO
        </div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          Área do operador da plataforma.
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: colors.muted, lineHeight: 1.6 }}>
          Provisionar organizações e conceder licenças pertence ao control plane, fora de
          qualquer organização. Administrar a própria conta — usuários, papéis, carteira —
          continua em <strong>Administração</strong>.
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
