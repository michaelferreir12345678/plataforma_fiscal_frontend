/**
 * Selo de qualidade do dado exibido (Sprint 26).
 *
 * Pergunta gerencial que responde: **"posso levar este número para a reunião?"**
 *
 * A regra do produto é mostrar o dado mesmo quando há problema — esconder seria pior,
 * porque o gestor precisa saber o que existe. Mas apresentá-lo como se estivesse
 * conferido, quando uma verificação está em falha, é apresentar meia verdade. O selo é o
 * meio-termo honesto: o número aparece, com a ressalva ao lado e o caminho para ver a
 * conta que não fechou.
 *
 * Silencioso quando está tudo certo: um selo verde em toda tela vira ruído e ensina o
 * usuário a ignorar selos — inclusive o vermelho.
 */
import { Link } from 'react-router-dom';
import { colors, font } from '../theme';
import { useApp, useResource } from '../context/AppContext';
import { fetchCockpit, type ChecagemAberta } from '../services/backend';

export function SeloQualidade({
  checks,
  ente,
  periodo,
}: {
  checks: ChecagemAberta[] | undefined | null;
  /** Ente/período da tela — Sprint D1: o link "ver a conta que não fechou" chega na
   * Central de Dados já filtrado, em vez de o gestor procurar de novo no escopo inteiro. */
  ente?: string | null;
  periodo?: string | null;
}) {
  const abertos = checks ?? [];
  const falhas = abertos.filter((c) => c.status === 'falha');
  // Aviso sozinho (ex.: fonte não ingerida) não sela o número: não há divergência
  // apurada, e alarmar por ausência treinaria o gestor a ignorar o selo.
  if (falhas.length === 0) return null;

  const destino = new URLSearchParams({ painel: 'qualidade' });
  if (ente) destino.set('ente', ente);
  if (periodo) destino.set('periodo', periodo);

  return (
    <div
      data-testid="selo-qualidade"
      role="status"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '8px 11px',
        borderRadius: 5,
        background: colors.redBg,
        border: `1px solid ${colors.redSoft}`,
      }}
    >
      <span style={{ color: colors.red, fontWeight: 700, lineHeight: 1.3 }}>!</span>
      <div style={{ fontSize: 11, color: colors.ink, lineHeight: 1.5 }}>
        <strong style={{ color: colors.red }}>
          {falhas.length === 1
            ? 'Uma verificação de qualidade em falha'
            : `${falhas.length} verificações de qualidade em falha`}{' '}
          sobre estes números.
        </strong>{' '}
        {falhas.slice(0, 2).map((c) => (
          <span key={c.check_codigo} style={{ fontFamily: font.mono, fontSize: 11 }}>
            {c.rotulo}
            {c.diferenca != null ? ` (Δ ${Number(c.diferenca).toLocaleString('pt-BR', { maximumFractionDigits: 2 })})` : ''}
            {'; '}
          </span>
        ))}
        <Link to={`/central-dados?${destino.toString()}`} style={{ color: colors.primary, fontWeight: 600 }}>
          ver a conta que não fechou
        </Link>
        .
      </div>
    </div>
  );
}

/**
 * Versão auto-suficiente para as páginas de detalhe: busca a camada de qualidade do
 * ente/período do contexto e sela — uma linha por página, sem cada tela reimplementar
 * a consulta. Silencioso enquanto não há falha (inclusive enquanto carrega).
 */
export function SeloQualidadePagina({ periodo: periodoProp }: { periodo?: string } = {}) {
  const { ente, periodo: periodoRreo } = useApp();
  // **O período tem de ser o da página.** Sem a prop, o selo consultava sempre o período
  // RREO — inclusive em Pessoal, Dívida e Caixa, que exibem RGF. O gestor via um selo de
  // qualidade que atestava outro período que não o da tela.
  const periodo = periodoProp || periodoRreo;
  const res = useResource(
    () => fetchCockpit(ente.cod_ibge, periodo),
    [ente.cod_ibge, periodo],
  );
  // **Falha de rede não pode parecer "tudo certo".** `if (!res.data) return null` fazia
  // erro e ausência de divergência produzirem exatamente a mesma tela: nada. Quem não
  // consegue verificar precisa saber que não verificou.
  if (res.error) {
    return (
      <div
        role="status"
        style={{
          fontSize: 11,
          color: colors.muted,
          border: `1px solid ${colors.borderSoft}`,
          borderRadius: 4,
          padding: '3px 9px',
          alignSelf: 'flex-start',
        }}
      >
        <span aria-hidden>ⓘ </span>
        não foi possível verificar a qualidade deste dado
      </div>
    );
  }
  if (!res.data) return null;
  return <SeloQualidade checks={res.data.qualidade.checks_abertos} ente={ente.cod_ibge} periodo={periodo} />;
}
