import { useState } from 'react';
import { colors, classifyCeiling } from '../theme';
import { Card } from '../components/Card';
import { SectionLabel } from '../components/SectionLabel';
import { StatusBadge } from '../components/StatusBadge';
import { pct } from '../utils/format';

const cohorts = [
  { key: 'capitais', label: 'Capitais (NE)' },
  { key: 'porte', label: 'Porte > 1M hab' },
  { key: 'pib', label: 'Faixa de PIB similar' },
  { key: 'estado', label: 'Municípios do CE' },
];

const indicadores = [
  { key: 'pessoal', label: 'Pessoal (% RCL)', ente: 52.82, mediana: 49.4, p10: 44.1, p90: 54.0, melhor: 44.1, pior: 56.2, inverse: false },
  { key: 'tributaria', label: 'Receita própria per capita', ente: 682, mediana: 540, p10: 320, p90: 980, melhor: 980, pior: 320, inverse: true },
  { key: 'invest', label: 'Investimento per capita', ente: 218, mediana: 184, p10: 90, p90: 420, melhor: 420, pior: 90, inverse: true },
];

export function BenchmarkingPage() {
  const [cohort, setCohort] = useState('capitais');
  const [indicador, setIndicador] = useState('pessoal');
  const ind = indicadores.find((i) => i.key === indicador)!;

  // posição percentil do ente
  const range = ind.p90 - ind.p10;
  const posPct = Math.max(0, Math.min(100, ((ind.ente - ind.p10) / range) * 100));

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Benchmarking">
      {/* Seletor de coorte — sempre visível no topo */}
      <Card style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px' }} pad={0}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Benchmarking &amp; Comparativos</div>
          <div style={{ fontSize: 11, color: colors.muted }}>contexto antes do número — o grupo de pares vem primeiro</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          {cohorts.map((c) => (
            <button key={c.key} onClick={() => setCohort(c.key)} style={{ padding: '7px 14px', borderRadius: 4, fontSize: 11.5, fontWeight: 500, background: cohort === c.key ? colors.primary : colors.bg, color: cohort === c.key ? colors.bg : colors.muted, border: cohort === c.key ? 'none' : `1px solid ${colors.border}` }}>
              {c.label}
            </button>
          ))}
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 6 }}>
        {indicadores.map((i) => (
          <button key={i.key} onClick={() => setIndicador(i.key)} style={{ padding: '7px 14px', borderRadius: 4, fontSize: 12, fontWeight: 500, background: indicador === i.key ? colors.accentSoft : colors.surface, color: indicador === i.key ? colors.primary : colors.muted, border: `1px solid ${indicador === i.key ? colors.primary : colors.border}` }}>
            {i.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Tira de distribuição / percentil */}
        <Card>
          <SectionLabel note="você está aqui">Posição na distribuição da coorte</SectionLabel>
          <div style={{ marginTop: 24, marginBottom: 8, position: 'relative', height: 40 }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 18, height: 6, background: `linear-gradient(90deg, ${colors.greenSoft}, ${colors.yellowSoft}, ${colors.orangeSoft}, ${colors.redSoft})`, borderRadius: 3 }} />
            {/* mediana */}
            <div style={{ position: 'absolute', left: `${((ind.mediana - ind.p10) / range) * 100}%`, top: 10, bottom: 6, width: 2, background: colors.muted }} />
            <div style={{ position: 'absolute', left: `${((ind.mediana - ind.p10) / range) * 100}%`, top: -6, transform: 'translateX(-50%)', fontSize: 9, color: colors.muted, fontWeight: 600 }}>mediana</div>
            {/* ente */}
            <div style={{ position: 'absolute', left: `${posPct}%`, top: 6, transform: 'translateX(-50%)' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: colors.primaryDeep, border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,.3)' }} />
            </div>
            <div style={{ position: 'absolute', left: `${posPct}%`, top: 28, transform: 'translateX(-50%)', fontSize: 9, color: colors.primaryDeep, fontWeight: 700, whiteSpace: 'nowrap' }}>Fortaleza</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: colors.faint, fontFamily: "'JetBrains Mono', monospace", marginTop: 18 }}>
            <span>p10 {ind.inverse ? ind.p10 : ind.p10}</span>
            <span>p90 {ind.p90}</span>
          </div>
          <div style={{ fontSize: 11, color: colors.muted, marginTop: 12, lineHeight: 1.45 }}>
            Fortaleza está {posPct > 60 ? 'acima' : 'abaixo'} da mediana da coorte neste indicador. {ind.key === 'pessoal' ? 'Em pessoal, posição mais alta = mais próximo do teto.' : 'Aqui, mais alto é melhor.'}
          </div>
        </Card>

        {/* Comparação pareada (bullet) */}
        <Card>
          <SectionLabel>Comparação pareada · ente × mediana × extremos</SectionLabel>
          {[
            { label: 'Este ente', value: ind.ente, color: colors.primaryDeep, strong: true },
            { label: 'Mediana da coorte', value: ind.mediana, color: colors.muted },
            { label: 'Melhor da coorte', value: ind.melhor, color: colors.green },
            { label: 'Pior da coorte', value: ind.pior, color: colors.red },
          ].map((r) => {
            const maxV = Math.max(ind.p90, ind.pior, ind.ente);
            return (
              <div key={r.label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11.5, fontWeight: r.strong ? 600 : 400 }}>{r.label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: r.strong ? 700 : 500 }}>{ind.key === 'pessoal' ? pct(r.value) : `R$ ${r.value}`}</span>
                </div>
                <div style={{ height: r.strong ? 14 : 10, background: colors.borderSoft, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(r.value / maxV) * 100}%`, background: r.color }} />
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Ranking com âncora */}
      <Card pad={0}>
        <div style={{ padding: '14px 16px 10px', fontSize: 13, fontWeight: 600 }}>Ranking da coorte · ancorado neste ente</div>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1fr', padding: '6px 16px', background: colors.bg, borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`, fontSize: 9.5, fontWeight: 600, color: colors.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          <div>#</div><div>Ente</div><div style={{ textAlign: 'right' }}>{ind.label}</div><div style={{ textAlign: 'center' }}>Faixa</div>
        </div>
        {[
          { pos: 1, nome: 'Recife', v: 47.2 },
          { pos: 2, nome: 'Salvador', v: 48.9 },
          { pos: 3, nome: 'Natal', v: 50.1 },
          { pos: 4, nome: 'Fortaleza', v: 52.82, anchor: true },
          { pos: 5, nome: 'São Luís', v: 53.4 },
          { pos: 6, nome: 'Maceió', v: 55.1 },
        ].map((r) => {
          const level = classifyCeiling(r.v, 48.6, 51.3, 54);
          return (
            <div key={r.nome} style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1fr', padding: '9px 16px', borderBottom: `1px solid ${colors.rowBorder}`, fontSize: 12, alignItems: 'center', background: r.anchor ? colors.accentSoft : 'transparent' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", color: colors.muted }}>{r.pos}</div>
              <div style={{ fontWeight: r.anchor ? 700 : 500 }}>{r.nome}{r.anchor && <span style={{ marginLeft: 8, fontSize: 9, color: colors.primary, fontWeight: 600 }}>● ESTE ENTE</span>}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", textAlign: 'right', fontWeight: r.anchor ? 700 : 500 }}>{pct(r.v)}</div>
              <div style={{ display: 'flex', justifyContent: 'center' }}><StatusBadge level={level} /></div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
