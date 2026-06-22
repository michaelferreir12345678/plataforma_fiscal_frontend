import { useState } from 'react';
import { colors } from '../theme';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';

type Tab = 'organizacao' | 'usuarios' | 'permissoes' | 'carteira' | 'faturamento' | 'integracoes' | 'auditoria';

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'organizacao', label: 'Organização', icon: 'M3 14V6l5-3 5 3v8M6 14V9h4v5' },
  { key: 'usuarios', label: 'Usuários & perfis', icon: 'M6 6a2 2 0 104 0 2 2 0 00-4 0M3 13c0-2 1.5-3.2 3-3.2M13 13c0-2-1.5-3.2-3-3.2' },
  { key: 'permissoes', label: 'Permissões (RBAC)', icon: 'M8 2l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V4z' },
  { key: 'carteira', label: 'Gestão de carteira', icon: 'M2 4h12v9H2zM2 7h12M6 4v9' },
  { key: 'faturamento', label: 'Faturamento', icon: 'M2 4h12v8H2zM2 7h12M4 10h3' },
  { key: 'integracoes', label: 'Integrações & dados', icon: 'M5 8a3 3 0 013-3M11 8a3 3 0 01-3 3M8 2v2M8 12v2' },
  { key: 'auditoria', label: 'Auditoria & segurança', icon: 'M8 2l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V4zM6 8l1.5 1.5L10 7' },
];

const usuarios = [
  { nome: 'Marina Vasconcelos', email: 'marina.v@sefin.fortaleza', papel: 'Secretária de Finanças', escopo: 'Toda a organização', status: 'Ativo', ultimo: 'agora', ini: 'MV', sc: colors.green, sbg: colors.greenBg },
  { nome: 'Carlos Tavares', email: 'carlos.t@sefin.fortaleza', papel: 'Contador', escopo: 'Pessoal · Dívida · Resultado', status: 'Ativo', ultimo: 'há 12 min', ini: 'CT', sc: colors.green, sbg: colors.greenBg },
  { nome: 'Beatriz Lima', email: 'beatriz.l@sefin.fortaleza', papel: 'Controladora', escopo: 'Conformidade · Auditoria', status: 'Ativo', ultimo: 'há 2 h', ini: 'BL', sc: colors.green, sbg: colors.greenBg },
  { nome: 'Rafael Nunes', email: 'rafael.n@sefin.fortaleza', papel: 'Técnico de Planejamento', escopo: 'Previsões · Receita · Despesa', status: 'Ativo', ultimo: 'ontem', ini: 'RN', sc: colors.green, sbg: colors.greenBg },
  { nome: 'Gabinete do Prefeito', email: 'gabinete@fortaleza.ce.gov', papel: 'Leitura / Gabinete', escopo: 'Dashboard · leitura', status: 'Ativo', ultimo: 'há 3 dias', ini: 'GP', sc: colors.green, sbg: colors.greenBg },
  { nome: 'portal.transparencia@…', email: 'convite enviado em 14/06', papel: 'Leitura / Transparência', escopo: '—', status: 'Convite pendente', ultimo: '—', ini: 'PT', sc: colors.yellowText, sbg: colors.yellowBg },
];

const roles = ['Secretário', 'Contador', 'Controlador', 'Técnico', 'Gabinete', 'Leitura'];
const caps: { cap: string; vals: ('full' | 'view' | 'none')[] }[] = [
  { cap: 'Visualizar painéis', vals: ['full', 'full', 'full', 'full', 'view', 'view'] },
  { cap: 'Exportar relatórios', vals: ['full', 'full', 'full', 'full', 'view', 'none'] },
  { cap: 'Configurar alertas', vals: ['full', 'full', 'full', 'view', 'none', 'none'] },
  { cap: 'Usar Assistente de IA', vals: ['full', 'full', 'full', 'full', 'view', 'none'] },
  { cap: 'Gerir carteira', vals: ['full', 'none', 'view', 'none', 'none', 'none'] },
  { cap: 'Administrar usuários', vals: ['full', 'none', 'none', 'none', 'none', 'none'] },
  { cap: 'Faturamento & contrato', vals: ['full', 'none', 'view', 'none', 'none', 'none'] },
];

const carteira = [
  { name: 'Fortaleza', grupo: 'RMF', tags: ['capital'], resp: 'Marina V.', ass: 'Ativa', sigla: 'FOR' },
  { name: 'Caucaia', grupo: 'RMF', tags: ['metropolitana'], resp: 'Rafael N.', ass: 'Ativa', sigla: 'CAU' },
  { name: 'Maracanaú', grupo: 'RMF', tags: ['metropolitana'], resp: 'Rafael N.', ass: 'Ativa', sigla: 'MAR' },
  { name: 'Juazeiro do Norte', grupo: 'Cariri', tags: ['interior'], resp: 'Carlos T.', ass: 'Ativa', sigla: 'JUA' },
  { name: 'Crato', grupo: 'Cariri', tags: ['interior'], resp: 'Carlos T.', ass: 'Renovar', sigla: 'CRA' },
  { name: 'Sobral', grupo: 'Norte', tags: ['interior', 'polo'], resp: 'Beatriz L.', ass: 'Ativa', sigla: 'SOB' },
];

const integracoes = [
  { fonte: 'SICONFI (STN)', desc: 'RREO · RGF · DCA · MSC — fonte primária', status: 'Sincronizado', sc: colors.green, ultimo: 'há 12 min', on: true, core: true },
  { fonte: 'SADIPEM', desc: 'Dívida e operações de crédito', status: 'Sincronizado', sc: colors.green, ultimo: 'há 1 dia', on: true, core: false },
  { fonte: 'SIOPE / SIOPS', desc: 'Mínimos de Educação e Saúde', status: 'Sincronizado', sc: colors.green, ultimo: 'há 6 h', on: true, core: false },
  { fonte: 'Transferências constitucionais', desc: 'FPM · FUNDEB · cota-parte ICMS', status: 'Sincronizado', sc: colors.green, ultimo: 'há 2 h', on: true, core: false },
  { fonte: 'Índices econômicos', desc: 'IPCA · Selic · projeções (BCB)', status: 'Atualização semanal', sc: colors.neutral, ultimo: 'há 3 dias', on: true, core: false },
  { fonte: 'CAPAG (Tesouro)', desc: 'Capacidade de pagamento — anual', status: 'Desativado', sc: colors.faint, ultimo: '—', on: false, core: false },
];

const audit = [
  { ts: '19/06 09:42', user: 'Marina V.', acao: 'Concedeu papel Contador a Carlos Tavares', tipo: 'Permissão', c: colors.orange, bg: colors.orangeBg },
  { ts: '19/06 09:15', user: 'Rafael N.', acao: 'Exportou relatório "Resultado Fiscal 2º bim" (PDF)', tipo: 'Exportação', c: colors.neutral, bg: colors.neutralBg },
  { ts: '18/06 17:30', user: 'Beatriz L.', acao: 'Alterou limiar do alerta de Pessoal para 95%', tipo: 'Config. alerta', c: colors.neutral, bg: colors.neutralBg },
  { ts: '18/06 14:02', user: 'Marina V.', acao: 'Adicionou Sobral à carteira (grupo Norte)', tipo: 'Carteira', c: colors.primary, bg: colors.accentSoft },
  { ts: '17/06 11:48', user: 'sistema', acao: 'Sincronização SICONFI concluída · 184 entes', tipo: 'Dados', c: colors.neutral, bg: colors.neutralBg },
  { ts: '17/06 08:30', user: 'Carlos T.', acao: 'Login · 2FA verificado (TOTP)', tipo: 'Acesso', c: colors.green, bg: colors.greenBg },
];

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('organizacao');

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-screen-label="Administração">
      <Card style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px' }} pad={0}>
        <div style={{ width: 40, height: 40, borderRadius: 6, background: colors.primaryGrad, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={22} stroke={colors.bg}><path d="M8 2l5 2.5v3.5c0 3-2 5-5 6-3-1-5-3-5-6V4.5z" /><circle cx="8" cy="7" r="1.6" /><path d="M5.5 11c0-1.4 1.1-2.2 2.5-2.2s2.5.8 2.5 2.2" /></Icon>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Administração &amp; Configurações</div>
          <div style={{ fontSize: 11, color: colors.muted, fontFamily: "'JetBrains Mono', monospace" }}>governança multi-tenant · quem vê o quê é segurança, não conveniência</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', border: '1px solid #C7E5D5', background: colors.greenBg, borderRadius: 4 }}>
          <Icon size={14} stroke={colors.green}><path d="M8 2l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V4z" /><path d="M5.5 8l1.7 1.7L10.5 6.5" /></Icon>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 11, fontWeight: 600 }}>Tenant isolado</div>
            <div style={{ fontSize: 9.5, color: colors.green, fontFamily: "'JetBrains Mono', monospace" }}>escopo não vaza entre orgs</div>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12, alignItems: 'start' }}>
        {/* sub-tabs */}
        <Card pad={8} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {tabs.map((t) => {
            const a = t.key === tab;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 5, textAlign: 'left', background: a ? colors.surface : 'transparent', color: a ? colors.ink : colors.muted, border: `1px solid ${a ? colors.border : 'transparent'}`, boxShadow: a ? '0 1px 2px rgba(15,26,20,.06)' : 'none' }}>
                <Icon size={15}><path d={t.icon} /></Icon>
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>{t.label}</span>
              </button>
            );
          })}
        </Card>

        {/* conteúdo */}
        <div style={{ minWidth: 0 }}>
          {tab === 'organizacao' && <Organizacao />}
          {tab === 'usuarios' && <Usuarios />}
          {tab === 'permissoes' && <Permissoes />}
          {tab === 'carteira' && <Carteira />}
          {tab === 'faturamento' && <Faturamento />}
          {tab === 'integracoes' && <Integracoes />}
          {tab === 'auditoria' && <Auditoria />}
        </div>
      </div>
    </div>
  );
}

function Organizacao() {
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card style={{ padding: 18 }} pad={0}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 8, background: colors.primaryGrad, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600 }}>FOR</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 17, fontWeight: 600 }}>Prefeitura de Fortaleza</div>
              <span style={{ fontSize: 10, padding: '3px 9px', background: colors.accentSoft, color: colors.primary, borderRadius: 3, fontWeight: 600, letterSpacing: '0.04em' }}>CONTA · PREFEITURA</span>
            </div>
            <div style={{ fontSize: 11.5, color: colors.muted, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>CNPJ 07.954.605/0001-60 · esfera Municipal · porte ≥ 50 mil · com RPPS</div>
            <div style={{ fontSize: 11, color: colors.faint, marginTop: 8, lineHeight: 1.45 }}>O tipo de conta determina as funcionalidades disponíveis e a lógica de cobrança. Esfera e porte regem o cálculo de todos os limites.</div>
          </div>
          <button style={{ padding: '8px 14px', border: `1px solid ${colors.border}`, borderRadius: 5, fontSize: 12, fontWeight: 500, color: colors.primary }}>Editar contexto fiscal</button>
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          ['Plano vigente', 'Ente · Pro', 'vigência por exercício 2025', colors.primary],
          ['Assentos', '5 / 8', '3 disponíveis', undefined],
          ['Relatórios · mês', '42', 'ilimitado no plano', undefined],
          ['Consultas IA · mês', '318 / 500', '64% da cota', undefined],
        ].map(([l, v, s, accent]) => (
          <Card key={l as string} pad={14} accent={accent as string | undefined}>
            <div style={{ fontSize: 9.5, color: colors.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{l}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 600, marginTop: 4 }}>{v}</div>
            <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>{s}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Usuarios() {
  return (
    <Card pad={0} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${colors.border}` }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Usuários &amp; perfis</div>
          <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>papel + escopo · todo acesso é auditável</div>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: colors.primary, color: colors.bg, borderRadius: 5, fontSize: 12, fontWeight: 500 }}>
          <Icon size={13} stroke={colors.bg} sw={1.6}><path d="M8 3v10M3 8h10" /></Icon>
          Convidar usuário
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.3fr 1.4fr 0.9fr 0.7fr', padding: '7px 18px', background: colors.bg, borderBottom: `1px solid ${colors.border}`, fontSize: 9.5, fontWeight: 600, color: colors.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        <div>Usuário</div><div>Papel</div><div>Escopo</div><div>Status</div><div style={{ textAlign: 'right' }}>Último acesso</div>
      </div>
      {usuarios.map((u) => (
        <div key={u.nome} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.3fr 1.4fr 0.9fr 0.7fr', padding: '10px 18px', borderBottom: `1px solid ${colors.rowBorder}`, alignItems: 'center', fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: colors.accentSoft, color: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 600, flexShrink: 0 }}>{u.ini}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nome}</div>
              <div style={{ fontSize: 10, color: colors.faint, fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
            </div>
          </div>
          <div style={{ fontWeight: 500 }}>{u.papel}</div>
          <div style={{ fontSize: 11, color: colors.muted }}>{u.escopo}</div>
          <div><span style={{ fontSize: 9.5, padding: '2px 8px', borderRadius: 3, fontWeight: 600, background: u.sbg, color: u.sc, letterSpacing: '0.04em' }}>{u.status}</span></div>
          <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: colors.muted }}>{u.ultimo}</div>
        </div>
      ))}
    </Card>
  );
}

function Permissoes() {
  const cell = (v: 'full' | 'view' | 'none') =>
    v === 'full'
      ? { bg: colors.accentSoft, c: colors.primary, d: 'M4 8l2.5 2.5L12 5' }
      : v === 'view'
        ? { bg: colors.yellowBg, c: colors.yellowText, d: 'M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z' }
        : { bg: colors.bg, c: '#C5C0B4', d: 'M4 4l8 8M12 4l-8 8' };
  return (
    <Card className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Matriz de permissões · papel × capacidade</div>
        <span style={{ fontSize: 8.5, padding: '1px 6px', background: colors.accentSoft, color: colors.primary, borderRadius: 2, fontWeight: 600 }}>RBAC</span>
      </div>
      <div style={{ fontSize: 10.5, color: colors.muted, marginBottom: 16 }}>granular e auditável · coerente com tipo de conta e nível de visão</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, minWidth: 640 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 9.5, color: colors.faint, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600, borderBottom: `1px solid ${colors.border}` }}>Capacidade</th>
              {roles.map((r) => (
                <th key={r} style={{ textAlign: 'center', padding: '8px 6px', fontSize: 9.5, color: colors.muted, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600, borderBottom: `1px solid ${colors.border}` }}>{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {caps.map((c) => (
              <tr key={c.cap} style={{ borderBottom: `1px solid ${colors.rowBorder}` }}>
                <td style={{ padding: '8px 10px', fontWeight: 500 }}>{c.cap}</td>
                {c.vals.map((v, i) => {
                  const cl = cell(v);
                  return (
                    <td key={i} style={{ padding: 6, textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 5, background: cl.bg }}>
                        <Icon size={13} stroke={cl.c} sw={1.7}><path d={cl.d} /></Icon>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Carteira() {
  return (
    <Card pad={0} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${colors.border}` }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Gestão de carteira</div>
          <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>entes acompanhados · grupos, tags, responsáveis e ações em lote</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: 5, fontSize: 12, fontWeight: 500, color: colors.muted }}>Ações em lote</button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: colors.primary, color: colors.bg, borderRadius: 5, fontSize: 12, fontWeight: 500 }}>
            <Icon size={13} stroke={colors.bg} sw={1.6}><path d="M8 3v10M3 8h10" /></Icon>
            Adicionar ente
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.9fr 1.2fr 1.1fr 0.9fr', padding: '7px 18px', background: colors.bg, borderBottom: `1px solid ${colors.border}`, fontSize: 9.5, fontWeight: 600, color: colors.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        <div>Ente</div><div>Grupo</div><div>Tags</div><div>Responsável</div><div style={{ textAlign: 'center' }}>Assinatura</div>
      </div>
      {carteira.map((e) => (
        <div key={e.name} style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.9fr 1.2fr 1.1fr 0.9fr', padding: '9px 18px', borderBottom: `1px solid ${colors.rowBorder}`, alignItems: 'center', fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 28, height: 28, borderRadius: 5, background: colors.accentSoft, color: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 600 }}>{e.sigla}</div>
            <span style={{ fontWeight: 500 }}>{e.name}</span>
          </div>
          <div><span style={{ fontSize: 10, padding: '2px 8px', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 3, color: colors.muted, fontWeight: 500 }}>{e.grupo}</span></div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {e.tags.map((t) => (
              <span key={t} style={{ fontSize: 9.5, padding: '2px 7px', background: colors.accentSoft, color: '#2D5A47', borderRadius: 3 }}>{t}</span>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: colors.muted }}>{e.resp}</div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span style={{ fontSize: 9.5, padding: '2px 8px', borderRadius: 3, fontWeight: 600, background: e.ass === 'Ativa' ? colors.greenBg : colors.yellowBg, color: e.ass === 'Ativa' ? colors.green : colors.yellowText, letterSpacing: '0.04em' }}>{e.ass}</span>
          </div>
        </div>
      ))}
    </Card>
  );
}

function Faturamento() {
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Plano &amp; métrica de cobrança</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 600 }}>R$ 4.800</span>
            <span style={{ fontSize: 11, color: colors.muted }}>/ exercício · por ente</span>
          </div>
          <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 4 }}>métrica de cobrança: <b style={{ color: colors.primary }}>por ente monitorado</b></div>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${colors.borderSoft}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[['Plano Ente · Pro (anual)', 'R$ 4.800,00'], ['Assentos adicionais (0)', 'R$ 0,00']].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                <span style={{ color: colors.muted }}>{l}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, paddingTop: 8, borderTop: `1px solid ${colors.borderSoft}` }}>
              <span>Total · exercício 2025</span><span style={{ fontFamily: "'JetBrains Mono', monospace" }}>R$ 4.800,00</span>
            </div>
          </div>
        </Card>
        <Card style={{ border: '1px solid #E8B53A' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Icon size={14} stroke={colors.yellowText}><path d="M3 6l5-3 5 3v7H3zM6 13V9h4v4" /></Icon>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Compra pública</div>
            <span style={{ fontSize: 8.5, padding: '1px 6px', background: colors.yellowBg, color: colors.yellowText, borderRadius: 2, fontWeight: 600, letterSpacing: '0.04em' }}>SETOR PÚBLICO</span>
          </div>
          <div style={{ fontSize: 10.5, color: colors.muted, marginBottom: 14 }}>empenho, contrato e vigência por exercício</div>
          {[['Nota de empenho', '2025NE000842'], ['Contrato / processo', 'CT-118/2025 · Pregão 44/2025'], ['Vigência', '01/01 — 31/12/2025']].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: colors.bg, borderRadius: 4, marginBottom: 8 }}>
              <span style={{ fontSize: 11.5, color: colors.muted }}>{l}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </Card>
      </div>
      <Card pad={0}>
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${colors.border}`, fontSize: 13, fontWeight: 600 }}>Faturas</div>
        {[['NF-e 1842 · empenho ago', '15/08/2025', 'R$ 2.400,00', 'PAGA', colors.green, colors.greenBg], ['NF-e 2103 · empenho fev', '15/02/2026', 'R$ 2.400,00', 'AGENDADA', colors.yellowText, colors.yellowBg]].map((r) => (
          <div key={r[0]} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.8fr', padding: '10px 18px', borderBottom: `1px solid ${colors.rowBorder}`, alignItems: 'center', fontSize: 12 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>{r[0]}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", color: colors.muted }}>{r[1]}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>{r[2]}</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}><span style={{ fontSize: 9.5, padding: '2px 8px', borderRadius: 3, fontWeight: 600, background: r[5] as string, color: r[4] as string }}>{r[3]}</span></div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function Integracoes() {
  return (
    <Card pad={0} className="fade-in">
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Integrações &amp; dados</div>
        <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>fontes e política de sincronização · SICONFI é a fonte primária</div>
      </div>
      {integracoes.map((i) => (
        <div key={i.fonte} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: `1px solid ${colors.rowBorder}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{i.fonte}</span>
              {i.core && <span style={{ fontSize: 8.5, padding: '1px 6px', background: colors.accentSoft, color: colors.primary, borderRadius: 2, fontWeight: 600, letterSpacing: '0.04em' }}>PRIMÁRIA</span>}
            </div>
            <div style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{i.desc}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11.5, fontWeight: 500, color: i.sc }}>{i.status}</div>
            <div style={{ fontSize: 10, color: colors.faint, fontFamily: "'JetBrains Mono', monospace" }}>{i.ultimo}</div>
          </div>
          <div style={{ position: 'relative', width: 34, height: 19, borderRadius: 10, background: i.on ? colors.primary : '#DAD6CA', flexShrink: 0, opacity: i.core ? 0.5 : 1 }}>
            <div style={{ position: 'absolute', top: 2, left: i.on ? 17 : 2, width: 15, height: 15, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.2)', transition: 'left 0.2s' }} />
          </div>
        </div>
      ))}
      <div style={{ padding: '12px 18px', background: colors.bg, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon size={14} stroke={colors.muted}><circle cx="8" cy="8" r="6" /><path d="M8 5v3.5M8 11v0.1" /></Icon>
        <span style={{ fontSize: 11, color: colors.muted }}>Retificações no SICONFI reprocessam automaticamente os indicadores afetados; mudanças ficam na trilha de auditoria.</span>
      </div>
    </Card>
  );
}

function Auditoria() {
  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>
      <Card pad={0}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${colors.border}` }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Trilha de auditoria</div>
            <div style={{ fontSize: 10.5, color: colors.muted, marginTop: 2 }}>toda ação sensível é registrada e atribuível a um usuário</div>
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', border: `1px solid ${colors.border}`, borderRadius: 5, fontSize: 11, fontWeight: 500, color: colors.muted }}>
            <Icon size={12} sw={1.6}><path d="M2 3h12l-4.5 5v5l-3 2V8z" /></Icon>
            Filtrar
          </button>
        </div>
        {audit.map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 18px', borderBottom: `1px solid ${colors.rowBorder}`, alignItems: 'flex-start' }}>
            <div style={{ width: 30, height: 30, borderRadius: 6, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={15} stroke={a.c}><path d="M8 2l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V4z" /></Icon>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12 }}>{a.acao}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                <span style={{ fontSize: 10, color: colors.faint, fontFamily: "'JetBrains Mono', monospace" }}>{a.ts}</span>
                <span style={{ fontSize: 10, color: colors.muted }}>· {a.user}</span>
              </div>
            </div>
            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 3, fontWeight: 600, background: a.bg, color: a.c, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{a.tipo}</span>
          </div>
        ))}
      </Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Segurança</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${colors.rowBorder}` }}>
            <div><div style={{ fontSize: 12, fontWeight: 500 }}>2FA obrigatório</div><div style={{ fontSize: 10, color: colors.faint }}>TOTP p/ todos os papéis</div></div>
            <div style={{ position: 'relative', width: 34, height: 19, borderRadius: 10, background: colors.primary }}><div style={{ position: 'absolute', top: 2, left: 17, width: 15, height: 15, borderRadius: '50%', background: '#fff' }} /></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
            <div><div style={{ fontSize: 12, fontWeight: 500 }}>Retenção de logs</div><div style={{ fontSize: 10, color: colors.faint }}>trilha mantida</div></div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600 }}>5 anos</span>
          </div>
        </Card>
        <div style={{ background: colors.accentSoft, border: '1px solid #C7DBCF', borderRadius: 6, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Icon size={14} stroke={colors.primary}><path d="M8 2l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V4z" /><path d="M5.5 8l1.7 1.7L10.5 6.5" /></Icon>
            <div style={{ fontSize: 12, fontWeight: 600, color: colors.primary }}>LGPD · privacidade por padrão</div>
          </div>
          <div style={{ fontSize: 10.5, color: '#2D5A47', lineHeight: 1.5 }}>Dados fiscais são majoritariamente públicos, mas contas de usuário, trilhas de acesso e dados de servidores na despesa de pessoal são tratados como dados pessoais.</div>
        </div>
      </div>
    </div>
  );
}
