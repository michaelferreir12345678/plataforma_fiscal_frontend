/**
 * Procedência: o usuário tem de conseguir chegar à origem sem depender da nossa palavra.
 *
 * O que se prova aqui é o que sustenta a promessa da tela: os endereços aparecem inteiros
 * (não truncados), os exemplos são links que abrem de verdade, cada parâmetro vem com o que
 * significa, e o caminho da tabela até a origem existe e é navegável.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { FonteProcedenciaPage } from '../pages/FonteProcedenciaPage';
import * as backend from '../services/backend';

const PROC: backend.Procedencia = {
  fonte: 'siconfi_rgf',
  descricao: 'Relatório de Gestão Fiscal',
  orgao: 'Tesouro Nacional (STN)',
  familia: 'siconfi',
  cadencia: 'quadrimestral',
  acesso: 'api_rest',
  acesso_rotulo: 'API REST (JSON)',
  portal: 'https://siconfi.tesouro.gov.br/siconfi/pages/public/consulta_finbra/finbra_list.jsf',
  documentacao: 'https://apidatalake.tesouro.gov.br/docs/siconfi/',
  licenca: 'Dados abertos — Lei de Acesso à Informação (Lei 12.527/2011)',
  autenticacao: 'Não requer — dado público, sem chave nem cadastro.',
  como_funciona:
    'O RGF é separado por poder, e a API exige co_poder em cada chamada: um ente municipal ' +
    'rende 2 chamadas por período e um estadual rende 5.',
  endpoints: [
    {
      metodo: 'GET',
      url: 'https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rgf',
      formato: 'JSON (ORDS paginado)',
      o_que_traz: 'Anexos do RGF: pessoal, dívida, garantias, operações e caixa.',
      parametros: [
        { nome: 'co_poder', exemplo: 'E', significado: 'Poder: E=Executivo, L=Legislativo.' },
        { nome: 'id_ente', exemplo: '2304400', significado: 'Código IBGE do ente.' },
      ],
      exemplo:
        'https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rgf?an_exercicio=2025&co_poder=E&id_ente=2304400',
      observacao: 'É de onde sai o percentual de pessoal do Executivo.',
    },
  ],
  paginas_impactadas: ['dashboard', 'limites', 'divida'],
  dependencias: ['siconfi_rreo'],
  requer_configuracao: null,
};

function montar(fonte = 'siconfi_rgf') {
  return render(
    <MemoryRouter initialEntries={[`/central-dados/fontes/${fonte}`]}>
      <AppProvider>
        <Routes>
          <Route path="/central-dados/fontes/:fonte" element={<FonteProcedenciaPage />} />
        </Routes>
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('procedência da fonte', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(backend, 'fetchProcedencia').mockResolvedValue(PROC);
  });

  it('mostra o endereço da chamada por inteiro', async () => {
    montar();
    // Endereço truncado não permite reproduzir a consulta — seria decoração, não auditoria.
    expect(
      await screen.findByText('https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rgf'),
    ).toBeInTheDocument();
  });

  it('o exemplo é um link que abre a fonte real, em nova aba e sem vazar a sessão', async () => {
    montar();
    const link = await screen.findByRole('link', { name: /an_exercicio=2025/ });
    expect(link).toHaveAttribute('href', PROC.endpoints[0].exemplo);
    expect(link).toHaveAttribute('target', '_blank');
    // `noopener` impede que a página de destino alcance a nossa via window.opener.
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('cada parâmetro vem com o que significa — nome cru não audita', async () => {
    montar();
    const tabela = await screen.findByRole('table');
    const linha = within(tabela).getByText('co_poder').closest('tr')!;
    expect(within(linha).getByText(/E=Executivo/)).toBeInTheDocument();
  });

  it('explica como a ingestão funciona naquela fonte', async () => {
    montar();
    expect(await screen.findByText(/a API exige co_poder em cada chamada/)).toBeInTheDocument();
  });

  it('leva ao portal público e à documentação', async () => {
    montar();
    expect(await screen.findByRole('link', { name: /consultar sem API/ })).toHaveAttribute(
      'href',
      PROC.portal,
    );
    expect(screen.getByRole('link', { name: /especificação da API/ })).toHaveAttribute(
      'href',
      PROC.documentacao!,
    );
  });

  it('a dependência é navegável — a origem de uma fonte inclui a das que ela usa', async () => {
    montar();
    expect(await screen.findByRole('link', { name: 'siconfi_rreo' })).toHaveAttribute(
      'href',
      '/central-dados/fontes/siconfi_rreo',
    );
  });

  it('avisa quando a fonte não roda sem configuração do operador', async () => {
    vi.spyOn(backend, 'fetchProcedencia').mockResolvedValue({
      ...PROC,
      fonte: 'siconfi_rreo_minimos_pdf',
      requer_configuracao: 'Informe params.page_url_template do portal do ente.',
    });
    montar('siconfi_rreo_minimos_pdf');
    expect(await screen.findByRole('note')).toHaveTextContent('page_url_template');
  });

  it('numera as chamadas só quando há mais de uma', async () => {
    montar();
    expect(await screen.findByText('A chamada que a ingestão faz')).toBeInTheDocument();
    expect(screen.queryByText('1/1')).not.toBeInTheDocument();
  });

  it('em fonte de duas etapas, a ordem aparece — ela é a informação', async () => {
    vi.spyOn(backend, 'fetchProcedencia').mockResolvedValue({
      ...PROC,
      endpoints: [PROC.endpoints[0], { ...PROC.endpoints[0], exemplo: null, observacao: null }],
    });
    montar();
    expect(await screen.findByText('As 2 chamadas que a ingestão faz')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByText('2/2')).toBeInTheDocument();
  });
});
