/**
 * Gatilho de impressão (Sprint B3 — U12).
 *
 * `global.css:342-405` já define `@page`/`@media print` — layout A4 paisagem, chrome do
 * shell escondido, tabelas virtualizadas materializadas — mas nenhuma tela chamava
 * `window.print()`. A infraestrutura existia; faltava o botão que a aciona.
 *
 * Fica dentro de `PageHeader.actions`, que já é `.no-print`: o próprio botão desaparece
 * na folha impressa, então não precisa se esconder duas vezes.
 */
import { Icon } from './Icon';
import { colors, font } from '../theme';

interface PrintButtonProps {
  label?: string;
}

export function PrintButton({ label = 'Imprimir' }: PrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      title="Imprimir ou salvar como PDF (layout otimizado para impressão)"
      style={botao}
    >
      <Icon size={12} stroke={colors.ink}>
        <path d="M4.5 6V2.5h7V6M4.5 11.5h-2a1 1 0 01-1-1V7a1 1 0 011-1h11a1 1 0 011 1v3.5a1 1 0 01-1 1h-2" />
        <rect x="4.5" y="9" width="7" height="4.5" />
      </Icon>
      {label}
    </button>
  );
}

const botao = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  border: `1px solid ${colors.border}`,
  background: colors.surface,
  borderRadius: 4,
  padding: '4px 10px',
  fontSize: 11,
  color: colors.ink,
  cursor: 'pointer',
  fontFamily: font.mono,
} as const;
