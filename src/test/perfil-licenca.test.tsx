/**
 * Sprint H1 — a licença da própria organização, visível no Perfil.
 *
 * Antes desta sprint o tenant só descobria o estado da licença por um 403 ao tentar
 * adicionar um ente fora da cobertura à carteira. O painel "Minha licença" usa o mesmo
 * helper de rótulo/cor que o control plane (utils/licenca.ts) — a licença vencida não
 * pode aparecer como "ativa" aqui e como "expirada" lá.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { PerfilPage } from '../pages/PerfilPage';
import * as backend from '../services/backend';

const ORG_ATIVA: backend.MembershipInfo = {
  org_id: 'org-1',
  org_nome: 'Prefeitura de Teste',
  tipo_conta: 'prefeitura',
  papel: 'Administrador',
  capacidades: ['ver', 'administrar'],
  escopo_ibges: null,
};

function mockMe() {
  vi.spyOn(backend, 'fetchMe').mockResolvedValue({
    usuario_id: 'u1',
    email: 'quem@ente.gov.br',
    nome: 'Quem',
    org_ativa: ORG_ATIVA,
    memberships: [ORG_ATIVA],
    is_superuser: false,
  } as never);
}

const LICENCA_VIGENTE: backend.MinhaLicenca = {
  id: 'lic-1',
  tipo: 'ente',
  cod_ibge: '2304400',
  uf: null,
  vigencia_inicio: '2026-01-01',
  vigencia_fim: null,
  status: 'ativa',
  vigente: true,
  observacao: null,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('Perfil — minha licença (Sprint H1)', () => {
  it('mostra "vigente" quando a licença está em dia', async () => {
    mockMe();
    vi.spyOn(backend, 'fetchMinhasLicencas').mockResolvedValue([LICENCA_VIGENTE] as never);

    render(
      <MemoryRouter>
        <PerfilPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Minha licença')).toBeInTheDocument();
    expect(await screen.findByText('vigente')).toBeInTheDocument();
    expect(screen.getByText('2304400')).toBeInTheDocument();
  });

  it('mostra "expirada" (não "ativa") quando o prazo já passou — mesma regra do control plane', async () => {
    mockMe();
    vi.spyOn(backend, 'fetchMinhasLicencas').mockResolvedValue([
      { ...LICENCA_VIGENTE, vigencia_fim: '2026-01-31', status: 'ativa', vigente: false },
    ] as never);

    render(
      <MemoryRouter>
        <PerfilPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('expirada')).toBeInTheDocument();
    expect(screen.queryByText('ativa')).not.toBeInTheDocument();
    expect(screen.queryByText('vigente')).not.toBeInTheDocument();
  });

  it('sem licença nenhuma, explica a consequência em vez de mostrar uma tabela vazia', async () => {
    mockMe();
    vi.spyOn(backend, 'fetchMinhasLicencas').mockResolvedValue([] as never);

    render(
      <MemoryRouter>
        <PerfilPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/não enxerga ente nenhum — nem os que estiverem na carteira/),
    ).toBeInTheDocument();
  });
});
