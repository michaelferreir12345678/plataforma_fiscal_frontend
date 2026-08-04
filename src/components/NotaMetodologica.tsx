/**
 * Nota metodológica — o que a tela escolheu, e por quê.
 *
 * O gestor técnico conhece o vocabulário fiscal; o que ele **não** tem como saber é qual
 * metodologia a plataforma escolheu entre as possíveis. "Receita primária com RPPS" é
 * legível para um contador e ainda assim insuficiente: ele precisa saber que existem duas
 * apurações no mesmo demonstrativo, que a plataforma usa uma para o primário e outra para
 * o nominal, e que parte da divergência entre acima e abaixo da linha vem daí — não de
 * erro do ente.
 *
 * **Recolhida por padrão.** Uma nota sempre aberta ocupa a tela e é ignorada; sempre
 * fechada é documentação que ninguém encontra. Recolhida com título visível é o meio-termo
 * que funciona: quem já sabe passa direto, quem tem dúvida abre onde a dúvida nasceu — não
 * numa página de metodologia que exigiria abandonar o número.
 */
import { useId, useState, type ReactNode } from 'react';
import { colors, font } from '../theme';

export function NotaMetodologica({
  titulo,
  children,
  fundamento,
  aberta: abertaInicial = false,
}: {
  titulo: string;
  children: ReactNode;
  /** Dispositivo legal ou demonstrativo que fundamenta a escolha. */
  fundamento?: string;
  aberta?: boolean;
}) {
  const [aberta, setAberta] = useState(abertaInicial);
  const painelId = useId();

  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        aria-controls={painelId}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'transparent',
          border: 'none',
          padding: 0,
          fontSize: 11,
          color: colors.primary,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span aria-hidden>{aberta ? '▾' : '▸'}</span>
        {titulo}
      </button>
      {aberta && (
        <div
          id={painelId}
          style={{
            fontSize: 11.5,
            lineHeight: 1.65,
            color: colors.ink,
            background: colors.bg,
            border: `1px solid ${colors.borderSoft}`,
            borderRadius: 5,
            padding: '10px 12px',
            marginTop: 6,
            maxWidth: 780,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {children}
          {fundamento && (
            <div style={{ fontSize: 11, color: colors.muted, fontFamily: font.mono }}>
              {fundamento}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Termo do glossário, explicado onde aparece.
 *
 * Um glossário em página separada obriga o gestor a sair do número para entender o número
 * — e quem sai raramente volta ao mesmo ponto. O termo sublinhado, com a definição a um
 * passo, mantém a dúvida e a resposta no mesmo lugar.
 */
export function Termo({ sigla, children }: { sigla: string; children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const painelId = useId();
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls={painelId}
        title={`O que é ${sigla}`}
        style={{
          background: 'transparent',
          border: 'none',
          borderBottom: `1px dotted ${colors.primary}`,
          padding: 0,
          font: 'inherit',
          color: 'inherit',
          cursor: 'help',
        }}
      >
        {sigla}
      </button>
      {aberto && (
        <span
          id={painelId}
          role="note"
          style={{
            display: 'block',
            fontSize: 11.5,
            lineHeight: 1.6,
            color: colors.muted,
            background: colors.bg,
            border: `1px solid ${colors.borderSoft}`,
            borderRadius: 4,
            padding: '8px 10px',
            margin: '6px 0',
            maxWidth: 680,
          }}
        >
          {children}
        </span>
      )}
    </>
  );
}
