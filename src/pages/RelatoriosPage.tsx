import { useEffect, useMemo, useState } from 'react';
import { Async, ErrorBox, Loading } from '../components/AsyncState';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { useApp, useResource } from '../context/AppContext';
import {
  baixarRelatorio,
  criarAgendamentoRelatorio,
  criarRelatorio,
  fetchRelatorio,
  fetchRelatorioModelos,
  fetchRelatorios,
  type RelatorioDetalhe,
  type RelatorioEscopo,
  type RelatorioFormato,
  type RelatorioItem,
  type RelatorioModelo,
  type RelatorioSolicitacao,
} from '../services/backend';
import { colors, font } from '../theme';

const icons: Record<string, string> = {
  executivo: 'M3 3h10v10H3z M5 6h6M5 8.5h6M5 11h3',
  limites: 'M8 1.5l5.5 2v4c0 4-2.5 6-5.5 7-3-1-5.5-3-5.5-7v-4z',
  comparativo: 'M3 13V8M6.5 13V4M10 13V6.5M13.5 13V9.5',
  conformidade: 'M3 4h10M3 8h10M3 12h7',
  boletim: 'M2.5 3.5h11v9h-11z M2.5 6.5h11M5 9h6',
};

interface MetricPreview {
  codigo: string;
  rotulo: string;
  valor_formatado: string;
  status: string;
  as_of: string | null;
  source_refs: Array<{
    relatorio: string;
    anexo?: string | null;
    periodo?: string | null;
    versao_entrega?: string | null;
  }>;
}

export function RelatoriosPage() {
  const { token, ente, periodo } = useApp();
  const modelos = useResource(fetchRelatorioModelos, [token]);
  const historico = useResource(() => fetchRelatorios(80), [token]);
  const [modelo, setModelo] = useState('executivo');
  const [escopo, setEscopo] = useState<RelatorioEscopo>('ente');
  const [formato, setFormato] = useState<RelatorioFormato>('pdf');
  const [periodicidade, setPeriodicidade] = useState<'semanal' | 'mensal' | 'bimestral'>('mensal');
  const [solicitacao, setSolicitacao] = useState<RelatorioSolicitacao | null>(null);
  const [detalhe, setDetalhe] = useState<RelatorioDetalhe | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const active = modelos.data?.modelos.find((item) => item.codigo === modelo)
    ?? modelos.data?.modelos[0];

  useEffect(() => {
    const running = historico.data?.itens.some((item) =>
      item.status === 'enfileirado' || item.status === 'processando');
    if (!running) return;
    const timer = window.setInterval(historico.reload, 1800);
    return () => window.clearInterval(timer);
  }, [historico.data]);

  useEffect(() => {
    const first = solicitacao?.relatorios[0];
    if (!first) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await fetchRelatorio(first.id);
        if (!cancelled) {
          setDetalhe(next);
          if (next.status === 'enfileirado' || next.status === 'processando') {
            window.setTimeout(poll, 1200);
          } else {
            historico.reload();
          }
        }
      } catch {
        if (!cancelled) window.setTimeout(poll, 1800);
      }
    };
    void poll();
    return () => { cancelled = true; };
  }, [solicitacao?.lote_id]);

  const batchItems = detalhe?.lote_itens ?? solicitacao?.relatorios ?? [];
  const preview = detalhe ?? historico.data?.itens[0] ?? null;
  const metrics = useMemo(() => reportMetrics(preview), [preview]);

  async function generate() {
    if (!active) return;
    setBusy(true);
    setActionError(null);
    setMessage(null);
    try {
      const response = await criarRelatorio({
        modelo: active.codigo,
        formato,
        escopo,
        ente: escopo === 'ente' ? ente.cod_ibge : undefined,
        periodo,
        secoes: active.secoes,
      });
      setSolicitacao(response);
      setDetalhe(null);
      setMessage(`${response.total_entes} relatório(s) enfileirado(s) com dados reais.`);
      historico.reload();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function schedule() {
    if (!active) return;
    setBusy(true);
    setActionError(null);
    setMessage(null);
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(7, 0, 0, 0);
    try {
      const result = await criarAgendamentoRelatorio({
        modelo: active.codigo,
        formato,
        escopo,
        ente: escopo === 'ente' ? ente.cod_ibge : undefined,
        periodo,
        periodicidade,
        proxima_execucao: next.toISOString(),
        secoes: active.secoes,
      });
      setMessage(`Agendamento ${result.periodicidade} criado para ${formatDate(result.proxima_execucao)}.`);
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function download(item: RelatorioItem) {
    setActionError(null);
    try {
      await baixarRelatorio(item);
    } catch (error) {
      setActionError(errorMessage(error));
    }
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Relatórios e Exportação">
      <Card style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px' }} pad={0}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Relatórios &amp; Exportação</div>
          <div style={{ fontSize: 11, color: colors.muted, fontFamily: font.mono }}>
            PDF · Excel · Slides · fontes e memória preservadas no snapshot
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <select value={periodicidade} onChange={(event) => setPeriodicidade(event.target.value as typeof periodicidade)} style={selectStyle}>
          <option value="semanal">Semanal</option>
          <option value="mensal">Mensal</option>
          <option value="bimestral">Bimestral</option>
        </select>
        <button disabled={busy || !active} onClick={() => void schedule()} style={secondaryButton}>
          <Icon size={13}><circle cx="8" cy="8" r="6" /><path d="M8 5v3l2 2" /></Icon>
          Agendar recorrente
        </button>
      </Card>

      {actionError && <ErrorBox message={actionError} />}
      {message && <div style={{ padding: '9px 12px', borderRadius: 5, background: colors.greenBg, color: colors.green, fontSize: 12 }}>{message}</div>}

      <Async res={modelos}>
        {(data) => (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(data.modelos.length, 5)}, minmax(150px, 1fr))`, gap: 10 }}>
            {data.modelos.map((item) => <ModelCard key={item.codigo} item={item} selected={item.codigo === active?.codigo} onClick={() => setModelo(item.codigo)} />)}
          </div>
        )}
      </Async>

      <div style={{ display: 'grid', gridTemplateColumns: '340px minmax(0, 1fr)', gap: 12 }}>
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Construtor</div>
            <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>
              {active?.nome ?? 'Carregando modelos…'} · {active?.publico}
            </div>
          </div>
          <Field label="Escopo">
            <div style={{ display: 'flex', gap: 8 }}>
              {([['ente', 'Ente único'], ['lote', 'Lote · carteira'], ['estadual', 'Estadual']] as const).map(([value, label]) => (
                <Toggle key={value} active={escopo === value} onClick={() => setEscopo(value)}>{label}</Toggle>
              ))}
            </div>
          </Field>
          <Field label="Ente / carteira">
            <div style={readOnlyField}>
              {escopo === 'ente'
                ? `${ente.nome} · IBGE ${ente.cod_ibge}`
                : escopo === 'estadual'
                  ? 'Cobertura estadual dentro do seu escopo efetivo'
                  : 'Todos os entes da carteira no seu escopo efetivo'}
            </div>
          </Field>
          <Field label="Período fiscal">
            <div style={readOnlyField}>{periodo}</div>
          </Field>
          <Field label="Seções do modelo">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {(active?.secoes ?? []).map((section) => <span key={section} style={chipStyle}>{section}</span>)}
            </div>
          </Field>
          <Field label="Formato">
            <div style={{ display: 'flex', gap: 6 }}>
              {([['pdf', 'PDF'], ['xlsx', 'Excel'], ['pptx', 'Slides']] as const).map(([value, label]) => (
                <Toggle key={value} active={formato === value} onClick={() => setFormato(value)}>{label}</Toggle>
              ))}
            </div>
          </Field>
          <button disabled={busy || !active} onClick={() => void generate()} style={{ ...primaryButton, opacity: busy ? .65 : 1 }}>
            <Icon size={15} stroke={colors.bg} sw={1.6}><path d="M8 2v8M5 7l3 3 3-3M3 13h10" /></Icon>
            {busy ? 'Enfileirando…' : 'Gerar relatório'}
          </button>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          {batchItems.length > 0 && <BatchPanel items={batchItems} onDownload={download} />}
          <Preview item={preview} metrics={metrics} active={active} />
        </div>
      </div>

      <Card pad={0}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 10px' }}>
          <Icon size={14} stroke={colors.primary}><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" /></Icon>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Histórico real de relatórios</div>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: colors.muted, fontFamily: font.mono }}>
            {historico.data?.total ?? 0} artefato(s) · versionado
          </span>
        </div>
        {historico.loading && !historico.data ? <Loading /> : historico.error ? <ErrorBox message={historico.error} /> : (
          <History items={historico.data?.itens ?? []} onSelect={(item) => void fetchRelatorio(item.id).then(setDetalhe).catch((error) => setActionError(errorMessage(error)))} onDownload={download} />
        )}
      </Card>
    </div>
  );
}

function ModelCard({ item, selected, onClick }: { item: RelatorioModelo; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ textAlign: 'left', padding: 14, borderRadius: 6, border: selected ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`, background: selected ? '#F4F8F5' : colors.surface }}>
      <div style={{ width: 34, height: 34, borderRadius: 7, background: colors.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Icon size={18} stroke={colors.primary} sw={1.4}><path d={icons[item.codigo] ?? icons.executivo} /></Icon>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{item.nome}</div>
      <div style={{ fontSize: 10, color: colors.primary, fontWeight: 500, marginTop: 4 }}>{item.publico}</div>
      <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 6, lineHeight: 1.4 }}>{item.descricao}</div>
      <div style={{ fontSize: 9.5, color: colors.faint, fontFamily: font.mono, marginTop: 9 }}>
        {item.secoes.length} seções · {item.formalidade} · {item.modelo_versao}
      </div>
    </button>
  );
}

function BatchPanel({ items, onDownload }: { items: RelatorioItem[]; onDownload: (item: RelatorioItem) => Promise<void> }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Fila / lote</div>
        <span style={chipStyle}>{items.length} ente(s)</span>
      </div>
      {items.map((item) => (
        <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '105px 1fr 90px auto', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${colors.rowBorder}` }}>
          <span style={{ fontSize: 11, fontFamily: font.mono }}>{item.cod_ibge}</span>
          <div style={{ height: 6, background: colors.borderSoft, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${item.progresso}%`, background: statusColor(item.status) }} />
          </div>
          <span style={{ fontSize: 10.5, color: statusColor(item.status), fontWeight: 600 }}>{item.status}</span>
          <button disabled={!item.arquivo_url} onClick={() => void onDownload(item)} style={smallButton}>Baixar</button>
        </div>
      ))}
    </Card>
  );
}

function Preview({ item, metrics, active }: { item: RelatorioItem | null; metrics: MetricPreview[]; active?: RelatorioModelo }) {
  const header = item?.cabecalho ?? {};
  return (
    <Card style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Pré-visualização auditável</div>
        <span style={{ fontSize: 10, color: colors.faint, fontFamily: font.mono }}>{item?.formato.toUpperCase() ?? 'aguardando geração'}</span>
      </div>
      {!item ? <div style={{ padding: 40, textAlign: 'center', color: colors.muted, fontSize: 12 }}>Gere um relatório para visualizar números, fontes e pendências reais.</div> : (
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, padding: '24px 28px', maxWidth: 760, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `2px solid ${colors.primary}`, paddingBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{asString(header.organizacao) || 'Organização'}</div>
              <div style={{ fontSize: 11, color: colors.muted }}>{asString(header.ente) || item.cod_ibge} · IBGE {item.cod_ibge}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{active?.nome ?? item.modelo}</div>
              <div style={{ fontSize: 10, color: colors.faint, fontFamily: font.mono }}>{item.periodo} · as_of {formatDate(item.as_of)}</div>
            </div>
          </div>
          {item.dados_incompletos.length > 0 && (
            <div style={{ marginTop: 12, padding: 10, background: colors.orangeBg, color: colors.orange, borderRadius: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700 }}>{item.dados_incompletos.length} sinalização(ões) — nenhum item foi omitido</div>
              {item.dados_incompletos.slice(0, 4).map((issue) => <div key={`${issue.tipo}-${issue.codigo}`} style={{ fontSize: 10.5, marginTop: 4 }}>[{issue.tipo}] {issue.mensagem}</div>)}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 14 }}>
            {metrics.map((metric) => (
              <div key={metric.codigo} style={{ padding: 10, background: colors.bg, borderRadius: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontSize: 11 }}>{metric.rotulo}</span>
                  <span style={{ fontFamily: font.mono, fontSize: 11, fontWeight: 700 }}>{metric.valor_formatado}</span>
                </div>
                <div style={{ marginTop: 5, fontSize: 9, color: colors.faint, fontFamily: font.mono }}>
                  {sourceLabel(metric)} · as_of {formatDate(metric.as_of)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 9.5, color: colors.faint, marginTop: 12, fontFamily: font.mono }}>
            gerado {formatDate(item.gerado_em)} · hash {item.conteudo_hash?.slice(0, 16) ?? 'em processamento'}
          </div>
        </div>
      )}
    </Card>
  );
}

function History({ items, onSelect, onDownload }: { items: RelatorioItem[]; onSelect: (item: RelatorioItem) => void; onDownload: (item: RelatorioItem) => Promise<void> }) {
  if (!items.length) return <div style={{ padding: 24, color: colors.muted, fontSize: 12 }}>Nenhum relatório gerado nesta organização.</div>;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr .8fr .65fr .8fr .7fr auto', padding: '7px 16px', background: colors.bg, borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`, fontSize: 9.5, fontWeight: 600, color: colors.muted, textTransform: 'uppercase' }}>
        <div>Relatório / ente</div><div>Período</div><div>Formato</div><div>Gerado</div><div>Status</div><div>Ação</div>
      </div>
      {items.map((item) => (
        <div key={item.id} onClick={() => onSelect(item)} style={{ display: 'grid', gridTemplateColumns: '1.6fr .8fr .65fr .8fr .7fr auto', padding: '9px 16px', borderBottom: `1px solid ${colors.rowBorder}`, alignItems: 'center', cursor: 'pointer', fontSize: 11.5 }}>
          <div><strong>{item.modelo}</strong><div style={{ color: colors.faint, fontFamily: font.mono, fontSize: 9.5 }}>IBGE {item.cod_ibge} · {item.source_refs.length} fonte(s) · {item.dados_incompletos.length} aviso(s)</div></div>
          <div style={{ fontFamily: font.mono }}>{item.periodo}</div>
          <div style={{ fontFamily: font.mono }}>{item.formato.toUpperCase()}</div>
          <div style={{ color: colors.muted }}>{formatDate(item.gerado_em ?? item.criado_em)}</div>
          <div style={{ color: statusColor(item.status), fontWeight: 600 }}>{item.status}</div>
          <button disabled={!item.arquivo_url} onClick={(event) => { event.stopPropagation(); void onDownload(item); }} style={smallButton}>Baixar</button>
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div style={{ fontSize: 9.5, color: colors.faint, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>{label}</div>{children}</div>;
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ flex: 1, padding: 8, borderRadius: 4, fontSize: 11.5, fontWeight: active ? 600 : 400, background: active ? colors.primary : colors.bg, color: active ? colors.bg : colors.muted, border: active ? 'none' : `1px solid ${colors.border}` }}>{children}</button>;
}

function reportMetrics(item: RelatorioItem | null): MetricPreview[] {
  const metrics = item?.memoria?.metricas;
  return Array.isArray(metrics) ? metrics as MetricPreview[] : [];
}

function sourceLabel(metric: MetricPreview): string {
  if (!metric.source_refs.length) return 'fonte não disponível';
  return metric.source_refs.map((source) => [source.relatorio, source.anexo, source.periodo, source.versao_entrega ? `v${source.versao_entrega}` : null].filter(Boolean).join(' · ')).join('; ');
}

function asString(value: unknown): string { return typeof value === 'string' ? value : ''; }
function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'detail' in error) return String((error as { detail?: unknown }).detail ?? 'Erro na operação.');
  return error instanceof Error ? error.message : 'Erro na operação.';
}
function statusColor(status: string): string {
  if (status === 'gerado') return colors.green;
  if (status === 'parcial' || status === 'processando') return colors.orange;
  if (status === 'falhou') return colors.red;
  return colors.muted;
}

const selectStyle = { padding: '7px 10px', border: `1px solid ${colors.border}`, borderRadius: 4, background: colors.surface, fontSize: 11.5 };
const secondaryButton = { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 12, fontWeight: 500 };
const primaryButton = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, background: colors.primary, color: colors.bg, borderRadius: 5, fontSize: 13.5, fontWeight: 600 };
const smallButton = { padding: '5px 9px', border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 10.5, color: colors.primary };
const readOnlyField = { padding: '8px 10px', border: `1px solid ${colors.border}`, borderRadius: 4, background: colors.bg, fontSize: 11.5 };
const chipStyle = { fontSize: 9.5, padding: '3px 7px', borderRadius: 3, background: colors.accentSoft, color: colors.primary, fontWeight: 600 };
