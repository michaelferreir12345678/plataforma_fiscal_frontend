import { useId, type ReactNode } from 'react';
import { colors, font, typeScale } from '../theme';

export interface PageHeaderProps {
  title: ReactNode;
  /** Contexto gerencial curto: ente, período ou pergunta respondida pela página. */
  context?: ReactNode;
  /** Proveniência resumida; detalhes por cifra continuam em `FonteChip`. */
  source?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  eyebrow?: ReactNode;
  id?: string;
  className?: string;
}

/** Cabeçalho institucional: navegação, título, contexto, fonte e ações. */
export function PageHeader({
  title,
  context,
  source,
  actions,
  breadcrumb,
  eyebrow,
  id,
  className,
}: PageHeaderProps) {
  const generatedId = useId();
  const headingId = id ?? `page-title-${generatedId.replace(/:/g, '')}`;

  return (
    <header
      className={['page-header', className].filter(Boolean).join(' ')}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 18,
        flexWrap: 'wrap',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div style={{ flex: '1 1 420px', minWidth: 0 }}>
        {breadcrumb && <div style={{ marginBottom: 8 }}>{breadcrumb}</div>}
        {eyebrow && (
          <div
            style={{
              color: colors.faint,
              fontSize: typeScale.caption,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 3,
            }}
          >
            {eyebrow}
          </div>
        )}
        <h1
          id={headingId}
          style={{
            margin: 0,
            color: colors.ink,
            fontSize: typeScale.title,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            fontWeight: 600,
          }}
        >
          {title}
        </h1>
        {context && (
          <div
            style={{
              marginTop: 6,
              color: colors.muted,
              fontSize: 13,
              lineHeight: 1.5,
              maxWidth: 880,
            }}
          >
            {context}
          </div>
        )}
        {source && (
          <div
            style={{
              marginTop: 6,
              color: colors.faint,
              fontFamily: font.mono,
              fontSize: typeScale.caption,
              lineHeight: 1.5,
            }}
          >
            <span className="sr-only">Fonte: </span>
            {source}
          </div>
        )}
      </div>
      {actions && (
        <div
          className="page-header__actions no-print"
          role="group"
          aria-label="Ações da página"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 8,
            flex: '0 1 auto',
            flexWrap: 'wrap',
          }}
        >
          {actions}
        </div>
      )}
    </header>
  );
}
