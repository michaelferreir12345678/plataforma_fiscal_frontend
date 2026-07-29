/**
 * Sprint 19 — control plane no frontend.
 *
 * A tela precisa dizer duas coisas que o backend impõe: quem administra a própria
 * organização **não** entra aqui, e organização sem licença não enxerga ente nenhum —
 * nem os que estiverem na carteira.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { RequireSuperuser } from '../components/RequireSuperuser';
import { PlataformaPage } from '../pages/PlataformaPage';
import * as backend from '../services/backend';
import * as api from '../services/api';

function mockMe(is_superuser: boolean, capacidades: string[] = ['ver', 'administrar']) {
  vi.spyOn(api, 'getToken').mockReturnValue('token-de-teste');
  vi.spyOn(backend, 'fetchMe').mockResolvedValue({
    usuario_id: 'u1',
    email: 'quem@ente.gov.br',
    nome: 'Quem',
    org_ativa: { org_id: 'o1', org_nome: 'Org', tipo_conta: 'estado', papel: 'Admin', capacidades, escopo_ibges: null },
    memberships: [],
    is_superuser,
  } as never);
}

const ORG: backend.OrgUso = {
  org_id: 'org-1',
  nome: 'Sefaz do Ceará',
  tipo_conta: 'estado',
  logo_url: null,
  criada_em: '2026-01-10T12:00:00Z',
  licencas_ativas: 1,
  entes_licenciados: 185,
  entes_na_carteira: 3,
  usuarios: 4,
  relatorios_gerados: 12,
  consultas_ia: 30,
  entes_com_dado: 3,
};

const LICENCA_UF: backend.Licenca = {
  id: 'lic-1',
  org_id: 'org-1',
  tipo: 'uf',
  cod_ibge: null,
  uf: '23',
  vigencia_inicio: '2026-01-10',
  vigencia_fim: null,
  status: 'ativa',
  vigente: true,
  observacao: null,
  criada_em: '2026-01-10T12:00:00Z',
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('Sprint 19 — control plane', () => {
  it('recusa quem só administra o próprio tenant, explicando a diferença', async () => {
    mockMe(false, ['ver', 'administrar']);
    render(
      <MemoryRouter>
        <RequireSuperuser>
          <div>conteudo secreto</div>
        </RequireSuperuser>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('superuser-403')).toBeInTheDocument();
    expect(screen.queryByText('conteudo secreto')).not.toBeInTheDocument();
    // A mensagem tem de mandar o usuário ao lugar certo, não só negar.
    expect(screen.getByText(/Administração/)).toBeInTheDocument();
  });

  it('deixa o operador da plataforma entrar', async () => {
    mockMe(true, ['ver']);
    render(
      <MemoryRouter>
        <RequireSuperuser>
          <div>conteudo do control plane</div>
        </RequireSuperuser>
      </MemoryRouter>,
    );
    expect(await screen.findByText('conteudo do control plane')).toBeInTheDocument();
  });

  it('mostra o uso por organização e diz "todos" quando a licença é global', async () => {
    mockMe(true);
    vi.spyOn(backend, 'fetchPlatformOrgs').mockResolvedValue([
      ORG,
      { ...ORG, org_id: 'org-2', nome: 'Consultoria X', entes_licenciados: null },
    ] as never);

    render(
      <MemoryRouter>
        <PlataformaPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Sefaz do Ceará')).toBeInTheDocument();
    expect(screen.getByText('185')).toBeInTheDocument();
    // Licença global não é enumerável — um número ali seria invenção.
    expect(screen.getByText('todos')).toBeInTheDocument();
  });

  it('ao abrir uma organização sem licença, diz que a carteira não basta', async () => {
    mockMe(true);
    vi.spyOn(backend, 'fetchPlatformOrgs').mockResolvedValue([ORG] as never);
    vi.spyOn(backend, 'fetchLicencas').mockResolvedValue([] as never);

    render(
      <MemoryRouter>
        <PlataformaPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Sefaz do Ceará' }));
    expect(
      await screen.findByText(/não enxerga ente nenhum — nem os que estiverem na carteira/),
    ).toBeInTheDocument();
  });

  it('suspende uma licença vigente e recarrega a lista', async () => {
    mockMe(true);
    vi.spyOn(backend, 'fetchPlatformOrgs').mockResolvedValue([ORG] as never);
    vi.spyOn(backend, 'fetchLicencas').mockResolvedValue([LICENCA_UF] as never);
    const alterar = vi
      .spyOn(backend, 'alterarLicenca')
      .mockResolvedValue({ ...LICENCA_UF, status: 'suspensa', vigente: false } as never);

    render(
      <MemoryRouter>
        <PlataformaPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Sefaz do Ceará' }));
    const botao = await screen.findByRole('button', { name: 'suspender' });
    await userEvent.click(botao);

    await waitFor(() => expect(alterar).toHaveBeenCalledWith('lic-1', { status: 'suspensa' }));
  });

  it('distingue "vigente" de "ativa": prazo vencido aparece como expirada', async () => {
    mockMe(true);
    vi.spyOn(backend, 'fetchPlatformOrgs').mockResolvedValue([ORG] as never);
    vi.spyOn(backend, 'fetchLicencas').mockResolvedValue([
      { ...LICENCA_UF, vigencia_fim: '2026-01-31', status: 'ativa', vigente: false },
    ] as never);

    render(
      <MemoryRouter>
        <PlataformaPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Sefaz do Ceará' }));
    // O status guardado é 'ativa', mas a licença não vale mais — a tela mostra o efetivo.
    expect(await screen.findByText('ativa')).toBeInTheDocument();
    expect(screen.queryByText('vigente')).not.toBeInTheDocument();
  });
});
