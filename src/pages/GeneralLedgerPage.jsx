import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import TableCard from "../components/ui/TableCard";

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));
}

export default function GeneralLedgerPage() {
  const [accounts, setAccounts] = useState([]);
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    account_id: "",
    start_date: "",
    end_date: "",
    status: "posted",
    journal_code: ""
  });

  useEffect(() => {
    async function fetchAccounts() {
      try {
        setAccountsLoading(true);
        const response = await api.get("/accounts");
        setAccounts(response.data.data || []);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            "Impossible de charger les comptes."
        );
      } finally {
        setAccountsLoading(false);
      }
    }

    fetchAccounts();
  }, []);

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
      setLedger(null);

      if (!filters.account_id) {
        setError("Sélectionne un compte.");
        return;
      }

      const params = {
        account_id: Number(filters.account_id),
        status: filters.status
      };

      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.journal_code.trim()) params.journal_code = filters.journal_code.trim();

      const response = await api.get("/accounting-reports/general-ledger", {
        params
      });

      setLedger(response.data.data || null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger le grand livre."
      );
    } finally {
      setLoading(false);
    }
  }

  const pdfUrl = useMemo(() => {
    const base = import.meta.env.VITE_API_BASE_URL;
    const params = new URLSearchParams();

    if (filters.account_id) params.append("account_id", filters.account_id);
    if (filters.start_date) params.append("start_date", filters.start_date);
    if (filters.end_date) params.append("end_date", filters.end_date);
    if (filters.status) params.append("status", filters.status);
    if (filters.journal_code.trim()) {
      params.append("journal_code", filters.journal_code.trim());
    }

    return `${base}/accounting-reports/general-ledger/pdf?${params.toString()}`;
  }, [filters]);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Grand livre"
        subtitle="Détail chronologique des mouvements d’un compte comptable"
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
        <form
          onSubmit={handleSearch}
          className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5"
        >
          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Compte
            </label>
            <select
              name="account_id"
              value={filters.account_id}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              disabled={accountsLoading}
            >
              <option value="">Sélectionner</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_number} - {account.account_name}
                </option>
              ))}
            </select>
          </div>

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

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Journal
            </label>
            <input
              name="journal_code"
              value={filters.journal_code}
              onChange={handleChange}
              placeholder="VE, TR, AC..."
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-end gap-3 xl:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Chargement..." : "Afficher le grand livre"}
            </button>

            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-brand-300 px-5 py-3 text-sm font-semibold text-brand-700"
            >
              PDF
            </a>
          </div>
        </form>
      </div>

      {ledger ? (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
              <div className="text-sm text-slate-500">Compte</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {ledger.account?.account_number}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {ledger.account?.account_name}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
              <div className="text-sm text-slate-500">Solde initial</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatMoney(ledger.opening_balance)}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
              <div className="text-sm text-slate-500">Débit période</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatMoney(ledger.period_debit)}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
              <div className="text-sm text-slate-500">Crédit période</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatMoney(ledger.period_credit)}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
            <div className="text-sm text-slate-500">Solde final</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">
              {formatMoney(ledger.closing_balance)}
            </div>
          </div>

          <TableCard
            title={`Lignes (${ledger.lines?.length || 0})`}
            rows={ledger.lines || []}
            emptyText="Aucune ligne trouvée"
            columns={[
              { key: "entry_date", label: "Date" },
              { key: "entry_number", label: "Écriture" },
              { key: "journal_code", label: "Journal" },
              { key: "entry_description", label: "Libellé" },
              { key: "line_description", label: "Description ligne" },
              {
                key: "debit",
                label: "Débit",
                render: (row) => formatMoney(row.debit)
              },
              {
                key: "credit",
                label: "Crédit",
                render: (row) => formatMoney(row.credit)
              },
              {
                key: "running_balance",
                label: "Solde",
                render: (row) => formatMoney(row.running_balance)
              }
            ]}
          />
        </>
      ) : null}
    </div>
  );
}