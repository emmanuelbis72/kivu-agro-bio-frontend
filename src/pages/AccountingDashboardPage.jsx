import { useEffect, useState } from "react";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import StatCard from "../components/ui/StatCard";
import TableCard from "../components/ui/TableCard";

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));
}

function getStatusBadge(status) {
  const map = {
    draft: "bg-amber-100 text-amber-700",
    posted: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700"
  };

  return map[status] || "bg-slate-200 text-slate-700";
}

export default function AccountingDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchDashboard() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/dashboard/accounting-overview");
      setData(response.data.data || null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger le dashboard comptable."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-soft border border-slate-100">
        Chargement du dashboard comptable...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error}
      </div>
    );
  }

  const stats = data?.accounting_global_stats || {};
  const monthly = data?.accounting_monthly_overview || [];
  const classBalances = data?.account_class_balances || [];
  const recentEntries = data?.recent_journal_entries || [];

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Dashboard comptable"
        subtitle="Vue synthétique des écritures, soldes et mouvements comptables"
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Comptes actifs"
          value={Number(stats.total_accounts || 0)}
        />
        <StatCard
          title="Écritures validées"
          value={Number(stats.posted_entries || 0)}
        />
        <StatCard
          title="Écritures brouillon"
          value={Number(stats.draft_entries || 0)}
        />
        <StatCard
          title="Total écritures"
          value={Number(stats.total_entries || 0)}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <StatCard
          title="Total débit validé"
          value={formatMoney(stats.total_posted_debit)}
        />
        <StatCard
          title="Total crédit validé"
          value={formatMoney(stats.total_posted_credit)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TableCard
          title="Mouvements mensuels comptables"
          rows={monthly}
          emptyText="Aucun mouvement mensuel"
          columns={[
            { key: "period", label: "Période" },
            { key: "total_entries", label: "Écritures" },
            {
              key: "total_debit",
              label: "Débit",
              render: (row) => formatMoney(row.total_debit)
            },
            {
              key: "total_credit",
              label: "Crédit",
              render: (row) => formatMoney(row.total_credit)
            }
          ]}
        />

        <TableCard
          title="Soldes par classe de compte"
          rows={classBalances}
          emptyText="Aucun solde par classe"
          columns={[
            { key: "account_class", label: "Classe" },
            {
              key: "total_debit",
              label: "Débit",
              render: (row) => formatMoney(row.total_debit)
            },
            {
              key: "total_credit",
              label: "Crédit",
              render: (row) => formatMoney(row.total_credit)
            },
            {
              key: "balance",
              label: "Solde",
              render: (row) => formatMoney(row.balance)
            }
          ]}
        />
      </div>

      <TableCard
        title="Écritures comptables récentes"
        rows={recentEntries}
        emptyText="Aucune écriture récente"
        columns={[
          { key: "entry_number", label: "N° écriture" },
          { key: "entry_date", label: "Date" },
          { key: "journal_code", label: "Journal" },
          { key: "description", label: "Libellé" },
          {
            key: "status",
            label: "Statut",
            render: (row) => (
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                  row.status
                )}`}
              >
                {row.status}
              </span>
            )
          },
          {
            key: "total_debit",
            label: "Débit",
            render: (row) => formatMoney(row.total_debit)
          },
          {
            key: "total_credit",
            label: "Crédit",
            render: (row) => formatMoney(row.total_credit)
          },
          { key: "lines_count", label: "Lignes" }
        ]}
      />
    </div>
  );
}