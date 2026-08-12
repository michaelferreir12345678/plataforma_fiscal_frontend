import { NotaMetodologica } from '../components/NotaMetodologica';
import { SeloCobertura } from '../components/SeloCobertura';
import { useState, type CSSProperties, type FormEvent } from 'react';
import { colors, font } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { PageHeader } from '../components/PageHeader';
import { SectionLabel } from '../components/SectionLabel';
import { Async, ErrorBox, Loading, Skeleton } from '../components/AsyncState';
import { FonteChip } from '../components/FonteChip';
import { SeloQualidadePagina } from '../components/SeloQualidade';
import { SerieChart } from '../components/SerieChart';
import { ExportButton } from '../components/ExportButton';
import { PrintButton } from '../components/PrintButton';
import { VirtualizedTable } from '../components/VirtualizedTable';
import { useNavigate } from 'react-router-dom';
import { useApp, useResource } from '../context/AppContext';
import { ApiError } from '../services/api';
import {
  fetchBenchmark,
  fetchDivida,
  fetchDividaArvore,
  fetchDividaPvl,
  fetchDividaCapag,
  fetchDividaCronograma,
  fetchDividaMemoria,
  fetchLimites,
  simularOperacaoDivida,
  type CapagHero,
  type CapagMemoria,
  type DclHero,
  type DividaArvore,
  type DividaCronograma,
  type DividaDetalhe,
  type DividaEixo,
  type DividaMemoria,
  type LimiteItem,
  type PosicaoSimulada,
  type SimulacaoOperacao,
  type SimularOperacaoInput,
  type SourceRef,
} from '../services/backend';
import { brl, fmt, pct } from '../utils/format';

type MaybeNumber = number | string | null | undefined;

const numberValue = (value: MaybeNumber): number | null => {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const money = (value: MaybeNumber): string => {
  const parsed = numberValue(value);
  return parsed == null ? '—' : brl(parsed / 1e6);
};

/** Soma duas parcelas na mesma escala de `money` (que apresenta em milhões). */
const moneySum = (a: MaybeNumber, b: MaybeNumber): string => {
  const x = numberValue(a);
  const y = numberValue(b);
  return x == null && y == null ? '—' : money((x ?? 0) + (y ?? 0));
};

const percent = (value: MaybeNumber, decimals = 2): string => {
  const parsed = numberValue(value);
  return parsed == null ? '—' : pct(parsed, decimals);
};

/** Os subindicadores publicados em ``silver.tesouro_capag`` são razões. */
const ratioPercent = (value: MaybeNumber): string => {
  const parsed = numberValue(value);
  if (parsed == null) return '—';
  return pct(parsed * 100, 2);
};

function faixaColor(faixa: string | null | undefined): string {
  const normalized = (faixa ?? '').toLocaleLowerCase('pt-BR');
  if (normalized.includes('exced') || normalized.includes('máxim') || normalized.includes('crit')) return colors.red;
  if (normalized.includes('prud')) return colors.orange;
  if (normalized.includes('alert') || normalized.includes('aten')) return colors.yellowText;
  if (normalized.includes('normal') || normalized.includes('adequ') || normalized.includes('folga')) return colors.green;
  return colors.neutral;
}

function sourceText(source: SourceRef | null | undefined): string {
  if (!source) return 'fonte não informada';
  return [source.relatorio, source.anexo, source.periodo, source.versao_entrega && `v${source.versao_entrega}`]
    .filter(Boolean)
    .join(' · ');
}

export function DividaPage() {
  const { ente, periodo, periodoRgf } = useApp();
  const detalhe = useResource(
    () => fetchDivida(ente.cod_ibge, periodoRgf),
    [ente.cod_ibge, periodoRgf],
    { pular: !periodoRgf },
  );

  return (
    <div
      className="fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      data-screen-label="Detalhe · Dívida"
    >
      <PageHeader
        title="Dívida & Endividamento"
        context={`${ente.nome} · ${periodoRgf || 'sem período selecionado'} · estoque, capacidade de pagamento e cronograma`}
        source={
          detalhe.data
            ? `${sourceText(detalhe.data.dcl.source_ref)} · as_of ${detalhe.data.dcl.as_of}`
            : 'RGF Anexo 2 (DDCL) · SADIPEM · CAPAG/STN'
        }
        breadcrumb={(
          <Breadcrumb
            crumbs={[
              { label: 'Dashboard', to: '/dashboard' },
              { label: 'Análise por bloco' },
              { label: 'Dívida & Endividamento' },
            ]}
          />
        )}
        actions={<PrintButton />}
      />

      <SeloQualidadePagina periodo={periodoRgf} />
      <SeloCobertura pagina="divida" ente={ente.cod_ibge} periodo={periodoRgf} />

      <Async res={detalhe}>
        {(data) => (
          <DividaContent
            key={`${data.cod_ibge}-${data.periodo}-${data.as_of}`}
            detalhe={data}
            periodoRreo={periodo}
          />
        )}
      </Async>
    </div>
  );
}

function DividaContent({
  detalhe,
  periodoRreo,
}: {
  detalhe: DividaDetalhe;
  /** Período RREO (formato bimestre) — é onde `garantias`/`operacoes_credito` são
   * gravados em `gold.mart_indicador` (ver `endividamento.materializar_limites_endividamento`),
   * mesmo sendo apurados a partir do RGF (quadrimestral). */
  periodoRreo: string;
}) {
  const capag = useResource(
    () => fetchDividaCapag(detalhe.cod_ibge, detalhe.periodo, detalhe.capag.as_of),
    [detalhe.cod_ibge, detalhe.periodo, detalhe.capag.as_of],
  );
  const memoria = useResource(
    () => fetchDividaMemoria(detalhe.cod_ibge, detalhe.periodo, detalhe.dcl.as_of),
    [detalhe.cod_ibge, detalhe.periodo, detalhe.dcl.as_of],
  );
  const cronograma = useResource(
    () => fetchDividaCronograma(detalhe.cod_ibge, detalhe.periodo),
    [detalhe.cod_ibge, detalhe.periodo],
  );
  const [eixo, setEixo] = useState<DividaEixo>('origem');
  const [node, setNode] = useState<string | undefined>();
  const arvore = useResource(
    () =>
      fetchDividaArvore(detalhe.cod_ibge, {
        periodo: detalhe.periodo,
        eixo,
        node,
        asOf: eixo === 'origem' ? detalhe.dcl.as_of : undefined,
      }),
    [detalhe.cod_ibge, detalhe.periodo, detalhe.dcl.as_of, eixo, node],
  );

  const changeEixo = (next: DividaEixo) => {
    setNode(undefined);
    setEixo(next);
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 12 }}>
        <DclHeroCard hero={detalhe.dcl} esfera={detalhe.esfera} />
        <Async res={capag}>
          {(data) => <CapagHeroCard hero={data.hero} memoria={data.memoria} />}
        </Async>
      </div>

      {/* Sprint D1: Garantias e Operações de Crédito têm teto legal (22%/16% da RCL
          Ajustada) desde sempre, mas só apareciam dentro do simulador com o gestor
          digitando a base atual à mão. O backend já apura os dois via mart_indicador
          (mesmo dado que /limites lista) — este cartão só busca e mostra. */}
      <PosicaoEndividamentoCard cod={detalhe.cod_ibge} periodo={periodoRreo} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: 12 }}>
        <Async res={memoria}>{(data) => <MemoriaCard data={data} />}</Async>
        <Async res={cronograma}>{(data) => <CronogramaCard data={data} />}</Async>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
        <ArvoreCard
          eixo={eixo}
          node={node}
          data={arvore}
          onEixo={changeEixo}
          onNode={setNode}
        />
        <SerieCard detalhe={detalhe} />
      </div>

      {/* Sprint 25B: coorte, PVL/CDP e exportação */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <FonteChip source={detalhe.dcl.source_ref} asOf={detalhe.as_of} />
        <div style={{ flex: 1 }} />
        <ExportButton
          nome="Dívida — série DCL"
          linhas={detalhe.serie}
          colunas={[
            { cabecalho: 'periodo', valor: (l) => l.periodo },
            { cabecalho: 'dcl', valor: (l) => numberValue(l.dcl) },
            { cabecalho: 'pct_rcl', valor: (l) => numberValue(l.pct_rcl) },
            { cabecalho: 'dc_bruta', valor: (l) => numberValue(l.dc_bruta) },
            { cabecalho: 'dcl_real', valor: (l) => numberValue(l.dcl_real) },
            { cabecalho: 'populacao', valor: (l) => l.populacao },
          ]}
          contexto={{
            ente: detalhe.cod_ibge,
            periodo: detalhe.periodo,
            fonte: sourceText(detalhe.dcl.source_ref),
          }}
          modeloRelatorio="limites"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 12 }}>
        <CoorteCard detalhe={detalhe} />
        <PvlCard cod={detalhe.cod_ibge} />
      </div>

      <SimuladorCard detalhe={detalhe} />
    </>
  );
}

function DclHeroCard({ hero, esfera }: { hero: DclHero; esfera: string | null }) {
  const value = numberValue(hero.pct_rcl);
  const ceiling = numberValue(hero.limite_pct);
  const width = value != null && ceiling && ceiling > 0 ? Math.min(Math.max((value / ceiling) * 100, 0), 100) : 0;
  const color = faixaColor(hero.faixa);

  return (
    <Card accent={color} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={eyebrow}>{hero.rotulo}</div>
        <Badge text={(hero.natureza || 'líquida').toLocaleUpperCase('pt-BR')} color={colors.primary} />
        {hero.faixa && <Badge text={hero.faixa.toLocaleUpperCase('pt-BR')} color={color} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ ...heroValue, color }}>{percent(hero.pct_rcl)}</div>
        <div style={{ fontSize: 11, color: colors.muted }}>da RCL ajustada</div>
      </div>
      <div style={{ fontSize: 12, color: colors.ink }}>
        <strong style={{ fontFamily: font.mono }}>{money(hero.dcl)}</strong>
        <span style={{ color: colors.muted }}> · teto {percent(hero.limite_pct, 0)} · esfera {esfera ?? '—'}</span>
      </div>
      <div
        role="meter"
        aria-label={`${hero.rotulo}: ${percent(value)} da RCL ajustada; teto ${percent(ceiling, 0)}`}
        aria-valuemin={0}
        aria-valuemax={Math.max(ceiling ?? 0, value ?? 0, 1)}
        aria-valuenow={value ?? 0}
        style={{ position: 'relative', height: 12, background: colors.borderSoft, borderRadius: 3 }}
      >
        <div style={{ position: 'absolute', inset: 0, right: 'auto', width: `${width}%`, background: color, borderRadius: 3 }} />
        <div style={{ position: 'absolute', left: '100%', top: -3, bottom: -3, width: 2, background: colors.red }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MiniValue label="Dívida consolidada bruta" value={money(hero.dc_bruta)} />
        <MiniValue label="RCL ajustada" value={money(hero.rcl_ajustada)} />
      </div>
      <Provenance source={hero.source_ref} asOf={hero.as_of} />
    </Card>
  );
}

function CapagHeroCard({ hero, memoria }: { hero: CapagHero; memoria: CapagMemoria }) {
  const notaBase = hero.nota_final?.trim().toUpperCase().charAt(0);
  const noteColor = notaBase === 'A'
    ? colors.green
    : notaBase === 'B'
      ? colors.yellowText
      : notaBase === 'C'
        ? colors.orange
        : notaBase === 'D'
          ? colors.red
          : colors.neutral;
  const indicators = [
    { label: 'Endividamento bruto · DC/RCL', value: percent(hero.endividamento_pct) },
    { label: 'Poupança corrente', value: ratioPercent(hero.ind_poupanca) },
    { label: 'Liquidez relativa', value: numberValue(hero.ind_liquidez) == null ? '—' : fmt(Number(hero.ind_liquidez), 2) },
  ];

  return (
    <Card accent={noteColor} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={eyebrow}>{hero.rotulo}</div>
          {/* Três conceitos distintos que a tela dizia numa palavra só. O exercício da
              classificação, o ano-base dos dados e a data de publicação **não** coincidem:
              a nota de um exercício é apurada sobre as contas do anterior, já encerradas. */}
          <div style={{ fontSize: 11, color: colors.muted }}>
            {hero.natureza} · classificação de <strong>{hero.ano_ref}</strong> · dados de{' '}
            <strong>{hero.ano_ref - 1}</strong>
          </div>
        </div>
        <div style={{ ...heroValue, color: noteColor, fontSize: 44 }}>{hero.nota_final ?? '—'}</div>
      </div>
      <div>
        {indicators.map((indicator) => (
          <div
            key={indicator.label}
            style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: `1px solid ${colors.rowBorder}` }}
          >
            <span style={{ fontSize: 11.5 }}>{indicator.label}</span>
            <strong style={{ fontFamily: font.mono, fontSize: 12 }}>{indicator.value}</strong>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: colors.muted, lineHeight: 1.45 }}>
        {memoria.formula_endividamento}. Base: {memoria.base_numerador} ÷ {memoria.base_denominador}. {memoria.escala}.
        {numberValue(hero.ind_endividamento) != null && ` Índice publicado: ${ratioPercent(hero.ind_endividamento)}.`}
      </div>
      {/* U26: "Metodologia" misturava três grandezas sob um rótulo — ICF (layout
          oficial), versão de metodologia (layout estadual) e o ano-base real da planilha
          (layout municipal histórico, coluna Ano_Base). O backend já separa: quando o
          valor bruto era um ano, ele sai daqui e aparece como "Ano-base da fonte"; o que
          sobra em metodologia_versao é ICF/metodologia de verdade. */}
      {hero.metodologia_versao && (
        <div style={{ fontSize: 11, color: colors.faint }}>
          {hero.metodologia_rotulo ?? 'Metodologia'} {hero.metodologia_versao}
        </div>
      )}
      {hero.ano_base_fonte != null && (
        <div style={{ fontSize: 11, color: hero.ano_base_fonte_diverge ? colors.orange : colors.faint }}>
          Ano-base da fonte {hero.ano_base_fonte}
          {hero.ano_base_fonte_diverge && (
            <> — diverge do ano-base esperado ({hero.ano_ref - 1}) para a classificação de {hero.ano_ref}.</>
          )}
        </div>
      )}
      <NotaMetodologica
        titulo="Por que o ano da nota não é o ano dos dados"
        fundamento="Manual de Demonstrativos Fiscais · Portaria STN da CAPAG · fonte: Tesouro Nacional"
      >
        <p style={{ margin: 0 }}>
          A CAPAG é apurada <strong>uma vez por exercício</strong>, sobre as contas do ano
          anterior já encerradas e homologadas. Três datas diferentes convivem, e confundi-las
          leva a conclusões erradas sobre a situação atual do ente:
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>
            <strong>Exercício da classificação: {hero.ano_ref}</strong> — o ano a que a nota se
            refere.
          </li>
          <li>
            <strong>Ano-base dos dados: {hero.ano_ref - 1}</strong> — o exercício encerrado de
            onde saem endividamento, poupança corrente e liquidez.
          </li>
          <li>
            <strong>Publicação e vigência</strong> — o Tesouro divulga ao longo do exercício
            seguinte ao ano-base; a nota vigora até a próxima apuração.
          </li>
        </ul>
        <p style={{ margin: 0 }}>
          Por isso não existe CAPAG de exercício em curso: enquanto o ano não fecha, não há
          contas encerradas sobre as quais apurá-la. A nota vigente continua sendo a última
          publicada.
        </p>
      </NotaMetodologica>
      {memoria.observacoes.length > 0 && (
        <div style={{ fontSize: 11, color: colors.faint }}>{memoria.observacoes.join(' · ')}</div>
      )}
      <Provenance source={hero.source_ref} asOf={hero.as_of} />
    </Card>
  );
}

function MemoriaCard({ data }: { data: DividaMemoria }) {
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionLabel note="cálculo executado no backend sobre o RGF">Memória rastreável da DCL</SectionLabel>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <caption className="sr-only">Memória de cálculo rastreável da dívida consolidada líquida</caption>
        <tbody>
          {data.componentes.map((item, index) => (
            <tr key={`${item.componente}-${index}`} style={{ borderBottom: `1px dashed ${colors.borderSoft}` }}>
              <td style={{ width: 24, padding: '7px 4px', color: colors.muted, fontFamily: font.mono }}>{item.operador}</td>
              <th scope="row" style={{ padding: '7px 4px', textAlign: 'left', fontWeight: 400 }}>
                <div>{humanize(item.componente)}</div>
                {(item.conta_origem || item.coluna_origem) && (
                  <div style={{ marginTop: 2, fontSize: 11, color: colors.faint, fontFamily: font.mono }}>
                    {[item.conta_origem, item.coluna_origem].filter(Boolean).join(' · ')}
                  </div>
                )}
              </th>
              <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: font.mono }}>{money(item.valor)}</td>
            </tr>
          ))}
          <tr style={{ borderTop: `2px solid ${colors.primary}`, background: colors.accentSoft }}>
            <td style={{ padding: '8px 4px', fontWeight: 700 }}>=</td>
            <th scope="row" style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 700 }}>Dívida Consolidada Líquida</th>
            <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: font.mono, fontWeight: 700, color: colors.primary }}>
              {money(data.dcl)}
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MiniValue label="RCL ajustada" value={money(data.rcl_ajustada)} />
        <MiniValue label="DCL / RCL" value={percent(data.pct_rcl)} />
      </div>
      <div style={formulaBox}>
        <div>{data.formula_dcl}</div>
        <div>{data.formula_pct}</div>
      </div>
      <div style={{ fontSize: 11, color: data.reconciliacao_ok == null ? colors.muted : data.reconciliacao_ok ? colors.green : colors.red }}>
        Reconciliação com o DDCL: {data.reconciliacao_ok == null ? 'sem linha reportada para conferir' : data.reconciliacao_ok ? 'consistente' : 'divergente'}
        {numberValue(data.diferenca_reconciliacao) != null && ` · diferença ${money(data.diferenca_reconciliacao)}`}
      </div>
      <Provenance source={data.source_ref} asOf={data.as_of} />
    </Card>
  );
}

function CronogramaCard({ data }: { data: DividaCronograma }) {
  const maxValue = Math.max(...data.itens.map((item) => numberValue(item.valor) ?? 0), 0);

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionLabel note={`posição ${data.periodo_ref}`}>Cronograma do serviço da dívida · SADIPEM</SectionLabel>
      {data.itens.length === 0 ? (
        <Empty text="Não há vencimentos publicados para este ente e posição." />
      ) : (
        <>
          {/* Empilhado no corte da própria fonte: embaixo o estoque que já existia,
              em cima o que foi contratado depois. Uma barra única respondia "quanto vou
              pagar"; esta responde também "quanto disso eu acabei de assumir". */}
          <Legenda />
          {temResiduo(data) && (
            <div style={{ fontSize: 11, color: colors.muted, lineHeight: 1.5 }}>
              O gráfico mostra os anos que a fonte lista. Há ainda{' '}
              <strong style={{ fontFamily: font.mono, color: colors.ink }}>
                {moneySum(data.restante_amortizacao, data.restante_encargos)}
              </strong>{' '}
              vencendo após {data.horizonte_ate} — o SADIPEM fecha a série com uma linha
              &ldquo;Restante a pagar&rdquo;, sem detalhar os anos.
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 178, paddingTop: 8, overflowX: 'auto' }}>
            {data.itens.map((item) => {
              const total = numberValue(item.valor) ?? 0;
              const estoque = (numberValue(item.dc_amortizacao) ?? 0) + (numberValue(item.dc_encargos) ?? 0);
              const novo = (numberValue(item.oc_amortizacao) ?? 0) + (numberValue(item.oc_encargos) ?? 0);
              const altura = maxValue > 0 ? Math.max((total / maxValue) * 100, 4) : 4;
              const fatia = (parte: number) => (total > 0 ? (parte / total) * 100 : 0);
              return (
                <div
                  key={item.ano}
                  title={
                    `${item.ano}: ${money(item.valor)}
` +
                    `estoque (dívida consolidada) ${moneySum(item.dc_amortizacao, item.dc_encargos)}
` +
                    `contratado (operações) ${moneySum(item.oc_amortizacao, item.oc_encargos)}
` +
                    `amortização ${money(item.principal)} · encargos ${money(item.encargos)}`
                  }
                  style={{ minWidth: 56, flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}
                >
                  <div style={{ fontFamily: font.mono, fontSize: 11, color: colors.muted }}>{money(item.valor)}</div>
                  <div aria-hidden style={{ width: '100%', height: `${altura}%`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 2 }}>
                    {/* 2px de respiro entre os segmentos: sem o vão, duas cores adjacentes
                        leem-se como uma só barra e o corte desaparece. */}
                    {novo > 0 && (
                      <div style={{ height: `${fatia(novo)}%`, background: colors.orange, borderRadius: '3px 3px 0 0' }} />
                    )}
                    <div style={{ height: `${fatia(estoque) || 100}%`, background: colors.primary, borderRadius: novo > 0 ? 0 : '3px 3px 0 0' }} />
                  </div>
                  <div style={{ fontSize: 11, color: colors.muted, fontFamily: font.mono }}>{item.ano}</div>
                </div>
              );
            })}
          </div>
          <table className="sr-only">
            <caption>Cronograma anual do serviço da dívida</caption>
            <thead>
              <tr>
                <th scope="col">Ano</th>
                <th scope="col">Amortização</th>
                <th scope="col">Encargos</th>
                <th scope="col">Dívida consolidada</th>
                <th scope="col">Operações contratadas</th>
                <th scope="col">Total</th>
                <th scope="col">Operações</th>
              </tr>
            </thead>
            <tbody>
              {data.itens.map((item) => (
                <tr key={item.ano}>
                  <th scope="row">{item.ano}</th>
                  <td>{money(item.principal)}</td>
                  <td>{money(item.encargos)}</td>
                  <td>{moneySum(item.dc_amortizacao, item.dc_encargos)}</td>
                  <td>{moneySum(item.oc_amortizacao, item.oc_encargos)}</td>
                  <td>{money(item.valor)}</td>
                  <td>{item.operacoes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            <MiniValue label="Amortização" value={money(data.total_principal)} />
            <MiniValue label="Encargos (inclui juros)" value={money(data.total_encargos)} />
            <MiniValue label="Estoque" value={money(data.total_dc)} />
            <MiniValue label="Contratado" value={money(data.total_oc)} />
          </div>
          {/* O compromisso inteiro, incluindo o que vence além do horizonte publicado.
              A fonte fecha a série com uma linha "Restante a pagar" que era descartada:
              o total exibido ficava menor que a dívida real, e número de dívida para
              menos é o erro que menos denuncia a si mesmo. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
            <MiniValue
              label={data.horizonte_ate ? `Após ${data.horizonte_ate}` : 'Restante a pagar'}
              value={moneySum(data.restante_amortizacao, data.restante_encargos)}
            />
            <MiniValue label="Compromisso total" value={money(data.total_com_residual)} />
          </div>
        </>
      )}
      <Provenance source={data.source_ref} asOf={data.as_of} />
    </Card>
  );
}

function ArvoreCard({
  eixo,
  node,
  data,
  onEixo,
  onNode,
}: {
  eixo: DividaEixo;
  node: string | undefined;
  data: ReturnType<typeof useResource<DividaArvore>>;
  onEixo: (eixo: DividaEixo) => void;
  onNode: (node: string | undefined) => void;
}) {
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <SectionLabel note="clique em um nó para descer">Composição da dívida</SectionLabel>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['origem', 'credor'] as DividaEixo[]).map((item) => (
            <button key={item} type="button" onClick={() => onEixo(item)} style={segmentButton(eixo === item)}>
              {item === 'origem' ? 'Por origem' : 'Por credor'}
            </button>
          ))}
        </div>
      </div>
      <Async res={data}>
        {(tree) => {
          const responseNode = tree.node?.codigo;
          if (tree.eixo !== eixo || responseNode !== node) {
            return <Loading label="Carregando o nível selecionado…" />;
          }
          return (
            <>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5, minHeight: 24 }}>
              <button type="button" onClick={() => onNode(undefined)} style={crumbButton(!node)}>Raiz</button>
              {tree.breadcrumb.map((crumb) => (
                <span key={crumb.codigo} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: colors.faint }}>›</span>
                  <button type="button" onClick={() => onNode(crumb.codigo)} style={crumbButton(crumb.codigo === node)}>
                    {crumb.descricao}
                  </button>
                </span>
              ))}
              {tree.node && !tree.breadcrumb.some((crumb) => crumb.codigo === tree.node?.codigo) && (
                <span style={{ color: colors.ink, fontSize: 11 }}>› {tree.node.descricao}</span>
              )}
            </div>
            {Object.keys(tree.measures).length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '7px 9px', background: colors.surfaceAlt, border: `1px solid ${colors.borderSoft}`, borderRadius: 4 }}>
                <span style={{ fontSize: 11, color: colors.muted }}>Agregado do nó atual</span>
                <MeasureValues measures={tree.measures} />
              </div>
            )}
            {tree.children.length === 0 ? (
              <Empty text="Este nó não possui filhos na posição consultada." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {tree.children.map((child) => (
                  <button
                    key={child.codigo}
                    type="button"
                    disabled={!child.has_children}
                    onClick={() => child.has_children && onNode(child.codigo)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, border: 0, borderBottom: `1px solid ${colors.rowBorder}`, padding: '8px 4px', background: 'transparent', textAlign: 'left', color: colors.ink, cursor: child.has_children ? 'pointer' : 'default' }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{child.descricao}</div>
                      <div style={{ fontSize: 11, color: colors.faint, fontFamily: font.mono }}>{child.codigo}</div>
                    </div>
                    <MeasureValues measures={child.measures} />
                    <span style={{ color: child.has_children ? colors.primary : colors.faint }}>{child.has_children ? '›' : '·'}</span>
                  </button>
                ))}
              </div>
            )}
            <Provenance source={tree.source_ref} asOf={tree.as_of} />
            </>
          );
        }}
      </Async>
    </Card>
  );
}

/**
 * Série multi-exercício da DCL (Sprint 25B). A auditoria (§2.6) apontou que a página
 * mostrava só três quadrimestres: agora vem a série inteira, em nominal, **real** (IPCA)
 * e per capita — dívida que "cresce" só pela inflação não é dívida que cresceu.
 */
function SerieCard({ detalhe }: { detalhe: DividaDetalhe }) {
  const comparisonItem = detalhe.comparacao
    ? detalhe.serie.find((item) => item.periodo === detalhe.comparacao?.periodo_anterior)
    : undefined;

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionLabel note="drill temporal RGF">Evolução da DCL</SectionLabel>
      {detalhe.periodo_breadcrumb.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', fontSize: 11, color: colors.muted }}>
          {detalhe.periodo_breadcrumb.map((period, index) => (
            <span key={period.codigo}>{index > 0 && '› '}{period.descricao}</span>
          ))}
          <span>› {detalhe.periodo}</span>
        </div>
      )}
      {detalhe.serie.length === 0 ? (
        <Empty text="Não há série histórica materializada para esta posição." />
      ) : (
        <SerieChart
          titulo="A dívida cresceu de verdade? · série RGF multi-exercício"
          medida="Dívida consolidada líquida"
          pontos={detalhe.serie.map((item) => ({
            periodo: item.periodo,
            nominal: numberValue(item.dcl),
            real: numberValue(item.dcl_real),
            perCapita: numberValue(item.dcl_per_capita),
            populacao: item.populacao,
          }))}
          ajuste={detalhe.serie_ajuste}
          destaque={detalhe.periodo}
          nota="A DCL é medida contra a RCL: o limite (120% municipal / 200% estadual) é razão, não valor absoluto."
        />
      )}
      {detalhe.comparacao && (
        <div style={{ fontSize: 11, color: colors.muted }}>
          Mesmo período anterior ({detalhe.comparacao.periodo_anterior}): {money(detalhe.comparacao.dcl_anterior)} · variação{' '}
          {money(detalhe.comparacao.variacao_rs)} ({percent(detalhe.comparacao.variacao_pct)})
        </div>
      )}
      <Provenance source={detalhe.dcl.source_ref} asOf={detalhe.dcl.as_of} />
      {comparisonItem && <Provenance source={comparisonItem.source_ref} asOf={comparisonItem.as_of} />}
    </Card>
  );
}

/** Comparação com a coorte (Sprint 13): sou exceção ou regra entre os meus pares? */
function CoorteCard({ detalhe }: { detalhe: DividaDetalhe }) {
  const res = useResource(
    () =>
      fetchBenchmark({
        ente: detalhe.cod_ibge,
        indicador: 'divida_consolidada_liquida',
        periodo: detalhe.periodo,
      }),
    [detalhe.cod_ibge, detalhe.periodo],
  );
  return (
    <Card>
      <SectionLabel note="mesma coorte, mesmo período — nunca média de percentuais">
        Comparação com os pares
      </SectionLabel>
      <Async res={res} skeleton={<Skeleton linhas={4} />}>
        {(b) => (
          <>
            <div style={{ fontSize: 11, color: colors.muted, marginBottom: 8 }}>
              {b.coorte.rotulo} · {b.quantidade} entes com dado em {b.periodo}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div style={{ fontFamily: font.mono, fontSize: 26, fontWeight: 600, color: colors.primary }}>
                {percent(b.ente.valor)}
              </div>
              <div style={{ fontSize: 11, color: colors.muted }}>
                posição {b.ente.posicao} de {b.quantidade} · percentil {percent(b.ente.percentil, 0)}
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, marginTop: 10 }}>
              <caption className="sr-only">Distribuição comparativa do endividamento</caption>
              <tbody>
                {(
                  [
                    ['p10 (menor endividamento)', b.distribuicao.p10],
                    ['mediana da coorte', b.distribuicao.mediana],
                    ['p90 (maior endividamento)', b.distribuicao.p90],
                  ] as [string, MaybeNumber][]
                ).map(([rotulo, valor]) => (
                  <tr key={rotulo} style={{ borderBottom: `1px dashed ${colors.borderSoft}` }}>
                    <th scope="row" style={{ padding: '5px 4px', color: colors.muted, textAlign: 'left', fontWeight: 400 }}>{rotulo}</th>
                    <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: font.mono }}>{percent(valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: colors.muted, marginTop: 8, lineHeight: 1.45 }}>
              Cobertura: {b.cobertura.entes_com_valor} de {b.cobertura.entes_elegiveis} entes da
              coorte têm o indicador neste período — comparar com base incompleta é comparar
              outra coisa.{b.cobertura.amostra_parcial ? ' Amostra parcial.' : ''}
            </div>
            <Provenance source={b.source_ref ?? b.source_refs[0]} asOf={b.as_of} />
          </>
        )}
      </Async>
    </Card>
  );
}

const INDICADORES_ENDIVIDAMENTO: { indicador: string; rotulo: string }[] = [
  { indicador: 'garantias', rotulo: 'Garantias concedidas' },
  { indicador: 'operacoes_credito', rotulo: 'Operações de crédito' },
];

/**
 * Posição vigente de Garantias (teto 22% da RCL Ajustada) e Operações de Crédito
 * (teto 16%) — Sprint D1. Reusa `GET /entes/{cod}/limites`, já materializado e testado
 * (mesmo indicador que o Monitor de Limites lista); esta página só o busca e mostra sem
 * exigir que o gestor abra o simulador e digite a base atual à mão.
 */
function PosicaoEndividamentoCard({ cod, periodo }: { cod: string; periodo: string }) {
  const res = useResource(() => fetchLimites(cod, periodo), [cod, periodo], { pular: !periodo });
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionLabel note="teto legal · % sobre a RCL Ajustada · Res. 43/2001 do Senado">
        Posição vigente de endividamento
      </SectionLabel>
      <Async res={res} skeleton={<Skeleton linhas={2} />}>
        {(d) => {
          const porIndicador = new Map(d.itens.map((it) => [it.indicador, it]));
          return (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {INDICADORES_ENDIVIDAMENTO.map(({ indicador, rotulo }) => (
                  <PosicaoEndividamentoItem
                    key={indicador}
                    rotulo={rotulo}
                    item={porIndicador.get(indicador)}
                  />
                ))}
              </div>
              <Provenance source={d.source_ref} asOf={d.as_of} />
            </>
          );
        }}
      </Async>
    </Card>
  );
}

function PosicaoEndividamentoItem({ rotulo, item }: { rotulo: string; item: LimiteItem | undefined }) {
  if (!item || item.valor_pct_rcl == null) {
    return (
      <div style={{ border: `1px solid ${colors.borderSoft}`, borderRadius: 5, padding: 10 }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 4 }}>{rotulo}</div>
        <div style={{ fontSize: 11.5, color: colors.muted }}>
          Não apurado — o ente ainda não publicou o anexo correspondente para este período.
        </div>
      </div>
    );
  }
  const color = faixaColor(item.faixa);
  const teto = numberValue(item.teto_pct) ?? 0;
  const valor = numberValue(item.valor_pct_rcl) ?? 0;
  const width = teto > 0 ? Math.min(Math.max((valor / teto) * 100, 0), 100) : 0;
  return (
    <div style={{ border: `1px solid ${colors.border}`, borderTop: `3px solid ${color}`, borderRadius: 5, padding: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontSize: 11.5, fontWeight: 600 }}>{rotulo}</div>
        {item.faixa && <Badge text={item.faixa.toLocaleUpperCase('pt-BR')} color={color} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
        <strong style={{ fontFamily: font.mono, fontSize: 22, color }}>{percent(item.valor_pct_rcl)}</strong>
        <span style={{ fontSize: 11, color: colors.muted }}>/ teto {percent(item.teto_pct, 0)}</span>
      </div>
      <div
        role="meter"
        aria-label={`${rotulo}: ${percent(valor)} da RCL Ajustada; teto ${percent(teto, 0)}`}
        aria-valuemin={0}
        aria-valuemax={Math.max(teto, valor, 1)}
        aria-valuenow={valor}
        style={{ height: 7, background: colors.borderSoft, borderRadius: 2, margin: '7px 0' }}
      >
        <div style={{ width: `${width}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <div style={{ fontSize: 11, color: colors.muted }}>
        {money(item.valor_rs)} de {money(item.base_valor)} · distância ao teto{' '}
        {item.distancia_teto != null ? `${percent(item.distancia_teto, 1)} p.p.` : '—'}
      </div>
    </div>
  );
}

/**
 * Legenda do empilhado. Com duas séries, a identidade nunca pode depender só da cor —
 * quem não distingue as duas matizes fica sem saber qual segmento é qual.
 */
/** Há resíduo publicado? Zero e ausência são a mesma coisa aqui: nada a declarar. */
function temResiduo(d: DividaCronograma): boolean {
  const resto = (numberValue(d.restante_amortizacao) ?? 0) + (numberValue(d.restante_encargos) ?? 0);
  return resto > 0;
}

function Legenda() {
  const itens = [
    { cor: colors.primary, texto: 'dívida consolidada (estoque)' },
    { cor: colors.orange, texto: 'operações contratadas (novo)' },
  ];
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: colors.muted }}>
      {itens.map((i) => (
        <span key={i.texto} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span aria-hidden style={{ width: 9, height: 9, borderRadius: 2, background: i.cor }} />
          {i.texto}
        </span>
      ))}
    </div>
  );
}

/** PVL/CDP do SADIPEM: pedidos de verificação de limites (endpoint novo da 25B). */
function PvlCard({ cod }: { cod: string }) {
  const res = useResource(() => fetchDividaPvl(cod), [cod]);
  const navigate = useNavigate();
  return (
    <Card>
      <SectionLabel note="SADIPEM · clique numa linha para a ficha completa">
        Operações em tramitação (PVL/CDP)
      </SectionLabel>
      <Async res={res} skeleton={<Skeleton linhas={3} />}>
        {(p) =>
          p.itens.length === 0 ? (
            <div style={{ fontSize: 11.5, color: colors.muted, lineHeight: 1.5 }}>{p.observacao}</div>
          ) : (
            <>
              {/* Virtualizada: um ente grande tem centenas de pleitos, e a tabela inteira
                  no fluxo da página fazia a rolagem do documento crescer sem fim — o
                  cartão seguinte ficava a uma tela de distância do anterior. Altura fixa
                  devolve a página ao tamanho de uma página. */}
              <VirtualizedTable
                rows={p.itens}
                rowKey={(item, i) => `${item.id_pvl}-${i}`}
                caption="Operações de crédito publicadas no SADIPEM"
                height={p.itens.length > 8 ? 360 : undefined}
                rowHeight={46}
                getRowLabel={(item) =>
                  `${item.tipo_operacao ?? 'operação'} · ${item.finalidade ?? 'sem finalidade'} · ${money(item.valor)}`
                }
                onRowActivate={(item) =>
                  item.id_pvl && navigate(`/divida/operacao/${encodeURIComponent(item.id_pvl)}`)
                }
                columns={[
                  {
                    key: 'operacao',
                    header: 'Operação',
                    render: (item) => (
                      <>
                        {item.tipo_operacao ?? '—'}
                        {/* O número do PVL liga esta linha ao processo no Tesouro: sem
                            ele a operação aparece sem como ser conferida. */}
                        <div style={{ fontSize: 11, color: colors.faint, fontFamily: font.mono }}>
                          {item.num_pvl ?? item.id_pvl ?? ''}
                        </div>
                      </>
                    ),
                  },
                  { key: 'finalidade', header: 'Finalidade', render: (item) => item.finalidade ?? '—' },
                  {
                    key: 'credor',
                    header: 'Credor',
                    render: (item) => (
                      <>
                        {item.credor ?? '—'}
                        {item.tipo_credor && (
                          <div style={{ fontSize: 11, color: colors.faint }}>{item.tipo_credor}</div>
                        )}
                      </>
                    ),
                  },
                  {
                    key: 'valor',
                    header: 'Valor',
                    align: 'right',
                    width: 120,
                    render: (item) => <span style={{ fontFamily: font.mono }}>{money(item.valor)}</span>,
                  },
                  {
                    key: 'situacao',
                    header: 'Situação',
                    render: (item) => (
                      <>
                        {item.status ?? '—'}
                        {item.data_analise && (
                          <div style={{ fontSize: 11, color: colors.faint }}>{item.data_analise}</div>
                        )}
                      </>
                    ),
                  },
                ]}
              />
              <div style={{ fontSize: 11, color: colors.muted, marginTop: 8 }}>
                {p.itens.length} operação(ões) · total pleiteado:{' '}
                <strong style={{ fontFamily: font.mono }}>{money(p.total_valor)}</strong>
              </div>
            </>
          )
        }
      </Async>
    </Card>
  );
}

function SimuladorCard({ detalhe }: { detalhe: DividaDetalhe }) {
  const [valorOperacao, setValorOperacao] = useState('');
  const [valorGarantia, setValorGarantia] = useState('');
  const [valorAro, setValorAro] = useState('');
  const [garantiasAtuais, setGarantiasAtuais] = useState('');
  const [aroAtual, setAroAtual] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimulacaoOperacao | null>(null);

  const parseInput = (value: string): number | undefined => {
    if (!value.trim()) return undefined;
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const operation = parseInput(valorOperacao);
    const guarantee = parseInput(valorGarantia) ?? 0;
    const aro = parseInput(valorAro) ?? 0;
    const currentGuarantees = parseInput(garantiasAtuais);
    const currentAro = parseInput(aroAtual);

    if (operation == null || !Number.isFinite(operation) || operation <= 0) {
      setError('Informe um valor de operação maior que zero.');
      return;
    }
    if ([guarantee, aro, currentGuarantees, currentAro].some((value) => value != null && (!Number.isFinite(value) || value < 0))) {
      setError('Garantias e ARO devem ser valores não negativos.');
      return;
    }

    const body: SimularOperacaoInput = {
      valor_operacao: operation,
      valor_garantia: guarantee,
      valor_aro: aro,
      ...(currentGuarantees != null ? { garantias_atuais: currentGuarantees } : {}),
      ...(currentAro != null ? { aro_atual: currentAro } : {}),
    };

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await simularOperacaoDivida(
        detalhe.cod_ibge,
        detalhe.periodo,
        body,
        detalhe.dcl.as_of,
      );
      setResult(response);
    } catch (cause) {
      if (cause instanceof ApiError) setError(cause.detail || cause.message);
      else setError(cause instanceof Error ? cause.message : 'Não foi possível executar a simulação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SectionLabel note="cenário calculado pelo backend · não altera os fatos fiscais">Simular nova operação</SectionLabel>
      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto', alignItems: 'end', gap: 8 }}>
        <MoneyField label="Nova operação (R$)" value={valorOperacao} onChange={setValorOperacao} required />
        <MoneyField label="Garantia nova (R$)" value={valorGarantia} onChange={setValorGarantia} />
        <MoneyField label="ARO nova (R$)" value={valorAro} onChange={setValorAro} />
        <MoneyField label="Garantias atuais* (R$)" value={garantiasAtuais} onChange={setGarantiasAtuais} />
        <MoneyField label="ARO atual* (R$)" value={aroAtual} onChange={setAroAtual} />
        <button type="submit" disabled={loading} style={primaryButton}>
          {loading ? 'Calculando…' : 'Simular'}
        </button>
      </form>
      <div style={{ fontSize: 11, color: colors.faint }}>
        * Bases atuais opcionais; informe apenas quando não constarem da posição fiscal disponível.
      </div>
      {loading && <Loading label="Calculando impacto com a posição fiscal auditada…" />}
      {error && <ErrorBox message={error} />}
      {result && <SimulacaoResultado data={result} />}
    </Card>
  );
}

function SimulacaoResultado({ data }: { data: SimulacaoOperacao }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>Impacto projetado</div>
        <Badge text={data.persistido ? 'PERSISTIDO' : 'NÃO PERSISTIDO'} color={data.persistido ? colors.red : colors.green} />
        <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.muted }}>RCL base {money(data.rcl_ajustada)}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {data.posicoes.map((position) => <PosicaoCard key={position.indicador} position={position} />)}
      </div>
      {Object.keys(data.memoria).length > 0 && (
        <div style={formulaBox}>
          {Object.entries(data.memoria).map(([key, value]) => (
            <div key={key}>
              <strong>{humanize(key)}:</strong> {formatMemoryValue(key, value)}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {data.source_refs.map((source, index) => (
          <Provenance key={`${source.relatorio}-${index}`} source={source} asOf={data.as_of} />
        ))}
      </div>
    </div>
  );
}

function PosicaoCard({ position }: { position: PosicaoSimulada }) {
  const ceiling = numberValue(position.teto_pct) ?? 0;
  const projected = numberValue(position.pct_projetado);
  const width = projected != null && ceiling > 0 ? Math.min(Math.max((projected / ceiling) * 100, 0), 100) : 0;
  const color = faixaColor(position.faixa_projetada);

  return (
    <div style={{ border: `1px solid ${colors.border}`, borderTop: `3px solid ${color}`, borderRadius: 5, padding: 10 }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, minHeight: 30 }}>{position.rotulo}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <strong style={{ fontFamily: font.mono, fontSize: 20, color }}>{percent(position.pct_projetado)}</strong>
        <span style={{ fontSize: 11, color: colors.muted }}>/ {percent(position.teto_pct, 0)}</span>
      </div>
      <div
        role="meter"
        aria-label={`${position.rotulo}: projeção ${percent(projected)}; teto ${percent(ceiling, 0)}`}
        aria-valuemin={0}
        aria-valuemax={Math.max(ceiling, projected ?? 0, 1)}
        aria-valuenow={projected ?? 0}
        style={{ height: 7, background: colors.borderSoft, borderRadius: 2, margin: '7px 0' }}
      >
        <div style={{ width: `${width}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <div style={{ fontSize: 11, color: colors.muted, lineHeight: 1.45 }}>
        {position.posicao_atual_conhecida ? `Atual ${percent(position.pct_atual)} · ` : 'Posição atual não disponível · '}
        incremento {money(position.incremento)} · projetado {money(position.valor_projetado)}
      </div>
      {position.faixa_projetada && <div style={{ fontSize: 11, color, marginTop: 4 }}>Faixa: {position.faixa_projetada}</div>}
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: colors.muted }}>{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        style={inputStyle}
      />
    </label>
  );
}

function MeasureValues({ measures }: { measures: Record<string, number | null> }) {
  const values = Object.entries(measures);
  if (values.length === 0) return <span style={{ fontSize: 11, color: colors.faint }}>sem medida</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      {values.map(([key, value]) => (
        <span key={key} style={{ fontFamily: font.mono, fontSize: 11 }}>
          <span style={{ color: colors.faint }}>{humanize(key)} </span>{formatMeasure(key, value)}
        </span>
      ))}
    </div>
  );
}

function MiniValue({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: `1px solid ${colors.borderSoft}`, borderRadius: 4, padding: '7px 8px' }}>
      <div style={{ fontSize: 11, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontFamily: font.mono, fontSize: 11.5, fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{ fontSize: 11, padding: '2px 6px', border: `1px solid ${color}`, color, borderRadius: 3, fontWeight: 700, letterSpacing: '0.04em' }}>
      {text}
    </span>
  );
}

function Provenance({ source, asOf }: { source: SourceRef | null | undefined; asOf: string | null | undefined }) {
  return (
    <div style={{ fontSize: 11, color: colors.faint, fontFamily: font.mono, lineHeight: 1.45 }}>
      fonte: {sourceText(source)} · as_of {asOf ?? '—'}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ padding: '18px 10px', textAlign: 'center', color: colors.muted, fontSize: 11 }}>{text}</div>;
}

function formatMeasure(key: string, value: MaybeNumber): string {
  if (key.includes('pct') || key.includes('percent')) return percent(value);
  if (key.includes('quant') || key.includes('operac') || key.includes('count')) {
    const parsed = numberValue(value);
    return parsed == null ? '—' : fmt(parsed, 0);
  }
  return money(value);
}

function formatMemoryValue(key: string, value: string | number | boolean | null): string {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'sim' : 'não';
  if (typeof value === 'number') return formatMeasure(key, value);
  return value;
}

function humanize(value: string): string {
  return value.replace(/_/g, ' ').replace(/^./, (letter: string) => letter.toLocaleUpperCase('pt-BR'));
}

const eyebrow: CSSProperties = {
  fontSize: 11,
  color: colors.faint,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  fontWeight: 600,
};

const heroValue: CSSProperties = {
  fontFamily: font.mono,
  fontSize: 38,
  fontWeight: 600,
  letterSpacing: '-0.03em',
};

const formulaBox: CSSProperties = {
  padding: '8px 10px',
  border: `1px dashed ${colors.border}`,
  background: colors.surfaceAlt,
  borderRadius: 4,
  color: colors.muted,
  fontFamily: font.mono,
  fontSize: 11,
  lineHeight: 1.5,
};

const inputStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  padding: '8px 9px',
  border: `1px solid ${colors.border}`,
  borderRadius: 4,
  background: colors.bg,
  color: colors.ink,
  fontFamily: font.mono,
  fontSize: 11,
};

const primaryButton: CSSProperties = {
  padding: '9px 14px',
  border: 0,
  borderRadius: 4,
  background: colors.primary,
  color: '#fff',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
};

const segmentButton = (active: boolean): CSSProperties => ({
  border: `1px solid ${active ? colors.primary : colors.border}`,
  background: active ? colors.accentSoft : colors.surface,
  color: active ? colors.primary : colors.muted,
  borderRadius: 3,
  padding: '5px 8px',
  fontSize: 11,
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
});

const crumbButton = (active: boolean): CSSProperties => ({
  border: 0,
  background: 'transparent',
  padding: 0,
  color: active ? colors.primary : colors.muted,
  fontSize: 11,
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
});
