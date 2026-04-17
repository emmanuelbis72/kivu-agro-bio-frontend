import { useMemo, useState } from "react";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import TableCard from "../components/ui/TableCard";

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));
}

export default function TrialBalancePage() {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    start_date: "",
    end_date: "",
    status: "posted"
  });

  const pdfUrl = useMemo(() => {
    const base = import.meta.env.VITE_API_BASE_URL;
    const params = new URLSearchParams();

    if (filters.start_date) params.append("start_date", filters.start_date);
    if (filters.end_date) params.append("end_date", filters.end_date);
    if (filters.status) params.append("status", filters.status);

    return `${base}/accounting-reports/trial-balance/pdf?${params.toString()}`;
  }, [filters]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleSearch(event) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");
      setBalance(null);

      const params = {
        status: filters.status
      };

      if (filters.start_date) {
        params.start_date = filters.start_date;
      }

      if (filters.end_date) {
        params.end_date = filters.end_date;
      }

      const response = await api.get("/accounting-reports/trial-balance", {
        params
      });

      setBalance(response.data.data || null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger la balance générale."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Balance générale"
        subtitle="Vue globale des débits, crédits et soldes par compte"
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
        <div className="mb-5 text-lg font-semibold text-slate-900">
          Filtres
        </div>

        <form
          onSubmit={handleSearch}
          className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Début
            </label>
            <input
              type="date"
              name="start_date"
              value={filters.start_date}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Fin
            </label>
            <input
              type="date"
              name="end_date"
              value={filters.end_date}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Statut
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              <option value="posted">posted</option>
              <option value="draft">draft</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Chargement..." : "Afficher la balance"}
            </button>

            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-brand-300 px-5 py-3 text-sm font-semibold text-brand-700"
            >
              Télécharger PDF
            </a>
          </div>
        </form>
      </div>

      {balance ? (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
              <div className="text-sm text-slate-500">Total débit</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatMoney(balance.totals?.total_debit)}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
              <div className="text-sm text-slate-500">Total crédit</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatMoney(balance.totals?.total_credit)}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
              <div className="text-sm text-slate-500">Solde débiteur</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatMoney(balance.totals?.total_debit_balance)}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
              <div className="text-sm text-slate-500">Solde créditeur</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatMoney(balance.totals?.total_credit_balance)}
              </div>
            </div>
          </div>

          <TableCard
            title={`Comptes (${balance.rows?.length || 0})`}
            rows={balance.rows || []}
            emptyText="Aucune ligne de balance"
            columns={[
              { key: "account_number", label: "Compte" },
              { key: "account_name", label: "Intitulé" },
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
                key: "debit_balance",
                label: "Solde D",
                render: (row) => formatMoney(row.debit_balance)
              },
              {
                key: "credit_balance",
                label: "Solde C",
                render: (row) => formatMoney(row.credit_balance)
              }
            ]}
          />
        </>
      ) : null}
    </div>
  );
}