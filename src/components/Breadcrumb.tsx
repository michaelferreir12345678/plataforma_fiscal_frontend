import { Link } from 'react-router-dom';
import { colors } from '../theme';

interface Crumb {
  label: string;
  to?: string;
}

/** Trilha de navegação + nota de fonte à direita (telas de detalhe). */
export function Breadcrumb({ crumbs, source }: { crumbs: Crumb[]; source?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: colors.muted }}>
      {crumbs.map((c, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <span style={{ color: '#DAD6CA' }}>›</span>}
          {c.to ? (
            <Link to={c.to} style={{ color: colors.muted }}>
              {c.label}
            </Link>
          ) : (
            <span style={{ color: colors.ink, fontWeight: 500 }}>{c.label}</span>
          )}
        </span>
      ))}
      {source && (
        <span style={{ marginLeft: 10, fontSize: 11, color: colors.faint, fontFamily: "'JetBrains Mono', monospace" }}>{source}</span>
      )}
    </div>
  );
}
