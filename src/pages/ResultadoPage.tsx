import { colors } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { SectionLabel } from '../components/SectionLabel';

/** Cascata de formação do resultado (primário → nominal). */
const cascade = [
  { label: 'Receitas primárias', value: 6010, kind: 'pos' },
  { label: '(−) Despesas primárias', value: -5690, kind: 'neg' },
  { label: '= Resultado Primário', value: 320, kind: 'result' },
  { label: '(−) Juros nominais', value: -512, kind: 'neg' },
  { label: '= Resultado Nominal', value: -192, kind: 'result' },
];

const ajustes = [
  { item: 'Variação de RP processados', valor: '+R$ 142,8' },
  { item: 'Alienação de investimentos', valor: '−R$ 38,4' },
  { item: 'Variação cambial', valor: '−R$ 12,1' },
  { item: 'Precatórios', valor: '+R$ 24,6' },
];

export function ResultadoPage() {
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Detalhe · Resultado Fiscal">
      <Breadcrumb crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Análise por bloco' }, { label: 'Resultado Fiscal' }]} source="fonte: RREO Anexo 6 · Metas LDO/LOA" />

      {/* Header + medidor de meta */}
      <Card style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 11, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Resultado primário acumulado</div>
            <span style={{ fontSize: 10, padding: '2px 8px', background: colors.greenBg, color: colors.green, borderRadius: 3, fontWeight: 600, letterSpacing: '0.04em' }}>SUPERÁVIT</span>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 38, fontWeight: 600, letterSpacing: '-0.03em', color: colors.green }}>+R$ 320,1 M</div>
          <div style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>2,49% da RCL · resultado nominal R$ −192 M ≡ variação da DCL</div>
        </div>
        <div style={{ width: 1, alignSelf: 'stretch', background: colors.border }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Cumprimento da meta · realizado × meta LDO</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 600, color: colors.green }}>114,3%</div>
            <div style={{ fontSize: 11, color: colors.muted }}>R$ 320,1 M realizado · meta R$ 280,0 M</div>
          </div>
          <div style={{ position: 'relative', height: 16, background: colors.borderSoft, borderRadius: 3 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%', background: colors.greenBg, borderRadius: 3 }} />
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '87%', background: colors.green, borderRadius: 3 }} />
            <div style={{ position: 'absolute', left: '87%', top: -4, bottom: -4, width: 2, background: colors.primaryDeep }} />
            <div style={{ position: 'absolute', left: '87%', top: -18, transform: 'translateX(-50%)', fontSize: 9, fontWeight: 600, color: colors.muted, whiteSpace: 'nowrap' }}>meta (100%)</div>
          </div>
          <div style={{ fontSize: 10.5, color: colors.green, marginTop: 10 }}>Projeção de fechamento mantém o cumprimento — sem necessidade de contingenciamento (art. 9º LRF).</div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
        {/* Cascata primário → nominal */}
        <Card>
          <SectionLabel note="materializa o elo com a dívida">Cascata de formação do resultado</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            {cascade.map((c) => {
              const isResult = c.kind === 'result';
              const w = Math.min(100, (Math.abs(c.value) / 6010) * 100);
              const color = isResult ? (c.value >= 0 ? colors.green : colors.red) : c.kind === 'neg' ? colors.orange : colors.primary;
              return (
                <div key={c.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: isResult ? 600 : 400 }}>{c.label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: isResult ? 700 : 500, color: c.value < 0 ? colors.red : isResult ? colors.green : colors.ink }}>
                      {c.value >= 0 ? '+' : '−'}R$ {Math.abs(c.value).toLocaleString('pt-BR')} M
                    </span>
                  </div>
                  <div style={{ height: isResult ? 16 : 12, background: colors.borderSoft, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${w}%`, background: color, opacity: isResult ? 1 : 0.75 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Reconciliador acima × abaixo */}
        <Card>
          <SectionLabel note="peça de auditoria">Reconciliador · acima × abaixo da linha</SectionLabel>
          <div style={{ display: 'flex', gap: 10, marginTop: 4, marginBottom: 12 }}>
            <div style={{ flex: 1, padding: 10, background: colors.bg, borderRadius: 5, textAlign: 'center' }}>
              <div style={{ fontSize: 9.5, color: colors.faint, textTransform: 'uppercase', fontWeight: 600 }}>Acima da linha</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 600, marginTop: 2 }}>R$ 320,1 M</div>
            </div>
            <div style={{ flex: 1, padding: 10, background: colors.bg, borderRadius: 5, textAlign: 'center' }}>
              <div style={{ fontSize: 9.5, color: colors.faint, textTransform: 'uppercase', fontWeight: 600 }}>Abaixo da linha</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 600, marginTop: 2 }}>R$ 203,2 M</div>
            </div>
          </div>
          <div style={{ fontSize: 10.5, color: colors.muted, marginBottom: 8 }}>Divergência de R$ 116,9 M explicada pelos ajustes metodológicos:</div>
          {ajustes.map((a) => (
            <div key={a.item} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px dashed ${colors.borderSoft}`, fontSize: 11.5 }}>
              <span>{a.item}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: a.valor.startsWith('−') ? colors.red : colors.green }}>{a.valor}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
