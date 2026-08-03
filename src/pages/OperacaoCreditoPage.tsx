/**
 * Fundo do drill da dívida: uma operação de crédito inteira, do pedido ao cronograma.
 *
 * A tabela da página de dívida **lista**; aqui está tudo o que a fonte publica sobre
 * aquele processo. Três endpoints do SADIPEM que viviam separados aparecem juntos — o
 * pedido (PVL), a situação no Cadastro da Dívida Pública e o cronograma de pagamento —,
 * e é a primeira vez que o CDP chega à tela: a plataforma o ingeria e nada o consumia.
 *
 * Página com URL própria, pela mesma razão da procedência: análise fiscal precisa de link
 * para compartilhar, imprimir e anexar a processo.
 *
 * **Seção vazia diz por quê.** Cronograma ausente pode significar "a operação não foi
 * contratada" ou "o Tesouro não publicou"; espaço em branco não distingue os dois, e o
 * gestor conclui o que for pior.
 */
import { Link, useParams } from 'react-router-dom';
import { Async } from '../components/AsyncState';
import { Card } from '../components/Card';
import { SectionLabel } from '../components/SectionLabel';
import { useApp, useResource } from '../context/AppContext';
import { fetchDividaOperacao, type OperacaoDetalhe } from '../services/backend';
import { brl } from '../utils/format';
import { colors, font } from '../theme';

const money = (value: unknown): string => {
  const n = Number(value);
  return Number.isFinite(n) ? brl(n / 1e6) : '—';
};

const somaMoney = (a: unknown, b: unknown): string => {
  const x = Number(a);
  const y = Number(b);
  return money((Number.isFinite(x) ? x : 0) + (Number.isFinite(y) ? y : 0));
};

/** Há resíduo publicado? Zero e ausência valem o mesmo: nada a declarar. */
function temResiduo(d: OperacaoDetalhe): boolean {
  return somaMoney(d.restante_amortizacao, d.restante_encargos) !== money(0);
}

export function OperacaoCreditoPage() {
  const { idPleito = '' } = useParams();
  const { ente } = useApp();
  const res = useResource(
    () => fetchDividaOperacao(ente.cod_ibge, idPleito),
    [ente.cod_ibge, idPleito],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Link to="/divida" style={{ fontSize: 11.5, color: colors.primary, textDecoration: 'none' }}>
          ← Dívida e crédito
        </Link>
        <span style={{ color: colors.faint }} aria-hidden>
          /
        </span>
        <span style={{ fontFamily: font.mono, fontSize: 12.5 }}>pleito {idPleito}</span>
      </div>
      <Async res={res}>{(d) => <Conteudo d={d} />}</Async>
    </div>
  );
}

function Conteudo({ d }: { d: OperacaoDetalhe }) {
  const p = d.pleito;
  return (
    <>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 16, fontWeight: 650, margin: 0 }}>
              {p.finalidade ?? p.tipo_operacao ?? 'Operação de crédito'}
            </h1>
            <span style={{ fontSize: 11.5, color: colors.muted }}>{p.tipo_operacao}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: font.mono, fontSize: 22, fontWeight: 600 }}>
              {money(p.valor)}
            </span>
            <span style={{ fontSize: 11.5, color: colors.muted }}>{p.moeda ?? ''}</span>
          </div>

          <dl style={ficha}>
            <Campo rotulo="Credor">
              {p.credor ?? '—'}
              {p.tipo_credor && (
                <span style={{ color: colors.muted }}> · {p.tipo_credor}</span>
              )}
            </Campo>
            <Campo rotulo="Situação">{p.status ?? '—'}</Campo>
            {/* Identificadores do processo: é por eles que o gestor confere no Tesouro. */}
            <Campo rotulo="Nº do PVL" mono>
              {p.num_pvl ?? '—'}
            </Campo>
            <Campo rotulo="Nº do processo" mono>
              {p.num_processo ?? '—'}
            </Campo>
            <Campo rotulo="Protocolo">{p.data_protocolo ?? '—'}</Campo>
            <Campo rotulo="Última movimentação">{p.data_analise ?? '—'}</Campo>
            <Campo rotulo="Identificador do pleito" mono>
              {p.id_pvl ?? '—'}
            </Campo>
          </dl>
        </div>
      </Card>

      <Card>
        <SectionLabel note="SADIPEM · base nacional, casada por pleito">
          Cadastro da Dívida Pública (CDP)
        </SectionLabel>
        {d.cdp.length === 0 ? (
          <Ausencia texto={d.observacoes.cdp} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 8 }}>
            <caption className="sr-only">Situação do processo no Cadastro da Dívida Pública</caption>
            <thead>
              <tr style={cabecalho}>
                <th scope="col" style={{ textAlign: 'left', padding: '6px 4px' }}>Data-base</th>
                <th scope="col" style={{ textAlign: 'left', padding: '6px 4px' }}>Situação</th>
                <th scope="col" style={{ textAlign: 'left', padding: '6px 4px' }}>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {d.cdp.map((c, i) => (
                <tr key={`${c.data_ref}-${i}`} style={{ borderBottom: `1px dashed ${colors.borderSoft}` }}>
                  <td style={{ padding: '7px 4px', fontFamily: font.mono }}>{c.data_ref ?? '—'}</td>
                  <td style={{ padding: '7px 4px', fontWeight: 600 }}>{c.situacao ?? '—'}</td>
                  <td style={{ padding: '7px 4px', color: colors.muted }}>{c.motivo ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        {/* O rótulo importa: não são as parcelas desta operação. O SADIPEM devolve, em
            cada análise, o serviço consolidado da dívida do ente naquele momento. Chamar
            isso de "cronograma da operação" faria o gestor comparar bilhões de serviço
            com o valor do pedido e concluir que a conta não fecha. */}
        <SectionLabel note="SADIPEM · anual · serviço consolidado do ente">
          Cronograma da dívida do ente na análise deste pleito
        </SectionLabel>
        {d.cronograma.length === 0 ? (
          <Ausencia texto={d.observacoes.cronograma} />
        ) : (
          <>
            {d.observacoes.cronograma_escopo && (
              <div
                role="note"
                style={{
                  fontSize: 11.5,
                  lineHeight: 1.55,
                  color: colors.ink,
                  background: colors.yellowBg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 5,
                  padding: '9px 11px',
                  marginTop: 8,
                  maxWidth: 760,
                }}
              >
                {d.observacoes.cronograma_escopo.replace(/\*\*/g, '')}
              </div>
            )}
            <div style={{ overflowX: 'auto', marginTop: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 520 }}>
                <caption className="sr-only">Cronograma anual desta operação</caption>
                <thead>
                  <tr style={cabecalho}>
                    <th scope="col" style={{ textAlign: 'left', padding: '6px 4px' }}>Ano</th>
                    <th scope="col" style={{ textAlign: 'right', padding: '6px 4px' }}>Amortização</th>
                    {/* "Encargos" e não "juros": o SADIPEM não os separa — e a tela diz
                        isso, em vez de deixar o gestor supor que juros são zero. */}
                    <th scope="col" style={{ textAlign: 'right', padding: '6px 4px' }}>
                      Encargos
                      <span style={{ display: 'block', fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: colors.faint }}>
                        inclui juros
                      </span>
                    </th>
                    <th scope="col" style={{ textAlign: 'right', padding: '6px 4px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {d.cronograma.map((v) => (
                    <tr key={v.ano} style={{ borderBottom: `1px dashed ${colors.borderSoft}` }}>
                      <th scope="row" style={{ textAlign: 'left', padding: '7px 4px', fontFamily: font.mono, fontWeight: 400 }}>
                        {v.ano}
                      </th>
                      <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: font.mono }}>{money(v.principal)}</td>
                      <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: font.mono }}>{money(v.encargos)}</td>
                      <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: font.mono, fontWeight: 600 }}>{money(v.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 11.5, color: colors.muted, marginTop: 8, lineHeight: 1.6 }}>
              Anos listados: amortização{' '}
              <strong style={{ fontFamily: font.mono }}>{money(d.total_amortizacao)}</strong> · encargos{' '}
              <strong style={{ fontFamily: font.mono }}>{money(d.total_encargos)}</strong>
              {temResiduo(d) && (
                <div>
                  Após {d.horizonte_ate}:{' '}
                  <strong style={{ fontFamily: font.mono, color: colors.ink }}>
                    {somaMoney(d.restante_amortizacao, d.restante_encargos)}
                  </strong>{' '}
                  — a fonte fecha a série com &ldquo;Restante a pagar&rdquo;, sem detalhar os anos.
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      <Card>
        <SectionLabel>De onde vem cada número desta página</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
          {d.source_refs.map((s, i) => (
            <div key={`${s.relatorio}-${i}`} style={{ fontSize: 11.5, color: colors.muted }}>
              <span style={{ fontFamily: font.mono, color: colors.ink }}>{s.relatorio}</span>
              {s.anexo && ` · ${s.anexo}`}
              {s.periodo && ` · ${s.periodo}`}
              {s.versao_entrega && ` · entrega ${s.versao_entrega}`}
              {/* Fecha o círculo: do número à entrega, e da entrega ao endereço consultado. */}
              <Link
                to={`/central-dados/fontes/${relatorioParaFonte(s.relatorio)}`}
                style={{ marginLeft: 8, color: colors.primary }}
              >
                ver o endpoint de origem
              </Link>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

/** Relatório (como aparece no `source_ref`) → chave da fonte no catálogo de procedência. */
function relatorioParaFonte(relatorio: string): string {
  return (
    {
      'SADIPEM-PVL': 'sadipem_pvl',
      'SADIPEM-CDP': 'sadipem_cdp',
      'SADIPEM-CRONOGRAMA': 'sadipem_cronograma_pgto',
      'SADIPEM-OP': 'sadipem_op_contratada',
    }[relatorio] ?? 'sadipem_pvl'
  );
}

/** Ausência com o motivo — o que distingue "não contratado" de "não publicado". */
function Ausencia({ texto }: { texto?: string }) {
  return (
    <div
      role="status"
      style={{ fontSize: 11.5, color: colors.muted, lineHeight: 1.55, marginTop: 8, maxWidth: 720 }}
    >
      {texto ?? 'Sem registro para esta operação.'}
    </div>
  );
}

function Campo({
  rotulo,
  children,
  mono = false,
}: {
  rotulo: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <>
      <dt style={{ fontSize: 11, color: colors.muted, padding: '3px 0' }}>{rotulo}</dt>
      <dd
        style={{
          fontSize: 12,
          color: colors.ink,
          margin: 0,
          padding: '3px 0',
          fontFamily: mono ? font.mono : 'inherit',
        }}
      >
        {children}
      </dd>
    </>
  );
}

const ficha = {
  display: 'grid',
  gridTemplateColumns: 'max-content 1fr',
  columnGap: 16,
  rowGap: 2,
  margin: 0,
  alignItems: 'baseline' as const,
  maxWidth: 760,
};

const cabecalho = {
  fontSize: 11,
  color: colors.muted,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
};
