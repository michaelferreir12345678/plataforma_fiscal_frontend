/**
 * Selo de proveniência de um bloco numérico (Sprint 25 — padrão transversal).
 *
 * Pergunta gerencial que responde: **"de onde veio este número e ele ainda vale?"**
 * Toda cifra fiscal na tela tem de dizer relatório, anexo, período, versão de entrega
 * e — quando o período exibido não é o mais recente com dado — exibir o selo de
 * defasagem. Ausência de fonte aparece como ausência, nunca como número solto.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
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

/**
 * `source.relatorio` → nó `silver.*` do grafo de lineage (Sprint D1).
 *
 * O grafo (`quality/lineage_seed.py`) nomeia os nós pela fonte silver, não pelo rótulo do
 * relatório que a UI mostra — esta é a tradução para o deep-link `?painel=lineage&no=`.
 * Só os relatórios com nó confirmado no grafo entram aqui: um mapeamento errado levaria a
 * um 404 na Central de Dados em vez de simplesmente não mostrar o link.
 */
const RELATORIO_PARA_NO_LINEAGE: Record<string, string> = {
  RREO: 'silver.siconfi_rreo',
  RGF: 'silver.siconfi_rgf',
  DCA: 'silver.siconfi_dca',
  MSC: 'silver.siconfi_msc',
  SADIPEM: 'silver.sadipem_pvl',
  CAPAG: 'silver.tesouro_capag',
  SIOPS: 'silver.siops_saude',
  SIOPE: 'silver.siope_educacao',
  'FUNDEB-FNDE': 'silver.fnde_fundeb_repasse',
  'SICONFI-ENTES': 'silver.siconfi_entes',
};

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
  const noLineage = source?.relatorio ? RELATORIO_PARA_NO_LINEAGE[source.relatorio] : undefined;

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
      {noLineage && (
        <Link
          to={`/central-dados?painel=lineage&no=${encodeURIComponent(noLineage)}`}
          style={{ color: colors.primary }}
          title="De onde vem este número, e o que quebra se a fonte falhar"
        >
          · ver linhagem
        </Link>
      )}
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
