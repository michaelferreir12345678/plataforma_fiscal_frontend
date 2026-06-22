import { colors } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { SectionLabel } from '../components/SectionLabel';

const secMeters = [
  { label: 'Op. de Crédito', value: 6.12, max: 16 },
  { label: 'Garantias', value: 10.0, max: 22 },
  { label: 'ARO', value: 4.0, max: 7 },
];

const capag = [
  { ind: 'Endividamento (DC bruta/RCL)', nota: 'B', valor: '96,4%', color: colors.yellowText },
  { ind: 'Poupança Corrente', nota: 'A', valor: '88,2%', color: colors.green },
  { ind: 'Liquidez Relativa', nota: 'A', valor: '0,71', color: colors.green },
];

const vencimentos = [
  { ano: '2026', valor: 1284, share: 100 },
  { ano: '2027', valor: 1148, share: 89 },
  { ano: '2028', valor: 982, share: 76 },
  { ano: '2029', valor: 864, share: 67 },
  { ano: '2030', valor: 742, share: 58 },
  { ano: '2031+', valor: 6170, share: 100 },
];

export function DividaPage() {
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Detalhe · Dívida">
      <Breadcrumb crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Análise por bloco' }, { label: 'Dívida & Endividamento' }]} source="fonte: RGF Anexo 2 (DDCL) · SADIPEM · CAPAG/STN" />

      {/* Dois heróis: DCL + CAPAG */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
        <Card style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Dívida Consolidada Líquida · base do limite LRF</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 38, fontWeight: 600, letterSpacing: '-0.03em', color: colors.primary }}>87,10%</div>
            <div style={{ fontSize: 11, color: colors.muted }}>R$ 11.190,4 M · teto 120% da RCL (municipal)</div>
            <div style={{ position: 'relative', height: 12, background: colors.borderSoft, borderRadius: 3, marginTop: 12, width: 300 }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(87.1 / 120) * 100}%`, background: colors.green, borderRadius: 3 }} />
              <div style={{ position: 'absolute', left: '100%', top: -3, bottom: -3, width: 2, background: colors.red }} />
            </div>
            <div style={{ fontSize: 10.5, color: colors.green, marginTop: 8 }}>Folga de R$ 4.226,4 M até o teto · espaço amplo para novo endividamento</div>
          </div>
        </Card>
        <Card accent={colors.yellow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Boletim CAPAG</div>
            <span style={{ fontSize: 9, padding: '1px 6px', background: colors.yellowBg, color: colors.yellowText, borderRadius: 2, fontWeight: 600 }}>NOTA FINAL B</span>
          </div>
          <div style={{ fontSize: 10.5, color: colors.muted, marginBottom: 10 }}>capacidade de pagamento · define acesso a aval da União (crédito mais barato)</div>
          {capag.map((c) => (
            <div key={c.ind} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: `1px solid ${colors.rowBorder}` }}>
              <div style={{ width: 24, height: 24, borderRadius: 5, background: c.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{c.nota}</div>
              <div style={{ flex: 1, fontSize: 11.5 }}>{c.ind}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500 }}>{c.valor}</div>
            </div>
          ))}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 12 }}>
        {/* Medidores secundários */}
        <Card>
          <SectionLabel>Limites secundários de endividamento</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
            {secMeters.map((m) => (
              <div key={m.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{m.label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{m.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}% <span style={{ color: colors.muted }}>/ {m.max}%</span></span>
                </div>
                <div style={{ position: 'relative', height: 12, background: colors.borderSoft, borderRadius: 3 }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(m.value / m.max) * 100}%`, background: colors.green, borderRadius: 3 }} />
                  <div style={{ position: 'absolute', left: '100%', top: -3, bottom: -3, width: 2, background: colors.red }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${colors.borderSoft}` }}>
            <SectionLabel>Memória da DCL</SectionLabel>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                {[['Dívida Consolidada (DC) bruta', 'R$ 12.384,2', false], ['(−) Disponibilidades de caixa', '−R$ 982,4', true], ['(−) Demais haveres financeiros', '−R$ 211,4', true], ['= DCL', 'R$ 11.190,4', false]].map(([l, v, ded], i, arr) => {
                  const total = i === arr.length - 1;
                  return (
                    <tr key={l as string} style={{ borderTop: total ? `2px solid ${colors.primary}` : 'none', borderBottom: total ? 'none' : `1px dashed ${colors.borderSoft}`, background: total ? colors.accentSoft : 'transparent' }}>
                      <td style={{ padding: '7px 4px', fontWeight: total ? 600 : 400, color: ded ? colors.muted : colors.ink }}>{l}</td>
                      <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: total ? 700 : 400, color: ded ? colors.red : total ? colors.primary : colors.ink }}>{v}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Cronograma de vencimentos */}
        <Card>
          <SectionLabel note="concentração de amortização = risco de refinanciamento">Cronograma de amortização · SADIPEM</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 180, padding: '12px 0' }}>
            {vencimentos.map((v) => (
              <div key={v.ano} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: colors.muted }}>{(v.valor / 1000).toFixed(1)}b</div>
                <div style={{ width: '100%', height: `${v.share}%`, background: v.ano === '2026' ? colors.orange : colors.primary, borderRadius: '3px 3px 0 0', minHeight: 8 }} />
                <div style={{ fontSize: 10, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>{v.ano}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 4 }}>Serviço da dívida 2026 (juros + amortização): <b style={{ fontFamily: "'JetBrains Mono', monospace" }}>R$ 1.847 M</b> · 14,4% da RCL.</div>
        </Card>
      </div>
    </div>
  );
}
