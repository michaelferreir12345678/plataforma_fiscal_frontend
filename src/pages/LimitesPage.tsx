import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { colors, font, riskColor, type RiskLevel } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { PageHeader } from '../components/PageHeader';
import { SectionLabel } from '../components/SectionLabel';
import { Async, ErrorBox, Loading } from '../components/AsyncState';
import { ExportButton } from '../components/ExportButton';
import { FonteChip } from '../components/FonteChip';
import { SeloCobertura } from '../components/SeloCobertura';
import { SeloQualidadePagina } from '../components/SeloQualidade';
import { useApp, useResource } from '../context/AppContext';
import { ApiError } from '../services/api';
import {
  fetchLimiteDetail,
  fetchLimites,
  simularLimite,
  type FiscalDecimal,
  type LimiteDetail,
  type LimiteItem,
  type SimularLimiteResponse,
} from '../services/backend';
import { brl, fmt, pct } from '../utils/format';
import { Termo } from '../components/NotaMetodologica';
import { humanizar } from '../utils/rotulos';

/** Pydantic serializa `Decimal` como string; a UI normaliza antes de formatar/comparar. */
const num = (v: FiscalDecimal | null | undefined): number | null =>
  v == null ? null : Number(v);
const pctN = (v: FiscalDecimal | null | undefined, casas = 2): string => {
  const n = num(v);
  return n == null ? '—' : pct(n, casas);
};

const ROTULO: Record<string, string> = {
  pessoal_executivo: 'Pessoal · Poder Executivo',
  divida_consolidada_liquida: 'Dívida Consolidada Líquida',
  operacoes_credito: 'Operações de Crédito',
  garantias: 'Garantias',
  saude_minimo: 'Saúde (mínimo ASPS)',
  educacao_mde: 'Educação (MDE)',
  fundeb_profissionais: 'FUNDEB · profissionais',
};
/** O que é 100% em cada linha — os mínimos não se medem contra a RCL. */
const BASE_ROTULO: Record<string, string> = {
  rcl: 'RCL (12 meses)',
  rcl_ajustada: 'RCL Ajustada',
  impostos_transferencias: 'impostos + transferências',
  fundeb: 'receitas do FUNDEB',
};
const FAIXA_NIVEL: Record<string, RiskLevel> = {
  normal: 'folga',
  adequado: 'folga',
  alerta: 'atencao',
  prudencial: 'prudencial',
  excedido: 'maximo',
  insuficiente: 'maximo',
};

export function LimitesPage() {
  const { ente, periodo } = useApp();
  const res = useResource(() => fetchLimites(ente.cod_ibge, periodo), [ente.cod_ibge, periodo]);
  // Crosslink universal (Sprint D1): o Cockpit e outras telas linkam para cá com
  // ?indicador=X — a linha já abre expandida em vez de o gestor ter de procurá-la.
  const [params] = useSearchParams();
  const [expandido, setExpandido] = useState<string | null>(params.get('indicador'));

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Monitor de Limites">
      <PageHeader
        title="Monitor de Limites"
        context={`${ente.nome} · ${periodo || 'sem período selecionado'} · posição contra tetos e pisos legais`}
        source="RREO/RGF · dim_limite_legal · SICONFI"
        breadcrumb={(
          <Breadcrumb
            crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Monitor de Limites' }]}
          />
        )}
      />
      <SectionLabel note="posição vs. teto/piso legal · faixas alerta 90% / prudencial 95% / máximo 100%">
        Limites legais do ente
      </SectionLabel>

      <SeloQualidadePagina periodo={periodo} />
      {/* U31: faltava aqui — justamente a página mais sensível a "faltou apurar"
          (limites já registra os indicadores em coverage/service.py::INDICADORES_POR_PAGINA,
          só faltava consumir). */}
      <SeloCobertura pagina="limites" ente={ente.cod_ibge} periodo={periodo} />

      <Async res={res}>
        {(d) =>
          d.itens.length === 0 ? (
            <Card>
              <div style={{ fontSize: 12.5, color: colors.muted, lineHeight: 1.6 }}>
                Nenhum limite calculado para <strong>{ente.nome}</strong> em <strong>{d.periodo}</strong> ainda.
                Os indicadores são materializados sob demanda ao abrir cada módulo — abra <strong>Pessoal</strong> (via
                Despesa) ou os demais limites aparecem conforme o ente publica os anexos correspondentes. Todo cálculo é rastreável (source_ref).
              </div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <FonteChip source={d.source_ref} asOf={d.as_of} />
                <div style={{ flex: 1 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <ExportButton
                  nome="Limites legais"
                  linhas={d.itens}
                  colunas={[
                    { cabecalho: 'indicador', valor: (i) => i.indicador },
                    { cabecalho: 'esfera', valor: (i) => i.esfera },
                    { cabecalho: 'sentido', valor: (i) => i.sentido },
                    { cabecalho: 'valor_rs', valor: (i) => i.valor_rs },
                    { cabecalho: 'percentual', valor: (i) => i.valor_pct_rcl },
                    { cabecalho: 'denominador', valor: (i) => i.denominador },
                    { cabecalho: 'teto_ou_piso_pct', valor: (i) => i.teto_pct },
                    { cabecalho: 'faixa', valor: (i) => i.faixa ?? '' },
                    { cabecalho: 'distancia_pp', valor: (i) => i.distancia_teto },
                  ]}
                  contexto={{ ente: ente.nome, periodo: d.periodo, fonte: 'gold.mart_indicador × dim_limite_legal' }}
                  modeloRelatorio="limites"
                />
              </div>
              {d.itens.map((it) => (
                <LimiteRow
                  key={it.indicador}
                  it={it}
                  aberto={expandido === it.indicador}
                  onToggle={() => setExpandido((atual) => (atual === it.indicador ? null : it.indicador))}
                />
              ))}
            </div>
          )
        }
      </Async>
    </div>
  );
}

function LimiteRow({
  it,
  aberto,
  onToggle,
}: {
  it: LimiteItem;
  aberto: boolean;
  onToggle: () => void;
}) {
  const nivel = FAIXA_NIVEL[it.faixa ?? ''] ?? 'neutro';
  const rc = riskColor[nivel];
  const teto = it.teto_pct ?? 0;
  const valor = it.valor_pct_rcl ?? 0;
  const ratio = teto ? Math.min((valor / teto) * 100, 100) : 0;
  const isPiso = it.sentido === 'piso';
  // U32: num teto, a barra cheia é o estado ruim (perto/acima do limite) — o preenchimento
  // cresce com o risco. Num piso, a MESMA conta (valor/piso) satura em 100% assim que o
  // ente cumpre o mínimo: um ente muito acima do piso também enche a barra até o traço
  // final, ficando visualmente indistinguível de "no limite máximo" de um teto.
  // Invertida, a barra volta a significar a mesma coisa nas duas leituras: **mais cheia =
  // mais perto de violar** — vazia (bem acima do piso) para quem cumpre com folga, cheia
  // para quem está bem abaixo do mínimo.
  const alertaPct = it.alerta_pct != null && teto > 0 ? Math.min((it.alerta_pct / teto) * 100, 100) : null;
  const ratioVisual = isPiso ? Math.max(0, 100 - ratio) : ratio;
  const alertaVisual = alertaPct == null ? null : isPiso ? 100 - alertaPct : alertaPct;
  const marcaLimiteVisual = isPiso ? 0 : 100;
  const painelId = `limite-painel-${it.indicador}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
    <Card accent={rc.color} style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      {/* Só o rótulo é o alvo de clique (não a linha inteira): a coluna do denominador
          esconde um <Termo>, que é ele mesmo um botão — <button> dentro de <button>
          quebraria a semântica e o clique. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={aberto}
        aria-controls={painelId}
        title={aberto ? 'Recolher memória, série e simulador' : 'Ver memória, série e simulador'}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: 220, flexShrink: 0,
          border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer', padding: 0,
        }}
      >
        <span aria-hidden style={{ fontSize: 13, color: colors.muted, transform: aberto ? 'rotate(90deg)' : 'none', transition: 'transform 0.12s', flexShrink: 0 }}>
          ›
        </span>
        <span>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{ROTULO[it.indicador] ?? it.indicador}</span>
          <span style={{ display: 'block', fontSize: 11, color: colors.muted }}>
            {isPiso ? 'piso' : 'teto'} {fmt(teto, 0)}% · esfera {it.esfera}
          </span>
        </span>
      </button>
      <div style={{ width: 150 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 600, color: rc.color }}>
          {it.valor_pct_rcl != null ? pct(it.valor_pct_rcl, 2) : '—'}
        </div>
        {/* Desde a Sprint 25C a lista mistura bases: sem dizer qual é, 27% de ASPS e
            47% de pessoal pareceriam a mesma métrica medida contra a RCL. */}
        <div style={{ fontSize: 11, color: colors.faint }}>
          {/* **Não é a RCL.** Garantias e operações de crédito se apuram sobre a RCL
              Ajustada; rotular as duas do mesmo jeito faria o gestor comparar
              percentuais de bases diferentes como se fossem a mesma coisa. */}
          de{' '}
          {it.denominador === 'rcl_ajustada' ? (
            <Termo sigla="RCL Ajustada">
              <b>Receita Corrente Líquida Ajustada.</b> A RCL menos as transferências
              obrigatórias da União relativas às emendas individuais (CF, art. 166-A, §1º).
              É o denominador legal dos limites de endividamento — garantias e operações de
              crédito —, definido pela Resolução 43/2001 do Senado. É <b>menor</b> que a RCL:
              apurar estes limites sobre a RCL cheia infla o denominador e faz o ente
              aparecer com mais folga do que tem.
            </Termo>
          ) : (
            (BASE_ROTULO[it.denominador] ?? humanizar(it.denominador))
          )}
        </div>
        <div style={{ fontSize: 11, color: colors.faint }}>{it.valor_rs != null ? brl(it.valor_rs / 1e6) : '—'}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div
          role="meter"
          aria-label={`${ROTULO[it.indicador] ?? it.indicador}: ${fmt(valor, 2)}%; ${isPiso ? 'piso' : 'teto'} ${fmt(teto, 0)}%`}
          aria-valuemin={0}
          aria-valuemax={Math.max(teto, valor, 1)}
          aria-valuenow={valor}
          style={{ position: 'relative', height: 12, background: colors.borderSoft, borderRadius: 3 }}
        >
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${ratioVisual}%`, background: rc.color, borderRadius: 3 }} />
          {alertaVisual != null && (
            <div style={{ position: 'absolute', left: `${alertaVisual}%`, top: -3, bottom: -3, width: 1.5, background: colors.yellowText }} />
          )}
          <div style={{ position: 'absolute', left: `${marcaLimiteVisual}%`, top: -3, bottom: -3, width: 2, background: colors.primaryDeep }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>
          <span>distância ao {isPiso ? 'piso' : 'teto'}: {it.distancia_teto != null ? fmt(it.distancia_teto, 1) + ' p.p.' : '—'}</span>
          <span style={{ color: rc.color, fontWeight: 600, textTransform: 'uppercase' }}>{it.faixa ?? '—'}</span>
        </div>
      </div>
    </Card>
    {aberto && (
      <div id={painelId} role="region" aria-label={`Detalhe de ${ROTULO[it.indicador] ?? it.indicador}`}>
        <LimiteDetailPanel indicador={it.indicador} rotulo={ROTULO[it.indicador] ?? it.indicador} />
      </div>
    )}
    </div>
  );
}

/**
 * Painel expansível (Sprint D1): memória de cálculo, providências (base legal por
 * faixa), série histórica e simulador — tudo sem sair de `/limites`. Consome
 * `GET /entes/{cod}/limites/{indicador}` e `POST .../simular`, já testados no backend
 * e sem consumidor no frontend até esta sprint.
 */
function LimiteDetailPanel({ indicador, rotulo }: { indicador: string; rotulo: string }) {
  const { ente, periodo } = useApp();
  const res = useResource(
    () => fetchLimiteDetail(ente.cod_ibge, indicador, periodo),
    [ente.cod_ibge, indicador, periodo],
  );
  return (
    <Card style={{ marginTop: -6, borderTopLeftRadius: 0, borderTopRightRadius: 0, background: colors.surfaceAlt }}>
      <Async res={res}>
        {(d) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <MemoriaLimite memoria={d.memoria} />
              <ProvidenciasLimite providencias={d.providencias} faixaAtual={d.faixa} />
            </div>
            <SerieLimite serie={d.serie_historica} indicador={indicador} />
            <SimuladorLimite detalhe={d} rotulo={rotulo} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {d.periodo_breadcrumb.length > 0 && (
                <span style={{ fontSize: 11, color: colors.faint }}>
                  {d.periodo_breadcrumb.map((b) => b.descricao).join(' › ')} › {d.periodo}
                </span>
              )}
              <div style={{ flex: 1 }} />
              <FonteChip source={d.source_ref} asOf={d.as_of} />
            </div>
          </div>
        )}
      </Async>
    </Card>
  );
}

function MemoriaLimite({ memoria }: { memoria: Record<string, unknown> | null }) {
  const entradas = memoria ? Object.entries(memoria).filter(([, v]) => v != null) : [];
  return (
    <div>
      <SectionLabel note="rastreável — de onde vem cada número">Memória de cálculo</SectionLabel>
      {entradas.length === 0 ? (
        <div style={{ fontSize: 11.5, color: colors.muted }}>Sem memória apurada.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 6 }}>
          {entradas.map(([chave, valor]) => (
            <div key={chave} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11.5 }}>
              <span style={{ color: colors.muted }}>{humanizar(chave)}</span>
              <span style={{ fontFamily: font.mono, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>
                {typeof valor === 'object' ? JSON.stringify(valor) : String(valor)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProvidenciasLimite({
  providencias,
  faixaAtual,
}: {
  providencias: LimiteDetail['providencias'];
  faixaAtual: string | null;
}) {
  return (
    <div>
      <SectionLabel note="dado — aponta o dispositivo, não decide por você">
        Providências da faixa {faixaAtual ? `“${faixaAtual}”` : ''}
      </SectionLabel>
      {providencias.length === 0 ? (
        <div style={{ fontSize: 11.5, color: colors.muted, marginTop: 6 }}>
          Nenhuma providência legal associada à faixa vigente.
        </div>
      ) : (
        <ul style={{ margin: '6px 0 0', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {providencias.map((p, i) => (
            <li key={i} style={{ fontSize: 11.5, lineHeight: 1.5 }}>
              {p.texto}
              {p.base_legal && (
                <div style={{ fontSize: 11, color: colors.faint, fontFamily: font.mono }}>{p.base_legal}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SerieLimite({ serie, indicador }: { serie: LimiteDetail['serie_historica']; indicador: string }) {
  return (
    <div>
      <SectionLabel note="drill temporal · até o período corrente">Série histórica</SectionLabel>
      {serie.length === 0 ? (
        <div style={{ fontSize: 11.5, color: colors.muted, marginTop: 6 }}>Sem série apurada para este indicador.</div>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: 6 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <caption className="sr-only">Série histórica de {indicador}</caption>
            <thead>
              <tr>
                <th scope="col" style={thSerie}>Período</th>
                <th scope="col" style={{ ...thSerie, textAlign: 'right' }}>% da base</th>
                <th scope="col" style={thSerie}>Faixa</th>
              </tr>
            </thead>
            <tbody>
              {serie.map((s) => (
                <tr key={s.periodo} style={{ borderTop: `1px solid ${colors.rowBorder}` }}>
                  <td style={{ padding: '4px 8px', fontFamily: font.mono }}>{s.periodo}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: font.mono }}>
                    {pctN(s.valor_pct_rcl)}
                  </td>
                  <td style={{ padding: '4px 8px' }}>{s.faixa ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SimuladorLimite({ detalhe, rotulo }: { detalhe: LimiteDetail; rotulo: string }) {
  const { ente, periodo } = useApp();
  const [novoValor, setNovoValor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<SimularLimiteResponse | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = Number(novoValor.replace(/\./g, '').replace(',', '.'));
    if (!novoValor.trim() || !Number.isFinite(parsed)) {
      setError('Informe um valor em reais.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resposta = await simularLimite(ente.cod_ibge, detalhe.indicador, periodo, {
        novo_valor_rs: parsed,
      });
      setResultado(resposta);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.detail || cause.message : 'Não foi possível simular.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
      <SectionLabel note="cenário calculado pelo backend · não altera o fato fiscal">
        Simular novo valor de {rotulo}
      </SectionLabel>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'end', marginTop: 8, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: colors.muted }}>Novo valor (R$)</span>
          <input
            type="text"
            inputMode="decimal"
            value={novoValor}
            onChange={(e) => setNovoValor(e.target.value)}
            placeholder={detalhe.valor_rs != null ? String(detalhe.valor_rs) : '0'}
            style={{ padding: '7px 9px', border: `1px solid ${colors.border}`, borderRadius: 4, fontFamily: font.mono, fontSize: 11.5, minWidth: 180 }}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '8px 14px', border: 0, borderRadius: 4, background: colors.primary, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
        >
          {loading ? 'Calculando…' : 'Simular'}
        </button>
      </form>
      {error && <div style={{ marginTop: 8 }}><ErrorBox message={error} /></div>}
      {loading && <div style={{ marginTop: 8 }}><Loading label="Recalculando a faixa…" /></div>}
      {resultado && (
        <div style={{ marginTop: 10, display: 'flex', gap: 18, alignItems: 'baseline', flexWrap: 'wrap', fontSize: 12 }}>
          <span>
            atual: <strong style={{ fontFamily: font.mono }}>{pctN(resultado.valor_pct_atual)}</strong>
            {' '}({resultado.faixa_atual ?? '—'})
          </span>
          <span aria-hidden>→</span>
          <span>
            simulado: <strong style={{ fontFamily: font.mono, color: riskColor[FAIXA_NIVEL[resultado.faixa_simulada] ?? 'neutro'].color }}>
              {pctN(resultado.valor_pct_simulado)}
            </strong>
            {' '}(<strong style={{ textTransform: 'uppercase' }}>{resultado.faixa_simulada}</strong>)
          </span>
          <span style={{ color: colors.faint, fontSize: 11 }}>não persistido — cenário apenas</span>
        </div>
      )}
    </div>
  );
}

const thSerie = {
  padding: '4px 8px',
  textAlign: 'left' as const,
  fontSize: 10.5,
  color: colors.faint,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};
