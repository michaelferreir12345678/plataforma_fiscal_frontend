/**
 * Central de Dados (Sprint 24) — operação da ingestão pela interface.
 *
 * Reúne o catálogo de fontes, a matriz de cobertura, a fila de **jobs assíncronos**
 * (execução/backfill/replay com progresso, retry e cancelamento) e as retificações. A
 * execução é sempre um job na fila (Redis/RQ) — o request volta na hora (202) e a barra de
 * progresso anda por polling. Ações custosas (acima do limiar) exigem **confirmação explícita**.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { colors, font } from '../theme';
import { Card } from '../components/Card';
import { Async } from '../components/AsyncState';
import { AccessibleTabs, tabId, tabPanelId } from '../components/AccessibleTabs';
import { PageHeader } from '../components/PageHeader';
import { ResolucaoQualidade } from '../components/ResolucaoQualidade';
import { useApp, useResource } from '../context/AppContext';
import { Explicacao } from '../components/ExplicacaoIA';
import {
  buscarCentralDados,
  fetchLineage,
  fetchQualidade,
  cancelarIngestJob,
  criarIngestJob,
  fetchCobertura,
  fetchFontes,
  fetchIngestJob,
  fetchIngestJobs,
  fetchRetificacoes,
  fetchSaudeFila,
  retryIngestJob,
} from '../services/backend';
import type {
  CoberturaItem,
  InsightResposta,
  FonteCatalogo,
  IngestJob,
  IngestJobCreateInput,
  IngestJobCreateResult,
  LineageAresta,
  SaudeFila,
  StatusCheck,
} from '../services/backend';

type Aba = 'catalogo' | 'cobertura' | 'jobs' | 'retificacoes' | 'qualidade' | 'lineage';

const STATUS_COR: Record<string, string> = {
  na_fila: colors.neutral,
  executando: colors.yellowText,
  concluido: colors.green,
  falhou: colors.red,
  cancelado: colors.faint,
};
const STATUS_ROTULO: Record<string, string> = {
  na_fila: 'Na fila',
  executando: 'Executando',
  concluido: 'Concluído',
  falhou: 'Falhou',
  cancelado: 'Cancelado',
};

const hora = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

export function CentralDadosPage() {
  const [params] = useSearchParams();
  // O alerta de qualidade linka para cá com ?painel=qualidade — cair na aba certa é
  // parte do "nunca silencioso": o gestor clica no alerta e vê a verificação.
  const abaInicial = (params.get('painel') as Aba | null) ?? 'jobs';
  const [aba, setAba] = useState<Aba>(abaInicial);
  const abas: { id: Aba; label: string }[] = [
    { id: 'jobs', label: 'Jobs de ingestão' },
    { id: 'qualidade', label: 'Qualidade' },
    { id: 'lineage', label: 'Lineage' },
    { id: 'catalogo', label: 'Catálogo de fontes' },
    { id: 'cobertura', label: 'Cobertura' },
    { id: 'retificacoes', label: 'Retificações' },
  ];
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Central de Dados">
      <PageHeader
        title="Central de Dados"
        context="Operação da ingestão, qualidade, lineage e cobertura sob RBAC"
        source="Metadados operacionais, bronze/silver/gold e trilha de auditoria"
        actions={(
          <AccessibleTabs
            tabs={abas}
            value={aba}
            onChange={setAba}
            label="Painéis da Central de Dados"
            idPrefix="central-dados"
          />
        )}
      />
      <BuscaEmLinguagemNatural />
      <div
        id={tabPanelId('central-dados', aba)}
        role="tabpanel"
        aria-labelledby={tabId('central-dados', aba)}
        tabIndex={0}
      >
        {aba === 'jobs' && <JobsTab />}
        {aba === 'qualidade' && <QualidadeTab />}
        {aba === 'lineage' && <LineageTab />}
        {aba === 'catalogo' && <CatalogoTab />}
        {aba === 'cobertura' && <CoberturaTab />}
        {aba === 'retificacoes' && <RetificacoesTab />}
      </div>
    </div>
  );
}


/**
 * Busca em linguagem natural (Sprint IA-5, item 4 da §4).
 *
 * Pergunta gerencial que responde: **"por que a página de Saúde está vazia para o meu
 * município?"** — que é pergunta de operação, e cuja resposta já é dado: cobertura
 * (`mart_cobertura_fonte`), qualidade (`data_quality_check`) e calendário
 * (`gold.calendario_obrigacao`). A IA roteia a pergunta e redige; os fatos são das
 * ferramentas.
 *
 * Fica **fora** das abas de propósito: a pergunta que traz o gestor até aqui costuma vir
 * de outra tela ("está vazio, e agora?"), e obrigá-lo a adivinhar a aba certa antes de
 * perguntar seria devolver a ele o trabalho que esta busca existe para fazer.
 */
function BuscaEmLinguagemNatural() {
  const { ente } = useApp();
  const [pergunta, setPergunta] = useState('');
  const [resposta, setResposta] = useState<InsightResposta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function perguntar(evento: FormEvent) {
    evento.preventDefault();
    const texto = pergunta.trim();
    if (!texto) return;
    setCarregando(true);
    setErro(null);
    setResposta(null);
    try {
      setResposta(await buscarCentralDados({ ente: ente.cod_ibge, pergunta: texto }));
    } catch (e: unknown) {
      setErro(
        (e as { detail?: string; message?: string })?.detail ||
          (e as { message?: string })?.message ||
          'Não foi possível responder agora.',
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Card>
      <form onSubmit={perguntar} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <label htmlFor="busca-central-dados" style={{ display: 'block', fontSize: 11, color: colors.muted, marginBottom: 4 }}>
            Pergunte por que um dado está faltando — {ente.nome}
          </label>
          <input
            id="busca-central-dados"
            type="text"
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            placeholder="Ex.: por que a página de saúde está vazia para o meu município?"
            style={{
              width: '100%',
              padding: '7px 10px',
              border: `1px solid ${colors.border}`,
              borderRadius: 4,
              fontSize: 12.5,
              color: colors.ink,
              background: colors.surface,
            }}
          />
        </div>
        <button type="submit" disabled={carregando || !pergunta.trim()} style={botaoBusca}>
          {carregando ? 'Consultando…' : 'Responder'}
        </button>
      </form>
      <p aria-live="polite" style={{ margin: '8px 0 0', fontSize: 11, color: colors.faint, fontFamily: font.mono }}>
        {carregando
          ? 'Consultando cobertura, qualidade e calendário…'
          : 'A resposta vem de cobertura, qualidade e calendário — nenhum número é estimado.'}
      </p>
      {erro && (
        <div role="alert" style={{ marginTop: 10, fontSize: 12, color: colors.red }}>
          {erro}
        </div>
      )}
      {resposta && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
          <Explicacao dado={resposta} />
        </div>
      )}
    </Card>
  );
}

const botaoBusca = {
  border: `1px solid ${colors.border}`,
  background: colors.accentSoft,
  color: colors.primaryDeep,
  borderRadius: 4,
  padding: '7px 14px',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: font.mono,
} as const;

// ============================ Jobs ============================
function JobsTab() {
  const fontes = useResource(fetchFontes, []);
  const [jobs, setJobs] = useState<IngestJob[]>([]);
  const [saude, setSaude] = useState<SaudeFila | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [statusFiltro, setStatusFiltro] = useState('');
  const [fonteFiltro, setFonteFiltro] = useState('');
  const requisicaoAtual = useRef(0);

  const carregar = useCallback(async () => {
    const requisicao = ++requisicaoAtual.current;
    setCarregando(true);
    try {
      // A saúde vem junto da lista de propósito: é ela que diz se o "Na fila" ao lado
      // significa "aguardando a vez" ou "ninguém está consumindo".
      const [itens, estado] = await Promise.all([
        fetchIngestJobs({
          status: statusFiltro || undefined,
          fonte: fonteFiltro || undefined,
        }),
        fetchSaudeFila().catch(() => null),
      ]);
      if (requisicao !== requisicaoAtual.current) return;
      setJobs(itens);
      setSaude(estado);
      setErro(null);
    } catch (e) {
      if (requisicao !== requisicaoAtual.current) return;
      setErro(
        (e as { detail?: string; message?: string })?.detail ||
          (e as { message?: string })?.message ||
          'Falha ao listar jobs',
      );
    } finally {
      if (requisicao === requisicaoAtual.current) setCarregando(false);
    }
  }, [fonteFiltro, statusFiltro]);
  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Polling enquanto houver job em andamento (a barra de progresso anda).
  const emAndamento = jobs.some((j) => j.status === 'na_fila' || j.status === 'executando');
  useEffect(() => {
    if (!emAndamento) return undefined;
    let cancelado = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const consultar = async () => {
      await carregar();
      if (!cancelado) timer = setTimeout(() => void consultar(), 2000);
    };
    timer = setTimeout(() => void consultar(), 2000);
    return () => {
      cancelado = true;
      if (timer) clearTimeout(timer);
    };
  }, [emAndamento, carregar]);

  const acao = async (fn: () => Promise<unknown>) => {
    try {
      setErro(null);
      await fn();
      await carregar();
    } catch (e) {
      setErro((e as { detail?: string; message?: string })?.detail || (e as Error)?.message || 'Falha na ação');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 12 }}>
      <Async res={fontes}>{(fs) => <JobForm fontes={fs} onCriado={() => void carregar()} />}</Async>
      <Card pad={0} style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 16px 8px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            Jobs {emAndamento && <span style={{ fontSize: 11, color: colors.yellowText }}>· polling ativo</span>}
          </div>
          <div style={{ flex: 1 }} />
          <select aria-label="Filtrar jobs por status" value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} style={filtroJob}>
            <option value="">todos os status</option>
            {Object.entries(STATUS_ROTULO).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
          </select>
          <select aria-label="Filtrar jobs por fonte" value={fonteFiltro} onChange={(e) => setFonteFiltro(e.target.value)} style={filtroJob}>
            <option value="">todas as fontes</option>
            {(fontes.data ?? []).map((f) => <option key={f.fonte} value={f.fonte}>{f.fonte}</option>)}
          </select>
          <button type="button" onClick={() => void carregar()} style={{ fontSize: 11, color: colors.primary }}>atualizar</button>
        </div>
        {erro && <div role="alert" style={{ padding: '6px 16px', fontSize: 11.5, color: colors.red }}>{erro}</div>}
        <FilaParada saude={saude} />
        <div style={{ maxHeight: 560, overflowY: 'auto' }}>
          {carregando && jobs.length === 0 ? (
            <div style={{ padding: 16, fontSize: 12, color: colors.muted }}>Carregando jobs…</div>
          ) : jobs.length === 0 ? (
            <div style={{ padding: 16, fontSize: 12, color: colors.muted }}>Nenhum job ainda. Dispare um pela esquerda.</div>
          ) : (
            jobs.map((j) => <JobRow key={j.id} job={j} onCancelar={() => acao(() => cancelarIngestJob(j.id))} onRetry={() => acao(() => retryIngestJob(j.id))} />)
          )}
        </div>
      </Card>
    </div>
  );
}

/**
 * Aviso de fila sem consumidor.
 *
 * "Na fila" sem worker é indistinguível de "na fila aguardando a vez" — e foi exatamente
 * assim que quatro jobs ficaram dez minutos parados sem uma linha de explicação. O aviso
 * só aparece quando o backend afirma que ninguém está consumindo.
 */
function FilaParada({ saude }: { saude: SaudeFila | null }) {
  if (!saude?.detalhe) return null;
  const grave = !saude.redis_disponivel || (saude.aguardando > 0 && saude.consumidores_vivos === 0);
  return (
    <div
      role={grave ? 'alert' : 'status'}
      style={{
        margin: '0 16px 8px',
        padding: '10px 12px',
        borderRadius: 5,
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
        background: grave ? colors.redBg : colors.yellowBg,
        border: `1px solid ${grave ? colors.redSoft : colors.border}`,
      }}
    >
      <span aria-hidden style={{ fontSize: 12, color: grave ? colors.red : colors.yellowText }}>⚠</span>
      <div style={{ fontSize: 11.5, color: colors.ink, lineHeight: 1.55 }}>
        {saude.detalhe}
        <div style={{ marginTop: 4, color: colors.muted, fontFamily: font.mono, fontSize: 11 }}>
          {saude.aguardando} na fila · {saude.executando} executando · {saude.consumidores_vivos} de{' '}
          {saude.consumidores} worker(s) com sinal de vida
        </div>
      </div>
    </div>
  );
}

const filtroJob: React.CSSProperties = {
  padding: '5px 7px',
  border: `1px solid ${colors.border}`,
  borderRadius: 4,
  background: colors.bg,
  color: colors.ink,
  fontSize: 11,
};

const TODAS_AS_FONTES = '*';

/** Primeiro exercício com dado publicado no SICONFI que a plataforma acompanha. */
const ANO_PISO = 2021;
const ANO_CORRENTE = new Date().getFullYear();
const ANOS_DISPONIVEIS = Array.from(
  { length: ANO_CORRENTE - ANO_PISO + 1 },
  (_, i) => ANO_CORRENTE - i,
).reverse();

function JobForm({ fontes, onCriado }: { fontes: FonteCatalogo[]; onCriado: () => void }) {
  const [fonte, setFonte] = useState(fontes[0]?.fonte ?? '');
  const [tipo, setTipo] = useState<'backfill' | 'run' | 'replay'>('backfill');
  const [entesTexto, setEntesTexto] = useState('');
  const [incluirMunicipios, setIncluirMunicipios] = useState(false);
  // Ano é escolha, não texto livre: digitar '202' disparava uma carga inteira para um
  // exercício inexistente.
  const [anoEscolhido, setAnoEscolhido] = useState(ANO_CORRENTE);
  const [periodosTexto, setPeriodosTexto] = useState('2024-B6');
  const [confirmacao, setConfirmacao] = useState<{
    resposta: IngestJobCreateResult;
    payload: IngestJobCreateInput;
  } | null>(null);
  const [msg, setMsg] = useState<{ texto: string; erro: boolean } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const envioEmCurso = useRef(false);
  const dispararRef = useRef<HTMLButtonElement>(null);
  const confirmarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirmacao) return undefined;
    const frame = window.requestAnimationFrame(() => confirmarRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [confirmacao]);

  const entes = useMemo(() => entesTexto.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean), [entesTexto]);
  // Código de UF tem 2 dígitos (23 = Ceará); município tem 7. A opção só faz sentido
  // havendo estado na lista — uma caixa permanentemente inaplicável ensina a ignorar as
  // caixas da tela.
  const estadosNaLista = useMemo(() => entes.filter((e) => /^\d{2}$/.test(e)), [entes]);
  // 'run' carrega o exercício escolhido; 'backfill' retroage dele até o piso da série.
  const anos = useMemo(
    () =>
      tipo === 'backfill'
        ? ANOS_DISPONIVEIS.filter((a) => a <= anoEscolhido)
        : [anoEscolhido],
    [anoEscolhido, tipo],
  );
  const periodos = useMemo(() => periodosTexto.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean), [periodosTexto]);
  const fonteSelecionada = useMemo(
    () => fontes.find((item) => item.fonte === fonte),
    [fonte, fontes],
  );
  const fonteNacional = fonteSelecionada?.escopo === 'nacional';
  const estimativa = useMemo(() => {
    const quantidadeEntes = fonteNacional ? 1 : entes.length;
    if (tipo === 'replay') return quantidadeEntes * periodos.length;
    if (fonte === 'bcb') return 3;
    const multiplicadorCadencia: Record<string, number> = {
      mensal: 12,
      bimestral: 6,
      quadrimestral: 3,
      anual: 1,
      diaria: 1,
      continua: 1,
      eventual: 1,
    };
    const multiplicador = multiplicadorCadencia[fonteSelecionada?.cadencia ?? ''] ?? 1;
    return quantidadeEntes * Math.max(anos.length, 1) * multiplicador;
  }, [anos.length, entes.length, fonte, fonteNacional, fonteSelecionada?.cadencia, periodos.length, tipo]);
  // No leque, o alcance vem do backend (uma fonte pode ser nacional e outra por ente);
  // a tela só exige o que é comum a todas: entes e exercício.
  const leque = fonte === TODAS_AS_FONTES;
  const podeEnviar = Boolean(
    fonte
    && (leque
      ? entes.length > 0 && anos.length > 0
      : (fonteNacional || entes.length > 0)
        && (tipo === 'replay' ? periodos.length > 0 : (fonteNacional || anos.length > 0))
        && estimativa > 0),
  );

  const payloadAtual = (): IngestJobCreateInput => ({
    fonte,
    tipo,
    entes: fonteNacional ? [] : [...entes],
    anos: tipo === 'replay' ? undefined : [...anos],
    periodos: tipo === 'replay' ? [...periodos] : undefined,
    incluir_municipios: incluirMunicipios && estadosNaLista.length > 0,
  });

  const enviar = async (confirmar: boolean, payloadConfirmado?: IngestJobCreateInput) => {
    if (envioEmCurso.current) return;
    envioEmCurso.current = true;
    setEnviando(true);
    setMsg(null);
    const payload = payloadConfirmado ?? payloadAtual();
    try {
      const res = await criarIngestJob({ ...payload, confirmar });
      if (res.precisa_confirmacao) {
        // Guarda uma cópia imutável do pedido estimado: a confirmação nunca pode autorizar
        // silenciosamente um payload diferente daquele que o servidor avaliou.
        setConfirmacao({ resposta: res, payload });
      } else {
        setConfirmacao(null);
        // Quem pediu "todos os municípios" precisa saber se recebeu um subconjunto. A
        // exclusão por escopo é legítima, mas silenciá-la faria o gestor supor uma carga
        // completa que não aconteceu.
        const fora = res.municipios_fora_do_escopo
          ? ` ${res.municipios_fora_do_escopo} município(s) da UF ficaram de fora por não estarem na sua carteira.`
          : '';
        setMsg({
          texto: res.job
            ? `Job enfileirado (${res.job.itens_total} unidade(s)).${fora}`
            : `Solicitação aceita pelo servidor.${fora}`,
          erro: false,
        });
        onCriado();
      }
    } catch (e) {
      setMsg({
        texto:
          (e as { detail?: string; message?: string })?.detail ||
          (e as { message?: string })?.message ||
          'Falha ao criar o job.',
        erro: true,
      });
    } finally {
      envioEmCurso.current = false;
      setEnviando(false);
    }
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 9px', border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 12.5, background: colors.bg };
  const label: React.CSSProperties = { fontSize: 11, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 3, display: 'block' };
  const bloqueado = enviando || Boolean(confirmacao);
  const fecharConfirmacaoComEscape = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape' || enviando) return;
    event.preventDefault();
    setConfirmacao(null);
    window.requestAnimationFrame(() => dispararRef.current?.focus());
  };

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 600 }}>Nova execução</div>
      <div>
        <label htmlFor="nova-execucao-fonte" style={label}>Fonte</label>
        <select id="nova-execucao-fonte" value={fonte} onChange={(e) => setFonte(e.target.value)} style={inputStyle} disabled={bloqueado}>
          <option value={TODAS_AS_FONTES}>todas as fontes ativas — atualiza o exercício inteiro</option>
          {fontes.map((f) => <option key={f.fonte} value={f.fonte}>{f.fonte} — {f.relatorio}</option>)}
        </select>
        {fonte === TODAS_AS_FONTES && (
          <div style={{ fontSize: 11, color: colors.muted, marginTop: 4, lineHeight: 1.5 }}>
            Dispara <b style={{ color: colors.ink }}>um job por fonte</b>, na ordem de
            dependência (o RGF depois do RREO, o cronograma depois das operações). Fonte
            com integração desligada fica de fora, e as de escopo nacional não repetem a
            chamada por município. Cada job aparece na fila e pode ser reexecutado
            sozinho — se uma fonte falhar, as outras seguem.
          </div>
        )}
      </div>
      <div>
        <div style={label}>Tipo</div>
        <div role="group" aria-label="Tipo da execução" style={{ display: 'flex', gap: 4 }}>
          {(['backfill', 'run', 'replay'] as const).map((t) => (
            <button key={t} type="button" aria-pressed={tipo === t} onClick={() => setTipo(t)} disabled={bloqueado} style={{ flex: 1, fontSize: 11.5, padding: '5px', borderRadius: 4, border: `1px solid ${tipo === t ? colors.primary : colors.border}`, background: tipo === t ? colors.accentSoft : colors.surface, color: tipo === t ? colors.primary : colors.muted, opacity: bloqueado ? 0.6 : 1 }}>{t}</button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="nova-execucao-entes" style={label}>
          {fonteNacional ? 'Entes (não se aplica à fonte nacional)' : 'Entes (códigos IBGE, separados por vírgula)'}
        </label>
        <input
          id="nova-execucao-entes"
          value={fonteNacional ? '' : entesTexto}
          onChange={(e) => setEntesTexto(e.target.value)}
          placeholder={fonteNacional ? 'Escopo nacional (BR)' : '2304400, 2307650'}
          style={inputStyle}
          disabled={bloqueado || fonteNacional}
        />
      </div>
      {estadosNaLista.length > 0 && !fonteNacional && (
        <label
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12,
            color: colors.ink, lineHeight: 1.5,
          }}
        >
          <input
            type="checkbox"
            checked={incluirMunicipios}
            onChange={(e) => setIncluirMunicipios(e.target.checked)}
            disabled={bloqueado}
            style={{ marginTop: 2 }}
          />
          <span>
            Baixar também de <strong>todos os municípios</strong>{' '}
            {estadosNaLista.length === 1 ? 'deste estado' : 'destes estados'}
            <span style={{ display: 'block', color: colors.muted, fontSize: 11 }}>
              Hoje a carga traz só os números do próprio ente. Marcando, entram os
              municípios da UF que estiverem na sua carteira — os demais não entram, e a
              tela informa quantos ficaram de fora.
            </span>
          </span>
        </label>
      )}
      {tipo === 'replay' ? (
        <div>
          <label htmlFor="nova-execucao-periodos" style={label}>Períodos (ex.: 2024-B6)</label>
          <input id="nova-execucao-periodos" value={periodosTexto} onChange={(e) => setPeriodosTexto(e.target.value)} style={inputStyle} disabled={bloqueado} />
        </div>
      ) : (
        <div>
          <label htmlFor="nova-execucao-ano" style={label}>
            {tipo === 'backfill' ? 'Exercício mais recente (retroage até o piso)' : 'Exercício'}
          </label>
          <select
            id="nova-execucao-ano"
            value={String(anoEscolhido)}
            onChange={(e) => setAnoEscolhido(parseInt(e.target.value, 10))}
            style={inputStyle}
            disabled={bloqueado}
          >
            {ANOS_DISPONIVEIS.map((a) => (
              <option key={a} value={a}>
                {a}
                {a === ANO_CORRENTE ? ' (em andamento)' : ''}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 11, color: colors.muted, marginTop: 4, lineHeight: 1.5 }}>
            {tipo === 'backfill' ? (
              <>
                Carrega <b style={{ color: colors.ink }}>{anos.join(', ')}</b> — todos os
                períodos de cada exercício.
              </>
            ) : (
              <>Carrega todos os períodos de {anoEscolhido}.</>
            )}
            {anoEscolhido === ANO_CORRENTE && (
              <>
                {' '}O exercício corrente rende apenas os períodos <b style={{ color: colors.ink }}>já
                encerrados</b>: pedir um bimestre que ainda não aconteceu geraria trabalho a
                vazio e registraria como ausente um dado que ninguém deveria ter publicado.
              </>
            )}
          </div>
        </div>
      )}
      <div style={{ fontSize: 11, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>
        estimativa local pela cadência: <b style={{ color: colors.ink }}>{estimativa}</b> unidade(s)
      </div>
      <button
        ref={dispararRef}
        type="button"
        disabled={bloqueado || !podeEnviar}
        onClick={() => void enviar(false)}
        style={{ padding: '9px', background: colors.primary, color: colors.bg, borderRadius: 5, fontSize: 12.5, fontWeight: 500, opacity: bloqueado || !podeEnviar ? 0.5 : 1 }}
      >
        {enviando ? 'enviando…' : 'Disparar job'}
      </button>
      {msg && <div role={msg.erro ? 'alert' : 'status'} style={{ fontSize: 11.5, color: msg.erro ? colors.red : colors.muted }}>{msg.texto}</div>}

      {/* Confirmação explícita de ação custosa */}
      {confirmacao && (
        <div
          role="alertdialog"
          aria-label="Confirmar ação custosa"
          style={{ border: `1px solid ${colors.orangeSoft}`, background: colors.orangeBg, borderRadius: 6, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 600, color: colors.orange }}>Ação custosa</div>
          <div style={{ fontSize: 12, color: colors.ink }}>
            Vai processar <b>{confirmacao.resposta.estimativa_itens}</b> unidades (acima do limiar de {confirmacao.resposta.limiar}). Confirma?
          </div>
          <div style={{ fontSize: 11, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>
            {confirmacao.payload.fonte} · {confirmacao.payload.tipo} ·{' '}
            {confirmacao.payload.entes.length > 0
              ? `${confirmacao.payload.entes.length} ente(s)`
              : 'escopo nacional'} ·{' '}
            {(confirmacao.payload.periodos ?? confirmacao.payload.anos ?? []).join(', ')}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button ref={confirmarRef} type="button" disabled={enviando} onKeyDown={fecharConfirmacaoComEscape} onClick={() => void enviar(true, confirmacao.payload)} style={{ flex: 1, padding: '7px', background: colors.orange, color: '#fff', borderRadius: 4, fontSize: 12, fontWeight: 500, opacity: enviando ? 0.6 : 1 }}>{enviando ? 'enfileirando…' : 'Confirmar e executar'}</button>
            <button
              type="button"
              disabled={enviando}
              onKeyDown={fecharConfirmacaoComEscape}
              onClick={() => {
                setConfirmacao(null);
                window.requestAnimationFrame(() => dispararRef.current?.focus());
              }}
              style={{ flex: 1, padding: '7px', border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 12, background: colors.surface }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

function JobRow({
  job,
  onCancelar,
  onRetry,
}: {
  job: IngestJob;
  onCancelar: () => Promise<void>;
  onRetry: () => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const [detalhe, setDetalhe] = useState(job);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState<string | null>(null);
  const [acaoEmCurso, setAcaoEmCurso] = useState(false);

  useEffect(() => {
    if (!aberto) {
      setDetalhe(job);
      return undefined;
    }
    let ativo = true;
    setCarregandoDetalhe(true);
    setErroDetalhe(null);
    void fetchIngestJob(job.id)
      .then((resposta) => {
        if (ativo) setDetalhe(resposta);
      })
      .catch((e) => {
        if (!ativo) return;
        setErroDetalhe(
          (e as { detail?: string; message?: string })?.detail ||
            (e as { message?: string })?.message ||
            'Falha ao carregar detalhes.',
        );
      })
      .finally(() => {
        if (ativo) setCarregandoDetalhe(false);
      });
    return () => {
      ativo = false;
    };
  }, [aberto, job]);

  const alternarDetalhe = () => setAberto((atual) => !atual);

  const executarAcao = async (acao: () => Promise<void>) => {
    if (acaoEmCurso) return;
    setAcaoEmCurso(true);
    try {
      await acao();
    } finally {
      setAcaoEmCurso(false);
    }
  };

  const cor = STATUS_COR[detalhe.status] ?? colors.neutral;
  const erros = detalhe.resultado?.itens.filter((i) => !i.ok) ?? [];
  return (
    <div style={{ borderBottom: `1px solid ${colors.rowBorder}`, padding: '10px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: cor, borderRadius: 3, padding: '2px 6px', minWidth: 74, textAlign: 'center' }}>
          {STATUS_ROTULO[detalhe.status] ?? detalhe.status}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>
            {detalhe.fonte} · {detalhe.tipo} · {detalhe.entes.length} ente(s) · {detalhe.periodos.join(', ')}
          </div>
          <div style={{ fontSize: 11, color: colors.faint, fontFamily: "'JetBrains Mono', monospace" }}>
            {detalhe.itens_ok}/{detalhe.itens_total} ok · {detalhe.itens_erro} erro · tentativa {detalhe.tentativas} · {hora(detalhe.criado_em)}
          </div>
          {detalhe.erro_resumo && <div style={{ marginTop: 2, fontSize: 11, color: colors.red }}>{detalhe.erro_resumo}</div>}
        </div>
        {detalhe.status === 'na_fila' && <button type="button" disabled={acaoEmCurso} onClick={() => void executarAcao(onCancelar)} style={btnMini}>{acaoEmCurso ? 'cancelando…' : 'cancelar'}</button>}
        {detalhe.status === 'falhou' && <button type="button" disabled={acaoEmCurso} onClick={() => void executarAcao(onRetry)} style={{ ...btnMini, color: colors.orange, borderColor: colors.orangeSoft }}>{acaoEmCurso ? 'enfileirando…' : 'retry'}</button>}
        <button type="button" onClick={alternarDetalhe} style={btnMini}>{aberto ? 'menos' : 'detalhes'}</button>
      </div>
      {/* Barra de progresso */}
      <div style={{ height: 5, background: colors.bg, borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
        <div
          role="progressbar"
          aria-label={`Progresso do job ${detalhe.id}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={detalhe.progresso_pct}
          style={{ height: '100%', width: `${detalhe.progresso_pct}%`, background: cor, transition: 'width 0.3s' }}
          data-testid={`progresso-${detalhe.id}`}
        />
      </div>
      {aberto && (
        <div style={{ marginTop: 8, fontSize: 11, color: colors.muted, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {carregandoDetalhe && <div>Carregando detalhes…</div>}
          {erroDetalhe && <div role="alert" style={{ color: colors.red }}>{erroDetalhe}</div>}
          {detalhe.log_ref && (
            <div>
              log: <span style={{ fontFamily: "'JetBrains Mono', monospace", wordBreak: 'break-all' }}>{detalhe.log_ref}</span>
            </div>
          )}
          {(detalhe.logs?.length ?? 0) > 0 && (
            <div role="log" aria-label={`Logs do job ${detalhe.id}`} style={{ border: `1px solid ${colors.border}`, borderRadius: 4, overflow: 'hidden' }}>
              {detalhe.logs?.map((entrada) => (
                <div
                  key={entrada.id}
                  style={{ display: 'grid', gridTemplateColumns: '130px 110px minmax(0, 1fr)', gap: 8, padding: '5px 7px', borderTop: `1px solid ${colors.rowBorder}`, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}
                >
                  <span style={{ color: colors.faint }}>{hora(entrada.ts)}</span>
                  <span style={{ color: entrada.status === 'erro' ? colors.red : colors.muted }}>{entrada.status}</span>
                  <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                    {[entrada.cod_ibge, entrada.periodo].filter(Boolean).join(' / ')}
                    {entrada.mensagem ? `${entrada.cod_ibge || entrada.periodo ? ' · ' : ''}${entrada.mensagem}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
          {detalhe.resultado && (
            <div>
              recalculados:{' '}
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {detalhe.resultado.indicadores_recalculados.join(', ') || 'nenhum'}
              </span>
              {detalhe.resultado.cobertura_antes !== null && detalhe.resultado.cobertura_depois !== null && (
                <> · cobertura {detalhe.resultado.cobertura_antes} → {detalhe.resultado.cobertura_depois}</>
              )}
              {detalhe.resultado.delta_cobertura !== null && <> · Δ {detalhe.resultado.delta_cobertura}</>}
            </div>
          )}
          {detalhe.resultado?.erro_sistema?.erro && (
            <div style={{ color: colors.red }}>
              falha de sistema
              {detalhe.resultado.erro_sistema.fase ? ` (${detalhe.resultado.erro_sistema.fase})` : ''}: {' '}
              {detalhe.resultado.erro_sistema.erro}
            </div>
          )}
          {erros.map((e, i) => (
            <div key={i} style={{ color: colors.red }}>✗ {e.ente} / {e.chave}: {e.erro}</div>
          ))}
          {!carregandoDetalhe && !erroDetalhe && !detalhe.log_ref && !detalhe.erro_resumo && !detalhe.resultado && !detalhe.logs?.length && (
            <div>Nenhum log ou resultado detalhado disponível.</div>
          )}
        </div>
      )}
    </div>
  );
}

const btnMini: React.CSSProperties = { fontSize: 11, padding: '3px 8px', border: `1px solid ${colors.border}`, borderRadius: 3, background: colors.surface, color: colors.muted };

// ============================ Catálogo ============================
/**
 * Selo do tipo de acesso — a forma de obtenção muda o que se pode conferir e o que pode
 * falhar. Uma API se abre no navegador; um arquivo de catálogo pode ser republicado a
 * qualquer momento; um PDF de portal municipal depende de o ente manter a página no ar.
 */
const ORIGEM_ROTULO: Record<string, { texto: string; tom: string; ajuda: string }> = {
  api_rest: { texto: 'API', tom: colors.primary, ajuda: 'API REST pública, resposta em JSON.' },
  api_odata: { texto: 'OData', tom: colors.primary, ajuda: 'API OData — consulta com $filter/$select.' },
  catalogo_ckan: {
    texto: 'catálogo → arquivo',
    tom: colors.orange,
    ajuda: 'O endereço do arquivo não é fixo: sai do catálogo CKAN a cada publicação.',
  },
  arquivo: { texto: 'arquivo', tom: colors.orange, ajuda: 'Planilha ou CSV baixado da fonte.' },
  raspagem_pdf: {
    texto: 'PDF do portal',
    tom: colors.red,
    ajuda: 'Extração de PDF publicado pelo próprio ente — exige configuração por ente.',
  },
};

function SeloOrigem({ tipo }: { tipo: string | null }) {
  const meta = tipo ? ORIGEM_ROTULO[tipo] : undefined;
  if (!meta) return <span style={{ color: colors.faint }}>—</span>;
  return (
    <span
      title={meta.ajuda}
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: meta.tom,
        border: `1px solid ${meta.tom}`,
        borderRadius: 3,
        padding: '1px 5px',
      }}
    >
      {meta.texto}
    </span>
  );
}

function CatalogoTab() {
  const res = useResource(fetchFontes, []);
  return (
    <Card pad={0}>
      <div style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>Catálogo de fontes</div>
      <div style={{ overflowX: 'auto' }}>
        <Async res={res}>
          {(fs) => (
            <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
              <caption className="sr-only">Catálogo e estado operacional das fontes de dados</caption>
              <thead>
                <tr style={{ background: colors.bg, color: colors.muted, textAlign: 'left' }}>
                  {['Fonte', 'Origem', 'Status', 'Descrição', 'Família', 'Relatório', 'Cadência', 'Última execução', 'Última OK', 'Período recente', 'Defasagem', 'Entes', 'Registros', 'Parser', 'Dependências', 'Páginas'].map((h) => (
                    <th key={h} scope="col" style={{ padding: '7px 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fs.map((f) => (
                  <tr key={f.fonte} style={{ borderTop: `1px solid ${colors.rowBorder}` }}>
                    <td style={{ padding: '6px 10px', fontFamily: "'JetBrains Mono', monospace" }}>
                      {/* O nome leva à procedência: endereços, parâmetros e exemplo real.
                          É o caminho para conferir a origem sem depender da nossa palavra. */}
                      <Link
                        to={`/central-dados/fontes/${f.fonte}`}
                        style={{ color: colors.primary, textDecoration: 'none' }}
                        title={`Ver de onde vem o dado de ${f.fonte}`}
                      >
                        {f.fonte}
                      </Link>
                    </td>
                    <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                      <SeloOrigem tipo={f.tipo_acesso} />
                    </td>
                    <td style={{ padding: '6px 10px', color: f.ativo ? colors.green : colors.faint }}>{f.ativo ? 'ativa' : 'pausada'}</td>
                    <td style={{ padding: '6px 10px', color: colors.muted, maxWidth: 240 }}>{f.descricao ?? '—'}</td>
                    <td style={{ padding: '6px 10px' }}>{f.familia}</td>
                    <td style={{ padding: '6px 10px' }}>{f.relatorio}</td>
                    <td style={{ padding: '6px 10px' }}>{f.cadencia}</td>
                    <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{hora(f.ultima_execucao)}</td>
                    <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', color: f.ultima_execucao_ok ? colors.green : colors.faint }}>{hora(f.ultima_execucao_ok)}</td>
                    <td style={{ padding: '6px 10px', fontFamily: "'JetBrains Mono', monospace" }}>{f.periodo_mais_recente ?? '—'}</td>
                    <td style={{ padding: '6px 10px', color: (f.defasagem_periodos ?? 0) > 2 ? colors.orange : colors.muted }}>{f.defasagem_periodos ?? '—'}</td>
                    <td style={{ padding: '6px 10px' }}>{f.entes_cobertos}</td>
                    <td style={{ padding: '6px 10px' }} title={f.registros_cobertos == null ? 'Campo ainda não exposto pelo backend' : undefined}>{f.registros_cobertos ?? '—'}</td>
                    <td style={{ padding: '6px 10px', color: colors.faint }}>{f.parser_versao ?? '—'}</td>
                    <td style={{ padding: '6px 10px', color: colors.faint, fontSize: 11 }}>{f.dependencias.join(', ') || '—'}</td>
                    <td style={{ padding: '6px 10px', color: colors.faint, fontSize: 11 }}>{f.paginas_impactadas.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Async>
      </div>
    </Card>
  );
}

// ============================ Cobertura ============================
interface CoberturaGrupo {
  chave: string;
  fonte: string;
  cod_ibge: string;
  uf: string | null;
  ano: number;
  periodos: string[];
  ausentes: string[] | null;
  registros: number;
  versao: string | null;
  defasagem: number | null;
}

function normalizarPeriodo(periodo: string): string {
  return periodo.replace(/-([MBQS])0+(\d+)$/i, '-$1$2');
}

/** Períodos já encerrados no exercício, de acordo com a cadência declarada no catálogo. */
function periodosEsperados(
  ano: number,
  cadencia: string | undefined,
  periodosObservados: string[],
): string[] | null {
  const frequencia: Record<string, { total: number; marca: string; pad: boolean }> = {
    mensal: { total: 12, marca: 'M', pad: true },
    bimestral: { total: 6, marca: 'B', pad: false },
    quadrimestral: { total: 3, marca: 'Q', pad: false },
    anual: { total: 1, marca: '', pad: false },
  };
  // O RGF pode ser quadrimestral ou semestral conforme o regime do ente. Quando a própria
  // fonte entrega S1/S2, o dado observado prevalece sobre a cadência geral do catálogo.
  const temMarcadorSemestral = periodosObservados.some((periodo) => /-S0?\d+$/i.test(periodo));
  const regra = temMarcadorSemestral
    ? { total: 2, marca: 'S', pad: false }
    : cadencia ? frequencia[cadencia] : undefined;
  if (!regra) return null;

  const hoje = new Date();
  let encerrados = regra.total;
  if (ano > hoje.getFullYear()) encerrados = 0;
  if (ano === hoje.getFullYear()) {
    encerrados = regra.total === 1 ? 0 : Math.floor((hoje.getMonth() + 1 - 1) / (12 / regra.total));
  }
  return Array.from({ length: encerrados }, (_, indice) => {
    if (!regra.marca) return String(ano);
    const numero = regra.pad ? String(indice + 1).padStart(2, '0') : String(indice + 1);
    return `${ano}-${regra.marca}${numero}`;
  });
}

function agruparCobertura(
  linhas: CoberturaItem[],
  catalogo: Map<string, FonteCatalogo>,
): CoberturaGrupo[] {
  const grupos = new Map<string, Omit<CoberturaGrupo, 'ausentes'>>();
  for (const linha of linhas) {
    const chave = `${linha.fonte}|${linha.cod_ibge}|${linha.ano}`;
    const atual = grupos.get(chave) ?? {
      chave,
      fonte: linha.fonte,
      cod_ibge: linha.cod_ibge,
      uf: linha.uf,
      ano: linha.ano,
      periodos: [],
      registros: 0,
      versao: null,
      defasagem: null,
    };
    atual.periodos.push(linha.periodo);
    atual.registros += linha.n_registros;
    atual.versao = linha.versao_entrega_vigente ?? atual.versao;
    if (linha.defasagem_periodos !== null) {
      atual.defasagem = Math.max(atual.defasagem ?? 0, linha.defasagem_periodos);
    }
    grupos.set(chave, atual);
  }
  return [...grupos.values()].map((grupo) => {
    grupo.periodos.sort();
    const esperados = periodosEsperados(
      grupo.ano,
      catalogo.get(grupo.fonte)?.cadencia,
      grupo.periodos,
    );
    const observados = new Set(grupo.periodos.map(normalizarPeriodo));
    return {
      ...grupo,
      ausentes: esperados?.filter((periodo) => !observados.has(normalizarPeriodo(periodo))) ?? null,
    };
  });
}

function CoberturaTab() {
  const [fonte, setFonte] = useState<string>('');
  const [uf, setUf] = useState<string>('');
  const [ano, setAno] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 200;
  const fontes = useResource(fetchFontes, []);
  const res = useResource(
    () => fetchCobertura({
      fonte: fonte || undefined,
      uf: uf || undefined,
      ano: ano ? Number(ano) : undefined,
      page,
      page_size: pageSize,
    }),
    [fonte, uf, ano, page],
  );
  const catalogo = useMemo(
    () => new Map((fontes.data ?? []).map((item) => [item.fonte, item])),
    [fontes.data],
  );
  const campo: React.CSSProperties = { padding: '6px 9px', border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 12, background: colors.bg };
  return (
    <Card pad={0}>
      <div style={{ padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Matriz de cobertura</div>
        <div style={{ flex: 1 }} />
        <input placeholder="fonte" value={fonte} onChange={(e) => { setFonte(e.target.value); setPage(1); }} style={campo} aria-label="Filtro fonte" />
        <input placeholder="UF (23)" value={uf} onChange={(e) => { setUf(e.target.value); setPage(1); }} style={{ ...campo, width: 80 }} aria-label="Filtro UF" />
        <input placeholder="ano" value={ano} onChange={(e) => { setAno(e.target.value); setPage(1); }} style={{ ...campo, width: 80 }} aria-label="Filtro ano" />
      </div>
      <Async res={res}>
        {(c) => {
          const grupos = agruparCobertura(c.data, catalogo);
          const totalPaginas = Math.max(1, Math.ceil(c.total / c.page_size));
          return (
            <>
            <div style={{ padding: '6px 16px', fontSize: 11, color: colors.muted, fontFamily: "'JetBrains Mono', monospace", borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`, background: colors.bg }}>
              {c.resumo.total_linhas} linhas · {c.resumo.entes} entes · {c.resumo.periodos} períodos · fontes: {c.resumo.fontes.join(', ') || '—'}
            </div>
            <div style={{ padding: '6px 16px', fontSize: 11, color: colors.faint, borderBottom: `1px solid ${colors.border}` }}>
              Lacunas são inferidas pela cadência do catálogo sobre os grupos visíveis nesta página; fontes contínuas/eventuais ficam sem inferência.
            </div>
            <div style={{ maxHeight: 480, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, minWidth: 960 }}>
                <caption className="sr-only">Cobertura e lacunas por fonte, ente e período</caption>
                <thead><tr style={{ color: colors.muted, textAlign: 'left' }}>
                  {['Fonte', 'Ente', 'UF', 'Ano', 'Períodos observados', 'Períodos ausentes', 'Registros', 'Versão', 'Defasagem'].map((h) => (
                    <th key={h} scope="col" style={{ padding: '6px 10px', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {grupos.map((r) => (
                    <tr key={r.chave} style={{ borderTop: `1px solid ${colors.rowBorder}` }}>
                      <td style={{ padding: '5px 10px', fontFamily: "'JetBrains Mono', monospace" }}>{r.fonte}</td>
                      <td style={{ padding: '5px 10px', fontFamily: "'JetBrains Mono', monospace" }}>{r.cod_ibge}</td>
                      <td style={{ padding: '5px 10px' }}>{r.uf ?? '—'}</td>
                      <td style={{ padding: '5px 10px' }}>{r.ano}</td>
                      <td style={{ padding: '5px 10px', fontFamily: "'JetBrains Mono', monospace" }}>{r.periodos.join(', ') || '—'}</td>
                      <td style={{ padding: '5px 10px', fontFamily: "'JetBrains Mono', monospace", color: r.ausentes?.length ? colors.red : colors.green }}>
                        {r.ausentes === null ? 'não inferível' : r.ausentes.join(', ') || 'nenhum'}
                      </td>
                      <td style={{ padding: '5px 10px' }}>{r.registros}</td>
                      <td style={{ padding: '5px 10px', color: colors.faint }}>{r.versao ?? '—'}</td>
                      <td style={{ padding: '5px 10px', color: (r.defasagem ?? 0) > 2 ? colors.orange : colors.muted }}>{r.defasagem ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '8px 16px', borderTop: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, fontSize: 11, color: colors.muted }}>
              <button type="button" disabled={c.page <= 1} onClick={() => setPage((atual) => Math.max(1, atual - 1))} style={btnMini}>anterior</button>
              <span>página {c.page} de {totalPaginas}</span>
              <button type="button" disabled={c.page >= totalPaginas} onClick={() => setPage((atual) => Math.min(totalPaginas, atual + 1))} style={btnMini}>próxima</button>
            </div>
          </>
          );
        }}
      </Async>
    </Card>
  );
}

// ============================ Retificações ============================
function RetificacoesTab() {
  const res = useResource(() => fetchRetificacoes(), []);
  return (
    <Card pad={0}>
      <div style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>
        Retificações <span style={{ fontSize: 11, color: colors.muted, fontWeight: 400 }}>· entregas que superaram uma versão anterior (§6.5)</span>
      </div>
      <Async res={res}>
        {(itens) => itens.length === 0 ? (
          <div style={{ padding: 16, fontSize: 12, color: colors.muted }}>Nenhuma retificação registrada.</div>
        ) : (
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
              <caption className="sr-only">Retificações e versões de entregas fiscais</caption>
              <thead><tr style={{ color: colors.muted, textAlign: 'left' }}>
                {['Ente', 'Relatório', 'Período', 'Versão vigente', 'Homologada', 'Versões anteriores'].map((h) => (
                  <th key={h} scope="col" style={{ padding: '6px 10px', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {itens.map((r, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${colors.rowBorder}` }}>
                    <td style={{ padding: '5px 10px', fontFamily: "'JetBrains Mono', monospace" }}>{r.cod_ibge}</td>
                    <td style={{ padding: '5px 10px' }}>{r.relatorio}</td>
                    <td style={{ padding: '5px 10px', fontFamily: "'JetBrains Mono', monospace" }}>{r.periodo}</td>
                    <td style={{ padding: '5px 10px', color: colors.faint }}>{r.versao_entrega}</td>
                    <td style={{ padding: '5px 10px' }}>{hora(r.homologada_em)}</td>
                    <td style={{ padding: '5px 10px' }}>{r.versoes_anteriores}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Async>
    </Card>
  );
}

/* ==========================================================================
 * Painel de Qualidade (Sprint 26)
 *
 * Pergunta gerencial: **"posso confiar no número que estou vendo?"** Cada linha é uma
 * verificação executada sobre o dado real, com os dois lados da conta à vista — quem
 * discorda do veredito consegue refazer a comparação sem abrir o banco.
 * ========================================================================== */
function QualidadeTab() {
  // Deep-link universal (Sprint D1): ?painel=qualidade&ente=&periodo= — o selo de
  // qualidade e os cards fiscais linkam para cá já filtrados, em vez de o gestor ter que
  // reencontrar o ente/período na lista inteira do escopo.
  const [params] = useSearchParams();
  const [status, setStatus] = useState<StatusCheck | ''>('');
  const [fonte, setFonte] = useState('');
  const enteUrl = params.get('ente') ?? undefined;
  const periodoUrl = params.get('periodo');
  const res = useResource(
    () => fetchQualidade({ status: status || undefined, fonte: fonte || undefined, ente: enteUrl, porPagina: 100 }),
    [status, fonte, enteUrl],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Sprint Q1: a resolução vem ANTES da lista de vereditos. Diante de uma falha, a
          pergunta do gestor não é "quais são?" — é "e agora, o que eu faço?". */}
      <ResolucaoQualidade ente={enteUrl} />
      <Async res={res}>
        {(q) => {
          // `periodo` não é filtro do backend (o check de atualidade não tem um período
          // conferido) — filtra no cliente, e o resumo some do dado bruto (ele) para os
          // números do topo não contarem períodos que a tabela abaixo não mostra.
          // O filtro por período **não pode zerar a lista**. As verificações de atualidade
          // são gravadas com o período da última entrega — que por definição não é o da
          // tela defasada. Filtrar sem essa ressalva fazia o gestor clicar em "ver a conta
          // que não fechou" e chegar numa página vazia, o que é pior que não ter o link.
          const filtrados = periodoUrl ? q.itens.filter((i) => i.periodo === periodoUrl) : q.itens;
          const filtroVazio = Boolean(periodoUrl) && filtrados.length === 0 && q.itens.length > 0;
          const itens = filtroVazio ? q.itens : filtrados;
          const resumo = periodoUrl && !filtroVazio
            ? {
                falha: itens.filter((i) => i.status === 'falha').length,
                aviso: itens.filter((i) => i.status === 'aviso').length,
                ok: itens.filter((i) => i.status === 'ok').length,
              }
            : { falha: q.resumo.falha, aviso: q.resumo.aviso, ok: q.resumo.ok };
          return (
          <>
            {periodoUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: colors.muted }}>
                <span>
                  {filtroVazio ? (
                    <>
                      nenhuma verificação registrada em{' '}
                      <strong style={{ fontFamily: font.mono }}>{periodoUrl}</strong> — mostrando
                      todos os períodos. As verificações de atualidade são gravadas no período
                      da última entrega, que não é o da tela quando há defasagem.
                    </>
                  ) : (
                    <>
                      filtrado por período <strong style={{ fontFamily: font.mono }}>{periodoUrl}</strong>
                    </>
                  )}
                  {enteUrl && <> · ente <strong style={{ fontFamily: font.mono }}>{enteUrl}</strong></>}
                </span>
                <Link to="/central-dados?painel=qualidade" style={{ color: colors.primary }}>
                  limpar filtro de período
                </Link>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <ResumoCard n={resumo.falha} rotulo="Em falha" cor={colors.red} fundo={colors.redBg} />
              <ResumoCard n={resumo.aviso} rotulo="Avisos" cor={colors.orange} fundo={colors.orangeBg} />
              <ResumoCard n={resumo.ok} rotulo="Verificados e corretos" cor={colors.green} fundo={colors.greenBg} />
              <div style={{ flex: 1 }} />
              <select
                aria-label="Filtrar por status"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusCheck | '')}
                style={filtroStyle}
              >
                <option value="">todos os status</option>
                <option value="falha">falha</option>
                <option value="aviso">aviso</option>
                <option value="ok">ok</option>
              </select>
              <select
                aria-label="Filtrar por fonte"
                value={fonte}
                onChange={(e) => setFonte(e.target.value)}
                style={filtroStyle}
              >
                <option value="">todas as fontes</option>
                {[...new Set(q.itens.map((i) => i.fonte))].sort().map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {resumo.falha > 0 && (
              <div style={{ padding: '10px 12px', borderRadius: 6, background: colors.redBg, color: colors.red, fontSize: 11.5, lineHeight: 1.5 }}>
                <strong>{resumo.falha} verificação(ões) em falha</strong>
                {!periodoUrl && q.resumo.fontes_com_falha.length > 0 && <> em {q.resumo.fontes_com_falha.join(', ')}</>}. Enquanto durar, as páginas afetadas
                exibem o selo de qualidade sobre o número — o dado não é escondido, mas
                também não é apresentado como se estivesse conferido.
              </div>
            )}

            <Card pad={0}>
              {itens.length === 0 ? (
                <div style={{ padding: 16, fontSize: 11.5, color: colors.muted, lineHeight: 1.5 }}>
                  {q.observacao ?? 'Nenhuma verificação com os filtros escolhidos.'}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                    <caption className="sr-only">Verificações automatizadas de qualidade dos dados</caption>
                    <thead>
                      <tr style={{ background: colors.bg }}>
                        {['', 'Verificação', 'Fonte', 'Ente', 'Período', 'Esquerda', 'Direita', 'Diferença', 'Tolerância', 'Executado'].map((h, i) => (
                          <th key={`${h}-${i}`} scope="col" style={thQ}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((c) => (
                        <tr key={c.id} data-testid="check-linha" style={{ borderTop: `1px solid ${colors.rowBorder}` }}>
                          <td style={{ padding: '6px 10px' }}><SeloStatus status={c.status} /></td>
                          <td style={{ padding: '6px 10px' }}>
                            {c.rotulo}
                            {typeof c.detalhe?.motivo === 'string' && (
                              <div style={{ fontSize: 11, color: colors.faint }}>{c.detalhe.motivo}</div>
                            )}
                          </td>
                          <td style={tdQ}>{c.fonte}</td>
                          <td style={tdQ}>{c.cod_ibge ?? '—'}</td>
                          <td style={tdQ}>{c.periodo ?? '—'}</td>
                          <td style={tdNum}>{numeroCurto(c.esquerda)}</td>
                          <td style={tdNum}>{numeroCurto(c.direita)}</td>
                          <td style={{ ...tdNum, color: c.status === 'falha' ? colors.red : colors.ink }}>
                            {numeroCurto(c.diferenca)}
                          </td>
                          <td style={tdNum}>{numeroCurto(c.tolerancia)}</td>
                          <td style={tdQ}>{hora(c.executado_em)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ padding: '8px 12px', fontSize: 11, color: colors.faint, lineHeight: 1.5 }}>
                {periodoUrl ? itens.length : q.total} verificação(ões) {periodoUrl ? 'neste período' : 'no seu escopo'}. <strong>aviso</strong> inclui o caso
                &quot;não deu para verificar&quot; (fonte ausente) — que é diferente de &quot;verificado e correto&quot;.
              </div>
            </Card>
          </>
          );
        }}
      </Async>
    </div>
  );
}

function ResumoCard({ n, rotulo, cor, fundo }: { n: number; rotulo: string; cor: string; fundo: string }) {
  return (
    <div style={{ padding: '8px 14px', borderRadius: 6, background: fundo, minWidth: 120 }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: cor }}>{n}</div>
      <div style={{ fontSize: 11, color: cor, fontWeight: 600 }}>{rotulo}</div>
    </div>
  );
}

function SeloStatus({ status }: { status: StatusCheck }) {
  const mapa = {
    ok: { cor: colors.green, fundo: colors.greenBg, texto: 'OK' },
    aviso: { cor: colors.orange, fundo: colors.orangeBg, texto: 'AVISO' },
    falha: { cor: colors.red, fundo: colors.redBg, texto: 'FALHA' },
  }[status];
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: mapa.fundo, color: mapa.cor, letterSpacing: '0.04em' }}>
      {mapa.texto}
    </span>
  );
}

/** Números de escala muito diferente (R$ bilhões e p.p.) convivem na mesma coluna. */
function numeroCurto(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  const x = Number(v);
  if (!Number.isFinite(x)) return String(v);
  if (Math.abs(x) >= 1e6) return `${(x / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} M`;
  return x.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
}

/* ==========================================================================
 * Lineage (Sprint 26)
 *
 * Pergunta gerencial: **"o que quebra se esta fonte falhar?"** e a inversa, **"de onde
 * vem o número desta tela?"**. O grafo é o mesmo; muda o sentido da leitura.
 * ========================================================================== */
function LineageTab() {
  // Deep-link universal (Sprint D1): ?painel=lineage&no= — antes a aba sempre abria em
  // silver.siconfi_rgf; agora o FonteChip/FatoRow das páginas fiscais podem linkar direto
  // ao nó que produziu o número que o gestor está olhando.
  const [params] = useSearchParams();
  const [no, setNo] = useState<string>(() => params.get('no') || 'silver.siconfi_rgf');
  const res = useResource(() => fetchLineage(no || undefined), [no]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Async res={res}>
        {(g) => (
          <>
            <Card style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <label htmlFor="lineage-no" style={{ fontSize: 11, color: colors.muted }}>
                Nó do grafo
              </label>
              <select
                id="lineage-no"
                value={no}
                onChange={(e) => setNo(e.target.value)}
                style={{ ...filtroStyle, minWidth: 280 }}
              >
                {g.nos.map((n) => (
                  <option key={n.id} value={n.id}>{`${n.camada} · ${n.id}`}</option>
                ))}
              </select>
              <span style={{ fontSize: 11, color: colors.faint }}>
                {g.total_arestas} arestas no mapa · camada atual: {g.camada}
              </span>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                  De onde vem <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{g.no}</span>
                </div>
                <div style={{ fontSize: 11, color: colors.muted, marginBottom: 8 }}>
                  fontes de origem: {g.fontes_de_origem.length ? g.fontes_de_origem.join(', ') : '— (este nó é uma fonte)'}
                </div>
                <ListaArestas arestas={g.montante} vazio="Nada a montante: este nó é uma fonte externa." />
              </Card>
              <Card>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                  O que quebra se falhar
                </div>
                <div data-testid="paginas-afetadas" style={{ fontSize: 11, color: colors.muted, marginBottom: 8 }}>
                  páginas afetadas: {g.paginas_afetadas.length ? g.paginas_afetadas.join(', ') : '— (este nó é uma página)'}
                </div>
                <ListaArestas arestas={g.jusante} vazio="Nada a jusante: este nó é uma página." />
              </Card>
            </div>
          </>
        )}
      </Async>
    </div>
  );
}

function ListaArestas({ arestas, vazio }: { arestas: LineageAresta[]; vazio: string }) {
  if (arestas.length === 0) {
    return <div style={{ fontSize: 11.5, color: colors.muted }}>{vazio}</div>;
  }
  const unicas = arestas.filter(
    (a, i, todas) => todas.findIndex((b) => b.origem === a.origem && b.destino === a.destino) === i,
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 320, overflowY: 'auto' }}>
      {unicas.map((a) => (
        <div key={`${a.origem}->${a.destino}`} style={{ padding: '5px 0', borderTop: `1px solid ${colors.rowBorder}`, fontSize: 11 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: colors.muted }}>{a.origem}</span>
          <span style={{ color: colors.primary, margin: '0 6px' }}>→</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{a.destino}</span>
          {typeof a.detalhe?.nota === 'string' && (
            <div style={{ fontSize: 11, color: colors.faint }}>{a.detalhe.nota}</div>
          )}
        </div>
      ))}
    </div>
  );
}

const filtroStyle = {
  fontSize: 11.5,
  padding: '4px 8px',
  border: `1px solid ${colors.border}`,
  borderRadius: 4,
  background: colors.surface,
  color: colors.ink,
} as const;
const thQ = {
  padding: '6px 10px',
  textAlign: 'left' as const,
  fontSize: 11,
  color: colors.muted,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
};
const tdQ = { padding: '6px 10px', fontSize: 11 };
const tdNum = {
  padding: '6px 10px',
  textAlign: 'right' as const,
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
};
