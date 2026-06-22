import { colors } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { SectionLabel } from '../components/SectionLabel';
import { fmt } from '../utils/format';

interface Fonte {
  fonte: string;
  disp: number;
  obrig: number;
}

const fontes: Fonte[] = [
  { fonte: 'Recursos não vinculados (livres)', disp: 842.4, obrig: 612.8 },
  { fonte: 'Saúde (vinculado)', disp: 386.2, obrig: 421.5 },
  { fonte: 'Educação / FUNDEB', disp: 512.7, obrig: 388.4 },
  { fonte: 'RPPS', disp: 1245.8, obrig: 84.2 },
  { fonte: 'Convênios e transf. vinculadas', disp: 218.4, obrig: 256.9 },
  { fonte: 'Operações de crédito vinculadas', disp: 142.6, obrig: 98.3 },
];

export function CaixaPage() {
  const insuf = fontes.filter((f) => f.disp - f.obrig < 0).length;
  const semLastro = fontes.filter((f) => f.disp - f.obrig < 0).reduce((s, f) => s + (f.obrig - f.disp), 0);
  const totalLiq = fontes.reduce((s, f) => s + (f.disp - f.obrig), 0);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Detalhe · Restos a Pagar e Caixa">
      <Breadcrumb crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Análise por bloco' }, { label: 'Restos a Pagar & Caixa' }]} source="fonte: RGF Anexo 5 · RREO Anexo 7" />

      {/* Header */}
      <Card style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Disponibilidade de caixa líquida · total</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 38, fontWeight: 600, letterSpacing: '-0.03em' }}>R$ {fmt(totalLiq, 1)}<span style={{ fontSize: 20, color: colors.muted }}> M</span></div>
          <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 6 }}>após inscrição em RPNP · consolidado de todas as fontes</div>
        </div>
        <div style={{ width: 1, alignSelf: 'stretch', background: colors.border }} />
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ padding: '12px 16px', background: colors.redBg, borderRadius: 6, borderLeft: `3px solid ${colors.red}` }}>
            <div style={{ fontSize: 9.5, color: '#A33', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>Fontes com insuficiência</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 700, color: colors.red }}>{insuf}</span>
              <span style={{ fontSize: 11, color: '#A33' }}>de 6 fontes</span>
            </div>
          </div>
          <div style={{ padding: '12px 16px', background: colors.orangeBg, borderRadius: 6, borderLeft: `3px solid ${colors.orange}` }}>
            <div style={{ fontSize: 9.5, color: '#B5601F', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>RPNP sem lastro</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 700, color: colors.orange }}>R$ {fmt(semLastro, 1)}</span>
              <span style={{ fontSize: 11, color: '#B5601F' }}>M · risco penal art. 359-C CP</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Matriz de suficiência */}
      <Card pad={0}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 18px 12px' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Matriz de suficiência financeira por fonte</div>
          <span style={{ fontSize: 8.5, padding: '1px 6px', background: colors.orangeBg, color: colors.orange, borderRadius: 2, fontWeight: 600, letterSpacing: '0.04em' }}>ASSINATURA</span>
          <span style={{ marginLeft: 'auto', fontSize: 10.5, color: colors.muted }}>a análise é <b>fonte a fonte</b> — nunca consolidada</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 1fr 1fr', padding: '7px 18px', background: colors.bg, borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`, fontSize: 9.5, fontWeight: 600, color: colors.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          <div>Fonte / destinação</div>
          <div style={{ textAlign: 'right' }}>Disponível</div>
          <div style={{ textAlign: 'right' }}>Obrigações</div>
          <div style={{ textAlign: 'right' }}>Resultado</div>
          <div style={{ textAlign: 'center' }}>Status</div>
        </div>
        {fontes.map((f) => {
          const resultado = f.disp - f.obrig;
          const neg = resultado < 0;
          return (
            <div key={f.fonte} style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 1fr 1fr', padding: '10px 18px', borderBottom: `1px solid ${colors.rowBorder}`, fontSize: 12, alignItems: 'center', background: neg ? '#FDF4F4' : 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 4, height: 22, background: neg ? colors.red : colors.green, borderRadius: 2 }} />
                <span style={{ fontWeight: 500 }}>{f.fonte}</span>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", textAlign: 'right' }}>{fmt(f.disp, 1)}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", textAlign: 'right', color: colors.muted }}>{fmt(f.obrig, 1)}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", textAlign: 'right', fontWeight: 600, color: neg ? colors.red : colors.green }}>{resultado >= 0 ? '+' : '−'}R$ {fmt(Math.abs(resultado), 1)}</div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <span style={{ fontSize: 9.5, padding: '2px 8px', borderRadius: 3, fontWeight: 600, background: neg ? colors.redBg : colors.greenBg, color: neg ? colors.red : colors.green, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{neg ? 'Insuficiente' : 'Suficiente'}</span>
              </div>
            </div>
          );
        })}
      </Card>

      {/* Art 42 + memória */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 12 }}>
        <Card accent={colors.red} style={{ border: '1px solid #E0A0A0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Painel do art. 42 LRF</div>
            <span style={{ fontSize: 8.5, padding: '1px 6px', background: colors.redBg, color: colors.red, borderRadius: 2, fontWeight: 600, letterSpacing: '0.04em' }}>FIM DE MANDATO</span>
          </div>
          <div style={{ fontSize: 10.5, color: colors.muted, marginBottom: 14, lineHeight: 1.45 }}>Nos 2 últimos quadrimestres é vedado contrair obrigação sem caixa. Descumprir = crime (art. 359-C CP).</div>
          <div style={{ textAlign: 'center', padding: 14, background: '#FDF4F4', borderRadius: 6 }}>
            <div style={{ fontSize: 9.5, color: '#A33', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>Janela de vedação encerra em</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 30, fontWeight: 700, color: colors.red, marginTop: 4 }}>184 dias</div>
            <div style={{ fontSize: 10.5, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>31 dez 2026</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            <Line k="Obrigações contraídas" v="R$ 1.847,2 M" />
            <Line k="Disponibilidade p/ lastro" v="R$ 1.624,8 M" />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, paddingTop: 8, borderTop: `2px solid ${colors.red}` }}>
              <span style={{ fontWeight: 600, color: colors.red }}>Lacuna sem lastro</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: colors.red }}>−R$ 222,4 M</span>
            </div>
          </div>
        </Card>

        <Card>
          <SectionLabel>Memória · disponibilidade líquida</SectionLabel>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <tbody>
              {[['Disponibilidade de caixa bruta', 'R$ 5.218,4', false], ['(−) Restos a pagar processados', '−2.142,6', true], ['(−) Demais obrigações financeiras', '−486,3', true], ['(−) Inscrição em RPNP do exercício', '−512,8', true], ['= Disp. líquida após inscrição', 'R$ 2.076,7', false]].map(([l, v, ded], i, arr) => {
                const total = i === arr.length - 1;
                return (
                  <tr key={l as string} style={{ borderTop: total ? `2px solid ${colors.primary}` : 'none', borderBottom: total ? 'none' : `1px dashed ${colors.borderSoft}`, background: total ? colors.accentSoft : 'transparent' }}>
                    <td style={{ padding: '8px 4px', fontWeight: total ? 600 : 400, color: ded ? colors.muted : colors.ink }}>{l}</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: total ? 700 : 400, color: ded ? colors.red : total ? colors.primary : colors.ink }}>{v}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
      <span style={{ color: colors.muted }}>{k}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>{v}</span>
    </div>
  );
}
