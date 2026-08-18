/**
 * Saúde & Educação — mínimos constitucionais (Módulo 10).
 *
 * A Sprint 25C fecha a lista de faltas da auditoria (§2.9) e entrega o aceite: **uma
 * tela** em que o gestor lê, sem navegar, as sete respostas:
 *
 *  1. Quanto apliquei? .................... `pct_aplicado` no herói
 *  2. Qual é o piso e quanto falta/sobra? . medidor + folga em p.p. e em R$
 *  3. Vou fechar o ano cumprindo? ......... projeção (Sprint 11) + selo de risco
 *  4. Como foi nos exercícios anteriores? . série plurianual (`/serie`, 5 anos)
 *  5. Estou no caminho dentro deste ano? .. trajetória bimestre a bimestre
 *  6. Como estou perante meus pares? ...... coorte (benchmark ASPS/MDE, novos no mart)
 *  7. O que dizem SIOPS/SIOPE? ............ enriquecimento com selo de defasagem
 *
 * mais: composição por subfunção/fonte (árvore), memória de cálculo em diálogo (antes
 * inline) e exportação. Regras transversais da Sprint 25: nada de média de percentual,
 * comparação só quando a base existe, e a ausência aparece como ausência.
 *
 * A base destes percentuais **não é a RCL** — é a receita de impostos e transferências
 * (e, no FUNDEB, as receitas do fundo). A tela repete isso onde o número aparece.
 */
import { SeloCobertura } from '../components/SeloCobertura';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { colors, font } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { PageHeader } from '../components/PageHeader';
import { MetricHeader } from '../components/MetricHeader';
import { ExplicacaoIndicador } from '../components/ExplicacaoIndicador';
import { SectionLabel } from '../components/SectionLabel';
import { Async, Skeleton } from '../components/AsyncState';
import { FonteChip } from '../components/FonteChip';
import { SeloQualidadePagina } from '../components/SeloQualidade';
import { MemoriaDialog, LinhaMemoria } from '../components/MemoriaDialog';
import { SerieChart } from '../components/SerieChart';
import { ExportButton } from '../components/ExportButton';
import { PrintButton } from '../components/PrintButton';
import { ArvoreDrill } from '../components/ArvoreDrill';
import { AccessibleTabs, tabId, tabPanelId } from '../components/AccessibleTabs';
import {
  useApp,
  useResource,
  type Resource,
} from '../context/AppContext';
import { useContextoTelaAssistente } from '../utils/contextoAssistente';
import {
  fetchBenchmark,
  fetchEducacao,
  fetchEducacaoArvore,
  fetchEducacaoDetalhamentoSiope,
  fetchEducacaoMemoria,
  fetchEducacaoSerie,
  fetchMinimosProjecao,
  fetchSaude,
  fetchSaudeArvore,
  fetchSaudeDetalhamentoSiops,
  fetchSaudeMemoria,
  fetchSaudeSerie,
  type EducacaoDetalhe,
  type EnriquecimentoDetalhe,
  type EnriquecimentoItem,
  type FiscalDecimal,
  type FundebMinimo,
  type MemoriaCalculo,
  type MinimoDetalheBase,
  type MinimosProjecao,
  type SaudeDetalhe,
  type SerieMinimoDetalhe,
  type SerieMinimoResposta,
  type SourceRef,
} from '../services/backend';
import { brl, fmt, pct } from '../utils/format';

type Aba = 'saude' | 'educacao';

/** Coorte com pouquíssimos entes não é comparação — é coincidência. */
const MINIMO_PARES_PARA_COMPARAR = 3;

const n = (v: FiscalDecimal | null | undefined): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};
const M = (v: FiscalDecimal | null | undefined): string => {
  const x = n(v);
  return x === null ? '—' : brl(x / 1e6);
};
const P = (v: FiscalDecimal | null | undefined, casas = 2): string => {
  const x = n(v);
  return x === null ? '—' : pct(x, casas);
};

// "saude"/"educacao" não existem em reports/models.py::MODELOS — o link "relatório
// completo" caía sempre em "Resumo Executivo" sem avisar (Sprint D1). O modelo certo é
// "limites": suas seções já incluem "saude" e "educacao" (Relatório de Limites Legais —
// Controladoria/TCE/TCM), diferente de "executivo"/"patrimonio"/"tecnico", que não têm
// seção nenhuma para os mínimos constitucionais desta página.
const CONFIG = {
  saude: {
    titulo: 'Saúde · Ações e Serviços Públicos de Saúde',
    curto: 'ASPS',
    norma: 'CF art. 198 · LC 141/2012 art. 25',
    indicadorBenchmark: 'saude_minimo',
    modeloRelatorio: 'limites',
  },
  educacao: {
    titulo: 'Educação · Manutenção e Desenvolvimento do Ensino',
    curto: 'MDE',
    norma: 'CF art. 212 · Lei 14.113/2020',
    indicadorBenchmark: 'educacao_mde',
    modeloRelatorio: 'limites',
  },
} as const;

export function SaudeEducacaoPage() {
  const [tab, setTab] = useState<Aba>('saude');
  const { ente, periodo } = useApp();
  const saude = useResource(() => fetchSaude(ente.cod_ibge, periodo), [ente.cod_ibge, periodo]);
  const educacao = useResource(
    () => fetchEducacao(ente.cod_ibge, periodo),
    [ente.cod_ibge, periodo],
  );
  const projecao = useResource(
    () => fetchMinimosProjecao(ente.cod_ibge, periodo),
    [ente.cod_ibge, periodo],
  );
  const detalhe = tab === 'saude' ? saude.data : educacao.data;
  const contextoDetalhe = detalhe?.cod_ibge === ente.cod_ibge && detalhe.periodo === periodo
    ? detalhe
    : null;
  useContextoTelaAssistente({
    pagina: '/saude-educacao',
    ente: contextoDetalhe?.cod_ibge ?? ente.cod_ibge,
    periodo: contextoDetalhe?.periodo ?? (periodo || null),
    competencia: contextoDetalhe?.periodo ?? (periodo || null),
    asOf: contextoDetalhe?.as_of ?? null,
  });

  return (
    <div
      className="fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      data-screen-label="Detalhe · Saúde e Educação"
    >
      <PageHeader
        title="Saúde & Educação"
        context={`${ente.nome} · ${periodo || 'sem período selecionado'} · mínimos constitucionais e projeções`}
        source={
          detalhe
            ? `${detalhe.source_ref.relatorio} ${detalhe.source_ref.anexo ?? ''} · ${detalhe.periodo}`
            : 'fonte primária: RREO · SICONFI'
        }
        breadcrumb={(
          <Breadcrumb
            crumbs={[
              { label: 'Dashboard', to: '/dashboard' },
              { label: 'Análise por bloco' },
              { label: 'Saúde & Educação' },
            ]}
          />
        )}
        actions={<PrintButton />}
      />

      <SeloQualidadePagina />
      <SeloCobertura pagina="saude-educacao" ente={ente.cod_ibge} periodo={periodo} />

      <AccessibleTabs
        tabs={[
          { id: 'saude', label: 'Saúde · ASPS' },
          { id: 'educacao', label: 'Educação · MDE/FUNDEB' },
        ]}
        value={tab}
        onChange={setTab}
        label="Mínimos constitucionais"
        idPrefix="minimos"
        style={{ alignSelf: 'flex-start' }}
      />

      <div
        id={tabPanelId('minimos', tab)}
        role="tabpanel"
        aria-labelledby={tabId('minimos', tab)}
        tabIndex={0}
      >
        {tab === 'saude' ? (
          <Async res={saude} skeleton={<Skeleton linhas={8} />}>
            {(data) => <PainelSaude key={`${data.cod_ibge}-${data.periodo}`} detalhe={data} projecao={projecao} />}
          </Async>
        ) : (
          <Async res={educacao} skeleton={<Skeleton linhas={8} />}>
            {(data) => <PainelEducacao key={`${data.cod_ibge}-${data.periodo}`} detalhe={data} projecao={projecao} />}
          </Async>
        )}
      </div>
    </div>
  );
}

function PainelSaude({ detalhe, projecao }: { detalhe: SaudeDetalhe; projecao: Resource<MinimosProjecao> }) {
  const serie = useResource(
    () => fetchSaudeSerie(detalhe.cod_ibge, { periodo: detalhe.periodo, anos: 5 }),
    [detalhe.cod_ibge, detalhe.periodo],
  );
  const enriquecimento = useResource(
    () => fetchSaudeDetalhamentoSiops(detalhe.cod_ibge, detalhe.periodo),
    [detalhe.cod_ibge, detalhe.periodo],
  );
  return (
    <Painel
      dominio="saude"
      detalhe={detalhe}
      projecao={projecao}
      serie={serie}
      enriquecimento={enriquecimento}
      tituloEnriquecimento="Detalhamento SIOPS"
      tituloArvore="Composição por subfunção de saúde"
      carregarArvore={(node) =>
        fetchSaudeArvore(detalhe.cod_ibge, { periodo: detalhe.periodo, node: node ?? undefined })
      }
      carregarMemoria={() => fetchSaudeMemoria(detalhe.cod_ibge, detalhe.periodo)}
    />
  );
}

function PainelEducacao({
  detalhe,
  projecao,
}: {
  detalhe: EducacaoDetalhe;
  projecao: Resource<MinimosProjecao>;
}) {
  const serie = useResource(
    () => fetchEducacaoSerie(detalhe.cod_ibge, { periodo: detalhe.periodo, anos: 5 }),
    [detalhe.cod_ibge, detalhe.periodo],
  );
  const enriquecimento = useResource(
    () => fetchEducacaoDetalhamentoSiope(detalhe.cod_ibge, detalhe.periodo),
    [detalhe.cod_ibge, detalhe.periodo],
  );
  return (
    <Painel
      dominio="educacao"
      detalhe={detalhe}
      projecao={projecao}
      serie={serie}
      enriquecimento={enriquecimento}
      fundeb={detalhe.fundeb}
      tituloEnriquecimento="Detalhamento SIOPE · FNDE"
      tituloArvore="Composição · impostos × FUNDEB"
      carregarArvore={(node) =>
        fetchEducacaoArvore(detalhe.cod_ibge, { periodo: detalhe.periodo, node: node ?? undefined })
      }
      carregarMemoria={() => fetchEducacaoMemoria(detalhe.cod_ibge, detalhe.periodo)}
    />
  );
}

interface PainelProps {
  dominio: Aba;
  detalhe: MinimoDetalheBase;
  projecao: Resource<MinimosProjecao>;
  serie: Resource<SerieMinimoResposta>;
  enriquecimento: Resource<EnriquecimentoDetalhe>;
  fundeb?: FundebMinimo;
  tituloEnriquecimento: string;
  tituloArvore: string;
  carregarArvore: (node: string | null) => Promise<import('../services/backend').DrillEnvelope>;
  carregarMemoria: () => Promise<MemoriaCalculo>;
}

function Painel({
  dominio,
  detalhe,
  projecao,
  serie,
  enriquecimento,
  fundeb,
  tituloEnriquecimento,
  tituloArvore,
  carregarArvore,
  carregarMemoria,
}: PainelProps) {
  const cfg = CONFIG[dominio];
  const { ente } = useApp();
  const aplicado = n(detalhe.pct_aplicado);
  const piso = n(detalhe.minimo_pct) ?? 0;
  const cor = detalhe.abaixo_do_minimo ? colors.red : colors.green;
  const folgaPp = aplicado === null ? null : aplicado - piso;

  return (
    <>
      <MetricHeader
        label={`% aplicado · ${cfg.titulo} · ${detalhe.periodo}`}
        explicar={<ExplicacaoIndicador indicador={cfg.indicadorBenchmark} rotulo={cfg.titulo} periodo={detalhe.periodo} asOf={detalhe.as_of} />}
        value={<span data-testid="pct-aplicado">{P(detalhe.pct_aplicado)}</span>}
        valueColor={cor}
        badge={<SeloPiso abaixo={detalhe.abaixo_do_minimo} />}
        context={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span>
              Base de impostos + transferências {M(detalhe.base_impostos_transferencias)} · aplicado
              válido {M(detalhe.despesa_aplicada)} · esfera {detalhe.esfera ?? '—'}
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <MemoriaMinimoDialog
                titulo={`Memória de cálculo · ${cfg.curto}`}
                subtitulo={`${detalhe.periodo} · ${cfg.norma}`}
                carregar={carregarMemoria}
                deps={[detalhe.cod_ibge, detalhe.periodo, dominio]}
              />
              <ExportButton
                nome={`Mínimo ${cfg.curto}`}
                linhas={[detalhe]}
                colunas={[
                  { cabecalho: 'periodo', valor: (l) => l.periodo },
                  { cabecalho: 'base_impostos_transferencias', valor: (l) => n(l.base_impostos_transferencias) },
                  { cabecalho: 'despesa_bruta', valor: (l) => n(l.despesa_bruta) },
                  { cabecalho: 'deducoes', valor: (l) => n(l.deducoes_outras) },
                  { cabecalho: 'rpnp_sem_lastro', valor: (l) => n(l.rpnp_sem_lastro) },
                  { cabecalho: 'despesa_aplicada', valor: (l) => n(l.despesa_aplicada) },
                  { cabecalho: 'pct_aplicado', valor: (l) => n(l.pct_aplicado) },
                  { cabecalho: 'minimo_pct', valor: (l) => n(l.minimo_pct) },
                  { cabecalho: 'cumpre_o_piso', valor: (l) => (l.abaixo_do_minimo ? 'nao' : 'sim') },
                ]}
                contexto={{
                  ente: ente.nome,
                  periodo: detalhe.periodo,
                  fonte: `${detalhe.source_ref.relatorio} ${detalhe.source_ref.anexo ?? ''} v${detalhe.source_ref.versao_entrega ?? '—'}`,
                }}
                modeloRelatorio={cfg.modeloRelatorio}
              />
            </div>
            <FonteChip
              source={detalhe.source_ref}
              asOf={detalhe.as_of}
              nota="base = impostos e transferências (não é RCL)"
            />
          </div>
        }
        right={<MedidorPiso detalhe={detalhe} norma={cfg.norma} folgaPp={folgaPp} />}
      />

      {fundeb && <CardFundeb fundeb={fundeb} fonteFallback={detalhe.source_ref} asOfFallback={detalhe.as_of} />}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <CardProjecao dominio={dominio} detalhe={detalhe} resource={projecao} />
        <CardCoorte
          indicador={cfg.indicadorBenchmark}
          rotulo={cfg.curto}
          cod={detalhe.cod_ibge}
          periodo={detalhe.periodo}
        />
      </div>

      <Card>
        <SectionLabel note="um ponto por exercício — bimestres de anos diferentes não se comparam">
          Série plurianual do mínimo
        </SectionLabel>
        <Async res={serie} skeleton={<Skeleton linhas={5} />}>
          {(s) => <BlocoSerie serie={s} rotulo={cfg.curto} enteNome={ente.nome} periodo={detalhe.periodo} />}
        </Async>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 12 }}>
        <Card>
          <SectionLabel note="drill-down auditável">{tituloArvore}</SectionLabel>
          <ArvoreDrill
            carregar={carregarArvore}
            deps={[detalhe.cod_ibge, detalhe.periodo, dominio]}
            rotuloRaiz={dominio === 'saude' ? 'Função 10 · Saúde' : 'MDE'}
            colunas={[
              { chave: 'valor_computado', rotulo: 'Computado (válido)', barra: true },
              { chave: 'empenhado', rotulo: 'Empenhado' },
              { chave: 'liquidado', rotulo: 'Liquidado' },
              { chave: 'pago', rotulo: 'Pago' },
              { chave: 'despesa_aplicada', rotulo: 'Aplicado' },
              // A diferença entre as duas colunas **é** a regra do art. 25 da LC 141/2012:
              // o bruto inclui os restos a pagar não processados sem disponibilidade de
              // caixa; o válido os expurga. Sob o mesmo cabeçalho, uma parecia erro de
              // renderização — ou pior, servia para defender o cumprimento no TCE com o
              // número que não vale.
              { chave: 'valor_computado_bruto', rotulo: 'Bruto (antes do expurgo de RP sem lastro)' },
            ]}
            vazio={<Vazio texto="Sem detalhamento por subfunção nesta entrega." />}
          />
        </Card>
        <CardEnriquecimento titulo={tituloEnriquecimento} resource={enriquecimento} />
      </div>
    </>
  );
}

/** Pergunta 2: qual é o piso e quanto falta/sobra — em pontos percentuais e em reais. */
function MedidorPiso({
  detalhe,
  norma,
  folgaPp,
}: {
  detalhe: MinimoDetalheBase;
  norma: string;
  folgaPp: number | null;
}) {
  const aplicado = n(detalhe.pct_aplicado);
  const piso = n(detalhe.minimo_pct) ?? 0;
  const projetado = n(detalhe.projecao_pct);
  const max = Math.max(piso * 1.6, aplicado ?? 0, projetado ?? 0, 1) * 1.05;
  const esquerdaPiso = Math.min(100, (piso / max) * 100);
  const largura = Math.min(100, Math.max(0, ((aplicado ?? 0) / max) * 100));
  const cor = detalhe.abaixo_do_minimo ? colors.red : colors.green;
  const folgaReais = n(detalhe.folga);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <div>
          <div style={eyebrow}>Piso constitucional · semântica de mínimo</div>
          <div style={{ fontSize: 11, color: colors.faint, marginTop: 3 }}>
            mínimo {P(detalhe.minimo_pct, 0)} · {norma}
          </div>
        </div>
        <div style={{ color: cor, fontFamily: font.mono, fontSize: 11, fontWeight: 600, textAlign: 'right' }}>
          {folgaPp === null ? (
            'Folga não disponível'
          ) : (
            <>
              {folgaPp >= 0 ? 'Folga' : 'Faltam'} {fmt(Math.abs(folgaPp), 2)} p.p.
              <div style={{ fontSize: 11, color: colors.muted, fontWeight: 400 }}>
                {folgaReais === null ? '' : `${folgaReais >= 0 ? 'sobra' : 'faltam'} ${M(Math.abs(folgaReais))}`}
              </div>
            </>
          )}
        </div>
      </div>
      <div
        role="meter"
        aria-label={`Aplicação de ${P(aplicado)}; piso constitucional de ${P(piso)}`}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={aplicado ?? 0}
        style={{ position: 'relative', height: 18, background: colors.borderSoft, borderRadius: 4 }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${esquerdaPiso}%`,
            background: 'repeating-linear-gradient(45deg, #FBDBDB, #FBDBDB 5px, #F5CBCB 5px, #F5CBCB 10px)',
            borderRadius: '4px 0 0 4px',
          }}
        />
        <div style={{ position: 'absolute', inset: 0, width: `${largura}%`, background: cor, opacity: 0.82, borderRadius: 4 }} />
        <div style={{ position: 'absolute', left: `${esquerdaPiso}%`, top: -6, bottom: -6, width: 2, background: colors.primaryDeep }} />
        <div style={{ position: 'absolute', left: `${esquerdaPiso}%`, top: -18, transform: 'translateX(-50%)', ...marcador }}>
          piso {P(detalhe.minimo_pct, 0)}
        </div>
      </div>
      <div style={{ marginTop: 24, fontSize: 11, color: colors.muted }}>
        A base é a receita de impostos e transferências constitucionais — não é RCL.
      </div>
    </div>
  );
}

/** Pergunta 3: vou fechar o exercício cumprindo? (projeção da Sprint 11 + risco) */
function CardProjecao({
  dominio,
  detalhe,
  resource,
}: {
  dominio: Aba;
  detalhe: MinimoDetalheBase;
  resource: Resource<MinimosProjecao>;
}) {
  return (
    <Card>
      <SectionLabel note="projeção não é apuração — o mínimo fecha no 6º bimestre">
        Risco de descumprimento no fechamento
      </SectionLabel>
      <Async res={resource} skeleton={<Skeleton linhas={4} />}>
        {(data) => {
          const item = data[dominio];
          const projetado = n(item.pct_projetado);
          const abaixo = item.abaixo_do_minimo_projetado;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={eyebrow}>Percentual projetado</div>
                  <div
                    data-testid="pct-projetado"
                    style={{ fontFamily: font.mono, fontSize: 28, fontWeight: 600, color: abaixo ? colors.red : colors.primary }}
                  >
                    {projetado === null ? '—' : pct(projetado)}
                  </div>
                </div>
                <SeloPiso abaixo={abaixo} projetado />
              </div>
              {abaixo && (
                <div style={avisoRisco}>
                  Trajetória abaixo do piso de {P(item.minimo_pct, 0)}. O monitor de alertas
                  registra este mesmo risco em <strong>/alertas</strong> enquanto o exercício não fecha —
                  no 6º bimestre ele deixa de ser risco e passa a ser descumprimento apurado.
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <MiniValor rotulo="Aplicado projetado" valor={M(item.valor_aplicado_projetado)} />
                <MiniValor rotulo="Mínimo projetado" valor={M(item.valor_minimo_projetado)} />
              </div>
              <div style={{ fontSize: 11, color: colors.muted, lineHeight: 1.45 }}>{item.metodo}</div>
              <FonteChip source={item.source_ref} asOf={item.as_of} nota={`acumulado até ${detalhe.periodo}`} />
            </div>
          );
        }}
      </Async>
    </Card>
  );
}

/** Pergunta 6: como estou perante meus pares? (benchmark — indicador novo no mart) */
function CardCoorte({
  indicador,
  rotulo,
  cod,
  periodo,
}: {
  indicador: string;
  rotulo: string;
  cod: string;
  periodo: string;
}) {
  const res = useResource(
    () => fetchBenchmark({ ente: cod, indicador, periodo }),
    [cod, indicador, periodo],
  );
  return (
    <Card>
      <SectionLabel note="mesma coorte, mesmo período — nunca média de percentuais">
        Posição na coorte · {rotulo}
      </SectionLabel>
      <Async
        res={res}
        skeleton={<Skeleton linhas={4} />}
        vazio={{
          quando: (b) => b.cobertura.entes_elegiveis === 0,
          render: <Vazio texto="Sem coorte comparável para este ente e período." />,
        }}
      >
        {(b) => {
          const comparavel = b.cobertura.entes_com_valor >= MINIMO_PARES_PARA_COMPARAR;
          return (
            <>
              <div style={{ fontSize: 11, color: colors.muted, marginBottom: 8 }}>
                {b.coorte.rotulo} · {b.cobertura.entes_com_valor} de {b.cobertura.entes_elegiveis} entes
                publicaram o indicador em {b.periodo}
              </div>
              {comparavel ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <div style={{ fontFamily: font.mono, fontSize: 26, fontWeight: 600, color: colors.primary }}>
                      {P(b.ente.valor)}
                    </div>
                    <div style={{ fontSize: 11, color: colors.muted }}>
                      posição {b.ente.posicao} de {b.quantidade} · percentil {P(b.ente.percentil, 0)}
                    </div>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, marginTop: 10 }}>
                    <caption className="sr-only">Distribuição comparativa da aplicação constitucional</caption>
                    <tbody>
                      {(
                        [
                          ['p10 (menor aplicação)', b.distribuicao.p10],
                          ['mediana da coorte', b.distribuicao.mediana],
                          ['p90 (maior aplicação)', b.distribuicao.p90],
                        ] as [string, FiscalDecimal][]
                      ).map(([r, v]) => (
                        <tr key={r} style={{ borderBottom: `1px dashed ${colors.borderSoft}` }}>
                          <th scope="row" style={{ padding: '5px 4px', color: colors.muted, textAlign: 'left', fontWeight: 400 }}>{r}</th>
                          <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: font.mono }}>{P(v)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <div data-testid="coorte-insuficiente" style={avisoCobertura}>
                  <strong>Comparação indisponível.</strong> Só {b.cobertura.entes_com_valor} ente(s) da
                  coorte têm este mínimo apurado no período — com uma amostra dessas, percentil e
                  posição não significam nada. O Anexo {rotulo === 'ASPS' ? '12' : '8'} do RREO não é
                  publicado pela API do SICONFI: cada ente depende de ingestão própria (Central de Dados).
                </div>
              )}
              <div style={{ fontSize: 11, color: colors.muted, marginTop: 8, lineHeight: 1.45 }}>
                Unidade da métrica: <span style={{ fontFamily: font.mono }}>{b.unidade}</span> — o mart
                declara a base de cada percentual, e só compara quem tem a mesma.
              </div>
              <FonteChip source={b.source_refs[0]} asOf={b.as_of} />
            </>
          );
        }}
      </Async>
    </Card>
  );
}

/** Perguntas 4 e 5: exercícios anteriores e trajetória dentro do exercício. */
function BlocoSerie({
  serie,
  rotulo,
  enteNome,
  periodo,
}: {
  serie: SerieMinimoResposta;
  rotulo: string;
  enteNome: string;
  periodo: string;
}) {
  const piso = n(serie.minimo_pct) ?? 0;
  const limiar = { valor: piso, rotulo: `piso ${fmt(piso, 0)}%`, sentido: 'piso' as const };
  const pontos = (itens: SerieMinimoDetalhe[]) =>
    itens.map((i) => ({ periodo: i.periodo, nominal: n(i.pct_aplicado) }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <ExportButton
          nome={`Serie ${rotulo}`}
          linhas={[...serie.data, ...serie.trajetoria_exercicio]}
          colunas={[
            { cabecalho: 'periodo', valor: (l) => l.periodo },
            { cabecalho: 'exercicio', valor: (l) => l.exercicio },
            { cabecalho: 'parcial', valor: (l) => (l.parcial ? 'sim' : 'nao') },
            { cabecalho: 'estagio_legal', valor: (l) => l.estagio_legal },
            { cabecalho: 'base', valor: (l) => n(l.base_impostos_transferencias) },
            { cabecalho: 'aplicado', valor: (l) => n(l.despesa_aplicada) },
            { cabecalho: 'pct_aplicado', valor: (l) => n(l.pct_aplicado) },
            { cabecalho: 'minimo_pct', valor: (l) => n(l.minimo_pct) },
          ]}
          contexto={{ ente: enteNome, periodo, fonte: `${serie.source_ref.relatorio} ${serie.source_ref.anexo ?? ''}` }}
        />
      </div>

      {serie.data.length > 1 ? (
        <SerieChart
          titulo={`${rotulo} aplicado por exercício`}
          medida="% aplicado no fechamento"
          pontos={pontos(serie.data)}
          formato="pct"
          limiar={limiar}
          destaque={periodo}
        />
      ) : (
        <div data-testid="serie-plurianual-insuficiente" style={avisoCobertura}>
          <strong>Série plurianual indisponível.</strong> {serie.observacao ?? 'Só um exercício apurado.'}
        </div>
      )}

      <div>
        <div style={{ fontSize: 11, color: colors.muted, marginBottom: 6 }}>
          Trajetória dentro do exercício — acumulado bimestre a bimestre. Comparar com o piso aqui
          mostra o caminho, não o cumprimento: a apuração é no fechamento.
        </div>
        {serie.trajetoria_exercicio.length === 0 ? (
          <Vazio texto="Sem bimestres apurados neste exercício." />
        ) : (
          <SerieChart
            titulo={`${rotulo} acumulado no exercício`}
            medida="% acumulado"
            pontos={pontos(serie.trajetoria_exercicio)}
            formato="pct"
            limiar={limiar}
            destaque={periodo}
          />
        )}
      </div>

      {serie.exercicios_sem_dado.length > 0 && (
        <div style={{ fontSize: 11, color: colors.muted, lineHeight: 1.5 }}>
          Cobertura: {serie.exercicios_com_dado.length} de {serie.anos_solicitados} exercícios
          apurados. Sem dado em {serie.exercicios_sem_dado.join(', ')}.
        </div>
      )}
      <FonteChip source={serie.source_ref} asOf={serie.as_of} />
    </div>
  );
}

function CardFundeb({
  fundeb,
  fonteFallback,
  asOfFallback,
}: {
  fundeb: FundebMinimo;
  fonteFallback: SourceRef;
  asOfFallback: string | null;
}) {
  const cor = fundeb.abaixo_do_minimo ? colors.red : colors.green;
  return (
    <Card style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20, alignItems: 'center' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={eyebrow}>FUNDEB · profissionais da educação básica</div>
          <ExplicacaoIndicador
            indicador="fundeb_profissionais"
            rotulo="FUNDEB aplicado em profissionais da educação básica"
            periodo={fundeb.source_ref?.periodo ?? fonteFallback.periodo}
            asOf={fundeb.as_of ?? asOfFallback}
          />
        </div>
        <div style={{ fontFamily: font.mono, fontSize: 32, fontWeight: 600, color: cor, marginTop: 4 }}>
          {P(fundeb.pct_aplicado)}
        </div>
        <div style={{ marginTop: 6 }}>
          <SeloPiso abaixo={fundeb.abaixo_do_minimo} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <MiniValor rotulo="Base FUNDEB" valor={M(fundeb.base)} />
        <MiniValor rotulo="Aplicado em profissionais" valor={M(fundeb.aplicado_profissionais)} />
        <MiniValor rotulo={`Mínimo ${P(fundeb.minimo_pct, 0)}`} valor={M(fundeb.valor_minimo)} />
        {/* U29/U30 — achado revisado na investigação (Sprint F2): a ficha pedia replicar
            a nota de expurgo de RPNP sem lastro que a árvore MDE/ASPS já tem. Mas
            health_edu/service.py::_apurar_educacao NÃO subtrai rpnp do valor de
            FUNDEB_PROFISSIONAIS — só o total de MDE é expurgado (aplicada = despesa_bruta
            − deducoes − rpnp); o indicador FUNDEB isolado usa o valor bruto do Anexo 8
            sem dedução. Replicar a nota como se o expurgo já valesse aqui criaria uma
            falsa clareza — o oposto do que esta sprint existe para consertar. A nota
            abaixo diz a verdade (assimetria, não paridade) e não altera nenhum cálculo;
            se o expurgo do FUNDEB for de fato exigido, é um achado de CÁLCULO para outra
            sprint, não de rótulo. */}
        <div style={{ gridColumn: '1 / -1', fontSize: 11, color: colors.yellowText, lineHeight: 1.45 }}>
          Diferente do ASPS/MDE acima, este percentual <strong>não expurga</strong> restos a
          pagar não processados sem disponibilidade de caixa — o valor de FUNDEB_PROFISSIONAIS
          do Anexo 8 entra bruto. A regra de expurgo (RGF Anexo 5) hoje só se aplica ao
          cômputo do MDE.
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <FonteChip
            source={fundeb.source_ref ?? fonteFallback}
            asOf={fundeb.as_of ?? asOfFallback}
            nota="base = receitas do FUNDEB (não é a base de impostos do MDE)"
          />
        </div>
      </div>
    </Card>
  );
}

/** Pergunta 7: o que dizem SIOPS/SIOPE — sempre com selo, nunca substituindo o RREO. */
function CardEnriquecimento({ titulo, resource }: { titulo: string; resource: Resource<EnriquecimentoDetalhe> }) {
  return (
    <Card>
      <SectionLabel note="enriquecimento · não altera o piso">{titulo}</SectionLabel>
      <Async res={resource} skeleton={<Skeleton linhas={4} />}>
        {(data) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: colors.muted }}>
                Período da fonte:{' '}
                <span style={{ fontFamily: font.mono, color: colors.ink }}>{data.periodo_fonte ?? '—'}</span>
                {' · '}atualização{' '}
                <span style={{ fontFamily: font.mono, color: colors.ink }}>{dataHora(data.ultima_atualizacao)}</span>
              </div>
              <SeloDefasagem data={data} />
            </div>
            <div style={{ padding: '8px 10px', borderRadius: 4, background: colors.accentSoft, color: colors.primary, fontSize: 11, lineHeight: 1.4 }}>
              Enriquecimento declaratório. A apuração constitucional acima permanece baseada
              exclusivamente no RREO.
            </div>
            {data.itens.length === 0 ? (
              <Vazio texto="Fonte disponível, sem indicadores para este período." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {data.itens.map((item) => (
                  <LinhaEnriquecimento key={`${item.codigo}-${item.periodo}`} item={item} />
                ))}
              </div>
            )}
            <FonteChip source={data.source_ref} asOf={data.as_of} />
          </div>
        )}
      </Async>
    </Card>
  );
}

function LinhaEnriquecimento({ item }: { item: EnriquecimentoItem }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '66px 1fr 130px',
        gap: 8,
        alignItems: 'center',
        padding: '6px 0',
        borderBottom: `1px dashed ${colors.borderSoft}`,
      }}
    >
      <span style={{ fontFamily: font.mono, fontSize: 11, color: colors.faint }}>{item.codigo}</span>
      <span style={{ fontSize: 11.5 }}>{item.descricao ?? 'Indicador sem descrição'}</span>
      <span style={{ fontFamily: font.mono, fontSize: 11, textAlign: 'right' }}>{valorEnriquecimento(item)}</span>
    </div>
  );
}

/** Memória de cálculo — antes inline no corpo da página, agora em diálogo (25C). */
function MemoriaMinimoDialog({
  titulo,
  subtitulo,
  carregar,
  deps,
}: {
  titulo: string;
  subtitulo: string;
  carregar: () => Promise<MemoriaCalculo>;
  deps: unknown[];
}) {
  return (
    <MemoriaDialog titulo={titulo} subtitulo={subtitulo} carregar={carregar} deps={deps}>
      {(m) => (
        <div>
          <LinhaMemoria rotulo="Fórmula da aplicação">{m.formula_aplicacao}</LinhaMemoria>
          <LinhaMemoria rotulo="Fórmula do percentual">{m.formula_percentual}</LinhaMemoria>
          <LinhaMemoria rotulo="Estágio legal">{m.estagio_legal}</LinhaMemoria>
          <LinhaMemoria rotulo="Regra de expurgo">{m.regra_expurgo}</LinhaMemoria>
          {m.componentes.map((c) => (
            <LinhaMemoria key={c.codigo} rotulo={`${simbolo(c.operacao)} ${c.rotulo}`}>
              {M(c.valor)}
              <div style={{ fontSize: 11, color: colors.faint, marginTop: 2 }}>
                {[c.source_ref.relatorio, c.source_ref.anexo, c.source_ref.periodo]
                  .filter(Boolean)
                  .join(' · ')}{' '}
                · as_of {c.as_of}
              </div>
            </LinhaMemoria>
          ))}
          {Object.entries(m.detalhes).map(([k, v]) => (
            <LinhaMemoria key={k} rotulo={humanizar(k)}>
              {valorDetalhe(k, v)}
            </LinhaMemoria>
          ))}
        </div>
      )}
    </MemoriaDialog>
  );
}

function SeloPiso({ abaixo, projetado = false }: { abaixo: boolean; projetado?: boolean }) {
  return (
    <Selo
      texto={
        abaixo
          ? `${projetado ? 'PROJEÇÃO ' : ''}ABAIXO DO MÍNIMO`
          : `${projetado ? 'PROJEÇÃO ' : ''}CUMPRE O PISO`
      }
      cor={abaixo ? colors.red : colors.green}
      fundo={abaixo ? colors.redBg : colors.greenBg}
    />
  );
}

function SeloDefasagem({ data }: { data: EnriquecimentoDetalhe }) {
  const indisponivel = data.selo === 'indisponivel';
  const atraso = data.defasagem_bimestres;
  const texto = indisponivel
    ? 'INDISPONÍVEL'
    : data.defasado
      ? atraso === null
        ? 'DEFASADO'
        : `DEFASADO · ${atraso} ${atraso === 1 ? 'BIMESTRE' : 'BIMESTRES'}`
      : 'ATUALIZADO';
  return (
    <Selo
      texto={texto}
      cor={indisponivel ? colors.muted : data.defasado ? colors.orange : colors.green}
      fundo={indisponivel ? colors.borderSoft : data.defasado ? colors.orangeBg : colors.greenBg}
    />
  );
}

function Selo({ texto, cor, fundo }: { texto: string; cor: string; fundo: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 8px',
        borderRadius: 3,
        color: cor,
        background: fundo,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cor }} />
      {texto}
    </span>
  );
}

function MiniValor({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div style={{ padding: '8px 10px', background: colors.bg, border: `1px solid ${colors.borderSoft}`, borderRadius: 4 }}>
      <div style={{ fontSize: 11, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {rotulo}
      </div>
      <div style={{ fontFamily: font.mono, fontSize: 12, marginTop: 3 }}>{valor}</div>
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <div style={{ padding: '12px 0', color: colors.faint, fontSize: 11 }}>{texto}</div>;
}

function valorEnriquecimento(item: EnriquecimentoItem): string {
  const v = n(item.valor);
  if (v === null) return '—';
  const unidade = (item.unidade ?? '').trim().toLocaleLowerCase('pt-BR');
  if (unidade.includes('%') || unidade.includes('percent')) return `${fmt(v, 2)}%`;
  if (unidade.includes('r$') || unidade.includes('real') || unidade === 'brl') return M(v);
  return `${fmt(v, 2)}${item.unidade ? ` ${item.unidade}` : ''}`;
}

function valorDetalhe(chave: string, valor: unknown): ReactNode {
  if (valor === null || valor === undefined) return '—';
  if (typeof valor === 'boolean') return valor ? 'sim' : 'não';
  if (Array.isArray(valor)) return valor.length === 0 ? '—' : valor.join(', ');
  if (typeof valor === 'object') return JSON.stringify(valor);
  const numero = Number(valor);
  if (!Number.isFinite(numero) || String(valor).trim() === '') return String(valor);
  const k = chave.toLocaleLowerCase('pt-BR');
  if (k.includes('pct') || k.includes('percentual')) return pct(numero);
  if (/base|valor|despesa|dedu|rpnp|folga|receita/.test(k)) return M(numero);
  return fmt(numero, 2);
}

function simbolo(op: 'base' | 'soma' | 'subtrai' | 'resultado' | 'referencia'): string {
  if (op === 'soma') return '(+)';
  if (op === 'subtrai') return '(−)';
  if (op === 'resultado') return '(=)';
  if (op === 'referencia') return '(ref.)';
  return '(base)';
}

function humanizar(v: string): string {
  return v.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toLocaleUpperCase('pt-BR'));
}

function dataHora(v: string | null): string {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString('pt-BR');
}

const eyebrow: CSSProperties = {
  fontSize: 11,
  color: colors.faint,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  fontWeight: 600,
};

const marcador: CSSProperties = {
  fontFamily: font.mono,
  fontSize: 11,
  color: colors.primaryDeep,
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

const avisoRisco: CSSProperties = {
  padding: '8px 10px',
  borderRadius: 4,
  background: colors.redBg,
  color: colors.red,
  fontSize: 11,
  lineHeight: 1.5,
};

const avisoCobertura: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 4,
  background: colors.bg,
  border: `1px solid ${colors.borderSoft}`,
  color: colors.muted,
  fontSize: 11,
  lineHeight: 1.55,
};
