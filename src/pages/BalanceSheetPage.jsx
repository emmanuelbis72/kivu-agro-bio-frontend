import { useState } from "react";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import TableCard from "../components/ui/TableCard";

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));
}

export default function BalanceSheetPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    start_date: "",
    end_date: "",
    status: "posted"
  });

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
      setData(null);

      const params = {
        status: filters.status
      };

      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      const response = await api.get("/accounting-reports/balance-sheet", {
        params
      });

      setData(response.data.data || null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger le bilan."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Bilan"
        subtitle="Situation patrimoniale par actifs, passifs et capitaux propres"
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
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

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Chargement..." : "Afficher le bilan"}
            </button>
          </div>
        </form>
      </div>

      {data ? (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
              <div className="text-sm text-slate-500">Total actif</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatMoney(data.totals?.total_assets)}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
              <div className="text-sm text-slate-500">Total passif</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatMoney(data.totals?.total_liabilities)}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
              <div className="text-sm text-slate-500">Capitaux propres</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatMoney(data.totals?.total_equity)}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
              <div className="text-sm text-slate-500">Écart</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatMoney(data.totals?.gap)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <TableCard
              title={`Actifs (${data.assets?.length || 0})`}
              rows={data.assets || []}
              emptyText="Aucun actif"
              columns={[
                { key: "account_number", label: "Compte" },
                { key: "account_name", label: "Intitulé" },
                { key: "account_class", label: "Classe" },
                {
                  key: "balance_amount",
                  label: "Montant",
                  render: (row) => formatMoney(row.balance_amount)
                }
              ]}
            />

            <div className="space-y-6">
              <TableCard
                title={`Passifs (${data.liabilities?.length || 0})`}
                rows={data.liabilities || []}
                emptyText="Aucun passif"
                columns={[
                  { key: "account_number", label: "Compte" },
                  { key: "account_name", label: "Intitulé" },
                  { key: "account_class", label: "Classe" },
                  {
                    key: "balance_amount",
                    label: "Montant",
                    render: (row) => formatMoney(row.balance_amount)
                  }
                ]}
              />

              <TableCard
                title={`Capitaux propres (${data.equity?.length || 0})`}
                rows={data.equity || []}
                emptyText="Aucun compte de capitaux propres"
                columns={[
                  { key: "account_number", label: "Compte" },
                  { key: "account_name", label: "Intitulé" },
                  { key: "account_class", label: "Classe" },
                  {
                    key: "balance_amount",
                    label: "Montant",
                    render: (row) => formatMoney(row.balance_amount)
                  }
                ]}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}