/**
 * Rótulo e nível de risco de uma licença — usado pelo Control Plane (Plataforma) e pelo
 * Perfil do tenant, para que os dois lugares digam exatamente a mesma coisa sobre o
 * mesmo dado (Sprint H1).
 *
 * Antes desta sprint, `PainelLicencas` mostrava `l.status` sempre que `vigente` era
 * falso — e como uma licença expirada por prazo continua com `status: 'ativa'` no
 * banco (não existe job de transição automática), o badge dizia "ATIVA" para uma
 * licença vencida. A regra correta: `vigente` manda; sem ela, só é "expirada" quando o
 * prazo já passou — senão o `status` guardado (ex.: "suspensa") continua sendo a
 * explicação certa.
 */
import type { RiskLevel } from '../theme';

export interface LicencaVigencia {
  status: string;
  vigente: boolean;
  vigencia_fim: string | null;
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** "vigente" | "expirada" | o status guardado (ex.: "suspensa"). */
export function labelDaLicenca(l: LicencaVigencia): string {
  if (l.vigente) return 'vigente';
  if (l.vigencia_fim && hojeISO() > l.vigencia_fim) return 'expirada';
  return l.status;
}

/** Nível de risco para o `StatusBadge`: folga quando vigente, atenção quando
 * suspensa ou expirada, neutro no resto (ex.: ainda não iniciada). */
export function nivelDaLicenca(l: LicencaVigencia): RiskLevel {
  if (l.vigente) return 'folga';
  const rotulo = labelDaLicenca(l);
  return rotulo === 'suspensa' || rotulo === 'expirada' ? 'atencao' : 'neutro';
}
