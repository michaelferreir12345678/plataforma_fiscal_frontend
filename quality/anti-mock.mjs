/**
 * Trava anti-mock (Sprint 28).
 *
 * A auditoria §4 catalogou 13 pontos em que a interface mostrava número inventado.
 * Todos foram removidos ao longo das Sprints 20–27. Este script existe para que não
 * voltem — sem ele, a garantia depende de alguém lembrar em cada revisão.
 *
 * A regra de fundo é simples: **nenhum número fiscal nasce no frontend**. Ele vem de
 * `services/backend.ts`, que só chama a API. Um array literal com valores no caminho
 * de produção é, por definição, um número sem fonte.
 *
 * Uso: `node quality/anti-mock.mjs` (código 1 em caso de violação).
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const VARRIDOS = ['src/pages', 'src/services', 'src/components', 'src/layouts'];

/**
 * Exceções **explícitas**, cada uma com o motivo. Uma allowlist sem justificativa vira
 * depósito: em dois meses ninguém sabe se a entrada ainda se aplica.
 */
const PERMITIDOS = [
  {
    padrao: /^src\/services\/api\.ts$/,
    motivo: 'Camada HTTP: não contém dado fiscal, só transporte.',
  },
  {
    padrao: /^src\/pages\/.*\.test\.tsx?$/,
    motivo: 'Teste: fixture é o objeto do teste, não caminho de produção.',
  },
];

/** Termos que caracterizam um literal como **fiscal**, não como configuração de UI. */
const TERMOS_FISCAIS = [
  'cod_ibge', 'valor_rs', 'valor_pct_rcl', 'rcl', 'pct_rcl', 'periodo',
  'despesa', 'receita', 'divida', 'dcl', 'faixa', 'indicador', 'source_ref',
  'empenhado', 'liquidado', 'pago', 'saldo', 'populacao',
];

/**
 * Os 13 itens da §4, verificados por identidade e não por heurística: alguns são
 * "este arquivo não pode voltar a existir", outros são "este padrão não pode
 * reaparecer neste arquivo".
 */
const ITENS_AUDITORIA = [
  { n: 1, alvo: 'src/services/carteiraData.ts', tipo: 'arquivo-proibido',
    nota: '20 entes com % fictícios alimentavam a CarteiraPage em produção.' },
  { n: 2, alvo: 'src/services/dashboardData.ts', tipo: 'arquivo-proibido',
    nota: 'KPIs e semáforo falsos.' },
  { n: 3, alvo: 'src/services/limitesData.ts', tipo: 'arquivo-proibido',
    nota: '5 limites com histórico inventado.' },
  { n: 4, alvo: 'src/services/alertasData.ts', tipo: 'arquivo-proibido',
    nota: 'alertas e obrigações fictícios.' },
  { n: 5, alvo: 'src/layouts/AppShell.tsx', tipo: 'padrao-proibido',
    padrao: /usuári[ao]\s*:\s*['"][^'"]+['"]|v2\.4\.1/i,
    nota: 'usuária fixa e versão fixa no rodapé — deve vir de /me e /health.' },
  { n: 6, alvo: 'src/layouts/AppShell.tsx', tipo: 'padrao-exigido',
    padrao: /fetchMe/,
    nota: 'o shell tem de se identificar pelo /me real.' },
  { n: 7, alvo: 'src/layouts/navConfig.tsx', tipo: 'padrao-proibido',
    padrao: /badge:\s*\{\s*text:\s*['"](\d+)['"]/,
    nota: 'badges numéricos fixos ("184", "3") no menu.' },
  { n: 8, alvo: 'src/pages/AdminPage.tsx', tipo: 'padrao-exigido',
    padrao: /fetchUsuarios|fetchPapeis|carteiraLote/,
    nota: 'abas de Organização/Usuários/Permissões ligadas ao CRUD real.' },
  { n: 9, alvo: 'src/pages/PatrimonioPage.tsx', tipo: 'padrao-proibido',
    padrao: /const\s+ENTES\s*(:|=)/,
    nota: 'seletor-demo trocava o ente do contexto sem avisar.' },
  { n: 10, alvo: 'src/pages/OnboardingPage.tsx', tipo: 'arquivo-proibido',
    nota: 'wizard inteiramente estático.' },
  { n: 11, alvo: 'src/components/LoginGate.tsx', tipo: 'padrao-exigido',
    padrao: /app_env/,
    nota: 'credencial de demonstração só pode aparecer com APP_ENV=local.' },
  { n: 12, alvo: 'src/pages/CarteiraPage.tsx', tipo: 'padrao-exigido',
    padrao: /fetchCarteira|fetchRankingUf|fetchConsolidadoUf/,
    nota: 'a página tem de consumir a carteira/UF reais.' },
  { n: 13, alvo: '../backend_plataforma_fiscal/src/app/main.py', tipo: 'padrao-exigido',
    padrao: /app_env\.lower\(\)\s*in\s*\{"local", "development", "test"\}/,
    nota: 'o recurso didático hierarchy_demo só existe fora de produção.' },
];

function arquivos(dir) {
  const saida = [];
  const caminho = join(RAIZ, dir);
  let entradas;
  try {
    entradas = readdirSync(caminho);
  } catch {
    return saida;
  }
  for (const entrada of entradas) {
    const completo = join(caminho, entrada);
    if (statSync(completo).isDirectory()) {
      saida.push(...arquivos(join(dir, entrada)));
    } else if (/\.tsx?$/.test(entrada)) {
      saida.push(completo);
    }
  }
  return saida;
}

function permitido(rel) {
  return PERMITIDOS.some((p) => p.padrao.test(rel));
}

/**
 * Um array literal de objetos conta como mock fiscal quando tem **três ou mais**
 * elementos e alguma chave do vocabulário fiscal. O corte em três não é arbitrário:
 * um ou dois objetos são tipicamente configuração (par de eixos, opções de um seletor);
 * a partir de três, é tabela — e tabela de número fiscal só vem da API.
 */
function acharMocks(conteudo) {
  const achados = [];
  const regex = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*\[\s*\{/g;
  let m;
  while ((m = regex.exec(conteudo)) !== null) {
    const inicio = m.index;
    let profundidade = 0;
    let fim = inicio;
    for (let i = conteudo.indexOf('[', inicio); i < conteudo.length; i += 1) {
      if (conteudo[i] === '[') profundidade += 1;
      else if (conteudo[i] === ']') {
        profundidade -= 1;
        if (profundidade === 0) { fim = i; break; }
      }
    }
    const bloco = conteudo.slice(inicio, fim + 1);
    const elementos = (bloco.match(/\{/g) || []).length;
    const termos = TERMOS_FISCAIS.filter((t) => new RegExp(`\\b${t}\\b`, 'i').test(bloco));
    const temNumeros = /:\s*-?\d[\d_.]*\s*[,}]/.test(bloco);
    if (elementos >= 3 && termos.length >= 2 && temNumeros) {
      achados.push({
        nome: m[1],
        linha: conteudo.slice(0, inicio).split('\n').length,
        elementos,
        termos: termos.slice(0, 4),
      });
    }
  }
  return achados;
}

const violacoes = [];

// --- Parte 1: nenhum array fiscal estático no caminho de produção ---
for (const dir of VARRIDOS) {
  for (const arquivo of arquivos(dir)) {
    const rel = relative(RAIZ, arquivo).replace(/\\/g, '/');
    if (permitido(rel) || /\.test\.tsx?$/.test(rel)) continue;
    const conteudo = readFileSync(arquivo, 'utf8');
    for (const achado of acharMocks(conteudo)) {
      violacoes.push(
        `${rel}:${achado.linha} — array fiscal estático \`${achado.nome}\` ` +
        `(${achado.elementos} itens; termos: ${achado.termos.join(', ')}). ` +
        'Número fiscal vem da API, via services/backend.ts.',
      );
    }
  }
}

// --- Parte 2: os 13 itens da auditoria §4, um a um ---
for (const item of ITENS_AUDITORIA) {
  const caminho = join(RAIZ, item.alvo);
  let conteudo = null;
  try {
    conteudo = readFileSync(caminho, 'utf8');
  } catch {
    conteudo = null;
  }
  if (item.tipo === 'arquivo-proibido') {
    if (conteudo !== null) {
      violacoes.push(`§4 item ${item.n}: ${item.alvo} voltou a existir — ${item.nota}`);
    }
  } else if (conteudo === null) {
    violacoes.push(
      `§4 item ${item.n}: ${item.alvo} não encontrado; a verificação não pôde ser feita.`,
    );
  } else if (item.tipo === 'padrao-proibido' && item.padrao.test(conteudo)) {
    violacoes.push(`§4 item ${item.n}: padrão proibido reapareceu em ${item.alvo} — ${item.nota}`);
  } else if (item.tipo === 'padrao-exigido' && !item.padrao.test(conteudo)) {
    violacoes.push(
      `§4 item ${item.n}: ${item.alvo} deixou de atender a garantia — ${item.nota}`,
    );
  }
}

if (violacoes.length > 0) {
  console.error('\n✗ Trava anti-mock: dado inventado no caminho de produção\n');
  for (const v of violacoes) console.error(`  • ${v}`);
  console.error(
    `\n${violacoes.length} violação(ões). A plataforma não exibe número sem fonte — ` +
    'se o dado não existe, a tela diz que não existe.\n',
  );
  process.exit(1);
}

console.log(
  `✓ Trava anti-mock: ${VARRIDOS.length} diretórios varridos e os 13 itens da ` +
  'auditoria §4 verificados. Nenhum dado inventado no caminho de produção.',
);
