import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';
import { CockpitPage } from './pages/CockpitPage';
import { CarteiraPage } from './pages/CarteiraPage';
import { LimitesPage } from './pages/LimitesPage';
import { ReceitaPage } from './pages/ReceitaPage';
import { DespesaPage } from './pages/DespesaPage';
import { DividaPage } from './pages/DividaPage';
import { ResultadoPage } from './pages/ResultadoPage';
import { CaixaPage } from './pages/CaixaPage';
import { PatrimonioPage } from './pages/PatrimonioPage';
import { SaudeEducacaoPage } from './pages/SaudeEducacaoPage';
import { PrevisoesPage } from './pages/PrevisoesPage';
import { BenchmarkingPage } from './pages/BenchmarkingPage';
import { AlertasPage } from './pages/AlertasPage';
import { AssistentePage } from './pages/AssistentePage';
import { RelatoriosPage } from './pages/RelatoriosPage';
import { AdminPage } from './pages/AdminPage';
import { CentralDadosPage } from './pages/CentralDadosPage';
import { RequireAdministrar } from './components/RequireAdministrar';

export default function App() {
  return (
    <Routes>
      {/* Aplicação — dentro do shell (sidebar + topbar + footer) */}
      <Route element={<AppShell />}>
        {/* Mesma rota: o Dashboard virou o Cockpit executivo (Sprint 22). */}
        <Route path="/dashboard" element={<CockpitPage />} />
        <Route path="/carteira" element={<CarteiraPage />} />
        <Route path="/limites" element={<LimitesPage />} />
        <Route path="/receita" element={<ReceitaPage />} />
        <Route path="/despesa" element={<DespesaPage />} />
        <Route path="/divida" element={<DividaPage />} />
        <Route path="/resultado" element={<ResultadoPage />} />
        <Route path="/caixa" element={<CaixaPage />} />
        <Route path="/patrimonio" element={<PatrimonioPage />} />
        <Route path="/saude-educacao" element={<SaudeEducacaoPage />} />
        <Route path="/previsoes" element={<PrevisoesPage />} />
        <Route path="/benchmarking" element={<BenchmarkingPage />} />
        <Route path="/alertas" element={<AlertasPage />} />
        <Route path="/assistente" element={<AssistentePage />} />
        <Route path="/relatorios" element={<RelatoriosPage />} />
        <Route
          path="/admin"
          element={
            <RequireAdministrar>
              <AdminPage />
            </RequireAdministrar>
          }
        />
        <Route
          path="/central-dados"
          element={
            <RequireAdministrar>
              <CentralDadosPage />
            </RequireAdministrar>
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
