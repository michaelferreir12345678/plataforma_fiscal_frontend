# Erário — Plataforma de Inteligência Fiscal

Front-end real em **React + Vite + TypeScript** da plataforma Erário: SaaS de
inteligência fiscal que transforma dados do SICONFI (RREO, RGF, DCA, MSC) em
painéis, alertas e previsões para o gestor público.

> Projeto-fonte completo e editável — sem HTML único, sem runtime proprietário.
> Todo layout, cards, gráficos, tabelas e filtros estão implementados em
> componentes React. Os dados são mockados em `src/services/` para você trocar
> por chamadas de API depois.

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
    ├── services/               # dados mockados (trocar por API)
    │   ├── dashboardData.ts
    │   ├── limitesData.ts
    │   ├── carteiraData.ts
    │   └── alertasData.ts
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

## Trocar mock por API real

Os arquivos em `src/services/` exportam os dados consumidos pelas páginas.
Para integrar o backend, substitua os arrays por chamadas (`fetch`/axios/react-query)
mantendo as mesmas interfaces de `src/types/index.ts`. O `.env.example` traz
`VITE_API_BASE_URL` como ponto de partida — copie para `.env` e ajuste.

## Tokens de marca

- **Tipografia:** Space Grotesk (UI) + JetBrains Mono (números, `tabular-nums`).
- **Cor institucional:** verde-floresta `#1B3A2E` sobre fundo `#FAF9F6`.
- **Cores de risco (semânticas):** verde `#1F9D6B` · amarelo `#E8B53A` ·
  laranja `#E07A2F` · vermelho `#D14343` · neutro `#5B6B7B`.

Definidos em `src/theme.ts` — altere lá para propagar a todo o app.
