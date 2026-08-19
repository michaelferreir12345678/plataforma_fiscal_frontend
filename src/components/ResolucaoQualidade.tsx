/**
 * O que fazer com uma verificação em falha (Sprint Q1).
 *
 * A Sprint 26 entregou a metade que detecta: o selo diz que o número não está conferido e
 * para aí. Um aviso permanente que ninguém consegue encerrar é um aviso que todos aprendem
 * a ignorar — e aí a detecção deixa de proteger qualquer coisa.
 *
 * A tela é organizada pela pergunta que decide tudo: **de quem é o número que não fechou?**
 * Cada ocorrência mostra os dois lados, a classe da causa e o porquê dela — e **só** a ação
 * que existe para aquela classe. Oferecer "reprocessar" numa divergência da fonte gastaria
 * o tempo do gestor sem mudar o resultado.
 *
 * Onde não há ação, isso é dito com todas as letras em vez de ficar um botão inerte:
 * ausência de ação é resposta, não omissão.
 */
import { useState } from 'react';
import { Async } from './AsyncState';
import { Card } from './Card';
import { SectionLabel } from './SectionLabel';
import { useResource } from '../context/AppContext';
import {
  aplicarAcaoQualidade,
  fetchMe,
  fetchOcorrenciasQualidade,
  type AcaoQualidade,
  type ClasseCausa,
  type OcorrenciaQualidade,
} from '../services/backend';
import { colors, font } from '../theme';

const ROTULO_CLASSE: Record<ClasseCausa, string> = {
  plataforma: 'Defeito nosso',
  fonte: 'Divergência na publicação do ente',
  misto: 'A apurar — nosso ou do ente',
  cobertura: 'Defasagem de origem indeterminada',
};

const COR_CLASSE: Record<ClasseCausa, string> = {
  plataforma: colors.red,
  fonte: colors.yellowText,
  misto: colors.yellowText,
  cobertura: colors.muted,
};

const ROTULO_ACAO: Record<AcaoQualidade, string> = {
  rematerializar: 'Rematerializar e reavaliar',
  verificar_na_fonte: 'Verificar na fonte',
  reingerir: 'Reingerir a entrega',
  aceitar_como_fato: 'Aceitar como fato da fonte',
};

/** O que a plataforma não pode fazer, dito por extenso — não como botão desabilitado. */
const SEM_ACAO: Record<ClasseCausa, string> = {
  plataforma: 'Já tratada.',
  fonte:
    'Não há o que reprocessar: os dois valores vêm do que o ente publicou. A correção é ' +
    'retificação na fonte, feita pelo próprio ente.',
  misto: 'Já tratada.',
  cobertura:
    'A defasagem está medida, mas não diz de quem é a falta. Verifique na fonte antes de ' +
    'reprocessar.',
};

/** O que aconteceu numa tentativa, no vocabulário da ação que a produziu.
 *
 * Cada ação grava campos diferentes: `rematerializar` deixa `status_apos`,
 * `verificar_na_fonte` deixa `resultado`/`motivo`, `reingerir` deixa `job_id`. Ler só os
 * dois primeiros mostrava "—" para metade das ações — e um histórico que afirma ter
 * havido tentativa mas nega o resultado é o que faz o gestor clicar de novo.
 */
function resumoDaTentativa(t: Record<string, unknown>): string {
  const acao = String(t.acao ?? '');
  if (acao === 'verificar_na_fonte') {
    const r = String(t.resultado ?? '');
    if (r === 'fonte_tem') return `a fonte publicou ${t.linhas_na_fonte} linha(s) para ${t.periodo_conferido} — falta nossa`;
    if (r === 'fonte_nao_tem') return `a fonte não tem ${t.periodo_conferido} — o ente não publicou`;
    if (r === 'indeterminado') return 'a consulta à fonte não completou — tente de novo';
    return String(t.motivo ?? 'consulta feita');
  }
  if (acao === 'reingerir') {
    const id = String(t.job_id ?? '');
    return id
      ? `carga enfileirada para ${t.periodo_solicitado} (job ${id.slice(0, 8)}) — assíncrona`
      : String(t.motivo ?? 'enfileirada');
  }
  if (acao === 'rematerializar') {
    const st = String(t.status_apos ?? '');
    return st === 'ok' ? 'a verificação voltou a passar' : `a verificação continuou em ${st || 'falha'}`;
  }
  if (acao === 'aceitar_como_fato') return String(t.justificativa ?? 'aceita como fato');
  return String(t.motivo ?? t.status_apos ?? '');
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : String(v);
}

export function ResolucaoQualidade({ ente }: { ente?: string }) {
  const [recarga, setRecarga] = useState(0);
  const res = useResource(
    () => fetchOcorrenciasQualidade({ ente }),
    [ente, recarga],
  );
  // Uma consulta de capacidades para o painel inteiro. Dentro de cada ocorrência seriam N
  // requisições idênticas para responder a mesma pergunta.
  const me = useResource(() => fetchMe(), []);
  const capacidades = me.data?.org_ativa?.capacidades ?? [];

  return (
    <Card pad={0}>
      <div style={{ padding: '14px 16px 6px' }}>
        <SectionLabel note="cada falha com a classe da causa e a ação que cabe a ela">
          Resolução das verificações em falha
        </SectionLabel>
      </div>
      <Async res={res}>
        {(d) =>
          d.data.length === 0 ? (
            <div style={{ padding: '12px 16px 18px', fontSize: 12, color: colors.muted }}>
              Nenhuma verificação em falha em aberto no seu escopo.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '0 16px 10px', fontSize: 11.5, color: colors.muted }}>
                {d.total} em aberto ·{' '}
                {Object.entries(d.por_classe)
                  .map(([c, n]) => `${n} ${ROTULO_CLASSE[c as ClasseCausa] ?? c}`)
                  .join(' · ')}
              </div>
              {d.data.map((o) => (
                <Ocorrencia
                  key={`${o.check_codigo}|${o.cod_ibge}|${o.periodo}`}
                  o={o}
                  capacidades={capacidades}
                  onResolvido={() => setRecarga((n) => n + 1)}
                />
              ))}
            </div>
          )
        }
      </Async>
    </Card>
  );
}

function Ocorrencia({
  o,
  capacidades,
  onResolvido,
}: {
  o: OcorrenciaQualidade;
  /** Do `fetchMe` do painel: oferecer um botão que o backend recusa com 403 é pior que
   *  não mostrá-lo — o gestor clica, falha, e passa a duvidar dos outros botões. */
  capacidades: string[];
  onResolvido: () => void;
}) {
  const [justificativa, setJustificativa] = useState('');
  const [ocupado, setOcupado] = useState<AcaoQualidade | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [desfecho, setDesfecho] = useState<string | null>(null);

  async function aplicar(acao: AcaoQualidade) {
    setOcupado(acao);
    setErro(null);
    setDesfecho(null);
    try {
      const nova = await aplicarAcaoQualidade({
        check_codigo: o.check_codigo,
        cod_ibge: o.cod_ibge ?? '',
        periodo: o.periodo,
        acao,
        justificativa: acao === 'aceitar_como_fato' ? justificativa : undefined,
      });
      // O desfecho vem do veredito REEXECUTADO, não do "apliquei a ação": uma ação que
      // não é reavaliada é uma ação que ninguém sabe se funcionou.
      const st = nova.tratativa?.status;
      setDesfecho(
        st === 'resolvida'
          ? 'A verificação voltou a passar.'
          : st === 'aceita_como_fato'
            ? 'Registrada como fato da fonte. O selo continua, agora com o motivo.'
            : 'Ação aplicada, mas a verificação continua falhando — veja o histórico.',
      );
      onResolvido();
    } catch (e) {
      setErro((e as { detail?: string; message?: string })?.detail ?? 'Falha ao aplicar a ação.');
    } finally {
      setOcupado(null);
    }
  }

  /** Capacidade exigida por ação — a mesma regra do backend, para não oferecer o que vai dar 403. */
  const capacidadeDe = (a: AcaoQualidade) =>
    a === 'aceitar_como_fato' ? 'editar' : 'administrar';

  return (
    <div style={{ borderTop: `1px solid ${colors.borderSoft}`, padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: font.mono, fontSize: 12, fontWeight: 600 }}>
          {o.check_codigo}
        </span>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: COR_CLASSE[o.classe],
          }}
        >
          {ROTULO_CLASSE[o.classe]}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.muted }}>
          {o.cod_ibge} {o.periodo ? `· ${o.periodo}` : ''}
        </span>
      </div>

      {/* Os dois lados, nomeados. É a evidência que sustenta a classe — sem ela o gestor
          teria de acreditar no rótulo. */}
      <div style={{ marginTop: 8, fontSize: 11.5, color: colors.ink }}>
        <div>
          <strong>{o.lado_esquerdo}:</strong> {fmt(o.esquerda)}
        </div>
        <div>
          <strong>{o.lado_direito}:</strong> {fmt(o.direita)}
        </div>
        <div style={{ color: colors.muted }}>
          diferença {fmt(o.diferenca)} · tolerância {fmt(o.tolerancia)}
        </div>
      </div>

      <p style={{ margin: '8px 0 0', fontSize: 11.5, color: colors.muted, lineHeight: 1.5 }}>
        {o.porque}
      </p>

      {o.tratativa && o.tratativa.tentativas.length > 0 && (
        <details style={{ marginTop: 8 }} open>
          <summary style={{ fontSize: 11, color: colors.muted, cursor: 'pointer' }}>
            {o.tratativa.tentativas.length} tentativa(s) já aplicada(s)
          </summary>
          <ul style={{ margin: '6px 0 0 16px', fontSize: 11, color: colors.muted }}>
            {o.tratativa.tentativas.map((t, i) => (
              <li key={i}>
                <strong style={{ fontWeight: 600 }}>{String(t.acao)}</strong> —{' '}
                {resumoDaTentativa(t)}
              </li>
            ))}
          </ul>
        </details>
      )}

      {o.tratativa?.justificativa && (
        <div style={{ marginTop: 8, fontSize: 11.5, color: colors.ink }}>
          <strong>Aceita como fato:</strong> {o.tratativa.justificativa}
        </div>
      )}

      {o.acoes.length === 0 ? (
        <p style={{ margin: '10px 0 0', fontSize: 11.5, color: colors.muted, lineHeight: 1.5 }}>
          {/* A conclusão do escalonamento vence o texto genérico da classe: ela diz algo
              que o backend descobriu (reprocessar não resolveu ⇒ é defeito de cálculo),
              e é mais útil que "já tratada". */}
          {(o.diagnostico?.conclusao as string | undefined) ?? SEM_ACAO[o.classe]}
        </p>
      ) : (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {o.acoes.includes('aceitar_como_fato') && (
            <label style={{ fontSize: 11.5, color: colors.muted }}>
              Justificativa (obrigatória para aceitar — o selo continua, com este motivo)
              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={2}
                style={{
                  display: 'block', width: '100%', marginTop: 4, padding: 6,
                  border: `1px solid ${colors.border}`, borderRadius: 4,
                  fontSize: 12, fontFamily: 'inherit',
                }}
              />
            </label>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {o.acoes.map((a) => {
              const cap = capacidadeDe(a);
              const permitido = capacidades.includes(cap);
              return (
                <button
                  key={a}
                  type="button"
                  disabled={!permitido || ocupado !== null}
                  onClick={() => aplicar(a)}
                  title={
                    permitido
                      ? undefined
                      : `Exige a capacidade '${cap}': esta ação altera dado compartilhado entre organizações.`
                  }
                  style={{
                    padding: '5px 11px', borderRadius: 4, fontSize: 11.5, fontWeight: 600,
                    border: `1px solid ${permitido ? colors.primary : colors.border}`,
                    background: permitido ? colors.accentSoft : colors.surface,
                    color: permitido ? colors.primary : colors.faint,
                    cursor: permitido && !ocupado ? 'pointer' : 'not-allowed',
                  }}
                >
                  {ocupado === a ? 'Aplicando…' : ROTULO_ACAO[a]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {desfecho && (
        <div style={{ marginTop: 8, fontSize: 11.5, color: colors.ink }}>{desfecho}</div>
      )}
      {erro && (
        <div style={{ marginTop: 8, fontSize: 11.5, color: colors.red }}>{erro}</div>
      )}
    </div>
  );
}
