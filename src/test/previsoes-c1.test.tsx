/**
 * Sprint C1 na tela: a premissa tem procedência, e a projeção não esconde o que ignorou.
 *
 * Os dois defeitos que estes testes travam são de natureza diferente do resto da suíte.
 * Não é um rótulo ambíguo: é a tela apresentando como premissa do gestor um número que
 * ninguém mediu, e apresentando como projeção um resultado que descartou parte da série
 * sem dizer. Nos dois casos o erro é invisível — a tela fica exatamente igual à tela
 * correta.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { PrevisoesPage } from '../pages/PrevisoesPage';
import * as backend from '../services/backend';
import type { ProjecaoResponse, PremissasResponse } from '../services/backend';

const SOURCE_REF = {
  relatorio: 'RGF',
  anexo: 'Anexo 01',
  periodo: '2025-Q3',
  versao_entrega: '1',
};

function projecao(over: Partial<ProjecaoResponse> = {}): ProjecaoResponse {
  return {
    cod_ibge: '2304400',
    indicador: 'pessoal',
    descricao: 'Despesa com Pessoal — Executivo (% RCL)',
    unidade: 'PCT_RCL',
    modelo: 'holt_winters',
    esfera: 'municipal',
    nivel_confianca: 95,
    horizonte: 4,
    as_of: null,
    gerado_em: null,
    historico: [
      { periodo: '2025-B4', valor: 46.8, versao_entrega: '1', as_of: null, source_ref: SOURCE_REF },
      { periodo: '2025-B6', valor: 47.2, versao_entrega: '1', as_of: null, source_ref: SOURCE_REF },
    ],
    projecao: [
      {
        periodo_alvo: '2026-B2',
        passo: 1,
        valor_previsto: 47.41,
        ic_inferior: 45.1,
        ic_superior: 49.7,
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
    espaco_fiscal: {
      indicador: 'pessoal_executivo',
      sentido: 'teto',
      situacao: 'folga',
      limite_pct: 54,
      projetado_pct: 47.41,
      margem_pp: 6.59,
      margem_rs: 826_075_245,
      base_rs: 12_539_078_077,
      base_nome: 'rcl',
      base_periodo: '2025-B6',
      periodo_alvo: '2026-B2',
    },
    reconducao: {
      aplicavel: false,
      excesso_pp: 0,
      excesso_rs: 0,
      primeiro_quadrimestre_pp: 0,
      primeiro_quadrimestre_rs: 0,
      segundo_quadrimestre_pp: 0,
      segundo_quadrimestre_rs: 0,
      fundamento: 'LRF art. 23 · vedações do §3º em caso de descumprimento',
    },
    memoria: { saneamento: { pontos_excluidos: 0 } },
    source_ref: SOURCE_REF,
    ...over,
  } as ProjecaoResponse;
}

const PREMISSAS: PremissasResponse = {
  cod_ibge: '2304400',
  premissas: [
    {
      chave: 'ipca_aa_pct',
      rotulo: 'IPCA acumulado em 12 meses',
      unidade: '%_aa',
      observado: 4.64,
      motivo: null,
      referencia: '2026-06-01',
      fonte: 'BCB/SGS série 433',
      n_observacoes: 12,
    },
    {
      chave: 'selic_aa_pct',
      rotulo: 'Selic acumulada em 12 meses',
      unidade: '%_aa',
      observado: 14.28,
      motivo: null,
      referencia: '2026-07-01',
      fonte: 'BCB/SGS série 4390',
      n_observacoes: 12,
    },
    {
      chave: 'fpm_variacao_pct',
      rotulo: 'Variação do FPM',
      unidade: '%',
      observado: null,
      motivo: 'O ente não tem dois exercícios completos de FPM no acervo para comparar.',
      referencia: null,
      fonte: 'Tesouro Nacional · FPM',
      n_observacoes: null,
    },
  ],
  nota: 'Valores observados, não projeções de mercado.',
};

function montar() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <PrevisoesPage />
      </AppProvider>
    </MemoryRouter>,
  );
}

function mockar(over: Partial<ProjecaoResponse> = {}) {
  vi.spyOn(backend, 'fetchProjecao').mockResolvedValue(projecao(over));
  vi.spyOn(backend, 'fetchPremissasCenario').mockResolvedValue(PREMISSAS);
  vi.spyOn(backend, 'fetchCenarios').mockResolvedValue([]);
  vi.spyOn(backend, 'fetchComparacaoModelos').mockRejectedValue(new Error('fora do escopo'));
}

describe('premissas de cenário', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('parte do observado, com data e fonte à vista', async () => {
    // Antes eram 4,5% e 10,5% escritos no código. A Selic observada é 14,28% — quem
    // aceitasse o padrão simulava com 3,8 pontos percentuais de erro sem saber que havia
    // um padrão.
    mockar();
    montar();
    expect(await screen.findByText(/14,28%/)).toBeInTheDocument();
    expect(screen.getByText(/BCB\/SGS série 4390/)).toBeInTheDocument();
    // IPCA e Selic acumulam a mesma janela; as duas dizem "12 meses".
    expect(screen.getAllByText(/12 meses/)).toHaveLength(2);
  });

  it('premissa sem observação mostra o motivo em vez de sugerir número', async () => {
    // Um valor de fábrica é indistinguível de um medido depois que entra no formulário.
    mockar();
    montar();
    expect(
      await screen.findByText(/não tem dois exercícios completos de FPM/i),
    ).toBeInTheDocument();
  });

  it('não exibe os antigos valores de fábrica', async () => {
    mockar();
    montar();
    // O valor observado aparece legitimamente em dois lugares (o controle ancorado e a
    // nota "observado" abaixo dele) — `findAllByText` espera até pelo menos uma
    // ocorrência existir, sem quebrar quando as duas já resolveram no mesmo commit.
    await screen.findAllByText(/14,28%/);
    expect(screen.queryByText(/10,50%/)).not.toBeInTheDocument();
  });
});

describe('espaço fiscal', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('mostra a margem em pontos percentuais e em reais', async () => {
    // "Cruza o teto em 2026-B2" não se assina; empenho se assina em reais.
    mockar();
    montar();
    expect(await screen.findByText(/Margem até o limite/i)).toBeInTheDocument();
    expect(screen.getByText(/6,59 p\.p\./)).toBeInTheDocument();
    expect(screen.getByText(/826,08 mi|826,1 mi|R\$ 826/)).toBeInTheDocument();
  });

  it('excesso não é chamado de margem', async () => {
    // Os dois são o mesmo número com sinais opostos; o rótulo é que não pode ser o mesmo.
    mockar({
      espaco_fiscal: {
        indicador: 'pessoal_executivo',
        sentido: 'teto',
        situacao: 'excedido',
        limite_pct: 54,
        projetado_pct: 57.3,
        margem_pp: 3.3,
        margem_rs: 413_789_576,
        base_rs: 12_539_078_077,
        base_nome: 'rcl',
        base_periodo: '2025-B6',
        periodo_alvo: '2026-B2',
      },
      reconducao: {
        aplicavel: true,
        excesso_pp: 3.3,
        excesso_rs: 413_789_576,
        primeiro_quadrimestre_pp: 1.1,
        primeiro_quadrimestre_rs: 137_929_858,
        segundo_quadrimestre_pp: 2.2,
        segundo_quadrimestre_rs: 275_859_717,
        fundamento: 'LRF art. 23 · vedações do §3º em caso de descumprimento',
      },
    });
    montar();
    expect(await screen.findByText(/Excesso a eliminar/i)).toBeInTheDocument();
    expect(screen.queryByText(/Margem até o limite/i)).not.toBeInTheDocument();
  });

  it('quando excede, diz o que a lei exige e em que prazo', async () => {
    mockar({
      espaco_fiscal: {
        indicador: 'pessoal_executivo',
        sentido: 'teto',
        situacao: 'excedido',
        limite_pct: 54,
        projetado_pct: 57.3,
        margem_pp: 3.3,
        margem_rs: 413_789_576,
        base_rs: 12_539_078_077,
        base_nome: 'rcl',
        base_periodo: '2025-B6',
        periodo_alvo: '2026-B2',
      },
      reconducao: {
        aplicavel: true,
        excesso_pp: 3.3,
        excesso_rs: 413_789_576,
        primeiro_quadrimestre_pp: 1.1,
        primeiro_quadrimestre_rs: 137_929_858,
        segundo_quadrimestre_pp: 2.2,
        segundo_quadrimestre_rs: 275_859_717,
        fundamento: 'LRF art. 23 · vedações do §3º em caso de descumprimento',
      },
    });
    montar();
    expect(await screen.findByText(/Recondução obrigatória/i)).toBeInTheDocument();
    expect(screen.getByText(/LRF art\. 23/)).toBeInTheDocument();
  });

  it('indicador sem limite legal não inventa margem', async () => {
    mockar({ espaco_fiscal: null, reconducao: null });
    montar();
    await screen.findByText(/Cruzamento de limite|sem teto legal/i);
    expect(screen.queryByText(/Margem até o limite/i)).not.toBeInTheDocument();
  });
});

describe('saneamento da série', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('declara a observação que o treino ignorou, e por quê', async () => {
    // Excluir sem dizer troca um número errado por outro que ninguém pode auditar.
    mockar({
      memoria: {
        saneamento: {
          pontos_excluidos: 1,
          exclusoes: [
            {
              periodo: '2023-B2',
              valor: 324.49,
              motivo: '324.49% da RCL é impossível (acima de 100%).',
            },
          ],
        },
      },
    });
    montar();
    expect(await screen.findByText(/ignorou 1 observação/i)).toBeInTheDocument();
    expect(screen.getByText(/2023-B2/)).toBeInTheDocument();
    expect(screen.getByText(/impossível/i)).toBeInTheDocument();
  });

  it('cala quando nada foi excluído', async () => {
    mockar();
    montar();
    await screen.findByText(/Margem até o limite/i);
    expect(screen.queryByText(/ignorou/i)).not.toBeInTheDocument();
  });
});

describe('consumo da margem no cenário', () => {
  beforeEach(() => vi.restoreAllMocks());

  function espaco(situacao: 'folga' | 'excedido', margemPp: number, margemRs: number) {
    return {
      indicador: 'pessoal_executivo',
      sentido: 'teto' as const,
      situacao,
      limite_pct: 54,
      projetado_pct: situacao === 'folga' ? 54 - margemPp : 54 + margemPp,
      margem_pp: margemPp,
      margem_rs: margemRs,
      base_rs: 12_539_078_077,
      base_nome: 'rcl',
      base_periodo: '2025-B6',
      periodo_alvo: '2026-B2',
    };
  }

  function cenarioResposta(espacoCenario: ReturnType<typeof espaco>) {
    return {
      persistido: false,
      cenario_id: null,
      cod_ibge: '2304400',
      indicador: 'pessoal',
      horizonte: 4,
      base: projecao({ espaco_fiscal: espaco('folga', 6.59, 826_075_245) }),
      cenario: projecao({ espaco_fiscal: espacoCenario }),
      impacto_limites: [],
      impacto_minimos: [],
      memoria: {},
      source_refs: [SOURCE_REF],
    };
  }

  it('diz quanto da margem a premissa come, em p.p. e em reais', async () => {
    // "Posso dar 6% de reajuste?" não se responde em pontos percentuais da RCL.
    mockar();
    vi.spyOn(backend, 'simularCenario').mockResolvedValue(
      // margem cai de 6,59 p.p. para 3,00 p.p.
      cenarioResposta(espaco('folga', 3.0, 376_172_342)) as never,
    );
    montar();
    const botao = await screen.findByRole('button', { name: /^Simular$/ });
    botao.click();
    expect(await screen.findByText(/consome da margem/i)).toBeInTheDocument();
    expect(await screen.findByText(/3,59 p\.p\./)).toBeInTheDocument();
  });

  it('avisa quando o cenário faz a projeção atravessar o limite', async () => {
    // Ir de folga a excesso é a informação que decide — e a subtração só faz sentido com
    // a margem assinada, senão "6,59 para 2,00" pareceria melhora.
    mockar();
    vi.spyOn(backend, 'simularCenario').mockResolvedValue(
      cenarioResposta(espaco('excedido', 2.0, 250_781_562)) as never,
    );
    montar();
    const botao = await screen.findByRole('button', { name: /^Simular$/ });
    botao.click();
    expect(
      await screen.findByText(/passa a exceder o limite/i),
    ).toBeInTheDocument();
    // **A subtração só vale com a margem assinada.** De 6,59 p.p. de folga para 2,00 p.p.
    // de excesso, a perda é 8,59 p.p. — não 4,59. Sem o sinal, atravessar o limite
    // pareceria custar metade do que custa, que é o erro exatamente onde ele importa.
    expect(await screen.findByText(/8,59 p\.p\./)).toBeInTheDocument();
    expect(screen.queryByText(/4,59 p\.p\./)).not.toBeInTheDocument();
  });
});
