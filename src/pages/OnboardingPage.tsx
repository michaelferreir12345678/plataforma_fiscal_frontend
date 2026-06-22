import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../theme';
import { Icon } from '../components/Icon';

type Org = 'prefeitura' | 'estado' | 'consultoria';

const stepDefs = [
  { num: 1, title: 'Tipo de organização', subtitle: 'define a visão padrão' },
  { num: 2, title: 'Identificação do ente', subtitle: 'busca ou carteira em lote' },
  { num: 3, title: 'Contexto fiscal', subtitle: 'os tetos legais aplicáveis' },
  { num: 4, title: 'Diagnóstico de dados', subtitle: 'completude no SICONFI' },
];

const entesByOrg: Record<Org, { sigla: string; name: string; ibge: string; pop: string; esfera: string }[]> = {
  prefeitura: [{ sigla: 'FOR', name: 'Fortaleza, CE', ibge: '2304400', pop: '2.703.391', esfera: 'Municipal' }],
  estado: [{ sigla: 'CE', name: 'Estado do Ceará', ibge: '23', pop: '9.240.580', esfera: 'Estadual' }],
  consultoria: [
    { sigla: 'FOR', name: 'Fortaleza, CE', ibge: '2304400', pop: '2.703.391', esfera: 'Municipal' },
    { sigla: 'CAU', name: 'Caucaia, CE', ibge: '2303709', pop: '362.223', esfera: 'Municipal' },
    { sigla: 'JUA', name: 'Juazeiro do Norte, CE', ibge: '2307304', pop: '278.264', esfera: 'Municipal' },
  ],
};

const diag = [
  { d: 'RREO', p: '2025 · 2º bim', c: colors.green, s: 'Em dia', det: 'homologado em 30/05' },
  { d: 'RGF', p: '2025 · 1º quad', c: colors.green, s: 'Em dia', det: '2º quad vence em 9 dias' },
  { d: 'DCA', p: '2024', c: colors.green, s: 'Homologado', det: 'balanço anual completo' },
  { d: 'MSC', p: 'Set/2024', c: colors.orange, s: 'Retificada', det: 'reenvio sob análise' },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [org, setOrg] = useState<Org>('prefeitura');

  const next = () => setStep((s) => Math.min(4, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));
  const finish = () => navigate(org === 'prefeitura' ? '/dashboard' : '/carteira');
  const entryLabel = org === 'prefeitura' ? 'Dashboard' : 'Painel de Carteira';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', height: '100vh', minHeight: 820, minWidth: 1100, background: colors.bg, color: colors.ink }}>
      {/* RAIL */}
      <aside style={{ background: colors.primaryDeep, color: '#B8BFB8', padding: '32px 28px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 44 }}>
          <div style={{ width: 20, height: 20, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 3, height: 2, background: colors.orange }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: 8, height: 8, background: colors.bg }} />
            <div style={{ position: 'absolute', left: 2, right: 2, top: 16, height: 2, background: colors.bg, opacity: 0.4 }} />
          </div>
          <div style={{ fontWeight: 600, fontSize: 19, color: colors.bg, letterSpacing: '-0.01em' }}>erário</div>
        </div>
        <div style={{ fontSize: 11, color: '#6B7770', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 20 }}>Configuração da conta</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {stepDefs.map((s, i) => {
            const done = s.num < step;
            const active = s.num === step;
            return (
              <div key={s.num} style={{ display: 'flex', gap: 14, padding: '10px 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", background: done ? colors.green : active ? colors.orange : 'transparent', color: done || active ? '#fff' : '#6B7770', border: `1.5px solid ${done ? colors.green : active ? colors.orange : '#3A4A40'}` }}>
                    {done ? '✓' : s.num}
                  </div>
                  {i < stepDefs.length - 1 && <div style={{ width: 1.5, flex: 1, minHeight: 18, background: done ? colors.green : '#2A3830', marginTop: 4 }} />}
                </div>
                <div style={{ paddingTop: 2 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: done || active ? colors.bg : colors.faint }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: '#6B7770', marginTop: 2 }}>{s.subtitle}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: 14, background: '#1A2820', borderRadius: 6, border: '1px solid #2A3830' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Icon size={14} stroke="#E0A040"><path d="M8 1.5l5.5 2v4c0 4-2.5 6-5.5 7-3-1-5.5-3-5.5-7v-4l5.5-2z" /><path d="M8 5.5v3M8 11v0.1" /></Icon>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#E0A040' }}>Por que confirmar?</div>
          </div>
          <div style={{ fontSize: 11, lineHeight: 1.5, color: '#9AA39C' }}>Os parâmetros desta etapa <span style={{ color: colors.bg }}>determinam todos os limites legais</span> calculados depois.</div>
        </div>
      </aside>

      {/* CONTENT */}
      <main style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div className="fade-in" key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '56px 64px', maxWidth: 960 }}>
          <div style={{ fontSize: 11, color: colors.faint, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Passo {step} de 4{step === 3 ? ' · crítico' : ''}</div>

          {step === 1 && (
            <>
              <H1>Que tipo de organização você representa?</H1>
              <P>Esta escolha define a visão padrão do produto e quais limites legais se aplicam.</P>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {([
                  ['prefeitura', 'Prefeitura', 'Um município olhando para a própria saúde fiscal. Entra no Dashboard.', 'M3 20h18M5 20V9l7-5 7 5v11M9 20v-5h6v5'],
                  ['estado', 'Governo Estadual', 'Sefaz monitorando o estado e todos os municípios. Entra na Visão Estadual.', 'M3 21h18M5 21V8h4v13M15 21V8h4v13M9 21V4h6v17'],
                  ['consultoria', 'Consultoria / Associação', 'Monitorando vários municípios. Monta uma carteira.', 'M8 8a3 3 0 100-6 3 3 0 000 6zM2 20c0-3.3 2.7-6 6-6M15 10a2.5 2.5 0 100-5 2.5 2.5 0 000 5z'],
                ] as const).map(([k, t, d, icon]) => {
                  const sel = org === k;
                  return (
                    <button key={k} onClick={() => setOrg(k)} style={{ textAlign: 'left', padding: 22, borderRadius: 8, border: sel ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`, background: sel ? '#F4F8F5' : colors.surface }}>
                      <div style={{ width: 44, height: 44, borderRadius: 8, background: colors.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                        <Icon size={24} viewBox="0 0 24 24" stroke={colors.primary} sw={1.6}><path d={icon} /></Icon>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{t}</div>
                      <div style={{ fontSize: 12.5, color: colors.muted, marginTop: 6, lineHeight: 1.45 }}>{d}</div>
                      {sel && (
                        <div style={{ display: 'flex', marginTop: 14, alignItems: 'center', gap: 6, color: colors.primary }}>
                          <Icon size={16} stroke={colors.primary} sw={1.8}><circle cx="8" cy="8" r="7" /><path d="M5 8l2 2 4-4" /></Icon>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>Selecionado</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <H1>{org === 'consultoria' ? 'Monte sua carteira de municípios' : org === 'estado' ? 'Confirme o ente estadual' : 'Identifique o ente'}</H1>
              <P>{org === 'consultoria' ? 'Adicione os municípios que deseja monitorar — busca individual ou importação em lote.' : 'Confirme o ente já vinculado ao seu cadastro no SICONFI.'}</P>
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <input type="text" placeholder="Buscar por nome ou código IBGE…" style={{ fontSize: 14, padding: '12px 14px 12px 40px', border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.surface, width: '100%', color: colors.ink }} />
                <Icon size={16} stroke={colors.faint} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></Icon>
              </div>
              <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: colors.bg, borderBottom: `1px solid ${colors.border}` }}>
                  <span style={{ fontSize: 11, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{org === 'consultoria' ? 'Carteira (3 entes)' : 'Ente vinculado'}</span>
                  <span style={{ fontSize: 11, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>pré-preenchido pelo SICONFI</span>
                </div>
                {entesByOrg[org].map((e) => (
                  <div key={e.ibge} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: `1px solid ${colors.rowBorder}` }}>
                    <div style={{ width: 34, height: 34, borderRadius: 5, background: colors.primaryGrad, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{e.sigla}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{e.name}</div>
                      <div style={{ fontSize: 11.5, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>IBGE {e.ibge} · {e.pop} hab · {e.esfera}</div>
                    </div>
                    <Icon size={20} viewBox="0 0 20 20" stroke={colors.primary} sw={1.8}><circle cx="10" cy="10" r="8.5" /><path d="M6.5 10l2.5 2.5 4.5-5" /></Icon>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <H1>Confirme o contexto fiscal de Fortaleza</H1>
              <P>Pré-preenchemos pelo cadastro SICONFI. <b style={{ color: colors.ink }}>Cada parâmetro muda os limites legais</b> mostrados em todo o produto.</P>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  ['Esfera', 'define os tetos de Pessoal e DCL', ['Municipal', 'Estadual'], 0, 'Pessoal Exec. 54% · DCL 120% · Saúde 15%'],
                  ['Porte populacional', 'define o calendário de RGF', null, null, 'RGF quadrimestral (3 publicações/ano)'],
                  ['Regime previdenciário próprio', 'altera exclusões da base de pessoal', ['Sim · tem RPPS', 'Não (RGPS)'], 0, 'Inativos do RPPS excluídos da despesa líquida'],
                ].map(([label, sub, opts, selIdx, impact]) => (
                  <div key={label as string} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '16px 18px', display: 'grid', gridTemplateColumns: '200px 1fr 240px', gap: 18, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                      <div style={{ fontSize: 11, color: colors.faint, marginTop: 2 }}>{sub}</div>
                    </div>
                    <div>
                      {opts ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          {(opts as string[]).map((o, i) => (
                            <div key={o} style={{ padding: '8px 16px', borderRadius: 5, background: i === selIdx ? colors.primary : colors.bg, color: i === selIdx ? colors.bg : colors.faint, fontSize: 13, fontWeight: i === selIdx ? 500 : 400, border: i === selIdx ? 'none' : `1px solid ${colors.border}` }}>{o}</div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 600 }}>2.703.391 hab</span>
                          <span style={{ fontSize: 11, padding: '3px 9px', background: colors.accentSoft, color: colors.primary, borderRadius: 3, fontWeight: 600 }}>≥ 50 mil</span>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: colors.muted, lineHeight: 1.5, background: colors.bg, padding: '8px 10px', borderRadius: 4 }}>{impact}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <H1>Diagnóstico de dados no SICONFI</H1>
              <P>Antes de confiar nos painéis, veja a completude das entregas do ente. Lacunas afetam a precisão dos indicadores.</P>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                {diag.map((d) => (
                  <div key={d.d} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 16, borderTop: `3px solid ${d.c}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{d.d}</span>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.c }} />
                    </div>
                    <div style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>{d.p}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: d.c, marginTop: 12 }}>{d.s}</div>
                    <div style={{ fontSize: 11, color: colors.faint, marginTop: 6, lineHeight: 1.4 }}>{d.det}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, padding: '16px 18px', background: colors.yellowBg, borderLeft: `3px solid ${colors.yellow}`, borderRadius: 6 }}>
                <Icon size={18} stroke={colors.yellowText} style={{ flexShrink: 0 }}><path d="M8 1.5L15 14H1z" /><path d="M8 6v3.5M8 11.5v0.1" /></Icon>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: '#6B5A2E' }}><b style={{ color: '#9A7B2E' }}>2 pendências detectadas.</b> A MSC de set/2024 foi retificada e o RGF do 2º quadrimestre vence em 9 dias. Indicadores que dependem desses dados aparecerão como provisórios até a regularização.</div>
              </div>
            </>
          )}

          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', justifyContent: step === 1 ? 'flex-end' : 'space-between', alignItems: 'center', paddingTop: 36 }}>
            {step > 1 && (
              <button onClick={back} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px', color: colors.muted, border: `1px solid ${colors.border}`, borderRadius: 5, fontSize: 14, fontWeight: 500 }}>
                <Icon size={14} sw={1.8}><path d="M13 8H3M7 4L3 8l4 4" /></Icon>
                Voltar
              </button>
            )}
            {step < 4 ? (
              <button onClick={next} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', background: colors.primary, color: colors.bg, borderRadius: 5, fontSize: 14, fontWeight: 500 }}>
                {step === 3 ? 'Confirmar contexto' : 'Continuar'}
                <Icon size={14} stroke={colors.bg} sw={1.8}><path d="M3 8h10M9 4l4 4-4 4" /></Icon>
              </button>
            ) : (
              <button onClick={finish} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 26px', background: colors.primary, color: colors.bg, borderRadius: 5, fontSize: 14.5, fontWeight: 600 }}>
                Entrar no {entryLabel}
                <Icon size={15} stroke={colors.bg} sw={1.8}><path d="M3 8h10M9 4l4 4-4 4" /></Icon>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function H1({ children }: { children: React.ReactNode }) {
  return <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', margin: '8px 0 6px' }}>{children}</h1>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 14, color: colors.muted, margin: '0 0 32px', lineHeight: 1.5 }}>{children}</p>;
}
