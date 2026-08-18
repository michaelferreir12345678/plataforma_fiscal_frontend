/**
 * O que a plataforma está fazendo enquanto a IA não respondeu.
 *
 * A espera é real e longa — medido contra o `gemini-3.5-flash` em produção: p50 de ~13 s,
 * p95 de ~39 s. Uma única frase parada por 40 segundos parece travamento, e o gestor
 * clica de novo ou desiste.
 *
 * **O que aqui é verdade e o que é estimativa** — a distinção importa numa plataforma que
 * recusa tela inventando número:
 *
 * - A **ordem** das etapas é real e determinística. O serviço faz, nesta sequência:
 *   valida escopo/licença → recupera indicadores já calculados e dispositivos normativos →
 *   chama o modelo (que pode pedir ferramentas em laço) → casa cada número da prosa contra
 *   o lastro (G6). Nenhuma etapa listada aqui deixa de acontecer.
 * - O **momento** de cada troca é estimado a partir da latência medida. Por isso o texto
 *   nunca afirma que uma etapa terminou — descreve o que está em curso.
 * - O **tempo decorrido** é medido, não estimado, e é ele que dá a sensação de movimento
 *   honesta: um número que anda não pode ser confundido com uma animação decorativa.
 *
 * Progresso de verdade (etapa reportada pelo servidor) exigiria stream ou um id de
 * requisição gerado no cliente para consultar `op.ia_tool_call` durante a chamada. Fica
 * como evolução; enquanto não existe, esta tela não finge tê-lo.
 */
import { useEffect, useState } from 'react';
import { colors } from '../theme';
import { IconeIA } from './MarcaIA';

interface Etapa {
  /** Segundos decorridos a partir dos quais esta etapa passa a ser a provável. */
  desde: number;
  texto: string;
}

/** Calibrado pela latência medida em produção (p50 ~13 s, p95 ~39 s). */
const ETAPAS: Etapa[] = [
  { desde: 0, texto: 'Conferindo o seu escopo e a licença do ente' },
  { desde: 2, texto: 'Recuperando os indicadores já calculados do ente' },
  { desde: 5, texto: 'Recuperando os dispositivos normativos aplicáveis' },
  { desde: 9, texto: 'Consultando as ferramentas da plataforma' },
  { desde: 16, texto: 'Redigindo a resposta com base no que foi recuperado' },
  { desde: 30, texto: 'Ainda redigindo — respostas com análise levam mais tempo' },
  { desde: 55, texto: 'A resposta está demorando mais que o habitual' },
];

export function ProgressoIA({ rotuloInicial }: { rotuloInicial?: string }) {
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    const inicio = Date.now();
    const id = window.setInterval(
      () => setSegundos(Math.floor((Date.now() - inicio) / 1000)),
      1000,
    );
    return () => window.clearInterval(id);
  }, []);

  const etapa = [...ETAPAS].reverse().find((e) => segundos >= e.desde) ?? ETAPAS[0];
  const texto = segundos < 1 && rotuloInicial ? rotuloInicial : etapa.texto;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fade-in"
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        color: colors.muted,
        fontSize: 12,
        paddingLeft: 42,
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          animation: 'pulse-soft 1.6s ease-in-out infinite',
        }}
      >
        <IconeIA size={13} cor={colors.primary} />
      </span>
      <span>{texto}…</span>
      {/* O contador é o único número aqui, e é medido. Fora da região `aria-live` do
          texto para não fazer o leitor de tela reanunciar a cada segundo. */}
      <span
        aria-hidden
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: colors.faint,
        }}
      >
        {segundos}s
      </span>
    </div>
  );
}
