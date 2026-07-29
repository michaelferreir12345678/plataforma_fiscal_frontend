/**
 * Exportação de um bloco da tela (Sprint 25 — padrão transversal).
 *
 * Pergunta gerencial que responde: **"como levo este número para a reunião / para o
 * ofício ao TCE?"** — a auditoria registrou que **nenhuma página fiscal exportava**.
 *
 * Duas saídas, deliberadamente:
 * - **CSV da tabela visível**, gerado no cliente (o que está na tela, com cabeçalho de
 *   proveniência — ente, período, versão de entrega). Separador `;` e BOM UTF-8 porque
 *   o destino real é o Excel em pt-BR.
 * - **Relatório completo** (PDF/XLSX institucional) — o backend da Sprint 16 é quem
 *   sabe montar o documento; aqui só se pré-preenche modelo/ente/período.
 *
 * Não geramos ".xlsx" no cliente: um arquivo que o Excel abre com aviso não é entrega.
 */
import { Link } from 'react-router-dom';
import { colors, font } from '../theme';

export interface ExportColuna<T> {
  cabecalho: string;
  valor: (linha: T) => string | number | null | undefined;
}

interface ExportButtonProps<T> {
  /** Nome do bloco — vira o nome do arquivo e o título do CSV. */
  nome: string;
  linhas: T[];
  colunas: ExportColuna<T>[];
  /** Cabeçalho de proveniência escrito no topo do CSV. */
  contexto: { ente: string; periodo: string; fonte: string };
  /** Modelo do relatório institucional (Sprint 16) pré-selecionado no link. */
  modeloRelatorio?: string;
}

const escapar = (v: string | number | null | undefined): string => {
  if (v == null) return '';
  const texto = typeof v === 'number' ? String(v).replace('.', ',') : String(v);
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

export function montarCsv<T>(
  nome: string,
  linhas: T[],
  colunas: ExportColuna<T>[],
  contexto: { ente: string; periodo: string; fonte: string },
): string {
  const cabecalho = [
    `# ${nome}`,
    `# ente;${contexto.ente}`,
    `# periodo;${contexto.periodo}`,
    `# fonte;${contexto.fonte}`,
    `# gerado_em;${new Date().toISOString()}`,
  ];
  const corpo = [
    colunas.map((c) => escapar(c.cabecalho)).join(';'),
    ...linhas.map((l) => colunas.map((c) => escapar(c.valor(l))).join(';')),
  ];
  return [...cabecalho, ...corpo].join('\r\n');
}

export function ExportButton<T>({
  nome,
  linhas,
  colunas,
  contexto,
  modeloRelatorio = 'executivo',
}: ExportButtonProps<T>) {
  const baixar = () => {
    const csv = montarCsv(nome, linhas, colunas, contexto);
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nome.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${contexto.periodo}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Só o modelo viaja na URL: ente e período são do contexto único (Sprint 22) e mandá-los
  // de novo criaria duas fontes de verdade que podem discordar.
  const destino = `/relatorios?modelo=${modeloRelatorio}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button
        type="button"
        onClick={baixar}
        disabled={linhas.length === 0}
        title={linhas.length === 0 ? 'Sem linhas para exportar' : 'Baixar a tabela visível em CSV'}
        style={{ ...botao, opacity: linhas.length === 0 ? 0.5 : 1 }}
      >
        ↓ CSV
      </button>
      <Link to={destino} style={{ ...botao, textDecoration: 'none' }} title="Relatório institucional (PDF/XLSX) da Sprint 16">
        relatório completo
      </Link>
    </div>
  );
}

const botao = {
  border: `1px solid ${colors.border}`,
  background: colors.surface,
  borderRadius: 4,
  padding: '3px 9px',
  fontSize: 11,
  color: colors.ink,
  cursor: 'pointer',
  fontFamily: font.mono,
} as const;
