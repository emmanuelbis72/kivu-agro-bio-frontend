import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import StatCard from "../components/ui/StatCard";
import TableCard from "../components/ui/TableCard";
import ProductCityHeatmap from "../components/ui/ProductCityHeatmap";
import CommercialHeatmapFilterPanel from "../components/ui/CommercialHeatmapFilterPanel";
import {
  buildAlphabeticalOptions,
  buildCommercialHeatmapQueryParams,
  getDefaultCommercialHeatmapFilters
} from "../utils/commercialHeatmap";

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

function resolveOptionLabel(options, value, emptyLabel) {
  if (!value) {
    return emptyLabel;
  }

  return options.find((option) => String(option.value) === String(value))?.label || String(value);
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
  const [heatmapFilters, setHeatmapFilters] = useState(() =>
    getDefaultCommercialHeatmapFilters({
      periodDays: "365",
      topProducts: "10",
      topCities: "10"
    })
  );
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [heatmapRefreshing, setHeatmapRefreshing] = useState(false);
  const [error, setError] = useState("");

  function buildCommercialOverviewPath(
    periodDays = days,
    nextHeatmapFilters = heatmapFilters
  ) {
    const params = new URLSearchParams();
    params.set("days", String(periodDays));
    params.set("top_limit", "10");

    buildCommercialHeatmapQueryParams(nextHeatmapFilters).forEach(
      (value, key) => {
        params.set(key, value);
      }
    );

    return `/dashboard/commercial-overview?${params.toString()}`;
  }

  async function fetchDashboard(
    periodDays = days,
    nextHeatmapFilters = heatmapFilters,
    mode = "load"
  ) {
    try {
      if (mode === "page") {
        setRefreshing(true);
      } else if (mode === "heatmap") {
        setHeatmapRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await api.get(
        buildCommercialOverviewPath(periodDays, nextHeatmapFilters)
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
      setHeatmapRefreshing(false);
    }
  }

  useEffect(() => {
    fetchDashboard(days, heatmapFilters);
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    await fetchDashboard(days, heatmapFilters, "page");
  }

  function handleHeatmapFilterChange(event) {
    const { name, value } = event.target;
    setHeatmapFilters((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleHeatmapSubmit(event) {
    event.preventDefault();
    await fetchDashboard(days, heatmapFilters, "heatmap");
  }

  async function handleHeatmapReset() {
    const defaults = getDefaultCommercialHeatmapFilters({
      periodDays: days,
      topProducts: "10",
      topCities: "10"
    });

    setHeatmapFilters(defaults);
    await fetchDashboard(days, defaults, "heatmap");
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
  const performanceHighlights = data?.performance_highlights || {};
  const monthlyTrend = data?.monthly_trend || [];
  const salesByCity = data?.sales_by_city || [];
  const salesByWarehouse = data?.sales_by_warehouse || [];
  const salesByChain = data?.sales_by_chain || [];
  const salesByChannel = data?.sales_by_channel || [];
  const salesByCustomer = data?.sales_by_customer || [];
  const salesByProduct = data?.sales_by_product || [];
  const productCityHeatmap = data?.product_city_heatmap || {
    products: [],
    cities: [],
    cells: [],
    best_pairs: []
  };
  const decliningProducts = data?.declining_products || [];
  const dormantClients = data?.dormant_clients || [];
  const reactivationCandidates = data?.reactivation_candidates || [];
  const warehouseOptions = useMemo(
    () => buildAlphabeticalOptions(salesByWarehouse, "warehouse_id", "warehouse_name"),
    [salesByWarehouse]
  );
  const chainOptions = useMemo(
    () => buildAlphabeticalOptions(salesByChain, "chain_name"),
    [salesByChain]
  );
  const channelOptions = useMemo(
    () => buildAlphabeticalOptions(salesByChannel, "sales_channel"),
    [salesByChannel]
  );
  const heatmapFilterSummary = useMemo(
    () => ({
      periodLabel:
        periodOptions.find((option) => option.value === String(heatmapFilters.days))
          ?.label || `${heatmapFilters.days} jours`,
      warehouseLabel: resolveOptionLabel(
        warehouseOptions,
        heatmapFilters.warehouse_id,
        "Tous les depots"
      ),
      chainLabel: resolveOptionLabel(
        chainOptions,
        heatmapFilters.chain_name,
        "Toutes les chaines"
      ),
      channelLabel: resolveOptionLabel(
        channelOptions,
        heatmapFilters.sales_channel,
        "Tous les canaux"
      )
    }),
    [channelOptions, chainOptions, heatmapFilters, warehouseOptions]
  );
  const terrainHighlights = [
    {
      title: "Ville leader",
      value: performanceHighlights.top_city?.city || "-",
      subtitle: performanceHighlights.top_city
        ? formatMoney(performanceHighlights.top_city.total_sales_amount)
        : "Aucune ville dominante"
    },
    {
      title: "Chaine leader",
      value: performanceHighlights.top_chain?.chain_name || "-",
      subtitle: performanceHighlights.top_chain
        ? formatMoney(performanceHighlights.top_chain.total_sales_amount)
        : "Aucune chaine dominante"
    },
    {
      title: "Canal leader",
      value: performanceHighlights.top_channel?.sales_channel || "-",
      subtitle: performanceHighlights.top_channel
        ? formatMoney(performanceHighlights.top_channel.total_sales_amount)
        : "Aucun canal dominant"
    },
    {
      title: "Client leader",
      value: performanceHighlights.top_customer?.business_name || "-",
      subtitle: performanceHighlights.top_customer
        ? formatMoney(performanceHighlights.top_customer.total_sales_amount)
        : "Aucun client moteur"
    },
    {
      title: "Produit moteur",
      value:
        performanceHighlights.top_product_by_profit?.product_name ||
        performanceHighlights.top_product_by_sales?.product_name ||
        "-",
      subtitle:
        performanceHighlights.top_product_by_profit ||
        performanceHighlights.top_product_by_sales
          ? formatMoney(
              (
                performanceHighlights.top_product_by_profit ||
                performanceHighlights.top_product_by_sales
              ).gross_profit_amount
            )
          : "Aucun produit moteur"
    }
  ];

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

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
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
          title="Encaissements clients"
          value={formatMoney(summary.total_collected_amount)}
          subtitle={`${Number(summary.active_customers || 0)} client(s) actif(s)`}
        />
        <StatCard
          title="Creances clients"
          value={formatMoney(summary.total_receivables)}
          subtitle={`${Number(summary.active_cities || 0)} ville(s) active(s)`}
        />
        <StatCard
          title="Chaines actives"
          value={Number(summary.active_chains || 0)}
          subtitle={`${Number(summary.active_warehouses || 0)} depot(s) actifs`}
        />
        <StatCard
          title="Canaux actifs"
          value={Number(summary.active_channels || 0)}
          subtitle="Vue terrain multi-canal"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
        {terrainHighlights.map((item) => (
          <div
            key={item.title}
            className="rounded-3xl border border-slate-100 bg-white p-5 shadow-soft"
          >
            <div className="text-sm font-semibold text-slate-600">{item.title}</div>
            <div className="mt-3 text-2xl font-bold text-slate-900">{item.value}</div>
            <div className="mt-2 text-sm text-slate-500">{item.subtitle}</div>
          </div>
        ))}
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
          title="Ventes par chaine"
          rows={salesByChain}
          labelKey="chain_name"
          subtitleKey="total_customers"
          valueKey="total_sales_amount"
          colorClass="bg-brand-500"
          valueFormatter={formatMoney}
          emptyText="Aucune chaine analysee"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <HorizontalBarList
          title="Ventes par canal"
          rows={salesByChannel}
          labelKey="sales_channel"
          subtitleKey="total_customers"
          valueKey="total_sales_amount"
          colorClass="bg-amber-500"
          valueFormatter={formatMoney}
          emptyText="Aucun canal analyse"
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

      <div className="space-y-4">
        <CommercialHeatmapFilterPanel
          values={heatmapFilters}
          onChange={handleHeatmapFilterChange}
          onSubmit={handleHeatmapSubmit}
          onReset={handleHeatmapReset}
          warehouseOptions={warehouseOptions}
          chainOptions={chainOptions}
          channelOptions={channelOptions}
          loading={heatmapRefreshing}
        />

        <ProductCityHeatmap
          title="Heatmap produit x ville"
          subtitle="Lecture visuelle des villes les plus fortes pour chaque produit, avec bascule entre CA, quantite, profit brut et marge."
          data={productCityHeatmap}
          filterSummary={heatmapFilterSummary}
          formatMoney={formatMoney}
          formatNumber={formatNumber}
          formatPercent={formatPercent}
          emptyText="Aucune matrice produit x ville disponible"
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
            { key: "chain_name", label: "Chaine" },
            { key: "sales_channel", label: "Canal" },
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
                  key: "collection_rate_percent",
                  label: "Tx enc.",
                  render: (row) => formatPercent(row.collection_rate_percent)
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
            { key: "chain_name", label: "Chaine" },
            { key: "sales_channel", label: "Canal" },
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
          { key: "chain_name", label: "Chaine" },
          { key: "sales_channel", label: "Canal" },
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
