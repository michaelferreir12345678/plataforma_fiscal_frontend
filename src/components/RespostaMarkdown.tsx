/**
 * Renderiza a resposta do assistente — que chega em **Markdown** — e ancora cada número
 * calculado ao fato que o produziu.
 *
 * Dois defeitos que isto corrige:
 *
 * 1. A resposta era exibida como texto puro (`white-space: pre-wrap`), então o gestor lia
 *    `**Despesa com Pessoal:**` e `### 1. Indicadores` com os asteriscos à mostra. O modelo
 *    escreve Markdown porque foi instruído a estruturar a resposta; quem não renderizava
 *    era a tela.
 * 2. O número destacado trazia um `title` nativo com a frase genérica "Número rastreável
 *    até a fonte" — que não diz **qual** fonte, demora ~1s para aparecer e não é alcançável
 *    por teclado. Rastreabilidade que não mostra o relatório, o anexo, o período e a versão
 *    não é rastreabilidade (§6.3): agora o número é um botão que abre a ficha do fato.
 *
 * Sem `dangerouslySetInnerHTML` e sem dependência nova: o texto vem de um LLM, e transformar
 * saída de modelo em HTML cru seria abrir injeção na tela que mais precisa ser confiável.
 */
import { useId, useState, type ReactNode } from 'react';
import { colors, font } from '../theme';
import type { AssistFato } from '../services/backend';

interface Props {
  texto: string;
  /** Fatos disponíveis: o valor formatado de cada um vira âncora clicável no texto. */
  fatos?: AssistFato[];
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function RespostaMarkdown({ texto, fatos = [] }: Props) {
  const porValor = new Map<string, AssistFato>();
  for (const f of fatos) {
    if (f.disponivel && f.valor_formatado) porValor.set(f.valor_formatado, f);
  }
  const ancoras = [...porValor.keys()].sort((a, b) => b.length - a.length);

  return <>{blocos(texto).map((b, i) => renderBloco(b, i, ancoras, porValor))}</>;
}

// --------------------------------------------------------------------------- //
// Blocos
// --------------------------------------------------------------------------- //
type Bloco =
  | { tipo: 'titulo'; nivel: number; texto: string }
  | { tipo: 'paragrafo'; texto: string }
  | { tipo: 'lista'; ordenada: boolean; itens: string[] }
  | { tipo: 'regua' };

function blocos(fonte: string): Bloco[] {
  const linhas = fonte.replace(/\r\n/g, '\n').split('\n');
  const saida: Bloco[] = [];
  let paragrafo: string[] = [];
  let lista: { ordenada: boolean; itens: string[] } | null = null;

  const fecharParagrafo = () => {
    if (paragrafo.length) {
      saida.push({ tipo: 'paragrafo', texto: paragrafo.join(' ').trim() });
      paragrafo = [];
    }
  };
  const fecharLista = () => {
    if (lista) {
      saida.push({ tipo: 'lista', ...lista });
      lista = null;
    }
  };
  const fecharTudo = () => {
    fecharParagrafo();
    fecharLista();
  };

  for (const bruta of linhas) {
    const linha = bruta.trimEnd();
    if (!linha.trim()) {
      fecharTudo();
      continue;
    }
    // Régua: --- ou *** isolados.
    if (/^\s*([-*_])\1{2,}\s*$/.test(linha)) {
      fecharTudo();
      saida.push({ tipo: 'regua' });
      continue;
    }
    const titulo = /^\s*(#{1,6})\s+(.*)$/.exec(linha);
    if (titulo) {
      fecharTudo();
      saida.push({ tipo: 'titulo', nivel: titulo[1].length, texto: titulo[2].trim() });
      continue;
    }
    // Marcador: "* item", "- item", "•  item" (o modelo usa espaçamento variável).
    const marcador = /^\s*[*\-•]\s+(.*)$/.exec(linha);
    if (marcador) {
      fecharParagrafo();
      if (!lista || lista.ordenada) {
        fecharLista();
        lista = { ordenada: false, itens: [] };
      }
      lista.itens.push(marcador[1].trim());
      continue;
    }
    const numerada = /^\s*\d+[.)]\s+(.*)$/.exec(linha);
    if (numerada) {
      fecharParagrafo();
      if (!lista || !lista.ordenada) {
        fecharLista();
        lista = { ordenada: true, itens: [] };
      }
      lista.itens.push(numerada[1].trim());
      continue;
    }
    // Continuação recuada de um item de lista pertence ao item, não a um parágrafo novo.
    if (lista && /^\s{2,}\S/.test(bruta)) {
      lista.itens[lista.itens.length - 1] += ` ${linha.trim()}`;
      continue;
    }
    fecharLista();
    paragrafo.push(linha.trim());
  }
  fecharTudo();
  return saida;
}

function renderBloco(
  b: Bloco,
  chave: number,
  ancoras: string[],
  porValor: Map<string, AssistFato>,
): ReactNode {
  const inline = (t: string) => renderInline(t, ancoras, porValor);
  switch (b.tipo) {
    case 'regua':
      return (
        <hr
          key={chave}
          style={{ border: 0, borderTop: `1px solid ${colors.borderSoft}`, margin: '12px 0' }}
        />
      );
    case 'titulo': {
      // O balão da conversa já tem título próprio; o h1 do modelo não pode competir com ele.
      const tamanho = b.nivel <= 2 ? 13.5 : 12.5;
      return (
        <div
          key={chave}
          role="heading"
          aria-level={Math.min(b.nivel + 2, 6)}
          style={{
            fontSize: tamanho,
            fontWeight: 600,
            color: colors.ink,
            margin: chave === 0 ? '0 0 6px' : '14px 0 6px',
          }}
        >
          {inline(b.texto)}
        </div>
      );
    }
    case 'lista': {
      const Tag = b.ordenada ? 'ol' : 'ul';
      return (
        <Tag
          key={chave}
          style={{ margin: '6px 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 5 }}
        >
          {b.itens.map((item, i) => (
            <li key={i} style={{ fontSize: 13, lineHeight: 1.6 }}>
              {inline(item)}
            </li>
          ))}
        </Tag>
      );
    }
    default:
      return (
        <p key={chave} style={{ fontSize: 13, lineHeight: 1.6, margin: '0 0 8px' }}>
          {inline(b.texto)}
        </p>
      );
  }
}

// --------------------------------------------------------------------------- //
// Inline: negrito, itálico, código e as âncoras de número
// --------------------------------------------------------------------------- //
function renderInline(
  texto: string,
  ancoras: string[],
  porValor: Map<string, AssistFato>,
): ReactNode[] {
  const partes: string[] = [
    '\\*\\*[^*]+\\*\\*', // negrito
    '`[^`]+`', // código
    '(?<![*\\w])\\*[^*\\n]+\\*(?![*\\w])', // itálico
  ];
  if (ancoras.length) partes.unshift(ancoras.map(escapar).join('|'));
  const re = new RegExp(`(${partes.join('|')})`, 'g');

  return texto.split(re).filter(Boolean).map((parte, i) => {
    const fato = porValor.get(parte);
    if (fato) return <NumeroAncorado key={i} fato={fato} texto={parte} />;
    if (parte.startsWith('**') && parte.endsWith('**') && parte.length > 4) {
      return (
        <strong key={i} style={{ fontWeight: 600, color: colors.ink }}>
          {parte.slice(2, -2)}
        </strong>
      );
    }
    if (parte.startsWith('`') && parte.endsWith('`') && parte.length > 2) {
      return (
        <code
          key={i}
          style={{
            fontFamily: font.mono, fontSize: 12, background: colors.bg,
            border: `1px solid ${colors.borderSoft}`, borderRadius: 3, padding: '0 3px',
          }}
        >
          {parte.slice(1, -1)}
        </code>
      );
    }
    if (parte.startsWith('*') && parte.endsWith('*') && parte.length > 2) {
      return <em key={i}>{parte.slice(1, -1)}</em>;
    }
    return <span key={i}>{parte}</span>;
  });
}

/** Número calculado: abre a ficha com o fato e a fonte, por mouse, clique ou teclado.
 *
 * Passar o mouse **mostra**; clicar **fixa** (para o gestor copiar a fonte sem a ficha
 * fugir). Um único estado faria o clique fechar o que o hover acabou de abrir. */
function NumeroAncorado({ fato, texto }: { fato: AssistFato; texto: string }) {
  const [sob, setSob] = useState(false);
  const [fixado, setFixado] = useState(false);
  const aberto = sob || fixado;
  const painelId = `fato-${useId().replace(/:/g, '')}`;
  const fonte = [
    fato.source_ref?.relatorio,
    fato.source_ref?.anexo,
    fato.source_ref?.periodo,
    fato.source_ref?.versao_entrega ? `v.${fato.source_ref.versao_entrega}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={painelId}
        aria-label={`${texto} — ${fato.rotulo}. Ver a fonte deste número.`}
        onClick={() => setFixado((v) => !v)}
        onMouseEnter={() => setSob(true)}
        onMouseLeave={() => setSob(false)}
        onFocus={() => setSob(true)}
        onBlur={() => setSob(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && fixado) {
            e.stopPropagation();
            setFixado(false);
          }
        }}
        style={{
          fontFamily: font.mono, fontWeight: 600, fontSize: 'inherit',
          color: colors.primary, background: colors.accentSoft,
          padding: '0 4px', borderRadius: 3, border: 0,
          borderBottom: `1px dashed ${colors.primary}`, cursor: 'help',
        }}
      >
        {texto}
      </button>
      {aberto && (
        <span
          id={painelId}
          role="tooltip"
          style={{
            position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, zIndex: 30,
            minWidth: 230, maxWidth: 330, textAlign: 'left',
            background: colors.surface, border: `1px solid ${colors.border}`,
            borderRadius: 5, padding: '8px 10px',
            boxShadow: '0 8px 24px rgba(15,26,20,0.14)',
            display: 'flex', flexDirection: 'column', gap: 3,
          }}
        >
          <span style={{ fontSize: 11.5, fontWeight: 600, color: colors.ink }}>{fato.rotulo}</span>
          <span style={{ fontSize: 12, fontFamily: font.mono, color: colors.primary }}>
            {fato.valor_formatado}
            {fato.faixa ? ` · faixa ${fato.faixa}` : ''}
          </span>
          <span style={{ fontSize: 10.5, color: colors.faint, fontFamily: font.mono, lineHeight: 1.5 }}>
            {fonte || 'fonte não informada'}
          </span>
          {fato.as_of && (
            <span style={{ fontSize: 10.5, color: colors.faint }}>
              as_of {new Date(fato.as_of).toLocaleDateString('pt-BR')}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
