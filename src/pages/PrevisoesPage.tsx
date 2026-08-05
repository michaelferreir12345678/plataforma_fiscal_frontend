/**
 * Previsões & Cenários (Módulo 13).
 *
 * Sprint 25E (auditoria §2.11): **horizonte configurável** (era fixo em 4), **comparação
 * das três camadas** de modelo — o gestor pergunta "por que esse número e não outro?", e
 * mostrar só o escolhido responde pela metade — e **exportação** da projeção.
 */
import { useEffect, useId, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { colors, font } from '../theme';
import { humanizar, rotuloIndicador, rotuloModelo } from '../utils/rotulos';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { SectionLabel } from '../components/SectionLabel';
import { Async, Skeleton } from '../components/AsyncState';
import { ExportButton } from '../components/ExportButton';
import { FonteChip } from '../components/FonteChip';
import { useApp, useResource } from '../context/AppContext';
import { fmt, pct, brl } from '../utils/format';
import {
  fetchComparacaoModelos,
  fetchProjecao,
  fetchCenarios,
  fetchCenario,
  fetchPremissasCenario,
  type PremissaObservada,
  simularCenario,
  type ForecastIndicador,
  type ForecastModelo,
  type ModeloComparado,
  type ProjecaoResponse,
  type CenarioSimularResponse,
  type PontoProjecao,
  type LimiteImpacto,
  type EspacoFiscal,
  type NovoContratoDivida,
  compararCenarios,
  arquivarCenario,
  duplicarCenario,
  excluirCenarioDefinitivo,
  exportarCenario,
  type CenarioDetalhe,
  type CenarioComparadoItem,
} from '../services/backend';

const INDICADORES: { key: ForecastIndicador; label: string }[] = [
  { key: 'rcl', label: 'RCL' },
  { key: 'receita', label: 'Receita' },
  { key: 'pessoal', label: 'Pessoal' },
  { key: 'divida', label: 'Dívida' },
];

function ehForecastIndicador(v: string | null): v is ForecastIndicador {
  return v === 'rcl' || v === 'receita' || v === 'pessoal' || v === 'divida';
}

/** Modelos oferecidos no seletor da simulação; `null` = "o melhor disponível" (padrão). */
const MODELOS_CENARIO: { value: ForecastModelo | null; label: string }[] = [
  { value: null, label: 'Melhor disponível (automático)' },
  { value: 'fechamento', label: 'Fechamento (run-rate)' },
  { value: 'holt_winters', label: 'Holt (nível + tendência)' },
  { value: 'regressao_exogenas', label: 'Regressão com exógenas' },
];

/** Horizontes oferecidos; o backend aceita 1..24 (Sprint 25E). */
const HORIZONTES = [2, 4, 6, 8, 12] as const;
const num = (v: number | string | null | undefined): number => Number(v ?? 0);
const isPct = (unidade: string) => unidade === 'PCT_RCL';

/** Formata um valor conforme a unidade do indicador (R$ milhões ou % da RCL). */
function valorFmt(v: number, unidade: string): string {
  return isPct(unidade) ? pct(v) : brl(v / 1e6);
}

export function PrevisoesPage() {
  const { ente } = useApp();
  // O alerta preditivo (Sprint G1) leva `?indicador=` na URL — antes sempre caía em RCL, e
  // quem clicava num alerta de Pessoal ou Dívida tinha que reencontrar o indicador certo à
  // mão. Lido uma vez, na montagem: trocar de indicador depois é ação da própria tela.
  const [params] = useSearchParams();
  const [indicador, setIndicador] = useState<ForecastIndicador>(() => {
    const doUrl = params.get('indicador');
    return ehForecastIndicador(doUrl) ? doUrl : 'rcl';
  });
  const [horizonte, setHorizonte] = useState<number>(4);

  const proj = useResource<ProjecaoResponse>(
    () => fetchProjecao(ente.cod_ibge, { indicador, horizonte }),
    [ente.cod_ibge, indicador, horizonte],
  );
  const cenarios = useResource(() => fetchCenarios(ente.cod_ibge), [ente.cod_ibge]);
  const [aberto, setAberto] = useState<string | null>(null);
  // **Limite de 6, imposto pelo backend.** Acima disso a paleta categórica acaba e o
  // gráfico deixa de ser legível — comparar dez curvas é não comparar nenhuma.
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const alternarSelecao = (id: string) =>
    setSelecionados((atual) =>
      atual.includes(id)
        ? atual.filter((x) => x !== id)
        : atual.length >= 6
          ? atual
          : [...atual, id],
    );

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Previsões e Cenários">
      <PageHeader
        title="Previsões & Cenários"
        context={`Projeção com banda de incerteza (IC 95%) · ${ente.nome}`}
        source="Séries históricas gold · modelos estatísticos versionados"
        actions={(
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '4px 10px', background: colors.neutralBg, color: colors.neutral, borderRadius: 4, fontWeight: 600, letterSpacing: '0.05em' }}>
          ESTIMATIVA · NÃO É NÚMERO FECHADO
        </span>
        )}
      />

      {/* seletores de indicador e horizonte */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {INDICADORES.map((i) => (
          <button type="button" key={i.key} aria-pressed={indicador === i.key} onClick={() => setIndicador(i.key)} style={{ padding: '7px 16px', borderRadius: 4, fontSize: 12, fontWeight: 500, background: indicador === i.key ? colors.primary : colors.surface, color: indicador === i.key ? colors.bg : colors.muted, border: indicador === i.key ? 'none' : `1px solid ${colors.border}` }}>
            {i.label}
          </button>
        ))}
        <span style={{ marginLeft: 14, fontSize: 11, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
          Horizonte
        </span>
        <div role="group" aria-label="Horizonte da projeção" style={{ display: 'flex', gap: 4 }}>
          {HORIZONTES.map((h) => (
            <button
              key={h}
              type="button"
              aria-pressed={horizonte === h}
              onClick={() => setHorizonte(h)}
              style={{
                padding: '5px 10px', borderRadius: 4, fontSize: 11, fontFamily: font.mono,
                border: `1px solid ${horizonte === h ? colors.primary : colors.border}`,
                background: horizonte === h ? colors.accentSoft : colors.surface,
                color: horizonte === h ? colors.primary : colors.muted, cursor: 'pointer',
              }}
            >
              +{h}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 11, color: colors.muted }}>
          períodos à frente — quanto mais longe, mais larga a banda de incerteza
        </span>
      </div>

      <Async res={proj}>
        {(data) => (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 12 }}>
              <Card>
                <SectionLabel note="sólido = real · tracejado = projeção · sombra = IC 95%">
                  Projeção · {data.descricao}
                </SectionLabel>
                <ProjectionChart data={data} />
                <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: colors.muted, flexWrap: 'wrap' }}>
                  <Legend color={colors.primary} label="Histórico (dado real)" solid />
                  <Legend color={colors.primary} label="Projeção (estimativa)" />
                  {data.cruzamento.aplicavel && <Legend color={colors.red} label={`Teto ${fmt(num(data.cruzamento.teto_pct))}%`} />}
                </div>
              </Card>

              <ModelPanel data={data} />
            </div>

            <AvisoSaneamento memoria={data.memoria} />

            <CruzamentoBanner data={data} />

            <ComparacaoModelos
              cod={ente.cod_ibge}
              enteNome={ente.nome}
              indicador={indicador}
              horizonte={horizonte}
            />

            <ScenarioPanel
              ente={ente.cod_ibge}
              indicador={indicador}
              unidade={data.unidade}
              horizonte={horizonte}
              onSaved={cenarios.reload}
            />

            {/* Reabrir e comparar são as duas coisas que se faz com um cenário salvo;
                sem elas a lista é uma gaveta que não abre. */}
            {aberto && <CenarioReaberto id={aberto} onFechar={() => setAberto(null)} />}
            {selecionados.length >= 2 && (
              <ComparacaoCenariosPainel
                ente={ente.cod_ibge}
                enteNome={ente.nome}
                ids={selecionados}
                onFechar={() => setSelecionados([])}
              />
            )}
            <SavedScenarios
              res={cenarios}
              onAbrir={setAberto}
              selecionados={selecionados}
              onSelecionar={alternarSelecao}
            />
          </>
        )}
      </Async>
    </div>
  );
}

// --------------------------------------------------------------------------- //
// Painel do modelo (memória de cálculo auditável)
// --------------------------------------------------------------------------- //
function ModelPanel({ data }: { data: ProjecaoResponse }) {
  const exog = (data.memoria['exogenas_usadas'] as string[] | undefined) ?? [];
  const fontes = (data.memoria['exogenas_fontes'] as Record<string, string> | undefined) ?? {};
  const ultimo = data.projecao[data.projecao.length - 1];
  return (
    <Card>
      <SectionLabel>Modelo &amp; memória de cálculo</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
            Fechamento projetado · {ultimo?.periodo_alvo}
          </div>
          <div style={{ fontFamily: font.mono, fontSize: 26, fontWeight: 700, color: colors.primary, marginTop: 2 }}>
            {valorFmt(num(ultimo?.valor_previsto), data.unidade)}
          </div>
          <div style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
            IC 95%: {valorFmt(num(ultimo?.ic_inferior), data.unidade)} — {valorFmt(num(ultimo?.ic_superior), data.unidade)}
          </div>
        </div>
        <InfoRow label="Modelo" value={modeloLabel(data.modelo)} />
        <InfoRow label="Exógenas usadas" value={exog.length ? exog.join(' · ') : 'nenhuma (série sem exógenas completas)'} />
        {exog.map((e) => (
          <InfoRow key={e} label={`Fonte ${e}`} value={fontes[e] ?? '—'} mono />
        ))}
        <InfoRow label="Fonte" value={`${data.source_ref.relatorio}${data.source_ref.anexo ? ' · ' + data.source_ref.anexo : ''}`} />
        <InfoRow label="Base (as of)" value={data.as_of ? new Date(data.as_of).toLocaleString('pt-BR') : '—'} mono />
        <div style={{ fontSize: 11, color: colors.faint, lineHeight: 1.4, marginTop: 2 }}>
          {String(data.memoria['aviso'] ?? '')}
        </div>
      </div>
    </Card>
  );
}

/**
 * Nome do modelo mais a premissa que ele assume.
 *
 * O nome curto vem de `rotuloModelo` — fonte única, para que a mesma projeção não se
 * chame "Holt-Winters" aqui e "Tendência com sazonalidade" no Cockpit. A frase entre
 * parênteses diz **o que o modelo supõe**, que é o que decide se ele serve à pergunta:
 * um run-rate não enxerga sazonalidade, e uma regressão com exógenas depende de as
 * séries externas continuarem se comportando como se comportaram.
 */
const PREMISSA: Record<string, string> = {
  fechamento: 'repete o ritmo observado até aqui',
  holt_winters: 'projeta nível e tendência, com o padrão sazonal do próprio ente',
  regressao_exogenas: 'usa FPM, IPCA e Selic como variáveis explicativas',
};

function modeloLabel(m: string): string {
  const premissa = PREMISSA[m];
  return premissa ? `${rotuloModelo(m)} — ${premissa}` : rotuloModelo(m);
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11.5 }}>
      <span style={{ color: colors.muted }}>{label}</span>
      <span style={{ color: colors.ink, textAlign: 'right', fontFamily: mono ? font.mono : undefined }}>{value}</span>
    </div>
  );
}

/**
 * Quanto o cenário consome (ou devolve) da margem até o limite.
 *
 * A tela já mostrava o percentual projetado com e sem as premissas. O que faltava era
 * traduzir a diferença na unidade em que a decisão é tomada: um reajuste não se avalia em
 * pontos percentuais da RCL, e sim em quanto ele come do que ainda cabe.
 *
 * Cala quando o indicador não tem limite legal — sem teto não há margem, e inventar uma
 * seria pior que a ausência.
 */
function ConsumoDaMargem({ base, cenario }: { base: ProjecaoResponse; cenario: ProjecaoResponse }) {
  const a = base.espaco_fiscal;
  const b = cenario.espaco_fiscal;
  if (!a || !b) return null;

  // Margem com sinal: folga positiva, excesso negativo. É a única forma de a subtração
  // fazer sentido quando o cenário atravessa o limite — de folga para excesso.
  const comSinal = (e: EspacoFiscal) =>
    (e.situacao === 'excedido' ? -1 : 1) * num(e.margem_pp);
  const comSinalRs = (e: EspacoFiscal) =>
    e.margem_rs == null ? null : (e.situacao === 'excedido' ? -1 : 1) * num(e.margem_rs);

  const deltaPp = comSinal(b) - comSinal(a);
  const rsA = comSinalRs(a);
  const rsB = comSinalRs(b);
  const deltaRs = rsA === null || rsB === null ? null : rsB - rsA;
  const consome = deltaPp < 0;
  const atravessa = a.situacao !== b.situacao;

  return (
    <div
      style={{
        marginBottom: 12,
        padding: '9px 12px',
        borderRadius: 5,
        background: atravessa ? colors.redBg : colors.neutralBg,
        border: `1px solid ${atravessa ? colors.red : colors.border}`,
      }}
    >
      <div style={{ fontSize: 10.5, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
        {consome ? 'O cenário consome da margem' : 'O cenário devolve margem'}
      </div>
      <div style={{ fontSize: 13, marginTop: 3, lineHeight: 1.5 }}>
        <strong style={{ fontFamily: font.mono, color: consome ? colors.red : colors.green }}>
          {deltaPp >= 0 ? '+' : '−'}{fmt(Math.abs(deltaPp), 2)} p.p.
          {deltaRs !== null && ` · ${deltaRs >= 0 ? '+' : '−'}${brl(Math.abs(deltaRs) / 1e6)}`}
        </strong>{' '}
        <span style={{ color: colors.muted, fontSize: 11.5 }}>
          — de {fmt(num(a.margem_pp), 2)} p.p. para {fmt(num(b.margem_pp), 2)} p.p.
        </span>
      </div>
      {atravessa && (
        <div style={{ fontSize: 11.5, color: colors.red, fontWeight: 600, marginTop: 4 }}>
          {b.situacao === 'excedido'
            ? 'Sob estas premissas a projeção passa a exceder o limite.'
            : 'Sob estas premissas a projeção volta para dentro do limite.'}
        </div>
      )}
    </div>
  );
}

/**
 * Aviso de que o treino ignorou observação da série — e qual.
 *
 * A série de pessoal de um dos entes do acervo tem um ponto de 324,49% da RCL, efeito de
 * um denominador corrompido na entrega. O modelo consumia esse ponto sem reclamar e
 * devolvia 2,29% — número igualmente impossível, agora com intervalo de confiança e
 * aparência de análise. Saneado, projeta 50,24%.
 *
 * Excluir sem dizer seria trocar um número errado por outro que ninguém pode auditar. O
 * valor excluído continua no acervo e nas telas de indicador; o que muda é que a projeção
 * declara o que deixou de fora.
 */
function AvisoSaneamento({ memoria }: { memoria: Record<string, unknown> }) {
  const san = memoria?.saneamento as
    | { pontos_excluidos?: number; exclusoes?: { periodo: string; valor: number; motivo: string }[] }
    | undefined;
  if (!san?.pontos_excluidos) return null;
  return (
    <Card pad={0} style={{ padding: '10px 16px', background: colors.orangeBg }}>
      <div style={{ fontSize: 11, color: colors.orange, fontWeight: 650, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        A projeção ignorou {san.pontos_excluidos} observação(ões) da série
      </div>
      <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 11.5, color: colors.ink, lineHeight: 1.6 }}>
        {(san.exclusoes ?? []).map((e) => (
          <li key={e.periodo}>
            <strong>{e.periodo}</strong>: {fmt(e.valor, 2)}% — {e.motivo}
          </li>
        ))}
      </ul>
      <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 5, lineHeight: 1.5 }}>
        O valor continua no acervo e nas telas de indicador. Foi excluído apenas do treino,
        para não contaminar a projeção.
      </div>
    </Card>
  );
}

// --------------------------------------------------------------------------- //
// Banner de cruzamento de limite
// --------------------------------------------------------------------------- //
function CruzamentoBanner({ data }: { data: ProjecaoResponse }) {
  const c = data.cruzamento;
  if (!c.aplicavel) {
    return (
      <Card pad={0} style={{ padding: '10px 16px', background: colors.neutralBg }}>
        <span style={{ fontSize: 11.5, color: colors.muted }}>
          Indicador em R$ — sem teto legal direto. O cenário abaixo traduz a projeção em tetos e mínimos legais.
        </span>
      </Card>
    );
  }
  const bg = c.cruza ? colors.redBg : colors.greenBg;
  const fg = c.cruza ? colors.red : colors.green;
  return (
    <Card pad={0} style={{ padding: '12px 16px', background: bg }}>
      <div style={{ fontSize: 11, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
        Cruzamento de limite · {c.indicador_limite} · teto {fmt(num(c.teto_pct))}%
      </div>
      <div style={{ fontSize: 12.5, color: fg, fontWeight: 600, marginTop: 3 }}>
        {c.cruza
          ? `Projeção cruza o teto em ${c.periodo_cruzamento} (${pct(num(c.valor_no_cruzamento))}) — exige providências da LRF.`
          : 'Projeção permanece dentro do teto ao longo do horizonte.'}
      </div>
      {/* **A outra metade da resposta.** "Cruza em 2026-B2" não se assina; "há R$ 826
          milhões de margem" se assina. O ordenador de despesa decide em reais. */}
      <EspacoFiscalLinha data={data} />
    </Card>
  );
}

/**
 * Quanto ainda cabe — ou quanto falta cortar, e em que prazo a lei manda cortar.
 *
 * A margem em pontos percentuais é o que o limite diz; a margem em reais é o que a
 * decisão exige. As duas juntas, com a base e o período da conversão à vista, para que
 * ninguém precise confiar no número sem saber sobre o que ele foi calculado.
 */
function EspacoFiscalLinha({ data }: { data: ProjecaoResponse }) {
  const e = data.espaco_fiscal;
  if (!e) return null;
  const excedido = e.situacao === 'excedido';
  const rs = e.margem_rs == null ? null : num(e.margem_rs) / 1e6;
  const rec = data.reconducao;

  return (
    <div style={{ marginTop: 10, paddingTop: 9, borderTop: `1px solid ${colors.rowBorder}` }}>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: 10.5, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {excedido ? 'Excesso a eliminar' : 'Margem até o limite'}
          </div>
          <div style={{ fontSize: 15, fontWeight: 650, fontFamily: font.mono, color: excedido ? colors.red : colors.ink }}>
            {fmt(num(e.margem_pp), 2)} p.p.
            {rs !== null && (
              <span style={{ fontSize: 12.5, fontWeight: 500, color: colors.muted }}> · {brl(rs)}</span>
            )}
          </div>
        </div>
        <div style={{ fontSize: 10.5, color: colors.faint, lineHeight: 1.5, maxWidth: 420 }}>
          {e.periodo_alvo ? `na projeção para ${e.periodo_alvo}` : 'na ponta do horizonte'}
          {rs !== null
            ? ` · convertido pela ${e.base_nome === 'rcl' ? 'RCL' : e.base_nome} de ${e.base_periodo ?? 'período não identificado'}`
            : ' · sem base no acervo para converter em reais'}
        </div>
      </div>

      {rec?.aplicavel && (
        <div style={{ marginTop: 8, fontSize: 11.5, color: colors.ink, lineHeight: 1.6 }}>
          <strong>Recondução obrigatória.</strong> Eliminar o excesso em dois quadrimestres,
          ao menos um terço no primeiro:{' '}
          <strong>{fmt(num(rec.primeiro_quadrimestre_pp), 2)} p.p.</strong>
          {rec.primeiro_quadrimestre_rs != null && ` (${brl(num(rec.primeiro_quadrimestre_rs) / 1e6)})`}
          {' e depois '}
          <strong>{fmt(num(rec.segundo_quadrimestre_pp), 2)} p.p.</strong>
          {rec.segundo_quadrimestre_rs != null && ` (${brl(num(rec.segundo_quadrimestre_rs) / 1e6)})`}.
          <div style={{ fontSize: 10.5, color: colors.faint, marginTop: 3, fontFamily: font.mono }}>
            {rec.fundamento}
          </div>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------- //
// Painel de cenário ("e se?") — chama o backend, não persiste salvo se salvar
// --------------------------------------------------------------------------- //
function ScenarioPanel({ ente, indicador, unidade, horizonte, onSaved }: { ente: string; indicador: ForecastIndicador; unidade: string; horizonte: number; onSaved: () => void }) {
  // **As premissas partem do observado.** Antes eram 4,5% e 10,5% escritos aqui: dois
  // números que alguém digitou uma vez e que a tela mostrava com a mesma aparência de um
  // valor medido. A Selic observada é 14,28% — quem aceitasse o padrão simulava com 3,8
  // pontos percentuais de erro sem saber que havia um padrão. `null` até o backend
  // responder; nenhum valor de fábrica ocupa o lugar enquanto isso.
  const premissas = useResource(() => fetchPremissasCenario(ente), [ente]);
  const [ipca, setIpca] = useState<number | null>(null);
  const [selic, setSelic] = useState<number | null>(null);
  const [fpm, setFpm] = useState<number | null>(null);
  const [crescInd, setCrescInd] = useState(0);
  const [crescRcl, setCrescRcl] = useState(0);
  // Robustez (Sprint G1): FUNDEB e folha têm significado fiscal próprio, distinto dos
  // choques genéricos — cada um só faz sentido para o indicador a que pertence.
  const [fundeb, setFundeb] = useState(0);
  const [folha, setFolha] = useState(0);
  const [modelo, setModelo] = useState<ForecastModelo | null>(null);
  // Simulador de novo contrato de dívida — só aparece para o indicador 'divida'. Vazio por
  // padrão: um principal de R$ 0 não é "sem contrato", então o envio ao backend é
  // condicionado a `contratoAtivo`, não a `contratoPrincipal > 0` sozinho.
  const [contratoAtivo, setContratoAtivo] = useState(false);
  const [contratoPrincipal, setContratoPrincipal] = useState(10_000_000);
  const [contratoPrazo, setContratoPrazo] = useState(120);
  const [contratoCarencia, setContratoCarencia] = useState(24);
  const [contratoTaxa, setContratoTaxa] = useState(10);
  const [nome, setNome] = useState('Cenário sem título');
  const [res, setRes] = useState<CenarioSimularResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const ehReceita = indicador === 'rcl' || indicador === 'receita';
  const ehPessoal = indicador === 'pessoal';
  const ehDivida = indicador === 'divida';

  const obs = (chave: string): PremissaObservada | undefined =>
    premissas.data?.premissas.find((p) => p.chave === chave);

  // Ancoragem única: assim que o observado chega, ele preenche o controle. Reaplicar a
  // cada render sobrescreveria o que o gestor acabou de digitar.
  useEffect(() => {
    if (!premissas.data) return;
    const valor = (chave: string): number | null => {
      const p = premissas.data?.premissas.find((x) => x.chave === chave);
      return p?.observado == null ? null : Number(p.observado);
    };
    setIpca((v) => (v === null ? valor('ipca_aa_pct') : v));
    setSelic((v) => (v === null ? valor('selic_aa_pct') : v));
    setFpm((v) => (v === null ? valor('fpm_variacao_pct') ?? 0 : v));
  }, [premissas.data]);

  async function run(salvar: boolean) {
    setBusy(true);
    setErro(null);
    try {
      const r = await simularCenario(ente, indicador, {
        nome,
        horizonte,
        modelo,
        // Premissa sem valor não vira zero: zero é uma premissa, "não informado" é outra.
        ipca_aa_pct: ipca ?? undefined,
        selic_aa_pct: selic ?? undefined,
        fpm_variacao_pct: fpm ?? undefined,
        crescimento_indicador_pct: crescInd,
        crescimento_rcl_pct: crescRcl,
        fundeb_variacao_pct: ehReceita ? fundeb : undefined,
        reajuste_folha_pct: ehPessoal ? folha : undefined,
        novo_contrato_divida: ehDivida && contratoAtivo
          ? ({
              principal_rs: contratoPrincipal,
              prazo_meses: contratoPrazo,
              carencia_meses: contratoCarencia,
              taxa_aa_pct: contratoTaxa,
            } satisfies NovoContratoDivida)
          : undefined,
        salvar,
      });
      setRes(r);
      if (salvar) onSaved();
    } catch (e) {
      setErro((e as { detail?: string; message?: string })?.detail || (e as Error)?.message || 'Erro na simulação');
    } finally {
      setBusy(false);
    }
  }

  const baseFinal = res ? num(res.base.projecao[res.base.projecao.length - 1]?.valor_previsto) : null;
  const cenFinal = res ? num(res.cenario.projecao[res.cenario.projecao.length - 1]?.valor_previsto) : null;
  const delta = baseFinal !== null && cenFinal !== null ? cenFinal - baseFinal : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 12 }}>
      <Card>
        <SectionLabel>Controles de cenário · &quot;e se?&quot;</SectionLabel>
        <PremissaAncorada premissa={obs('ipca_aa_pct')} valor={ipca} onChange={setIpca}
          label="IPCA (a.a.)" min={0} max={20} step={0.1} />
        <PremissaAncorada premissa={obs('selic_aa_pct')} valor={selic} onChange={setSelic}
          label="Selic (a.a.)" min={0} max={25} step={0.25} />
        <PremissaAncorada premissa={obs('fpm_variacao_pct')} valor={fpm} onChange={setFpm}
          label="Variação do FPM" min={-20} max={20} step={0.5} />
        <ScenarioSlider label="Crescimento do indicador" value={crescInd} min={-10} max={15} step={0.5} suffix="%" onChange={setCrescInd} />
        <ScenarioSlider label="Crescimento da RCL" value={crescRcl} min={-10} max={15} step={0.5} suffix="%" onChange={setCrescRcl} />
        {ehReceita && (
          <ScenarioSlider label="Variação do FUNDEB" value={fundeb} min={-20} max={20} step={0.5} suffix="%" onChange={setFundeb} />
        )}
        {ehPessoal && (
          <ScenarioSlider label="Reajuste de folha / admissões" value={folha} min={-10} max={20} step={0.5} suffix="%" onChange={setFolha} />
        )}
        {ehDivida && <NovoContratoDividaForm
          ativo={contratoAtivo} onAtivo={setContratoAtivo}
          principal={contratoPrincipal} onPrincipal={setContratoPrincipal}
          prazo={contratoPrazo} onPrazo={setContratoPrazo}
          carencia={contratoCarencia} onCarencia={setContratoCarencia}
          taxa={contratoTaxa} onTaxa={setContratoTaxa}
        />}
        <div style={{ marginTop: 12 }}>
          <label htmlFor="modelo-cenario" style={{ fontSize: 11.5, color: colors.muted, display: 'block', marginBottom: 4 }}>
            Modelo de projeção
          </label>
          <select
            id="modelo-cenario"
            value={modelo ?? ''}
            onChange={(e) => setModelo((e.target.value || null) as ForecastModelo | null)}
            style={{ width: '100%', padding: '6px 8px', fontSize: 12, border: `1px solid ${colors.border}`, borderRadius: 4, background: colors.surface, color: colors.ink }}
          >
            {MODELOS_CENARIO.map((m) => (
              <option key={m.label} value={m.value ?? ''}>{m.label}</option>
            ))}
          </select>
        </div>
        <input
          aria-label="Nome do cenário"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do cenário"
          style={{ width: '100%', marginTop: 10, padding: '7px 10px', fontSize: 12, border: `1px solid ${colors.border}`, borderRadius: 4, background: colors.surface, color: colors.ink }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button type="button" onClick={() => run(false)} disabled={busy} style={btn(colors.primary, colors.bg)}>
            {busy ? 'Simulando…' : 'Simular'}
          </button>
          <button type="button" onClick={() => run(true)} disabled={busy} style={btn(colors.surface, colors.ink, colors.border)}>
            Salvar cenário
          </button>
        </div>
        {erro && <div style={{ marginTop: 8, fontSize: 11, color: colors.red, fontFamily: font.mono }}>⚠ {erro}</div>}
      </Card>

      <Card>
        <SectionLabel note="premissas de gestor → recálculo no backend (não persiste até salvar)">
          Impacto do cenário
        </SectionLabel>
        {!res ? (
          <div style={{ fontSize: 12, color: colors.muted, padding: '18px 4px' }}>
            Ajuste os controles e clique em <strong>Simular</strong> para ver o impacto na projeção, nos limites e nos mínimos.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 20, alignItems: 'baseline', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Base</div>
                <div style={{ fontFamily: font.mono, fontSize: 18, fontWeight: 600 }}>{valorFmt(baseFinal ?? 0, unidade)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: colors.orange, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Cenário</div>
                <div style={{ fontFamily: font.mono, fontSize: 18, fontWeight: 600, color: colors.orange }}>{valorFmt(cenFinal ?? 0, unidade)}</div>
              </div>
              {delta !== null && (
                <div style={{ fontSize: 11, color: colors.muted }}>
                  {delta >= 0 ? '+' : ''}{valorFmt(delta, unidade)} vs. base
                  {res.persistido && <span style={{ marginLeft: 8, color: colors.green, fontWeight: 600 }}>· salvo ✓</span>}
                </div>
              )}
            </div>
            {/* **O que a premissa custa da margem.** A pergunta do gestor não é "qual o
                percentual projetado" — é "posso fazer isto?". Comparar a margem da base
                com a do cenário responde em reais, que é a unidade da decisão. */}
            <ConsumoDaMargem base={res.base} cenario={res.cenario} />
            <LimitImpactTable titulo="Impacto nos limites (tetos)" itens={res.impacto_limites} unidade={unidade} />
            <LimitImpactTable titulo="Impacto nos mínimos (pisos)" sentido="piso" itens={res.impacto_minimos} unidade={unidade} />
            <ImpactoContratoDividaPainel impacto={res.impacto_contrato_divida} />
            {/* Aviso legal calculado e antes descartado pela tela (Sprint G1): a RCL
                projetada é proxy explícita do teto/piso em reais, não a apuração oficial
                dos mínimos de saúde/educação. */}
            {typeof res.memoria['observacao_minimos'] === 'string' && (
              <div role="note" style={{ marginTop: 10, padding: '8px 10px', borderRadius: 4, background: colors.neutralBg, fontSize: 10.5, color: colors.muted, lineHeight: 1.5 }}>
                {res.memoria['observacao_minimos'] as string}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

/**
 * Simulador estruturado de novo contrato de dívida (Sprint G1, escopo mínimo).
 *
 * Antes o único jeito de simular dívida era o choque genérico de crescimento — sem
 * principal, prazo, carência ou taxa, um contrato de R$ 50 milhões e um de R$ 5 milhões
 * eram indistinguíveis se produzissem a mesma variação percentual. Aqui o gestor descreve
 * a operação como ela é negociada, e o backend traduz para o que importa: quanto ela come
 * do teto de 120%/200% da RCL. Não persiste — o contrato hipotético não vira linha em
 * nenhuma tabela; uma operação real nasce no SADIPEM.
 */
function NovoContratoDividaForm({
  ativo, onAtivo, principal, onPrincipal, prazo, onPrazo, carencia, onCarencia, taxa, onTaxa,
}: {
  ativo: boolean; onAtivo: (v: boolean) => void;
  principal: number; onPrincipal: (v: number) => void;
  prazo: number; onPrazo: (v: number) => void;
  carencia: number; onCarencia: (v: number) => void;
  taxa: number; onTaxa: (v: number) => void;
}) {
  return (
    <div style={{ marginTop: 12, padding: '9px 10px', border: `1px solid ${colors.border}`, borderRadius: 5 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
        <input type="checkbox" checked={ativo} onChange={(e) => onAtivo(e.target.checked)} />
        Simular novo contrato de dívida
      </label>
      {ativo && (
        <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <CampoNumero label="Principal (R$)" value={principal} onChange={onPrincipal} min={0} step={100000} />
          <CampoNumero label="Taxa a.a. (%)" value={taxa} onChange={onTaxa} min={0} max={100} step={0.25} />
          <CampoNumero label="Prazo (meses)" value={prazo} onChange={onPrazo} min={1} max={480} step={1} />
          <CampoNumero label="Carência (meses)" value={carencia} onChange={onCarencia} min={0} max={120} step={1} />
        </div>
      )}
    </div>
  );
}

function CampoNumero({ label, value, onChange, min, max, step }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <label style={{ fontSize: 10.5, color: colors.muted, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {label}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ padding: '5px 7px', fontSize: 12, fontFamily: font.mono, border: `1px solid ${colors.border}`, borderRadius: 4, background: colors.surface, color: colors.ink }}
      />
    </label>
  );
}

/** Quanto o contrato hipotético come do teto de 120%/200% da RCL. */
function ImpactoContratoDividaPainel({ impacto }: { impacto: CenarioSimularResponse['impacto_contrato_divida'] }) {
  if (!impacto) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 4 }}>
        Impacto do novo contrato no teto de DCL
      </div>
      <div style={{ padding: '7px 9px', borderRadius: 4, background: impacto.cruza ? colors.redBg : colors.surface, border: `1px solid ${colors.border}`, fontSize: 11.5 }}>
        {impacto.pct_rcl_adicional == null ? (
          <span style={{ color: colors.muted }}>Sem RCL no acervo para converter o principal em % da RCL.</span>
        ) : (
          <>
            <div>
              +{fmt(num(impacto.pct_rcl_adicional), 2)} p.p. de principal → resultante{' '}
              <strong style={{ fontFamily: font.mono, color: impacto.cruza ? colors.red : colors.ink }}>
                {fmt(num(impacto.pct_rcl_resultante), 2)}%
              </strong>{' '}
              / teto {fmt(num(impacto.teto_pct))}%
            </div>
            {impacto.cruza && (
              <div style={{ color: colors.red, fontWeight: 600, marginTop: 3 }}>
                Este contrato, por si só, ultrapassa o teto de DCL.
              </div>
            )}
          </>
        )}
        <div style={{ fontSize: 10, color: colors.faint, marginTop: 4, lineHeight: 1.4 }}>{impacto.fundamento}</div>
      </div>
    </div>
  );
}

/**
 * Impacto projetado sobre os limites.
 *
 * `sentido` não é detalhe de redação: sob o título "Impacto nos mínimos (pisos)", cada
 * linha lia "27,10% / **teto** 15%" — anunciando que a projeção de saúde romperia um teto
 * de 15%, quando 15% é o piso e 27,10% é cumprimento com folga.
 */
function LimitImpactTable({
  titulo,
  itens,
  unidade,
  sentido = 'teto',
}: {
  titulo: string;
  itens: LimiteImpacto[];
  unidade: string;
  sentido?: 'teto' | 'piso';
}) {
  if (!itens.length) return null;
  const ehPct = isPct(unidade);
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 4 }}>{titulo}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {itens.map((l) => (
          <div key={l.indicador} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, padding: '4px 8px', borderRadius: 4, background: l.cruza ? colors.redBg : colors.surface, border: `1px solid ${colors.border}` }}>
            <span style={{ color: colors.ink }}>{rotuloIndicador(l.indicador)}</span>
            <span style={{ fontFamily: font.mono, color: l.cruza ? colors.red : colors.muted }}>
              {l.pct_projetado !== null && ehPct
                ? `${pct(num(l.pct_projetado))} / ${sentido === 'piso' ? 'mínimo' : 'teto'} ${fmt(num(l.limite_pct))}%`
                : `${fmt(num(l.limite_pct))}% → ${brl(num(l.valor_limite_rs) / 1e6)}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------- //
// Cenários salvos
// --------------------------------------------------------------------------- //
/**
 * Cenários salvos: histórico, reabertura e comparação.
 *
 * Antes era uma grade de cartões inertes — nome, indicador e data, sem nada para fazer com
 * eles. Um cenário existe para ser reaberto (*"o que eu decidi em agosto ainda vale?"*) e
 * confrontado com outro; listar sem essas duas ações é guardar papel numa gaveta que não
 * abre.
 */
function SavedScenarios({
  res,
  onAbrir,
  selecionados,
  onSelecionar,
}: {
  res: ReturnType<typeof useResource>;
  onAbrir: (id: string) => void;
  selecionados: string[];
  onSelecionar: (id: string) => void;
}) {
  const list = (res.data as CenarioDetalhe[] | null) ?? [];
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // Exclusão definitiva pede confirmação — o botão vira "confirmar exclusão?" no próprio
  // cartão em vez de um `window.confirm` que o teste (e o leitor de tela) não vê chegar.
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);

  async function agir(id: string, acao: () => Promise<unknown>) {
    setOcupado(id);
    setErro(null);
    try {
      await acao();
      res.reload();
    } catch (e) {
      setErro((e as { detail?: string; message?: string })?.detail || (e as Error)?.message || 'Erro');
    } finally {
      setOcupado(null);
    }
  }

  if (!list.length) {
    return (
      <Card>
        <SectionLabel>Cenários salvos</SectionLabel>
        <div style={{ fontSize: 12, color: colors.muted, padding: '14px 2px', lineHeight: 1.6 }}>
          Nenhum cenário salvo para este ente. Simule acima e use <strong>Salvar cenário</strong>{' '}
          para guardar as premissas — o cenário registra sobre qual entrega foi calculado, e
          é isso que permite reabri-lo depois sabendo se ainda vale.
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <SectionLabel note="marque dois ou mais para comparar">
        Cenários salvos · {list.length}
      </SectionLabel>
      {erro && (
        <div role="alert" style={{ fontSize: 11, color: colors.red, fontFamily: font.mono, marginTop: 6 }}>
          ⚠ {erro}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(258px, 1fr))', gap: 10, marginTop: 8 }}>
        {list.map((c) => {
          const marcado = selecionados.includes(c.id);
          const ultima = c.versoes[0];
          return (
            <div
              key={c.id}
              style={{
                border: `1px solid ${marcado ? colors.primary : colors.border}`,
                borderRadius: 5,
                padding: 12,
                borderTop: `3px solid ${colors.orange}`,
                background: marcado ? colors.accentSoft : colors.surface,
                opacity: ocupado === c.id ? 0.55 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => onSelecionar(c.id)}
                  aria-label={`Selecionar ${c.nome} para comparação`}
                  style={{ marginTop: 2 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{c.nome}</div>
                  <div style={{ fontSize: 11, color: colors.muted, marginTop: 3 }}>
                    {rotuloIndicador(c.indicador)} ·{' '}
                    <strong>
                      {c.versao_atual} {c.versao_atual === 1 ? 'versão' : 'versões'}
                    </strong>{' '}
                    · {new Date(c.atualizado_em ?? c.criado_em).toLocaleDateString('pt-BR')}
                  </div>
                  {/* `criado_por` era gravado desde a Sprint C2 e nunca chegava à tela
                      (Sprint G1) — quem decidiu fica só no banco. */}
                  {c.criado_por && (
                    <div style={{ fontSize: 10.5, color: colors.faint, marginTop: 2 }}>
                      criado por {c.criado_por}
                    </div>
                  )}
                  {/* Versão sem procedência não pode prometer reprodutibilidade que não tem. */}
                  {ultima && !ultima.procedencia.registrada && (
                    <div style={{ fontSize: 10.5, color: colors.orange, marginTop: 3, lineHeight: 1.4 }}>
                      procedência não registrada
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 9, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => onAbrir(c.id)} style={acaoLink(colors.primary)}>
                  reabrir
                </button>
                <button
                  type="button"
                  onClick={() => agir(c.id, () => duplicarCenario(c.id))}
                  style={acaoLink(colors.muted)}
                >
                  duplicar
                </button>
                <button
                  type="button"
                  onClick={() => agir(c.id, () => exportarCenario(c.id, null, 'csv'))}
                  style={acaoLink(colors.muted)}
                >
                  exportar
                </button>
                <button
                  type="button"
                  onClick={() => agir(c.id, () => arquivarCenario(c.id, c.arquivado))}
                  style={acaoLink(colors.muted)}
                >
                  {c.arquivado ? 'restaurar' : 'arquivar'}
                </button>
                {confirmandoExclusao === c.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { setConfirmandoExclusao(null); void agir(c.id, () => excluirCenarioDefinitivo(c.id)); }}
                      style={acaoLink(colors.red)}
                    >
                      confirmar exclusão definitiva
                    </button>
                    <button type="button" onClick={() => setConfirmandoExclusao(null)} style={acaoLink(colors.muted)}>
                      cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmandoExclusao(c.id)}
                    style={acaoLink(colors.red)}
                  >
                    excluir definitivamente
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

const acaoLink = (cor: string) => ({
  background: 'transparent',
  border: 'none',
  padding: 0,
  fontSize: 11,
  color: cor,
  cursor: 'pointer',
  textDecoration: 'underline',
});

/**
 * Cenário reaberto: o que foi decidido e o que o dado diz hoje.
 *
 * O ponto da tela é **não escolher** entre os dois. Mostrar só o guardado esconde que o
 * dado mudou; mostrar só o recalculado apaga o registro da decisão. As duas perguntas são
 * legítimas — "com o que eu decidi" e "isso ainda vale?" — e a segunda só existe se os
 * dois números estiverem lado a lado.
 */
function CenarioReaberto({ id, onFechar }: { id: string; onFechar: () => void }) {
  const res = useResource(() => fetchCenario(id), [id]);
  return (
    <Card>
      {/* Região nomeada: dá ao leitor de tela um marco navegável para um painel que
          aparece e some, e ao teste um escopo — os mesmos números existem no gráfico. */}
      <div role="region" aria-label="Cenário reaberto" data-testid="cenario-reaberto">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <SectionLabel note="o guardado e o de hoje, lado a lado">Cenário reaberto</SectionLabel>
        <button type="button" onClick={onFechar} style={acaoLink(colors.muted)}>
          fechar
        </button>
      </div>
      <Async res={res}>
        {(d) => {
          const div = d.divergencia;
          const guardado = div.valor_guardado == null ? null : num(div.valor_guardado);
          const hoje = div.valor_recalculado == null ? null : num(div.valor_recalculado);
          return (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {d.cenario.nome}{' '}
                <span style={{ fontSize: 11, color: colors.muted, fontWeight: 400 }}>
                  · versão {d.versao.versao} de {d.cenario.versao_atual}
                  {d.versao.criado_por && ` · gravada por ${d.versao.criado_por}`}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 22, marginTop: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={rotuloMini}>Como foi salvo</div>
                  <div style={{ fontFamily: font.mono, fontSize: 17, fontWeight: 650 }}>
                    {guardado == null ? '—' : `${fmt(guardado, 2)}%`}
                  </div>
                  <div style={{ fontSize: 10.5, color: colors.faint, marginTop: 2 }}>
                    {d.versao.procedencia.as_of
                      ? new Date(d.versao.procedencia.as_of).toLocaleString('pt-BR')
                      : 'data não registrada'}
                  </div>
                </div>
                <div>
                  <div style={rotuloMini}>Com o dado de hoje</div>
                  <div
                    style={{
                      fontFamily: font.mono,
                      fontSize: 17,
                      fontWeight: 650,
                      color: div.diverge ? colors.orange : colors.ink,
                    }}
                  >
                    {hoje == null ? '—' : `${fmt(hoje, 2)}%`}
                  </div>
                  {div.delta != null && (
                    <div style={{ fontSize: 10.5, color: colors.faint, marginTop: 2 }}>
                      {num(div.delta) >= 0 ? '+' : '−'}
                      {fmt(Math.abs(num(div.delta)), 2)} p.p.
                    </div>
                  )}
                </div>
              </div>

              {/* "Não deu para comparar" e "está tudo igual" produziriam a mesma tela se o
                  componente olhasse só `diverge`. */}
              <div
                role="status"
                style={{
                  marginTop: 11,
                  padding: '9px 11px',
                  borderRadius: 5,
                  fontSize: 11.5,
                  lineHeight: 1.55,
                  background: !div.comparavel
                    ? colors.neutralBg
                    : div.diverge
                      ? colors.orangeBg
                      : colors.greenBg,
                  border: `1px solid ${!div.comparavel ? colors.border : div.diverge ? colors.orange : colors.green}`,
                }}
              >
                {!div.comparavel ? (
                  <>
                    <strong>Não foi possível comparar.</strong> {div.motivo}
                  </>
                ) : div.diverge ? (
                  <>
                    <strong>O resultado mudou desde que você salvou.</strong> {div.motivo}
                  </>
                ) : (
                  <>
                    <strong>O cenário continua valendo.</strong> Recalculado com o dado de hoje,
                    o resultado é o mesmo.
                  </>
                )}
                {div.entregas_novas.length > 0 && (
                  <div style={{ marginTop: 5 }}>
                    Entregas que apareceram depois:{' '}
                    <span style={{ fontFamily: font.mono }}>{div.entregas_novas.join(', ')}</span>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={rotuloMini}>Premissas desta versão</div>
                <div style={{ fontSize: 11.5, color: colors.ink, marginTop: 4, lineHeight: 1.7 }}>
                  {Object.entries(d.versao.parametros)
                    .filter(([k]) => !['salvar', 'nome', 'cenario_id'].includes(k))
                    .map(([k, v]) => `${humanizar(k)}: ${String(v)}`)
                    .join(' · ') || 'sem premissas registradas'}
                </div>
              </div>

              {d.cenario.versoes.length > 1 && (
                <div style={{ marginTop: 12 }}>
                  <div style={rotuloMini}>Histórico</div>
                  <ul style={{ margin: '5px 0 0', paddingLeft: 18, fontSize: 11.5, lineHeight: 1.7 }}>
                    {d.cenario.versoes.map((v) => (
                      <li key={v.versao}>
                        <strong>v{v.versao}</strong> — {v.nome} ·{' '}
                        {new Date(v.criado_em).toLocaleDateString('pt-BR')}
                        {!v.procedencia.registrada && (
                          <span style={{ color: colors.orange }}> · sem procedência</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        }}
      </Async>
      </div>
    </Card>
  );
}

const rotuloMini = {
  fontSize: 10.5,
  color: colors.faint,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  fontWeight: 600,
};

/**
 * Comparação de cenários salvos.
 *
 * O eixo é a **interseção** dos horizontes, e o backend já a calcula: comparar um cenário
 * de 4 períodos com um de 12 num eixo de 12 deixaria o primeiro terminando no meio do
 * gráfico, e a leitura natural — "este despenca no fim" — seria falsa.
 */
function ComparacaoCenariosPainel({
  ente,
  enteNome,
  ids,
  onFechar,
}: {
  ente: string;
  enteNome: string;
  ids: string[];
  onFechar: () => void;
}) {
  const res = useResource(() => compararCenarios(ente, ids), [ente, ids.join(',')]);
  return (
    <Card>
      <div role="region" aria-label="Comparação de cenários" data-testid="comparacao-cenarios">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <SectionLabel note="mesma janela de períodos para todos">
          Comparação de cenários · {ids.length}
        </SectionLabel>
        <button type="button" onClick={onFechar} style={acaoLink(colors.muted)}>
          fechar
        </button>
      </div>
      <Async res={res}>
        {(d) => (
          <div style={{ marginTop: 8 }}>
            {d.aviso && (
              <div role="status" style={{ fontSize: 11.5, color: colors.orange, marginBottom: 9, lineHeight: 1.5 }}>
                ⚠ {d.aviso}
              </div>
            )}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: 420 }}>
                <caption className="sr-only">Cenários comparados período a período</caption>
                <thead>
                  <tr>
                    <th scope="col" style={thCmp}>Cenário</th>
                    {d.periodos.map((p) => (
                      <th key={p} scope="col" style={{ ...thCmp, textAlign: 'right' }}>
                        {p}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.itens.map((item) => (
                    <tr key={item.cenario_id} style={{ borderTop: `1px solid ${colors.rowBorder}` }}>
                      <th scope="row" style={{ ...tdCmp, textAlign: 'left', fontWeight: 500 }}>
                        {item.encontrado ? (
                          <>
                            {item.nome}{' '}
                            <span style={{ color: colors.faint, fontSize: 10.5 }}>v{item.versao}</span>
                          </>
                        ) : (
                          /* Some da lista faria o gestor comparar duas curvas achando que
                             são as três que escolheu. */
                          <span style={{ color: colors.orange }}>{item.motivo_ausencia}</span>
                        )}
                      </th>
                      {d.periodos.map((p) => {
                        const ponto = item.projecao.find((x) => x.periodo_alvo === p);
                        return (
                          <td key={p} style={{ ...tdCmp, textAlign: 'right', fontFamily: font.mono }}>
                            {ponto ? `${fmt(num(ponto.valor_previsto), 2)}%` : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Exportar/imprimir a comparação (Sprint G1) — reusa o mesmo ExportButton da
                comparação de modelos, para o mesmo padrão CSV + relatório institucional. */}
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
              <ExportButton
                nome="Comparação de cenários"
                linhas={d.itens.filter((item) => item.encontrado)}
                colunas={[
                  { cabecalho: 'cenario', valor: (item: CenarioComparadoItem) => item.nome },
                  { cabecalho: 'versao', valor: (item: CenarioComparadoItem) => item.versao },
                  ...d.periodos.map((p) => ({
                    cabecalho: p,
                    valor: (item: CenarioComparadoItem) => {
                      const ponto = item.projecao.find((x) => x.periodo_alvo === p);
                      return ponto ? Number(ponto.valor_previsto) : '';
                    },
                  })),
                ]}
                contexto={{
                  ente: enteNome,
                  periodo: d.periodos.join(' '),
                  fonte: `Comparação de cenários salvos${d.aviso ? ' · ' + d.aviso : ''}`,
                }}
                modeloRelatorio="tecnico"
              />
            </div>
          </div>
        )}
      </Async>
      </div>
    </Card>
  );
}

const thCmp = {
  fontSize: 10.5,
  color: colors.muted,
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
  padding: '6px 12px 6px 0',
  textAlign: 'left' as const,
};
const tdCmp = { padding: '7px 12px 7px 0' };

// --------------------------------------------------------------------------- //
// Gráfico de projeção (data-driven: histórico + projeção + banda IC + teto)
// --------------------------------------------------------------------------- //
function ProjectionChart({ data }: { data: ProjecaoResponse }) {
  const titleId = useId();
  const descriptionId = useId();
  // Ler uma projeção é ler ponto a ponto ("quando cruza?", "quanto no 4º bimestre?"). Sem
  // hover, o gráfico só respondia isso na tabela sr-only — invisível para quem enxerga.
  const [sob, setSob] = useState<{ i: number; projetado: boolean } | null>(null);
  const hist = data.historico.map((p) => ({ x: p.periodo, v: num(p.valor) }));
  const proj = data.projecao.map((p) => ({
    x: p.periodo_alvo,
    v: num(p.valor_previsto),
    lo: num(p.ic_inferior),
    hi: num(p.ic_superior),
  }));
  if (!hist.length) return null;

  const W = 500;
  const H = 230;
  const padL = 52;
  const padT = 16;
  const padB = 28;
  const plotW = W - padL - 14;
  const plotH = H - padT - padB;

  const teto = data.cruzamento.aplicavel ? num(data.cruzamento.teto_pct) : null;
  const allV = [
    ...hist.map((p) => p.v),
    ...proj.flatMap((p) => [p.lo, p.hi]),
    ...(teto !== null ? [teto] : []),
  ];
  let yMin = Math.min(...allV);
  let yMax = Math.max(...allV);
  const span = yMax - yMin || Math.abs(yMax) || 1;
  yMin -= span * 0.12;
  yMax += span * 0.12;

  const nSeg = hist.length + proj.length - 1;
  const xOf = (i: number) => padL + (plotW * i) / Math.max(nSeg, 1);
  const yOf = (v: number) => padT + plotH * (1 - (v - yMin) / (yMax - yMin));

  const histPts = hist.map((p, i) => `${xOf(i).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ');
  const projPts = proj.map((p, i) => `${xOf(hist.length - 1 + i).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ');
  // Conecta o último histórico ao primeiro projetado.
  const bridge = proj.length
    ? `${xOf(hist.length - 1).toFixed(1)},${yOf(hist[hist.length - 1].v).toFixed(1)} ${projPts.split(' ')[0]}`
    : '';

  const bandHi = proj.map((p, i) => ({ x: xOf(hist.length - 1 + i), y: yOf(p.hi) }));
  const bandLo = proj.map((p, i) => ({ x: xOf(hist.length - 1 + i), y: yOf(p.lo) }));
  const band =
    bandHi.length > 0
      ? `M ${bandHi.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')} L ${bandLo
          .slice()
          .reverse()
          .map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
          .join(' L ')} Z`
      : '';

  const ehPct = isPct(data.unidade);
  const yLabel = (v: number) => (ehPct ? `${fmt(v, 0)}%` : fmt(v / 1e6, 0));
  const cross = data.projecao.find((p: PontoProjecao) => p.cruza_limite);
  const crossIdx = cross ? data.projecao.indexOf(cross) : -1;

  const formatarValor = (v: number) => (ehPct ? `${fmt(v, 2)}%` : fmt(v, 2));
  const pontoSob = sob
    ? sob.projetado
      ? { rotulo: proj[sob.i]?.x, valor: proj[sob.i]?.v, lo: proj[sob.i]?.lo, hi: proj[sob.i]?.hi }
      : { rotulo: hist[sob.i]?.x, valor: hist[sob.i]?.v, lo: null, hi: null }
    : null;

  return (
    <figure style={{ margin: 0, position: 'relative' }}>
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 230 }}
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
      focusable="false"
      onMouseLeave={() => setSob(null)}
    >
      <title id={titleId}>Histórico e projeção de {rotuloIndicador(data.indicador)}</title>
      <desc id={descriptionId}>
        Série com {hist.length} períodos históricos e {proj.length} períodos projetados,
        incluindo intervalo de confiança. A tabela seguinte contém os valores exatos.
      </desc>
      {/* grade Y */}
      {[0, 0.5, 1].map((f) => {
        const v = yMin + (yMax - yMin) * f;
        const y = yOf(v);
        return (
          <g key={f}>
            <line x1={padL} y1={y} x2={W - 14} y2={y} stroke={colors.border} strokeWidth={0.5} />
            <text x={padL - 6} y={y + 3} fontSize={11} fill={colors.faint} textAnchor="end" fontFamily={font.mono}>{yLabel(v)}</text>
          </g>
        );
      })}
      {/* teto legal */}
      {teto !== null && (
        <>
          <line x1={padL} y1={yOf(teto)} x2={W - 14} y2={yOf(teto)} stroke={colors.red} strokeWidth={1} strokeDasharray="4 3" />
          <text x={W - 14} y={yOf(teto) - 3} fontSize={11} fill={colors.red} textAnchor="end" fontWeight={600}>TETO {fmt(teto, 0)}%</text>
        </>
      )}
      {/* banda IC */}
      {band && <path d={band} fill={colors.primary} fillOpacity={0.12} />}
      {/* histórico */}
      <polyline points={histPts} stroke={colors.primary} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* ponte + projeção tracejada */}
      {bridge && <polyline points={bridge} stroke={colors.primary} strokeWidth={1.6} fill="none" strokeDasharray="3 3" />}
      <polyline points={projPts} stroke={colors.primary} strokeWidth={1.6} fill="none" strokeDasharray="3 3" strokeLinecap="round" />
      {/* pontos históricos */}
      {hist.map((p, i) => (
        <circle key={`h${i}`} cx={xOf(i)} cy={yOf(p.v)} r={2.4} fill={colors.primary} />
      ))}
      {/* marcador de cruzamento */}
      {crossIdx >= 0 && (
        <>
          <circle cx={xOf(hist.length - 1 + crossIdx + 1)} cy={yOf(num(cross!.valor_previsto))} r={4} fill={colors.red} />
          <line x1={xOf(hist.length - 1 + crossIdx + 1)} y1={yOf(num(cross!.valor_previsto))} x2={xOf(hist.length - 1 + crossIdx + 1)} y2={padT} stroke={colors.red} strokeWidth={1} strokeDasharray="2 2" />
        </>
      )}
      {/* rótulos X (primeiro, virada, último) */}
      {[hist[0]?.x, hist[hist.length - 1]?.x, proj[proj.length - 1]?.x].map((lbl, k) => {
        const idx = k === 0 ? 0 : k === 1 ? hist.length - 1 : nSeg;
        return lbl ? (
          <text key={k} x={xOf(idx)} y={H - 8} fontSize={11} fill={colors.faint} textAnchor="middle" fontFamily={font.mono}>{lbl}</text>
        ) : null;
      })}

      {/* Alvos de hover — uma faixa por período, sempre maior que a marca de 2,4px. */}
      {[...hist.map((_, i) => ({ i, projetado: false })), ...proj.map((_, i) => ({ i, projetado: true }))].map(
        (alvo, ordem) => {
          const largura = plotW / Math.max(nSeg, 1);
          const destacado =
            sob !== null && sob.i === alvo.i && sob.projetado === alvo.projetado;
          const cy = alvo.projetado ? yOf(proj[alvo.i].v) : yOf(hist[alvo.i].v);
          return (
            <g key={`alvo-${ordem}`}>
              {destacado && (
                <circle cx={xOf(ordem)} cy={cy} r={4.5} fill="none" stroke={colors.primary} strokeWidth={1.5} />
              )}
              <rect
                x={xOf(ordem) - largura / 2}
                y={padT}
                width={largura}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setSob(alvo)}
              />
            </g>
          );
        },
      )}
    </svg>
      {pontoSob?.valor !== undefined && pontoSob.rotulo && (
        <div
          role="status"
          style={{
            position: 'absolute', top: 0, right: 0,
            background: colors.surface, border: `1px solid ${colors.border}`,
            borderRadius: 4, padding: '6px 8px', fontSize: 11,
            fontFamily: font.mono, color: colors.ink, pointerEvents: 'none',
            boxShadow: '0 6px 18px rgba(15,26,20,0.10)', whiteSpace: 'nowrap',
          }}
        >
          <strong>{pontoSob.rotulo}</strong>
          <div>
            {formatarValor(pontoSob.valor)}
            {sob?.projetado ? ' · projetado' : ''}
          </div>
          {pontoSob.lo !== null && pontoSob.hi !== null && (
            <div style={{ color: colors.faint }}>
              IC {formatarValor(pontoSob.lo)}–{formatarValor(pontoSob.hi)}
            </div>
          )}
        </div>
      )}
      <table className="sr-only">
        <caption>Alternativa tabular do histórico e da projeção de {rotuloIndicador(data.indicador)}</caption>
        <thead>
          <tr>
            <th scope="col">Período</th>
            <th scope="col">Tipo</th>
            <th scope="col">Valor</th>
            <th scope="col">Intervalo inferior</th>
            <th scope="col">Intervalo superior</th>
          </tr>
        </thead>
        <tbody>
          {hist.map((point) => (
            <tr key={`historico-${point.x}`}>
              <td>{point.x}</td>
              <td>Histórico</td>
              <td>{yLabel(point.v)}</td>
              <td>não se aplica</td>
              <td>não se aplica</td>
            </tr>
          ))}
          {proj.map((point) => (
            <tr key={`projecao-${point.x}`}>
              <td>{point.x}</td>
              <td>Projeção</td>
              <td>{yLabel(point.v)}</td>
              <td>{yLabel(point.lo)}</td>
              <td>{yLabel(point.hi)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/**
 * Um controle de premissa que **diz de onde parte**.
 *
 * O slider anterior era um número sem procedência: 4,5% e 10,5% apareciam com a mesma
 * aparência de qualquer valor informado pelo gestor. Aqui o observado vem do acervo com
 * data, fonte e número de observações, e o botão "voltar ao observado" existe porque
 * depois de mexer não havia como saber qual era a âncora.
 *
 * Quando a série não sustenta o cálculo, o controle **não sugere**: mostra o motivo e
 * espera o valor. Uma premissa inventada é indistinguível de uma medida assim que entra
 * no formulário, e o cenário inteiro herda essa confusão.
 */
function PremissaAncorada({
  premissa,
  valor,
  onChange,
  label,
  min,
  max,
  step,
}: {
  premissa?: PremissaObservada;
  valor: number | null;
  onChange: (v: number) => void;
  label: string;
  min: number;
  max: number;
  step: number;
}) {
  const observado = premissa?.observado == null ? null : Number(premissa.observado);
  const alterado = observado !== null && valor !== null && Math.abs(valor - observado) > 1e-9;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 11.5, color: colors.muted }}>{label}</span>
        <span style={{ fontFamily: font.mono, fontSize: 12, fontWeight: 600 }}>
          {valor === null ? '—' : `${valor > 0 ? '+' : ''}${fmt(valor, 2)}%`}
        </span>
      </div>

      <input
        type="range"
        aria-label={label}
        aria-valuetext={valor === null ? 'não informado' : `${fmt(valor, 2)}%`}
        min={min}
        max={max}
        step={step}
        value={valor ?? min}
        disabled={valor === null && !premissa}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', marginTop: 4 }}
      />

      {observado !== null ? (
        <div style={{ fontSize: 10.5, color: colors.faint, lineHeight: 1.5, marginTop: 2 }}>
          observado <strong style={{ color: colors.muted }}>{fmt(observado, 2)}%</strong>
          {premissa?.referencia ? ` · até ${premissa.referencia}` : ''}
          {premissa?.n_observacoes ? ` · ${premissa.n_observacoes} meses` : ''}
          {premissa?.fonte ? ` · ${premissa.fonte}` : ''}
          {alterado && (
            <>
              {' · '}
              <button
                type="button"
                onClick={() => onChange(observado)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  font: 'inherit',
                  color: colors.primary,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                voltar ao observado
              </button>
            </>
          )}
        </div>
      ) : (
        <div role="note" style={{ fontSize: 10.5, color: colors.orange, lineHeight: 1.5, marginTop: 2 }}>
          {premissa?.motivo ?? 'Sem observação no acervo — informe a premissa.'}
        </div>
      )}
    </div>
  );
}

function ScenarioSlider({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (v: number) => void }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11.5, color: colors.muted }}>{label}</span>
        <span style={{ fontFamily: font.mono, fontSize: 12, fontWeight: 600 }}>{value > 0 ? '+' : ''}{value}{suffix}</span>
      </div>
      <input
        type="range"
        aria-label={label}
        aria-valuetext={`${value > 0 ? '+' : ''}${value}${suffix}`}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%' }}
      />
    </div>
  );
}

function Legend({ color, label, solid }: { color: string; label: string; solid?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 14, height: 0, borderTop: `2px ${solid ? 'solid' : 'dashed'} ${color}` }} />
      <span>{label}</span>
    </div>
  );
}

function btn(bg: string, fg: string, border?: string): React.CSSProperties {
  return {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
    background: bg,
    color: fg,
    border: border ? `1px solid ${border}` : 'none',
    cursor: 'pointer',
  };
}

/**
 * Comparação das três camadas (Sprint 25E).
 *
 * Pergunta gerencial: **"por que esse número, e não outro?"**. Mostra o que cada modelo
 * projeta, a largura do IC (a medida honesta de incerteza) e — quando é o caso — por que
 * um deles **não** está disponível. Não há ranking por acurácia: a série é curta demais
 * para um backtest que não seja ruído, e o backend diz isso no critério.
 */
function ComparacaoModelos({
  cod,
  enteNome,
  indicador,
  horizonte,
}: {
  cod: string;
  enteNome: string;
  indicador: ForecastIndicador;
  horizonte: number;
}) {
  const res = useResource(
    () => fetchComparacaoModelos(cod, { indicador, horizonte }),
    [cod, indicador, horizonte],
  );
  return (
    <Card>
      <SectionLabel note="mesma série, mesmo horizonte — o que muda é o método">
        Comparação de modelos
      </SectionLabel>
      <Async res={res} skeleton={<Skeleton linhas={4} />}>
        {(c) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
              {c.modelos.map((m) => (
                <ModeloCard key={m.modelo} m={m} unidade={c.unidade} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: colors.muted, lineHeight: 1.5 }}>
              {c.criterio_escolha}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FonteChip
                source={c.source_ref}
                nota={`${c.n_periodos_historicos} períodos históricos · horizonte +${c.horizonte}`}
              />
              <div style={{ marginLeft: 'auto' }}>
                <ExportButton
                  nome={`Modelos ${indicador}`}
                  linhas={c.modelos}
                  colunas={[
                    { cabecalho: 'modelo', valor: (m) => m.modelo },
                    { cabecalho: 'disponivel', valor: (m) => (m.disponivel ? 'sim' : 'nao') },
                    { cabecalho: 'escolhido', valor: (m) => (m.escolhido ? 'sim' : 'nao') },
                    { cabecalho: 'valor_final', valor: (m) => (m.valor_final == null ? '' : Number(m.valor_final)) },
                    { cabecalho: 'ic_inferior_final', valor: (m) => (m.ic_inferior_final == null ? '' : Number(m.ic_inferior_final)) },
                    { cabecalho: 'ic_superior_final', valor: (m) => (m.ic_superior_final == null ? '' : Number(m.ic_superior_final)) },
                    { cabecalho: 'amplitude_ic_media', valor: (m) => (m.amplitude_ic_media == null ? '' : Number(m.amplitude_ic_media)) },
                    { cabecalho: 'r2', valor: (m) => (m.r2 == null ? '' : Number(m.r2)) },
                    { cabecalho: 'n_obs', valor: (m) => m.n_obs },
                    { cabecalho: 'cruza_limite', valor: (m) => (m.cruza_limite ? 'sim' : 'nao') },
                  ]}
                  contexto={{
                    ente: enteNome,
                    periodo: c.periodos_projetados.join(' '),
                    fonte: `${c.descricao} · ${c.aviso}`,
                  }}
                  modeloRelatorio="tecnico"
                />
              </div>
            </div>
          </div>
        )}
      </Async>
    </Card>
  );
}

function ModeloCard({ m, unidade }: { m: ModeloComparado; unidade: string }) {
  if (!m.disponivel) {
    return (
      <div
        data-testid={`modelo-${m.modelo}`}
        style={{ padding: '10px 12px', border: `1px dashed ${colors.border}`, borderRadius: 6, background: colors.bg }}
      >
        <div style={{ fontSize: 11.5, fontWeight: 600, color: colors.muted }}>{m.rotulo}</div>
        <div style={{ fontSize: 11, color: colors.faint, fontWeight: 700, letterSpacing: '0.05em', marginTop: 4 }}>
          INDISPONÍVEL
        </div>
        <div style={{ fontSize: 11, color: colors.muted, marginTop: 4, lineHeight: 1.45 }}>
          {m.motivo_indisponivel}
        </div>
      </div>
    );
  }
  return (
    <div
      data-testid={`modelo-${m.modelo}`}
      style={{
        padding: '10px 12px', borderRadius: 6,
        border: `1px solid ${m.escolhido ? colors.primary : colors.border}`,
        borderLeftWidth: m.escolhido ? 4 : 1,
        background: m.escolhido ? colors.accentSoft : colors.surface,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600 }}>{m.rotulo}</span>
        {m.escolhido && (
          <span style={{ fontSize: 11, fontWeight: 700, color: colors.primary, letterSpacing: '0.05em' }}>
            ● EM USO
          </span>
        )}
      </div>
      <div style={{ fontFamily: font.mono, fontSize: 20, fontWeight: 700, marginTop: 4 }}>
        {valorFmt(num(m.valor_final), unidade)}
      </div>
      <div style={{ fontSize: 11, color: colors.muted, fontFamily: font.mono }}>
        IC {valorFmt(num(m.ic_inferior_final), unidade)} — {valorFmt(num(m.ic_superior_final), unidade)}
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: colors.muted, lineHeight: 1.5 }}>
        amplitude média do IC{' '}
        <strong style={{ fontFamily: font.mono, color: colors.ink }}>
          {m.amplitude_ic_media == null ? '—' : valorFmt(num(m.amplitude_ic_media), unidade)}
        </strong>
        {m.r2 != null && (
          <>
            {' · '}R² <strong style={{ fontFamily: font.mono, color: colors.ink }}>{fmt(num(m.r2), 3)}</strong>
          </>
        )}
        {m.n_obs != null && <> · {m.n_obs} obs.</>}
      </div>
      {m.cruza_limite && (
        <div style={{ marginTop: 5, fontSize: 11, color: colors.red }}>
          cruza o limite {m.periodo_cruzamento ? `em ${m.periodo_cruzamento}` : ''}
        </div>
      )}
    </div>
  );
}
