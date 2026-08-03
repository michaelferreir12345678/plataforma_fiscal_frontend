import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { RequireAdministrar } from '../components/RequireAdministrar';
import { AdminPage } from '../pages/AdminPage';
import { CentralDadosPage } from '../pages/CentralDadosPage';
import * as backend from '../services/backend';

const FONTE: backend.FonteCatalogo = {
  fonte: 'siconfi_rreo',
  familia: 'siconfi',
  relatorio: 'RREO',
  descricao: 'Relatório Resumido da Execução Orçamentária',
  cadencia: 'bimestral',
  orgao: 'STN',
  url_origem: null,
  tipo_acesso: 'api_rest',
  escopo: 'nacional',
  parser_versao: '1',
  paginas_impactadas: ['/dashboard', '/receita'],
  dependencias: [],
  ativo: true,
  ultima_execucao: null,
  ultima_execucao_ok: null,
  periodo_mais_recente: '2024-B6',
  defasagem_periodos: 0,
  entes_cobertos: 1,
  registros_cobertos: 10,
};

const FONTE_LOCAL: backend.FonteCatalogo = {
  ...FONTE,
  fonte: 'siconfi_rreo_local',
  escopo: 'carteira',
};

function job(
  status: backend.IngestJobStatus,
  progresso_pct: number,
  overrides: Partial<backend.IngestJob> = {},
): backend.IngestJob {
  return {
    id: 'job-1',
    org_id: 'org-1',
    criado_por: 'user-1',
    fonte: 'siconfi_rreo',
    tipo: 'backfill',
    entes: ['2304400'],
    periodos: ['2024'],
    parametros: { anos: [2024] },
    status,
    progresso_pct,
    itens_total: 1,
    itens_ok: status === 'concluido' ? 1 : 0,
    itens_erro: status === 'falhou' ? 1 : 0,
    tentativas: 1,
    erro_resumo: null,
    log_ref: null,
    resultado: status === 'concluido'
      ? {
          itens: [{ ente: '2304400', chave: '2024', ok: true, erro: null, silver_rows: 10 }],
          indicadores_recalculados: ['mart_indicador'],
          cobertura_antes: 0,
          cobertura_depois: 1,
          delta_cobertura: 1,
        }
      : null,
    logs: [],
    criado_em: '2026-07-27T12:00:00Z',
    iniciado_em: status === 'na_fila' ? null : '2026-07-27T12:00:01Z',
    terminado_em: status === 'concluido' || status === 'falhou' ? '2026-07-27T12:00:02Z' : null,
    ...overrides,
  };
}

describe('Central de Dados — confirmação e polling', () => {
  beforeEach(() => {
    vi.spyOn(backend, 'fetchFontes').mockResolvedValue([FONTE]);
    vi.spyOn(backend, 'fetchIngestJobs').mockResolvedValue([]);
    // A saúde da fila vem no mesmo `Promise.all` da lista de jobs: sem mock, a chamada
    // real ficava pendente sob relógio falso e o `Promise.all` nunca resolvia — a lista
    // não chegava a ser preenchida. Passava só enquanto houvesse um backend local no ar
    // para responder depressa, o que faz o resultado depender da máquina de quem roda.
    vi.spyOn(backend, 'fetchSaudeFila').mockResolvedValue({
      consumidores: 1,
      consumidores_vivos: 1,
      aguardando: 0,
      executando: 1,
      fila_redis: 0,
      redis_disponivel: true,
      detalhe: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('permite disparar uma fonte nacional sem entes e serializa entes como lista vazia', async () => {
    const criar = vi.spyOn(backend, 'criarIngestJob').mockResolvedValue({
      precisa_confirmacao: false,
      estimativa_itens: 6,
      limiar: 50,
      job: job('na_fila', 0, {
        entes: [],
        itens_total: 6,
      }),
    });

    render(
      <MemoryRouter>
        <CentralDadosPage />
      </MemoryRouter>,
    );

    const campoEntes = await screen.findByLabelText(/^Entes \(/);
    expect(campoEntes).toBeDisabled();
    expect(campoEntes).toHaveValue('');

    // O exercício deixou de ser texto livre: escolher 2021 (o piso da série) faz o
    // backfill retroagir apenas até ele — um ano só.
    await userEvent.selectOptions(screen.getByLabelText(/Exercício/), '2021');

    const disparar = screen.getByRole('button', { name: 'Disparar job' });
    expect(disparar).toBeEnabled();
    await userEvent.click(disparar);

    await vi.waitFor(() => expect(criar).toHaveBeenCalledWith({
      fonte: 'siconfi_rreo',
      tipo: 'backfill',
      entes: [],
      anos: [2021],
      periodos: undefined,
      confirmar: false,
    }));
  });

  it('calcula 60 unidades localmente e confirma pela estimativa autoritativa do servidor', async () => {
    vi.mocked(backend.fetchFontes).mockResolvedValue([FONTE_LOCAL]);
    const entes = Array.from({ length: 10 }, (_, i) => String(2300000 + i));
    const criado = job('na_fila', 0, {
      id: 'job-custoso',
      fonte: FONTE_LOCAL.fonte,
      entes,
      itens_total: 73,
    });
    const criar = vi.spyOn(backend, 'criarIngestJob')
      .mockResolvedValueOnce({
        precisa_confirmacao: true,
        estimativa_itens: 73,
        limiar: 50,
        job: null,
      })
      .mockResolvedValueOnce({
        precisa_confirmacao: false,
        estimativa_itens: 73,
        limiar: 50,
        job: criado,
      });

    render(
      <MemoryRouter>
        <CentralDadosPage />
      </MemoryRouter>,
    );

    const campoEntes = await screen.findByLabelText(/^Entes \(/);
    fireEvent.change(campoEntes, { target: { value: entes.join(',') } });
    // Um exercício só, para que a estimativa continue medindo a cadência da fonte e
    // não a extensão do retroativo.
    await userEvent.selectOptions(screen.getByLabelText(/Exercício/), '2021');
    expect(screen.getByText(/estimativa local pela cadência/)).toHaveTextContent(
      'estimativa local pela cadência: 60 unidade(s)',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Disparar job' }));

    const dialogo = await screen.findByRole('alertdialog', { name: 'Confirmar ação custosa' });
    expect(dialogo).toHaveTextContent('Vai processar 73 unidades');
    expect(campoEntes).toBeDisabled();
    expect(criar).toHaveBeenNthCalledWith(1, expect.objectContaining({
      fonte: FONTE_LOCAL.fonte,
      tipo: 'backfill',
      entes,
      anos: [2021],
      confirmar: false,
    }));

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar e executar' }));

    await vi.waitFor(() => expect(criar).toHaveBeenCalledTimes(2));
    expect(criar).toHaveBeenNthCalledWith(2, expect.objectContaining({
      fonte: FONTE_LOCAL.fonte,
      tipo: 'backfill',
      entes,
      anos: [2021],
      confirmar: true,
    }));
    expect(await screen.findByText(/Job enfileirado \(73 unidade/)).toBeInTheDocument();
  });

  it('faz polling enquanto executa e reflete o progresso terminal', async () => {
    vi.useFakeTimers();
    vi.mocked(backend.fetchIngestJobs)
      .mockResolvedValueOnce([job('executando', 25)])
      .mockResolvedValue([job('concluido', 100)]);

    render(
      <MemoryRouter>
        <CentralDadosPage />
      </MemoryRouter>,
    );

    // Contar microtasks acopla o teste ao número de elos da cadeia de promessas do
    // `useResource`: qualquer `.then` a mais no fetcher quebrava aqui sem nada ter
    // regredido na tela. Avançar o relógio até 0 drena o que estiver pendente.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByRole('progressbar', { name: /Progresso do job job-1/ })).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByText(/polling ativo/)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(screen.getByRole('progressbar', { name: /Progresso do job job-1/ })).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getAllByText('Concluído').length).toBeGreaterThanOrEqual(1);
    expect(backend.fetchIngestJobs).toHaveBeenCalledTimes(2);
  });

  it('carrega o detalhe e mostra erro estruturado e referência de log', async () => {
    const falho = job('falhou', 100, {
      erro_resumo: '1 unidade falhou',
      log_ref: 'redis://logs/job-1',
      logs: [
        {
          id: 'log-1',
          job_id: 'job-1',
          fonte: 'siconfi_rreo',
          cod_ibge: '2304400',
          periodo: '2024-B6',
          versao: '2',
          status: 'download_ok',
          mensagem: 'Arquivo bruto persistido',
          ts: '2026-07-27T12:00:01Z',
        },
        {
          id: 'log-2',
          job_id: 'job-1',
          fonte: 'siconfi_rreo',
          cod_ibge: '2304400',
          periodo: '2024-B6',
          versao: '2',
          status: 'erro',
          mensagem: 'HTTP 504 na origem',
          ts: '2026-07-27T12:00:02Z',
        },
      ],
      resultado: {
        itens: [{ ente: '2304400', chave: '2024', ok: false, erro: 'timeout STN', silver_rows: 0 }],
        indicadores_recalculados: [],
        cobertura_antes: 0,
        cobertura_depois: 0,
        delta_cobertura: 0,
      },
    });
    vi.mocked(backend.fetchIngestJobs).mockResolvedValue([falho]);
    vi.spyOn(backend, 'fetchIngestJob').mockResolvedValue(falho);

    render(
      <MemoryRouter>
        <CentralDadosPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('1 unidade falhou')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'detalhes' }));

    expect(await screen.findByText('redis://logs/job-1')).toBeInTheDocument();
    const logs = screen.getByLabelText('Logs do job job-1');
    expect(logs).toHaveTextContent('download_ok');
    expect(logs).toHaveTextContent('Arquivo bruto persistido');
    expect(logs).toHaveTextContent('2304400 / 2024-B6');
    expect(logs).toHaveTextContent('erro');
    expect(logs).toHaveTextContent('HTTP 504 na origem');
    expect(screen.getByText(/timeout STN/)).toBeInTheDocument();
    expect(backend.fetchIngestJob).toHaveBeenCalledWith('job-1');
  });
});

describe('guarda administrativa', () => {
  it('mostra 403 visual e não monta a página sem capacidade administrar', async () => {
    vi.spyOn(backend, 'fetchMe').mockResolvedValue({
      usuario_id: 'user-1',
      email: 'leitor@example.com',
      nome: 'Usuário Leitor',
      org_ativa: {
        org_id: 'org-1',
        org_nome: 'Prefeitura',
        tipo_conta: 'prefeitura',
        papel: 'Leitura',
        capacidades: ['ver'],
        escopo_ibges: null,
      },
      memberships: [],
    });

    render(
      <RequireAdministrar>
        <div>conteúdo secreto</div>
      </RequireAdministrar>,
    );

    expect(await screen.findByTestId('admin-403')).toHaveTextContent('403');
    expect(screen.queryByText('conteúdo secreto')).not.toBeInTheDocument();
  });
});

describe('Admin real — contratos de cadastro', () => {
  it('mantém o provisionamento restrito e cria usuário e papel pelos endpoints reais', async () => {
    vi.spyOn(backend, 'fetchBilling').mockReturnValue(new Promise(() => undefined));
    vi.spyOn(backend, 'fetchMe').mockResolvedValue({
      usuario_id: 'admin-1',
      email: 'admin@example.com',
      nome: 'Admin',
      org_ativa: {
        org_id: 'org-1',
        org_nome: 'Prefeitura Atual',
        tipo_conta: 'prefeitura',
        papel: 'Administrador',
        capacidades: ['ver', 'administrar'],
        escopo_ibges: null,
      },
      memberships: [],
    });
    vi.spyOn(backend, 'fetchOrgs').mockResolvedValue([
      {
        id: 'org-1',
        nome: 'Prefeitura Atual',
        tipo_conta: 'prefeitura',
        metrica_cobranca: 'por_ente',
        criada_em: '2026-01-01T00:00:00Z',
      },
    ]);
    vi.spyOn(backend, 'fetchUsuarios').mockResolvedValue([]);
    const criarUsuario = vi.spyOn(backend, 'criarUsuario').mockResolvedValue({
      id: 'user-2',
      nome: 'Pessoa Real',
      email: 'pessoa@example.com',
      mfa_ativo: false,
    });
    vi.spyOn(backend, 'fetchPapeis').mockResolvedValue([]);
    const criarPapel = vi.spyOn(backend, 'criarPapel').mockResolvedValue({
      id: 'papel-2',
      org_id: 'org-1',
      nome: 'Operador',
      capacidades: ['ver'],
    });

    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Organização' }));
    await screen.findByText('Organizações reais');
    expect(await screen.findByText('Provisionamento controlado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Criar organização' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Usuários & perfis' }));
    await screen.findByText('Novo usuário');
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Pessoa Real' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'pessoa@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Senha inicial/), { target: { value: 'senhaforte' } });
    await userEvent.click(screen.getByRole('button', { name: 'Criar usuário' }));
    await vi.waitFor(() => expect(criarUsuario).toHaveBeenCalledWith({
      nome: 'Pessoa Real',
      email: 'pessoa@example.com',
      senha: 'senhaforte',
      mfa_ativo: false,
    }));

    await userEvent.click(screen.getByRole('button', { name: 'Permissões (RBAC)' }));
    await screen.findByText(/Matriz de permissões/);
    fireEvent.change(screen.getByLabelText('Novo papel'), { target: { value: 'Operador' } });
    await userEvent.click(screen.getByRole('button', { name: 'Criar papel' }));
    await vi.waitFor(() => expect(criarPapel).toHaveBeenCalledWith({
      nome: 'Operador',
      capacidades: ['ver'],
    }));
  }, 15_000);

  it('serializa alterações de permissões e só deriva a próxima mudança do estado confirmado', async () => {
    vi.spyOn(backend, 'fetchBilling').mockReturnValue(new Promise(() => undefined));
    vi.spyOn(backend, 'fetchPapeis').mockResolvedValue([
      {
        id: 'papel-1',
        org_id: 'org-1',
        nome: 'Operador',
        capacidades: ['ver'],
      },
    ]);

    let resolverPrimeira!: (papel: backend.PapelOut) => void;
    const primeiraPendente = new Promise<backend.PapelOut>((resolve) => {
      resolverPrimeira = resolve;
    });
    const atualizar = vi.spyOn(backend, 'atualizarPapelCapacidades')
      .mockImplementationOnce(() => primeiraPendente)
      .mockResolvedValueOnce({
        id: 'papel-1',
        org_id: 'org-1',
        nome: 'Operador',
        capacidades: ['ver', 'exportar', 'administrar'],
      });

    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Permissões (RBAC)' }));
    const concederExportar = await screen.findByRole('button', {
      name: 'Conceder Exportar dados de Operador',
    });
    await userEvent.click(concederExportar);

    expect(atualizar).toHaveBeenNthCalledWith(1, 'papel-1', ['ver', 'exportar']);
    const concederAdministrar = screen.getByRole('button', {
      name: 'Conceder Administrar de Operador',
    });
    expect(concederAdministrar).toBeDisabled();
    fireEvent.click(concederAdministrar);
    expect(atualizar).toHaveBeenCalledTimes(1);

    resolverPrimeira({
      id: 'papel-1',
      org_id: 'org-1',
      nome: 'Operador',
      capacidades: ['ver', 'exportar'],
    });
    await screen.findByRole('button', { name: 'Retirar Exportar dados de Operador' });

    await userEvent.click(screen.getByRole('button', {
      name: 'Conceder Administrar de Operador',
    }));
    await vi.waitFor(() => expect(atualizar).toHaveBeenNthCalledWith(
      2,
      'papel-1',
      ['ver', 'exportar', 'administrar'],
    ));
  }, 15_000);
});
