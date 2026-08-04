/**
 * Assistente fiscal (Módulo 15) — ligado ao backend real (Sprint 17).
 * RAG fundamentado: responde a partir dos indicadores já calculados do ente (gold) e do
 * corpo normativo (LRF/CF/MDF), sempre com source_ref. Distingue "calculado dos seus
 * dados" de "explicação geral da norma" e sinaliza dado ausente em vez de adivinhar.
 * Falha do provedor (Gemini) degrada com erro claro — nunca uma resposta inventada.
 */
import { rotuloFaixa } from '../utils/rotulos';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { colors, font } from '../theme';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { RespostaMarkdown } from '../components/RespostaMarkdown';
import { PageHeader } from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import {
  fetchAssistenteUso,
  fetchConversas,
  gerarResumoExecutivo,
  perguntarAssistente,
  type AssistFato,
  type AssistResposta,
  type AssistUsoResumo,
  type ConversaResumo,
  type SourceRef,
} from '../services/backend';

type Scope = 'data' | 'norma' | 'missing';

interface Turn {
  key: string;
  pergunta: string;
  resposta: AssistResposta;
}

const scopeMap: Record<Scope, { label: string; color: string; bg: string }> = {
  data: { label: 'Calculado dos seus dados', color: colors.primary, bg: colors.accentSoft },
  norma: { label: 'Explicação geral da norma', color: colors.neutral, bg: colors.neutralBg },
  missing: { label: 'Dado ausente — não estimado', color: colors.orange, bg: colors.orangeBg },
};

// codigo do indicador → tela de drill-down (rastreabilidade cruzada).
const DRILL: Record<string, { to: string; label: string }> = {
  rcl: { to: '/receita', label: 'Ver Receita & RCL' },
  pessoal_executivo: { to: '/limites', label: 'Ver Monitor de Limites' },
  divida_consolidada_liquida: { to: '/divida', label: 'Ver Dívida' },
  resultado_primario: { to: '/resultado', label: 'Ver Resultado Fiscal' },
  saude_asps: { to: '/saude-educacao', label: 'Ver Saúde & Educação' },
  educacao_mde: { to: '/saude-educacao', label: 'Ver Saúde & Educação' },
};

const SUGESTOES: string[] = [
  'Como está a despesa com pessoal do Executivo e qual o limite?',
  'Qual a Receita Corrente Líquida e o que ela significa?',
  'A dívida consolidada está dentro do limite?',
  'Estou cumprindo os mínimos de saúde e educação?',
];

function scopeOf(r: AssistResposta): Scope {
  if (r.recusa) return 'missing';
  if (r.dado_disponivel) return 'data';
  if (r.normas.length > 0) return 'norma';
  return 'missing';
}

function fmtSource(ref: SourceRef | null): string {
  if (!ref) return '';
  const parts = [ref.relatorio];
  if (ref.anexo) parts.push(ref.anexo);
  if (ref.periodo) parts.push(ref.periodo);
  if (ref.versao_entrega) parts.push(`v.${ref.versao_entrega}`);
  return parts.join(' · ');
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
}

function SparkIcon({ size = 16 }: { size?: number }) {
  return (
    <Icon size={size} stroke={colors.bg}>
      <path d="M8 2l1.5 4.5L14 8l-4.5 1.5L8 14l-1.5-4.5L2 8l4.5-1.5z" />
    </Icon>
  );
}

function FatoRow({ f }: { f: AssistFato }) {
  const faixaCor = f.faixa === 'maximo' || f.faixa === 'abaixo_minimo' ? colors.red : f.faixa === 'prudencial' ? colors.orange : f.faixa === 'atencao' ? colors.yellowText : colors.green;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '8px 10px', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 5 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 11.5, color: colors.ink, fontWeight: 500 }}>{f.rotulo}</span>
        <span style={{ fontSize: 12, fontFamily: font.mono, fontWeight: 600, color: f.disponivel ? colors.primary : colors.faint }}>
          {f.disponivel ? f.valor_formatado : 'Dado não disponível'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {f.faixa && (
          <span style={{ fontSize: 11, fontWeight: 600, color: faixaCor, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 3, padding: '1px 5px', letterSpacing: '0.03em' }}>{rotuloFaixa(f.faixa)}</span>
        )}
        <span style={{ fontSize: 11, color: colors.faint, fontFamily: font.mono }}>{fmtSource(f.source_ref)}</span>
        {f.as_of && <span style={{ fontSize: 11, color: colors.faint }}>· as_of {fmtDate(f.as_of)}</span>}
      </div>
    </div>
  );
}

function AnswerBubble({ turn, onResumo, resumindo }: { turn: Turn; onResumo: () => void; resumindo: boolean }) {
  const navigate = useNavigate();
  const r = turn.resposta;
  const scope = scopeOf(r);
  const disponiveis = r.fatos.filter((f) => f.disponivel);
  const ausentes = r.fatos.filter((f) => !f.disponivel);
  const drills = Array.from(
    new Map(disponiveis.filter((f) => DRILL[f.codigo]).map((f) => [DRILL[f.codigo].to, DRILL[f.codigo]])).values(),
  );

  return (
    <>
      {/* pergunta do gestor */}
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <div style={{ background: colors.primary, color: colors.bg, borderRadius: '12px 4px 12px 12px', padding: '12px 16px', fontSize: 13, lineHeight: 1.5, maxWidth: 560 }}>{turn.pergunta}</div>
      </div>

      {/* resposta */}
      <div className="fade-in" style={{ display: 'flex', gap: 12, maxWidth: 780 }}>
        <div style={{ width: 30, height: 30, borderRadius: 7, background: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <SparkIcon size={15} />
        </div>
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '4px 12px 12px 12px', overflow: 'hidden', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 16px', background: scopeMap[scope].bg, borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: scopeMap[scope].color }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: scopeMap[scope].color, letterSpacing: '0.03em' }}>{scopeMap[scope].label}</span>
            {r.titulo && <span style={{ fontSize: 11, color: colors.faint, marginLeft: 'auto' }}>{r.titulo} · {r.periodo}</span>}
          </div>

          <div style={{ padding: '14px 16px' }}>
            {/* O modelo responde em Markdown; renderizar como texto puro deixava
                `**negrito**` e `### título` à mostra para o gestor. */}
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              <RespostaMarkdown texto={r.resposta} fatos={disponiveis} />
            </div>

            {/* fatos calculados */}
            {r.fatos.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
                {disponiveis.map((f) => <FatoRow key={f.codigo} f={f} />)}
                {ausentes.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', background: colors.orangeBg, border: `1px solid ${colors.orangeSoft}`, borderRadius: 5 }}>
                    <Icon size={12} stroke={colors.orange}><circle cx="8" cy="8" r="6" /><path d="M8 5v3.5M8 11v0.1" /></Icon>
                    <span style={{ fontSize: 11, color: colors.orange }}>
                      Sem dado materializado: {ausentes.map((f) => f.rotulo).join(' · ')}. Não estimado.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* fundamentação normativa */}
            {r.normas.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${colors.borderSoft}` }}>
                <div style={{ fontSize: 11, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Fundamentação normativa</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {r.normas.map((n) => (
                    <div key={n.dispositivo} style={{ fontSize: 11, lineHeight: 1.5, color: colors.muted }}>
                      <span style={{ color: colors.primary, fontWeight: 600 }}>{n.dispositivo}</span>
                      {n.titulo && <span style={{ color: colors.ink }}> — {n.titulo}</span>}: {n.trecho}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* chips de fonte */}
            {r.fontes.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${colors.borderSoft}` }}>
                <span style={{ fontSize: 11, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, alignSelf: 'center' }}>Fontes:</span>
                {r.fontes.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 9px', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 4 }}>
                    <Icon size={11} stroke={c.tipo === 'norma' ? colors.primary : colors.muted}><rect x="3" y="2" width="10" height="12" rx="1" /><path d="M5.5 5.5h5M5.5 8h5" /></Icon>
                    <span style={{ fontSize: 11, fontFamily: font.mono, color: colors.ink, fontWeight: 500 }}>{c.rotulo}</span>
                    {c.detalhe && <span style={{ fontSize: 11, color: colors.faint }}>· {c.detalhe}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* ações de drill + resumo */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              {drills.map((d) => (
                <button type="button" key={d.to} onClick={() => navigate(d.to)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: colors.primary, color: colors.bg, borderRadius: 4, fontSize: 11.5, fontWeight: 500 }}>
                  {d.label}
                  <Icon size={11} viewBox="0 0 12 12"><path d="M3 6h6M7 4l2 2-2 2" /></Icon>
                </button>
              ))}
              {r.tipo === 'pergunta' && (
                <button type="button" onClick={onResumo} disabled={resumindo} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', border: `1px solid ${colors.border}`, color: colors.primary, borderRadius: 4, fontSize: 11.5, fontWeight: 500, opacity: resumindo ? 0.6 : 1 }}>
                  <Icon size={12}><rect x="3" y="2" width="10" height="12" rx="1" /><path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" /></Icon>
                  {resumindo ? 'Gerando…' : 'Gerar resumo executivo'}
                </button>
              )}
            </div>

            {/* rodapé de proveniência (auditável) */}
            <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 11, color: colors.faint, flexWrap: 'wrap' }}>
              <span>modelo: {r.uso.modelo}</span>
              <span>tokens: {r.uso.tokens_entrada}→{r.uso.tokens_saida}</span>
              {r.uso.latencia_ms > 0 && <span>{r.uso.latencia_ms} ms</span>}
              {r.source_refs.length > 0 && <span>{r.source_refs.length} fonte(s) rastreável(is)</span>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Rota → nome da tela, para o chip "pergunte sobre esta tela" (Sprint 25E). */
const NOME_PAGINA: Record<string, string> = {
  '/receita': 'Receita',
  '/despesa': 'Despesa',
  '/pessoal': 'Pessoal',
  '/divida': 'Dívida',
  '/resultado': 'Resultado fiscal',
  '/caixa': 'Restos a pagar & caixa',
  '/saude-educacao': 'Saúde & Educação',
  '/limites': 'Monitor de limites',
  '/patrimonio': 'Patrimônio',
};

export function AssistentePage() {
  const { ente, periodo } = useApp();
  const [params] = useSearchParams();
  // Chegou pelo atalho do shell: o assistente sabe de qual tela veio a pergunta.
  const paginaOrigem = params.get('de');
  const nomePagina = paginaOrigem ? NOME_PAGINA[paginaOrigem] ?? null : null;
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [conversas, setConversas] = useState<ConversaResumo[] | null>(null);
  const [thread, setThread] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [resumindo, setResumindo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uso, setUso] = useState<AssistUsoResumo | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const reloadUso = useCallback(() => {
    fetchAssistenteUso().then(setUso).catch(() => setUso(null));
  }, []);
  useEffect(() => reloadUso(), [reloadUso]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [thread, pending]);

  const errMsg = (e: unknown): string => {
    const x = e as { detail?: string; title?: string; message?: string };
    return x.detail || x.title || x.message || 'Falha ao consultar o assistente.';
  };

  const ask = useCallback(
    async (pergunta: string) => {
      const q = pergunta.trim();
      if (!q || pending) return;
      setPending(true);
      setError(null);
      setInput('');
      try {
        const resposta = await perguntarAssistente({
          ente: ente.cod_ibge,
          pergunta: q,
          periodo,
          // A tela de origem só pesa quando a pergunta não nomeia indicador (backend).
          pagina: paginaOrigem,
        });
        setThread((t) => [...t, { key: resposta.conversa_id, pergunta: q, resposta }]);
        reloadUso();
      } catch (e) {
        setError(errMsg(e));
      } finally {
        setPending(false);
      }
    },
    [ente.cod_ibge, periodo, pending, reloadUso, paginaOrigem],
  );

  const resumo = useCallback(async () => {
    if (resumindo) return;
    setResumindo(true);
    setError(null);
    try {
      const resposta = await gerarResumoExecutivo({ ente: ente.cod_ibge, periodo });
      setThread((t) => [
        ...t,
        { key: resposta.conversa_id, pergunta: `Resumo executivo · ${ente.nome} · ${periodo}`, resposta },
      ]);
      reloadUso();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setResumindo(false);
    }
  }, [ente.cod_ibge, ente.nome, periodo, resumindo, reloadUso]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }} data-screen-label="Assistente de IA">
      <PageHeader
        title={`Assistente fiscal · ${ente.nome}`}
        context={`RAG fundamentado · responde apenas a partir dos dados do ente (${periodo || 'sem período'}) e da norma`}
        source="Indicadores gold · LRF, Constituição Federal e MDF"
        actions={(
          <>
            {uso && (
              <div style={{ textAlign: 'right', fontSize: 11, color: colors.faint }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: colors.primary, fontFamily: font.mono }}>{uso.consultas} consultas</div>
                <div>IA · {uso.mes}</div>
              </div>
            )}
            {thread.length > 0 && (
              <button type="button" onClick={() => setThread([])} style={{ fontSize: 11, color: colors.muted, padding: '5px 10px', border: `1px solid ${colors.border}`, borderRadius: 4 }}>
                Nova conversa
              </button>
            )}
          </>
        )}
      />

      {/* transcript */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', background: colors.surfaceAlt, borderLeft: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, padding: 18, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 340 }}>
        <div style={{ display: 'flex', gap: 12, maxWidth: 780 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <SparkIcon size={15} />
          </div>
          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '4px 12px 12px 12px', padding: '14px 16px', fontSize: 13, lineHeight: 1.55 }}>
            Sou o assistente fiscal. Respondo a partir dos indicadores já calculados de <b>{ente.nome}</b> e do corpo normativo (LRF, CF, MDF). Toda resposta traz a fonte — e quando não tenho o dado, eu <b>aviso em vez de adivinhar</b>.
          </div>
        </div>

        {thread.map((turn) => (
          <AnswerBubble key={turn.key} turn={turn} onResumo={resumo} resumindo={resumindo} />
        ))}

        {pending && (
          <div className="fade-in" style={{ display: 'flex', gap: 12, alignItems: 'center', color: colors.muted, fontSize: 12, paddingLeft: 42 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors.primary, animation: 'pulse-soft 1.2s ease-in-out infinite' }} />
            Consultando indicadores e a norma…
          </div>
        )}

        {error && (
          <div className="fade-in" style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 14px', background: colors.redBg, border: `1px solid ${colors.redSoft}`, borderRadius: 6, maxWidth: 780 }}>
            <Icon size={14} stroke={colors.red}><circle cx="8" cy="8" r="6" /><path d="M8 5v3.5M8 11v0.1" /></Icon>
            <span style={{ fontSize: 12, color: colors.red }}>{error} — o assistente não inventa resposta quando a fonte falha.</span>
          </div>
        )}
      </div>

      {/* composer */}
      <Card pad={0} style={{ borderRadius: '0 0 6px 6px', borderTop: 'none', padding: '14px 18px' }}>
        {nomePagina && thread.length === 0 && (
          <div
            data-testid="contexto-pagina"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 12, borderRadius: 6, background: colors.accentSoft, color: colors.primary, fontSize: 11.5, lineHeight: 1.5 }}
          >
            <strong>Contexto: {nomePagina}.</strong> Perguntas sem indicador nomeado (“e isto
            aqui, está bom?”) são respondidas com os números desta tela; nomear outro assunto
            muda o contexto.
          </div>
        )}
        {thread.length === 0 && (
          <>
            <div style={{ fontSize: 11, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Perguntas sugeridas · {ente.nome}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {SUGESTOES.map((s) => (
                <button type="button" key={s} onClick={() => ask(s)} disabled={pending} style={{ textAlign: 'left', padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 12, background: colors.bg, opacity: pending ? 0.6 : 1 }}>
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
        <form onSubmit={(e) => { e.preventDefault(); ask(input); }} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre seus indicadores ou a norma…"
            disabled={pending}
            style={{ flex: 1, fontSize: 13, padding: '11px 14px', border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.bg, color: colors.ink }}
          />
          {/* O ícone não nomeia o botão para quem usa leitor de tela. */}
          <button type="submit" aria-label="Enviar pergunta" disabled={pending || !input.trim()} style={{ width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.primary, borderRadius: 6, flexShrink: 0, opacity: pending || !input.trim() ? 0.5 : 1 }}>
            <Icon size={18} stroke={colors.bg} sw={1.6}><path d="M2 8h10M8 4l4 4-4 4" /></Icon>
          </button>
        </form>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 11, color: colors.faint }}>
          <Icon size={12} stroke={colors.faint}><circle cx="8" cy="8" r="6" /><path d="M8 5v3.5M8 11v0.1" /></Icon>
          O assistente explica e aponta a fonte; não emite parecer jurídico ou financeiro definitivo. A decisão é sua.
          <button
            type="button"
            onClick={() => {
              setHistoricoAberto((v) => !v);
              if (conversas === null) {
                fetchConversas(20).then((r) => setConversas(r.itens)).catch(() => setConversas([]));
              }
            }}
            style={{ marginLeft: 'auto', border: `1px solid ${colors.border}`, background: colors.surface, borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer', color: colors.ink }}
          >
            {historicoAberto ? 'ocultar histórico' : 'histórico de conversas'}
          </button>
        </div>
        {historicoAberto && <HistoricoConversas itens={conversas} />}
      </Card>
    </div>
  );
}

/**
 * Histórico de conversas (Sprint 25E).
 *
 * `GET /assistant/conversas` existia desde a Sprint 17 e nenhuma tela o consumia
 * (auditoria §2.14). Ele responde a uma pergunta prática: **"o que já perguntamos aqui?"**
 * — inclusive as recusas, que são o registro de quando o assistente se negou a responder
 * por falta de fonte. Carregado sob demanda: histórico não precisa pesar a primeira tela.
 */
function HistoricoConversas({ itens }: { itens: ConversaResumo[] | null }) {
  if (itens === null) {
    return (
      <div style={{ marginTop: 10, fontSize: 11.5, color: colors.muted }}>Carregando histórico…</div>
    );
  }
  if (itens.length === 0) {
    return (
      <div data-testid="historico-conversas" style={{ marginTop: 10, fontSize: 11.5, color: colors.muted, lineHeight: 1.5 }}>
        Nenhuma conversa registrada nesta organização ainda.
      </div>
    );
  }
  return (
    <div data-testid="historico-conversas" style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
      {itens.map((c) => (
        <div key={c.id} style={{ padding: '7px 10px', border: `1px solid ${colors.rowBorder}`, borderRadius: 5, background: colors.bg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '1px 6px', borderRadius: 3, background: c.recusa ? colors.orangeBg : colors.accentSoft, color: c.recusa ? colors.orange : colors.primary }}>
              {c.recusa ? 'RECUSA FUNDAMENTADA' : c.tipo.toUpperCase()}
            </span>
            <span style={{ fontSize: 11, color: colors.faint, fontFamily: font.mono }}>
              {new Date(c.criado_em).toLocaleString('pt-BR')}
              {c.periodo ? ` · ${c.periodo}` : ''}
              {c.modelo ? ` · ${c.modelo}` : ''}
            </span>
          </div>
          <div style={{ fontSize: 11.5, marginTop: 4, color: colors.ink }}>{c.pergunta}</div>
        </div>
      ))}
    </div>
  );
}
