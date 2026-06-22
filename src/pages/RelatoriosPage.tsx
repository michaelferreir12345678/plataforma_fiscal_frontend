import { useState } from 'react';
import { colors } from '../theme';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';

const templates = [
  { key: 'executivo', nome: 'Resumo Executivo', publico: 'Prefeito · Gabinete', desc: 'Visão de 1 página: semáforo, KPIs e destaques.', icon: 'M3 3h10v10H3z M5 6h6M5 8.5h6M5 11h3', secoes: 5, formal: 'Sintético' },
  { key: 'limites', nome: 'Relatório de Limites Legais', publico: 'Controlador · TCE/TCM', desc: 'Memória de cálculo de cada limite da LRF, rastreável.', icon: 'M8 1.5l5.5 2v4c0 4-2.5 6-5.5 7-3-1-5.5-3-5.5-7v-4z', secoes: 9, formal: 'Formal' },
  { key: 'comparativo', nome: 'Comparativo / Benchmark', publico: 'Consultoria', desc: 'Posição do ente vs. pares, percentis e ranking.', icon: 'M3 13V8M6.5 13V4M10 13V6.5M13.5 13V9.5', secoes: 6, formal: 'Analítico' },
  { key: 'conformidade', nome: 'Relatório de Conformidade', publico: 'Sefaz · Controle', desc: 'Status de entregas SICONFI, prazos e pendências.', icon: 'M3 4h10M3 8h10M3 12h7', secoes: 4, formal: 'Formal' },
  { key: 'boletim', nome: 'Boletim Periódico', publico: 'Recorrente · Carteira', desc: 'Boletim mensal/bimestral automático por ente.', icon: 'M2.5 3.5h11v9h-11z M2.5 6.5h11M5 9h6', secoes: 7, formal: 'Sintético' },
];

const secoes = [
  { nome: 'Cabeçalho institucional', fonte: 'identificação + timestamp', on: true },
  { nome: 'Semáforo de limites LRF', fonte: 'RGF 2º quad/2025', on: true },
  { nome: 'KPIs do período', fonte: 'RREO 2º bim/2025', on: true },
  { nome: 'Despesa de pessoal · memória', fonte: 'RGF Anexo 1-3', on: true },
  { nome: 'Dívida & CAPAG', fonte: 'RGF Anexo 2 · STN', on: false },
  { nome: 'Resultado fiscal', fonte: 'RREO Anexo 6', on: false },
  { nome: 'Destaques e riscos (IA)', fonte: 'gerado · revisar', on: true },
];

const batch = [
  { ente: 'Fortaleza', status: 'concluído', color: colors.green, pct: 100 },
  { ente: 'Caucaia', status: 'concluído', color: colors.green, pct: 100 },
  { ente: 'Juazeiro do Norte', status: 'gerando', color: colors.orange, pct: 64 },
  { ente: 'Sobral', status: 'na fila', color: colors.faint, pct: 0 },
  { ente: 'Crato', status: 'na fila', color: colors.faint, pct: 0 },
];

const history = [
  { nome: 'Resumo Executivo · Fortaleza', data: '30/05/2025 14:22', fmt: 'PDF', resp: 'M. Vasconcelos', status: 'Gerado', color: colors.green },
  { nome: 'Relatório de Limites · Fortaleza', data: '30/05/2025 09:10', fmt: 'PDF', resp: 'M. Vasconcelos', status: 'Gerado', color: colors.green },
  { nome: 'Boletim Mensal · 184 entes', data: '01/05/2025 06:00', fmt: 'PDF · lote', resp: 'Agendado', status: 'Lote', color: colors.orange },
  { nome: 'Comparativo NE · Fortaleza', data: '28/04/2025 16:45', fmt: 'XLSX', resp: 'J. Andrade', status: 'Gerado', color: colors.green },
];

export function RelatoriosPage() {
  const [template, setTemplate] = useState('executivo');
  const [scope, setScope] = useState<'ente' | 'lote'>('ente');
  const [format, setFormat] = useState('pdf');
  const active = templates.find((t) => t.key === template)!;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Relatórios e Exportação">
      <Card style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px' }} pad={0}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Relatórios &amp; Exportação</div>
          <div style={{ fontSize: 11, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>geração curada e rastreável · individual ou em lote</div>
        </div>
        <div style={{ flex: 1 }} />
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
          <Icon size={13}><circle cx="8" cy="8" r="6" /><path d="M8 5v3l2 2" /></Icon>
          Agendar recorrente
        </button>
      </Card>

      {/* Galeria de modelos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {templates.map((t) => {
          const sel = t.key === template;
          return (
            <button key={t.key} onClick={() => setTemplate(t.key)} style={{ textAlign: 'left', padding: 14, borderRadius: 6, border: sel ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`, background: sel ? '#F4F8F5' : colors.surface }}>
              <div style={{ width: 34, height: 34, borderRadius: 7, background: colors.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Icon size={18} stroke={colors.primary} sw={1.4}><path d={t.icon} /></Icon>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.25 }}>{t.nome}</div>
              <div style={{ fontSize: 10, color: colors.primary, fontWeight: 500, marginTop: 4 }}>{t.publico}</div>
              <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 6, lineHeight: 1.4 }}>{t.desc}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, fontSize: 9.5, color: colors.faint, fontFamily: "'JetBrains Mono', monospace" }}>
                <span>{t.secoes} seções</span><span>·</span><span>{t.formal}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 12 }}>
        {/* Construtor */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Construtor</div>
            <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>{active.nome} · {active.publico}</div>
          </div>
          <Field label="Escopo">
            <div style={{ display: 'flex', gap: 8 }}>
              {(['ente', 'lote'] as const).map((s) => (
                <button key={s} onClick={() => setScope(s)} style={{ flex: 1, padding: 8, borderRadius: 4, fontSize: 11.5, fontWeight: scope === s ? 600 : 400, background: scope === s ? colors.primary : colors.bg, color: scope === s ? colors.bg : colors.muted, border: scope === s ? 'none' : `1px solid ${colors.border}` }}>
                  {s === 'ente' ? 'Ente único' : 'Lote · carteira'}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Período">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: 4, background: colors.bg }}>
              <Icon size={13} stroke={colors.muted}><rect x="2.5" y="3.5" width="11" height="10" rx="1" /><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" /></Icon>
              <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>2025 · 2º quadrimestre</span>
            </div>
          </Field>
          <Field label="Seções incluídas">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {secoes.map((s) => (
                <div key={s.nome} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 4 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 3, border: `1.5px solid ${s.on ? colors.primary : '#DAD6CA'}`, background: s.on ? colors.primary : colors.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {s.on && <Icon size={10} viewBox="0 0 12 12" stroke={colors.bg} sw={2}><path d="M2 6l3 3 5-6" /></Icon>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{s.nome}</div>
                    <div style={{ fontSize: 9.5, color: colors.faint, fontFamily: "'JetBrains Mono', monospace" }}>{s.fonte}</div>
                  </div>
                </div>
              ))}
            </div>
          </Field>
          <Field label="Formato">
            <div style={{ display: 'flex', gap: 6 }}>
              {[['pdf', 'PDF'], ['xlsx', 'Excel'], ['pptx', 'Slides']].map(([k, l]) => (
                <button key={k} onClick={() => setFormat(k)} style={{ flex: 1, padding: 8, borderRadius: 4, fontSize: 11.5, fontWeight: 500, background: format === k ? colors.primary : colors.bg, color: format === k ? colors.bg : colors.muted, border: format === k ? 'none' : `1px solid ${colors.border}` }}>
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, background: colors.primary, color: colors.bg, borderRadius: 5, fontSize: 13.5, fontWeight: 600 }}>
            <Icon size={15} stroke={colors.bg} sw={1.6}><path d="M8 2v8M5 7l3 3 3-3M3 13h10" /></Icon>
            Gerar relatório
          </button>
        </Card>

        {/* Preview / batch */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {scope === 'lote' && (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Painel de geração em lote</div>
                <span style={{ fontSize: 9, padding: '2px 7px', background: colors.orangeBg, color: colors.orange, borderRadius: 2, fontWeight: 600 }}>5 ENTES NA FILA</span>
                <button style={{ marginLeft: 'auto', fontSize: 11, color: colors.primary, fontWeight: 500, padding: '5px 10px', border: `1px solid ${colors.border}`, borderRadius: 4 }}>Baixar tudo (.zip)</button>
              </div>
              {batch.map((b) => (
                <div key={b.ente} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${colors.rowBorder}` }}>
                  <span style={{ fontSize: 12, fontWeight: 500, width: 160 }}>{b.ente}</span>
                  <div style={{ flex: 1, height: 6, background: colors.borderSoft, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${b.pct}%`, background: b.color }} />
                  </div>
                  <span style={{ fontSize: 10.5, color: b.color, fontWeight: 500, width: 80, textAlign: 'right' }}>{b.status}</span>
                </div>
              ))}
            </Card>
          )}

          <Card style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Pré-visualização ao vivo</div>
              <span style={{ fontSize: 10, color: colors.faint, fontFamily: "'JetBrains Mono', monospace" }}>A4 · formal</span>
            </div>
            <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, boxShadow: '0 2px 12px rgba(15,26,20,.06)', borderRadius: 3, padding: '28px 32px', maxWidth: 620, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 14, borderBottom: `2px solid ${colors.primary}` }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 4, background: colors.primaryGrad, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>FOR</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Município de Fortaleza · CE</div>
                    <div style={{ fontSize: 10, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>Sec. Municipal de Finanças · CNPJ 07.954.605/0001-60</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{active.nome}</div>
                  <div style={{ fontSize: 9.5, color: colors.faint, fontFamily: "'JetBrains Mono', monospace" }}>2025 · 2º quadrimestre</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, padding: '8px 12px', marginTop: 10, background: colors.bg, borderRadius: 4 }}>
                <Trace label="Fonte" value="SICONFI · RREO/RGF" />
                <Trace label="Gerado em" value="19/06/2025 09:14" />
                <Trace label="Responsável" value="M. Vasconcelos" />
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.primary, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>1 · Semáforo de Limites Legais</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {[['Pessoal · Executivo', '52,82%', colors.orangeBg, colors.orange], ['Dívida Consolidada', '87,10%', colors.greenBg, colors.green], ['Saúde · ASPS', '16,42%', colors.greenBg, colors.green], ['Educação · MDE', '28,13%', colors.greenBg, colors.green]].map(([l, v, bg, c]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: bg, borderRadius: 3 }}>
                      <span style={{ fontSize: 11 }}>{l}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: c }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 9, color: colors.faint, marginTop: 8, fontStyle: 'italic' }}>Cada valor referencia o anexo SICONFI de origem · sem número órfão.</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Histórico */}
      <Card pad={0}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 10px' }}>
          <Icon size={14} stroke={colors.primary}><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" /></Icon>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Histórico de relatórios</div>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>versionado · reproduzível p/ auditoria</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 1fr 0.8fr', padding: '6px 16px', background: colors.bg, borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`, fontSize: 9.5, fontWeight: 600, color: colors.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          <div>Relatório</div><div>Gerado em</div><div>Formato</div><div>Responsável</div><div style={{ textAlign: 'center' }}>Status</div>
        </div>
        {history.map((h) => (
          <div key={h.nome} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 1fr 0.8fr', padding: '9px 16px', borderBottom: `1px solid ${colors.rowBorder}`, fontSize: 12, alignItems: 'center' }}>
            <div style={{ fontWeight: 500 }}>{h.nome}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: colors.muted }}>{h.data}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: colors.muted }}>{h.fmt}</div>
            <div style={{ fontSize: 11.5, color: colors.muted }}>{h.resp}</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{ fontSize: 9.5, padding: '2px 8px', borderRadius: 3, fontWeight: 600, background: h.status === 'Lote' ? colors.orangeBg : colors.greenBg, color: h.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h.status}</span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Trace({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ fontSize: 9, color: colors.faint }}>
      <span style={{ letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", color: colors.ink, fontSize: 10 }}>{value}</div>
    </div>
  );
}
