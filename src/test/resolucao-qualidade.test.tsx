/**
 * O painel de resolução (Sprint Q1) — o que ele oferece e, sobretudo, o que recusa.
 *
 * O valor da tela não está nos botões existirem: está em cada falha receber **apenas** a
 * ação que existe para a sua classe. Oferecer "reprocessar" numa divergência entre dois
 * demonstrativos que o ente publicou gasta o tempo do gestor, não muda o resultado e
 * ensina a desconfiar do botão — e um botão em que ninguém confia é pior que botão nenhum.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ResolucaoQualidade } from '../components/ResolucaoQualidade';
import * as backend from '../services/backend';
import * as api from '../services/api';

const DEFEITO_NOSSO = {
  check_codigo: 'mart_vs_detalhe_pessoal',
  cod_ibge: '2304400',
  periodo: '2025-B6',
  fonte: 'siconfi_rgf',
  status_check: 'falha',
  esquerda: '45.57',
  direita: '46.54',
  diferenca: '-0.97',
  tolerancia: '0.01',
  classe: 'plataforma' as const,
  lado_esquerdo: 'percentual do semáforo (mart_indicador)',
  lado_direito: 'percentual recomposto pela página de detalhe',
  porque: 'O semáforo e a página de detalhe são duas leituras nossas do mesmo dado.',
  diagnostico: {},
  acoes: ['rematerializar' as const],
  tratativa: null,
};

const DIVERGENCIA_DA_FONTE = {
  ...DEFEITO_NOSSO,
  check_codigo: 'dcl_a6_vs_rgf',
  esquerda: '309020505.01',
  direita: '309026595.01',
  diferenca: '-6090.00',
  tolerancia: '1.00',
  classe: 'fonte' as const,
  lado_esquerdo: 'dívida do fim do período no RREO Anexo 6',
  lado_direito: 'dívida apurada no RGF Anexo 2',
  // Texto real do backend (quality/causa.py) — inclui a frase que diz o que fazer.
  porque:
    'São dois demonstrativos que o mesmo ente publicou e que não fecham entre si. ' +
    'A correção é retificação na fonte, feita pelo ente.',
  acoes: ['aceitar_como_fato' as const],
};

function mockMe(capacidades: string[]) {
  vi.spyOn(api, 'getToken').mockReturnValue('token');
  vi.spyOn(backend, 'fetchMe').mockResolvedValue({
    usuario: { id: 'u1', email: 'g@e.gov.br', nome: 'Gestor' },
    org_ativa: { id: 'o1', nome: 'Sefaz', tipo: 'estadual', capacidades },
    orgs: [],
  } as never);
}

function montar(ocorrencias: unknown[]) {
  vi.spyOn(backend, 'fetchOcorrenciasQualidade').mockResolvedValue({
    data: ocorrencias,
    total: ocorrencias.length,
    por_classe: {},
  } as never);
  return render(<ResolucaoQualidade />);
}

describe('Painel de resolução de qualidade', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('divergência da FONTE não oferece reprocessamento — e diz por quê', async () => {
    mockMe(['ver', 'editar', 'administrar']);
    montar([DIVERGENCIA_DA_FONTE]);

    await screen.findByText(/dcl_a6_vs_rgf/);
    // O ponto central: mesmo com `administrar`, não existe botão de reprocessar aqui.
    expect(screen.queryByRole('button', { name: /Rematerializar/ })).toBeNull();
    // E a ausência é explicada, não deixada como espaço em branco.
    expect(
      await screen.findByText(/A correção é retificação na fonte, feita pelo ente/),
    ).toBeTruthy();
  });

  it('defeito NOSSO oferece reprocessar e não oferece aceitar como fato', async () => {
    // Controle negativo do teste acima. Se "aceitar" aparecesse aqui, o fluxo permitiria
    // arquivar como fato da fonte uma divergência entre dois números nossos.
    mockMe(['ver', 'editar', 'administrar']);
    montar([DEFEITO_NOSSO]);

    expect(await screen.findByRole('button', { name: /Rematerializar/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Aceitar como fato/ })).toBeNull();
  });

  it('sem a capacidade que a ação exige, o botão vem desabilitado com o motivo', async () => {
    // Rematerializar escreve na gold, que é compartilhada entre organizações. Oferecer o
    // botão para quem vai levar 403 ensina a duvidar dos outros botões da tela.
    mockMe(['ver']);
    montar([DEFEITO_NOSSO]);

    const botao = await screen.findByRole('button', { name: /Rematerializar/ });
    expect(botao).toBeDisabled();
    expect(botao.getAttribute('title')).toMatch(/administrar/);
  });

  it('mostra os dois lados com o nome de cada um', async () => {
    // Sem a evidência, o gestor teria de acreditar no rótulo da classe.
    mockMe(['ver']);
    montar([DIVERGENCIA_DA_FONTE]);

    expect(await screen.findByText(/dívida do fim do período no RREO Anexo 6/)).toBeTruthy();
    expect(screen.getByText(/dívida apurada no RGF Anexo 2/)).toBeTruthy();
  });

  it('o desfecho vem do veredito reexecutado, não do "apliquei a ação"', async () => {
    mockMe(['ver', 'editar', 'administrar']);
    montar([DEFEITO_NOSSO]);
    const aplicar = vi.spyOn(backend, 'aplicarAcaoQualidade').mockResolvedValue({
      ...DEFEITO_NOSSO,
      acoes: [],
      tratativa: {
        status: 'acao_aplicada',
        classe: 'plataforma',
        justificativa: null,
        tentativas: [{ acao: 'rematerializar', status_apos: 'falha' }],
        atualizado_em: '2026-08-18T12:00:00Z',
      },
    } as never);

    await userEvent.click(await screen.findByRole('button', { name: /Rematerializar/ }));

    await waitFor(() => expect(aplicar).toHaveBeenCalled());
    // Ação aplicada e o check continua falhando: a tela diz isso, em vez de comemorar.
    expect(
      await screen.findByText(/continua falhando/),
    ).toBeTruthy();
  });
});
