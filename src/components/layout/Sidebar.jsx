import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Boxes,
  Factory,
  Users,
  FileText,
  Wallet,
  Receipt,
  BookOpenText,
  Settings2,
  ScrollText,
  Scale,
  LibraryBig,
  TrendingUp,
  Landmark,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Brain,
  SlidersHorizontal,
  Target,
  ShieldAlert,
  DatabaseZap,
  Radar
} from "lucide-react";

const mainLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/products", label: "Produits", icon: Package },
  { to: "/warehouses", label: "Dépôts", icon: Warehouse },
  {
    to: "/stock",
    label: "Stock / Transformations",
    icon: Boxes
  },
  {
    to: "/production",
    label: "Production / Recettes",
    icon: Factory
  },
  { to: "/customers", label: "Clients", icon: Users },
  { to: "/invoices", label: "Factures", icon: FileText },
  { to: "/payments", label: "Paiements", icon: Wallet },
  { to: "/expenses", label: "Dépenses", icon: Receipt }
];

const accountingLinks = [
  {
    to: "/accounting-dashboard",
    label: "Dashboard comptable",
    icon: BarChart3
  },
  { to: "/accounts", label: "Plan comptable OHADA", icon: BookOpenText },
  { to: "/journal-entries", label: "Journal comptable", icon: ScrollText },
  { to: "/trial-balance", label: "Balance générale", icon: Scale },
  { to: "/general-ledger", label: "Grand livre", icon: LibraryBig },
  { to: "/income-statement", label: "Compte de résultat", icon: TrendingUp },
  { to: "/balance-sheet", label: "Bilan", icon: Landmark },
  {
    to: "/accounting-settings",
    label: "Paramétrage comptable",
    icon: Settings2
  }
];

const aiLinks = [
  { to: "/ai-control-tower", label: "Tour de contrôle IA", icon: Radar },
  { to: "/ai-reasoning", label: "Assistant Direction IA", icon: Brain },
  { to: "/kabot", label: "KABOT Dashboard", icon: ShieldAlert },
  {
    to: "/company-knowledge",
    label: "Mémoire entreprise",
    icon: DatabaseZap
  },
  {
    to: "/ai-scoring",
    label: "Scoring intelligent IA",
    icon: Target
  },
  {
    to: "/ai-business-rules",
    label: "Règles métier IA",
    icon: SlidersHorizontal
  }
];

function SidebarLink({ to, label, icon: Icon, nested = false }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
          nested ? "ml-3" : ""
        } ${
          isActive
            ? "bg-brand-50 text-brand-700"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`
      }
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const location = useLocation();

  const accountingSectionActive = accountingLinks.some((item) =>
    location.pathname.startsWith(item.to)
  );

  const aiSectionActive = aiLinks.some((item) =>
    location.pathname.startsWith(item.to)
  );

  const [accountingOpen, setAccountingOpen] = useState(accountingSectionActive);
  const [aiOpen, setAiOpen] = useState(aiSectionActive);

  return (
    <aside className="w-72 shrink-0 border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-6">
        <div className="text-brand-600 text-xs font-semibold uppercase tracking-[0.2em]">
          KIVU AGRO BIO
        </div>
        <div className="mt-2 text-2xl font-bold text-slate-900">
          Gestion Pro
        </div>
        <div className="mt-1 text-sm text-slate-500">
          Catalogue produits, stock intelligent, recettes, ventes, dépenses,
          comptabilité et intelligence artificielle
        </div>
      </div>

      <nav className="space-y-2 p-4">
        {mainLinks.map((item) => (
          <SidebarLink key={item.to} {...item} />
        ))}

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setAiOpen((prev) => !prev)}
            className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
              aiSectionActive
                ? "bg-brand-50 text-brand-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span className="flex items-center gap-3">
              <Brain size={18} />
              <span>Intelligence artificielle</span>
            </span>

            {aiOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>

          {aiOpen ? (
            <div className="mt-2 space-y-2 border-l border-slate-200 pl-2">
              {aiLinks.map((item) => (
                <SidebarLink key={item.to} {...item} nested />
              ))}
            </div>
          ) : null}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setAccountingOpen((prev) => !prev)}
            className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
              accountingSectionActive
                ? "bg-brand-50 text-brand-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span className="flex items-center gap-3">
              <BookOpenText size={18} />
              <span>Comptabilité</span>
            </span>

            {accountingOpen ? (
              <ChevronDown size={18} />
            ) : (
              <ChevronRight size={18} />
            )}
          </button>

          {accountingOpen ? (
            <div className="mt-2 space-y-2 border-l border-slate-200 pl-2">
              {accountingLinks.map((item) => (
                <SidebarLink key={item.to} {...item} nested />
              ))}
            </div>
          ) : null}
        </div>
      </nav>
    </aside>
  );
}
