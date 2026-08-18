import type { ReactNode } from 'react';
import { colors } from '../theme';
import { Card } from './Card';

interface MetricHeaderProps {
  /** rótulo curto acima do valor */
  label: string;
  /** valor herói (já formatado) */
  value: ReactNode;
  /** sufixo do valor (ex.: "% RCL", "M") */
  suffix?: string;
  /** cor do valor herói */
  valueColor?: string;
  /** badge à direita do rótulo */
  badge?: ReactNode;
  /**
   * Ponto de entrada da explicação por IA **deste** indicador (Sprint IA-7).
   * Fica no cabeçalho, ao lado do rótulo, porque é ali que o gestor olha quando não
   * entende o número — e não numa barra de ações genérica no topo da página.
   */
  explicar?: ReactNode;
  /** linha de contexto abaixo do valor */
  context?: ReactNode;
  /** painel à direita (medidor, faixas, etc.) */
  right?: ReactNode;
}

/**
 * Cabeçalho de indicador — topo padrão de toda tela de detalhe.
 * Reusado por Receita, Despesa, Dívida, Resultado, Caixa e Saúde/Educação.
 */
export function MetricHeader({ label, value, suffix, valueColor = colors.ink, badge, explicar, context, right }: MetricHeaderProps) {
  return (
    <Card pad={16} style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <div
            style={{
              fontSize: 11,
              color: colors.faint,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            {label}
          </div>
          {badge}
          {explicar}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 38,
              fontWeight: 600,
              letterSpacing: '-0.03em',
              color: valueColor,
            }}
          >
            {value}
            {suffix && <span style={{ fontSize: 20, color: colors.muted }}> {suffix}</span>}
          </div>
        </div>
        {context && <div style={{ fontSize: 11, color: colors.muted, marginTop: 8 }}>{context}</div>}
      </div>
      {right && (
        <>
          <div style={{ width: 1, alignSelf: 'stretch', background: colors.border }} />
          <div style={{ flex: 1 }}>{right}</div>
        </>
      )}
    </Card>
  );
}
