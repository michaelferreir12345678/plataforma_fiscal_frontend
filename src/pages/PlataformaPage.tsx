import { useCallback, useId, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { SectionLabel } from '../components/SectionLabel';
import { Async, EmptyState } from '../components/AsyncState';
import { StatusBadge } from '../components/StatusBadge';
import { useResource } from '../context/AppContext';
import {
  alterarLicenca,
  concederLicenca,
  fetchLicencas,
  fetchPlatformOrgs,
  provisionarOrg,
  type Licenca,
  type OrgUso,
  type TipoLicenca,
} from '../services/backend';
import { colors, font, typeScale } from '../theme';

const TIPO_ROTULO: Record<TipoLicenca, string> = {
  ente: 'Ente',
  uf: 'Território (UF)',
  global: 'Global',
};

function alvoDaLicenca(l: Licenca): string {
  if (l.tipo === 'ente') return l.cod_ibge ?? '—';
  if (l.tipo === 'uf') return `UF ${l.uf}`;
  return 'todos os entes';
}

function vigenciaTexto(l: Licenca): string {
  const inicio = l.vigencia_inicio;
  return l.vigencia_fim ? `${inicio} → ${l.vigencia_fim}` : `${inicio} → sem prazo`;
}

export function PlataformaPage() {
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [recarregar, setRecarregar] = useState(0);
  const orgs = useResource(() => fetchPlatformOrgs(), [recarregar]);

  return (
    <div
      className="fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      data-screen-label="Control Plane"
    >
      <PageHeader
        title="Control Plane"
        context="Provisionamento de organizações e licenciamento por ente ou território"
        source="op.organizacao · op.licenca · auditoria com marcador plataforma"
      />

      <Card pad={14}>
        <SectionLabel note="carteira é o que a organização quer olhar; licença é o que ela pode">
          Organizações
        </SectionLabel>
        <Async
          res={orgs}
          vazio={{
            quando: (lista) => lista.length === 0,
            render: (
              <EmptyState
                ente="a plataforma"
                periodo="nenhuma organização"
                detalhe="Provisione a primeira organização no formulário abaixo."
              />
            ),
          }}
        >
          {(lista) => (
            <TabelaOrgs lista={lista} selecionada={selecionada} onSelecionar={setSelecionada} />
          )}
        </Async>
      </Card>

      {selecionada && (
        <PainelLicencas
          orgId={selecionada}
          onMudou={() => setRecarregar((n) => n + 1)}
        />
      )}

      <Provisionar onCriou={() => setRecarregar((n) => n + 1)} />
    </div>
  );
}

function TabelaOrgs({
  lista,
  selecionada,
  onSelecionar,
}: {
  lista: OrgUso[];
  selecionada: string | null;
  onSelecionar: (id: string) => void;
}) {
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <caption style={{ textAlign: 'left', padding: '4px 0 8px', color: colors.muted }}>
          Consumo por organização. Selecione uma para ver e alterar as licenças.
        </caption>
        <thead>
          <tr>
            {['Organização', 'Tipo', 'Licenças', 'Entes licenciados', 'Carteira', 'Usuários', 'Relatórios', 'IA'].map(
              (h) => (
                <th
                  key={h}
                  scope="col"
                  style={{
                    padding: '7px 8px',
                    textAlign: h === 'Organização' || h === 'Tipo' ? 'left' : 'right',
                    borderBottom: `1px solid ${colors.border}`,
                    color: colors.faint,
                    fontSize: typeScale.caption,
                    letterSpacing: '0.04em',
                  }}
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {lista.map((org) => {
            const ativa = org.org_id === selecionada;
            return (
              <tr
                key={org.org_id}
                style={{
                  borderBottom: `1px solid ${colors.rowBorder}`,
                  background: ativa ? colors.accentSoft : undefined,
                }}
              >
                <td style={{ padding: '7px 8px' }}>
                  <button
                    type="button"
                    onClick={() => onSelecionar(org.org_id)}
                    aria-pressed={ativa}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: colors.primary,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {org.nome}
                  </button>
                </td>
                <td style={{ padding: '7px 8px', color: colors.muted }}>{org.tipo_conta}</td>
                <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: font.mono }}>
                  {org.licencas_ativas}
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: font.mono }}>
                  {/* Licença global não é enumerável — dizer "todos" é mais honesto que um número. */}
                  {org.entes_licenciados === null ? 'todos' : org.entes_licenciados}
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: font.mono }}>
                  {org.entes_na_carteira}
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: font.mono }}>
                  {org.usuarios}
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: font.mono }}>
                  {org.relatorios_gerados}
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: font.mono }}>
                  {org.consultas_ia}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PainelLicencas({ orgId, onMudou }: { orgId: string; onMudou: () => void }) {
  const [versao, setVersao] = useState(0);
  const licencas = useResource(() => fetchLicencas(orgId), [orgId, versao]);
  const [erro, setErro] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoLicenca>('ente');
  const [alvo, setAlvo] = useState('');
  const [fim, setFim] = useState('');
  const idTipo = useId();
  const idAlvo = useId();
  const idFim = useId();

  const atualizar = useCallback(() => {
    setVersao((n) => n + 1);
    onMudou();
  }, [onMudou]);

  const conceder = useCallback(async () => {
    setErro(null);
    try {
      await concederLicenca(orgId, {
        tipo,
        cod_ibge: tipo === 'ente' ? alvo.trim() : null,
        uf: tipo === 'uf' ? alvo.trim() : null,
        vigencia_fim: fim || null,
      });
      setAlvo('');
      setFim('');
      atualizar();
    } catch (e) {
      setErro((e as { detail?: string; message?: string })?.detail ?? 'Não foi possível conceder.');
    }
  }, [orgId, tipo, alvo, fim, atualizar]);

  const trocarStatus = useCallback(
    async (l: Licenca) => {
      setErro(null);
      try {
        await alterarLicenca(l.id, { status: l.status === 'ativa' ? 'suspensa' : 'ativa' });
        atualizar();
      } catch (e) {
        setErro((e as { detail?: string })?.detail ?? 'Não foi possível alterar.');
      }
    },
    [atualizar],
  );

  const campo = useMemo(
    () => ({
      padding: '6px 8px',
      border: `1px solid ${colors.border}`,
      borderRadius: 4,
      fontSize: 12,
      minHeight: 32,
    }),
    [],
  );

  return (
    <Card pad={14}>
      <SectionLabel note="suspender não apaga: o histórico responde 'podia ver este ente em março?'">
        Licenças da organização
      </SectionLabel>

      {erro && (
        <div role="alert" style={{ color: colors.red, fontSize: 12, marginBottom: 8 }}>
          {erro}
        </div>
      )}

      <Async
        res={licencas}
        vazio={{
          quando: (lista) => lista.length === 0,
          render: (
            <EmptyState
              ente="esta organização"
              periodo="sem licença"
              detalhe="Sem licença ativa, a organização não enxerga ente nenhum — nem os que estiverem na carteira."
            />
          ),
        }}
      >
        {(lista) => (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Tipo', 'Alvo', 'Vigência', 'Situação', ''].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      style={{
                        padding: '7px 8px',
                        textAlign: 'left',
                        borderBottom: `1px solid ${colors.border}`,
                        color: colors.faint,
                        fontSize: typeScale.caption,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.map((l) => (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${colors.rowBorder}` }}>
                    <td style={{ padding: '7px 8px' }}>{TIPO_ROTULO[l.tipo]}</td>
                    <td style={{ padding: '7px 8px', fontFamily: font.mono }}>{alvoDaLicenca(l)}</td>
                    <td style={{ padding: '7px 8px', fontFamily: font.mono, color: colors.muted }}>
                      {vigenciaTexto(l)}
                    </td>
                    <td style={{ padding: '7px 8px' }}>
                      {/* `vigente` distingue "ativa" de "ativa e dentro do prazo": uma
                          licença ativa com prazo vencido aparece como expirada. */}
                      <StatusBadge
                        level={l.vigente ? 'folga' : l.status === 'suspensa' ? 'atencao' : 'neutro'}
                        label={l.vigente ? 'vigente' : l.status}
                      />
                    </td>
                    <td style={{ padding: '7px 8px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => trocarStatus(l)}
                        style={{
                          minHeight: 30,
                          padding: '4px 10px',
                          border: `1px solid ${colors.border}`,
                          borderRadius: 4,
                          background: colors.surface,
                          color: colors.primary,
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {l.status === 'ativa' ? 'suspender' : 'reativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Async>

      <div style={{ height: 1, background: colors.borderSoft, margin: '12px 0' }} />
      <SectionLabel note="licença de UF alcança os municípios do território e o ente estadual">
        Conceder licença
      </SectionLabel>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11 }}>
          <span id={idTipo} style={{ color: colors.faint }}>Tipo</span>
          <select
            aria-labelledby={idTipo}
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoLicenca)}
            style={campo}
          >
            <option value="ente">Ente</option>
            <option value="uf">Território (UF)</option>
            <option value="global">Global</option>
          </select>
        </label>
        {tipo !== 'global' && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11 }}>
            <span id={idAlvo} style={{ color: colors.faint }}>
              {tipo === 'ente' ? 'Código IBGE' : 'UF (2 dígitos)'}
            </span>
            <input
              aria-labelledby={idAlvo}
              value={alvo}
              onChange={(e) => setAlvo(e.target.value)}
              placeholder={tipo === 'ente' ? '2304400' : '23'}
              style={{ ...campo, width: 120 }}
            />
          </label>
        )}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11 }}>
          <span id={idFim} style={{ color: colors.faint }}>Vigência até (opcional)</span>
          <input
            aria-labelledby={idFim}
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            style={campo}
          />
        </label>
        <button
          type="button"
          onClick={conceder}
          disabled={tipo !== 'global' && !alvo.trim()}
          style={{
            minHeight: 32,
            padding: '6px 14px',
            border: `1px solid ${colors.primary}`,
            borderRadius: 4,
            background: colors.primary,
            color: colors.bg,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          conceder
        </button>
      </div>
    </Card>
  );
}

function Provisionar({ onCriou }: { onCriou: () => void }) {
  const [nome, setNome] = useState('');
  const [tipoConta, setTipoConta] = useState('prefeitura');
  const [email, setEmail] = useState('');
  const [nomeAdmin, setNomeAdmin] = useState('');
  const [senha, setSenha] = useState('');
  const [resultado, setResultado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const campo = {
    padding: '6px 8px',
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    fontSize: 12,
    minHeight: 32,
  };

  const enviar = useCallback(async () => {
    setErro(null);
    setResultado(null);
    try {
      const r = await provisionarOrg({
        nome,
        tipo_conta: tipoConta,
        admin_email: email,
        admin_nome: nomeAdmin,
        admin_senha: senha,
      });
      setResultado(
        `Organização "${r.nome}" criada com o administrador ${r.admin_email}. ` +
          'Conceda a licença abaixo — sem ela a conta entra e não vê ente nenhum.',
      );
      setNome('');
      setEmail('');
      setNomeAdmin('');
      setSenha('');
      onCriou();
    } catch (e) {
      setErro((e as { detail?: string })?.detail ?? 'Não foi possível provisionar.');
    }
  }, [nome, tipoConta, email, nomeAdmin, senha, onCriou]);

  const completo = nome.trim() && email.trim() && nomeAdmin.trim() && senha.length >= 8;

  return (
    <Card pad={14}>
      <SectionLabel note="organização, papel de administrador e usuário inicial saem numa transação só">
        Provisionar organização
      </SectionLabel>
      {resultado && (
        <div role="status" style={{ color: colors.green, fontSize: 12, marginBottom: 8 }}>
          {resultado}
        </div>
      )}
      {erro && (
        <div role="alert" style={{ color: colors.red, fontSize: 12, marginBottom: 8 }}>
          {erro}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11 }}>
          <span style={{ color: colors.faint }}>Nome da organização</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} style={{ ...campo, width: 230 }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11 }}>
          <span style={{ color: colors.faint }}>Tipo de conta</span>
          <select value={tipoConta} onChange={(e) => setTipoConta(e.target.value)} style={campo}>
            <option value="prefeitura">Prefeitura</option>
            <option value="estado">Estado (Sefaz)</option>
            <option value="consultoria">Consultoria</option>
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11 }}>
          <span style={{ color: colors.faint }}>E-mail do administrador</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...campo, width: 220 }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11 }}>
          <span style={{ color: colors.faint }}>Nome do administrador</span>
          <input value={nomeAdmin} onChange={(e) => setNomeAdmin(e.target.value)} style={{ ...campo, width: 190 }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11 }}>
          <span style={{ color: colors.faint }}>Senha inicial (mín. 8)</span>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={{ ...campo, width: 160 }}
          />
        </label>
        <button
          type="button"
          onClick={enviar}
          disabled={!completo}
          style={{
            minHeight: 32,
            padding: '6px 14px',
            border: `1px solid ${colors.primary}`,
            borderRadius: 4,
            background: completo ? colors.primary : colors.border,
            color: completo ? colors.bg : colors.muted,
            fontSize: 12,
            fontWeight: 600,
            cursor: completo ? 'pointer' : 'not-allowed',
          }}
        >
          provisionar
        </button>
      </div>
    </Card>
  );
}
