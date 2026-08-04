/**
 * Declara, no cabeçalho da página, para quantos entes ela de fato responde.
 *
 * O achado que motivou isto: os mínimos constitucionais estão apurados para **1** ente
 * contra 180 com RREO ingerido, e a página de Saúde & Educação abria para qualquer um sem
 * dizer isso. Quem via "sem dado para este ente" concluía que o **ente** não entregou —
 * quando o que falta é a nossa carga. As duas leituras levam a ações opostas: uma faz
 * cobrar o setor contábil do município, a outra faz cobrar a plataforma.
 *
 * **Silencioso quando a cobertura é boa.** Um selo que aparece em todas as páginas vira
 * moldura e deixa de ser lido justamente onde importa. Aqui ele só se manifesta quando há
 * o que declarar: lacuna de carga, ou este ente sem dado num escopo que tem.
 */
import { useState } from 'react';
import { useResource } from '../context/AppContext';
import { fetchCoberturaPagina, type CoberturaPagina } from '../services/backend';
import { rotuloIndicador } from '../utils/rotulos';
import { colors, font } from '../theme';

export function SeloCobertura({
  pagina,
  ente,
  periodo,
}: {
  pagina: string;
  ente: string;
  periodo?: string;
}) {
  const res = useResource(
    () => fetchCoberturaPagina(pagina, ente, periodo),
    [pagina, ente, periodo],
  );
  const [aberto, setAberto] = useState(false);
  const d = res.data;

  // Erro aqui não vira selo vermelho: a cobertura é informação sobre a informação, e
  // alarmar por causa dela desviaria a atenção do dado que a página está mostrando.
  if (!d) return null;

  const temLacuna = d.lacunas.length > 0;
  const enteSemDado = !d.ente.tem_dado && d.escopo.entes_com_dado > 0;
  if (!temLacuna && !enteSemDado) return null;

  const tom = temLacuna ? colors.orange : colors.muted;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          background: 'transparent',
          border: `1px solid ${tom}`,
          borderRadius: 4,
          padding: '3px 9px',
          fontSize: 11,
          color: tom,
          cursor: 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        <span aria-hidden>ⓘ</span>
        <span>
          Responde para{' '}
          <strong style={{ fontFamily: font.mono }}>
            {d.escopo.entes_com_dado} de {d.escopo.entes_no_escopo}
          </strong>{' '}
          entes do seu escopo
        </span>
        <span aria-hidden style={{ opacity: 0.7 }}>{aberto ? '▴' : '▾'}</span>
      </button>

      {aberto && (
        <div
          role="note"
          style={{
            fontSize: 11.5,
            lineHeight: 1.6,
            color: colors.ink,
            background: colors.bg,
            border: `1px solid ${colors.borderSoft}`,
            borderRadius: 5,
            padding: '10px 12px',
            maxWidth: 760,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {d.observacao && <div>{d.observacao}</div>}
          {d.indicadores.length > 0 && (
            <Lista
              titulo="Indicadores desta página"
              itens={d.indicadores.map((i) => ({
                rotulo: rotuloIndicador(i.indicador),
                n: i.entes_com_dado,
                periodo: i.periodo_mais_recente,
                alerta: d.lacunas.includes(i.indicador),
              }))}
              total={d.escopo.entes_no_escopo}
            />
          )}
          {d.fontes.length > 0 && (
            <Lista
              titulo="Fontes que a alimentam"
              itens={d.fontes.map((f) => ({
                rotulo: f.descricao ?? f.fonte,
                n: f.entes_com_dado,
                periodo: f.periodo_mais_recente,
                alerta: false,
              }))}
              total={d.escopo.entes_no_escopo}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Lista({
  titulo,
  itens,
  total,
}: {
  titulo: string;
  itens: { rotulo: string; n: number; periodo: string | null; alerta: boolean }[];
  total: number;
}) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {titulo}
      </div>
      <table style={{ borderCollapse: 'collapse', fontSize: 11.5, width: '100%' }}>
        <caption className="sr-only">{titulo}: cobertura dentro do seu escopo</caption>
        <thead>
          <tr style={{ color: colors.muted, textAlign: 'left' }}>
            <th scope="col" style={{ fontWeight: 400, padding: '2px 10px 2px 0' }}>Item</th>
            <th scope="col" style={{ fontWeight: 400, padding: '2px 10px 2px 0', textAlign: 'right' }}>Entes</th>
            <th scope="col" style={{ fontWeight: 400, padding: '2px 0' }}>Até</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((i) => (
            <tr key={i.rotulo}>
              <th scope="row" style={{ fontWeight: 400, padding: '2px 10px 2px 0', color: i.alerta ? colors.orange : colors.ink }}>
                {i.rotulo}
              </th>
              <td style={{ padding: '2px 10px 2px 0', textAlign: 'right', fontFamily: font.mono, color: i.alerta ? colors.orange : colors.ink }}>
                {i.n}/{total}
              </td>
              <td style={{ padding: '2px 0', color: colors.muted, fontFamily: font.mono }}>
                {i.periodo ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type { CoberturaPagina };
