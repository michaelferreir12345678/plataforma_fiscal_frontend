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
import { Link, useSearchParams } from 'react-router-dom';
import { colors, font } from '../theme';
import { Breadcrumb } from '../components/Breadcrumb';
import { Card } from '../components/Card';
import { Async, ContextoIndisponivel } from '../components/AsyncState';
import { ExportButton } from '../components/ExportButton';
import { PageHeader } from '../components/PageHeader';
import { ExplicacaoIndicador } from '../components/ExplicacaoIndicador';
import { PrintButton } from '../components/PrintButton';
import { SeloQualidade } from '../components/SeloQualidade';
import { TendenciaChart, type PontoTendencia } from '../components/TendenciaChart';
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
import { rotuloFaixa, rotuloIndicador, rotuloModelo } from '../utils/rotulos';

/**
 * Crosslinks do Cockpit para a página de detalhe (Sprint D1) — até esta sprint só a
 * seção 6 (Riscos) linkava para algum lugar; Críticos, Tendências e Explicadores eram
 * um beco sem saída, mesmo cada um apontando para uma página que já existe e já sabe
 * abrir no contexto certo.
 */
/** `TendenciaItem.indicador` usa as chaves do catálogo de previsão ('pessoal'/'divida'/
 * 'rcl' — `cockpit_service.py::_INDICADORES_TENDENCIA`), as mesmas que `ForecastIndicador`
 * aceita em `/previsoes?indicador=`. */
const linkTendencia = (indicador: string) => `/previsoes?indicador=${encodeURIComponent(indicador)}`;
/** `CriticoItem.indicador` vem direto de `limits_service.build_limites` — o mesmo código
 * que `/limites` já lista, e que o painel expansível (Sprint D1) sabe abrir via `?indicador=`. */
const linkCritico = (indicador: string) => `/limites?indicador=${encodeURIComponent(indicador)}`;
/** `ExplicadorItem.dimensao` é interno ao cockpit (`cockpit_service.py`: "receita_origem",
 * "despesa_funcao", "pessoal_poder") — só os três com página de detalhe confirmada entram
 * aqui; um mapeamento errado levaria a uma rota inexistente em vez de simplesmente calar. */
const DIMENSAO_PARA_ROTA: Record<string, string> = {
  receita_origem: '/receita',
  despesa_funcao: '/despesa',
  pessoal_poder: '/pessoal',
};

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
/**
 * O farol usa a mesma régua de `rotuloFaixa`.
 *
 * Havia três vocabulários vivos para a mesma faixa legal — "Limite excedido" aqui,
 * "Crítico" na carteira, "Acima do teto" na página de limites. Quem navegava entre as
 * três não tinha como saber que era o mesmo estado.
 */
const ROTULO_FAROL = rotuloFaixa;

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
        <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: colors.faint }}>
          {String(n).padStart(2, '0')}
        </span>
        <h2 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{titulo}</h2>
        <span style={{ fontSize: 11, color: colors.muted }}>{pergunta}</span>
      </div>
      {children}
    </section>
  );
}

function Fonte({
  relatorio,
  anexo,
  periodo,
  versao,
  asOf,
}: {
  relatorio?: string | null;
  anexo?: string | null;
  periodo?: string | null;
  versao?: string | null;
  /** Instante bitemporal resolvido pelo cabeçalho (§6.5) — as 7 camadas compartilham o
   * mesmo, já que o cockpit é composto numa única chamada atômica ao backend. */
  asOf?: string | null;
}) {
  if (!relatorio) return null;
  return (
    <div style={{ fontSize: 11, color: colors.faint, fontFamily: "'JetBrains Mono', monospace", marginTop: 6 }}>
      fonte: {relatorio}
      {anexo ? ` · ${anexo}` : ''}
      {periodo ? ` · ${periodo}` : ''}
      {versao ? ` · v${versao}` : ''}
      {asOf ? ` · as_of ${asOf}` : ''}
    </div>
  );
}

export function CockpitPage() {
  const { ente, periodo, carregandoContexto, contextoIndisponivel } = useApp();
  // Sprint D1: quando o gestor chega aqui a partir de um ranking da Carteira
  // (?deCarteira=<indicador>&uf=<sigla>), oferece o caminho de volta — sem isso, trocar de
  // ente no ranking era beco sem saída: não havia como voltar para o mesmo ranking depois.
  const [params] = useSearchParams();
  const deCarteiraIndicador = params.get('deCarteira');
  const deCarteiraUf = params.get('uf') ?? ente.cod_ibge.slice(0, 2);
  const res = useResource(
    () => fetchCockpit(ente.cod_ibge, periodo),
    [ente.cod_ibge, periodo],
    {
      // Sem período não é erro do cockpit: ou o contexto ainda está carregando, ou existe
      // um motivo (403 de escopo, ausência de entrega) que o contexto já sabe explicar.
      pular: !periodo,
      indisponivel: carregandoContexto ? null : (
        <ContextoIndisponivel
          ente={ente.nome}
          motivo={
            contextoIndisponivel ??
            'Nenhuma entrega de RREO foi encontrada para este ente. Assim que houver uma carga, o período aparece aqui.'
          }
        />
      ),
    },
  );

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }} data-screen-label="Cockpit Executivo">
      <PageHeader
        title="Cockpit Executivo"
        context={`${ente.nome} · ${periodo || 'sem período selecionado'} · síntese fiscal para decisão`}
        source="RREO, RGF e indicadores gold · SICONFI"
        breadcrumb={
          deCarteiraIndicador ? (
            <Breadcrumb
              crumbs={[
                {
                  label: `← voltar ao ranking de ${rotuloIndicador(deCarteiraIndicador)} — UF ${deCarteiraUf}`,
                  to: `/carteira?indicador=${encodeURIComponent(deCarteiraIndicador)}`,
                },
              ]}
            />
          ) : undefined
        }
        actions={<PrintButton />}
      />
      <Async res={res}>
        {(c) => (
          <>
            {/* Sprint 26: o selo vem antes de tudo — se um número desta tela está sob
                verificação em falha, o gestor precisa ler isso antes do número. */}
            <SeloQualidade checks={c.qualidade.checks_abertos} ente={ente.cod_ibge} periodo={periodo} />

            {/* Export da leitura do cockpit — a mesma foto que a tela mostra. */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <ExportButton
                nome="Cockpit"
                linhas={c.criticos}
                colunas={[
                  { cabecalho: 'indicador', valor: (i) => i.indicador },
                  { cabecalho: 'rotulo', valor: (i) => i.rotulo },
                  { cabecalho: 'sentido', valor: (i) => i.sentido },
                  { cabecalho: 'valor_pct', valor: (i) => i.valor_pct },
                  { cabecalho: 'valor_rs', valor: (i) => i.valor_rs },
                  { cabecalho: 'limite_pct', valor: (i) => i.limite_pct },
                  { cabecalho: 'faixa', valor: (i) => i.faixa ?? '' },
                  { cabecalho: 'distancia_pp', valor: (i) => i.distancia_pp },
                ]}
                contexto={{
                  ente: c.nome ?? ente.nome,
                  periodo: c.periodo,
                  fonte: `${c.source_ref.relatorio} ${c.source_ref.anexo ?? ''}`.trim(),
                }}
                modeloRelatorio="executivo"
              />
            </div>

            {/* 1 — RESUMO */}
            <Secao n={1} titulo="Resumo" pergunta="estou bem?">
              <Card style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '16px 18px' }} pad={0}>
                <div
                  style={{
                    padding: '10px 16px', borderRadius: 6, background: FUNDO[c.resumo.cor] ?? colors.bg,
                    border: `1px solid ${COR[c.resumo.cor] ?? colors.border}`, textAlign: 'center', minWidth: 190,
                  }}
                >
                  <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.muted, fontWeight: 600 }}>
                    Situação
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: COR[c.resumo.cor] ?? colors.ink, marginTop: 2 }}>
                    {ROTULO_FAROL(c.resumo.farol)}
                  </div>
                  <div style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
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
                            <span style={{ marginLeft: 6, fontSize: 11, background: colors.orangeBg, color: colors.orange, padding: '1px 5px', borderRadius: 2, fontWeight: 600 }}>
                              mudou de faixa: {m.faixa_anterior} → {m.faixa_atual}
                            </span>
                          )}
                          <span style={{ marginLeft: 6, fontSize: 11, color: colors.faint }}>vs. {m.periodo_anterior}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
              <Fonte
                relatorio={c.source_ref.relatorio}
                anexo={c.source_ref.anexo}
                periodo={c.source_ref.periodo}
                versao={c.source_ref.versao_entrega}
                asOf={c.as_of}
              />
            </Secao>

            {/* 2 — CRÍTICOS */}
            <Secao n={2} titulo="Indicadores críticos" pergunta="o que está apertado?">
              {c.criticos.length === 0 ? (
                <Card><Vazio>Nenhum indicador apurado neste período.</Vazio></Card>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(c.criticos.length, 4)}, 1fr)`, gap: 10 }}>
                  {c.criticos.map((k) => <CardCritico key={k.indicador} k={k} asOf={c.as_of} />)}
                </div>
              )}
            </Secao>

            {/* 3 — TENDÊNCIAS */}
            <Secao n={3} titulo="Tendências" pergunta="para onde vai?">
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(c.tendencias.length, 3)}, 1fr)`, gap: 10 }}>
                {c.tendencias.map((t) => <CardTendencia key={t.indicador} t={t} asOf={c.as_of} />)}
              </div>
            </Secao>

            {/* 4 — EXPLICADORES */}
            <Secao n={4} titulo="Explicadores" pergunta="por que mudou?">
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(c.explicadores.length, 3)}, 1fr)`, gap: 10 }}>
                {c.explicadores.map((e) => <CardExplicador key={e.dimensao} e={e} asOf={c.as_of} />)}
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
                  {c.riscos.map((r) => <CardRisco key={r.id} r={r} asOf={c.as_of} />)}
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

/**
 * Nem todo indicador do cockpit é percentual de uma base, e nem todo indicador tem limite
 * legal. Antes o card assumia as duas coisas: a RCL por habitante — que é R$/hab e vive em
 * `valor_rs` — aparecia como "None%", e os gerenciais mostravam "teto 0%", que numa tela de
 * conformidade se lê como "o teto é zero", o oposto de "não há teto".
 */
function CardCritico({ k, asOf }: { k: CriticoItem; asOf?: string | null }) {
  const temLimite = k.limite_pct !== null && k.limite_pct !== undefined;
  const teto = temLimite ? Number(k.limite_pct) : 0;
  const porHabitante = k.denominador === 'populacao';
  const valor = porHabitante ? k.valor_rs : k.valor_pct;

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11.5, fontWeight: 600 }}>{k.rotulo}</span>
        {/* Sprint IA-7: no indicador específico. O cockpit mostra vários lado a lado —
            um botão único no topo da tela explicaria "a tela", não o número. */}
        <ExplicacaoIndicador
          indicador={k.indicador}
          rotulo={k.rotulo}
          periodo={k.source_ref?.periodo}
          asOf={asOf}
          rotuloGatilho="Explicar"
        />
      </div>
      {valor === null || valor === undefined ? (
        <Vazio>Indicador não apurado neste período.</Vazio>
      ) : temLimite && !porHabitante ? (
        <RadialMeter
          atualPct={Number(k.valor_pct)}
          sentido={k.sentido === 'piso' ? 'piso' : 'teto'}
          /* As faixas vêm do domínio, não da UI — e mudam com o sentido: num teto são
             90%/95%/100% dele; num piso, o mínimo e as margens acima dele. Tratar piso
             como teto pintava de vermelho quem **cumpre** a obrigação constitucional. */
          alerta={k.sentido === 'piso' ? teto : teto * 0.9}
          prud={k.sentido === 'piso' ? teto * 1.05 : teto * 0.95}
          max={k.sentido === 'piso' ? teto * 1.1 : teto}
          gaugeMax={k.sentido === 'piso' ? Math.max(teto * 1.6, Number(k.valor_pct) * 1.1) : teto * 1.2}
          size={150}
        />
      ) : (
        /* Sem teto não há velocímetro: não existe "quanto falta" para um limite que não
           existe. O número em destaque diz o que há de fato. */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 0 10px' }}>
          <span style={{ fontFamily: font.mono, fontSize: 26, fontWeight: 600, color: colors.primary }}>
            {porHabitante ? brl(Number(valor)) : pct(Number(valor))}
          </span>
          <span style={{ fontSize: 11, color: colors.faint, marginTop: 2 }}>
            {porHabitante ? 'por habitante' : 'sem limite legal aplicável'}
          </span>
        </div>
      )}
      <div style={{ fontSize: 11, color: colors.muted, alignSelf: 'flex-start' }}>
        {k.distancia_pp === null || k.distancia_pp === undefined
          ? temLimite
            ? 'sem distância apurada'
            : 'indicador gerencial — acompanhamento, não conformidade'
          : `${num(k.distancia_pp)} p.p. ${k.sentido === 'piso' ? 'acima do mínimo' : 'de folga até o teto'}`}
        {temLimite && ` · ${k.sentido === 'piso' ? 'mínimo' : 'teto'} ${pct(k.limite_pct, 0)}`}
      </div>
      <div style={{ alignSelf: 'flex-start' }}>
        <Fonte relatorio={k.source_ref?.relatorio} anexo={k.source_ref?.anexo} periodo={k.source_ref?.periodo} versao={k.source_ref?.versao_entrega} asOf={asOf} />
      </div>
      <Link to={linkCritico(k.indicador)} style={{ alignSelf: 'flex-start', fontSize: 11, color: colors.primary }}>
        ver memória, série e simular →
      </Link>
    </Card>
  );
}

function CardTendencia({ t, asOf }: { t: TendenciaItem; asOf?: string | null }) {
  if (!t.disponivel) {
    return (
      <Card>
        <div style={{ fontSize: 11.5, fontWeight: 600 }}>{t.rotulo}</div>
        <Vazio>{t.motivo_indisponivel ?? 'Sem série suficiente para projetar.'}</Vazio>
      </Card>
    );
  }
  // A unidade do indicador decide o formato. Usar o formatador cru aqui era o que fazia
  // a RCL aparecer como "41349539093.18" em vez de "R$ 41,3 bi".
  const formatarPonto = (valor: number) =>
    t.unidade.toUpperCase().includes('PCT') ? pct(valor) : brl(valor);
  const pontos: PontoTendencia[] = [
    ...t.historico.map((p) => ({
      periodo: p.periodo,
      valor: p.valor === null ? null : Number(p.valor),
      projetado: false,
    })),
    ...t.projecao.map((p) => ({
      periodo: p.periodo,
      valor: Number(p.previsto),
      projetado: true,
      icInferior: p.ic_inferior === null ? null : Number(p.ic_inferior),
      icSuperior: p.ic_superior === null ? null : Number(p.ic_superior),
    })),
  ];
  const ultimo = t.projecao[t.projecao.length - 1];
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Sem título próprio aqui: o `AccessibleChart` já o renderiza como <figcaption>,
          que é o nome acessível da figura (Sprint B3). Ter os dois mostrava o rótulo
          duas vezes no mesmo card; tirar o figcaption resolveria a duplicata e quebraria
          o leitor de tela — trocaria um incômodo por um defeito. */}
      <TendenciaChart
        titulo={t.rotulo}
        pontos={pontos}
        formatar={formatarPonto}
        limite={t.limite_pct}
        cruzamento={t.cruzamento_periodo}
      />
      <Legenda cruza={Boolean(t.cruzamento_periodo)} />
      <div style={{ fontSize: 11, color: colors.muted }}>
        {t.historico.length} períodos observados · {t.projecao.length} projetados ({rotuloModelo(t.modelo)})
      </div>
      {ultimo && (
        <div style={{ fontSize: 11.5, fontFamily: "'JetBrains Mono', monospace" }}>
          {ultimo.periodo}: {formatarPonto(Number(ultimo.previsto))}{' '}
          <span style={{ color: colors.faint }}>
            (IC {ultimo.ic_inferior === null ? '—' : formatarPonto(Number(ultimo.ic_inferior))}–
            {ultimo.ic_superior === null ? '—' : formatarPonto(Number(ultimo.ic_superior))})
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
      <Fonte relatorio={t.source_ref?.relatorio} anexo={t.source_ref?.anexo} periodo={t.source_ref?.periodo} versao={t.source_ref?.versao_entrega} asOf={asOf} />
      <Link to={linkTendencia(t.indicador)} style={{ fontSize: 11, color: colors.primary }}>
        abrir em Previsões & Cenários →
      </Link>
    </Card>
  );
}

/** Identidade não pode depender só do traço: sólido × tracejado precisa de legenda. */
function Legenda({ cruza }: { cruza: boolean }) {
  const item = (amostra: React.ReactNode, rotulo: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {amostra}
      <span style={{ fontSize: 10.5, color: colors.muted }}>{rotulo}</span>
    </span>
  );
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      {item(
        <svg width={16} height={6} aria-hidden><line x1={0} y1={3} x2={16} y2={3} stroke={colors.serieA} strokeWidth={2} /></svg>,
        'observado',
      )}
      {item(
        <svg width={16} height={6} aria-hidden><line x1={0} y1={3} x2={16} y2={3} stroke={colors.serieA} strokeWidth={2} strokeDasharray="4 3" /></svg>,
        'projetado (com IC)',
      )}
      {cruza &&
        item(
          <svg width={10} height={10} aria-hidden><circle cx={5} cy={5} r={4} fill={colors.orange} /></svg>,
          'cruza o limite',
        )}
    </div>
  );
}

function CardExplicador({ e, asOf }: { e: ExplicadorItem; asOf?: string | null }) {
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11.5, fontWeight: 600 }}>{e.rotulo}</div>
      {!e.disponivel ? (
        <Vazio>{e.motivo_indisponivel ?? 'Sem base de comparação.'}</Vazio>
      ) : (
        <>
          <div style={{ fontSize: 11, color: colors.muted }}>
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
      <Fonte relatorio={e.source_ref?.relatorio} anexo={e.source_ref?.anexo} periodo={e.source_ref?.periodo} versao={e.source_ref?.versao_entrega} asOf={asOf} />
      {DIMENSAO_PARA_ROTA[e.dimensao] && (
        <Link to={DIMENSAO_PARA_ROTA[e.dimensao]} style={{ fontSize: 11, color: colors.primary }}>
          ver o detalhe completo →
        </Link>
      )}
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

function CardRisco({ r, asOf }: { r: RiscoItem; asOf?: string | null }) {
  const cor = r.severidade === 'critico' ? colors.red : r.severidade === 'atencao' ? colors.orange : colors.muted;
  const fundo = r.severidade === 'critico' ? colors.redBg : r.severidade === 'atencao' ? colors.orangeBg : colors.bg;
  return (
    <Card style={{ borderLeft: `3px solid ${cor}` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: cor, background: fundo, padding: '1px 6px', borderRadius: 2 }}>
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
      <Fonte relatorio={r.source_ref?.relatorio} anexo={r.source_ref?.anexo} periodo={r.source_ref?.periodo} versao={r.source_ref?.versao_entrega} asOf={asOf} />
    </Card>
  );
}

function LinhaQualidade({ f }: { f: QualidadeFonte }) {
  const atrasada = (f.defasagem_periodos ?? 0) > 2;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 0.8fr 0.8fr 1fr', gap: 8, padding: '9px 16px', borderBottom: `1px solid ${colors.rowBorder}`, fontSize: 11.5, alignItems: 'center' }}>
      <div style={{ fontWeight: 500 }}>{f.relatorio}<span style={{ color: colors.faint, fontSize: 11 }}> · {f.cadencia}</span></div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>{f.periodo_mais_recente ?? '—'}</div>
      <div style={{ color: atrasada ? colors.orange : colors.muted }}>
        {f.defasagem_periodos === null ? '—' : `${f.defasagem_periodos} período(s) atrás`}
      </div>
      <div style={{ color: colors.muted }}>{f.retificacoes > 0 ? `${f.retificacoes} retificação(ões)` : 'sem retificação'}</div>
      <div style={{ color: colors.faint, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
        {f.ultima_carga ? new Date(f.ultima_carga).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'sem carga'}
      </div>
    </div>
  );
}
