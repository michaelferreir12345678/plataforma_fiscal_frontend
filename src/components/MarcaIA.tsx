/**
 * Identidade visual da IA (Sprint IA-7).
 *
 * A explicação por IA passou a existir em onze telas. Sem uma marca própria, ela viraria
 * mais um botão discreto no meio de dez controles — e o gestor não teria como reconhecer,
 * de relance, o que é número apurado pela plataforma e o que é prosa composta por um
 * modelo em volta desse número. A distinção não é estética: é a mesma que o produto faz
 * entre "calculado dos seus dados" e "explicação geral da norma".
 *
 * Três decisões:
 *
 * 1. **Um símbolo, não um emoji.** A faísca de quatro pontas (o vocabulário que o mercado
 *    já associa a IA generativa) desenhada em SVG com as cores da marca — não `✳`, que
 *    renderiza diferente em cada sistema e é lido em voz alta por leitor de tela.
 * 2. **Sempre `aria-hidden`.** O símbolo é redundante com o texto do botão; anunciá-lo
 *    seria ruído. Quem descreve a ação é o `aria-label` do gatilho, que diz **o que** será
 *    explicado — nunca só "explicar".
 * 3. **O estado de carregando não trava a tela.** A marca pulsa (animação já existente no
 *    CSS, `pulse-soft`) dentro de um painel não modal: a página mantém scroll, foco e
 *    interação enquanto as fontes são consultadas.
 */
import { colors } from '../theme';

export function IconeIA({ size = 14, cor = colors.primary }: { size?: number; cor?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill={cor}
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      {/* Faísca principal: quatro pontas côncavas. */}
      <path d="M8 0.8c.35 2.2 1.2 3.9 2.4 5.0 1.1 1.1 2.8 1.9 4.8 2.2-2.0.35-3.7 1.1-4.8 2.2C9.2 11.3 8.35 13.0 8 15.2c-.35-2.2-1.2-3.9-2.4-5.0C4.5 9.1 2.8 8.35.8 8c2.0-.3 3.7-1.1 4.8-2.2C6.8 4.7 7.65 3.0 8 0.8z" />
      {/* Faísca secundária: dá o ritmo de "generativo" sem virar enfeite. */}
      <path d="M13.4 0.6c.12.85.36 1.4.8 1.8.42.4 1.0.63 1.8.75-.8.12-1.38.35-1.8.75-.44.4-.68.95-.8 1.8-.13-.85-.37-1.4-.8-1.8-.43-.4-1.0-.63-1.8-.75.8-.12 1.37-.35 1.8-.75.43-.4.67-.95.8-1.8z" opacity="0.55" />
    </svg>
  );
}

/**
 * Selo textual da IA — usado no cabeçalho da explicação e no transcript do Assistente.
 * Diz, em duas palavras, de quem é o texto que vem a seguir.
 */
export function SeloIA({ rotulo = 'Explicação por IA' }: { rotulo?: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 8px',
        borderRadius: 999,
        background: colors.accentSoft,
        color: colors.primary,
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.02em',
      }}
    >
      <IconeIA size={11} />
      {rotulo}
    </span>
  );
}

/**
 * Estado de carregamento da IA: diz **o que** está acontecendo, em vez de girar em branco.
 * `role="status"` + `aria-live="polite"` para que quem usa leitor de tela saiba que a
 * resposta está sendo composta — e que a página não travou.
 */
export function CarregandoIA({ etapa = 'Consultando as fontes da plataforma…' }: { etapa?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '6px 0' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          className="ia-pulsando"
          style={{ display: 'inline-flex', animation: 'pulse-soft 1.2s ease-in-out infinite' }}
        >
          <IconeIA size={15} />
        </span>
        <span style={{ fontSize: 12.5, color: colors.muted }}>{etapa}</span>
      </div>
      {/* Esqueleto de texto: mantém a altura estável, para o diálogo não "pular" quando
          a resposta chegar. */}
      {[92, 78, 86].map((largura) => (
        <div
          key={largura}
          aria-hidden="true"
          style={{
            height: 10,
            width: `${largura}%`,
            borderRadius: 3,
            background: colors.borderSoft,
          }}
        />
      ))}
    </div>
  );
}
