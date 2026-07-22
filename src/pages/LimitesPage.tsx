import { colors, riskColor, type RiskLevel } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { SectionLabel } from '../components/SectionLabel';
import { Async } from '../components/AsyncState';
import { useApp, useResource } from '../context/AppContext';
import { fetchLimites, type LimiteItem } from '../services/backend';
import { brl, fmt, pct } from '../utils/format';

const ROTULO: Record<string, string> = {
  pessoal_executivo: 'Pessoal · Poder Executivo',
  divida_consolidada_liquida: 'Dívida Consolidada Líquida',
  operacoes_credito: 'Operações de Crédito',
  garantias: 'Garantias',
  saude_minimo: 'Saúde (mínimo ASPS)',
  educacao_mde: 'Educação (MDE)',
  fundeb_profissionais: 'FUNDEB · profissionais',
};
const FAIXA_NIVEL: Record<string, RiskLevel> = {
  normal: 'folga',
  adequado: 'folga',
  alerta: 'atencao',
  prudencial: 'prudencial',
  excedido: 'maximo',
  insuficiente: 'maximo',
};

export function LimitesPage() {
  const { ente, periodo } = useApp();
  const res = useResource(() => fetchLimites(ente.cod_ibge, periodo), [ente.cod_ibge, periodo]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Monitor de Limites">
      <Breadcrumb
        crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Monitor de Limites' }]}
        source="fonte: RREO/RGF · dim_limite_legal · SICONFI"
      />
      <SectionLabel note="posição vs. teto/piso legal · faixas alerta 90% / prudencial 95% / máximo 100%">
        Limites legais do ente
      </SectionLabel>

      <Async res={res}>
        {(d) =>
          d.itens.length === 0 ? (
            <Card>
              <div style={{ fontSize: 12.5, color: colors.muted, lineHeight: 1.6 }}>
                Nenhum limite calculado para <strong>{ente.nome}</strong> em <strong>{d.periodo}</strong> ainda.
                Os indicadores são materializados sob demanda ao abrir cada módulo — abra <strong>Pessoal</strong> (via
                Despesa) ou aguarde as sprints de Dívida/Saúde/Educação. Todo cálculo é rastreável (source_ref).
              </div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {d.itens.map((it) => (
                <LimiteRow key={it.indicador} it={it} />
              ))}
            </div>
          )
        }
      </Async>
    </div>
  );
}

function LimiteRow({ it }: { it: LimiteItem }) {
  const nivel = FAIXA_NIVEL[it.faixa ?? ''] ?? 'neutro';
  const rc = riskColor[nivel];
  const teto = it.teto_pct ?? 0;
  const valor = it.valor_pct_rcl ?? 0;
  const ratio = teto ? Math.min((valor / teto) * 100, 100) : 0;
  const isPiso = it.sentido === 'piso';
  return (
    <Card accent={rc.color} style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <div style={{ width: 220 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{ROTULO[it.indicador] ?? it.indicador}</div>
        <div style={{ fontSize: 10.5, color: colors.muted }}>
          {isPiso ? 'piso' : 'teto'} {fmt(teto, 0)}% · esfera {it.esfera}
        </div>
      </div>
      <div style={{ width: 120 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 600, color: rc.color }}>
          {it.valor_pct_rcl != null ? pct(it.valor_pct_rcl, 2) : '—'}
        </div>
        <div style={{ fontSize: 10, color: colors.faint }}>{it.valor_rs != null ? brl(it.valor_rs / 1e6) : '—'}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ position: 'relative', height: 12, background: colors.borderSoft, borderRadius: 3 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${ratio}%`, background: rc.color, borderRadius: 3 }} />
          {it.alerta_pct != null && teto > 0 && (
            <div style={{ position: 'absolute', left: `${Math.min((it.alerta_pct / teto) * 100, 100)}%`, top: -3, bottom: -3, width: 1.5, background: colors.yellowText }} />
          )}
          <div style={{ position: 'absolute', left: '100%', top: -3, bottom: -3, width: 2, background: colors.primaryDeep }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 10, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>
          <span>distância ao {isPiso ? 'piso' : 'teto'}: {it.distancia_teto != null ? fmt(it.distancia_teto, 1) + ' p.p.' : '—'}</span>
          <span style={{ color: rc.color, fontWeight: 600, textTransform: 'uppercase' }}>{it.faixa ?? '—'}</span>
        </div>
      </div>
    </Card>
  );
}
