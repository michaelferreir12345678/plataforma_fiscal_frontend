import { useState, type CSSProperties } from 'react';
import { colors, font } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { MetricHeader } from '../components/MetricHeader';
import { SectionLabel } from '../components/SectionLabel';
import { Async } from '../components/AsyncState';
import { useApp, useResource, type Resource } from '../context/AppContext';
import {
  fetchEducacao,
  fetchEducacaoArvore,
  fetchEducacaoDetalhamentoSiope,
  fetchMinimosProjecao,
  fetchSaude,
  fetchSaudeArvore,
  fetchSaudeDetalhamentoSiops,
  type DrillEnvelope,
  type EducacaoDetalhe,
  type EnriquecimentoDetalhe,
  type EnriquecimentoItem,
  type FiscalDecimal,
  type FundebMinimo,
  type MemoriaCalculo,
  type MinimoDetalheBase,
  type MinimosProjecao,
  type ProjecaoMinimoItem,
  type SaudeDetalhe,
  type SerieMinimosItem,
  type SourceRef,
} from '../services/backend';
import { brl, fmt, pct } from '../utils/format';

type Aba = 'saude' | 'educacao';
type MaybeNumber = FiscalDecimal | null | undefined;

const numberValue = (value: MaybeNumber): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const money = (value: MaybeNumber): string => {
  const parsed = numberValue(value);
  return parsed === null ? '—' : brl(parsed / 1e6);
};

const percent = (value: MaybeNumber, decimals = 2): string => {
  const parsed = numberValue(value);
  return parsed === null ? '—' : pct(parsed, decimals);
};

function sourceText(source: SourceRef | null | undefined): string {
  if (!source) return 'fonte não informada';
  return [
    source.relatorio,
    source.anexo,
    source.periodo,
    source.versao_entrega && `v${source.versao_entrega}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

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
  const source = tab === 'saude' ? saude.data?.source_ref : educacao.data?.source_ref;
  const asOf = tab === 'saude' ? saude.data?.as_of : educacao.data?.as_of;

  return (
    <div
      className="fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      data-screen-label="Detalhe · Saúde e Educação"
    >
      <Breadcrumb
        crumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Análise por bloco' },
          { label: 'Saúde & Educação' },
        ]}
        source={source ? `${sourceText(source)} · as_of ${asOf ?? source.as_of ?? '—'}` : 'fonte primária: RREO · SICONFI'}
      />

      <div style={{ display: 'flex', gap: 6 }} role="tablist" aria-label="Mínimos constitucionais">
        {(['saude', 'educacao'] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            onClick={() => setTab(item)}
            style={{
              padding: '7px 16px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 500,
              background: tab === item ? colors.primary : colors.bg,
              color: tab === item ? colors.bg : colors.muted,
              border: tab === item ? '1px solid transparent' : `1px solid ${colors.border}`,
            }}
          >
            {item === 'saude' ? 'Saúde · ASPS' : 'Educação · MDE/FUNDEB'}
          </button>
        ))}
      </div>

      {tab === 'saude' ? (
        <Async res={saude}>
          {(data) => (
            <SaudePanel
              key={`${data.cod_ibge}-${data.periodo}-${data.as_of ?? ''}`}
              detalhe={data}
              projecao={projecao}
            />
          )}
        </Async>
      ) : (
        <Async res={educacao}>
          {(data) => (
            <EducacaoPanel
              key={`${data.cod_ibge}-${data.periodo}-${data.as_of ?? ''}`}
              detalhe={data}
              projecao={projecao}
            />
          )}
        </Async>
      )}
    </div>
  );
}

function SaudePanel({
  detalhe,
  projecao,
}: {
  detalhe: SaudeDetalhe;
  projecao: Resource<MinimosProjecao>;
}) {
  const [node, setNode] = useState<string>();
  const arvore = useResource(
    () =>
      fetchSaudeArvore(detalhe.cod_ibge, {
        periodo: detalhe.periodo,
        node,
      }),
    [detalhe.cod_ibge, detalhe.periodo, node],
  );
  const siops = useResource(
    () => fetchSaudeDetalhamentoSiops(detalhe.cod_ibge, detalhe.periodo),
    [detalhe.cod_ibge, detalhe.periodo],
  );

  return (
    <MinimoContent
      detalhe={detalhe}
      dominio="saude"
      titulo="Saúde · Ações e Serviços Públicos de Saúde"
      norma="CF art. 198 · LC 141/2012"
      arvore={arvore}
      node={node}
      onNodeChange={setNode}
      enriquecimento={siops}
      projecao={projecao}
    />
  );
}

function EducacaoPanel({
  detalhe,
  projecao,
}: {
  detalhe: EducacaoDetalhe;
  projecao: Resource<MinimosProjecao>;
}) {
  const [node, setNode] = useState<string>();
  const arvore = useResource(
    () =>
      fetchEducacaoArvore(detalhe.cod_ibge, {
        periodo: detalhe.periodo,
        node,
      }),
    [detalhe.cod_ibge, detalhe.periodo, node],
  );
  const siope = useResource(
    () => fetchEducacaoDetalhamentoSiope(detalhe.cod_ibge, detalhe.periodo),
    [detalhe.cod_ibge, detalhe.periodo],
  );

  return (
    <MinimoContent
      detalhe={detalhe}
      dominio="educacao"
      titulo="Educação · Manutenção e Desenvolvimento do Ensino"
      norma="CF art. 212"
      arvore={arvore}
      node={node}
      onNodeChange={setNode}
      enriquecimento={siope}
      projecao={projecao}
      fundeb={detalhe.fundeb}
    />
  );
}

interface MinimoContentProps {
  detalhe: MinimoDetalheBase;
  dominio: Aba;
  titulo: string;
  norma: string;
  arvore: Resource<DrillEnvelope>;
  node: string | undefined;
  onNodeChange: (node: string | undefined) => void;
  enriquecimento: Resource<EnriquecimentoDetalhe>;
  projecao: Resource<MinimosProjecao>;
  fundeb?: FundebMinimo;
}

function MinimoContent({
  detalhe,
  dominio,
  titulo,
  norma,
  arvore,
  node,
  onNodeChange,
  enriquecimento,
  projecao,
  fundeb,
}: MinimoContentProps) {
  const color = detalhe.abaixo_do_minimo ? colors.red : colors.green;

  return (
    <>
      <MetricHeader
        label={`% aplicado · ${titulo} · ${detalhe.periodo}`}
        value={percent(detalhe.pct_aplicado)}
        valueColor={color}
        badge={<FloorBadge below={detalhe.abaixo_do_minimo} />}
        context={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span>
              Base de impostos + transferências {money(detalhe.base_impostos_transferencias)} · aplicado válido{' '}
              {money(detalhe.despesa_aplicada)} · esfera {detalhe.esfera ?? '—'}
            </span>
            <Provenance source={detalhe.source_ref} asOf={detalhe.as_of} />
          </div>
        }
        right={<FloorGauge detalhe={detalhe} norma={norma} />}
      />

      {fundeb && <FundebCard fundeb={fundeb} fallbackSource={detalhe.source_ref} fallbackAsOf={detalhe.as_of} />}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <MemoryCard detalhe={detalhe} />
        <ProjectionCard dominio={dominio} detalhe={detalhe} resource={projecao} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 12 }}>
        <TreeCard
          title={dominio === 'saude' ? 'Composição por subfunção' : 'Composição por fonte · FUNDEB × impostos'}
          resource={arvore}
          node={node}
          onNodeChange={onNodeChange}
        />
        <EnrichmentCard
          title={dominio === 'saude' ? 'Detalhamento SIOPS' : 'Detalhamento SIOPE'}
          resource={enriquecimento}
        />
      </div>
    </>
  );
}

function FloorGauge({ detalhe, norma }: { detalhe: MinimoDetalheBase; norma: string }) {
  const applied = numberValue(detalhe.pct_aplicado);
  const minimum = numberValue(detalhe.minimo_pct) ?? 0;
  const projected = numberValue(detalhe.projecao_pct);
  const max = Math.max(minimum * 1.6, applied ?? 0, projected ?? 0, 1) * 1.05;
  const minimumLeft = Math.min(100, (minimum / max) * 100);
  const appliedWidth = Math.min(100, Math.max(0, ((applied ?? 0) / max) * 100));
  const projectedLeft = projected === null ? null : Math.min(100, Math.max(0, (projected / max) * 100));
  const color = detalhe.abaixo_do_minimo ? colors.red : colors.green;
  const gap = numberValue(detalhe.folga);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <div>
          <div style={eyebrow}>Piso constitucional · semântica de mínimo</div>
          <div style={{ fontSize: 10.5, color: colors.faint, marginTop: 3 }}>
            mínimo {percent(detalhe.minimo_pct, 0)} · {norma}
          </div>
        </div>
        <div style={{ color, fontFamily: font.mono, fontSize: 11, fontWeight: 600 }}>
          {gap === null ? 'Folga não disponível' : gap >= 0 ? `Folga ${money(gap)}` : `Faltam ${money(Math.abs(gap))}`}
        </div>
      </div>
      <div style={{ position: 'relative', height: 18, background: colors.borderSoft, borderRadius: 4 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${minimumLeft}%`,
            background: 'repeating-linear-gradient(45deg, #FBDBDB, #FBDBDB 5px, #F5CBCB 5px, #F5CBCB 10px)',
            borderRadius: '4px 0 0 4px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${appliedWidth}%`,
            background: color,
            opacity: 0.82,
            borderRadius: 4,
          }}
        />
        <div style={{ position: 'absolute', left: `${minimumLeft}%`, top: -6, bottom: -6, width: 2, background: colors.primaryDeep }} />
        <div style={{ position: 'absolute', left: `${minimumLeft}%`, top: -18, transform: 'translateX(-50%)', ...markerLabel }}>
          piso {percent(detalhe.minimo_pct, 0)}
        </div>
        {projectedLeft !== null && (
          <>
            <div style={{ position: 'absolute', left: `${projectedLeft}%`, top: -4, bottom: -4, borderLeft: `2px dashed ${colors.muted}` }} />
            <div style={{ position: 'absolute', left: `${projectedLeft}%`, bottom: -20, transform: 'translateX(-50%)', ...markerLabel, color: colors.muted }}>
              projeção {percent(detalhe.projecao_pct)}
            </div>
          </>
        )}
      </div>
      <div style={{ marginTop: 26, fontSize: 10.5, color: colors.muted }}>
        A base é receita de impostos e transferências constitucionais — não é RCL.
      </div>
    </div>
  );
}

function MemoryCard({ detalhe }: { detalhe: MinimoDetalheBase }) {
  const rows: Array<[string, MaybeNumber, '-' | '=']> = [
    ['Despesa bruta considerada pelo RREO', detalhe.despesa_bruta, '='],
    ['Deduções admitidas no demonstrativo', detalhe.deducoes_outras, '-'],
    ['RPNP sem lastro expurgado · Sprint 10', detalhe.rpnp_sem_lastro, '-'],
    ['Despesa aplicada válida', detalhe.despesa_aplicada, '='],
  ];

  return (
    <Card>
      <SectionLabel note="fonte primária · RREO">Memória de cálculo do mínimo</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <MemoryRow label="Base: impostos + transferências" value={money(detalhe.base_impostos_transferencias)} />
        {rows.map(([label, value, operator]) => (
          <MemoryRow key={label} label={`${operator === '-' ? '(−)' : '='} ${label}`} value={money(value)} />
        ))}
        <MemoryRow label="Valor mínimo exigido" value={money(detalhe.valor_minimo)} strong />
        <MemoryRow label="Percentual aplicado válido" value={percent(detalhe.pct_aplicado)} strong />
      </div>
      <MemoryDetails memory={detalhe.memoria_calculo} />
      <Provenance source={detalhe.source_ref} asOf={detalhe.as_of} />
      {detalhe.source_ref_expurgo && (
        <div style={{ marginTop: 5 }}>
          <span style={{ fontSize: 9, color: colors.faint }}>Expurgo de RPNP: </span>
          <Provenance source={detalhe.source_ref_expurgo} asOf={detalhe.as_of} />
        </div>
      )}
    </Card>
  );
}

function MemoryDetails({ memory }: { memory: MemoriaCalculo }) {
  return (
    <div style={memoryBox}>
      <div><strong>Aplicação:</strong> {memory.formula_aplicacao}</div>
      <div><strong>Percentual:</strong> {memory.formula_percentual}</div>
      <div><strong>Estágio legal:</strong> {memory.estagio_legal}</div>
      <div><strong>Regra de expurgo:</strong> {memory.regra_expurgo}</div>
      {memory.componentes.map((component) => (
        <div key={component.codigo} style={{ paddingTop: 5, borderTop: `1px dashed ${colors.borderSoft}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span>{operationSymbol(component.operacao)} {component.rotulo}</span>
            <span style={{ color: colors.ink, fontFamily: font.mono, textAlign: 'right' }}>
              {formatMemoryValue(component.codigo, component.valor)}
            </span>
          </div>
          <div style={{ marginTop: 2, color: colors.faint, fontFamily: font.mono, fontSize: 8.5 }}>
            {sourceText(component.source_ref)} · as_of {component.as_of}
          </div>
        </div>
      ))}
      {Object.entries(memory.detalhes).map(([key, value]) => (
        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span>{humanize(key)}</span>
          <span style={{ color: colors.ink, fontFamily: font.mono, textAlign: 'right' }}>
            {formatMemoryValue(key, value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ProjectionCard({
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
      <SectionLabel note="fechamento do exercício">Projeção do mínimo</SectionLabel>
      <Async res={resource}>
        {(data) => {
          const item = data[dominio];
          const projected = projectedPercent(item) ?? numberValue(detalhe.projecao_pct);
          const projectedBelow = item.abaixo_do_minimo_projetado;
          const series = seriesFor(data.serie, dominio);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div>
                  <div style={eyebrow}>Percentual projetado</div>
                  <div style={{ fontFamily: font.mono, fontSize: 28, fontWeight: 600, color: projectedBelow === true ? colors.red : colors.primary }}>
                    {projected === null ? '—' : pct(projected)}
                  </div>
                </div>
                <FloorBadge below={projectedBelow} projected />
              </div>
              <ProjectionSeries items={series} minimum={numberValue(detalhe.minimo_pct)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <MiniValue label="Aplicado projetado" value={money(item.valor_aplicado_projetado)} />
                <MiniValue label="Mínimo projetado" value={money(item.valor_minimo_projetado)} />
              </div>
              <div style={{ fontSize: 10.5, color: colors.muted }}>
                Método: {item.metodo} · período-alvo {item.periodo}
              </div>
              <Provenance source={item.source_ref} asOf={item.as_of} />
            </div>
          );
        }}
      </Async>
    </Card>
  );
}

function ProjectionSeries({ items, minimum }: { items: Array<{ periodo: string; valor: number; source?: SourceRef | null; asOf?: string | null }>; minimum: number | null }) {
  if (items.length === 0) return <Empty text="Série histórica não disponível para este recorte." />;
  const visible = items.slice(-6);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {visible.map((item) => {
        const max = Math.max(minimum ?? 0, ...visible.map((entry) => entry.valor), 1) * 1.08;
        const width = Math.max(1, Math.min(100, (item.valor / max) * 100));
        const below = minimum !== null && item.valor < minimum;
        return (
          <div key={item.periodo} title={`${sourceText(item.source)} · as_of ${item.asOf ?? '—'}`}>
            <div style={{ display: 'grid', gridTemplateColumns: '62px 1fr 58px', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: font.mono, fontSize: 9.5, color: colors.faint }}>{item.periodo}</span>
              <div style={{ height: 6, borderRadius: 3, background: colors.borderSoft }}>
                <div style={{ width: `${width}%`, height: '100%', borderRadius: 3, background: below ? colors.red : colors.green }} />
              </div>
              <span style={{ fontFamily: font.mono, fontSize: 10.5, textAlign: 'right', color: below ? colors.red : colors.ink }}>
                {pct(item.valor)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FundebCard({
  fundeb,
  fallbackSource,
  fallbackAsOf,
}: {
  fundeb: FundebMinimo;
  fallbackSource: SourceRef;
  fallbackAsOf: string | null;
}) {
  const source = fundeb.source_ref ?? fallbackSource;
  const asOf = fundeb.as_of ?? fallbackAsOf;
  const color = fundeb.abaixo_do_minimo ? colors.red : colors.green;
  return (
    <Card style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20, alignItems: 'center' }}>
      <div>
        <div style={eyebrow}>FUNDEB · profissionais da educação básica</div>
        <div style={{ fontFamily: font.mono, fontSize: 32, fontWeight: 600, color, marginTop: 4 }}>
          {percent(fundeb.pct_aplicado)}
        </div>
        <div style={{ marginTop: 6 }}><FloorBadge below={fundeb.abaixo_do_minimo} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <MiniValue label="Base FUNDEB" value={money(fundeb.base)} />
        <MiniValue label="Aplicado em profissionais" value={money(fundeb.aplicado_profissionais)} />
        <MiniValue label={`Mínimo ${percent(fundeb.minimo_pct, 0)}`} value={money(fundeb.valor_minimo)} />
        <div style={{ gridColumn: '1 / -1' }}><Provenance source={source} asOf={asOf} /></div>
      </div>
    </Card>
  );
}

function TreeCard({
  title,
  resource,
  node,
  onNodeChange,
}: {
  title: string;
  resource: Resource<DrillEnvelope>;
  node: string | undefined;
  onNodeChange: (node: string | undefined) => void;
}) {
  return (
    <Card>
      <SectionLabel note="drill-down auditável">{title}</SectionLabel>
      <Async res={resource}>
        {(tree) => (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
              <button type="button" onClick={() => onNodeChange(undefined)} style={crumbButton(node === undefined)}>
                raiz
              </button>
              {tree.breadcrumb.map((crumb) => (
                <span key={crumb.codigo} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: colors.faint }}>›</span>
                  <button type="button" onClick={() => onNodeChange(crumb.codigo)} style={crumbButton(node === crumb.codigo)}>
                    {crumb.descricao}
                  </button>
                </span>
              ))}
            </div>
            {tree.children.length === 0 ? (
              <Empty text="Sem itens neste nível." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {tree.children.map((child) => (
                  <button
                    key={child.codigo}
                    type="button"
                    disabled={!child.has_children}
                    onClick={() => child.has_children && onNodeChange(child.codigo)}
                    style={treeRow}
                  >
                    <span style={{ minWidth: 0, textAlign: 'left' }}>
                      <span style={{ fontFamily: font.mono, color: colors.faint, fontSize: 9.5, marginRight: 7 }}>{child.codigo}</span>
                      <span style={{ fontSize: 11.5, color: colors.ink }}>{child.descricao}</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                      {Object.entries(child.measures).map(([key, value]) => (
                        <span key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ fontSize: 8.5, color: colors.faint }}>{humanize(key)}</span>
                          <span style={{ fontFamily: font.mono, fontSize: 10.5, color: colors.ink }}>{formatMeasure(key, value)}</span>
                        </span>
                      ))}
                      {child.has_children && <span style={{ color: colors.primary }}>›</span>}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <Provenance source={tree.source_ref} asOf={tree.as_of} />
          </>
        )}
      </Async>
    </Card>
  );
}

function EnrichmentCard({ title, resource }: { title: string; resource: Resource<EnriquecimentoDetalhe> }) {
  return (
    <Card>
      <SectionLabel note="enriquecimento · não altera o piso">{title}</SectionLabel>
      <Async res={resource}>
        {(data) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div style={{ fontSize: 10.5, color: colors.muted }}>
                Período da fonte: <span style={{ fontFamily: font.mono, color: colors.ink }}>{data.periodo_fonte ?? '—'}</span>
                {' · '}atualização <span style={{ fontFamily: font.mono, color: colors.ink }}>{formatDate(data.ultima_atualizacao)}</span>
              </div>
              <FreshnessBadge data={data} />
            </div>
            <div style={{ padding: '8px 10px', borderRadius: 4, background: colors.accentSoft, color: colors.primary, fontSize: 10.5, lineHeight: 1.4 }}>
              Enriquecimento declaratório. A apuração constitucional acima permanece baseada exclusivamente no RREO.
            </div>
            {data.itens.length === 0 ? (
              <Empty text="Fonte disponível, sem indicadores para este período." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {data.itens.map((item) => <EnrichmentRow key={item.codigo} item={item} />)}
              </div>
            )}
            <Provenance source={data.source_ref} asOf={data.as_of} />
          </div>
        )}
      </Async>
    </Card>
  );
}

function EnrichmentRow({ item }: { item: EnriquecimentoItem }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '66px 1fr 130px', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: `1px dashed ${colors.borderSoft}` }}>
      <span style={{ fontFamily: font.mono, fontSize: 9.5, color: colors.faint }}>{item.codigo}</span>
      <span style={{ fontSize: 11.5 }}>
        {item.descricao ?? 'Indicador sem descrição'}
        <span style={{ display: 'block', marginTop: 2, fontFamily: font.mono, fontSize: 8.5, color: colors.faint }}>
          {sourceText(item.source_ref)} · {item.periodo ?? '—'} · as_of {item.as_of}
        </span>
      </span>
      <span style={{ fontFamily: font.mono, fontSize: 11, textAlign: 'right' }}>{formatEnrichmentValue(item)}</span>
    </div>
  );
}

function FreshnessBadge({ data }: { data: EnriquecimentoDetalhe }) {
  const unavailable = data.selo === 'indisponivel';
  const color = unavailable ? colors.muted : data.defasado ? colors.orange : colors.green;
  const background = unavailable ? colors.borderSoft : data.defasado ? colors.orangeBg : colors.greenBg;
  const delay = data.defasagem_bimestres;
  const label = unavailable
    ? 'INDISPONÍVEL'
    : data.defasado
    ? delay === null
      ? 'DEFASADO'
      : `DEFASADO · ${delay} ${delay === 1 ? 'BIMESTRE' : 'BIMESTRES'}`
    : 'ATUALIZADO';
  return <Badge text={label} color={color} background={background} />;
}

function FloorBadge({ below, projected = false }: { below: boolean; projected?: boolean }) {
  return (
    <Badge
      text={below ? `${projected ? 'PROJEÇÃO ' : ''}ABAIXO DO MÍNIMO` : `${projected ? 'PROJEÇÃO ' : ''}CUMPRE O PISO`}
      color={below ? colors.red : colors.green}
      background={below ? colors.redBg : colors.greenBg}
    />
  );
}

function Badge({ text, color, background }: { text: string; color: string; background: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 3, color, background, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {text}
    </span>
  );
}

function MemoryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '6px 0', borderBottom: `1px dashed ${colors.borderSoft}`, fontSize: 11.5, fontWeight: strong ? 600 : 400 }}>
      <span>{label}</span>
      <span style={{ fontFamily: font.mono, color: strong ? colors.primary : colors.ink }}>{value}</span>
    </div>
  );
}

function MiniValue({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '8px 10px', background: colors.bg, border: `1px solid ${colors.borderSoft}`, borderRadius: 4 }}>
      <div style={{ fontSize: 9, color: colors.faint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontFamily: font.mono, fontSize: 12, marginTop: 3 }}>{value}</div>
    </div>
  );
}

function Provenance({ source, asOf }: { source: SourceRef | null | undefined; asOf: string | null | undefined }) {
  return (
    <div style={{ marginTop: 8, paddingTop: 7, borderTop: `1px solid ${colors.borderSoft}`, fontFamily: font.mono, fontSize: 9, color: colors.faint }}>
      fonte: {sourceText(source)} · as_of {asOf ?? source?.as_of ?? '—'}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ padding: '12px 0', color: colors.faint, fontSize: 11 }}>{text}</div>;
}

function projectedPercent(item: ProjecaoMinimoItem): number | null {
  return numberValue(item.pct_projetado);
}

function seriesFor(
  series: SerieMinimosItem[],
  domain: Aba,
): Array<{ periodo: string; valor: number; source?: SourceRef | null; asOf?: string | null }> {
  return series.flatMap((item) => {
    const raw = domain === 'saude' ? item.saude_pct : item.educacao_pct;
    const value = typeof raw === 'number' || typeof raw === 'string' ? numberValue(raw) : null;
    return value === null
      ? []
      : [{
          periodo: item.periodo,
          valor: value,
          source: domain === 'saude' ? item.source_ref_saude : item.source_ref_educacao,
          asOf: item.as_of,
        }];
  });
}

function formatMeasure(key: string, value: number | null): string {
  if (value === null) return '—';
  const normalized = key.toLocaleLowerCase('pt-BR');
  if (normalized.includes('pct') || normalized.includes('percent')) return pct(value);
  if (normalized.includes('quantidade') || normalized.includes('contagem') || normalized === 'itens') return fmt(value, 0);
  return money(value);
}

function formatEnrichmentValue(item: EnriquecimentoItem): string {
  const value = numberValue(item.valor);
  if (value === null) return '—';
  const unit = (item.unidade ?? '').trim();
  const normalized = unit.toLocaleLowerCase('pt-BR');
  if (normalized.includes('%') || normalized.includes('percent')) return `${fmt(value, 2)}%`;
  if (normalized.includes('r$') || normalized.includes('real') || normalized === 'brl') return money(value);
  return `${fmt(value, 2)}${unit ? ` ${unit}` : ''}`;
}

function formatMemoryValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'sim' : 'não';
  if (typeof value === 'object') return JSON.stringify(value);
  const parsed = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '') ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) return String(value);
  const normalized = key.toLocaleLowerCase('pt-BR');
  if (normalized.includes('pct') || normalized.includes('percentual')) return pct(parsed);
  if (/base|valor|despesa|dedu|rpnp|folga|receita/.test(normalized)) return money(parsed);
  return fmt(parsed, 2);
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
}

function operationSymbol(operation: 'base' | 'soma' | 'subtrai' | 'resultado' | 'referencia'): string {
  if (operation === 'soma') return '(+)';
  if (operation === 'subtrai') return '(−)';
  if (operation === 'resultado') return '(=)';
  if (operation === 'referencia') return '(ref.)';
  return '(base)';
}

function humanize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toLocaleUpperCase('pt-BR'));
}

function crumbButton(active: boolean): CSSProperties {
  return {
    padding: '3px 6px',
    borderRadius: 3,
    border: `1px solid ${active ? colors.primary : colors.border}`,
    background: active ? colors.accentSoft : colors.bg,
    color: active ? colors.primary : colors.muted,
    fontSize: 9.5,
  };
}

const eyebrow: CSSProperties = {
  fontSize: 10,
  color: colors.faint,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  fontWeight: 600,
};

const markerLabel: CSSProperties = {
  fontFamily: font.mono,
  fontSize: 8.5,
  color: colors.primaryDeep,
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

const memoryBox: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  marginTop: 9,
  padding: '8px 10px',
  borderRadius: 4,
  background: colors.bg,
  color: colors.muted,
  fontSize: 9.5,
};

const treeRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(190px, 1fr) minmax(180px, auto)',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  minHeight: 40,
  padding: '6px 4px',
  border: 0,
  borderBottom: `1px dashed ${colors.borderSoft}`,
  background: 'transparent',
  cursor: 'pointer',
};
