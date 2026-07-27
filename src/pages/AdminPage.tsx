/**
 * Administração, Carteira avançada & Billing (Módulo 17) — Sprint 18.
 * As abas Carteira, Faturamento, Integrações e Auditoria consomem o backend REAL:
 * - cobrança reflete a metrica_cobranca (com memória + source_ref auditáveis);
 * - faturas expõem empenho/contrato (compra pública);
 * - integrações mostram o estado global; mutações ficam restritas ao control plane;
 * - trilha de auditoria filtrável.
 */
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { colors, font } from '../theme';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { useResource } from '../context/AppContext';
import { Async } from '../components/AsyncState';
import { Link } from 'react-router-dom';
import {
  atualizarPapelCapacidades,
  CAPACIDADES,
  carteiraLote,
  criarPapel,
  criarUsuario,
  emitirFatura,
  fetchAuditoria,
  fetchBilling,
  fetchCarteiraEntes,
  fetchIntegracoes,
  fetchMe,
  fetchOrgs,
  fetchPapeis,
  fetchUsuarios,
  type BillingOverview,
  type Capacidade,
  type FiscalDecimal,
  type MetricaCobranca,
  type OrgOut,
  type PapelOut,
} from '../services/backend';

type Tab = 'organizacao' | 'usuarios' | 'permissoes' | 'carteira' | 'faturamento' | 'integracoes' | 'auditoria';

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'organizacao', label: 'Organização', icon: 'M3 14V6l5-3 5 3v8M6 14V9h4v5' },
  { key: 'usuarios', label: 'Usuários & perfis', icon: 'M6 6a2 2 0 104 0 2 2 0 00-4 0M3 13c0-2 1.5-3.2 3-3.2M13 13c0-2-1.5-3.2-3-3.2' },
  { key: 'permissoes', label: 'Permissões (RBAC)', icon: 'M8 2l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V4z' },
  { key: 'carteira', label: 'Gestão de carteira', icon: 'M2 4h12v9H2zM2 7h12M6 4v9' },
  { key: 'faturamento', label: 'Faturamento', icon: 'M2 4h12v8H2zM2 7h12M4 10h3' },
  { key: 'integracoes', label: 'Integrações & dados', icon: 'M5 8a3 3 0 013-3M11 8a3 3 0 01-3 3M8 2v2M8 12v2' },
  { key: 'auditoria', label: 'Auditoria & segurança', icon: 'M8 2l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V4zM6 8l1.5 1.5L10 7' },
];

/** Iniciais do nome real (o backend não guarda avatar). */
function iniciaisDe(nome: string): string {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return '—';
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

const METRICA_LABEL: Record<MetricaCobranca, string> = {
  por_ente: 'por ente monitorado',
  por_populacao: 'por habitante (população IBGE)',
  por_consulta_ia: 'por consulta de IA',
  fixo: 'valor fixo por ciclo',
};

const brl = (v: FiscalDecimal | null | undefined): string =>
  v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));
const num = (v: FiscalDecimal | null | undefined): string =>
  v == null ? '—' : new Intl.NumberFormat('pt-BR').format(Number(v));

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('faturamento');

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Administração">
      <Card style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px' }} pad={0}>
        <div style={{ width: 40, height: 40, borderRadius: 6, background: colors.primaryGrad, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={22} stroke={colors.bg}><path d="M8 2l5 2.5v3.5c0 3-2 5-5 6-3-1-5-3-5-6V4.5z" /><circle cx="8" cy="7" r="1.6" /><path d="M5.5 11c0-1.4 1.1-2.2 2.5-2.2s2.5.8 2.5 2.2" /></Icon>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Administração &amp; Configurações</div>
          <div style={{ fontSize: 11, color: colors.muted, fontFamily: font.mono }}>governança multi-tenant · cobrança, integrações e auditoria reais</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', border: '1px solid #C7E5D5', background: colors.greenBg, borderRadius: 4 }}>
          <Icon size={14} stroke={colors.green}><path d="M8 2l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V4z" /><path d="M5.5 8l1.7 1.7L10.5 6.5" /></Icon>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 11, fontWeight: 600 }}>Tenant isolado</div>
            <div style={{ fontSize: 9.5, color: colors.green, fontFamily: font.mono }}>RLS: escopo não vaza entre orgs</div>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12, alignItems: 'start' }}>
        <Card pad={8} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {tabs.map((t) => {
            const a = t.key === tab;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 5, textAlign: 'left', background: a ? colors.surface : 'transparent', color: a ? colors.ink : colors.muted, border: `1px solid ${a ? colors.border : 'transparent'}`, boxShadow: a ? '0 1px 2px rgba(15,26,20,.06)' : 'none' }}>
                <Icon size={15}><path d={t.icon} /></Icon>
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>{t.label}</span>
              </button>
            );
          })}
        </Card>

        <div style={{ minWidth: 0 }}>
          {tab === 'organizacao' && <Organizacao />}
          {tab === 'usuarios' && <Usuarios />}
          {tab === 'permissoes' && <Permissoes />}
          {tab === 'carteira' && <Carteira />}
          {tab === 'faturamento' && <Faturamento />}
          {tab === 'integracoes' && <Integracoes />}
          {tab === 'auditoria' && <Auditoria />}
        </div>
      </div>
    </div>
  );
}

// ------------------------- Carteira (real) ------------------------- //
function Carteira() {
  const res = useResource(fetchCarteiraEntes, []);
  const [cod, setCod] = useState('');
  const [grupo, setGrupo] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const add = useCallback(async () => {
    if (!cod.trim()) return;
    setBusy(true); setErr(null);
    try {
      await carteiraLote({ adicionar: [{ cod_ibge: cod.trim(), grupo: grupo.trim() || null }], remover: [] });
      setCod(''); setGrupo(''); res.reload();
    } catch (e) { setErr((e as { detail?: string; message?: string }).detail || (e as Error).message); }
    finally { setBusy(false); }
  }, [cod, grupo, res]);

  const remove = useCallback(async (c: string) => {
    setBusy(true); setErr(null);
    try { await carteiraLote({ adicionar: [], remover: [c] }); res.reload(); }
    catch (e) { setErr((e as { detail?: string; message?: string }).detail || (e as Error).message); }
    finally { setBusy(false); }
  }, [res]);

  return (
    <Card pad={0} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${colors.border}`, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Gestão de carteira · em lote</div>
          <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>entes acompanhados (referência por código IBGE — nunca copia o dado)</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input value={cod} onChange={(e) => setCod(e.target.value)} placeholder="cód. IBGE" style={inp(96)} />
          <input value={grupo} onChange={(e) => setGrupo(e.target.value)} placeholder="grupo (opcional)" style={inp(130)} />
          <button onClick={add} disabled={busy || !cod.trim()} style={btnPrimary(busy || !cod.trim())}>
            <Icon size={13} stroke={colors.bg} sw={1.6}><path d="M8 3v10M3 8h10" /></Icon> Adicionar
          </button>
        </div>
      </div>
      {err && <div style={{ padding: '8px 18px', color: colors.red, fontSize: 11 }}>⚠ {err}</div>}
      <Async res={res}>
        {(entes) => (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', padding: '7px 18px', background: colors.bg, borderBottom: `1px solid ${colors.border}`, fontSize: 9.5, fontWeight: 600, color: colors.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <div>Código IBGE</div><div>Grupo</div><div>Tag</div><div style={{ textAlign: 'right' }}>Ação</div>
            </div>
            {entes.length === 0 && <div style={{ padding: '18px', fontSize: 12, color: colors.faint }}>Carteira vazia — adicione um ente pelo código IBGE.</div>}
            {entes.map((e) => (
              <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', padding: '9px 18px', borderBottom: `1px solid ${colors.rowBorder}`, alignItems: 'center', fontSize: 12 }}>
                <div style={{ fontFamily: font.mono, fontWeight: 500 }}>{e.cod_ibge}</div>
                <div style={{ color: colors.muted }}>{e.grupo || '—'}</div>
                <div style={{ color: colors.muted }}>{e.tag || '—'}</div>
                <div style={{ textAlign: 'right' }}>
                  <button onClick={() => remove(e.cod_ibge)} disabled={busy} style={{ fontSize: 10.5, color: colors.red, border: `1px solid ${colors.border}`, borderRadius: 4, padding: '3px 8px' }}>Remover</button>
                </div>
              </div>
            ))}
            <div style={{ padding: '8px 18px', fontSize: 10.5, color: colors.faint }}>{entes.length} ente(s) na carteira.</div>
          </>
        )}
      </Async>
    </Card>
  );
}

// ------------------------- Faturamento (real) ------------------------- //
function Faturamento() {
  const res = useResource(fetchBilling, []);
  return (
    <Async res={res}>
      {(b) => <FaturamentoBody b={b} reload={res.reload} />}
    </Async>
  );
}

function FaturamentoBody({ b, reload }: { b: BillingOverview; reload: () => void }) {
  const [empenho, setEmpenho] = useState('');
  const [contrato, setContrato] = useState('');
  const [competencia, setCompetencia] = useState(b.preview.competencia);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const errMsg = (e: unknown) => (e as { detail?: string; message?: string }).detail || (e as Error).message;

  const emitir = useCallback(async () => {
    setBusy(true); setErr(null);
    try {
      await emitirFatura({ competencia, empenho_ref: empenho || null, contrato_ref: contrato || null });
      setEmpenho(''); setContrato(''); reload();
    } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  }, [competencia, empenho, contrato, reload]);

  const pv = b.preview;
  const memoEntes = (pv.memoria?.n_entes ?? (Array.isArray(pv.memoria?.entes) ? (pv.memoria.entes as unknown[]).length : undefined));

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {err && <div style={{ padding: '10px 14px', background: colors.redBg, border: `1px solid ${colors.redSoft}`, borderRadius: 6, color: colors.red, fontSize: 12 }}>⚠ {err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Plano & métrica */}
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Plano &amp; métrica de cobrança</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: font.mono, fontSize: 24, fontWeight: 600 }}>{brl(pv.valor_total)}</span>
            <span style={{ fontSize: 11, color: colors.muted }}>/ {b.assinatura?.ciclo || 'mensal'}</span>
          </div>
          <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 4 }}>
            métrica: <b style={{ color: colors.primary }}>{METRICA_LABEL[pv.metrica_cobranca]}</b> · {num(pv.quantidade)} × {brl(pv.preco_unitario)}
          </div>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${colors.borderSoft}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, color: colors.muted }}>
              Plano: <b style={{ color: colors.ink }}>{b.assinatura?.plano ?? 'legado'}</b>
              {' · '}status: <b style={{ color: b.assinatura?.status === 'ativa' ? colors.green : colors.orange }}>{b.assinatura?.status ?? 'sem assinatura'}</b>
            </div>
            <div style={{ padding: '8px 10px', borderRadius: 4, background: colors.bg, color: colors.faint, fontSize: 10.5 }}>
              Licença, métrica e preço são definidos pelo control plane da plataforma e ficam em modo somente leitura para o tenant.
            </div>
          </div>
        </Card>

        {/* Prévia auditável + compra pública */}
        <Card style={{ border: '1px solid #E8B53A' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Icon size={14} stroke={colors.yellowText}><path d="M3 6l5-3 5 3v7H3zM6 13V9h4v4" /></Icon>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Emitir fatura · compra pública</div>
          </div>
          <div style={{ fontSize: 10.5, color: colors.muted, marginBottom: 12 }}>
            competência {pv.competencia} · {pv.ja_emitida ? 'já emitida' : 'em aberto'} — {typeof memoEntes === 'number' ? `${memoEntes} ente(s)` : (pv.memoria?.base as string) || ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={lbl}>Competência (YYYY-MM)</label>
            <input value={competencia} onChange={(e) => setCompetencia(e.target.value)} style={inp('100%')} />
            <label style={lbl}>Nota de empenho</label>
            <input value={empenho} onChange={(e) => setEmpenho(e.target.value)} placeholder="2026NE000842" style={inp('100%')} />
            <label style={lbl}>Contrato / processo</label>
            <input value={contrato} onChange={(e) => setContrato(e.target.value)} placeholder="CT-118/2026" style={inp('100%')} />
            <button onClick={emitir} disabled={busy} style={btnPrimary(busy)}>Emitir fatura de {brl(pv.valor_total)}</button>
          </div>
          {pv.source_refs.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${colors.borderSoft}`, fontSize: 9.5, color: colors.faint }}>
              proveniência: {pv.source_refs.map((s) => `${s.relatorio}${s.periodo ? ' ' + s.periodo : ''}`).join(' · ')}
            </div>
          )}
        </Card>
      </div>

      {/* Faturas */}
      <Card pad={0}>
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${colors.border}`, fontSize: 13, fontWeight: 600 }}>Faturas emitidas</div>
        <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1fr 1fr 1fr 0.7fr', padding: '7px 18px', background: colors.bg, borderBottom: `1px solid ${colors.border}`, fontSize: 9.5, fontWeight: 600, color: colors.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          <div>Competência</div><div>Empenho</div><div>Contrato</div><div style={{ textAlign: 'right' }}>Valor</div><div style={{ textAlign: 'center' }}>Status</div>
        </div>
        {b.faturas.length === 0 && <div style={{ padding: 18, fontSize: 12, color: colors.faint }}>Nenhuma fatura emitida ainda.</div>}
        {b.faturas.map((f) => (
          <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '0.8fr 1fr 1fr 1fr 0.7fr', padding: '10px 18px', borderBottom: `1px solid ${colors.rowBorder}`, alignItems: 'center', fontSize: 12 }}>
            <div style={{ fontFamily: font.mono }}>{f.competencia}</div>
            <div style={{ fontFamily: font.mono, color: colors.muted }}>{f.empenho_ref || '—'}</div>
            <div style={{ fontFamily: font.mono, color: colors.muted }}>{f.contrato_ref || '—'}</div>
            <div style={{ fontFamily: font.mono, textAlign: 'right' }}>{brl(f.valor_total)}</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{ fontSize: 9.5, padding: '2px 8px', borderRadius: 3, fontWeight: 600, background: f.status === 'paga' ? colors.greenBg : colors.yellowBg, color: f.status === 'paga' ? colors.green : colors.yellowText }}>{f.status.toUpperCase()}</span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ------------------------- Integrações (real) ------------------------- //
function Integracoes() {
  const res = useResource(fetchIntegracoes, []);

  return (
    <Card pad={0} className="fade-in">
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Integrações &amp; dados</div>
          <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>estado global dos conectores · alteração exclusiva do control plane</div>
        </div>
        <div style={{ flex: 1 }} />
        <Link
          to="/central-dados"
          style={{ padding: '7px 10px', border: `1px solid ${colors.primary}`, borderRadius: 4, color: colors.primary, fontSize: 11.5, fontWeight: 600 }}
        >
          Abrir Central de Dados →
        </Link>
      </div>
      <Async res={res}>
        {(itens) => (
          <>
            {itens.map((i) => (
              <div key={i.codigo} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: `1px solid ${colors.rowBorder}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{i.nome}</span>
                    <span style={{ fontSize: 8.5, padding: '1px 6px', background: i.categoria === 'nacional' ? colors.accentSoft : colors.neutralBg, color: i.categoria === 'nacional' ? colors.primary : colors.neutral, borderRadius: 2, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{i.codigo}</span>
                  </div>
                  <div style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{i.descricao}</div>
                  <div style={{ fontSize: 9.5, color: colors.faint, fontFamily: font.mono, marginTop: 3 }}>{i.fontes.length} conector(es): {i.fontes.join(', ')}</div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 74 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: i.ativo ? colors.green : colors.faint }}>{i.ativo ? 'Ativa' : 'Pausada'}</div>
                </div>
                <span aria-label={`Integração ${i.codigo} em modo somente leitura`} title="Somente o control plane pode alterar uma integração global" style={{ fontSize: 9, padding: '3px 7px', borderRadius: 3, background: colors.bg, color: colors.faint, border: `1px solid ${colors.border}` }}>
                  somente leitura
                </span>
              </div>
            ))}
            <div style={{ padding: '12px 18px', background: colors.bg, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon size={14} stroke={colors.muted}><circle cx="8" cy="8" r="6" /><path d="M8 5v3.5M8 11v0.1" /></Icon>
              <span style={{ fontSize: 11, color: colors.muted }}>Retificações no SICONFI reprocessam automaticamente os indicadores; mudanças globais exigem operador da plataforma.</span>
            </div>
          </>
        )}
      </Async>
    </Card>
  );
}

// ------------------------- Auditoria (real) ------------------------- //
function Auditoria() {
  const [q, setQ] = useState('');
  const [acao, setAcao] = useState('');
  const res = useResource(() => fetchAuditoria({ q: q || undefined, acao: acao || undefined, limit: 100 }), [q, acao]);

  return (
    <Card pad={0} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${colors.border}`, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Trilha de auditoria</div>
          <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>toda ação sensível é registrada e atribuível — filtrável</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={acao} onChange={(e) => setAcao(e.target.value)} placeholder="ação (ex.: EMITIR_FATURA)" style={inp(190)} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="busca livre" style={inp(140)} />
        </div>
      </div>
      <Async res={res}>
        {(page) => (
          <>
            <div style={{ padding: '7px 18px', background: colors.bg, borderBottom: `1px solid ${colors.border}`, fontSize: 10, color: colors.muted }}>{page.total} evento(s)</div>
            {page.itens.length === 0 && <div style={{ padding: 18, fontSize: 12, color: colors.faint }}>Nenhum evento para o filtro.</div>}
            {page.itens.map((a) => (
              <div key={a.id} style={{ display: 'flex', gap: 12, padding: '11px 18px', borderBottom: `1px solid ${colors.rowBorder}`, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: colors.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={14} stroke={colors.primary}><path d="M8 2l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V4z" /></Icon>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontFamily: font.mono, wordBreak: 'break-word' }}>{a.recurso}</div>
                  <div style={{ fontSize: 10, color: colors.faint, fontFamily: font.mono, marginTop: 3 }}>{new Date(a.ts).toLocaleString('pt-BR')}</div>
                </div>
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 3, fontWeight: 600, background: colors.accentSoft, color: colors.primary, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{a.acao}</span>
              </div>
            ))}
          </>
        )}
      </Async>
    </Card>
  );
}

// ------------------------- Organização (real: /orgs + /me) ------------------------- //
function Organizacao() {
  const me = useResource(fetchMe, []);
  const orgs = useResource(fetchOrgs, []);

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 330px', gap: 12, alignItems: 'start' }}>
      <Card pad={0}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Organizações reais</div>
          <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>dados de GET /orgs; a organização ativa vem de /me</div>
        </div>
        <Async res={orgs}>
          {(itens) => itens.length === 0 ? (
            <div style={{ padding: 18, fontSize: 12, color: colors.muted }}>Nenhuma organização cadastrada.</div>
          ) : (
            itens.map((org: OrgOut) => {
              const ativa = me.data?.org_ativa?.org_id === org.id;
              return (
                <div key={org.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 10, alignItems: 'center', padding: '11px 18px', borderBottom: `1px solid ${colors.rowBorder}`, fontSize: 11.5 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{org.nome}</div>
                    <div style={{ fontFamily: font.mono, color: colors.faint, fontSize: 9.5 }}>{org.id}</div>
                  </div>
                  <span>{org.tipo_conta}</span>
                  <span style={{ color: colors.muted }}>{org.metrica_cobranca ?? 'sem métrica'}</span>
                  <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 3, background: ativa ? colors.greenBg : colors.bg, color: ativa ? colors.green : colors.faint }}>{ativa ? 'ATIVA' : new Date(org.criada_em).toLocaleDateString('pt-BR')}</span>
                </div>
              );
            })
          )}
        </Async>
      </Card>

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Provisionamento controlado</div>
          <div style={{ fontSize: 11.5, color: colors.muted, lineHeight: 1.55 }}>
            A criação de organizações é exclusiva do control plane da plataforma. Nesta área,
            administradores da organização gerenciam usuários, papéis e permissões sem ampliar
            o próprio escopo de tenant.
          </div>
          <div style={{ padding: '9px 10px', borderRadius: 4, background: colors.bg, color: colors.faint, fontSize: 10.5 }}>
            Para provisionar outra organização, solicite a ação a um superadministrador da plataforma.
          </div>
        </div>
      </Card>
    </div>
  );
}

/** Usuários reais (`GET/POST /users`) — nenhum perfil é inventado no frontend. */
function Usuarios() {
  const res = useResource(() => fetchUsuarios(), []);
  const papeis = useResource(() => fetchPapeis(), []);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mfa, setMfa] = useState(false);
  const [papelId, setPapelId] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const criar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!nome.trim() || !email.trim() || senha.length < 8 || busy) return;
    setBusy(true);
    setErro(null);
    try {
      await criarUsuario({
        nome: nome.trim(),
        email: email.trim(),
        senha,
        mfa_ativo: mfa,
        papel_id: papelId || undefined,
      });
      setNome('');
      setEmail('');
      setSenha('');
      setMfa(false);
      setPapelId('');
      res.reload();
    } catch (e) {
      setErro(
        (e as { detail?: string; message?: string })?.detail ||
          (e as { message?: string })?.message ||
          'Falha ao criar usuário.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 330px', gap: 12, alignItems: 'start' }}>
      <Card pad={0}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Usuários</div>
          <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>cadastros devolvidos pelo contrato real de GET /users</div>
        </div>
        <Async res={res}>
          {(usuarios) =>
            usuarios.length === 0 ? (
              <div style={{ padding: '16px 18px', fontSize: 12, color: colors.muted }}>Nenhum usuário cadastrado.</div>
            ) : (
              <>
                {usuarios.map((u) => (
                  <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr', padding: '10px 18px', borderBottom: `1px solid ${colors.rowBorder}`, alignItems: 'center', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: colors.accentSoft, color: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 600, flexShrink: 0 }}>{iniciaisDe(u.nome)}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 500 }}>{u.nome}</div>
                        <div style={{ fontSize: 10, color: colors.faint, fontFamily: font.mono }}>{u.email}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: colors.muted }}>
                      {u.papel_nome ?? 'papel não informado'} · MFA {u.mfa_ativo ? 'ativo' : 'inativo'}
                    </div>
                    <div>
                      <span style={{ fontSize: 9.5, padding: '2px 8px', borderRadius: 3, fontWeight: 600, background: u.mfa_ativo ? colors.greenBg : colors.bg, color: u.mfa_ativo ? colors.green : colors.muted }}>
                        {u.mfa_ativo ? 'MFA' : 'sem MFA'}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )
          }
        </Async>
      </Card>

      <Card>
        <form onSubmit={(e) => void criar(e)} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Novo usuário</div>
          <label style={lbl}>Nome</label>
          <input aria-label="Nome do usuário" value={nome} onChange={(e) => setNome(e.target.value)} style={inp('100%')} />
          <label style={lbl}>E-mail</label>
          <input aria-label="E-mail do usuário" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inp('100%')} />
          <label style={lbl}>Senha inicial (mín. 8)</label>
          <input aria-label="Senha inicial" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} style={inp('100%')} />
          <label style={lbl}>Papel na organização</label>
          <select aria-label="Papel do usuário" value={papelId} onChange={(e) => setPapelId(e.target.value)} style={inp('100%')}>
            <option value="">menor privilégio disponível</option>
            {(papeis.data ?? []).map((papel) => (
              <option key={papel.id} value={papel.id}>{papel.nome}</option>
            ))}
          </select>
          <label style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 11.5, color: colors.muted }}>
            <input type="checkbox" checked={mfa} onChange={(e) => setMfa(e.target.checked)} />
            MFA já configurado
          </label>
          {erro && <div role="alert" style={{ fontSize: 11, color: colors.red }}>{erro}</div>}
          <button type="submit" disabled={busy || !nome.trim() || !email.trim() || senha.length < 8} style={btnPrimary(busy || !nome.trim() || !email.trim() || senha.length < 8)}>{busy ? 'Criando…' : 'Criar usuário'}</button>
        </form>
      </Card>
    </div>
  );
}

/** Matriz RBAC real e **editável**: clicar numa célula concede/retira a capacidade (PATCH). */
function Permissoes() {
  const [papeis, setPapeis] = useState<PapelOut[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);
  const salvamentoEmCurso = useRef(false);
  const [novoNome, setNovoNome] = useState('');
  const [novasCapacidades, setNovasCapacidades] = useState<Capacidade[]>(['ver']);

  useEffect(() => {
    fetchPapeis().then(setPapeis).catch((e) => setErro(e?.detail || e?.message || 'Falha ao carregar papéis'));
  }, []);

  const alternar = async (papel: PapelOut, cap: Capacidade) => {
    if (salvamentoEmCurso.current) return;
    salvamentoEmCurso.current = true;
    const tem = papel.capacidades.includes(cap);
    const novas = tem ? papel.capacidades.filter((c) => c !== cap) : [...papel.capacidades, cap];
    setSalvando(`${papel.id}:${cap}`);
    setErro(null);
    try {
      const atualizado = await atualizarPapelCapacidades(papel.id, novas);
      setPapeis((atuais) => (atuais ?? []).map((p) => (p.id === papel.id ? atualizado : p)));
    } catch (e) {
      setErro((e as { detail?: string })?.detail ?? 'Falha ao salvar a permissão.');
    } finally {
      salvamentoEmCurso.current = false;
      setSalvando(null);
    }
  };

  const criarNovo = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!novoNome.trim() || salvando || salvamentoEmCurso.current) return;
    salvamentoEmCurso.current = true;
    setSalvando('novo');
    setErro(null);
    try {
      const criado = await criarPapel({
        nome: novoNome.trim(),
        capacidades: novasCapacidades,
      });
      setPapeis((atuais) => [...(atuais ?? []), criado].sort((a, b) => a.nome.localeCompare(b.nome)));
      setNovoNome('');
      setNovasCapacidades(['ver']);
    } catch (e) {
      setErro(
        (e as { detail?: string; message?: string })?.detail ||
          (e as { message?: string })?.message ||
          'Falha ao criar papel.',
      );
    } finally {
      salvamentoEmCurso.current = false;
      setSalvando(null);
    }
  };

  const cell = (concedida: boolean) =>
    concedida
      ? { bg: colors.accentSoft, c: colors.primary, d: 'M4 8l2.5 2.5L12 5' }
      : { bg: colors.bg, c: '#C5C0B4', d: 'M4 4l8 8M12 4l-8 8' };

  return (
    <Card className="fade-in">
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Matriz de permissões · papel × capacidade (RBAC)</div>
      <div style={{ fontSize: 10.5, color: colors.muted, marginBottom: 12 }}>clique numa célula para conceder/retirar a capacidade</div>
      <form onSubmit={(e) => void criarNovo(e)} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: 10, marginBottom: 12, border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.bg, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 180 }}>
          <label style={lbl}>Novo papel</label>
          <input aria-label="Nome do novo papel" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} style={inp('100%')} />
        </div>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          {CAPACIDADES.map(({ cap, label }) => (
            <label key={cap} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: colors.muted }}>
              <input
                type="checkbox"
                checked={novasCapacidades.includes(cap)}
                onChange={(e) => setNovasCapacidades((atuais) =>
                  e.target.checked ? [...atuais, cap] : atuais.filter((item) => item !== cap)
                )}
              />
              {label}
            </label>
          ))}
        </div>
        <button type="submit" disabled={!novoNome.trim() || salvando === 'novo'} style={btnPrimary(!novoNome.trim() || salvando === 'novo')}>
          {salvando === 'novo' ? 'Criando…' : 'Criar papel'}
        </button>
      </form>
      {erro && <div style={{ fontSize: 11.5, color: colors.red, marginBottom: 8 }}>{erro}</div>}
      {papeis === null ? (
        <div style={{ fontSize: 12, color: colors.muted }}>Carregando…</div>
      ) : papeis.length === 0 ? (
        <div style={{ fontSize: 12, color: colors.muted }}>Nenhum papel cadastrado nesta organização.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, minWidth: 640 }}>
            <thead><tr>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 9.5, color: colors.faint, textTransform: 'uppercase', fontWeight: 600, borderBottom: `1px solid ${colors.border}` }}>Capacidade</th>
              {papeis.map((p) => <th key={p.id} style={{ textAlign: 'center', padding: '8px 6px', fontSize: 9.5, color: colors.muted, textTransform: 'uppercase', fontWeight: 600, borderBottom: `1px solid ${colors.border}` }}>{p.nome}</th>)}
            </tr></thead>
            <tbody>
              {CAPACIDADES.map(({ cap, label }) => (
                <tr key={cap} style={{ borderBottom: `1px solid ${colors.rowBorder}` }}>
                  <td style={{ padding: '8px 10px', fontWeight: 500 }}>{label}</td>
                  {papeis.map((p) => {
                    const cl = cell(p.capacidades.includes(cap));
                    return (
                      <td key={p.id} style={{ padding: 6, textAlign: 'center' }}>
                        <button
                          onClick={() => alternar(p, cap)}
                          disabled={Boolean(salvando)}
                          aria-label={`${p.capacidades.includes(cap) ? 'Retirar' : 'Conceder'} ${label} de ${p.nome}`}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 5, background: cl.bg, opacity: salvando ? 0.4 : 1, border: 'none', cursor: salvando ? 'default' : 'pointer' }}
                        >
                          <Icon size={13} stroke={cl.c} sw={1.7}><path d={cl.d} /></Icon>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ------------------------- estilos ------------------------- //
const inp = (w: number | string) => ({ width: w, fontSize: 12, padding: '7px 10px', border: `1px solid ${colors.border}`, borderRadius: 5, background: colors.bg, color: colors.ink } as const);
const lbl = { fontSize: 9.5, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 } as const;
const btnPrimary = (disabled: boolean) => ({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', background: colors.primary, color: colors.bg, borderRadius: 5, fontSize: 12, fontWeight: 500, opacity: disabled ? 0.5 : 1, border: 'none', cursor: disabled ? 'default' : 'pointer' } as const);
