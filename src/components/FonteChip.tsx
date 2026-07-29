/**
 * Selo de proveniência de um bloco numérico (Sprint 25 — padrão transversal).
 *
 * Pergunta gerencial que responde: **"de onde veio este número e ele ainda vale?"**
 * Toda cifra fiscal na tela tem de dizer relatório, anexo, período, versão de entrega
 * e — quando o período exibido não é o mais recente com dado — exibir o selo de
 * defasagem. Ausência de fonte aparece como ausência, nunca como número solto.
 */
import type { ReactNode } from 'react';
import { colors, font } from '../theme';
import type { SourceRef } from '../services/backend';

export interface FonteChipProps {
  source?: SourceRef | null;
  asOf?: string | null;
  /** Período mais recente COM DADO (do contexto) — dispara o selo de defasagem. */
  ultimoPeriodo?: string | null;
  /** Complemento curto (ex.: "conciliação FPM/FUNDEB"). */
  nota?: ReactNode;
}

export function descreverFonte(source?: SourceRef | null): string {
  if (!source) return 'fonte não informada';
  return [
    source.relatorio,
    source.anexo,
    source.periodo,
    source.versao_entrega ? `v${source.versao_entrega}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function FonteChip({ source, asOf, ultimoPeriodo, nota }: FonteChipProps) {
  const periodo = source?.periodo ?? null;
  const defasado = Boolean(ultimoPeriodo && periodo && ultimoPeriodo !== periodo);

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        color: colors.faint,
        fontFamily: font.mono,
        marginTop: 8,
      }}
    >
      <span title="Relatório · anexo · período · versão de entrega">{descreverFonte(source)}</span>
      {asOf && <span title="Consulta bitemporal (as of)">· as_of {asOf}</span>}
      {nota && <span>· {nota}</span>}
      {defasado && (
        <span
          data-testid="selo-defasado"
          title={`Há dado mais recente publicado: ${ultimoPeriodo}`}
          style={{
            padding: '1px 6px',
            borderRadius: 3,
            background: colors.yellowBg,
            color: colors.yellowText,
            border: `1px solid ${colors.yellowSoft}`,
            fontWeight: 600,
          }}
        >
          defasado · último {ultimoPeriodo}
        </span>
      )}
    </div>
  );
}
