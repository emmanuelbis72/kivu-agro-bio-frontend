import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Layout
import MainLayout from "./components/layout/MainLayout";

// Pages
import DashboardPage from "./pages/DashboardPage";
import AccountingDashboardPage from "./pages/AccountingDashboardPage";
import AIReasoningPage from "./pages/AIReasoningPage";
import AIScoringDashboardPage from "./pages/AIScoringDashboardPage";
import AIBusinessRulesPage from "./pages/AIBusinessRulesPage";
import ProductsPage from "./pages/ProductsPage";
import WarehousesPage from "./pages/WarehousesPage";
import StockPage from "./pages/StockPage";
import ProductionPage from "./pages/ProductionPage";
import CustomersPage from "./pages/CustomersPage";
import InvoicesPage from "./pages/InvoicesPage";
import PaymentsPage from "./pages/PaymentsPage";
import ExpensesPage from "./pages/ExpensesPage";
import AccountsPage from "./pages/AccountsPage";
import AccountingSettingsPage from "./pages/AccountingSettingsPage";
import JournalEntriesPage from "./pages/JournalEntriesPage";
import TrialBalancePage from "./pages/TrialBalancePage";
import GeneralLedgerPage from "./pages/GeneralLedgerPage";
import IncomeStatementPage from "./pages/IncomeStatementPage";
import BalanceSheetPage from "./pages/BalanceSheetPage";
import KabotDashboardPage from "./pages/KabotDashboardPage";
import CompanyKnowledgePage from "./pages/CompanyKnowledgePage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="dashboard" element={<DashboardPage />} />
          <Route
            path="accounting-dashboard"
            element={<AccountingDashboardPage />}
          />

          <Route path="products" element={<ProductsPage />} />
          <Route path="warehouses" element={<WarehousesPage />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="production" element={<ProductionPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="expenses" element={<ExpensesPage />} />

          <Route path="accounts" element={<AccountsPage />} />
          <Route
            path="accounting-settings"
            element={<AccountingSettingsPage />}
          />
          <Route path="journal-entries" element={<JournalEntriesPage />} />
          <Route path="journal-entries/:id" element={<JournalEntriesPage />} />
          <Route path="trial-balance" element={<TrialBalancePage />} />
          <Route path="general-ledger" element={<GeneralLedgerPage />} />
          <Route path="income-statement" element={<IncomeStatementPage />} />
          <Route path="balance-sheet" element={<BalanceSheetPage />} />

          <Route path="ai-reasoning" element={<AIReasoningPage />} />
          <Route path="ai-scoring" element={<AIScoringDashboardPage />} />
          <Route path="ai-business-rules" element={<AIBusinessRulesPage />} />
          <Route path="kabot" element={<KabotDashboardPage />} />
          <Route
            path="company-knowledge"
            element={<CompanyKnowledgePage />}
          />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}