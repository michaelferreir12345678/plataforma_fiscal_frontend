import { useNavigate } from 'react-router-dom';
import { colors, riskColor } from '../theme';
import { Card } from '../components/Card';
import { SectionLabel } from '../components/SectionLabel';
import { Icon } from '../components/Icon';
import { alertas, obrigacoes, historico, agregados } from '../services/alertasData';

export function AlertasPage() {
  const navigate = useNavigate();
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Alertas e Conformidade">
      {/* Header + contadores */}
      <Card style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px' }} pad={0}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Alertas &amp; Conformidade</div>
          <div style={{ fontSize: 11, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>vigilância ativa · prazos sensíveis ao porte do ente</div>
        </div>
        <div style={{ flex: 1 }} />
        {[
          { n: '1', label: 'Crítico', bg: colors.redBg, color: colors.red },
          { n: '2', label: 'Atenção', bg: colors.orangeBg, color: colors.orange },
          { n: '4', label: 'Informativo', bg: colors.neutralBg, color: colors.neutral },
        ].map((c) => (
          <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: c.bg, borderRadius: 5 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 600, color: c.color }}>{c.n}</span>
            <span style={{ fontSize: 11, color: c.color, fontWeight: 600 }}>{c.label}</span>
          </div>
        ))}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
        {/* Fila priorizada */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SectionLabel note="crítico → atenção → informativo">Central de alertas · fila priorizada</SectionLabel>
          {alertas.map((a, i) => {
            const rc = riskColor[a.level];
            return (
              <Card key={i} pad={0} style={{ borderLeft: `3px solid ${rc.color}` }}>
                <div style={{ display: 'flex', gap: 14, padding: '14px 16px' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 6, background: rc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} stroke={rc.color}>
                      <path d="M8 1.5L15 14H1z M8 6v3.5 M8 11.5v0.1" />
                    </Icon>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 3, fontWeight: 600, background: rc.bg, color: rc.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{a.severidade}</span>
                      <span style={{ fontSize: 10.5, color: colors.faint, fontFamily: "'JetBrains Mono', monospace" }}>{a.categoria}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>{a.titulo}</div>
                    <div style={{ fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 1.45 }}>{a.motivo}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, padding: '9px 12px', background: colors.bg, borderRadius: 4 }}>
                      <Icon size={14} stroke={colors.muted} style={{ flexShrink: 0, marginTop: 1 }}>
                        <rect x="3" y="2" width="10" height="12" rx="1" />
                        <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" />
                      </Icon>
                      <div style={{ fontSize: 11.5, lineHeight: 1.45 }}>
                        <b style={{ color: colors.ink }}>{a.norma}</b> — <span style={{ color: colors.muted }}>{a.consequencia}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0, minWidth: 140 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 9, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{a.prazoLabel}</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600, color: rc.color, letterSpacing: '-0.02em' }}>{a.prazoValor}</div>
                    </div>
                    <button
                      onClick={() => navigate(a.actionTarget)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: a.primary ? rc.color : colors.surface, color: a.primary ? '#fff' : colors.primary, border: a.primary ? 'none' : `1px solid ${colors.border}`, borderRadius: 4, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}
                    >
                      {a.actionLabel}
                      <Icon size={11} viewBox="0 0 12 12"><path d="M3 6h6M7 4l2 2-2 2" /></Icon>
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Agregados */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Alertas agregados · Visão Estadual</div>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>184 entes monitorados</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {agregados.map((g) => {
                const rc = riskColor[g.level];
                return (
                  <button key={g.label} onClick={() => navigate('/carteira')} style={{ textAlign: 'left', border: `1px solid ${colors.border}`, borderRadius: 5, padding: 12, borderLeft: `3px solid ${rc.color}` }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 600, color: rc.color }}>{g.count}</span>
                      <span style={{ fontSize: 11, color: colors.muted }}>municípios</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: colors.muted, marginTop: 4, lineHeight: 1.4 }}>{g.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, color: colors.primary, fontWeight: 500 }}>
                      ver entes <Icon size={10} viewBox="0 0 12 12"><path d="M3 6h6M7 4l2 2-2 2" /></Icon>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Calendário + histórico */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Icon size={14} stroke={colors.primary}>
                <rect x="2.5" y="3.5" width="11" height="10" rx="1" />
                <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
              </Icon>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Calendário de obrigações</div>
            </div>
            <div style={{ fontSize: 10.5, color: colors.muted, marginBottom: 12 }}>prazos para porte ≥ 50 mil · RGF quadrimestral</div>
            {obrigacoes.map((o, i) => {
              const rc = riskColor[o.level];
              return (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < obrigacoes.length - 1 ? `1px solid ${colors.rowBorder}` : 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 42, flexShrink: 0 }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 17, fontWeight: 600, lineHeight: 1, color: rc.color }}>{o.dia}</div>
                    <div style={{ fontSize: 9, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>{o.mes}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{o.demonstrativo}</div>
                    <div style={{ fontSize: 10.5, color: colors.faint }}>{o.periodo}</div>
                  </div>
                  <span style={{ alignSelf: 'center', fontSize: 9.5, padding: '2px 7px', borderRadius: 3, fontWeight: 600, background: rc.bg, color: rc.color, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{o.status}</span>
                </div>
              );
            })}
          </Card>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Icon size={14} stroke={colors.primary}>
                <circle cx="8" cy="8" r="6" />
                <path d="M8 4.5V8l2.5 1.5" />
              </Icon>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Histórico de conformidade</div>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>trilha p/ TCE</span>
            </div>
            {historico.map((h, i) => {
              const rc = riskColor[h.level];
              return (
                <div key={i} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: rc.color, border: '2px solid #fff', boxShadow: `0 0 0 1px ${rc.color}` }} />
                    {i < historico.length - 1 && <div style={{ width: 1.5, flex: 1, minHeight: 18, background: colors.border }} />}
                  </div>
                  <div style={{ paddingBottom: 14, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{h.evento}</span>
                      <span style={{ fontSize: 10, color: colors.faint, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>{h.data}</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>{h.detalhe}</div>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    </div>
  );
}
