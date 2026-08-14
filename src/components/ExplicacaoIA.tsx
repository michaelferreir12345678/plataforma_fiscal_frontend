/**
 * Superfície única da **IA nas telas** (Sprint IA-5).
 *
 * Pergunta gerencial que responde: **"o que este número/esta fila/este relatório está me
 * dizendo, e com base em quê?"** — sem sair da tela e sem recontextualizar a pergunta no
 * Assistente.
 *
 * Quatro decisões que valem para as quatro capacidades:
 *
 * 1. **A chamada é sob demanda.** Nada de IA carregando junto com a página: o gestor abre
 *    quando quer, e a organização só paga o que pediu. A ficha é explícita em que o ponto
 *    de uso sai se não for usado — e o que não é chamado não aparece em `op.ia_tool_call`.
 * 2. **Ausência não vira prosa vaga.** Quando o backend responde `disponivel: false`, a
 *    tela mostra a ausência **declarada** (o motivo e o que fazer), não um parágrafo
 *    genérico. É a mesma regra da plataforma inteira: ausência aparece como ausência.
 * 3. **A fonte fica visível.** Cada nota diz de onde saiu, cada número tem chip de fonte
 *    e o texto passa pelo `RespostaMarkdown`, que ancora o número no fato que o produziu.
 * 4. **O aviso do G6 não pode ser escondido.** Quando a verificação sinaliza um número sem
 *    lastro, a tela mostra o aviso em destaque — além de o próprio texto já trazê-lo.
 */
import { useCallback, useEffect, useId, useState } from 'react';
import { colors, font } from '../theme';
import { Dialog } from './Dialog';
import { ErrorBox, Loading } from './AsyncState';
import { FonteChip } from './FonteChip';
import { RespostaMarkdown } from './RespostaMarkdown';
import type { InsightResposta } from '../services/backend';
import { ApiError } from '../services/api';

export interface ExplicacaoIAProps {
  /** Rótulo do botão que abre a explicação. */
  rotulo: string;
  /** Título do diálogo (fallback enquanto a resposta não chegou). */
  titulo: string;
  /** Descrição acessível do botão — diz o que será explicado, não só "explicar". */
  descricao: string;
  /** Chamada que produz a explicação. Só dispara quando o diálogo abre. */
  carregar: () => Promise<InsightResposta>;
  /** Estilo do gatilho: `discreto` (padrão) ou `destaque`. */
  variante?: 'discreto' | 'destaque';
}

export function ExplicacaoIA({
  rotulo,
  titulo,
  descricao,
  carregar,
  variante = 'discreto',
}: ExplicacaoIAProps) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label={descricao}
        style={variante === 'destaque' ? gatilhoDestaque : gatilho}
      >
        <span aria-hidden="true">✳ </span>
        {rotulo}
      </button>
      {aberto && (
        <Dialog title={titulo} onClose={() => setAberto(false)} width={820}>
          <ConteudoExplicacao carregar={carregar} />
        </Dialog>
      )}
    </>
  );
}

function ConteudoExplicacao({ carregar }: { carregar: () => Promise<InsightResposta> }) {
  const [dado, setDado] = useState<InsightResposta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  /** Extras RFC 7807 do backend: o "por quê" da ausência, quando ele existe. */
  const [explicacao, setExplicacao] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [tentativa, setTentativa] = useState(0);
  const recarregar = useCallback(() => setTentativa((n) => n + 1), []);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro(null);
    setExplicacao(null);
    setDado(null);
    carregar()
      .then((d) => {
        if (vivo) setDado(d);
      })
      .catch((e: unknown) => {
        if (!vivo) return;
        if (e instanceof ApiError) setExplicacao(e.title ?? null);
        setErro(
          (e as { detail?: string; message?: string })?.detail ||
            (e as { message?: string })?.message ||
            'Não foi possível gerar a explicação.',
        );
      })
      .finally(() => {
        if (vivo) setCarregando(false);
      });
    return () => {
      vivo = false;
    };
    // `carregar` é recriada a cada render do pai; a dependência é a tentativa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tentativa]);

  if (carregando) return <Loading label="Consultando as fontes da plataforma…" />;
  if (erro) return <ErrorBox message={erro} explicacao={explicacao} onRetry={recarregar} />;
  if (!dado) return null;
  return <Explicacao dado={dado} />;
}

export function Explicacao({ dado }: { dado: InsightResposta }) {
  const idPergunta = useId();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p id={idPergunta} style={perguntaEstilo}>
        <span style={{ color: colors.faint }}>Pergunta respondida: </span>
        {dado.pergunta}
      </p>

      {dado.disponivel ? (
        <RespostaMarkdown texto={dado.resposta} fatos={dado.fatos} />
      ) : (
        <div role="status" style={ausenciaEstilo}>
          <strong style={{ display: 'block', marginBottom: 4 }}>Dado ausente — declarado</strong>
          {dado.ausencia ?? dado.resposta}
        </div>
      )}

      {dado.verificacao && dado.verificacao.status !== 'ok' && (
        <div role="alert" style={avisoEstilo}>
          <strong>Verificação automática (G6).</strong> Estes valores aparecem no texto mas
          não correspondem a nenhum número devolvido pelas fontes desta consulta:{' '}
          {dado.verificacao.sem_lastro.join(', ')}. Não os utilize para decidir.
        </div>
      )}

      {dado.notas.length > 0 && (
        <section aria-label="O que a plataforma apurou">
          {dado.notas.map((nota) => (
            <div key={nota.titulo} style={{ marginBottom: 10 }}>
              <h4 style={tituloNota}>{nota.titulo}</h4>
              <ul style={listaNota}>
                {nota.linhas.map((linha) => (
                  <li key={linha} style={{ marginBottom: 2 }}>
                    {linha}
                  </li>
                ))}
              </ul>
              {nota.origem && <span style={origemNota}>fonte: {nota.origem}</span>}
            </div>
          ))}
        </section>
      )}

      {dado.dados_incompletos.length > 0 && (
        <section aria-label="Dados incompletos declarados">
          <h4 style={tituloNota}>Lacunas declaradas</h4>
          <ul style={listaNota}>
            {dado.dados_incompletos.map((item) => (
              <li key={`${item.tipo}-${item.codigo}`}>{item.mensagem}</li>
            ))}
          </ul>
        </section>
      )}

      {dado.source_refs.length > 0 && (
        <section aria-label="Fontes desta explicação">
          <h4 style={tituloNota}>Fontes</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {dado.source_refs.map((source, indice) => (
              <FonteChip
                key={`${source.relatorio}-${source.anexo ?? ''}-${source.periodo ?? ''}-${indice}`}
                source={source}
                asOf={dado.as_of}
              />
            ))}
          </div>
        </section>
      )}

      <p style={rodape}>
        {dado.disponivel
          ? `Prosa composta por ${dado.uso.modelo}; os números vêm das ferramentas da plataforma.`
          : 'Nenhum modelo de linguagem foi acionado: sem dado apurado, a plataforma não estima.'}
        {dado.ferramentas.length > 0 && ` Ferramentas consultadas: ${dado.ferramentas.join(', ')}.`}
      </p>
    </div>
  );
}

const gatilho = {
  border: `1px solid ${colors.border}`,
  background: colors.surface,
  borderRadius: 4,
  padding: '3px 9px',
  fontSize: 11,
  color: colors.ink,
  cursor: 'pointer',
  fontFamily: font.mono,
} as const;

const gatilhoDestaque = {
  ...gatilho,
  background: colors.accentSoft,
  borderColor: colors.greenSoft,
  color: colors.primaryDeep,
} as const;

const perguntaEstilo = {
  margin: 0,
  fontSize: 11.5,
  color: colors.muted,
  fontFamily: font.mono,
} as const;

const ausenciaEstilo = {
  background: colors.neutralBg,
  border: `1px solid ${colors.neutralSoft}`,
  borderRadius: 6,
  padding: '10px 12px',
  fontSize: 12.5,
  color: colors.ink,
  lineHeight: 1.5,
} as const;

const avisoEstilo = {
  background: colors.yellowBg,
  border: `1px solid ${colors.yellowSoft}`,
  borderRadius: 6,
  padding: '10px 12px',
  fontSize: 12.5,
  color: colors.yellowText,
  lineHeight: 1.5,
} as const;

const tituloNota = {
  margin: '0 0 4px',
  fontSize: 11,
  letterSpacing: 0.4,
  textTransform: 'uppercase',
  color: colors.faint,
  fontFamily: font.mono,
} as const;

const listaNota = {
  margin: 0,
  paddingLeft: 18,
  fontSize: 12.5,
  color: colors.ink,
  lineHeight: 1.5,
} as const;

const origemNota = {
  fontSize: 10.5,
  color: colors.faint,
  fontFamily: font.mono,
} as const;

const rodape = {
  margin: 0,
  fontSize: 10.5,
  color: colors.faint,
  fontFamily: font.mono,
  lineHeight: 1.5,
} as const;
