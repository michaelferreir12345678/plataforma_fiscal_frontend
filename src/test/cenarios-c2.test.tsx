/**
 * Sprint C2 na tela: o cenário salvo deixa de ser um cartão inerte.
 *
 * O teste central é o da reabertura, e ele existe por causa de um erro que não aparece:
 * mostrar o resultado congelado com a mesma cara de um cálculo corrente. Se o ente entregou
 * RGF novo desde o salvamento, as mesmas premissas dão outro número hoje — e a tela que
 * exibe só um dos dois está afirmando algo que não verificou.
 *
 * Os três estados precisam ser visualmente distintos: **continua valendo**, **mudou**, e
 * **não deu para comparar**. Os dois últimos costumam ser colapsados num booleano só, e aí
 * uma versão sem procedência aparece como conferida.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { PrevisoesPage } from '../pages/PrevisoesPage';
import * as backend from '../services/backend';
import type { CenarioAberto, CenarioDetalhe, ComparacaoCenarios } from '../services/backend';

const SOURCE_REF = { relatorio: 'RGF', anexo: 'Anexo 01', periodo: '2025-Q3', versao_entrega: '1' };

function projecaoBase() {
  return {
    cod_ibge: '2304400',
    indicador: 'pessoal',
    descricao: 'Despesa com Pessoal',
    unidade: 'PCT_RCL',
    modelo: 'holt_winters',
    esfera: 'municipal',
    nivel_confianca: 95,
    horizonte: 4,
    as_of: null,
    gerado_em: null,
    historico: [
      { periodo: '2025-B6', valor: 47.2, versao_entrega: '1', as_of: null, source_ref: SOURCE_REF },
    ],
    projecao: [
      {
        periodo_alvo: '2026-B2',
        passo: 1,
        valor_previsto: 47.41,
        ic_inferior: 45,
        ic_superior: 49,
        teto_pct: 54,
        faixa: 'normal',
        cruza_limite: false,
      },
    ],
    cruzamento: {
      aplicavel: true,
      cruza: false,
      periodo_cruzamento: null,
      passo_cruzamento: null,
      valor_no_cruzamento: null,
      teto_pct: 54,
      indicador_limite: 'pessoal_executivo',
      esfera: 'municipal',
    },
    espaco_fiscal: null,
    reconducao: null,
    memoria: { saneamento: { pontos_excluidos: 0 } },
    source_ref: SOURCE_REF,
  };
}

function detalhe(over: Partial<CenarioDetalhe> = {}): CenarioDetalhe {
  return {
    id: 'c-1',
    ente: '2304400',
    indicador: 'pessoal',
    nome: 'Reajuste 6%',
    versao_atual: 2,
    arquivado: false,
    criado_em: '2026-08-01T10:00:00Z',
    atualizado_em: '2026-08-03T10:00:00Z',
    criado_por: 'gestor@ente.gov.br',
    versoes: [
      {
        versao: 2,
        nome: 'Reajuste 6%',
        parametros: { ipca_aa_pct: 4.54, horizonte: 4 },
        modelo: 'holt_winters',
        horizonte: 4,
        nota: null,
        procedencia: {
          as_of: '2026-08-03T10:00:00Z',
          versoes_entrega: { '2025-B6': '1' },
          premissas_observadas: {},
          registrada: true,
        },
        criado_em: '2026-08-03T10:00:00Z',
        criado_por: 'gestor@ente.gov.br',
      },
      {
        versao: 1,
        nome: 'Rascunho',
        parametros: { ipca_aa_pct: 4.0 },
        modelo: 'fechamento',
        horizonte: 4,
        nota: null,
        procedencia: {
          as_of: '2026-08-01T10:00:00Z',
          versoes_entrega: {},
          premissas_observadas: {},
          registrada: true,
        },
        criado_em: '2026-08-01T10:00:00Z',
        criado_por: null,
      },
    ],
    ...over,
  };
}

function aberto(divergencia: Partial<CenarioAberto['divergencia']>): CenarioAberto {
  const d = detalhe();
  return {
    cenario: d,
    versao: d.versoes[0],
    guardado: { projecao: projecaoBase().projecao },
    recalculado: null,
    divergencia: {
      comparavel: true,
      diverge: false,
      motivo: null,
      valor_guardado: 47.41,
      valor_recalculado: 47.41,
      delta: 0,
      entregas_novas: [],
      ...divergencia,
    },
  } as CenarioAberto;
}

function mockar(cenarios: CenarioDetalhe[] = [detalhe()]) {
  vi.spyOn(backend, 'fetchProjecao').mockResolvedValue(projecaoBase() as never);
  vi.spyOn(backend, 'fetchPremissasCenario').mockResolvedValue({
    cod_ibge: '2304400',
    premissas: [],
    nota: '',
  });
  vi.spyOn(backend, 'fetchCenarios').mockResolvedValue(cenarios);
  vi.spyOn(backend, 'fetchComparacaoModelos').mockRejectedValue(new Error('fora do escopo'));
}

function montar() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <PrevisoesPage />
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('lista de cenários salvos', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('mostra quantas versões o cenário tem', async () => {
    // Antes o cartão dizia só nome, indicador e data — nada revelava que editar tinha
    // criado histórico.
    mockar();
    montar();
    expect(await screen.findByText(/Reajuste 6%/)).toBeInTheDocument();
    expect(screen.getByText(/2 versões/)).toBeInTheDocument();
  });

  it('avisa quando a versão não tem procedência registrada', async () => {
    // Versão migrada do formato antigo não pode prometer reprodutibilidade que não tem.
    const d = detalhe();
    d.versoes[0].procedencia.registrada = false;
    mockar([d]);
    montar();
    expect(await screen.findByText(/procedência não registrada/i)).toBeInTheDocument();
  });

  it('sem cenários, explica o que salvar serve', async () => {
    mockar([]);
    montar();
    expect(await screen.findByText(/Nenhum cenário salvo/i)).toBeInTheDocument();
    expect(screen.getByText(/sobre qual entrega foi calculado/i)).toBeInTheDocument();
  });

  it('oferece arquivar, não apagar', async () => {
    // Apagar removeria a evidência de uma decisão porque a lista ficou grande.
    mockar();
    montar();
    expect(await screen.findByRole('button', { name: /arquivar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^excluir$/i })).not.toBeInTheDocument();
  });
});

describe('cenário reaberto', () => {
  beforeEach(() => vi.restoreAllMocks());

  /** Abre o cenário e devolve o painel — os mesmos números existem no gráfico da página,
   *  então a asserção precisa de escopo para não passar (nem falhar) por acidente. */
  async function abrir(div: Partial<CenarioAberto['divergencia']>) {
    mockar();
    vi.spyOn(backend, 'fetchCenario').mockResolvedValue(aberto(div));
    montar();
    (await screen.findByRole('button', { name: /reabrir/i })).click();
    return within(await screen.findByTestId('cenario-reaberto'));
  }

  it('mostra o guardado e o de hoje lado a lado', async () => {
    // Escolher um dos dois seria decidir por quem pergunta qual pergunta ele está fazendo.
    const painel = await abrir({
      valor_guardado: 47.41, valor_recalculado: 49.1, delta: 1.69, diverge: true,
    });
    expect(painel.getByText(/Como foi salvo/i)).toBeInTheDocument();
    expect(painel.getByText(/Com o dado de hoje/i)).toBeInTheDocument();
    expect(painel.getByText(/47,41%/)).toBeInTheDocument();
    expect(painel.getByText(/49,10%/)).toBeInTheDocument();
  });

  it('quando bate, diz que o cenário continua valendo', async () => {
    const painel = await abrir({ comparavel: true, diverge: false });
    expect(painel.getByText(/continua valendo/i)).toBeInTheDocument();
  });

  it('quando muda, diz que mudou e por quê', async () => {
    const painel = await abrir({
      comparavel: true,
      diverge: true,
      motivo: 'O dado mudou desde o salvamento.',
      entregas_novas: ['2026-B2'],
    });
    expect(painel.getByText(/O resultado mudou desde que você salvou/i)).toBeInTheDocument();
    expect(painel.getByText(/Entregas que apareceram depois/i)).toBeInTheDocument();
    expect(painel.getByText('2026-B2')).toBeInTheDocument();
  });

  it('"não deu para comparar" não é apresentado como "está tudo igual"', async () => {
    // O erro que este teste trava: colapsar `comparavel` e `diverge` num booleano só faz
    // uma versão sem procedência aparecer como conferida.
    const painel = await abrir({
      comparavel: false,
      diverge: false,
      motivo: 'Versão salva antes de a procedência ser registrada.',
    });
    expect(painel.getByText(/Não foi possível comparar/i)).toBeInTheDocument();
    expect(painel.queryByText(/continua valendo/i)).not.toBeInTheDocument();
  });

  it('lista o histórico de versões', async () => {
    const painel = await abrir({});
    expect(painel.getByText(/Histórico/i)).toBeInTheDocument();
    expect(painel.getByText(/Rascunho/)).toBeInTheDocument();
  });
});

describe('comparação de cenários', () => {
  beforeEach(() => vi.restoreAllMocks());

  const comparacao: ComparacaoCenarios = {
    cod_ibge: '2304400',
    indicador: 'pessoal',
    periodos: ['2026-B2'],
    itens: [
      {
        cenario_id: 'c-1',
        nome: 'Reajuste 6%',
        versao: 2,
        encontrado: true,
        motivo_ausencia: null,
        indicador: 'pessoal',
        unidade: 'PCT_RCL',
        modelo: 'holt_winters',
        parametros: {},
        projecao: projecaoBase().projecao as never,
        valor_final: 47.41,
        espaco_fiscal: null,
        criado_em: '2026-08-03T10:00:00Z',
      },
      {
        cenario_id: 'c-fantasma',
        nome: '(não encontrado)',
        versao: 0,
        encontrado: false,
        motivo_ausencia: 'Cenário inexistente ou de outra organização.',
        indicador: null,
        unidade: null,
        modelo: null,
        parametros: {},
        projecao: [],
        valor_final: null,
        espaco_fiscal: null,
        criado_em: null,
      },
    ],
    aviso: null,
  };

  it('aparece ao marcar dois cenários e usa a janela comum', async () => {
    const dois = [detalhe(), detalhe({ id: 'c-2', nome: 'Sem reajuste' })];
    mockar(dois);
    vi.spyOn(backend, 'compararCenarios').mockResolvedValue(comparacao);
    montar();
    const marcas = await screen.findAllByRole('checkbox');
    marcas[0].click();
    marcas[1].click();
    expect(await screen.findByText(/Comparação de cenários/i)).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: '2026-B2' })).toBeInTheDocument();
  });

  it('cenário não encontrado permanece na tabela, dito', async () => {
    // Sumir da lista faria o gestor comparar uma curva achando que são as duas que marcou.
    const dois = [detalhe(), detalhe({ id: 'c-2', nome: 'Sem reajuste' })];
    mockar(dois);
    vi.spyOn(backend, 'compararCenarios').mockResolvedValue(comparacao);
    montar();
    const marcas = await screen.findAllByRole('checkbox');
    marcas[0].click();
    marcas[1].click();
    expect(
      await screen.findByText(/inexistente ou de outra organização/i),
    ).toBeInTheDocument();
  });

  it('avisa quando os indicadores comparados têm escalas diferentes', async () => {
    const dois = [detalhe(), detalhe({ id: 'c-2', nome: 'RCL' })];
    mockar(dois);
    vi.spyOn(backend, 'compararCenarios').mockResolvedValue({
      ...comparacao,
      indicador: null,
      aviso: 'Os cenários comparados são de indicadores diferentes; as escalas não são a mesma.',
    });
    montar();
    const marcas = await screen.findAllByRole('checkbox');
    marcas[0].click();
    marcas[1].click();
    expect(await screen.findByText(/escalas não são a mesma/i)).toBeInTheDocument();
  });

  it('um cenário marcado sozinho não abre a comparação', async () => {
    // Comparar consigo mesmo não é comparar; o painel só faz sentido a partir de dois.
    mockar([detalhe(), detalhe({ id: 'c-2', nome: 'Outro' })]);
    montar();
    const marcas = await screen.findAllByRole('checkbox');
    marcas[0].click();
    expect(screen.queryByText(/Comparação de cenários/i)).not.toBeInTheDocument();
  });
});
