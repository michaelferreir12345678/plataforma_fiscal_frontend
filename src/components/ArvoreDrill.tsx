/**
 * Navegação hierárquica genérica (§6.1 do CLAUDE.md) — Sprint 25, transversal.
 *
 * Pergunta gerencial que responde: **"de onde exatamente vem (ou para onde vai) este
 * total?"** A auditoria (§2.4/§2.5) registrou drill preso em um nível na Receita e
 * inexistente na Despesa, embora `/arvore` já servisse a árvore inteira.
 *
 * Contrato: o pai passa um `carregar(node)` que devolve o envelope padrão; o
 * componente cuida de breadcrumb (drill UP), filhos (drill DOWN), estados e ordenação.
 * `has_children` evita ida-e-volta desnecessária ao backend.
 */
import { Link } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { colors, font } from '../theme';
import { Async, Skeleton } from './AsyncState';
import { useResource } from '../context/AppContext';
import type { DrillChild, DrillEnvelope } from '../services/backend';

export interface ColunaMedida {
  chave: string;
  rotulo: string;
  /** Formatação do valor (default: R$ milhões). */
  formato?: (v: number | null) => string;
  /** Base da barra de participação e da ordenação. */
  barra?: boolean;
  /** Coluna derivada das medidas do nó (ex.: realização = arrecadado ÷ previsto). */
  derivar?: (measures: Record<string, number | null>) => number | null;
}

interface ArvoreDrillProps {
  carregar: (node: string | null) => Promise<DrillEnvelope>;
  /** Dependências externas (ente, período, eixo) que zeram a navegação. */
  deps: unknown[];
  colunas: ColunaMedida[];
  rotuloRaiz?: string;
  vazio?: ReactNode;
  /** Notificado a cada nível carregado (o pai exporta o que está visível). */
  onNivel?: (children: DrillChild[], node: string | null) => void;
  /**
   * Destino do **fundo do drill** de um nó: a linha do relatório que o originou.
   *
   * Separado de `carregar` porque é outra natureza de navegação: descer na árvore troca o
   * nó exibido; ir à linha sai do agregado e chega ao que o ente entregou. Quem não tem
   * esse fundo simplesmente não passa a prop, e nenhum link aparece.
   */
  linkFundo?: (codigo: string) => string;
}

export function ArvoreDrill({
  carregar,
  deps,
  colunas,
  rotuloRaiz = 'Raiz',
  vazio,
  onNivel,
  linkFundo,
}: ArvoreDrillProps) {
  const [node, setNode] = useState<string | null>(null);
  // Trocar ente/período/eixo invalida o nó atual (pode não existir na nova árvore).
  const [assinatura, setAssinatura] = useState(() => JSON.stringify(deps));
  const atual = JSON.stringify(deps);
  if (atual !== assinatura) {
    setAssinatura(atual);
    setNode(null);
  }

  const res = useResource(() => carregar(node), [...deps, node]);
  const principal = colunas.find((c) => c.barra) ?? colunas[0];

  return (
    <Async res={res} skeleton={<Skeleton linhas={5} />}>
      {(env) => (
        <Nivel
          env={env}
          node={node}
          colunas={colunas}
          principal={principal}
          rotuloRaiz={rotuloRaiz}
          vazio={vazio}
          onNivel={onNivel}
          linkFundo={linkFundo}
          irPara={setNode}
        />
      )}
    </Async>
  );
}

function Nivel({
  env,
  node,
  colunas,
  principal,
  rotuloRaiz,
  vazio,
  onNivel,
  linkFundo,
  irPara,
}: {
  env: DrillEnvelope;
  node: string | null;
  colunas: ColunaMedida[];
  principal: ColunaMedida;
  rotuloRaiz: string;
  linkFundo?: (codigo: string) => string;
  vazio?: ReactNode;
  onNivel?: (children: DrillChild[], node: string | null) => void;
  irPara: (node: string | null) => void;
}) {
  useEffect(() => {
    onNivel?.(env.children, node);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env, node]);

  const total = env.children.reduce(
    (acc, c) => acc + Math.max(numero(c.measures[principal.chave]) ?? 0, 0),
    0,
  );
  const ordenados = [...env.children].sort(
    (a, b) => (numero(b.measures[principal.chave]) ?? 0) - (numero(a.measures[principal.chave]) ?? 0),
  );

  return (
    <div>
      <nav
        aria-label="Caminho da hierarquia"
        style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginBottom: 8 }}
      >
        <Crumb rotulo={rotuloRaiz} ativo={node === null} onClick={() => irPara(null)} />
        {env.breadcrumb.map((b) => (
          <span key={b.codigo} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span aria-hidden style={{ color: colors.faint, fontSize: 11 }}>›</span>
            <Crumb rotulo={b.descricao} ativo={false} onClick={() => irPara(b.codigo)} />
          </span>
        ))}
        {env.node && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span aria-hidden style={{ color: colors.faint, fontSize: 11 }}>›</span>
            <Crumb rotulo={env.node.descricao} ativo onClick={() => undefined} />
          </span>
        )}
      </nav>

      {ordenados.length === 0 ? (
        <div style={{ fontSize: 11.5, color: colors.muted, padding: '10px 0' }}>
          {vazio ?? 'Nó folha: não há desdobramento publicado neste nível.'}
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }}>Item</th>
              {colunas.map((c) => (
                <th key={c.chave} style={{ ...th, textAlign: 'right' }}>
                  {c.rotulo}
                </th>
              ))}
              <th style={{ ...th, textAlign: 'right', width: 52 }}>%</th>
            </tr>
          </thead>
          <tbody>
            {ordenados.map((c) => {
              const v = numero(c.measures[principal.chave]) ?? 0;
              const share = total > 0 ? (v / total) * 100 : 0;
              return (
                <tr key={c.codigo} style={{ borderBottom: `1px solid ${colors.rowBorder}` }}>
                  <td style={{ ...td, maxWidth: 300 }}>
                    {c.has_children ? (
                      <button type="button" onClick={() => irPara(c.codigo)} style={link} title="Abrir o nível seguinte">
                        {c.descricao} ›
                      </button>
                    ) : (
                      <span>{c.descricao}</span>
                    )}
                    {linkFundo && (
                      <Link
                        to={linkFundo(c.codigo)}
                        style={{ marginLeft: 8, fontSize: 10.5, color: colors.primary, textDecoration: 'none' }}
                        title={`Ver as linhas do relatório que produziram ${c.descricao}`}
                      >
                        linhas
                      </Link>
                    )}
                    <div style={{ height: 3, background: colors.borderSoft, borderRadius: 2, marginTop: 5, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(Math.max(share, 0), 100)}%`, background: colors.serieA }} />
                    </div>
                  </td>
                  {colunas.map((col) => (
                    <td key={col.chave} style={{ ...td, textAlign: 'right', fontFamily: font.mono }}>
                      {(col.formato ?? milhoes)(
                        col.derivar ? col.derivar(c.measures) : numero(c.measures[col.chave]),
                      )}
                    </td>
                  ))}
                  <td style={{ ...td, textAlign: 'right', fontFamily: font.mono, color: colors.muted }}>
                    {total > 0 ? `${share.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function numero(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const milhoes = (v: number | null) =>
  v == null ? '—' : `${(v / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M`;

function Crumb({ rotulo, ativo, onClick }: { rotulo: string; ativo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={ativo}
      style={{
        border: 'none',
        background: 'none',
        padding: 0,
        fontSize: 11,
        color: ativo ? colors.ink : colors.primary,
        fontWeight: ativo ? 600 : 500,
        cursor: ativo ? 'default' : 'pointer',
        textDecoration: ativo ? 'none' : 'underline',
      }}
    >
      {rotulo}
    </button>
  );
}

const th = {
  padding: '6px 4px',
  fontSize: 11,
  color: colors.faint,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  borderBottom: `1px solid ${colors.border}`,
} as const;
const td = { padding: '7px 4px' } as const;
const link = {
  border: 'none',
  background: 'none',
  padding: 0,
  fontSize: 12.5,
  color: colors.primary,
  cursor: 'pointer',
  textAlign: 'left',
} as const;
