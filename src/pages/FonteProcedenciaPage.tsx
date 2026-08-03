/**
 * Procedência de uma fonte — de onde exatamente o dado sai antes de virar número na tela.
 *
 * **Por que uma página, e não um modal.** Isto é material de auditoria. Quem confere uma
 * origem precisa mandar o endereço a um colega, anexar a um processo ou imprimir; um modal
 * não tem URL própria e some no primeiro clique fora. Além disso o conteúdo é longo por
 * natureza — uma tabela de parâmetros por endpoint, URLs que passam de cem caracteres —, e
 * espremer isso numa caixa flutuante obriga a rolar dentro de um retângulo dentro de uma
 * página que também rola.
 *
 * **Por que não virou coluna na tabela do catálogo.** Aquela tabela já tem quinze colunas e
 * rola na horizontal. Endpoint não é um valor: é uma lista de 1 a 3 chamadas, cada uma com
 * método, formato, parâmetros e observações. Não cabe em célula, e forçar caberia
 * significaria mostrar só a primeira — o que esconderia justamente as fontes de origem
 * composta (CAPAG, cronograma do SADIPEM, PIB do IBGE), que são as que mais precisam ser
 * explicadas.
 */
import { useParams, Link } from 'react-router-dom';
import { Async } from '../components/AsyncState';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { useResource } from '../context/AppContext';
import { fetchProcedencia, type Procedencia, type ProcedenciaEndpoint } from '../services/backend';
import { colors, font } from '../theme';

/** Cor do selo por tipo de acesso — o que o usuário pode fazer muda com ele. */
const TOM_ACESSO: Record<string, string> = {
  api_rest: colors.primary,
  api_odata: colors.primary,
  catalogo_ckan: colors.orange,
  arquivo: colors.orange,
  raspagem_pdf: colors.red,
};

export function FonteProcedenciaPage() {
  const { fonte = '' } = useParams();
  const res = useResource(() => fetchProcedencia(fonte), [fonte]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Link
          to="/central-dados?painel=catalogo"
          style={{ fontSize: 11.5, color: colors.primary, textDecoration: 'none' }}
        >
          ← Central de Dados · fontes
        </Link>
        <span style={{ color: colors.faint }} aria-hidden>
          /
        </span>
        <span style={{ fontFamily: font.mono, fontSize: 12.5 }}>{fonte}</span>
      </div>

      <Async res={res}>{(p) => <Conteudo p={p} />}</Async>
    </div>
  );
}

function Conteudo({ p }: { p: Procedencia }) {
  return (
    <>
      <Card pad={0}>
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 16, fontWeight: 650, margin: 0 }}>
              {p.descricao ?? p.fonte}
            </h1>
            <Selo tom={TOM_ACESSO[p.acesso] ?? colors.muted}>{p.acesso_rotulo}</Selo>
            <span style={{ fontSize: 11.5, color: colors.muted }}>
              {p.orgao} · {p.cadencia}
            </span>
          </div>

          <p style={{ fontSize: 12.5, lineHeight: 1.65, color: colors.ink, margin: 0, maxWidth: 860 }}>
            {p.como_funciona}
          </p>

          {p.requer_configuracao && (
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
                maxWidth: 860,
              }}
            >
              <b>Exige configuração para funcionar.</b> {p.requer_configuracao}
            </div>
          )}

          <dl style={ficha}>
            <Campo rotulo="Portal público">
              <Externo href={p.portal}>consultar sem API</Externo>
            </Campo>
            {p.documentacao && (
              <Campo rotulo="Documentação">
                <Externo href={p.documentacao}>especificação da API</Externo>
              </Campo>
            )}
            <Campo rotulo="Autenticação">{p.autenticacao}</Campo>
            <Campo rotulo="Licença">{p.licenca}</Campo>
            {p.dependencias.length > 0 && (
              <Campo rotulo="Depende de">
                {p.dependencias.map((d, i) => (
                  <span key={d}>
                    {i > 0 && ', '}
                    <Link to={`/central-dados/fontes/${d}`} style={{ color: colors.primary }}>
                      {d}
                    </Link>
                  </span>
                ))}
              </Campo>
            )}
            {p.paginas_impactadas.length > 0 && (
              <Campo rotulo="Alimenta as páginas">{p.paginas_impactadas.join(', ')}</Campo>
            )}
          </dl>
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>
          {p.endpoints.length === 1
            ? 'A chamada que a ingestão faz'
            : `As ${p.endpoints.length} chamadas que a ingestão faz`}
        </div>
        {p.endpoints.map((e, i) => (
          <CartaoEndpoint key={`${e.url}-${i}`} e={e} ordem={i + 1} total={p.endpoints.length} />
        ))}
      </div>
    </>
  );
}

function CartaoEndpoint({
  e,
  ordem,
  total,
}: {
  e: ProcedenciaEndpoint;
  ordem: number;
  total: number;
}) {
  return (
    <Card pad={0}>
      <div style={{ padding: '13px 16px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          {/* Ordem só quando há mais de uma: numerar chamada única é ruído, e nas fontes
              de duas etapas a ordem é a informação (o cronograma depende do pleito). */}
          {total > 1 && (
            <span style={{ fontSize: 11, color: colors.muted, fontFamily: font.mono }}>
              {ordem}/{total}
            </span>
          )}
          <Selo tom={colors.green}>{e.metodo}</Selo>
          <span style={{ fontSize: 11, color: colors.muted }}>{e.formato}</span>
        </div>

        <code
          style={{
            fontFamily: font.mono,
            fontSize: 11.5,
            lineHeight: 1.5,
            color: colors.ink,
            background: colors.bg,
            border: `1px solid ${colors.borderSoft}`,
            borderRadius: 4,
            padding: '8px 10px',
            wordBreak: 'break-all',
          }}
        >
          {e.url}
        </code>

        <div style={{ fontSize: 12, lineHeight: 1.6, color: colors.ink, maxWidth: 860 }}>
          {e.o_que_traz}
        </div>

        {e.parametros.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11.5, minWidth: 420 }}>
              <caption className="sr-only">Parâmetros da chamada, com exemplo e significado</caption>
              <thead>
                <tr style={{ color: colors.muted, textAlign: 'left' }}>
                  {['Parâmetro', 'Exemplo', 'O que é'].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      style={{
                        padding: '4px 12px 6px 0',
                        fontSize: 10.5,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontWeight: 600,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {e.parametros.map((x) => (
                  <tr key={x.nome} style={{ borderTop: `1px solid ${colors.rowBorder}` }}>
                    <td style={{ padding: '6px 12px 6px 0', fontFamily: font.mono, whiteSpace: 'nowrap' }}>
                      {x.nome}
                    </td>
                    <td style={{ padding: '6px 12px 6px 0', fontFamily: font.mono, color: colors.muted, whiteSpace: 'nowrap' }}>
                      {x.exemplo}
                    </td>
                    <td style={{ padding: '6px 0', color: colors.muted, lineHeight: 1.5, maxWidth: 560 }}>
                      {x.significado}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {e.exemplo && (
          <div
            style={{
              borderTop: `1px solid ${colors.borderSoft}`,
              paddingTop: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ fontSize: 11, color: colors.muted }}>
              Confira você mesmo — este endereço devolve o mesmo dado que ingerimos:
            </div>
            <Externo href={e.exemplo} mono>
              {e.exemplo}
            </Externo>
          </div>
        )}

        {e.observacao && (
          <div style={{ fontSize: 11.5, color: colors.muted, lineHeight: 1.55, maxWidth: 860 }}>
            {e.observacao}
          </div>
        )}
      </div>
    </Card>
  );
}

/** Link externo: abre em nova aba sem entregar a sessão ao destino (`noopener`). */
function Externo({
  href,
  children,
  mono = false,
}: {
  href: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: colors.primary,
        fontSize: mono ? 11.5 : 12,
        fontFamily: mono ? font.mono : 'inherit',
        wordBreak: 'break-all',
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 5,
      }}
    >
      {children}
      <Icon size={10} stroke={colors.primary}>
        <path d="M6 3h7v7M13 3L6 10M11 9v4H3V5h4" />
      </Icon>
      <span className="sr-only">(abre em nova aba)</span>
    </a>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <>
      <dt style={{ fontSize: 11, color: colors.muted, padding: '3px 0' }}>{rotulo}</dt>
      <dd style={{ fontSize: 12, color: colors.ink, margin: 0, padding: '3px 0', lineHeight: 1.5 }}>
        {children}
      </dd>
    </>
  );
}

function Selo({ tom, children }: { tom: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 600,
        color: tom,
        border: `1px solid ${tom}`,
        borderRadius: 3,
        padding: '1px 6px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

const ficha = {
  display: 'grid',
  gridTemplateColumns: 'max-content 1fr',
  columnGap: 16,
  rowGap: 2,
  margin: 0,
  alignItems: 'baseline' as const,
  maxWidth: 860,
};
