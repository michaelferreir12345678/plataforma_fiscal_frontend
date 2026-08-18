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
 * 3. A âncora só pegava quando o texto repetia `fato.valor_formatado` **caractere a
 *    caractere**. O Gemini parafraseia o mesmo número (menos casas decimais, sem separador
 *    de milhar, "aproximadamente") e o link de fonte sumia silenciosamente. Agora, além do
 *    casamento exato (preferido — zero ambiguidade), um número fiscal solto no texto que
 *    não repete `valor_formatado` é comparado ao valor **numérico** de cada fato
 *    (`fato.valor`), com tolerância de arredondamento — ver `casarNumeroTolerante`.
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

/**
 * Números fiscais soltos no texto: agrupamento de milhar com ponto (`12.345.678`, com ou
 * sem decimal), decimal com vírgula (`54,2`) ou percentual (`54%`). Deliberadamente NÃO
 * casa um inteiro solto (`42`, `2024`) — um artigo de lei ou um ano não é o tipo de token
 * que um fato representa, e um casamento largo demais criaria link de fonte para o número
 * errado.
 */
const NUMERO_FISCAL_SOURCE = '-?\\d{1,3}(?:\\.\\d{3})+(?:,\\d+)?%?|-?\\d+,\\d+%?|-?\\d+%';
const NUMERO_FISCAL_RE = new RegExp(`^(?:${NUMERO_FISCAL_SOURCE})$`);

/**
 * Carimbo de tempo ISO-8601. Entra na alternância ANTES do número para ser consumido
 * inteiro: sem isso, os segundos fracionários de `2026-08-18T04:46:13.996583Z` casam
 * `13.996` como notação de milhar, e o trecho vira um número destacado e ancorado a
 * uma fonte pelo casamento tolerante — procedência de mentira para um valor que não
 * existe. O backend mascara o mesmo padrão antes do G6
 * (`shared/tooling/verificacao.py`); os dois lados têm de continuar iguais.
 */
const TIMESTAMP_ISO_SOURCE =
  '\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d+)?)?(?:Z|[+-]\\d{2}:?\\d{2})?';

/** Converte uma string numérica em pt-BR (milhar por ponto, decimal por vírgula) em
 * `number`. Só entra em jogo quando `fato.valor` (o decimal cru) não veio preenchido. */
function numeroDePtBr(formatado: string): number | null {
  const limpo = formatado.replace(/[^\d,.\-]/g, '');
  if (!limpo) return null;
  // Ponto seguido de exatamente 3 dígitos (até o fim ou até o próximo separador) é milhar;
  // qualquer outro ponto é decimal (não deveria ocorrer em pt-BR, mas não força a leitura).
  const semMilhar = limpo.replace(/\.(?=\d{3}(?:[.,]|$))/g, '');
  const normalizado = semMilhar.replace(',', '.');
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

/**
 * Casa um token numérico do texto (ex.: "40,9%", já sem repetir `valor_formatado`) ao
 * fato mais próximo, dentro de uma tolerância derivada das próprias casas decimais do
 * token — meio dígito na última casa escrita, ou 0,5 quando o token é inteiro. Isso cobre
 * "arredondou para menos casas" e "não usou separador de milhar" sem abrir para números
 * de magnitude parecida mas realmente diferentes.
 */
function casarNumeroTolerante(
  token: string,
  numericos: readonly { valor: number; fato: AssistFato }[],
): AssistFato | null {
  const semPct = token.replace('%', '');
  const valor = numeroDePtBr(semPct);
  if (valor === null) return null;
  const casas = semPct.includes(',') ? semPct.split(',')[1].length : 0;
  const tolerancia = casas > 0 ? 0.5 * 10 ** -casas : 0.5;
  let melhor: AssistFato | null = null;
  let menorDistancia = Infinity;
  for (const candidato of numericos) {
    const distancia = Math.abs(candidato.valor - valor);
    if (distancia <= tolerancia && distancia < menorDistancia) {
      menorDistancia = distancia;
      melhor = candidato.fato;
    }
  }
  return melhor;
}

export function RespostaMarkdown({ texto, fatos = [] }: Props) {
  const porValor = new Map<string, AssistFato>();
  const numericos: { valor: number; fato: AssistFato }[] = [];
  for (const f of fatos) {
    if (!f.disponivel || !f.valor_formatado) continue;
    porValor.set(f.valor_formatado, f);
    const bruto = f.valor != null ? Number(f.valor) : numeroDePtBr(f.valor_formatado);
    if (bruto != null && Number.isFinite(bruto)) numericos.push({ valor: bruto, fato: f });
  }
  const ancoras = [...porValor.keys()].sort((a, b) => b.length - a.length);

  return <>{blocos(texto).map((b, i) => renderBloco(b, i, ancoras, porValor, numericos))}</>;
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
  numericos: readonly { valor: number; fato: AssistFato }[],
): ReactNode {
  const inline = (t: string) => renderInline(t, ancoras, porValor, numericos);
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
  numericos: readonly { valor: number; fato: AssistFato }[],
): ReactNode[] {
  const partes: string[] = [
    '\\*\\*[^*]+\\*\\*', // negrito
    '`[^`]+`', // código
    '(?<![*\\w])\\*[^*\\n]+\\*(?![*\\w])', // itálico
  ];
  if (ancoras.length) partes.unshift(ancoras.map(escapar).join('|'));
  // O carimbo de tempo vem antes do número, de propósito: alternância de regex é ordenada,
  // então ele é consumido inteiro e os seus segundos fracionários não viram "13.996".
  partes.push(TIMESTAMP_ISO_SOURCE);
  // Números fiscais soltos (paráfrase do Gemini) entram por último: o casamento exato dos
  // `ancoras` acima sempre tem prioridade na mesma posição do texto.
  if (numericos.length) partes.push(NUMERO_FISCAL_SOURCE);
  const re = new RegExp(`(${partes.join('|')})`, 'g');

  return texto.split(re).filter(Boolean).map((parte, i) => {
    const fatoExato = porValor.get(parte);
    if (fatoExato) return <NumeroAncorado key={i} fato={fatoExato} texto={parte} />;
    if (numericos.length && NUMERO_FISCAL_RE.test(parte)) {
      const fatoProximo = casarNumeroTolerante(parte, numericos);
      if (fatoProximo) return <NumeroAncorado key={i} fato={fatoProximo} texto={parte} />;
    }
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
