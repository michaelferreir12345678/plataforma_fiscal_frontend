import { useState } from 'react';
import { colors } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { MetricHeader } from '../components/MetricHeader';
import { SectionLabel } from '../components/SectionLabel';
import { Sparkline } from '../components/Sparkline';
import { Async } from '../components/AsyncState';
import { useApp, useResource } from '../context/AppContext';
import {
  fetchPatrimonio,
  fetchMscArvore,
  fetchMscConta,
  fetchMscConciliacao,
  fetchBalanco,
  type FiscalDecimal,
  type PatrimonioDetalhe,
  type ConciliacaoCheck,
  type DrillChild,
  type BalancoLinha,
} from '../services/backend';
import { fmt } from '../utils/format';

/** Entes-demo: São Paulo publica MSC mensal; Fortaleza só a DCA (balanços anuais). */
const ENTES = [
  { cod_ibge: '3550308', nome: 'São Paulo · SP', uf: 'SP' },
  { cod_ibge: '2304400', nome: 'Fortaleza · CE', uf: 'CE' },
];
const TIPOS = [
  { tipo: 'patrimonial', rotulo: 'Patrimonial' },
  { tipo: 'variacoes', rotulo: 'Variações (DVP)' },
  { tipo: 'orcamentario_receita', rotulo: 'Orç. Receita' },
  { tipo: 'orcamentario_despesa', rotulo: 'Orç. Despesa' },
];

const n = (v: FiscalDecimal | null | undefined): number | null =>
  v === null || v === undefined || v === '' ? null : Number(v);
/** R$ milhões (o backend serializa em reais). */
const M = (v: FiscalDecimal | null | undefined): string => {
  const x = n(v);
  return x === null ? '—' : `R$ ${fmt(x / 1e6, 1)} M`;
};
/** R$ bilhões, para os agregados patrimoniais. */
const B = (v: FiscalDecimal | null | undefined): string => {
  const x = n(v);
  return x === null ? '—' : `R$ ${fmt(x / 1e9, 2)} bi`;
};

export function PatrimonioPage() {
  const { ente, setEnte } = useApp();
  // O ente global pode não ser um dos que têm patrimônio ingerido; default para São Paulo.
  const cod = ENTES.some((e) => e.cod_ibge === ente.cod_ibge) ? ente.cod_ibge : ENTES[0].cod_ibge;
  const [ano, setAno] = useState<number | null>(null);

  const det = useResource(() => fetchPatrimonio(cod, ano), [cod, ano]);

  return (
    <div
      className="fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      data-screen-label="Detalhe · Patrimônio & Explorador MSC"
    >
      <Breadcrumb
        crumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Análise por bloco' },
          { label: 'Patrimônio & MSC' },
        ]}
        source="fonte: DCA (Balanço Patrimonial) · MSC Patrimonial · SICONFI"
      />

      {/* Seletor de ente + ano (dado real: SP tem MSC; Fortaleza só DCA) */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={pillLabel}>Ente</span>
        {ENTES.map((e) => (
          <button
            key={e.cod_ibge}
            type="button"
            onClick={() => {
              setEnte({ cod_ibge: e.cod_ibge, nome: `Município de ${e.nome}` });
              setAno(null);
            }}
            style={pill(cod === e.cod_ibge)}
          >
            {e.nome}
          </button>
        ))}
        <Async res={det}>
          {(d) => (
            <>
              <span style={{ ...pillLabel, marginLeft: 12 }}>Exercício</span>
              {(d.anos_disponiveis.length ? d.anos_disponiveis : [d.ano]).map((a) => (
                <button key={a} type="button" onClick={() => setAno(a)} style={pill(d.ano === a)}>
                  {a}
                </button>
              ))}
            </>
          )}
        </Async>
      </div>

      <Async res={det}>{(d) => <Header d={d} />}</Async>

      <Async res={det}>
        {(d) => (
          <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 12, alignItems: 'start' }}>
            <Explorador cod={cod} ano={d.ano} temMsc={d.tem_msc} mesesMsc={d.meses_msc} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Conciliacao cod={cod} ano={d.ano} />
              <Balancos cod={cod} ano={d.ano} />
            </div>
          </div>
        )}
      </Async>
    </div>
  );
}

// --- cabeçalho patrimonial ---
function Header({ d }: { d: PatrimonioDetalhe }) {
  const fecha = d.balanco_fechado === true;
  return (
    <MetricHeader
      label={`Ativo total · exercício ${d.ano}`}
      value={B(d.ativo)}
      context={
        <span>
          Passivo + PL <b>{B(d.passivo_pl)}</b> · Patrimônio Líquido{' '}
          <b style={{ color: (n(d.patrimonio_liquido) ?? 0) < 0 ? colors.red : colors.ink }}>{B(d.patrimonio_liquido)}</b>{' '}
          · fonte {d.source_ref?.relatorio ?? '—'}
          {d.source_ref?.versao_entrega ? ` v${d.source_ref.versao_entrega}` : ''}
          {d.uf ? ` · ${d.uf}` : ''}
        </span>
      }
      right={
        <div style={{ display: 'flex', gap: 12 }}>
          <StatBox
            label="Balanço patrimonial"
            value={fecha ? '✓ fecha' : '≠'}
            sub={fecha ? 'Ativo = Passivo + PL' : 'Ativo ≠ Passivo + PL'}
            fg={fecha ? colors.green : colors.red}
            bg={fecha ? colors.greenBg : colors.redBg}
          />
          <StatBox
            label="Conciliação MSC ↔ DCA"
            value={d.conciliado === true ? '✓ conciliado' : `${d.n_divergencias ?? '—'} div.`}
            sub={d.tem_msc ? 'rollup · encerramento · balanço' : 'só DCA (sem MSC publicada)'}
            fg={d.conciliado === false ? colors.red : colors.green}
            bg={d.conciliado === false ? colors.redBg : colors.greenBg}
          />
          <StatBox
            label="Resultado patrimonial"
            value={B(d.resultado_patrimonial)}
            sub="VPA − VPD (variações)"
            fg={(n(d.resultado_patrimonial) ?? 0) < 0 ? colors.red : colors.primary}
            bg={colors.accentSoft}
          />
        </div>
      }
    />
  );
}

// --- explorador de contas (drill lazy) + matriz mensal ---
function Explorador({
  cod,
  ano,
  temMsc,
  mesesMsc,
}: {
  cod: string;
  ano: number;
  temMsc: boolean;
  mesesMsc: string[];
}) {
  const [node, setNode] = useState<string | undefined>();
  const [mes, setMes] = useState<string | undefined>();
  const periodo = mes ?? (temMsc ? mesesMsc[mesesMsc.length - 1] : String(ano));

  const arv = useResource(
    () => fetchMscArvore(cod, { node, periodo }),
    [cod, node, periodo],
  );

  if (!temMsc) {
    return <BalancoTree cod={cod} ano={ano} />;
  }

  return (
    <Card pad={0}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 8px' }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Explorador MSC · saldo por conta PCASP</div>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: colors.muted }}>
          drill lazy · saldo rolled-up (pai = Σ filhos)
        </span>
      </div>
      {/* seletor de mês (a MSC é mensal) */}
      <div style={{ display: 'flex', gap: 4, padding: '0 16px 10px', flexWrap: 'wrap' }}>
        {mesesMsc.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setMes(p)}
            style={monthPill(periodo === p)}
          >
            {p.slice(5)}
          </button>
        ))}
      </div>

      <Async res={arv}>
        {(tree) => (
          <div>
            {/* breadcrumb (drill UP) */}
            <div style={crumbBar}>
              <button type="button" onClick={() => setNode(undefined)} style={crumbBtn(!node)}>
                raiz
              </button>
              {tree.breadcrumb.map((c) => (
                <span key={c.codigo}>
                  <span style={{ color: colors.faint }}> › </span>
                  <button type="button" onClick={() => setNode(c.codigo)} style={crumbBtn(false)}>
                    {c.descricao}
                  </button>
                </span>
              ))}
              {tree.node && (
                <span>
                  <span style={{ color: colors.faint }}> › </span>
                  <span style={{ fontSize: 11, color: colors.ink, fontWeight: 600 }}>
                    {tree.node.descricao}
                  </span>
                </span>
              )}
            </div>

            {/* filhos diretos (drill DOWN) */}
            <div style={contaHeader}>
              <div>Conta PCASP</div>
              <div style={{ textAlign: 'right' }}>Saldo ({periodo.slice(5)}/{periodo.slice(0, 4)})</div>
            </div>
            {tree.children.length === 0 ? (
              <div style={{ padding: 16, fontSize: 12, color: colors.muted }}>
                Sem contas neste nível para o período.
              </div>
            ) : (
              tree.children.map((c) => (
                <ContaRow key={c.codigo} c={c} onDrill={() => c.has_children && setNode(c.codigo)} />
              ))
            )}
            <div style={{ padding: '8px 16px', fontSize: 10, color: colors.faint }}>
              fonte {tree.source_ref?.relatorio} {tree.source_ref?.anexo} · v{tree.source_ref?.versao_entrega}
            </div>
          </div>
        )}
      </Async>

      {node && <MatrizConta cod={cod} codigo={node} ano={ano} />}
    </Card>
  );
}

function ContaRow({ c, onDrill }: { c: DrillChild; onDrill: () => void }) {
  const saldo = n(c.measures.saldo);
  return (
    <button
      type="button"
      disabled={!c.has_children}
      onClick={onDrill}
      style={{
        ...contaRow,
        cursor: c.has_children ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ color: c.has_children ? colors.primary : colors.faint, width: 10 }}>
          {c.has_children ? '›' : '·'}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: colors.muted }}>
          {c.codigo}
        </span>
        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {c.descricao}
        </span>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", textAlign: 'right', color: (saldo ?? 0) < 0 ? colors.red : colors.ink }}>
        {M(c.measures.saldo)}
      </div>
    </button>
  );
}

// --- matriz mensal de uma conta (12 meses) ---
function MatrizConta({ cod, codigo, ano }: { cod: string; codigo: string; ano: number }) {
  const mat = useResource(() => fetchMscConta(cod, codigo, ano), [cod, codigo, ano]);
  return (
    <div style={{ borderTop: `1px solid ${colors.border}`, background: colors.surfaceAlt, padding: '12px 16px' }}>
      <Async res={mat}>
        {(m) => {
          const valores = m.meses.map((x) => n(x.saldo_final) ?? 0);
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 9.5, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Matriz mensal · {m.cod_conta}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{m.descricao}</div>
                </div>
                {valores.length > 1 && (
                  <div style={{ marginLeft: 'auto' }}>
                    <Sparkline values={valores} color={colors.primary} width={120} height={30} />
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 4 }}>
                {m.meses.map((x) => (
                  <div key={x.periodo} style={{ padding: '5px 7px', background: colors.surface, border: `1px solid ${colors.rowBorder}`, borderRadius: 4 }}>
                    <div style={{ fontSize: 9, color: colors.faint }}>{x.periodo.slice(5)}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 500 }}>{M(x.saldo_final)}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: colors.muted, marginTop: 8 }}>
                abertura {M(m.saldo_abertura)} · encerramento {M(m.saldo_encerramento)} · variação no exercício{' '}
                <b style={{ color: (n(m.variacao_exercicio) ?? 0) < 0 ? colors.red : colors.green }}>{M(m.variacao_exercicio)}</b>
                {' · '}fonte {m.source_ref.relatorio} v{m.source_ref.versao_entrega}
              </div>
            </div>
          );
        }}
      </Async>
    </div>
  );
}

// --- conciliação ---
function Conciliacao({ cod, ano }: { cod: string; ano: number }) {
  const conc = useResource(() => fetchMscConciliacao(cod, ano), [cod, ano]);
  return (
    <Card>
      <SectionLabel note="pai = Σ filhos · Ativo = Passivo+PL · MSC ↔ DCA">
        Conciliação do patrimônio
      </SectionLabel>
      <Async res={conc}>
        {(c) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6,
                background: c.conciliado ? colors.greenBg : colors.redBg,
              }}
            >
              <span style={{ fontSize: 18, color: c.conciliado ? colors.green : colors.red }}>
                {c.conciliado ? '✓' : '⚠'}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: c.conciliado ? colors.green : colors.red }}>
                {c.conciliado
                  ? `Conciliado — ${c.n_checks} verificações`
                  : `${c.n_divergencias} divergência(s) em ${c.n_checks}`}
              </span>
            </div>
            {c.checks.map((ch) => (
              <CheckRow key={ch.chave} ch={ch} />
            ))}
            <div style={{ fontSize: 10, color: colors.faint, lineHeight: 1.4, marginTop: 2 }}>{c.observacao}</div>
          </div>
        )}
      </Async>
    </Card>
  );
}

function CheckRow({ ch }: { ch: ConciliacaoCheck }) {
  const ok = !(ch.divergente && ch.aplicavel);
  return (
    <div style={{ padding: '7px 0', borderTop: `1px solid ${colors.rowBorder}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            fontSize: 8.5, padding: '1px 6px', borderRadius: 3, fontWeight: 700, letterSpacing: '0.04em',
            background: ok ? colors.greenBg : colors.redBg, color: ok ? colors.green : colors.red,
          }}
        >
          {ok ? 'OK' : 'DIVERGE'}
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 600 }}>{ch.titulo}</span>
      </div>
      {(ch.esquerda !== null || ch.direita !== null) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: colors.muted, marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>
          <span>{ch.esquerda_rotulo}: {M(ch.esquerda)}</span>
          <span>{ch.direita_rotulo}: {M(ch.direita)}</span>
        </div>
      )}
      {ch.diferenca !== null && !ok && (
        <div style={{ fontSize: 10, color: colors.red, marginTop: 2 }}>Δ {M(ch.diferenca)}</div>
      )}
    </div>
  );
}

// --- balanços (DCA) ---
function Balancos({ cod, ano }: { cod: string; ano: number }) {
  const [tipo, setTipo] = useState('patrimonial');
  const bal = useResource(() => fetchBalanco(cod, tipo, ano), [cod, tipo, ano]);
  return (
    <Card pad={0}>
      <div style={{ padding: '14px 16px 8px' }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Balanços da DCA</div>
      </div>
      <div style={{ display: 'flex', gap: 4, padding: '0 16px 10px', flexWrap: 'wrap' }}>
        {TIPOS.map((t) => (
          <button key={t.tipo} type="button" onClick={() => setTipo(t.tipo)} style={monthPill(tipo === t.tipo)}>
            {t.rotulo}
          </button>
        ))}
      </div>
      <Async res={bal}>
        {(b) => (
          <div>
            <div style={{ padding: '0 16px 8px', fontSize: 10, color: colors.muted }}>{b.anexo}</div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {b.linhas.slice(0, 60).map((l, i) => (
                <BalancoRow key={`${l.cod_conta}-${l.coluna}-${i}`} l={l} />
              ))}
            </div>
            <div style={{ padding: '8px 16px', fontSize: 10, color: colors.faint }}>
              {b.linhas.length} linhas · fonte DCA {b.anexo} v{b.versao_entrega}
            </div>
          </div>
        )}
      </Async>
    </Card>
  );
}

function BalancoRow({ l }: { l: BalancoLinha }) {
  const nivel = l.nivel ?? 1;
  const indent = Math.max(0, (nivel - 1)) * 12;
  const valor = n(l.valor);
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '5px 16px', borderTop: `1px solid ${colors.rowBorder}`, fontSize: 11.5 }}>
      <div style={{ paddingLeft: indent, minWidth: 0, flex: 1, display: 'flex', gap: 6, alignItems: 'center' }}>
        {l.cod_conta.match(/^\d/) && (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: colors.faint }}>{l.cod_conta}</span>
        )}
        <span style={{ fontWeight: nivel <= 2 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {l.descricao || l.coluna || l.cod_conta}
        </span>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", textAlign: 'right', color: (valor ?? 0) < 0 ? colors.red : colors.ink }}>
        {M(l.valor)}
      </div>
    </div>
  );
}

// --- balanço patrimonial como árvore (para entes sem MSC, ex.: Fortaleza) ---
function BalancoTree({ cod, ano }: { cod: string; ano: number }) {
  const bal = useResource(() => fetchBalanco(cod, 'patrimonial', ano), [cod, ano]);
  return (
    <Card pad={0}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 8px' }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Balanço Patrimonial (DCA)</div>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: colors.muted }}>
          este ente não publica MSC — explorando a DCA anual
        </span>
      </div>
      <Async res={bal}>
        {(b) => {
          const roots = b.linhas.filter((l) => (l.nivel ?? 1) <= 4);
          return (
            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
              {roots.map((l, i) => (
                <BalancoRow key={`${l.cod_conta}-${i}`} l={l} />
              ))}
              <div style={{ padding: '8px 16px', fontSize: 10, color: colors.faint }}>
                {b.linhas.length} contas · fonte DCA {b.anexo} v{b.versao_entrega}
              </div>
            </div>
          );
        }}
      </Async>
    </Card>
  );
}

// --- primitivos de UI ---
function StatBox({ label, value, sub, fg, bg }: { label: string; value: string; sub: string; fg: string; bg: string }) {
  return (
    <div style={{ padding: '10px 14px', background: bg, borderRadius: 6, borderLeft: `3px solid ${fg}`, minWidth: 150 }}>
      <div style={{ fontSize: 9, color: fg, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: fg, marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 9.5, color: colors.muted, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

const pillLabel = { fontSize: 9.5, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontWeight: 700 };
const pill = (active: boolean) => ({
  fontSize: 11.5, padding: '5px 12px', borderRadius: 5, fontWeight: 600, cursor: 'pointer',
  border: `1px solid ${active ? colors.primary : colors.border}`,
  background: active ? colors.primary : colors.surface,
  color: active ? colors.bg : colors.ink,
});
const monthPill = (active: boolean) => ({
  fontSize: 10.5, padding: '3px 9px', borderRadius: 4, fontWeight: 600, cursor: 'pointer',
  fontFamily: "'JetBrains Mono', monospace",
  border: `1px solid ${active ? colors.primary : colors.border}`,
  background: active ? colors.accentSoft : colors.surface,
  color: active ? colors.primary : colors.muted,
});
const crumbBar = { display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' as const, padding: '4px 16px 8px', fontSize: 11 };
const crumbBtn = (active: boolean) => ({
  fontSize: 11, padding: '1px 4px', border: 0, background: 'transparent',
  color: active ? colors.ink : colors.primary, fontWeight: active ? 700 : 500, cursor: 'pointer',
});
const contaHeader = {
  display: 'grid', gridTemplateColumns: '1fr auto', padding: '6px 16px',
  background: colors.bg, borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`,
  fontSize: 9, fontWeight: 700, color: colors.muted, letterSpacing: '0.06em', textTransform: 'uppercase' as const,
};
const contaRow = {
  display: 'grid', gridTemplateColumns: '1fr auto', width: '100%', alignItems: 'center',
  padding: '8px 16px', borderBottom: `1px solid ${colors.rowBorder}`, fontSize: 12,
  background: 'transparent', border: 0, borderBottomStyle: 'solid' as const, textAlign: 'left' as const, color: colors.ink,
};
