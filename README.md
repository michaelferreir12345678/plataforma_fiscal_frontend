# Erário — Plataforma de Inteligência Fiscal

Front-end real em **React + Vite + TypeScript** da plataforma Erário: SaaS de
inteligência fiscal que transforma dados do SICONFI (RREO, RGF, DCA, MSC) em
painéis, alertas e previsões para o gestor público.

> Projeto-fonte completo e editável — sem HTML único, sem runtime proprietário.
> As telas fiscais usam o backend FastAPI autenticado; valores, fontes e memórias
> de cálculo vêm dos dados reais SICONFI/IBGE materializados na camada gold.

## Stack

- **React 18** + **TypeScript**
- **Vite 5** (dev server + build)
- **React Router 6** (navegação entre telas)
- Estilo com tokens de marca (`src/theme.ts`) + estilos inline + `global.css`
  (sem dependência de framework de CSS — tudo editável)

## Como rodar

```bash
npm install
npm run dev      # http://localhost:5173
```

Build de produção e preview:

```bash
npm run build    # gera dist/
npm run preview  # serve o build
npm run typecheck # checagem de tipos (tsc --noEmit)
```

Abra a pasta no **VS Code** ou **PyCharm** e rode os comandos no terminal
integrado. O `npm run dev` abre o navegador automaticamente.

## Estrutura

```text
erario-plataforma-fiscal/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.example
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx                # bootstrap React + Router
    ├── App.tsx                 # definição de rotas
    ├── theme.ts                # tokens de cor/tipografia + cores de risco
    ├── styles/global.css       # reset + base
    ├── types/index.ts          # interfaces TypeScript compartilhadas
    ├── utils/format.ts         # formatação pt-BR + helpers de SVG/gauge
    ├── components/             # componentes reutilizáveis
    │   ├── Card.tsx
    │   ├── Icon.tsx
    │   ├── SectionLabel.tsx
    │   ├── Breadcrumb.tsx
    │   ├── StatusBadge.tsx
    │   ├── Sparkline.tsx
    │   ├── KpiCard.tsx
    │   ├── MetricHeader.tsx
    │   └── RadialMeter.tsx     # medidor de faixa LRF (componente-assinatura)
    ├── layouts/
    │   ├── AppShell.tsx        # topbar + sidebar + footer + <Outlet/>
    │   └── navConfig.tsx       # configuração da navegação
    ├── services/               # cliente HTTP tipado e contratos do backend
    │   ├── api.ts              # fetch, JWT e erros RFC 7807
    │   └── backend.ts          # endpoints e tipos por módulo
    └── pages/                  # uma página por tela/rota
        ├── DashboardPage.tsx
        ├── CarteiraPage.tsx
        ├── LimitesPage.tsx
        ├── ReceitaPage.tsx
        ├── DespesaPage.tsx
        ├── DividaPage.tsx
        ├── ResultadoPage.tsx
        ├── CaixaPage.tsx
        ├── SaudeEducacaoPage.tsx
        ├── PrevisoesPage.tsx
        ├── BenchmarkingPage.tsx
        ├── AlertasPage.tsx
        ├── AssistentePage.tsx
        ├── RelatoriosPage.tsx
        ├── AdminPage.tsx
        └── OnboardingPage.tsx
```

## Rotas

| Rota | Tela |
|---|---|
| `/dashboard` | Dashboard Executivo (ente) |
| `/carteira` | Painel de Carteira / Visão Estadual (mapa hex do CE) |
| `/limites` | Monitor de Limites (medidor radial + memória + simulador) |
| `/receita` `/despesa` `/divida` `/resultado` `/caixa` `/saude-educacao` | Telas de detalhe por bloco |
| `/previsoes` | Previsões & Cenários (controles "e se?") |
| `/benchmarking` | Benchmarking & Comparativos |
| `/alertas` | Alertas & Conformidade |
| `/assistente` | Assistente de IA (respostas fundamentadas) |
| `/relatorios` | Relatórios & Exportação |
| `/admin` | Administração (multi-tenant, RBAC, faturamento…) |
| `/onboarding` | Onboarding (wizard de 4 passos, fora do shell) |

## Backend e dados reais

Copie `.env.example` para `.env` e ajuste `VITE_API_BASE_URL`. O cliente compartilhado
em `src/services/api.ts` faz login, envia o JWT e converte erros RFC 7807; os contratos
tipados ficam em `src/services/backend.ts`. `AppContext`, `useResource` e `AsyncState`
centralizam ente, período, carregamento, vazio e erro.

A tela `/benchmarking` chama `GET /benchmark` e `GET /benchmark/ranking`: permite trocar
indicador e coorte (porte/região/PIB), exibe distribuição e cobertura real, mantém o ente
ancorado no ranking e mostra `source_ref`, `as_of` e memória de cálculo nos drills. Não
existe chave de ativação ou fallback para dados mockados em produção.

## Tokens de marca

- **Tipografia:** Space Grotesk (UI) + JetBrains Mono (números, `tabular-nums`).
- **Cor institucional:** verde-floresta `#1B3A2E` sobre fundo `#FAF9F6`.
- **Cores de risco (semânticas):** verde `#1F9D6B` · amarelo `#E8B53A` ·
  laranja `#E07A2F` · vermelho `#D14343` · neutro `#5B6B7B`.

Definidos em `src/theme.ts` — altere lá para propagar a todo o app.
