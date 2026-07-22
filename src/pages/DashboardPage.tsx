import { useNavigate } from 'react-router-dom';
import { colors, riskColor, type RiskLevel } from '../theme';
import { Card } from '../components/Card';
import { SectionLabel } from '../components/SectionLabel';
import { Icon } from '../components/Icon';
import { Async } from '../components/AsyncState';
import { useApp, useResource } from '../context/AppContext';
import { fetchDashboard, type KpiItem, type SemaforoItem } from '../services/backend';
import { brl, fmt, pct } from '../utils/format';

const COR_NIVEL: Record<string, RiskLevel> = {
  verde: 'folga',
  amarelo: 'atencao',
  laranja: 'prudencial',
  vermelho: 'maximo',
  cinza: 'neutro',
};
const ROTULO: Record<string, { label: string; sub: string }> = {
  pessoal_executivo: { label: 'Pessoal · Executivo', sub: 'art. 20 LRF · teto 54%' },
  divida_consolidada_liquida: { label: 'Dívida Consolidada Líquida', sub: 'Res. SF 40 · teto 120%' },
  saude_minimo: { label: 'Saúde (mínimo)', sub: 'LC 141 · piso 15%' },
  educacao_mde: { label: 'Educação (MDE)', sub: 'CF art. 212 · piso 25%' },
};

function money(v: number | null): string {
  return v == null ? '—' : brl(v / 1e6);
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { ente, periodo } = useApp();
  const res = useResource(() => fetchDashboard(ente.cod_ibge, periodo), [ente.cod_ibge, periodo]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Dashboard Executivo">
      <Async res={res}>
        {(d) => {
          const rcl = d.kpis.find((k) => k.chave === 'rcl_12m')?.valor ?? null;
          return (
            <>
              <Card pad={0} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 4, background: colors.primaryGrad, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>
                  {ente.cod_ibge.slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{ente.nome}</div>
                  <div style={{ fontSize: 11, color: colors.muted, fontFamily: "'JetBrains Mono', monospace", display: 'flex', gap: 12 }}>
                    <span>IBGE {d.cod_ibge}</span>
                    <span style={{ color: '#DAD6CA' }}>·</span>
                    <span>período {d.periodo}</span>
                    <span style={{ color: '#DAD6CA' }}>·</span>
                    <span>RCL12M {money(rcl)}</span>
                    <span style={{ color: '#DAD6CA' }}>·</span>
                    <span>conformidade: {d.conformidade}</span>
                  </div>
                </div>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 10.5, color: colors.faint, fontFamily: "'JetBrains Mono', monospace" }}>
                  fonte {d.source_ref.relatorio} v{d.source_ref.versao_entrega}
                </span>
              </Card>

              <div>
                <SectionLabel note="posição vs. teto/piso legal · LRF/LC 101 · dado real do SICONFI">Semáforo de limites</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {d.semaforo.map((s) => (
                    <SemaforoCard key={s.indicador} s={s} />
                  ))}
                </div>
              </div>

              <div>
                <SectionLabel note={`período ${d.periodo} · SICONFI`}>Indicadores-chave (RCL)</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {d.kpis.map((k) => (
                    <KpiReal key={k.chave} k={k} />
                  ))}
                </div>
              </div>

              <Card pad={0} style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Destaques automáticos</div>
                  <button
                    onClick={() => navigate('/limites')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 11.5, fontWeight: 500, color: colors.primary }}
                  >
                    Monitor de Limites
                    <Icon size={11} viewBox="0 0 12 12"><path d="M3 6h6M7 4l2 2-2 2" /></Icon>
                  </button>
                </div>
                {d.destaques.length === 0 ? (
                  <div style={{ fontSize: 12, color: colors.muted }}>
                    Nenhum indicador em faixa de risco no período — ou indicadores ainda não calculados
                    (dívida/saúde/educação chegam nas próximas sprints).
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {d.destaques.map((x, i) => {
                      const rc = riskColor[COR_NIVEL[x.cor] ?? 'neutro'];
                      return (
                        <div key={i} style={{ display: 'flex', gap: 10, padding: 10, background: rc.bg, borderLeft: `2px solid ${rc.color}`, borderRadius: 3, fontSize: 12 }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: rc.color }}>{String(i + 1).padStart(2, '0')}</span>
                          <span>{x.mensagem}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </>
          );
        }}
      </Async>
    </div>
  );
}

function SemaforoCard({ s }: { s: SemaforoItem }) {
  const nivel = COR_NIVEL[s.cor] ?? 'neutro';
  const rc = riskColor[nivel];
  const rot = ROTULO[s.indicador] ?? { label: s.indicador, sub: '' };
  const semDados = s.faixa == null;
  return (
    <Card pad={14} accent={rc.color} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 10, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{rot.label}</div>
          <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>{rot.sub}</div>
        </div>
        <span style={{ fontSize: 9.5, fontWeight: 600, color: rc.color, background: rc.bg, padding: '2px 7px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {semDados ? 'sem dados' : rc.label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 600, color: semDados ? colors.faint : rc.color }}>
          {s.valor_pct_rcl != null ? pct(s.valor_pct_rcl, 2) : '—'}
        </div>
        <div style={{ fontSize: 10.5, color: colors.muted }}>
          {s.sentido === 'piso' ? 'piso' : 'teto'} {s.teto_pct != null ? fmt(s.teto_pct, 0) + '%' : '—'}
        </div>
      </div>
      {!semDados && s.valor_pct_rcl != null && s.teto_pct != null && (
        <div style={{ height: 8, background: colors.borderSoft, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min((s.valor_pct_rcl / s.teto_pct) * 100, 100)}%`, background: rc.color }} />
        </div>
      )}
    </Card>
  );
}

function KpiReal({ k }: { k: KpiItem }) {
  return (
    <Card pad={14} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 10, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{k.rotulo}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 600, color: k.disponivel ? colors.primary : colors.faint }}>
        {k.disponivel && k.valor != null ? money(k.valor) : '—'}
      </div>
      <div style={{ fontSize: 10.5, color: colors.muted }}>{k.disponivel ? k.unidade : 'chega em sprint futura'}</div>
    </Card>
  );
}
