import { colors } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { MetricHeader } from '../components/MetricHeader';
import { SectionLabel } from '../components/SectionLabel';

const origens = [
  { nome: 'Receita Tributária', valor: 1842.4, share: 28.7, sub: ['ISS 982,1', 'IPTU 514,3', 'ITBI 218,0', 'Taxas 128,0'] },
  { nome: 'Transferências Correntes', valor: 3654.2, share: 56.9, sub: ['FPM 1.462,1', 'Cota ICMS 1.284,6', 'FUNDEB 642,8', 'SUS/FNDE 264,7'] },
  { nome: 'Receita Patrimonial', valor: 412.6, share: 6.4, sub: ['Aplicações 318,4', 'Aluguéis 94,2'] },
  { nome: 'Outras Correntes', valor: 301.3, share: 4.7, sub: ['Dívida ativa 184,2', 'Multas 117,1'] },
  { nome: 'Receitas de Capital', valor: 210.5, share: 3.3, sub: ['Op. crédito 142,3', 'Alienação 68,2'] },
];

const rclComposicao: [string, string, boolean][] = [
  ['Receitas Correntes (consolidado)', 'R$ 13.842,1', false],
  ['(−) Contribuição servidores RPPS', '−R$ 612,3', true],
  ['(−) Compensação entre regimes', '−R$ 84,2', true],
  ['(−) Dedução FUNDEB', '−R$ 298,3', true],
  ['= RCL12M', 'R$ 12.847,3', false],
];

export function ReceitaPage() {
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Detalhe · Receita">
      <Breadcrumb crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Análise por bloco' }, { label: 'Receita' }]} source="fonte: RREO Anexo 1 + Anexo 3 (RCL)" />

      <MetricHeader
        label="Receita Corrente Líquida · 12 meses móveis"
        value="R$ 12.847,3"
        suffix="M"
        valueColor={colors.primary}
        context={
          <span>
            +3,2% vs. período anterior · base de quase todos os limites da LRF
          </span>
        }
        right={
          <div>
            <div style={{ fontSize: 10, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
              Medidor de dependência · própria × transferida
            </div>
            <div style={{ display: 'flex', height: 26, borderRadius: 4, overflow: 'hidden', border: `1px solid ${colors.border}` }}>
              <div style={{ width: '34%', background: colors.primary, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 600 }}>Própria 34%</div>
              <div style={{ width: '66%', background: colors.orangeSoft, color: colors.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 600 }}>Transferida 66%</div>
            </div>
            <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 8, lineHeight: 1.45 }}>
              FPM responde por 22,8% — receita volátil. Dependência alta = fragilidade estrutural mesmo com caixa folgado.
            </div>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 12 }}>
        {/* Árvore de origens */}
        <Card>
          <SectionLabel note="corrente / capital → origem → espécie">Composição por origem</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {origens.map((o) => (
              <div key={o.nome} style={{ borderBottom: `1px solid ${colors.rowBorder}`, padding: '8px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, fontSize: 12.5, fontWeight: 500 }}>{o.nome}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500 }}>R$ {o.valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</div>
                  <div style={{ width: 44, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: colors.muted }}>{o.share}%</div>
                </div>
                <div style={{ height: 4, background: colors.borderSoft, borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${o.share}%`, background: colors.primary }} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                  {o.sub.map((s) => (
                    <span key={s} style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: colors.muted, background: colors.bg, padding: '2px 7px', borderRadius: 3 }}>{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Indicador de realização */}
          <Card>
            <SectionLabel>Realização · arrecadado ÷ previsto</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 30, fontWeight: 600, color: colors.orange }}>95,9%</div>
              <div style={{ fontSize: 11, color: colors.muted }}>R$ 6.210,5 M de R$ 6.478,0 M previstos</div>
            </div>
            <div style={{ position: 'relative', height: 14, background: colors.borderSoft, borderRadius: 3, marginTop: 12 }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '95.9%', background: colors.orange, borderRadius: 3 }} />
              <div style={{ position: 'absolute', left: '100%', top: -4, bottom: -4, width: 2, background: colors.primaryDeep }} />
            </div>
            <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 10, lineHeight: 1.45 }}>
              Frustração de receita aciona contingenciamento (art. 9º LRF). Receita não tem teto — tem meta.
            </div>
          </Card>

          {/* Memória RCL */}
          <Card>
            <SectionLabel>Memória da RCL · rastreável</SectionLabel>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                {rclComposicao.map(([label, val, ded], i) => {
                  const isTotal = i === rclComposicao.length - 1;
                  return (
                    <tr key={label} style={{ borderTop: isTotal ? `2px solid ${colors.primary}` : 'none', borderBottom: isTotal ? 'none' : `1px dashed ${colors.borderSoft}`, background: isTotal ? colors.accentSoft : 'transparent' }}>
                      <td style={{ padding: '8px 4px', fontWeight: isTotal ? 600 : 400, color: ded ? colors.muted : colors.ink }}>{label}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: isTotal ? 700 : 400, color: ded ? colors.red : isTotal ? colors.primary : colors.ink }}>{val}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </div>
  );
}
