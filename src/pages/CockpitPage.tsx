/**
 * Cockpit Executivo Fiscal (Sprint 22) — 7 camadas em hierarquia de decisão.
 *
 * Ordem deliberada: (1) resumo — "estou bem?"; (2) críticos — "o que está apertado?";
 * (3) tendências — "para onde vai?"; (4) explicadores — "por que mudou?";
 * (5) comparações — "comparado a quê?"; (6) riscos — "o que fazer?";
 * (7) qualidade — "posso confiar nisto?".
 *
 * Linguagem sóbria: a severidade vem da faixa legal devolvida pelo backend, nunca de
 * adjetivo escolhido na UI. Onde não há base, a tela diz que não há — nunca mostra zero.
 */
import { colors } from '../theme';
import { Card } from '../components/Card';
import { Async } from '../components/AsyncState';
import { Sparkline } from '../components/Sparkline';
import { RadialMeter } from '../components/RadialMeter';
import { useApp, useResource } from '../context/AppContext';
import { fetchCockpit } from '../services/backend';
import type {
  ComparacaoItem,
  CriticoItem,
  ExplicadorItem,
  QualidadeFonte,
  RiscoItem,
  TendenciaItem,
} from '../services/backend';

const COR: Record<string, string> = {
  verde: colors.green,
  amarelo: colors.yellowText,
  laranja: colors.orange,
  vermelho: colors.red,
  cinza: colors.neutral,
};
const FUNDO: Record<string, string> = {
  verde: colors.greenBg,
  amarelo: colors.yellowBg,
  laranja: colors.orangeBg,
  vermelho: colors.redBg,
  cinza: colors.bg,
};
const ROTULO_FAROL: Record<string, string> = {
  conforme: 'Conforme',
  alerta: 'Em alerta',
  prudencial: 'Limite prudencial',
  critico: 'Limite excedido',
  sem_dados: 'Sem dados apurados',
};

const num = (v: number | null | undefined, casas = 2) =>
  v === null || v === undefined ? '—' : Number(v).toFixed(casas);
const pct = (v: number | null | undefined, casas = 2) =>
  v === null || v === undefined ? '—' : `${Number(v).toFixed(casas)}%`;
const brl = (v: number | null | undefined) =>
  v === null || v === undefined
    ? '—'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Number(v));
const sinal = (v: number | null | undefined) => (v !== null && v !== undefined && v > 0 ? '+' : '');

function Secao({ n, titulo, pergunta, children }: { n: number; titulo: string; pergunta: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace", color: colors.faint }}>
          {String(n).padStart(2, '0')}
        </span>
        <h2 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{titulo}</h2>
        <span style={{ fontSize: 11, color: colors.muted }}>{pergunta}</span>
      </div>
      {children}
    </section>
  );
}

function Fonte({ relatorio, anexo, periodo, versao }: { relatorio?: string | null; anexo?: string | null; periodo?: string | null; versao?: string | null }) {
  if (!relatorio) return null;
  return (
    <div style={{ fontSize: 9.5, color: colors.faint, fontFamily: "'JetBrains Mono', monospace", marginTop: 6 }}>
      fonte: {relatorio}
      {anexo ? ` · ${anexo}` : ''}
      {periodo ? ` · ${periodo}` : ''}
      {versao ? ` · v${versao}` : ''}
    </div>
  );
}

export function CockpitPage() {
  const { ente, periodo } = useApp();
  const res = useResource(
    () => (periodo ? fetchCockpit(ente.cod_ibge, periodo) : Promise.reject(new Error('Sem período com dado para este ente.'))),
    [ente.cod_ibge, periodo],
  );

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }} data-screen-label="Cockpit Executivo">
      <Async res={res}>
        {(c) => (
          <>
            {/* 1 — RESUMO */}
            <Secao n={1} titulo="Resumo" pergunta="estou bem?">
              <Card style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '16px 18px' }} pad={0}>
                <div
                  style={{
                    padding: '10px 16px', borderRadius: 6, background: FUNDO[c.resumo.cor] ?? colors.bg,
                    border: `1px solid ${COR[c.resumo.cor] ?? colors.border}`, textAlign: 'center', minWidth: 190,
                  }}
                >
                  <div style={{ fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.muted, fontWeight: 600 }}>
                    Situação
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: COR[c.resumo.cor] ?? colors.ink, marginTop: 2 }}>
                    {ROTULO_FAROL[c.resumo.farol] ?? c.resumo.farol}
                  </div>
                  <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>
                    {c.resumo.indicadores_avaliados} indicador(es) apurado(s)
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, color: colors.muted, marginBottom: 6 }}>
                    {c.nome} · {c.periodo}
                    {c.esfera ? ` · esfera ${c.esfera}` : ''} · {c.resumo.n_alertas} alerta(s)
                    {c.resumo.n_alertas_criticos > 0 ? ` (${c.resumo.n_alertas_criticos} crítico(s))` : ''}
                  </div>
                  {c.resumo.mudancas_relevantes.length === 0 ? (
                    <div style={{ fontSize: 12, color: colors.muted }}>
                      Sem base de comparação com o período anterior — nada a reportar como mudança.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {c.resumo.mudancas_relevantes.map((m) => (
                        <div key={m.indicador} style={{ fontSize: 12 }}>
                          <strong style={{ fontWeight: 600 }}>{m.rotulo}</strong>{' '}
                          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {pct(m.valor_anterior)} → {pct(m.valor_atual)}
                          </span>{' '}
                          <span style={{ color: (m.delta_pp ?? 0) > 0 ? colors.orange : colors.green }}>
                            ({sinal(m.delta_pp)}{num(m.delta_pp)} p.p.)
                          </span>
                          {m.mudou_de_faixa && (
                            <span style={{ marginLeft: 6, fontSize: 10, background: colors.orangeBg, color: colors.orange, padding: '1px 5px', borderRadius: 2, fontWeight: 600 }}>
                              mudou de faixa: {m.faixa_anterior} → {m.faixa_atual}
                            </span>
                          )}
                          <span style={{ marginLeft: 6, fontSize: 10, color: colors.faint }}>vs. {m.periodo_anterior}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </Secao>

            {/* 2 — CRÍTICOS */}
            <Secao n={2} titulo="Indicadores críticos" pergunta="o que está apertado?">
              {c.criticos.length === 0 ? (
                <Card><Vazio>Nenhum indicador apurado neste período.</Vazio></Card>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(c.criticos.length, 4)}, 1fr)`, gap: 10 }}>
                  {c.criticos.map((k) => <CardCritico key={k.indicador} k={k} />)}
                </div>
              )}
            </Secao>

            {/* 3 — TENDÊNCIAS */}
            <Secao n={3} titulo="Tendências" pergunta="para onde vai?">
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(c.tendencias.length, 3)}, 1fr)`, gap: 10 }}>
                {c.tendencias.map((t) => <CardTendencia key={t.indicador} t={t} />)}
              </div>
            </Secao>

            {/* 4 — EXPLICADORES */}
            <Secao n={4} titulo="Explicadores" pergunta="por que mudou?">
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(c.explicadores.length, 3)}, 1fr)`, gap: 10 }}>
                {c.explicadores.map((e) => <CardExplicador key={e.dimensao} e={e} />)}
              </div>
            </Secao>

            {/* 5 — COMPARAÇÕES */}
            <Secao n={5} titulo="Comparações" pergunta="comparado a quê?">
              <Card pad={0}>
                {c.comparacoes.map((cmp) => <LinhaComparacao key={cmp.base} c={cmp} />)}
              </Card>
            </Secao>

            {/* 6 — RISCOS E AÇÕES */}
            <Secao n={6} titulo="Riscos e ações" pergunta="o que fazer?">
              {c.riscos.length === 0 ? (
                <Card><Vazio>Nenhum alerta ativo para este ente.</Vazio></Card>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {c.riscos.map((r) => <CardRisco key={r.id} r={r} />)}
                </div>
              )}
            </Secao>

            {/* 7 — QUALIDADE DO DADO */}
            <Secao n={7} titulo="Qualidade do dado" pergunta="posso confiar nisto?">
              <Card pad={0}>
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, fontSize: 11.5, color: c.qualidade.confiavel ? colors.muted : colors.orange }}>
                  {c.qualidade.observacao ??
                    (c.qualidade.confiavel
                      ? 'Fontes dentro da cadência esperada.'
                      : `Defasagem de até ${c.qualidade.defasagem_maxima} período(s) — a leitura reflete a última entrega publicada, não o mês corrente.`)}
                </div>
                {c.qualidade.fontes.map((f) => <LinhaQualidade key={f.fonte} f={f} />)}
              </Card>
            </Secao>
          </>
        )}
      </Async>
    </div>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: colors.muted }}>{children}</div>;
}

function CardCritico({ k }: { k: CriticoItem }) {
  const cor = COR[k.cor] ?? colors.neutral;
  const teto = Number(k.limite_pct);
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, alignSelf: 'flex-start' }}>{k.rotulo}</div>
      {k.valor_pct === null ? (
        <Vazio>Indicador não apurado neste período.</Vazio>
      ) : (
        <RadialMeter
          atualPct={Number(k.valor_pct)}
          /* As faixas legais (90%/95%/100% do teto) vêm do domínio, não da UI. */
          alerta={teto * 0.9}
          prud={teto * 0.95}
          max={teto}
          gaugeMax={teto * 1.2}
          size={150}
        />
      )}
      <div style={{ fontSize: 11, color: colors.muted, alignSelf: 'flex-start' }}>
        {k.distancia_pp === null
          ? 'sem distância apurada'
          : `${num(k.distancia_pp)} p.p. ${k.sentido === 'piso' ? 'acima do mínimo' : 'de folga até o teto'}`}
        {' · '}
        {k.sentido === 'piso' ? 'mínimo' : 'teto'} {pct(k.limite_pct, 0)}
      </div>
      <div style={{ alignSelf: 'flex-start' }}>
        <Fonte relatorio={k.source_ref?.relatorio} anexo={k.source_ref?.anexo} periodo={k.source_ref?.periodo} versao={k.source_ref?.versao_entrega} />
      </div>
    </Card>
  );
}

function CardTendencia({ t }: { t: TendenciaItem }) {
  if (!t.disponivel) {
    return (
      <Card>
        <div style={{ fontSize: 11.5, fontWeight: 600 }}>{t.rotulo}</div>
        <Vazio>{t.motivo_indisponivel ?? 'Sem série suficiente para projetar.'}</Vazio>
      </Card>
    );
  }
  const serie = [
    ...t.historico.map((p) => Number(p.valor ?? 0)),
    ...t.projecao.map((p) => Number(p.previsto)),
  ];
  const ultimo = t.projecao[t.projecao.length - 1];
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11.5, fontWeight: 600 }}>{t.rotulo}</div>
      {serie.length > 1 && (
        <Sparkline values={serie} color={t.cruzamento_periodo ? colors.orange : colors.primary} width={220} height={44} />
      )}
      <div style={{ fontSize: 11, color: colors.muted }}>
        {t.historico.length} períodos observados · {t.projecao.length} projetados ({t.modelo})
      </div>
      {ultimo && (
        <div style={{ fontSize: 11.5, fontFamily: "'JetBrains Mono', monospace" }}>
          {ultimo.periodo}: {num(ultimo.previsto)}{' '}
          <span style={{ color: colors.faint }}>
            (IC {num(ultimo.ic_inferior)}–{num(ultimo.ic_superior)})
          </span>
        </div>
      )}
      {t.cruzamento_periodo ? (
        <div style={{ fontSize: 11, color: colors.orange, background: colors.orangeBg, padding: '4px 6px', borderRadius: 3 }}>
          Projeção cruza o limite em {t.cruzamento_periodo}.
        </div>
      ) : (
        <div style={{ fontSize: 11, color: colors.muted }}>Não cruza o limite no horizonte projetado.</div>
      )}
      <Fonte relatorio={t.source_ref?.relatorio} anexo={t.source_ref?.anexo} periodo={t.source_ref?.periodo} versao={t.source_ref?.versao_entrega} />
    </Card>
  );
}

function CardExplicador({ e }: { e: ExplicadorItem }) {
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11.5, fontWeight: 600 }}>{e.rotulo}</div>
      {!e.disponivel ? (
        <Vazio>{e.motivo_indisponivel ?? 'Sem base de comparação.'}</Vazio>
      ) : (
        <>
          <div style={{ fontSize: 10.5, color: colors.muted }}>
            {e.periodo_anterior} → {e.periodo_atual} · {e.medida}
          </div>
          {e.componentes.map((cp) => (
            <div key={cp.codigo} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5, borderBottom: `1px solid ${colors.rowBorder}`, paddingBottom: 3 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cp.descricao}>
                {cp.descricao || cp.codigo}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: (cp.delta_abs ?? 0) >= 0 ? colors.orange : colors.green, flexShrink: 0 }}>
                {sinal(cp.delta_abs)}{brl(cp.delta_abs)}
                {cp.delta_pct !== null && <span style={{ color: colors.faint }}> ({sinal(cp.delta_pct)}{num(cp.delta_pct, 1)}%)</span>}
              </span>
            </div>
          ))}
        </>
      )}
      <Fonte relatorio={e.source_ref?.relatorio} anexo={e.source_ref?.anexo} periodo={e.source_ref?.periodo} versao={e.source_ref?.versao_entrega} />
    </Card>
  );
}

function LinhaComparacao({ c }: { c: ComparacaoItem }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 8, padding: '10px 16px', borderBottom: `1px solid ${colors.rowBorder}`, alignItems: 'center', fontSize: 12 }}>
      <div style={{ fontWeight: 500 }}>{c.rotulo}</div>
      {c.disponivel ? (
        <>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", textAlign: 'right' }}>{pct(c.valor_base)}</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", textAlign: 'right' }}>{pct(c.valor_atual)}</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", textAlign: 'right', color: (c.delta_abs ?? 0) > 0 ? colors.orange : colors.green }}>
            {sinal(c.delta_abs)}{num(c.delta_abs)} p.p.
          </div>
        </>
      ) : (
        /* Sem base ⇒ diz que não há. Nunca zero. */
        <div style={{ gridColumn: '2 / -1', fontSize: 11.5, color: colors.muted }}>{c.motivo_indisponivel}</div>
      )}
    </div>
  );
}

function CardRisco({ r }: { r: RiscoItem }) {
  const cor = r.severidade === 'critico' ? colors.red : r.severidade === 'atencao' ? colors.orange : colors.muted;
  const fundo = r.severidade === 'critico' ? colors.redBg : r.severidade === 'atencao' ? colors.orangeBg : colors.bg;
  return (
    <Card style={{ borderLeft: `3px solid ${cor}` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', color: cor, background: fundo, padding: '1px 6px', borderRadius: 2 }}>
          {r.severidade}
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{r.titulo}</span>
      </div>
      <div style={{ fontSize: 11.5, color: colors.muted, marginTop: 4 }}>
        <strong>Fundamento:</strong> {r.motivo_legal}
      </div>
      <div style={{ fontSize: 11.5, marginTop: 2 }}>
        <strong>Ação:</strong> {r.acao_sugerida}
      </div>
      {r.prazo && (
        <div style={{ fontSize: 11, color: colors.orange, marginTop: 2 }}>Prazo: {r.prazo}</div>
      )}
      {r.link && (
        <a href={r.link} style={{ fontSize: 11, color: colors.primary, marginTop: 4, display: 'inline-block' }}>
          Abrir detalhe →
        </a>
      )}
      <Fonte relatorio={r.source_ref?.relatorio} anexo={r.source_ref?.anexo} periodo={r.source_ref?.periodo} versao={r.source_ref?.versao_entrega} />
    </Card>
  );
}

function LinhaQualidade({ f }: { f: QualidadeFonte }) {
  const atrasada = (f.defasagem_periodos ?? 0) > 2;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 0.8fr 0.8fr 1fr', gap: 8, padding: '9px 16px', borderBottom: `1px solid ${colors.rowBorder}`, fontSize: 11.5, alignItems: 'center' }}>
      <div style={{ fontWeight: 500 }}>{f.relatorio}<span style={{ color: colors.faint, fontSize: 10 }}> · {f.cadencia}</span></div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>{f.periodo_mais_recente ?? '—'}</div>
      <div style={{ color: atrasada ? colors.orange : colors.muted }}>
        {f.defasagem_periodos === null ? '—' : `${f.defasagem_periodos} período(s) atrás`}
      </div>
      <div style={{ color: colors.muted }}>{f.retificacoes > 0 ? `${f.retificacoes} retificação(ões)` : 'sem retificação'}</div>
      <div style={{ color: colors.faint, fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace" }}>
        {f.ultima_carga ? new Date(f.ultima_carga).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'sem carga'}
      </div>
    </div>
  );
}
