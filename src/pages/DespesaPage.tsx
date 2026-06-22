import { colors } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { MetricHeader } from '../components/MetricHeader';
import { SectionLabel } from '../components/SectionLabel';

/** Estágios da despesa (cascata). */
const stages = [
  { label: 'Dotação atualizada', value: 12640, color: '#1B3A2E' },
  { label: 'Empenhado', value: 5890, color: '#2D5A47' },
  { label: 'Liquidado', value: 4980, color: '#3E7A5F' },
  { label: 'Pago', value: 4612, color: '#5B9A7B' },
  { label: 'Inscrito em RAP', value: 368, color: '#E07A2F' },
];

const funcoes = [
  { nome: 'Educação', valor: 1746, share: 29.6, color: '#1B3A2E' },
  { nome: 'Saúde', valor: 1492, share: 25.3, color: '#2D5A47' },
  { nome: 'Urbanismo', valor: 884, share: 15.0, color: '#3E7A5F' },
  { nome: 'Administração', valor: 642, share: 10.9, color: '#5B9A7B' },
  { nome: 'Assist. social', valor: 472, share: 8.0, color: '#86B89F' },
  { nome: 'Segurança', valor: 348, share: 5.9, color: '#A9CFBC' },
  { nome: 'Demais', valor: 306, share: 5.3, color: '#CDE3D7' },
];

export function DespesaPage() {
  const maxStage = stages[0].value;
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Detalhe · Despesa">
      <Breadcrumb crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Análise por bloco' }, { label: 'Despesa' }]} source="fonte: RREO Anexo 1 + Anexo 2 (função)" />

      <MetricHeader
        label="Despesa executada (empenhada) × dotação atualizada"
        value="46,6%"
        valueColor={colors.primary}
        context="R$ 5.890,4 M de R$ 12.640,0 M · 2º bimestre (33% do exercício)"
        right={
          <div>
            <div style={{ fontSize: 10, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
              Execução vs. esperado-para-o-período
            </div>
            <div style={{ position: 'relative', height: 22, background: colors.borderSoft, borderRadius: 4 }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '46.6%', background: colors.green, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6, color: '#fff', fontSize: 10, fontWeight: 600 }}>46,6%</div>
              <div style={{ position: 'absolute', left: '50%', top: -4, bottom: -4, width: 2, background: colors.primaryDeep }} />
              <div style={{ position: 'absolute', left: '50%', top: -18, transform: 'translateX(-50%)', fontSize: 9, fontWeight: 600, color: colors.muted, whiteSpace: 'nowrap' }}>esperado 50%</div>
            </div>
            <div style={{ fontSize: 10.5, color: colors.green, marginTop: 10, fontWeight: 500 }}>No ritmo · ligeiramente abaixo do esperado (sem alerta de subexecução)</div>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Cascata de estágios */}
        <Card>
          <SectionLabel note="lacuna empenhado→pago = fábrica de RAP">Cascata de estágios da despesa</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            {stages.map((s) => (
              <div key={s.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{s.label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500 }}>R$ {s.value.toLocaleString('pt-BR')}</span>
                </div>
                <div style={{ height: 18, background: colors.borderSoft, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(s.value / maxStage) * 100}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: '8px 12px', background: colors.orangeBg, borderRadius: 4, fontSize: 10.5, color: '#6B5A2E', lineHeight: 1.4 }}>
            Lacuna empenhado → pago de <b>R$ 1.278 M</b>: potencial de inscrição em Restos a Pagar (risco que se empurra ao próximo exercício).
          </div>
        </Card>

        {/* Treemap por função */}
        <Card>
          <SectionLabel note="para onde vai o dinheiro">Despesa por função</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {funcoes.map((f, i) => (
              <div
                key={f.nome}
                style={{
                  flex: `${f.share} 1 0`,
                  minWidth: i < 3 ? 130 : 90,
                  height: i < 2 ? 92 : 70,
                  background: f.color,
                  borderRadius: 4,
                  padding: 10,
                  color: i < 4 ? '#fff' : colors.ink,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 600 }}>{f.nome}</div>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600 }}>{f.share}%</div>
                  <div style={{ fontSize: 9.5, opacity: 0.8, fontFamily: "'JetBrains Mono', monospace" }}>R$ {f.valor.toLocaleString('pt-BR')} M</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${colors.borderSoft}` }}>
            <Stat label="Rigidez orçamentária" value="71,4%" sub="obrigatória ÷ total" />
            <Stat label="Investimento per capita" value="R$ 218" sub="vs. mediana R$ 184" />
            <Stat label="% despesa de capital" value="9,2%" sub="" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 600, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: colors.muted }}>{sub}</div>}
    </div>
  );
}
