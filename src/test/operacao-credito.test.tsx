/**
 * Drill até a linha profunda: da lista de PVL à ficha completa da operação.
 *
 * Duas coisas se provam aqui. A primeira é a queixa concreta: uma tabela com centenas de
 * pleitos empurrava a rolagem da página inteira, e agora tem altura própria. A segunda é
 * o que o clique precisa entregar para não ser cerimônia — a ficha tem de mostrar o que a
 * lista **não** mostra, incluindo o CDP, que a plataforma ingeria e nenhuma tela lia.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { OperacaoCreditoPage } from '../pages/OperacaoCreditoPage';
import * as backend from '../services/backend';

const DETALHE: backend.OperacaoDetalhe = {
  cod_ibge: '2304400',
  pleito: {
    id_pvl: '73695',
    num_pvl: 'PVL02.000653/2026-16',
    num_processo: '17944.002255/2026-05',
    tipo_operacao: 'Operação contratual interna',
    finalidade: 'Reestruturação e recomposição do principal de dívidas',
    credor: 'Banco do Brasil S/A',
    tipo_credor: 'Instituição Financeira Nacional',
    moeda: 'Real',
    valor: 450_000_000,
    status: 'Arquivado a pedido',
    data_protocolo: '2026-02-10',
    data_analise: '2026-05-04',
  },
  cdp: [
    {
      num_pvl: 'PVL02.000653/2026-16',
      num_processo: '17944.002255/2026-05',
      data_ref: '2025-12-31',
      situacao: 'Regular',
      motivo: 'Atualizado e homologado',
    },
  ],
  cronograma: [
    {
      ano: 2026,
      principal: 10_000_000,
      encargos: 2_000_000,
      valor: 12_000_000,
      dc_amortizacao: 9_000_000,
      dc_encargos: 1_800_000,
      oc_amortizacao: 1_000_000,
      oc_encargos: 200_000,
      operacoes: 1,
    },
  ],
  total_amortizacao: 10_000_000,
  total_encargos: 2_000_000,
  restante_amortizacao: 4_000_000,
  restante_encargos: 800_000,
  horizonte_ate: 2026,
  observacoes: {
    cronograma_escopo:
      'Este cronograma é do ente inteiro, na fotografia tirada quando este pleito foi analisado.',
  },
  source_refs: [
    { relatorio: 'SADIPEM-PVL', anexo: 'Pedidos de verificação de limites', periodo: '2026', versao_entrega: '20260731' },
    { relatorio: 'SADIPEM-CDP', anexo: 'Cadastro da Dívida Pública (base nacional)', periodo: 'BR', versao_entrega: '20260731' },
  ] as backend.SourceRef[],
};

function montar(detalhe: backend.OperacaoDetalhe = DETALHE) {
  vi.spyOn(backend, 'fetchDividaOperacao').mockResolvedValue(detalhe);
  return render(
    <MemoryRouter initialEntries={['/divida/operacao/73695']}>
      <AppProvider>
        <Routes>
          <Route path="/divida/operacao/:idPleito" element={<OperacaoCreditoPage />} />
        </Routes>
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('ficha da operação de crédito', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('mostra os identificadores do processo — sem eles não há como conferir no Tesouro', async () => {
    montar();
    expect(await screen.findByText('PVL02.000653/2026-16')).toBeInTheDocument();
    expect(screen.getByText('17944.002255/2026-05')).toBeInTheDocument();
  });

  it('traz o CDP daquele pleito, que a lista não mostra', async () => {
    montar();
    const tabela = await screen.findByRole('table', {
      name: /Cadastro da Dívida Pública/,
    });
    expect(within(tabela).getByText('Regular')).toBeInTheDocument();
    expect(within(tabela).getByText('Atualizado e homologado')).toBeInTheDocument();
  });

  it('o cronograma fala em encargos, nunca em juros', async () => {
    montar();
    const tabela = await screen.findByRole('table', { name: /Cronograma anual/ });
    expect(within(tabela).getByText('Encargos')).toBeInTheDocument();
    // O SADIPEM não separa juros; a coluna existia e vinha zerada, o que se lia como
    // "não há juros" em vez de "a fonte não discrimina".
    expect(within(tabela).queryByText('Juros')).not.toBeInTheDocument();
  });

  it('seção vazia explica por quê, em vez de ficar em branco', async () => {
    montar({
      ...DETALHE,
      cronograma: [],
      observacoes: {
        cronograma:
          'Sem cronograma publicado para este pleito. O SADIPEM só publica cronograma de operação contratada.',
      },
    });
    expect(await screen.findByText(/só publica cronograma de operação contratada/)).toBeInTheDocument();
  });

  it('fecha o círculo: de cada número ao endpoint que o originou', async () => {
    montar();
    const links = await screen.findAllByRole('link', { name: /ver o endpoint de origem/ });
    expect(links[0]).toHaveAttribute('href', '/central-dados/fontes/sadipem_pvl');
    expect(links[1]).toHaveAttribute('href', '/central-dados/fontes/sadipem_cdp');
  });

  it('declara que o cronograma é do ente, não desta operação', async () => {
    montar();
    // Sem isto, o gestor compara bilhões de serviço com o valor do pedido e conclui que
    // a conta não fecha. O SADIPEM não publica cronograma por operação.
    expect(await screen.findByRole('note')).toHaveTextContent(/do ente inteiro/);
    expect(
      screen.getByText(/Cronograma da dívida do ente na análise deste pleito/),
    ).toBeInTheDocument();
  });

  it('diz que encargos incluem juros, em vez de deixar supor que juros são zero', async () => {
    montar();
    const tabela = await screen.findByRole('table', { name: /Cronograma anual/ });
    expect(within(tabela).getByText('inclui juros')).toBeInTheDocument();
  });

  it('mostra o que vence além do horizonte publicado', async () => {
    montar();
    // A fonte fecha a série com "Restante a pagar"; descartá-la subestimava o
    // compromisso — em Fortaleza, 7,8% da fotografia vigente.
    expect(await screen.findByText(/Após 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Restante a pagar/)).toBeInTheDocument();
  });

  it('não inventa linha de residual quando a fonte não publicou', async () => {
    montar({ ...DETALHE, restante_amortizacao: 0, restante_encargos: 0, horizonte_ate: 2026 });
    expect(screen.queryByText(/Após 2026/)).not.toBeInTheDocument();
  });

  it('volta para a página de dívida', async () => {
    montar();
    expect(await screen.findByRole('link', { name: /Dívida e crédito/ })).toHaveAttribute(
      'href',
      '/divida',
    );
  });

  it('não trava quando a operação não tem CDP nem cronograma', async () => {
    montar({ ...DETALHE, cdp: [], cronograma: [], observacoes: {} });
    // Sem texto do backend, ainda assim declara a ausência — nunca área em branco.
    const avisos = await screen.findAllByText(/Sem registro para esta operação/);
    expect(avisos).toHaveLength(2);
  });
});
