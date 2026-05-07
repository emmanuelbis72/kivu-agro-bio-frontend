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

function formatNumber(value) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }

  return `${Number(value).toFixed(2)} %`;
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

function formatDays(value) {
  const days = Number(value || 0);
  return `${days} j`;
}

function HorizontalBarList({
  title,
  rows,
  labelKey,
  valueKey,
  subtitleKey,
  colorClass = "bg-brand-500",
  valueFormatter = formatMoney,
  emptyText = "Aucune donnee"
}) {
  const maxValue = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 0);

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
      <div className="mb-5 text-lg font-semibold text-slate-900">{title}</div>

      {rows.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row, index) => {
            const value = Number(row[valueKey] || 0);
            const width = maxValue > 0 ? Math.max((value / maxValue) * 100, 2) : 0;

            return (
              <div key={`${row[labelKey]}-${index}`} className="space-y-2">
                <div className="flex items-start justify-between gap-4 text-sm">
                  <div>
                    <div className="font-medium text-slate-700">
                      {row[labelKey] || "-"}
                    </div>
                    {subtitleKey ? (
                      <div className="mt-1 text-xs text-slate-500">
                        {row[subtitleKey] || ""}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-slate-500">{valueFormatter(value)}</div>
                </div>

                <div className="h-3 rounded-full bg-slate-100">
                  <div
                    className={`h-3 rounded-full ${colorClass}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const periodOptions = [
  { value: "30", label: "30 jours" },
  { value: "90", label: "90 jours" },
  { value: "180", label: "180 jours" },
  { value: "365", label: "12 mois" }
];

export default function CommercialDashboardPage() {
  const [days, setDays] = useState("365");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function fetchDashboard(periodDays = days, isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await api.get(
        `/dashboard/commercial-overview?days=${periodDays}&top_limit=10`
      );
      setData(response.data?.data || null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger le dashboard commercial."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchDashboard(days);
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    await fetchDashboard(days, true);
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-soft">
        Chargement du dashboard commercial...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error}
      </div>
    );
  }

  const summary = data?.summary || {};
  const monthlyTrend = data?.monthly_trend || [];
  const salesByCity = data?.sales_by_city || [];
  const salesByWarehouse = data?.sales_by_warehouse || [];
  const salesByCustomer = data?.sales_by_customer || [];
  const salesByProduct = data?.sales_by_product || [];
  const decliningProducts = data?.declining_products || [];
  const dormantClients = data?.dormant_clients || [];
  const reactivationCandidates = data?.reactivation_candidates || [];

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Dashboard commercial"
        subtitle="Vue terrain des ventes, de la marge, des zones actives et des clients a relancer."
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-900">
              Filtre de periode
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Analyse commerciale sur la periode choisie. Les tendances mensuelles restent affichees sur les 12 derniers mois.
            </div>
          </div>

          {refreshing ? (
            <div className="text-sm font-medium text-brand-600">
              Actualisation...
            </div>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="w-full md:w-72">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Periode
            </label>
            <select
              value={days}
              onChange={(event) => setDays(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={refreshing}
            className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            Actualiser
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Ventes facturees"
          value={formatMoney(summary.total_sales_amount)}
          subtitle={`${Number(summary.total_invoices || 0)} facture(s)`}
        />
        <StatCard
          title="Profit brut"
          value={formatMoney(summary.gross_profit_amount)}
          subtitle={`Marge ${formatPercent(summary.gross_margin_percent)}`}
        />
        <StatCard
          title="Clients actifs"
          value={Number(summary.active_customers || 0)}
          subtitle={`${Number(summary.active_cities || 0)} ville(s) active(s)`}
        />
        <StatCard
          title="Creances clients"
          value={formatMoney(summary.total_receivables)}
          subtitle={formatMoney(summary.total_collected_amount)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <HorizontalBarList
          title="Ventes par ville"
          rows={salesByCity}
          labelKey="city"
          subtitleKey="total_customers"
          valueKey="total_sales_amount"
          colorClass="bg-emerald-500"
          valueFormatter={formatMoney}
          emptyText="Aucune vente par ville"
        />

        <HorizontalBarList
          title="Top produits par chiffre d'affaires"
          rows={salesByProduct}
          labelKey="product_name"
          subtitleKey="sku"
          valueKey="total_sales_amount"
          colorClass="bg-brand-500"
          valueFormatter={formatMoney}
          emptyText="Aucun produit facture"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TableCard
          title="Tendance mensuelle"
          rows={monthlyTrend}
          emptyText="Aucune tendance disponible"
          columns={[
            { key: "period", label: "Periode" },
            { key: "total_invoices", label: "Factures" },
            {
              key: "total_sales_amount",
              label: "Ventes",
              render: (row) => formatMoney(row.total_sales_amount)
            },
            {
              key: "gross_profit_amount",
              label: "Profit brut",
              render: (row) => formatMoney(row.gross_profit_amount)
            },
            {
              key: "total_receivables",
              label: "Creances",
              render: (row) => formatMoney(row.total_receivables)
            }
          ]}
        />

        <TableCard
          title="Ventes par depot"
          rows={salesByWarehouse}
          emptyText="Aucune vente par depot"
          columns={[
            { key: "warehouse_name", label: "Depot" },
            { key: "warehouse_city", label: "Ville" },
            { key: "total_invoices", label: "Factures" },
            {
              key: "total_sales_amount",
              label: "Ventes",
              render: (row) => formatMoney(row.total_sales_amount)
            },
            {
              key: "gross_profit_amount",
              label: "Profit brut",
              render: (row) => formatMoney(row.gross_profit_amount)
            }
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TableCard
          title="Top points de vente / clients"
          rows={salesByCustomer}
          emptyText="Aucun client facture"
          columns={[
            { key: "business_name", label: "Client" },
            { key: "city", label: "Ville" },
            {
              key: "last_invoice_date",
              label: "Derniere facture",
              render: (row) => formatDate(row.last_invoice_date)
            },
            {
              key: "total_sales_amount",
              label: "Ventes",
              render: (row) => formatMoney(row.total_sales_amount)
            },
            {
              key: "gross_profit_amount",
              label: "Profit brut",
              render: (row) => formatMoney(row.gross_profit_amount)
            },
            {
              key: "total_receivables",
              label: "Creances",
              render: (row) => formatMoney(row.total_receivables)
            }
          ]}
        />

        <TableCard
          title="Top produits rentables"
          rows={salesByProduct}
          emptyText="Aucun produit facture"
          columns={[
            { key: "product_name", label: "Produit" },
            { key: "sku", label: "SKU" },
            {
              key: "total_quantity_sold",
              label: "Qte",
              render: (row) => formatNumber(row.total_quantity_sold)
            },
            {
              key: "gross_profit_amount",
              label: "Profit brut",
              render: (row) => formatMoney(row.gross_profit_amount)
            },
            {
              key: "gross_margin_percent",
              label: "Marge",
              render: (row) => formatPercent(row.gross_margin_percent)
            }
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TableCard
          title="Produits en baisse"
          rows={decliningProducts}
          emptyText="Aucun produit en baisse sur les 60 derniers jours"
          columns={[
            { key: "product_name", label: "Produit" },
            { key: "sku", label: "SKU" },
            {
              key: "previous_quantity",
              label: "Qte prec. 30j",
              render: (row) => formatNumber(row.previous_quantity)
            },
            {
              key: "current_quantity",
              label: "Qte dern. 30j",
              render: (row) => formatNumber(row.current_quantity)
            },
            {
              key: "quantity_change_percent",
              label: "Variation",
              render: (row) => formatPercent(row.quantity_change_percent)
            },
            {
              key: "sales_delta",
              label: "Delta CA",
              render: (row) => formatMoney(row.sales_delta)
            }
          ]}
        />

        <TableCard
          title="Clients dormants"
          rows={dormantClients}
          emptyText="Aucun client dormant"
          columns={[
            { key: "business_name", label: "Client" },
            { key: "city", label: "Ville" },
            {
              key: "last_invoice_date",
              label: "Derniere facture",
              render: (row) => formatDate(row.last_invoice_date)
            },
            {
              key: "days_since_last_invoice",
              label: "Inactivite",
              render: (row) => formatDays(row.days_since_last_invoice)
            },
            {
              key: "total_sales_amount",
              label: "Ventes cumul.",
              render: (row) => formatMoney(row.total_sales_amount)
            }
          ]}
        />
      </div>

      <TableCard
        title="Clients a reactiver en priorite"
        rows={reactivationCandidates}
        emptyText="Aucun client prioritaire a reactiver"
        columns={[
          { key: "business_name", label: "Client" },
          { key: "city", label: "Ville" },
          {
            key: "last_invoice_date",
            label: "Derniere facture",
            render: (row) => formatDate(row.last_invoice_date)
          },
          {
            key: "days_since_last_invoice",
            label: "Inactivite",
            render: (row) => formatDays(row.days_since_last_invoice)
          },
          {
            key: "total_sales_amount",
            label: "Ventes historique",
            render: (row) => formatMoney(row.total_sales_amount)
          },
          {
            key: "total_receivables",
            label: "Creance",
            render: (row) => formatMoney(row.total_receivables)
          }
        ]}
      />

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="mb-3 text-lg font-semibold text-slate-900">
          Lecture terrain
        </div>
        <div className="space-y-2 text-sm leading-7 text-slate-700">
          <p>
            Les ventes par ville et par depot te montrent ou pousser le stock, les promotions et les relances commerciales.
          </p>
          <p>
            Les produits en baisse signalent les references qui ralentissent sur les 30 derniers jours par rapport aux 30 jours precedents.
          </p>
          <p>
            Les clients dormants et a reactiver servent de base de travail terrain pour les appels, visites et offres de relance.
          </p>
          <p>
            En l'absence d'un champ commercial individuel sur la facture, le systeme lit le terrain via les points de vente / clients factures.
          </p>
        </div>
      </div>
    </div>
  );
}
