/**
 * O último degrau do drill: a linha do relatório como o ente entregou.
 *
 * A tela só cumpre o papel se **confrontar** — mostrar o número do painel ao lado da soma
 * das colunas da entrega. Bater é o que transforma o drill em prova; e quando não bate,
 * os dois números precisam aparecer, porque esconder a divergência é pior que não ter o
 * drill.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { LinhaBrutaPage } from '../pages/LinhaBrutaPage';
import * as backend from '../services/backend';

const BASE: backend.LinhaBruta = {
  cod_ibge: '2304400',
  periodo: '2025-B6',
  as_of: null,
  codigo: 'ReceitasCorrentes',
  descricao: 'Receitas Correntes',
  medidas: { previsto_inicial: 12_916_221_147, arrecadado_acum: 13_123_460_686.18 },
  linhas: [
    {
      anexo: 'RREO-Anexo 01',
      conta: 'Receitas Correntes',
      cod_conta: 'ReceitasCorrentes',
      coluna: 'PREVISÃO INICIAL',
      valor: 12_916_221_147,
      linha_seq: 7,
      medida: 'previsto_inicial',
    },
    {
      anexo: 'RREO-Anexo 01',
      conta: 'Receitas Correntes',
      cod_conta: 'ReceitasCorrentes',
      coluna: 'Até o Bimestre (c)',
      valor: 13_123_460_686.18,
      linha_seq: 11,
      medida: 'arrecadado_acum',
    },
    {
      anexo: 'RREO-Anexo 01',
      conta: 'Receitas Correntes',
      cod_conta: 'ReceitasCorrentes',
      coluna: 'SALDO (a-c)',
      valor: 275_238_016.82,
      linha_seq: 13,
      medida: null,
    },
  ],
  conferencia: { previsto_inicial: 12_916_221_147, arrecadado_acum: 13_123_460_686.18 },
  observacao: null,
  source_ref: {
    relatorio: 'RREO',
    anexo: 'Anexo 01',
    periodo: '2025-B6',
    versao_entrega: '1',
  } as backend.SourceRef,
};

function montar(dados: backend.LinhaBruta = BASE) {
  vi.spyOn(backend, 'fetchReceitaLinha').mockResolvedValue(dados);
  return render(
    <MemoryRouter initialEntries={['/receita/linha/ReceitasCorrentes?periodo=2025-B6']}>
      <AppProvider>
        <Routes>
          <Route path="/receita/linha/:codigo" element={<LinhaBrutaPage modulo="receita" />} />
        </Routes>
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('fundo do drill — linha do relatório', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('confronta o número do painel com a soma da entrega', async () => {
    montar();
    const tabela = await screen.findByRole('table', { name: /Medidas do mart confrontadas/ });
    const linha = within(tabela).getByText('previsto_inicial').closest('tr')!;
    expect(within(linha).getByText('confere')).toBeInTheDocument();
  });

  it('mostra a divergência em vez de escondê-la', async () => {
    montar({
      ...BASE,
      conferencia: { previsto_inicial: 99, arrecadado_acum: 13_123_460_686.18 },
    });
    const tabela = await screen.findByRole('table', { name: /Medidas do mart confrontadas/ });
    const linha = within(tabela).getByText('previsto_inicial').closest('tr')!;
    expect(within(linha).getByText('DIVERGE')).toBeInTheDocument();
  });

  it('exibe as colunas que a entrega publica e o painel não usa', async () => {
    montar();
    const tabela = await screen.findByRole('table', { name: /Linhas do relatório/ });
    const saldo = within(tabela).getByText('SALDO (a-c)').closest('tr')!;
    // Se o drill só repetisse o agregado, o clique seria cerimônia.
    expect(within(saldo).getByText('não usada no painel')).toBeInTheDocument();
  });

  it('marca a seção intra-orçamentária, que repete os mesmos rótulos de coluna', async () => {
    montar({
      ...BASE,
      linhas: [
        ...BASE.linhas,
        { ...BASE.linhas[0], cod_conta: 'RREO2TotalDespesasIntra', linha_seq: 40 },
      ],
    });
    const tabela = await screen.findByRole('table', { name: /Linhas do relatório/ });
    // Sem a marca, a mesma coluna aparece duas vezes e se lê como duplicidade.
    expect(within(tabela).getByText(/intra-orçamentária/)).toBeInTheDocument();
  });

  it('não formata percentual como se fosse dinheiro', async () => {
    montar({
      ...BASE,
      linhas: [{ ...BASE.linhas[0], coluna: '% (c/a)', valor: 97.95, medida: null }],
    });
    const tabela = await screen.findByRole('table', { name: /Linhas do relatório/ });
    expect(within(tabela).getByText(/97,95%/)).toBeInTheDocument();
  });

  it('declara que este é o último degrau e aponta o endpoint de origem', async () => {
    montar();
    expect(await screen.findByText(/último degrau navegável/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver o endpoint de origem/ })).toHaveAttribute(
      'href',
      '/central-dados/fontes/siconfi_rreo',
    );
  });

  it('quando não há linha, diz o motivo em vez de mostrar tabela vazia', async () => {
    montar({
      ...BASE,
      linhas: [],
      observacao: 'O nó foi materializado antes de a plataforma registrar a linha de origem.',
    });
    expect(await screen.findByText(/antes de a plataforma registrar/)).toBeInTheDocument();
  });
});
