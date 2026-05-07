import { useEffect, useMemo, useState } from "react";
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

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)} %`;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("fr-FR").format(date);
}

function formatDaysOffset(value) {
  const days = Number(value || 0);

  if (days < 0) {
    return `En retard de ${Math.abs(days)} j`;
  }

  if (days === 0) {
    return "Aujourd'hui";
  }

  return `Dans ${days} j`;
}

function getStatusBadge(status) {
  const map = {
    draft: "bg-amber-100 text-amber-700",
    posted: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700"
  };

  return map[status] || "bg-slate-200 text-slate-700";
}

function getInvoiceStatusBadge(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "paid") {
    return "bg-green-100 text-green-700";
  }

  if (normalized === "partial") {
    return "bg-blue-100 text-blue-700";
  }

  if (normalized === "issued") {
    return "bg-amber-100 text-amber-700";
  }

  if (normalized === "cancelled") {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-200 text-slate-700";
}

function getProjectedBalanceClass(value) {
  const numericValue = Number(value || 0);

  if (numericValue < 0) {
    return "text-red-700";
  }

  if (numericValue === 0) {
    return "text-slate-700";
  }

  return "text-green-700";
}

function getHealthBadgeClass(status) {
  if (status === "healthy") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "attention") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-red-100 text-red-700";
}

function ForecastCard({ horizon }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
      <div className="text-sm font-medium text-slate-500">
        Solde projete J+{horizon.horizon_days}
      </div>
      <div
        className={`mt-3 text-3xl font-bold ${getProjectedBalanceClass(
          horizon.projected_balance
        )}`}
      >
        {formatMoney(horizon.projected_balance)}
      </div>
      <div className="mt-3 space-y-1 text-sm text-slate-500">
        <div>
          Encaissements prevus: {formatMoney(horizon.expected_inflows)}
        </div>
        <div>
          Decaissements prevus: {formatMoney(horizon.expected_outflows)}
        </div>
        <div>
          {Number(horizon.due_receivables_count || 0)} encaissement(s) /{" "}
          {Number(horizon.due_payables_count || 0)} decaissement(s)
        </div>
      </div>
    </div>
  );
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
          err?.message ||
          "Impossible de charger le dashboard comptable."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboard();
  }, []);

  const projected30Days = useMemo(() => {
    return (
      data?.cash_forecast?.horizons?.find(
        (item) => Number(item.horizon_days) === 30
      ) || null
    );
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-soft">
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
  const businessStats = data?.business_global_stats || {};
  const cashForecast = data?.cash_forecast || {};
  const cashSummary = cashForecast.summary || {};
  const horizons = cashForecast.horizons || [];
  const monthly = data?.accounting_monthly_overview || [];
  const classBalances = data?.account_class_balances || [];
  const recentEntries = data?.recent_journal_entries || [];
  const receivablesDueSoon = cashForecast.receivables_due_soon || [];
  const payablesDueSoon = cashForecast.payables_due_soon || [];
  const accountingHealth = data?.accounting_health || {};

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Dashboard comptable"
        subtitle="Vue synthetique des ecritures, de la marge brute et de la tresorerie previsionnelle de KIVU AGRO BIO"
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Comptes actifs"
          value={Number(stats.total_accounts || 0)}
        />
        <StatCard
          title="Ecritures validees"
          value={Number(stats.posted_entries || 0)}
        />
        <StatCard
          title="Ecritures brouillon"
          value={Number(stats.draft_entries || 0)}
        />
        <StatCard
          title="Total ecritures"
          value={Number(stats.total_entries || 0)}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total debit valide"
          value={formatMoney(stats.total_posted_debit)}
        />
        <StatCard
          title="Total credit valide"
          value={formatMoney(stats.total_posted_credit)}
        />
        <StatCard
          title="Cout des ventes"
          value={formatMoney(businessStats.total_cogs_amount)}
        />
        <StatCard
          title="Profit brut"
          value={formatMoney(businessStats.gross_profit_amount)}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Base cash observee"
          value={formatMoney(cashSummary.current_cash_base)}
          subtitle="Paiements clients - paiements fournisseurs - depenses"
        />
        <StatCard
          title="Creances ouvertes"
          value={formatMoney(cashSummary.open_receivables)}
          subtitle={`${Number(
            cashSummary.open_receivable_invoices || 0
          )} facture(s) client ouverte(s)`}
        />
        <StatCard
          title="Dettes fournisseurs"
          value={formatMoney(cashSummary.open_payables)}
          subtitle={`${Number(
            cashSummary.open_payable_invoices || 0
          )} facture(s) fournisseur ouverte(s)`}
        />
        <StatCard
          title="Solde projete J+30"
          value={formatMoney(projected30Days?.projected_balance)}
          subtitle={
            projected30Days
              ? `${formatMoney(projected30Days.expected_inflows)} a encaisser / ${formatMoney(
                  projected30Days.expected_outflows
                )} a decaisser`
              : "Aucune projection"
          }
        />
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="text-lg font-semibold text-slate-900">
              Sante comptable
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Controle des ecritures, des liaisons comptables et du parametrage automatique.
            </div>
          </div>

          <span
            className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${getHealthBadgeClass(
              accountingHealth.status
            )}`}
          >
            {accountingHealth.status === "healthy"
              ? "Comptabilite saine"
              : accountingHealth.status === "attention"
              ? "Comptabilite a surveiller"
              : "Comptabilite critique"}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Ecritures brouillon"
            value={Number(accountingHealth.totals?.draft_entries || 0)}
          />
          <StatCard
            title="Ecritures desequilibrees"
            value={Number(accountingHealth.totals?.imbalanced_entries || 0)}
          />
          <StatCard
            title="Liens orphelins"
            value={Number(accountingHealth.totals?.orphan_links || 0)}
          />
          <StatCard
            title="Mappings paiement"
            value={`${Number(
              accountingHealth.coverage?.payment_method_mappings_count || 0
            )}/4`}
            subtitle={
              accountingHealth.coverage?.missing_payment_methods?.length
                ? `manquants: ${accountingHealth.coverage.missing_payment_methods.join(", ")}`
                : "couverture complete"
            }
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-700">
            <div className="font-semibold text-slate-900">Anomalies detectees</div>
            {accountingHealth.issues?.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {accountingHealth.issues.map((issue) => (
                  <li key={issue} className="leading-6">
                    {issue}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 leading-6 text-slate-600">
                Aucune anomalie structurelle detectee sur les ecritures, les paiements et les liaisons comptables.
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-700">
            <div className="font-semibold text-slate-900">Parametrage automatique</div>
            <div className="mt-3 space-y-2 leading-6">
              <div>
                Categories de depense configurees:{" "}
                <span className="font-semibold text-slate-900">
                  {Number(accountingHealth.coverage?.configured_expense_categories || 0)}
                </span>
              </div>
              <div>
                Categories de depense sans mapping detectees:{" "}
                <span className="font-semibold text-slate-900">
                  {Number(
                    accountingHealth.coverage?.unmapped_expense_categories?.length || 0
                  )}
                </span>
              </div>
              {accountingHealth.coverage?.unmapped_expense_categories?.length ? (
                <div className="text-amber-700">
                  {accountingHealth.coverage.unmapped_expense_categories.join(", ")}
                </div>
              ) : (
                <div className="text-slate-600">
                  Aucun manque de mapping detecte sur les categories de depense deja utilisees.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="mb-2 text-lg font-semibold text-slate-900">
          Tresorerie previsionnelle
        </div>
        <div className="mb-5 text-sm text-slate-500">
          Projection des encaissements et decaissements a partir des echeances de factures ouvertes, avec une base cash observee calculee sur les flux reels saisis.
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {horizons.map((horizon) => (
            <ForecastCard
              key={horizon.horizon_days}
              horizon={horizon}
            />
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">
              Creances deja en retard
            </div>
            <div className="mt-2 text-lg font-bold text-red-700">
              {formatMoney(cashSummary.overdue_receivables)}
            </div>
            <div className="mt-1">
              {Number(cashSummary.overdue_receivable_invoices || 0)} facture(s)
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">
              Dettes deja echues
            </div>
            <div className="mt-2 text-lg font-bold text-red-700">
              {formatMoney(cashSummary.overdue_payables)}
            </div>
            <div className="mt-1">
              {Number(cashSummary.overdue_payable_invoices || 0)} facture(s)
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">
              Creances sans echeance
            </div>
            <div className="mt-2 text-lg font-bold text-slate-900">
              {formatMoney(cashSummary.undated_receivables)}
            </div>
            <div className="mt-1">
              {Number(cashSummary.undated_receivable_invoices || 0)} facture(s)
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">
              Dettes sans echeance
            </div>
            <div className="mt-2 text-lg font-bold text-slate-900">
              {formatMoney(cashSummary.undated_payables)}
            </div>
            <div className="mt-1">
              {Number(cashSummary.undated_payable_invoices || 0)} facture(s)
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TableCard
          title="Encaissements a recouvrer"
          rows={receivablesDueSoon}
          emptyText="Aucune creance avec echeance enregistree"
          columns={[
            { key: "invoice_number", label: "Facture" },
            { key: "customer_name", label: "Client" },
            {
              key: "due_date",
              label: "Echeance",
              render: (row) => formatDate(row.due_date)
            },
            {
              key: "days_from_today",
              label: "Delai",
              render: (row) => formatDaysOffset(row.days_from_today)
            },
            {
              key: "balance_due",
              label: "Solde",
              render: (row) => formatMoney(row.balance_due)
            },
            {
              key: "status",
              label: "Statut",
              render: (row) => (
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getInvoiceStatusBadge(
                    row.status
                  )}`}
                >
                  {row.status}
                </span>
              )
            }
          ]}
        />

        <TableCard
          title="Decaissements a planifier"
          rows={payablesDueSoon}
          emptyText="Aucune dette fournisseur avec echeance enregistree"
          columns={[
            { key: "purchase_invoice_number", label: "Facture" },
            { key: "supplier_name", label: "Fournisseur" },
            {
              key: "due_date",
              label: "Echeance",
              render: (row) => formatDate(row.due_date)
            },
            {
              key: "days_from_today",
              label: "Delai",
              render: (row) => formatDaysOffset(row.days_from_today)
            },
            {
              key: "balance_due",
              label: "Solde",
              render: (row) => formatMoney(row.balance_due)
            },
            {
              key: "status",
              label: "Statut",
              render: (row) => (
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getInvoiceStatusBadge(
                    row.status
                  )}`}
                >
                  {row.status}
                </span>
              )
            }
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <StatCard
          title="Ventes nettes HT"
          value={formatMoney(businessStats.total_net_sales_amount)}
        />
        <StatCard
          title="Marge brute"
          value={formatPercent(businessStats.gross_margin_percent)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TableCard
          title="Mouvements mensuels comptables"
          rows={monthly}
          emptyText="Aucun mouvement mensuel"
          columns={[
            { key: "period", label: "Periode" },
            { key: "total_entries", label: "Ecritures" },
            {
              key: "total_debit",
              label: "Debit",
              render: (row) => formatMoney(row.total_debit)
            },
            {
              key: "total_credit",
              label: "Credit",
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
              label: "Debit",
              render: (row) => formatMoney(row.total_debit)
            },
            {
              key: "total_credit",
              label: "Credit",
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
        title="Ecritures comptables recentes"
        rows={recentEntries}
        emptyText="Aucune ecriture recente"
        columns={[
          { key: "entry_number", label: "N° ecriture" },
          { key: "entry_date", label: "Date" },
          { key: "journal_code", label: "Journal" },
          { key: "description", label: "Libelle" },
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
            label: "Debit",
            render: (row) => formatMoney(row.total_debit)
          },
          {
            key: "total_credit",
            label: "Credit",
            render: (row) => formatMoney(row.total_credit)
          },
          { key: "lines_count", label: "Lignes" }
        ]}
      />

      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Hypothese de calcul: la base cash observee est calculee a partir des flux reels saisis dans le systeme
        (`paiements clients - paiements fournisseurs - depenses`). Les factures sans echeance ne sont pas injectees
        dans les projections `J+7 / J+30 / J+60` mais restent visibles dans les indicateurs de synthese.
      </div>
    </div>
  );
}
