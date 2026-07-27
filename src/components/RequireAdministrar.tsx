import { useEffect, useState, type ReactNode } from 'react';
import { fetchMe, type MeResponse } from '../services/backend';
import { colors, font } from '../theme';
import { ErrorBox, Loading } from './AsyncState';

type GateState =
  | { status: 'carregando' }
  | { status: 'erro'; mensagem: string }
  | { status: 'pronto'; me: MeResponse };

/**
 * Guarda visual das páginas administrativas.
 *
 * O backend continua sendo a autoridade e responde 403 nos endpoints. Esta guarda consulta
 * `/me` antes de montar a página, de modo que uma URL digitada diretamente também resulte
 * em uma tela 403, em vez de disparar vários requests administrativos sem permissão.
 */
export function RequireAdministrar({ children }: { children: ReactNode }) {
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
    return <Loading label="Verificando permissão administrativa…" />;
  }
  if (state.status === 'erro') {
    return <ErrorBox message={state.mensagem} />;
  }

  const capacidades = state.me.org_ativa?.capacidades ?? [];
  if (!capacidades.includes('administrar')) {
    return (
      <section
        role="alert"
        aria-label="Acesso negado"
        data-testid="admin-403"
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
        <div style={{ fontSize: 14, fontWeight: 600 }}>Capacidade “administrar” necessária.</div>
        <div style={{ marginTop: 6, fontSize: 12, color: colors.muted }}>
          Sua sessão é válida, mas não pode acessar esta área administrativa.
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
