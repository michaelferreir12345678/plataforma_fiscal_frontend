/**
 * Converte o período canônico de RGF para o bimestre RREO equivalente.
 *
 * A dívida é apurada no RGF (quadrimestre/semestre), mas o mart de indicadores usado
 * pelo "Explique este número" é bimestral. A conversão fica explícita para que a tela
 * nunca envie o seletor RREO independente e acabe explicando outra competência.
 */
export function emBimestre(periodo: string | null | undefined): string | null {
  if (!periodo) return null;
  const match = /^(\d{4})-([BQS])(\d{1,2})$/.exec(periodo.trim().toUpperCase());
  if (!match) return null;

  const [, ano, tipo, numeroTexto] = match;
  const numero = Number(numeroTexto);
  const fator = tipo === 'B' ? 1 : tipo === 'Q' ? 2 : 3;
  const bimestre = numero * fator;
  if (!Number.isInteger(numero) || numero < 1 || bimestre > 6) return null;
  return `${ano}-B${bimestre}`;
}
