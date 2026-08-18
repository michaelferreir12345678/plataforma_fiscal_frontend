/**
 * Recusa um bundle cuja base de API não é utilizável em produção.
 *
 * **Por que isto existe.** Um deploy foi ao ar com a base compilada como
 * `C:/Program Files/Git/api`: o Git Bash no Windows converte um argumento que pareça
 * caminho POSIX (`VITE_API_BASE_URL=/api`) em caminho do Windows antes de o Vite vê-lo.
 * O build passou, o `tsc` passou, os 303 testes passaram, o `index.html` subiu, o nginx
 * respondeu 200 em tudo — e mesmo assim toda chamada do frontend morria em
 * "Failed to fetch", porque o valor errado só existe *dentro* do JS minificado.
 *
 * Nenhuma verificação anterior podia pegar isso: typecheck e testes rodam sobre o código
 * fonte, onde a variável ainda é `import.meta.env.VITE_API_BASE_URL`. O erro nasce no
 * momento em que o shell entrega o valor ao processo de build, e só é observável no
 * artefato. Daí a checagem ser sobre o **artefato**, e ser parte do `build`: uma
 * verificação que se pode esquecer de rodar não protege o deploy que se fez com pressa.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist/assets';

/** Bases aceitáveis: caminho absoluto de mesma origem, ou URL http(s) explícita. */
const BASE_VALIDA = /^(\/[^\s"']*|https?:\/\/[^\s"']+)$/;

/** O que denuncia a conversão de caminho do MSYS/Git Bash. */
const MARCAS_DE_PATH_MANGLING = [/^[A-Za-z]:[/\\]/, /Program Files/i, /Git[/\\]api/i];

function bases(js) {
  // O Vite substitui `import.meta.env.VITE_API_BASE_URL` pelo literal e o minificador o
  // move para uma constante. Procuramos o literal que termina em `/api` ou que pareça a
  // base — a captura é ampla de propósito: é melhor examinar um candidato a mais do que
  // deixar passar o único que importa.
  const achados = new Set();
  for (const m of js.matchAll(/["'`]([^"'`\n]{0,120}\/api)["'`]/g)) achados.add(m[1]);
  return [...achados];
}

const arquivos = readdirSync(DIST).filter((f) => f.endsWith('.js'));
if (arquivos.length === 0) {
  console.error('[verificar-bundle] nenhum .js em', DIST);
  process.exit(1);
}

const problemas = [];
for (const arquivo of arquivos) {
  const js = readFileSync(join(DIST, arquivo), 'utf8');
  for (const base of bases(js)) {
    if (MARCAS_DE_PATH_MANGLING.some((re) => re.test(base))) {
      problemas.push(
        `${arquivo}: base "${base}" — o shell converteu o caminho antes do build.\n` +
          '    No Git Bash use: MSYS_NO_PATHCONV=1 VITE_API_BASE_URL=/api npm run build\n' +
          "    No PowerShell:   $env:VITE_API_BASE_URL='/api'; npm run build",
      );
    } else if (!BASE_VALIDA.test(base)) {
      problemas.push(`${arquivo}: base "${base}" não é um caminho absoluto nem uma URL.`);
    }
  }
}

if (problemas.length > 0) {
  console.error('\n[verificar-bundle] BUILD RECUSADO — a base da API não serve em produção:\n');
  for (const p of problemas) console.error('  ✗ ' + p);
  console.error(
    '\n  Este bundle passaria em typecheck, lint e testes e quebraria toda chamada de\n' +
      '  rede em produção com "Failed to fetch". Já aconteceu uma vez.\n',
  );
  process.exit(1);
}

console.log(`[verificar-bundle] ok — ${arquivos.length} arquivo(s), base da API utilizável.`);
