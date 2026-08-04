/**
 * Patrimônio & Explorador MSC (Módulo 11).
 *
 * A Sprint 25D removeu o **seletor de entes-demo** que a auditoria (§2.10) classificou
 * como risco de leitura errada: a tela trazia dois municípios fixos (SP e Fortaleza) e
 * *sobrescrevia o ente global* sem avisar — um usuário de outra prefeitura via o
 * patrimônio de São Paulo achando que era o seu. Agora a página é do ente do contexto,
 * como todas as outras, e a falta de dado aparece como cobertura declarada + caminho
 * para a ingestão (quem pode administrar), nunca como troca silenciosa.
 *
 * Também novos aqui: **comparação anual dos balanços** (a série diz a direção que a
 * foto não diz) e exportação.
 */
import { SeloCobertura } from '../components/SeloCobertura';
import { useState } from 'react';
import { colors, font } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { PageHeader } from '../components/PageHeader';
import { MetricHeader } from '../components/MetricHeader';
import { SectionLabel } from '../components/SectionLabel';
import { Sparkline } from '../components/Sparkline';
import { Async, EmptyState, Skeleton } from '../components/AsyncState';
import { FonteChip } from '../components/FonteChip';
import { ExportButton } from '../components/ExportButton';
import { VirtualizedTable, type VirtualColumn } from '../components/VirtualizedTable';
import { useApp, useResource } from '../context/AppContext';
import {
  fetchPatrimonio,
  fetchMe,
  fetchMscArvore,
  fetchMscConta,
  fetchMscConciliacao,
  fetchBalanco,
  fetchBalancoComparacao,
  type FiscalDecimal,
  type PatrimonioDetalhe,
  type ConciliacaoCheck,
  type DrillChild,
  type BalancoLinha,
  type ComparacaoLinha,
} from '../services/backend';
import { fmt } from '../utils/format';

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
  const { ente } = useApp();
  const cod = ente.cod_ibge;
  const [ano, setAno] = useState<number | null>(null);
  const det = useResource(() => fetchPatrimonio(cod, ano), [cod, ano]);
  const me = useResource(fetchMe, []);
  const podeAdministrar = (me.data?.org_ativa?.capacidades ?? []).includes('administrar');

  return (
    <div
      className="fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      data-screen-label="Detalhe · Patrimônio & Explorador MSC"
    >
      <PageHeader
        title="Patrimônio & Explorador MSC"
        context={`${ente.nome} · balanços anuais e saldos mensais por conta PCASP`}
        source="DCA (Balanço Patrimonial) · MSC Patrimonial · SICONFI"
        breadcrumb={(
          <Breadcrumb
            crumbs={[
              { label: 'Dashboard', to: '/dashboard' },
              { label: 'Análise por bloco' },
              { label: 'Patrimônio & MSC' },
            ]}
          />
        )}
      />

      {/* O Patrimônio depende de DCA (bem coberta) e MSC (quase ninguém transmite). O
          selo declara isso em vez de deixar o explorador vazio parecer defeito. */}
      <SeloCobertura pagina="patrimonio" ente={ente.cod_ibge} />

      <Async
        res={det}
        skeleton={<Skeleton linhas={6} altura={22} />}
        vazio={{
          quando: (d) => !d.tem_dca && !d.tem_msc,
          render: (
            <EmptyState
              ente={ente.nome}
              periodo="patrimônio"
              podeAdministrar={podeAdministrar}
              detalhe={
                <>
                  {det.data?.cobertura?.mensagem ??
                    'Nenhuma fonte patrimonial ingerida para este ente.'}{' '}
                  O patrimônio vem da <strong>DCA</strong> (balanços anuais) e da{' '}
                  <strong>MSC</strong> (saldos mensais por conta PCASP) — ambas por ente,
                  na Central de Dados.
                </>
              }
            />
          ),
        }}
      >
        {(d) => (
          <>
            <SeletorExercicio anos={d.anos_disponiveis} atual={d.ano} onEscolher={setAno} />
            <AvisoCobertura d={d} podeAdministrar={podeAdministrar} />
            <Header d={d} enteNome={ente.nome} />
            <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 12, alignItems: 'start' }}>
              <Explorador cod={cod} ano={d.ano} temMsc={d.tem_msc} mesesMsc={d.meses_msc} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Conciliacao cod={cod} ano={d.ano} />
                <Balancos cod={cod} ano={d.ano} enteNome={ente.nome} />
              </div>
            </div>
            <ComparacaoAnual cod={cod} enteNome={ente.nome} />
          </>
        )}
      </Async>
    </div>
  );
}

function SeletorExercicio({
  anos,
  atual,
  onEscolher,
}: {
  anos: number[];
  atual: number;
  onEscolher: (a: number) => void;
}) {
  const lista = anos.length ? anos : [atual];
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={pillLabel}>Exercício</span>
      {lista.map((a) => (
        <button key={a} type="button" onClick={() => onEscolher(a)} style={pill(atual === a)}>
          {a}
        </button>
      ))}
    </div>
  );
}

/** Cobertura declarada: o que este ente publicou e o que falta — sem trocar de ente. */
function AvisoCobertura({
  d,
  podeAdministrar,
}: {
  d: PatrimonioDetalhe;
  podeAdministrar: boolean;
}) {
  const cobertura = d.cobertura;
  if (!cobertura || cobertura.fontes_ausentes.length === 0) return null;
  return (
    <div
      data-testid="aviso-cobertura"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
        borderRadius: 6, background: colors.yellowBg, border: `1px solid ${colors.yellowSoft}`,
      }}
    >
      <span style={{ color: colors.yellowText, fontWeight: 700 }}>!</span>
      <div style={{ fontSize: 11.5, color: colors.ink, lineHeight: 1.55 }}>
        {cobertura.mensagem}
        {podeAdministrar && (
          <>
            {' '}
            <a href="/central-dados" style={{ color: colors.primary, fontWeight: 600 }}>
              abrir a Central de Dados
            </a>{' '}
            para solicitar a ingestão de {cobertura.fontes_ausentes.join(' e ')}.
          </>
        )}
      </div>
    </div>
  );
}

// --- cabeçalho patrimonial ---
function Header({ d, enteNome }: { d: PatrimonioDetalhe; enteNome: string }) {
  const fecha = d.balanco_fechado === true;
  return (
    <MetricHeader
      label={`Ativo total · ${enteNome} · exercício ${d.ano}`}
      value={B(d.ativo)}
      context={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span>
            Passivo + PL <b>{B(d.passivo_pl)}</b> · Patrimônio Líquido{' '}
            <b style={{ color: (n(d.patrimonio_liquido) ?? 0) < 0 ? colors.red : colors.ink }}>{B(d.patrimonio_liquido)}</b>
            {d.uf ? ` · ${d.uf}` : ''}
          </span>
          <FonteChip source={d.source_ref} asOf={d.as_of} />
        </div>
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
        <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.muted }}>
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

            {/* filhos diretos (drill DOWN), virtualizados para níveis PCASP extensos */}
            <MscChildrenTable
              rows={tree.children}
              periodo={periodo}
              onDrill={(child) => child.has_children && setNode(child.codigo)}
            />
            <div style={{ padding: '8px 16px', fontSize: 11, color: colors.faint }}>
              fonte {tree.source_ref?.relatorio} {tree.source_ref?.anexo} · v{tree.source_ref?.versao_entrega}
            </div>
          </div>
        )}
      </Async>

      {node && <MatrizConta cod={cod} codigo={node} ano={ano} />}
    </Card>
  );
}

function MscChildrenTable({
  rows,
  periodo,
  onDrill,
}: {
  rows: DrillChild[];
  periodo: string;
  onDrill: (child: DrillChild) => void;
}) {
  const columns: VirtualColumn<DrillChild>[] = [
    {
      key: 'conta',
      header: 'Conta PCASP',
      width: '70%',
      render: (child) => (
        <button
          type="button"
          disabled={!child.has_children}
          onClick={() => onDrill(child)}
          aria-label={child.has_children ? `Abrir conta ${child.codigo}, ${child.descricao}` : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            minWidth: 0,
            cursor: child.has_children ? 'pointer' : 'default',
            textAlign: 'left',
          }}
        >
          <span aria-hidden style={{ color: child.has_children ? colors.primary : colors.faint, width: 10 }}>
            {child.has_children ? '›' : '·'}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: colors.muted }}>
            {child.codigo}
          </span>
          <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {child.descricao}
          </span>
        </button>
      ),
    },
    {
      key: 'saldo',
      header: `Saldo (${periodo.slice(5)}/${periodo.slice(0, 4)})`,
      width: '30%',
      align: 'right',
      render: (child) => {
        const saldo = n(child.measures.saldo);
        return (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: (saldo ?? 0) < 0 ? colors.red : colors.ink }}>
            {M(child.measures.saldo)}
          </span>
        );
      },
    },
  ];
  return (
    <VirtualizedTable
      rows={rows}
      columns={columns}
      rowKey={(child) => child.codigo}
      caption={`Contas PCASP em ${periodo}`}
      height={Math.min(440, Math.max(170, rows.length * 44 + 44))}
      rowHeight={44}
      onRowActivate={(child) => child.has_children && onDrill(child)}
      getRowLabel={(child) => `${child.codigo}, ${child.descricao}, saldo ${M(child.measures.saldo)}`}
      empty="Sem contas neste nível para o período."
    />
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
                  <div style={{ fontSize: 11, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
                    <div style={{ fontSize: 11, color: colors.faint }}>{x.periodo.slice(5)}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500 }}>{M(x.saldo_final)}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: colors.muted, marginTop: 8 }}>
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
            <div style={{ fontSize: 11, color: colors.faint, lineHeight: 1.4, marginTop: 2 }}>{c.observacao}</div>
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
            fontSize: 11, padding: '1px 6px', borderRadius: 3, fontWeight: 700, letterSpacing: '0.04em',
            background: ok ? colors.greenBg : colors.redBg, color: ok ? colors.green : colors.red,
          }}
        >
          {ok ? 'OK' : 'DIVERGE'}
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 600 }}>{ch.titulo}</span>
      </div>
      {(ch.esquerda !== null || ch.direita !== null) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colors.muted, marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>
          <span>{ch.esquerda_rotulo}: {M(ch.esquerda)}</span>
          <span>{ch.direita_rotulo}: {M(ch.direita)}</span>
        </div>
      )}
      {ch.diferenca !== null && !ok && (
        <div style={{ fontSize: 11, color: colors.red, marginTop: 2 }}>Δ {M(ch.diferenca)}</div>
      )}
    </div>
  );
}

// --- comparação anual dos balanços (Sprint 25D) ---
/**
 * Pergunta gerencial: **"o patrimônio melhorou ou piorou, e em quê?"** Um balanço
 * isolado não responde; a mesma conta em quatro exercícios, sim.
 */
function ComparacaoAnual({ cod, enteNome }: { cod: string; enteNome: string }) {
  const [tipo, setTipo] = useState('patrimonial');
  const cmp = useResource(() => fetchBalancoComparacao(cod, { tipo, anos: 4 }), [cod, tipo]);
  return (
    <Card pad={0}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 8px' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Comparação anual dos balanços</div>
          <div style={{ fontSize: 11, color: colors.muted }}>
            exercício sem a conta fica vazio — não é zero
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, padding: '0 16px 10px', flexWrap: 'wrap' }}>
        {TIPOS.map((t) => (
          <button key={t.tipo} type="button" onClick={() => setTipo(t.tipo)} style={monthPill(tipo === t.tipo)}>
            {t.rotulo}
          </button>
        ))}
      </div>
      <Async
        res={cmp}
        skeleton={<Skeleton linhas={5} />}
        vazio={{
          quando: (c) => c.linhas.length === 0,
          render: <div style={{ padding: 16, fontSize: 11.5, color: colors.muted }}>Sem exercícios com este balanço.</div>,
        }}
      >
        {(c) => {
          const principais = c.linhas.filter((l) => (l.nivel ?? 1) <= 2).slice(0, 40);
          return (
            <div>
              <div style={{ padding: '0 16px 8px', display: 'flex', justifyContent: 'flex-end' }}>
                <ExportButton
                  nome={`Comparacao ${tipo}`}
                  linhas={c.linhas}
                  colunas={[
                    { cabecalho: 'cod_conta', valor: (l) => l.cod_conta },
                    { cabecalho: 'descricao', valor: (l) => l.descricao ?? '' },
                    ...c.anos.map((a) => ({
                      cabecalho: String(a),
                      valor: (l: ComparacaoLinha) => {
                        const v = l.valores[String(a)];
                        return v == null ? '' : Number(v);
                      },
                    })),
                    { cabecalho: 'variacao_abs', valor: (l) => n(l.variacao_abs) },
                    { cabecalho: 'variacao_pct', valor: (l) => n(l.variacao_pct) },
                  ]}
                  contexto={{
                    ente: enteNome,
                    periodo: c.anos.length ? `${c.anos[0]}-${c.anos[c.anos.length - 1]}` : '—',
                    fonte: c.anexo ?? 'DCA',
                  }}
                  modeloRelatorio="patrimonio"
                />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                  <caption className="sr-only">Comparação patrimonial por conta e exercício</caption>
                  <thead>
                    <tr style={{ background: colors.bg }}>
                      <th scope="col" style={{ ...thCmp, textAlign: 'left' }}>Conta</th>
                      {c.anos.map((a) => (
                        <th key={a} scope="col" style={thCmp}>{a}</th>
                      ))}
                      <th scope="col" style={thCmp}>Δ {c.anos[0]}→{c.anos[c.anos.length - 1]}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {principais.map((l) => (
                      <tr key={l.cod_conta} style={{ borderTop: `1px solid ${colors.rowBorder}` }}>
                        <td style={{ padding: '5px 16px', paddingLeft: 16 + Math.max(0, (l.nivel ?? 1) - 1) * 12 }}>
                          <span style={{ fontFamily: font.mono, fontSize: 11, color: colors.faint, marginRight: 6 }}>
                            {l.cod_conta}
                          </span>
                          {l.descricao ?? ''}
                        </td>
                        {c.anos.map((a) => (
                          <td key={a} style={tdCmp}>{M(l.valores[String(a)])}</td>
                        ))}
                        <td style={{ ...tdCmp, color: (n(l.variacao_pct) ?? 0) < 0 ? colors.red : colors.green }}>
                          {l.variacao_pct == null ? '—' : `${fmt(Number(l.variacao_pct), 1)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {c.observacao && (
                <div style={{ padding: '8px 16px', fontSize: 11, color: colors.yellowText }}>{c.observacao}</div>
              )}
              <div style={{ padding: '0 16px 12px' }}>
                <FonteChip source={c.source_refs[0]} nota={`${c.linhas.length} contas · ${c.anos.length} exercícios`} />
              </div>
            </div>
          );
        }}
      </Async>
    </Card>
  );
}

// --- balanços (DCA) ---
function Balancos({ cod, ano, enteNome }: { cod: string; ano: number; enteNome: string }) {
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
            <div style={{ padding: '0 16px 8px', fontSize: 11, color: colors.muted }}>{b.anexo}</div>
            {/* Região rolável precisa receber foco: sem teclado, quem não usa mouse
                não alcança as linhas abaixo do corte. */}
            <div
              tabIndex={0}
              role="region"
              aria-label={`Linhas do ${b.anexo}`}
              style={{ maxHeight: 320, overflowY: 'auto' }}
            >
              {b.linhas.slice(0, 60).map((l, i) => (
                <BalancoRow key={`${l.cod_conta}-${l.coluna}-${i}`} l={l} />
              ))}
            </div>
            <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: colors.faint }}>
                {b.linhas.length} linhas · fonte DCA {b.anexo} v{b.versao_entrega}
              </span>
              <div style={{ marginLeft: 'auto' }}>
                <ExportButton
                  nome={`Balanco ${tipo}`}
                  linhas={b.linhas}
                  colunas={[
                    { cabecalho: 'cod_conta', valor: (l) => l.cod_conta },
                    { cabecalho: 'descricao', valor: (l) => l.descricao ?? '' },
                    { cabecalho: 'coluna', valor: (l) => l.coluna ?? '' },
                    { cabecalho: 'valor', valor: (l) => n(l.valor) },
                    { cabecalho: 'nivel', valor: (l) => l.nivel },
                  ]}
                  contexto={{ ente: enteNome, periodo: String(ano), fonte: `DCA ${b.anexo ?? ''} v${b.versao_entrega}` }}
                  modeloRelatorio="patrimonio"
                />
              </div>
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
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: colors.faint }}>{l.cod_conta}</span>
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
        <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.muted }}>
          este ente não publica MSC — explorando a DCA anual
        </span>
      </div>
      <Async res={bal}>
        {(b) => {
          const roots = b.linhas.filter((l) => (l.nivel ?? 1) <= 4);
          return (
            <div
              tabIndex={0}
              role="region"
              aria-label={`Contas do ${b.anexo}`}
              style={{ maxHeight: 520, overflowY: 'auto' }}
            >
              {roots.map((l, i) => (
                <BalancoRow key={`${l.cod_conta}-${i}`} l={l} />
              ))}
              <div style={{ padding: '8px 16px', fontSize: 11, color: colors.faint }}>
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
      <div style={{ fontSize: 11, color: fg, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: fg, marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

const pillLabel = { fontSize: 11, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontWeight: 700 };
const pill = (active: boolean) => ({
  fontSize: 11.5, padding: '5px 12px', borderRadius: 5, fontWeight: 600, cursor: 'pointer',
  border: `1px solid ${active ? colors.primary : colors.border}`,
  background: active ? colors.primary : colors.surface,
  color: active ? colors.bg : colors.ink,
});
const monthPill = (active: boolean) => ({
  fontSize: 11, padding: '3px 9px', borderRadius: 4, fontWeight: 600, cursor: 'pointer',
  fontFamily: "'JetBrains Mono', monospace",
  border: `1px solid ${active ? colors.primary : colors.border}`,
  background: active ? colors.accentSoft : colors.surface,
  color: active ? colors.primary : colors.muted,
});
const thCmp = {
  padding: '6px 10px', fontSize: 11, color: colors.muted, letterSpacing: '0.06em',
  textTransform: 'uppercase' as const, textAlign: 'right' as const, fontWeight: 700,
};
const tdCmp = {
  padding: '5px 10px', textAlign: 'right' as const, fontFamily: "'JetBrains Mono', monospace",
};
const crumbBar = { display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' as const, padding: '4px 16px 8px', fontSize: 11 };
const crumbBtn = (active: boolean) => ({
  fontSize: 11, padding: '1px 4px', border: 0, background: 'transparent',
  color: active ? colors.ink : colors.primary, fontWeight: active ? 700 : 500, cursor: 'pointer',
});
