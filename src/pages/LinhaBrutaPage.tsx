/**
 * O último degrau do drill: as linhas do relatório **como o ente as entregou**.
 *
 * Uma página só para receita e despesa porque a pergunta é a mesma — *de quais linhas
 * este número saiu?* — e responder de dois jeitos obrigaria o gestor a reaprender a tela
 * ao mudar de módulo.
 *
 * **A conferência é o ponto.** Cada medida do mart aparece ao lado da soma das colunas que
 * a alimentaram. Bater não é decoração: é o que transforma o drill em prova. Quando não
 * bate, os dois números aparecem — esconder a divergência seria pior que não ter o drill.
 *
 * Abaixo daqui só existe o JSON bruto no bronze, e o link para a procedência mostra de
 * qual endereço ele veio. O círculo fecha: número → nó → linha → entrega → endpoint.
 */
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Async } from '../components/AsyncState';
import { Card } from '../components/Card';
import { SectionLabel } from '../components/SectionLabel';
import { useApp, useResource } from '../context/AppContext';
import {
  fetchDespesaLinha,
  fetchReceitaLinha,
  type LinhaBruta,
  type LinhaRelatorio,
} from '../services/backend';
import { brl } from '../utils/format';
import { colors, font } from '../theme';

const numero = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const money = (v: unknown): string => {
  const n = numero(v);
  return n == null ? '—' : brl(n / 1e6);
};

/** Percentuais e índices não são dinheiro; formatá-los como milhões seria mentira visual. */
function valorDaColuna(l: LinhaRelatorio): string {
  const n = numero(l.valor);
  if (n == null) return '—';
  return /%/.test(l.coluna ?? '') ? `${n.toLocaleString('pt-BR')}%` : brl(n / 1e6);
}

export function LinhaBrutaPage({ modulo }: { modulo: 'receita' | 'despesa' }) {
  const { codigo = '', eixo = '' } = useParams();
  const [params] = useSearchParams();
  const { ente, periodo } = useApp();
  const periodoAlvo = params.get('periodo') || periodo;
  // Pinado no as_of que a página de origem (Receita/Despesa) já tinha resolvido — para
  // que o fundo do drill não misture versão com o topo se uma retificação chegar entre
  // os dois carregamentos (§6.5).
  const asOf = params.get('as_of');

  const res = useResource(
    () =>
      modulo === 'receita'
        ? fetchReceitaLinha(ente.cod_ibge, periodoAlvo, codigo, asOf)
        : fetchDespesaLinha(ente.cod_ibge, periodoAlvo, eixo, codigo, asOf),
    [ente.cod_ibge, periodoAlvo, modulo, eixo, codigo, asOf],
    { pular: !periodoAlvo },
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Link
          to={`/${modulo}`}
          style={{ fontSize: 11.5, color: colors.primary, textDecoration: 'none' }}
        >
          ← {modulo === 'receita' ? 'Receita' : 'Despesa'}
        </Link>
        <span style={{ color: colors.faint }} aria-hidden>
          /
        </span>
        <span style={{ fontFamily: font.mono, fontSize: 12.5 }}>{codigo}</span>
      </div>
      <Async res={res}>{(d) => <Conteudo d={d} />}</Async>
    </div>
  );
}

function Conteudo({ d }: { d: LinhaBruta }) {
  const medidas = Object.entries(d.medidas).filter(([, v]) => v != null);
  return (
    <>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 16, fontWeight: 650, margin: 0 }}>{d.descricao ?? d.codigo}</h1>
            <span style={{ fontSize: 11.5, color: colors.muted, fontFamily: font.mono }}>
              {d.periodo}
            </span>
          </div>

          <SectionLabel note="mart × entrega — bater é o que faz do drill uma prova">
            Conferência
          </SectionLabel>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: 460 }}>
              <caption className="sr-only">
                Medidas do mart confrontadas com a soma das colunas da entrega
              </caption>
              <thead>
                <tr style={cabecalho}>
                  <th scope="col" style={{ textAlign: 'left', padding: '6px 14px 6px 0' }}>Medida</th>
                  <th scope="col" style={{ textAlign: 'right', padding: '6px 14px 6px 0' }}>No painel</th>
                  <th scope="col" style={{ textAlign: 'right', padding: '6px 14px 6px 0' }}>Na entrega</th>
                  {/* A coluna contém "confere"/"DIVERGE"; o cabeçalho era um travessão. */}
                  <th scope="col" style={{ textAlign: 'left', padding: '6px 0' }}>Conferência</th>
                </tr>
              </thead>
              <tbody>
                {medidas.map(([nome, valor]) => {
                  const somado = d.conferencia[nome];
                  const bate = somado == null || numero(valor) === numero(somado);
                  return (
                    <tr key={nome} style={{ borderTop: `1px solid ${colors.rowBorder}` }}>
                      <th scope="row" style={{ textAlign: 'left', padding: '7px 14px 7px 0', fontWeight: 400 }}>
                        {nome}
                      </th>
                      <td style={{ padding: '7px 14px 7px 0', textAlign: 'right', fontFamily: font.mono }}>
                        {money(valor)}
                      </td>
                      <td style={{ padding: '7px 14px 7px 0', textAlign: 'right', fontFamily: font.mono }}>
                        {somado == null ? '—' : money(somado)}
                      </td>
                      <td style={{ padding: '7px 0', fontSize: 11, color: bate ? colors.green : colors.red }}>
                        {somado == null ? '' : bate ? 'confere' : 'DIVERGE'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Card>
        <SectionLabel note={`${d.linhas.length} linha(s) · ${d.source_ref.anexo ?? ''}`}>
          Linhas do relatório, como o ente entregou
        </SectionLabel>
        {d.linhas.length === 0 ? (
          <div role="status" style={{ fontSize: 11.5, color: colors.muted, marginTop: 8, lineHeight: 1.55 }}>
            {d.observacao ?? 'A entrega vigente não traz linhas para este nó.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 620 }}>
              <caption className="sr-only">Linhas do relatório que originaram este nó</caption>
              <thead>
                <tr style={cabecalho}>
                  <th scope="col" style={{ textAlign: 'right', padding: '6px 10px 6px 0', width: 46 }}>#</th>
                  <th scope="col" style={{ textAlign: 'left', padding: '6px 10px 6px 0' }}>Coluna</th>
                  <th scope="col" style={{ textAlign: 'right', padding: '6px 10px 6px 0' }}>Valor</th>
                  <th scope="col" style={{ textAlign: 'left', padding: '6px 0' }}>Seção / medida</th>
                </tr>
              </thead>
              <tbody>
                {d.linhas.map((l, i) => (
                  <tr key={`${l.linha_seq}-${i}`} style={{ borderTop: `1px solid ${colors.rowBorder}` }}>
                    <td style={{ padding: '7px 10px 7px 0', textAlign: 'right', color: colors.faint, fontFamily: font.mono }}>
                      {l.linha_seq ?? '—'}
                    </td>
                    <td style={{ padding: '7px 10px 7px 0' }}>{l.coluna ?? '—'}</td>
                    <td style={{ padding: '7px 10px 7px 0', textAlign: 'right', fontFamily: font.mono }}>
                      {valorDaColuna(l)}
                    </td>
                    <td style={{ padding: '7px 0', fontSize: 11, color: colors.muted }}>
                      {/* O slug distingue a seção principal da intra-orçamentária: sem
                          isso, a mesma coluna aparece duas vezes e parece duplicidade. */}
                      {l.cod_conta?.includes('Intra') && (
                        <span style={{ color: colors.orange }}>intra-orçamentária · </span>
                      )}
                      {l.medida ?? (
                        <span style={{ color: colors.faint }}>não usada no painel</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <SectionLabel>Abaixo desta linha</SectionLabel>
        <div style={{ fontSize: 11.5, color: colors.muted, marginTop: 8, lineHeight: 1.6, maxWidth: 760 }}>
          Este é o último degrau navegável: abaixo dele existe apenas o JSON bruto guardado
          na ingestão. Entrega{' '}
          <span style={{ fontFamily: font.mono, color: colors.ink }}>
            {d.source_ref.versao_entrega}
          </span>{' '}
          de {d.source_ref.relatorio} · {d.source_ref.anexo}
          {d.as_of && <> · as_of {d.as_of}</>}.{' '}
          <Link to="/central-dados/fontes/siconfi_rreo" style={{ color: colors.primary }}>
            ver o endpoint de origem
          </Link>
        </div>
      </Card>
    </>
  );
}

const cabecalho = {
  fontSize: 11,
  color: colors.muted,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
};
