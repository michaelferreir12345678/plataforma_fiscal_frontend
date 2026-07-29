import { useCallback, useId, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { SectionLabel } from '../components/SectionLabel';
import { Async } from '../components/AsyncState';
import { useResource } from '../context/AppContext';
import { setToken } from '../services/api';
import {
  alterarSenha,
  atualizarPerfil,
  fetchMe,
  trocarOrganizacao,
  type MembershipInfo,
} from '../services/backend';
import { colors, font, typeScale } from '../theme';

const campo = {
  padding: '7px 9px',
  border: `1px solid ${colors.border}`,
  borderRadius: 4,
  fontSize: 12.5,
  minHeight: 34,
  width: '100%',
};

const botao = {
  minHeight: 34,
  padding: '7px 14px',
  border: `1px solid ${colors.primary}`,
  borderRadius: 4,
  background: colors.primary,
  color: colors.bg,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: 'pointer',
};

export function PerfilPage() {
  const [versao, setVersao] = useState(0);
  const me = useResource(() => fetchMe(), [versao]);

  return (
    <div
      className="fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      data-screen-label="Meu perfil"
    >
      <PageHeader
        title="Meu perfil"
        context="Seus dados, seus vínculos e a organização em que você está trabalhando"
        source="op.usuario · op.membership · toda alteração vai para a auditoria"
      />
      <Async res={me}>
        {(dados) => (
          <>
            <Identificacao
              nome={dados.nome}
              email={dados.email}
              superuser={dados.is_superuser === true}
              onSalvou={() => setVersao((n) => n + 1)}
            />
            <Organizacoes
              ativa={dados.org_ativa}
              vinculos={dados.memberships}
              onTrocou={() => setVersao((n) => n + 1)}
            />
            <TrocaDeSenha />
          </>
        )}
      </Async>
    </div>
  );
}

function Identificacao({
  nome,
  email,
  superuser,
  onSalvou,
}: {
  nome: string;
  email: string;
  superuser: boolean;
  onSalvou: () => void;
}) {
  const [valor, setValor] = useState(nome);
  const [msg, setMsg] = useState<{ texto: string; erro: boolean } | null>(null);
  const idNome = useId();

  const salvar = useCallback(async () => {
    setMsg(null);
    try {
      await atualizarPerfil(valor);
      setMsg({ texto: 'Nome atualizado.', erro: false });
      onSalvou();
    } catch (e) {
      setMsg({
        texto: (e as { detail?: string })?.detail ?? 'Não foi possível salvar.',
        erro: true,
      });
    }
  }, [valor, onSalvou]);

  return (
    <Card pad={14}>
      <SectionLabel note="o e-mail identifica a conta e só o operador da plataforma o altera">
        Identificação
      </SectionLabel>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 240px' }}>
          <span id={idNome} style={{ fontSize: 11, color: colors.faint }}>Nome</span>
          <input
            aria-labelledby={idNome}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            style={campo}
          />
        </label>
        <div style={{ flex: '1 1 240px' }}>
          <div style={{ fontSize: 11, color: colors.faint, marginBottom: 3 }}>E-mail</div>
          <div
            style={{
              ...campo,
              background: colors.surfaceAlt,
              color: colors.muted,
              fontFamily: font.mono,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {email}
          </div>
        </div>
        <button type="button" onClick={salvar} disabled={!valor.trim() || valor === nome} style={{
          ...botao,
          background: !valor.trim() || valor === nome ? colors.border : colors.primary,
          color: !valor.trim() || valor === nome ? colors.muted : colors.bg,
          cursor: !valor.trim() || valor === nome ? 'not-allowed' : 'pointer',
        }}>
          salvar
        </button>
      </div>
      {superuser && (
        <div style={{ marginTop: 10, fontSize: 11.5, color: colors.muted, lineHeight: 1.6 }}>
          Esta conta é <strong>operador da plataforma</strong>: ela existe fora de qualquer
          organização e responde pelo Control Plane.
        </div>
      )}
      {msg && (
        <div
          role={msg.erro ? 'alert' : 'status'}
          style={{ marginTop: 8, fontSize: 12, color: msg.erro ? colors.red : colors.green }}
        >
          {msg.texto}
        </div>
      )}
    </Card>
  );
}

function Organizacoes({
  ativa,
  vinculos,
  onTrocou,
}: {
  ativa: MembershipInfo | null;
  vinculos: MembershipInfo[];
  onTrocou: () => void;
}) {
  const [alvo, setAlvo] = useState<string | null>(null);
  const [senha, setSenha] = useState('');
  const [msg, setMsg] = useState<{ texto: string; erro: boolean } | null>(null);
  const idSenha = useId();

  const confirmar = useCallback(async () => {
    if (!alvo) return;
    setMsg(null);
    try {
      const r = await trocarOrganizacao(alvo, senha);
      // O token novo carrega a outra organização; a sessão inteira passa a enxergar
      // por ela. Recarregar é o caminho honesto: metade da tela com o contexto antigo
      // seria pior que esperar um segundo.
      setToken(r.access_token);
      setSenha('');
      setAlvo(null);
      onTrocou();
      window.location.reload();
    } catch (e) {
      setMsg({
        texto: (e as { detail?: string })?.detail ?? 'Não foi possível trocar.',
        erro: true,
      });
    }
  }, [alvo, senha, onTrocou]);

  return (
    <Card pad={14}>
      <SectionLabel note="trocar de organização muda tudo o que a sessão enxerga — por isso pede a senha">
        Organizações
      </SectionLabel>

      {vinculos.length === 0 ? (
        <div style={{ fontSize: 12.5, color: colors.muted }}>
          Sua conta não tem vínculo com nenhuma organização.
        </div>
      ) : (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Organização', 'Tipo', 'Papel', 'Escopo', ''].map((h) => (
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
              {vinculos.map((v) => {
                const atual = ativa?.org_id === v.org_id;
                return (
                  <tr
                    key={v.org_id}
                    style={{
                      borderBottom: `1px solid ${colors.rowBorder}`,
                      background: atual ? colors.accentSoft : undefined,
                    }}
                  >
                    <td style={{ padding: '7px 8px', fontWeight: atual ? 700 : 400 }}>
                      {v.org_nome}
                      {atual && (
                        <span style={{ marginLeft: 6, fontSize: 11, color: colors.primary }}>
                          · em uso
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '7px 8px', color: colors.muted }}>{v.tipo_conta}</td>
                    <td style={{ padding: '7px 8px', color: colors.muted }}>{v.papel}</td>
                    <td style={{ padding: '7px 8px', color: colors.muted, fontFamily: font.mono }}>
                      {/* Escopo nulo = carteira inteira. Dizer "todos" evita a leitura
                          errada de que o usuário não enxerga nada. */}
                      {v.escopo_ibges === null ? 'carteira inteira' : `${v.escopo_ibges.length} ente(s)`}
                    </td>
                    <td style={{ padding: '7px 8px', textAlign: 'right' }}>
                      {!atual && (
                        <button
                          type="button"
                          onClick={() => { setAlvo(v.org_id); setMsg(null); }}
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
                          usar esta
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {alvo && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: `1px solid ${colors.primary}`,
            borderLeftWidth: 4,
            borderRadius: 5,
            background: colors.accentSoft,
          }}
        >
          <div style={{ fontSize: 12.5, marginBottom: 8 }}>
            Confirme com sua senha para trabalhar em{' '}
            <strong>{vinculos.find((v) => v.org_id === alvo)?.org_nome}</strong>.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 200px' }}>
              <span id={idSenha} style={{ fontSize: 11, color: colors.faint }}>Senha</span>
              <input
                aria-labelledby={idSenha}
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                style={campo}
              />
            </label>
            <button type="button" onClick={confirmar} disabled={!senha} style={botao}>
              trocar
            </button>
            <button
              type="button"
              onClick={() => { setAlvo(null); setSenha(''); }}
              style={{ ...botao, background: colors.surface, color: colors.primary }}
            >
              cancelar
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11.5, color: colors.muted, lineHeight: 1.6 }}>
        Aqui você alterna entre organizações em que <strong>já tem vínculo</strong>. Entrar
        numa organização nova não é uma decisão de quem quer entrar — é concessão do
        operador da plataforma, que registra quem liberou, quando e até quando. Se
        precisar de acesso a outro cliente, peça o vínculo; ele aparecerá nesta lista.
      </div>
      {msg && (
        <div role="alert" style={{ marginTop: 8, fontSize: 12, color: colors.red }}>
          {msg.texto}
        </div>
      )}
    </Card>
  );
}

function TrocaDeSenha() {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [repetir, setRepetir] = useState('');
  const [msg, setMsg] = useState<{ texto: string; erro: boolean } | null>(null);
  const ids = { a: useId(), b: useId(), c: useId() };

  const divergem = nova !== '' && repetir !== '' && nova !== repetir;
  const pronto = atual !== '' && nova.length >= 8 && nova === repetir;

  const enviar = useCallback(async () => {
    setMsg(null);
    try {
      await alterarSenha(atual, nova);
      setAtual(''); setNova(''); setRepetir('');
      setMsg({ texto: 'Senha alterada.', erro: false });
    } catch (e) {
      setMsg({
        texto: (e as { detail?: string })?.detail ?? 'Não foi possível alterar.',
        erro: true,
      });
    }
  }, [atual, nova]);

  return (
    <Card pad={14}>
      <SectionLabel note="a senha atual é exigida: sessão aberta não é prova de identidade">
        Senha
      </SectionLabel>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 180px' }}>
          <span id={ids.a} style={{ fontSize: 11, color: colors.faint }}>Senha atual</span>
          <input aria-labelledby={ids.a} type="password" value={atual} onChange={(e) => setAtual(e.target.value)} style={campo} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 180px' }}>
          <span id={ids.b} style={{ fontSize: 11, color: colors.faint }}>Nova (mín. 8)</span>
          <input aria-labelledby={ids.b} type="password" value={nova} onChange={(e) => setNova(e.target.value)} style={campo} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 180px' }}>
          <span id={ids.c} style={{ fontSize: 11, color: colors.faint }}>Repetir a nova</span>
          <input aria-labelledby={ids.c} type="password" value={repetir} onChange={(e) => setRepetir(e.target.value)} style={campo} />
        </label>
        <button type="button" onClick={enviar} disabled={!pronto} style={{
          ...botao,
          background: pronto ? colors.primary : colors.border,
          color: pronto ? colors.bg : colors.muted,
          cursor: pronto ? 'pointer' : 'not-allowed',
        }}>
          alterar
        </button>
      </div>
      {divergem && (
        <div role="alert" style={{ marginTop: 8, fontSize: 12, color: colors.red }}>
          As duas senhas novas não coincidem.
        </div>
      )}
      {msg && (
        <div
          role={msg.erro ? 'alert' : 'status'}
          style={{ marginTop: 8, fontSize: 12, color: msg.erro ? colors.red : colors.green }}
        >
          {msg.texto}
        </div>
      )}
    </Card>
  );
}
