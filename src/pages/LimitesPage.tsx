import { colors, riskColor, type RiskLevel } from '../theme';
import { Card } from '../components/Card';
import { Breadcrumb } from '../components/Breadcrumb';
import { PageHeader } from '../components/PageHeader';
import { SectionLabel } from '../components/SectionLabel';
import { Async } from '../components/AsyncState';
import { ExportButton } from '../components/ExportButton';
import { useApp, useResource } from '../context/AppContext';
import { fetchLimites, type LimiteItem } from '../services/backend';
import { brl, fmt, pct } from '../utils/format';
import { Termo } from '../components/NotaMetodologica';
import { humanizar } from '../utils/rotulos';

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
                <LimiteRow key={it.indicador} it={it} />
              ))}
            </div>
          )
        }
      </Async>
    </div>
  );
}

function LimiteRow({ it }: { it: LimiteItem }) {
  const nivel = FAIXA_NIVEL[it.faixa ?? ''] ?? 'neutro';
  const rc = riskColor[nivel];
  const teto = it.teto_pct ?? 0;
  const valor = it.valor_pct_rcl ?? 0;
  const ratio = teto ? Math.min((valor / teto) * 100, 100) : 0;
  const isPiso = it.sentido === 'piso';
  return (
    <Card accent={rc.color} style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <div style={{ width: 220 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{ROTULO[it.indicador] ?? it.indicador}</div>
        <div style={{ fontSize: 11, color: colors.muted }}>
          {isPiso ? 'piso' : 'teto'} {fmt(teto, 0)}% · esfera {it.esfera}
        </div>
      </div>
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
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${ratio}%`, background: rc.color, borderRadius: 3 }} />
          {it.alerta_pct != null && teto > 0 && (
            <div style={{ position: 'absolute', left: `${Math.min((it.alerta_pct / teto) * 100, 100)}%`, top: -3, bottom: -3, width: 1.5, background: colors.yellowText }} />
          )}
          <div style={{ position: 'absolute', left: '100%', top: -3, bottom: -3, width: 2, background: colors.primaryDeep }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>
          <span>distância ao {isPiso ? 'piso' : 'teto'}: {it.distancia_teto != null ? fmt(it.distancia_teto, 1) + ' p.p.' : '—'}</span>
          <span style={{ color: rc.color, fontWeight: 600, textTransform: 'uppercase' }}>{it.faixa ?? '—'}</span>
        </div>
      </div>
    </Card>
  );
}
