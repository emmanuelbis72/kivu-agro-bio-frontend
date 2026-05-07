import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import StatCard from "../components/ui/StatCard";
import TableCard from "../components/ui/TableCard";
import { saveBlobResponse } from "../utils/fileDownload";

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));
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

function getStatusBadge(status) {
  if (status === "ready") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "blocked") {
    return "bg-red-100 text-red-700";
  }

  return "bg-amber-100 text-amber-700";
}

function getItemStatusBadge(status) {
  if (status === "done") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "critical") {
    return "bg-red-100 text-red-700";
  }

  return "bg-amber-100 text-amber-700";
}

function getHealthBadge(status) {
  if (status === "healthy") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "attention") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-red-100 text-red-700";
}

export default function MonthlyClosePackPage() {
  const now = new Date();
  const [filters, setFilters] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    detail_limit: 8
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchPack(nextFilters = filters) {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/reports/monthly-close", {
        params: nextFilters
      });

      setData(response.data.data || null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger le pack de cloture."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPack(filters);
  }, []);

  async function handleExport(format) {
    try {
      const response = await api.get(`/reports/monthly-close/export/${format}`, {
        params: filters,
        responseType: "blob"
      });

      saveBlobResponse(
        response,
        `pack-cloture-${filters.year}-${String(filters.month).padStart(2, "0")}.${format}`
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          `Impossible d'exporter le pack en ${format.toUpperCase()}.`
      );
    }
  }

  const executiveCards = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      {
        title: "Ventes du mois",
        value: formatMoney(data.executive_summary?.period_sales_amount),
        subtitle: `${Number(
          data.executive_summary?.period_invoices_count || 0
        )} facture(s)`
      },
      {
        title: "Encaissements du mois",
        value: formatMoney(data.executive_summary?.period_collections_amount),
        subtitle: `${Number(
          data.executive_summary?.period_customer_payments_count || 0
        )} paiement(s)`
      },
      {
        title: "Profit brut du mois",
        value: formatMoney(data.executive_summary?.period_gross_profit_amount),
        subtitle: "Selon les ventes facturees du mois"
      },
      {
        title: "Resultat net comptable",
        value: formatMoney(data.executive_summary?.accounting_net_result),
        subtitle: "Compte de resultat poste"
      },
      {
        title: "Creances a la cloture",
        value: formatMoney(data.executive_summary?.receivables_at_close),
        subtitle: `${Number(
          data.executive_summary?.open_receivables_count || 0
        )} facture(s) ouverte(s)`
      },
      {
        title: "Dettes a la cloture",
        value: formatMoney(data.executive_summary?.payables_at_close),
        subtitle: `${Number(
          data.executive_summary?.open_payables_count || 0
        )} facture(s) ouverte(s)`
      },
      {
        title: "Base cash a la cloture",
        value: formatMoney(data.executive_summary?.cash_base_at_close),
        subtitle: "Encaissements - reglements - depenses"
      },
      {
        title: "Projection cash J+30",
        value: formatMoney(data.executive_summary?.projected_cash_30d),
        subtitle: "Selon les echeances ouvertes"
      }
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-soft">
        Chargement du pack de cloture...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Pack de cloture mensuelle"
        subtitle="Synthese direction et compta pour piloter les ventes, la tresorerie, la qualite comptable et les vigilances de fin de mois."
      />

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">
              Parametres de cloture
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Selectionner la periode, rafraichir les donnees, puis sortir le pack en PDF ou en Excel.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                data?.close_checklist?.close_status
              )}`}
            >
              Cloture {data?.close_checklist?.close_status || "n/a"}
            </span>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getHealthBadge(
                data?.accounting_health?.status
              )}`}
            >
              Sante comptable {data?.accounting_health?.status || "n/a"}
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="block text-sm font-medium text-slate-700">
            Annee
            <input
              type="number"
              min="2000"
              max="2100"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              value={filters.year}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  year: event.target.value
                }))
              }
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Mois
            <input
              type="number"
              min="1"
              max="12"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              value={filters.month}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  month: event.target.value
                }))
              }
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Detail des listes
            <input
              type="number"
              min="1"
              max="25"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              value={filters.detail_limit}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  detail_limit: event.target.value
                }))
              }
            />
          </label>

          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={() => fetchPack(filters)}
              className="w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white"
            >
              Rafraichir
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleExport("pdf")}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
          >
            Export PDF
          </button>
          <button
            type="button"
            onClick={() => handleExport("xlsx")}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
          >
            Export Excel
          </button>
        </div>

        {data?.period?.scope_note ? (
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {data.period.scope_note}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {executiveCards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TableCard
          title="Checklist de cloture"
          columns={[
            { key: "label", label: "Controle" },
            {
              key: "status",
              label: "Statut",
              render: (row) => (
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getItemStatusBadge(
                    row.status
                  )}`}
                >
                  {row.status === "done"
                    ? "OK"
                    : row.status === "critical"
                      ? "Critique"
                      : "Attention"}
                </span>
              )
            },
            { key: "detail", label: "Detail" }
          ]}
          rows={data?.close_checklist?.items || []}
          emptyText="Aucun controle disponible"
        />

        <TableCard
          title="Synthese comptable"
          columns={[
            { key: "label", label: "Indicateur" },
            { key: "value", label: "Valeur" }
          ]}
          rows={[
            {
              label: "Ecritures du mois",
              value: Number(data?.accounting_snapshot?.total_entries || 0)
            },
            {
              label: "Ecritures postees",
              value: Number(data?.accounting_snapshot?.posted_entries || 0)
            },
            {
              label: "Ecritures brouillon",
              value: Number(data?.accounting_snapshot?.draft_entries || 0)
            },
            {
              label: "Ecritures annulees",
              value: Number(data?.accounting_snapshot?.cancelled_entries || 0)
            },
            {
              label: "Ecritures desequilibrees",
              value: Number(data?.accounting_snapshot?.imbalanced_entries || 0)
            },
            {
              label: "Produits comptables",
              value: formatMoney(data?.income_statement?.totals?.total_revenue)
            },
            {
              label: "Charges comptables",
              value: formatMoney(data?.income_statement?.totals?.total_expense)
            },
            {
              label: "Actif total",
              value: formatMoney(data?.balance_sheet?.totals?.total_assets)
            },
            {
              label: "Passif + capitaux propres",
              value: formatMoney(
                data?.balance_sheet?.totals?.total_liabilities_and_equity
              )
            },
            {
              label: "Ecart bilan",
              value: formatMoney(data?.balance_sheet?.totals?.gap)
            }
          ]}
          emptyText="Synthese indisponible"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TableCard
          title="Horizons de tresorerie"
          columns={[
            { key: "horizon_days", label: "Horizon", render: (row) => `J+${row.horizon_days}` },
            {
              key: "expected_inflows",
              label: "Encaissements",
              render: (row) => formatMoney(row.expected_inflows)
            },
            {
              key: "due_receivables_count",
              label: "Nb enc.",
              render: (row) => Number(row.due_receivables_count || 0)
            },
            {
              key: "expected_outflows",
              label: "Decaissements",
              render: (row) => formatMoney(row.expected_outflows)
            },
            {
              key: "due_payables_count",
              label: "Nb dec.",
              render: (row) => Number(row.due_payables_count || 0)
            },
            {
              key: "projected_balance",
              label: "Solde projete",
              render: (row) => formatMoney(row.projected_balance)
            }
          ]}
          rows={data?.cash_projection?.horizons || []}
          emptyText="Aucun horizon de projection"
        />

        <TableCard
          title="Comptes de resultat majeurs"
          columns={[
            { key: "account_number", label: "Compte" },
            { key: "account_name", label: "Libelle" },
            {
              key: "net_amount",
              label: "Montant",
              render: (row) => formatMoney(row.net_amount)
            }
          ]}
          rows={[
            ...(data?.income_statement?.top_revenue_accounts || []),
            ...(data?.income_statement?.top_expense_accounts || [])
          ]}
          emptyText="Aucune ligne de resultat comptable"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TableCard
          title="Top clients du mois"
          columns={[
            { key: "business_name", label: "Client" },
            { key: "city", label: "Ville" },
            {
              key: "total_invoices",
              label: "Factures",
              render: (row) => Number(row.total_invoices || 0)
            },
            {
              key: "total_billed",
              label: "Facture",
              render: (row) => formatMoney(row.total_billed)
            },
            {
              key: "total_paid",
              label: "Paye",
              render: (row) => formatMoney(row.total_paid)
            },
            {
              key: "total_balance_due",
              label: "Solde",
              render: (row) => formatMoney(row.total_balance_due)
            }
          ]}
          rows={data?.top_customers || []}
          emptyText="Aucun client facture sur la periode"
        />

        <TableCard
          title="Top produits du mois"
          columns={[
            { key: "product_name", label: "Produit" },
            { key: "sku", label: "SKU" },
            {
              key: "total_quantity_sold",
              label: "Qte",
              render: (row) => Number(row.total_quantity_sold || 0)
            },
            {
              key: "total_sales_value",
              label: "CA",
              render: (row) => formatMoney(row.total_sales_value)
            },
            {
              key: "gross_profit_amount",
              label: "Profit brut",
              render: (row) => formatMoney(row.gross_profit_amount)
            }
          ]}
          rows={data?.top_products || []}
          emptyText="Aucun produit vendu sur la periode"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TableCard
          title="Creances dues ou en retard"
          columns={[
            { key: "invoice_number", label: "Facture" },
            { key: "customer_name", label: "Client" },
            {
              key: "due_date",
              label: "Echeance",
              render: (row) => formatDate(row.due_date)
            },
            {
              key: "days_from_cutoff",
              label: "Jours vs cloture",
              render: (row) => Number(row.days_from_cutoff || 0)
            },
            {
              key: "balance_due",
              label: "Solde",
              render: (row) => formatMoney(row.balance_due)
            }
          ]}
          rows={data?.cash_projection?.receivables_due || []}
          emptyText="Aucune creance due ou en retard dans la fenetre analysee"
        />

        <TableCard
          title="Dettes dues ou en retard"
          columns={[
            { key: "purchase_invoice_number", label: "Facture" },
            { key: "supplier_name", label: "Fournisseur" },
            {
              key: "due_date",
              label: "Echeance",
              render: (row) => formatDate(row.due_date)
            },
            {
              key: "days_from_cutoff",
              label: "Jours vs cloture",
              render: (row) => Number(row.days_from_cutoff || 0)
            },
            {
              key: "balance_due",
              label: "Solde",
              render: (row) => formatMoney(row.balance_due)
            }
          ]}
          rows={data?.cash_projection?.payables_due || []}
          emptyText="Aucune dette due ou en retard dans la fenetre analysee"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TableCard
          title="Alertes stock actuelles"
          columns={[
            { key: "warehouse_name", label: "Depot" },
            { key: "product_name", label: "Produit" },
            { key: "sku", label: "SKU" },
            {
              key: "quantity",
              label: "Stock",
              render: (row) => Number(row.quantity || 0)
            },
            {
              key: "alert_threshold",
              label: "Seuil",
              render: (row) => Number(row.alert_threshold || 0)
            }
          ]}
          rows={data?.stock_alerts || []}
          emptyText="Aucune alerte stock"
        />

        <TableCard
          title="Produits a faible rotation"
          columns={[
            { key: "product_name", label: "Produit" },
            { key: "sku", label: "SKU" },
            { key: "category", label: "Categorie" },
            {
              key: "total_quantity_sold",
              label: "Qte vendue",
              render: (row) => Number(row.total_quantity_sold || 0)
            }
          ]}
          rows={data?.low_rotation_products || []}
          emptyText="Aucun produit a faible rotation detecte"
        />
      </div>
    </div>
  );
}
