import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, font } from '../theme';
import { Card } from '../components/Card';
import { SectionLabel } from '../components/SectionLabel';
import { Async } from '../components/AsyncState';
import { useApp, useResource } from '../context/AppContext';
import {
  fetchAlertas,
  fetchCalendario,
  fetchCarteiraAlertas,
  patchAlerta,
  type AlertaOut,
  type AlertaSeveridade,
  type CalendarioResponse,
  type FilaAlertasResponse,
  type CarteiraAlertasResponse,
} from '../services/backend';

const SEV: Record<AlertaSeveridade, { color: string; bg: string; label: string }> = {
  critico: { color: colors.red, bg: colors.redBg, label: 'Crítico' },
  atencao: { color: colors.orange, bg: colors.orangeBg, label: 'Atenção' },
  informativo: { color: colors.neutral, bg: colors.neutralBg, label: 'Informativo' },
};

const CAT_LABEL: Record<string, string> = {
  limite: 'Limite legal',
  prazo: 'Prazo',
  defasagem_fonte: 'Defasagem de fonte',
  publicacao: 'Nova publicação',
  preditivo: 'Preditivo',
  anomalia: 'Anomalia',
};

const STATUS_CAL: Record<string, { color: string; bg: string }> = {
  entregue: { color: colors.green, bg: colors.greenBg },
  pendente: { color: colors.neutral, bg: colors.neutralBg },
  atrasado: { color: colors.red, bg: colors.redBg },
};

export function AlertasPage() {
  const { ente } = useApp();
  const [escopo, setEscopo] = useState<'ente' | 'carteira'>('ente');

  const fila = useResource<FilaAlertasResponse>(
    () => fetchAlertas(ente.cod_ibge, escopo),
    [ente.cod_ibge, escopo],
  );
  const calendario = useResource<CalendarioResponse>(
    () => fetchCalendario(ente.cod_ibge),
    [ente.cod_ibge],
  );
  const carteira = useResource<CarteiraAlertasResponse | null>(
    () => (escopo === 'carteira' ? fetchCarteiraAlertas() : Promise.resolve(null)),
    [escopo],
  );

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Alertas e Conformidade">
      <Card style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px' }} pad={0}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Alertas &amp; Conformidade</div>
          <div style={{ fontSize: 11, color: colors.muted, fontFamily: font.mono }}>
            vigilância ativa · prazos sensíveis ao porte · motor preditivo (Sprint 14)
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {(['ente', 'carteira'] as const).map((e) => (
          <button key={e} onClick={() => setEscopo(e)} style={{ padding: '6px 14px', borderRadius: 4, fontSize: 12, fontWeight: 500, background: escopo === e ? colors.primary : colors.surface, color: escopo === e ? colors.bg : colors.muted, border: escopo === e ? 'none' : `1px solid ${colors.border}` }}>
            {e === 'ente' ? 'Este ente' : 'Carteira'}
          </button>
        ))}
      </Card>

      <Async res={fila}>
        {(data) => (
          <>
            <Contadores c={data.contadores} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <SectionLabel note="crítico → atenção → informativo">
                  Central de alertas · fila priorizada {escopo === 'carteira' ? '· carteira' : ''}
                </SectionLabel>
                {data.alertas.length === 0 && (
                  <Card><span style={{ fontSize: 12, color: colors.muted }}>Nenhum alerta ativo no escopo. Fonte: dado real do SICONFI.</span></Card>
                )}
                {data.alertas.map((a) => (
                  <AlertaCard key={a.id} a={a} onChanged={fila.reload} />
                ))}

                {escopo === 'carteira' && (
                  <Async res={carteira}>
                    {(c) => (c ? <CarteiraAgg c={c} /> : null)}
                  </Async>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Async res={calendario}>{(cal) => <Calendario cal={cal} />}</Async>
              </div>
            </div>
          </>
        )}
      </Async>
    </div>
  );
}

function Contadores({ c }: { c: { critico: number; atencao: number; informativo: number } }) {
  const cells: { n: number; label: string; sev: AlertaSeveridade }[] = [
    { n: c.critico, label: 'Crítico', sev: 'critico' },
    { n: c.atencao, label: 'Atenção', sev: 'atencao' },
    { n: c.informativo, label: 'Informativo', sev: 'informativo' },
  ];
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {cells.map((x) => (
        <div key={x.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: SEV[x.sev].bg, borderRadius: 5 }}>
          <span style={{ fontFamily: font.mono, fontSize: 18, fontWeight: 600, color: SEV[x.sev].color }}>{x.n}</span>
          <span style={{ fontSize: 11, color: SEV[x.sev].color, fontWeight: 600 }}>{x.label}</span>
        </div>
      ))}
    </div>
  );
}

function AlertaCard({ a, onChanged }: { a: AlertaOut; onChanged: () => void }) {
  const navigate = useNavigate();
  const sev = SEV[a.severidade];
  const [busy, setBusy] = useState(false);

  async function mudar(status: 'reconhecida' | 'descartada') {
    setBusy(true);
    try {
      await patchAlerta(a.id, status);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card pad={0} style={{ borderLeft: `3px solid ${sev.color}` }}>
      <div style={{ display: 'flex', gap: 14, padding: '14px 16px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 3, fontWeight: 600, background: sev.bg, color: sev.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{sev.label}</span>
            <span style={{ fontSize: 10.5, color: colors.faint, fontFamily: font.mono }}>{CAT_LABEL[a.categoria] ?? a.categoria}</span>
            {a.status !== 'nova' && <span style={{ fontSize: 10, color: colors.muted, fontStyle: 'italic' }}>· {a.status}</span>}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>{a.titulo}</div>
          <div style={{ fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 1.45 }}>{a.acao_sugerida}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, padding: '9px 12px', background: colors.bg, borderRadius: 4 }}>
            <div style={{ fontSize: 11.5, lineHeight: 1.45 }}>
              <b style={{ color: colors.ink }}>Base legal</b> — <span style={{ color: colors.muted }}>{a.motivo_legal}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0, minWidth: 150 }}>
          {a.prazo && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Prazo</div>
              <div style={{ fontFamily: font.mono, fontSize: 15, fontWeight: 600, color: sev.color }}>{new Date(a.prazo).toLocaleDateString('pt-BR')}</div>
            </div>
          )}
          {a.link && (
            <button onClick={() => navigate(a.link!)} style={{ padding: '7px 12px', background: sev.color, color: '#fff', border: 'none', borderRadius: 4, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>
              Investigar →
            </button>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <button disabled={busy} onClick={() => mudar('reconhecida')} style={miniBtn}>Reconhecer</button>
            <button disabled={busy} onClick={() => mudar('descartada')} style={miniBtn}>Descartar</button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Calendario({ cal }: { cal: CalendarioResponse }) {
  return (
    <Card>
      <div style={{ fontSize: 13, fontWeight: 600 }}>Calendário de obrigações</div>
      <div style={{ fontSize: 10.5, color: colors.muted, marginBottom: 10 }}>
        RGF {cal.periodicidade_rgf} · porte {cal.populacao ? cal.populacao.toLocaleString('pt-BR') + ' hab.' : '—'}
      </div>
      {cal.itens.map((o, i) => {
        const sc = STATUS_CAL[o.status] ?? STATUS_CAL.pendente;
        return (
          <div key={`${o.relatorio}-${o.periodo}`} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: i < cal.itens.length - 1 ? `1px solid ${colors.rowBorder}` : 'none' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500 }}>{o.relatorio} · {o.periodo}</div>
              <div style={{ fontSize: 10.5, color: colors.faint }}>
                {o.periodicidade}{o.prazo ? ` · prazo ${new Date(o.prazo).toLocaleDateString('pt-BR')}` : ''}
              </div>
            </div>
            <span style={{ alignSelf: 'center', fontSize: 9.5, padding: '2px 8px', borderRadius: 3, fontWeight: 600, background: sc.bg, color: sc.color, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{o.status}</span>
          </div>
        );
      })}
    </Card>
  );
}

function CarteiraAgg({ c }: { c: CarteiraAlertasResponse }) {
  const navigate = useNavigate();
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Agregados · carteira</div>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: colors.muted, fontFamily: font.mono }}>{c.n_entes} entes monitorados</span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {c.por_categoria.map((k) => (
          <span key={k.categoria} style={{ fontSize: 11, padding: '4px 10px', background: colors.neutralBg, borderRadius: 4, color: colors.ink }}>
            {CAT_LABEL[k.categoria] ?? k.categoria}: <b>{k.total}</b>
          </span>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
        {c.por_ente.map((e) => {
          const sev = e.pior_severidade ? SEV[e.pior_severidade as AlertaSeveridade] : SEV.informativo;
          return (
            <button key={e.cod_ibge} onClick={() => navigate('/carteira')} style={{ textAlign: 'left', border: `1px solid ${colors.border}`, borderRadius: 5, padding: 12, borderLeft: `3px solid ${sev.color}` }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{e.nome ?? e.cod_ibge}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, fontFamily: font.mono, fontSize: 11 }}>
                <span style={{ color: colors.red }}>{e.contadores.critico}C</span>
                <span style={{ color: colors.orange }}>{e.contadores.atencao}A</span>
                <span style={{ color: colors.neutral }}>{e.contadores.informativo}I</span>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

const miniBtn: React.CSSProperties = {
  padding: '5px 9px',
  fontSize: 10.5,
  fontWeight: 600,
  background: colors.surface,
  color: colors.muted,
  border: `1px solid ${colors.border}`,
  borderRadius: 4,
  cursor: 'pointer',
};
