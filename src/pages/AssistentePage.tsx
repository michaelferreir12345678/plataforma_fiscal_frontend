import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../theme';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';

type Scope = 'data' | 'norma' | 'missing';

interface Thread {
  question: string;
  scope: Scope;
  answer: string;
  highlights: string[];
  chips: { ind: string; period: string; norma: string }[];
  drill?: { label: string; to: string };
}

const threads: Record<string, Thread> = {
  pessoal: {
    question: 'Por que minha despesa de pessoal subiu neste quadrimestre?',
    scope: 'data',
    answer:
      'A despesa de pessoal passou de 52,61% para 52,82% da RCL (+0,21 p.p.). A variação vem de dois fatores nos seus dados: os inativos e pensionistas do RPPS cresceram +6,8% a/a (R$ 985,3 M) e a terceirização classificada como pessoal subiu +12,4%. Como você está na faixa prudencial, aplicam-se as vedações do art. 22, P.U. da LRF.',
    highlights: ['52,61%', '52,82%', '+0,21 p.p.', 'R$ 985,3 M'],
    chips: [
      { ind: 'Pessoal', period: 'RGF 2º quad/2025', norma: 'LRF art. 20' },
      { ind: 'Composição', period: 'RREO 2º bim', norma: '—' },
    ],
    drill: { label: 'Ver no Monitor de Limites', to: '/limites' },
  },
  faixa: {
    question: 'Estou na faixa de alerta — e daí? O que muda?',
    scope: 'norma',
    answer:
      'Explicação geral da norma: a LRF define três faixas para a despesa de pessoal. A faixa de alerta começa em 90% do limite (art. 59). No seu caso você já está na faixa prudencial (95%, art. 22, P.U.), onde passam a valer vedações concretas: proibido conceder aumento, criar cargo, alterar carreira que gere aumento e contratar hora extra.',
    highlights: [],
    chips: [
      { ind: '—', period: '—', norma: 'LRF art. 22 e 59' },
      { ind: 'Pessoal', period: 'RGF 2º quad/2025', norma: '—' },
    ],
    drill: { label: 'Ver providências', to: '/limites' },
  },
  rcl: {
    question: 'Qual a tendência da minha RCL para fechar o ano?',
    scope: 'data',
    answer:
      'Sua RCL está em R$ 12.847,3 M (12 meses móveis), +3,2% sobre o período anterior. Mantida a trajetória, a projeção de fechamento é favorável — mas atenção: 66% da sua receita é transferida (FPM responde por 22,8%), o que adiciona volatilidade. A projeção carrega intervalo de confiança; não trato isso como número fechado.',
    highlights: ['R$ 12.847,3 M', '+3,2%', '66%', '22,8%'],
    chips: [
      { ind: 'RCL', period: 'RREO Anexo 3', norma: 'LRF art. 2º, IV' },
      { ind: 'Dependência', period: '2º bim/2025', norma: '—' },
    ],
    drill: { label: 'Abrir Previsões & Cenários', to: '/previsoes' },
  },
  ausente: {
    question: 'Como está o resultado do RGF do 3º quadrimestre?',
    scope: 'missing',
    answer:
      'Não tenho esse dado. O RGF do 3º quadrimestre de 2025 ainda não foi transmitido ao SICONFI — o prazo é 30/01/2026. Não vou estimar o resultado para não induzir decisão sobre número inexistente. O dado mais recente é o RGF do 2º quadrimestre. Quando a entrega for homologada, este indicador é atualizado automaticamente.',
    highlights: [],
    chips: [{ ind: 'Conformidade', period: 'pendente', norma: 'LRF art. 55' }],
    drill: { label: 'Ver calendário em Alertas', to: '/alertas' },
  },
};

const scopeMap: Record<Scope, { label: string; color: string; bg: string }> = {
  data: { label: 'Calculado dos seus dados', color: colors.primary, bg: colors.accentSoft },
  norma: { label: 'Explicação geral da norma', color: colors.neutral, bg: colors.neutralBg },
  missing: { label: 'Dado ausente — não estimado', color: colors.orange, bg: colors.orangeBg },
};

function renderAnswer(text: string, highlights: string[]) {
  if (highlights.length === 0) return text;
  const re = new RegExp(`(${highlights.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  return text.split(re).map((part, i) =>
    highlights.includes(part) ? (
      <span key={i} title="Rastrear até a fonte" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: colors.primary, background: colors.accentSoft, padding: '0 4px', borderRadius: 3, cursor: 'pointer', borderBottom: `1px dashed ${colors.primary}` }}>
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function AssistentePage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<string | null>(null);
  const t = active ? threads[active] : null;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }} data-screen-label="Assistente de IA">
      {/* header */}
      <Card pad={0} style={{ borderRadius: '6px 6px 0 0', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px' }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: colors.primaryGrad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} stroke={colors.bg}><path d="M8 2l1.5 4.5L14 8l-4.5 1.5L8 14l-1.5-4.5L2 8l4.5-1.5z" /></Icon>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Assistente fiscal · Erário</div>
          <div style={{ fontSize: 10.5, color: colors.muted }}>consultor fundamentado · responde só a partir dos seus dados e da norma</div>
        </div>
        {active && <button onClick={() => setActive(null)} style={{ fontSize: 10.5, color: colors.muted, padding: '5px 10px', border: `1px solid ${colors.border}`, borderRadius: 4 }}>Nova conversa</button>}
      </Card>

      {/* transcript */}
      <div style={{ flex: 1, overflowY: 'auto', background: colors.surfaceAlt, borderLeft: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, padding: 18, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 340 }}>
        <div style={{ display: 'flex', gap: 12, maxWidth: 760 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={15} stroke={colors.bg}><path d="M8 2l1.5 4.5L14 8l-4.5 1.5L8 14l-1.5-4.5L2 8l4.5-1.5z" /></Icon>
          </div>
          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '4px 12px 12px 12px', padding: '14px 16px', fontSize: 13, lineHeight: 1.55 }}>
            Olá, Marina. Sou o assistente fiscal do Erário. Respondo a partir dos indicadores já calculados de Fortaleza e do corpo normativo. Toda resposta traz a fonte — e quando não tenho o dado, eu <b>aviso em vez de adivinhar</b>.
          </div>
        </div>

        {t && (
          <>
            <div className="fade-in" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <div style={{ background: colors.primary, color: colors.bg, borderRadius: '12px 4px 12px 12px', padding: '12px 16px', fontSize: 13, lineHeight: 1.5, maxWidth: 560 }}>{t.question}</div>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: colors.primaryGrad, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>MV</div>
            </div>
            <div className="fade-in" style={{ display: 'flex', gap: 12, maxWidth: 760 }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={15} stroke={colors.bg}><path d="M8 2l1.5 4.5L14 8l-4.5 1.5L8 14l-1.5-4.5L2 8l4.5-1.5z" /></Icon>
              </div>
              <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '4px 12px 12px 12px', overflow: 'hidden', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 16px', background: scopeMap[t.scope].bg, borderBottom: `1px solid ${colors.border}` }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: scopeMap[t.scope].color }} />
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: scopeMap[t.scope].color, letterSpacing: '0.03em' }}>{scopeMap[t.scope].label}</span>
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}>{renderAnswer(t.answer, t.highlights)}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${colors.borderSoft}` }}>
                    <span style={{ fontSize: 9, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, alignSelf: 'center' }}>Fontes:</span>
                    {t.chips.map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 9px', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 4 }}>
                        <Icon size={11} stroke={colors.muted}><rect x="3" y="2" width="10" height="12" rx="1" /><path d="M5.5 5.5h5M5.5 8h5" /></Icon>
                        <span style={{ fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace", color: colors.ink, fontWeight: 500 }}>{c.ind}</span>
                        <span style={{ fontSize: 10, color: colors.faint }}>· {c.period}</span>
                        <span style={{ fontSize: 10, color: colors.primary, fontWeight: 500 }}>· {c.norma}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    {t.drill && (
                      <button onClick={() => navigate(t.drill!.to)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: colors.primary, color: colors.bg, borderRadius: 4, fontSize: 11.5, fontWeight: 500 }}>
                        {t.drill.label}
                        <Icon size={11} viewBox="0 0 12 12"><path d="M3 6h6M7 4l2 2-2 2" /></Icon>
                      </button>
                    )}
                    <button onClick={() => navigate('/relatorios')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', border: `1px solid ${colors.border}`, color: colors.primary, borderRadius: 4, fontSize: 11.5, fontWeight: 500 }}>
                      <Icon size={12}><rect x="3" y="2" width="10" height="12" rx="1" /><path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" /></Icon>
                      Gerar resumo executivo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* composer */}
      <Card pad={0} style={{ borderRadius: '0 0 6px 6px', borderTop: 'none', padding: '14px 18px' }}>
        <div style={{ fontSize: 9.5, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Perguntas sugeridas · contexto Fortaleza</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {[
            ['pessoal', 'Por que minha despesa de pessoal subiu?'],
            ['faixa', 'Estou na faixa de alerta — e daí?'],
            ['rcl', 'Qual a tendência da minha RCL?'],
            ['ausente', 'Resultado do RGF do 3º quadrimestre?'],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setActive(key)} style={{ textAlign: 'left', padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 12, background: colors.bg }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="text" placeholder="Pergunte sobre seus indicadores ou a norma…" style={{ flex: 1, fontSize: 13, padding: '11px 14px', border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.bg, color: colors.ink }} />
          <button style={{ width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.primary, borderRadius: 6, flexShrink: 0 }}>
            <Icon size={18} stroke={colors.bg} sw={1.6}><path d="M2 8h10M8 4l4 4-4 4" /></Icon>
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 10, color: colors.faint }}>
          <Icon size={12} stroke={colors.faint}><circle cx="8" cy="8" r="6" /><path d="M8 5v3.5M8 11v0.1" /></Icon>
          O assistente explica e aponta a fonte; não emite parecer jurídico ou financeiro definitivo. A decisão é sua.
        </div>
      </Card>
    </div>
  );
}
