# Qualidade de interface — Sprint 27

Os cinco fluxos, axe, snapshots e Lighthouse usam o frontend e o backend reais de um
ambiente isolado, sem credenciais embutidas nos specs. A única interceptação é o benchmark
de virtualização: `virtualization.spec.ts` deriva a forma da resposta real de
`/uf/23/ranking` e a expande, apenas dentro do navegador de teste, para uma fixture
determinística de 184 linhas. Nenhum mock é carregado pelo bundle de produção.

## Preparação local

1. Suba o backend de desenvolvimento com dados de teste.
2. Copie `.env.e2e.example` para `.env.e2e`.
3. Preencha uma conta de teste com a capacidade `administrar`. Nunca use uma conta de produção.
4. Instale o navegador uma vez: `npx playwright install chromium`.

Comandos:

- `npm run lint` e `npm run typecheck:e2e`: validam regras e tipos da infraestrutura.
- `npm run test:e2e`: sessão compartilhada, cinco fluxos, axe e regressão visual.
- `npm run test:a11y`: axe WCAG nas 18 rotas de `src/App.tsx`.
- `npm run test:visual`: compara as cinco páginas pesadas com os baselines compartilhados.
- `npm run test:visual:update`: atualiza intencionalmente os baselines após revisão visual.
- `npm run test:usability`: valida teclado e layout em 1024×768 e grava vídeo inclusive no sucesso.
- `npm run lighthouse`: build de produção e budgets de performance/acessibilidade.

Os artefatos locais (`.playwright`, `test-results`, `playwright-report`, `.lighthouseci` e
`lighthouse-report`) são ignorados pelo Git. Somente imagens aprovadas em
`e2e/__screenshots__` devem ser versionadas.

Na CI, configure `E2E_API_BASE_URL` como variável e `E2E_EMAIL`/`E2E_PASSWORD` como
segredos do ambiente de homologação. Sem a URL de homologação, o job E2E é
deliberadamente ignorado; lint, tipos, Vitest, build e auditoria de dependências continuam
obrigatórios.
