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

function formatDateInput(date) {
  return date.toISOString().split("T")[0];
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

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function getDefaultFilters() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 29);

  return {
    start_date: formatDateInput(startDate),
    end_date: formatDateInput(endDate),
    warehouse_id: "",
    product_id: "",
    stock_form: "",
    timeline: "day"
  };
}

function movementTypeLabel(value) {
  const labels = {
    IN: "Entrees",
    OUT: "Sorties",
    ADJUSTMENT: "Ajustements",
    TRANSFER_IN: "Transferts entrants",
    TRANSFER_OUT: "Transferts sortants",
    PRODUCTION_OUTPUT: "Production entree",
    PRODUCTION_CONSUME: "Production consommation",
    TRANSFORM_IN: "Transformation entree",
    TRANSFORM_OUT: "Transformation sortie",
    MIXTURE_IN: "Mixture entree",
    MIXTURE_OUT: "Mixture sortie"
  };

  return labels[value] || value || "-";
}

function stockFormLabel(value) {
  if (value === "package") {
    return "Produit fini conditionne";
  }

  if (value === "bulk") {
    return "Produit fini";
  }

  return value || "-";
}

function packageLabel(row) {
  if (row.product_role === "finished_product") {
    return "Produit fini";
  }

  if (row.stock_form !== "package") {
    return "Stock";
  }

  if (row.package_size && row.package_unit) {
    return `Paquet - ${row.package_size} ${row.package_unit}`;
  }

  return "Paquet";
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

function getInvoiceStatusClass(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "paid" || normalized === "posted") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (normalized === "partial" || normalized === "draft") {
    return "bg-amber-100 text-amber-700";
  }

  if (normalized === "issued") {
    return "bg-blue-100 text-blue-700";
  }

  if (normalized === "cancelled" || normalized === "error") {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
}

function getProjectedBalanceClass(value) {
  const numericValue = Number(value || 0);

  if (numericValue < 0) {
    return "text-red-700";
  }

  if (numericValue === 0) {
    return "text-slate-700";
  }

  return "text-emerald-700";
}

function FilterField({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function DashboardTabButton({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
        active
          ? "bg-slate-900 text-white"
          : "border border-slate-300 text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function HeroMetricCard({ title, value, subtitle, tone = "slate" }) {
  const toneClasses = {
    emerald: "from-emerald-500/12 via-emerald-500/8 to-white",
    brand: "from-brand-500/12 via-brand-500/8 to-white",
    amber: "from-amber-500/12 via-amber-500/8 to-white",
    slate: "from-slate-400/10 via-slate-200/12 to-white",
    red: "from-red-500/12 via-red-500/8 to-white"
  };

  return (
    <div
      className={`rounded-3xl border border-slate-100 bg-gradient-to-br p-6 shadow-soft ${
        toneClasses[tone] || toneClasses.slate
      }`}
    >
      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </div>
      <div className="mt-3 text-3xl font-bold text-slate-900">{value}</div>
      {subtitle ? (
        <div className="mt-3 text-sm leading-6 text-slate-600">{subtitle}</div>
      ) : null}
    </div>
  );
}

function SignalCard({ title, value, subtitle, tone = "slate" }) {
  const toneClasses = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200"
  };

  return (
    <div
      className={`rounded-3xl border p-5 ${
        toneClasses[tone] || toneClasses.slate
      }`}
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      {subtitle ? (
        <div className="mt-2 text-sm leading-6 opacity-90">{subtitle}</div>
      ) : null}
    </div>
  );
}

function HorizontalBarChart({
  title,
  rows,
  labelKey,
  valueKey,
  helperText = null,
  colorClass = "bg-brand-500",
  valueFormatter = formatNumber,
  emptyText = "Aucune donnee"
}) {
  const maxValue = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 0);

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
      <div className="mb-2 text-lg font-semibold text-slate-900">{title}</div>
      {helperText ? (
        <div className="mb-5 text-sm text-slate-500">{helperText}</div>
      ) : null}

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
                <div className="flex items-center justify-between gap-4 text-sm">
                  <div className="font-medium text-slate-700">
                    {row[labelKey] || "-"}
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

function SalesPulseChart({ rows }) {
  const recentRows = rows.slice(-6);
  const maxValue = Math.max(
    ...recentRows.map((row) => Number(row.total_sales || 0)),
    0
  );

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
      <div className="mb-2 text-lg font-semibold text-slate-900">
        Pulse mensuel des ventes
      </div>
      <div className="mb-5 text-sm text-slate-500">
        Lecture rapide des 6 derniers mois factures.
      </div>

      {recentRows.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Aucune tendance mensuelle disponible
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex min-w-[560px] items-end gap-4">
            {recentRows.map((row) => {
              const value = Number(row.total_sales || 0);
              const height = maxValue > 0 ? Math.max((value / maxValue) * 160, 8) : 8;

              return (
                <div
                  key={row.period}
                  className="flex min-w-[84px] flex-col items-center gap-3"
                >
                  <div className="flex h-44 items-end">
                    <div
                      className="w-12 rounded-t-2xl bg-brand-500"
                      style={{ height: `${height}px` }}
                      title={formatMoney(value)}
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold text-slate-700">
                      {row.period}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatMoney(value)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineChart({
  title,
  rows,
  valueFormatter = formatNumber,
  emptyText = "Aucune variation sur la periode"
}) {
  const maxValue = Math.max(
    ...rows.map((row) =>
      Math.max(
        Number(row.quantity_in || 0),
        Number(row.quantity_out || 0),
        Number(row.adjusted_quantity || 0)
      )
    ),
    0
  );

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
      <div className="mb-2 text-lg font-semibold text-slate-900">{title}</div>
      <div className="mb-5 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          Entrees
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-rose-500" />
          Sorties
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          Ajustements
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          {emptyText}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex min-w-[720px] items-end gap-4">
            {rows.map((row) => {
              const quantityIn = Number(row.quantity_in || 0);
              const quantityOut = Number(row.quantity_out || 0);
              const adjustedQuantity = Number(row.adjusted_quantity || 0);

              const inHeight = maxValue > 0 ? Math.max((quantityIn / maxValue) * 140, 4) : 0;
              const outHeight = maxValue > 0 ? Math.max((quantityOut / maxValue) * 140, 4) : 0;
              const adjustmentHeight =
                maxValue > 0 ? Math.max((adjustedQuantity / maxValue) * 140, 4) : 0;

              return (
                <div key={row.period} className="flex min-w-[88px] flex-col items-center gap-3">
                  <div className="flex h-40 items-end gap-1">
                    <div
                      className="w-4 rounded-t-md bg-emerald-500"
                      style={{ height: `${inHeight}px` }}
                      title={`Entrees: ${valueFormatter(quantityIn)}`}
                    />
                    <div
                      className="w-4 rounded-t-md bg-rose-500"
                      style={{ height: `${outHeight}px` }}
                      title={`Sorties: ${valueFormatter(quantityOut)}`}
                    />
                    <div
                      className="w-4 rounded-t-md bg-amber-400"
                      style={{ height: `${adjustmentHeight}px` }}
                      title={`Ajustements: ${valueFormatter(adjustedQuantity)}`}
                    />
                  </div>

                  <div className="text-center text-xs text-slate-500">{row.period}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const tabItems = [
  { key: "direction", label: "Direction" },
  { key: "commercial", label: "Commercial" },
  { key: "stock", label: "Stock" },
  { key: "variations", label: "Variations" }
];

export default function DashboardPage() {
  const [overviewData, setOverviewData] = useState(null);
  const [commercialData, setCommercialData] = useState(null);
  const [accountingData, setAccountingData] = useState(null);
  const [variationData, setVariationData] = useState(null);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [filters, setFilters] = useState(getDefaultFilters);
  const [activeTab, setActiveTab] = useState("direction");
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchContextData() {
    const results = await Promise.allSettled([
      api.get("/dashboard/overview?top_limit=8&recent_limit=8"),
      api.get("/dashboard/commercial-overview?days=365&top_limit=8"),
      api.get("/dashboard/accounting-overview?recent_limit=8"),
      api.get("/products"),
      api.get("/warehouses")
    ]);

    const errors = [];
    const [
      overviewResult,
      commercialResult,
      accountingResult,
      productsResult,
      warehousesResult
    ] = results;

    if (overviewResult.status === "fulfilled") {
      setOverviewData(overviewResult.value.data?.data || null);
    } else {
      setOverviewData(null);
      errors.push("vue executif");
    }

    if (commercialResult.status === "fulfilled") {
      setCommercialData(commercialResult.value.data?.data || null);
    } else {
      setCommercialData(null);
      errors.push("vue commerciale");
    }

    if (accountingResult.status === "fulfilled") {
      setAccountingData(accountingResult.value.data?.data || null);
    } else {
      setAccountingData(null);
      errors.push("vue comptable");
    }

    if (productsResult.status === "fulfilled") {
      setProducts(productsResult.value.data?.data || []);
    } else {
      setProducts([]);
      errors.push("produits");
    }

    if (warehousesResult.status === "fulfilled") {
      setWarehouses(warehousesResult.value.data?.data || []);
    } else {
      setWarehouses([]);
      errors.push("depots");
    }

    return errors;
  }

  async function fetchStockVariationReport(currentFilters) {
    const params = new URLSearchParams();

    Object.entries(currentFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, value);
      }
    });

    params.set("top_limit", "8");
    params.set("recent_limit", "12");

    const response = await api.get(
      `/dashboard/stock-variations-report?${params.toString()}`
    );

    setVariationData(response.data?.data || null);
  }

  async function fetchDashboard(initialFilters = filters) {
    try {
      setLoading(true);
      setError("");

      const [contextErrors, variationResult] = await Promise.all([
        fetchContextData(),
        fetchStockVariationReport(initialFilters)
          .then(() => ({ ok: true }))
          .catch((err) => ({ ok: false, err }))
      ]);

      const errors = Array.isArray(contextErrors) ? [...contextErrors] : [];

      if (!variationResult.ok) {
        setVariationData(null);
        errors.push("rapport des variations");
      }

      if (errors.length > 0) {
        const backendMessage = variationResult.ok
          ? ""
          : variationResult.err?.response?.data?.message ||
            variationResult.err?.message ||
            "";

        setError(
          `Certaines sections du dashboard n ont pas pu etre chargees : ${errors.join(", ")}.${backendMessage ? ` ${backendMessage}` : ""}`
        );
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger le dashboard executif."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboard(filters);
  }, []);

  async function handleApplyFilters(event) {
    event.preventDefault();

    try {
      setReportLoading(true);
      setError("");
      await fetchStockVariationReport(filters);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger le rapport de variations de stock."
      );
    } finally {
      setReportLoading(false);
    }
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  const stats = overviewData?.global_stats || {};
  const commercialSummary = commercialData?.summary || {};
  const accountingStats = accountingData?.accounting_global_stats || {};
  const accountingHealth = accountingData?.accounting_health || {};
  const cashSummary = accountingData?.cash_forecast?.summary || {};
  const projected30Days = useMemo(
    () =>
      accountingData?.cash_forecast?.horizons?.find(
        (item) => Number(item.horizon_days) === 30
      ) || null,
    [accountingData]
  );

  const directionSignals = useMemo(
    () => [
      {
        title: "Recouvrement urgent",
        value: formatMoney(cashSummary.overdue_receivables),
        subtitle: `${Number(
          cashSummary.overdue_receivable_invoices || 0
        )} facture(s) echee(s)`,
        tone:
          Number(cashSummary.overdue_receivables || 0) > 0 ? "red" : "green"
      },
      {
        title: "Alertes stock",
        value: formatNumber((overviewData?.stock_alerts || []).length),
        subtitle: "references sous seuil a traiter",
        tone:
          (overviewData?.stock_alerts || []).length > 0 ? "amber" : "green"
      },
      {
        title: "Clients dormants",
        value: formatNumber((commercialData?.dormant_clients || []).length),
        subtitle: "clients a relancer cote terrain",
        tone:
          (commercialData?.dormant_clients || []).length > 0 ? "amber" : "green"
      },
      {
        title: "Sante comptable",
        value:
          accountingHealth.status === "healthy"
            ? "Saine"
            : accountingHealth.status === "attention"
            ? "Attention"
            : "Critique",
        subtitle:
          accountingHealth.issues?.length > 0
            ? accountingHealth.issues[0]
            : "aucune anomalie structurelle detectee",
        tone:
          accountingHealth.status === "healthy"
            ? "green"
            : accountingHealth.status === "attention"
            ? "amber"
            : "red"
      }
    ],
    [accountingHealth, cashSummary, commercialData, overviewData]
  );

  const movementTypeRows = (variationData?.by_movement_type || []).map((row) => ({
    ...row,
    movement_label: movementTypeLabel(row.movement_type)
  }));

  const dashboardActions = useMemo(() => {
    const items = [];

    if (Number(cashSummary.overdue_receivables || 0) > 0) {
      items.push({
        title: "Priorite recouvrement",
        detail: `${formatMoney(
          cashSummary.overdue_receivables
        )} a encaisser sur les echeances deja depassees.`
      });
    }

    if ((overviewData?.stock_alerts || []).length > 0) {
      items.push({
        title: "Priorite reapprovisionnement",
        detail: `${(overviewData?.stock_alerts || []).length} reference(s) sont deja sous seuil.`
      });
    }

    if ((commercialData?.reactivation_candidates || []).length > 0) {
      items.push({
        title: "Relance commerciale",
        detail: `${(commercialData?.reactivation_candidates || []).length} client(s) peuvent etre reactives sans creance ouverte.`
      });
    }

    if (accountingHealth.issues?.length > 0) {
      items.push({
        title: "Suivi comptable",
        detail: accountingHealth.issues.join(" | ")
      });
    }

    if (items.length === 0) {
      items.push({
        title: "Lecture generale",
        detail:
          "Aucune alerte majeure detectee. La priorite peut porter sur la croissance commerciale et la marge."
      });
    }

    return items;
  }, [accountingHealth, cashSummary, commercialData, overviewData]);

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-soft">
        Chargement du dashboard executif...
      </div>
    );
  }

  if (error && !overviewData && !commercialData && !accountingData && !variationData) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Dashboard executif"
        subtitle="Cockpit de direction de Kivu Agro Bio avec vue DG, commerce, stock et variations operationnelles."
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              Vue direction
            </div>
            <div className="mt-3 text-3xl font-bold text-slate-900">
              Lecture unifiee des ventes, du cash, des stocks et du controle comptable
            </div>
            <div className="mt-3 text-sm leading-7 text-slate-600">
              Le dashboard principal met l accent sur la prise de decision: ou vendre plus, quoi reapprovisionner, quoi recouvrer et si la comptabilite reste saine.
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <span
              className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${getHealthBadgeClass(
                accountingHealth.status
              )}`}
            >
              Comptabilite{" "}
              {accountingHealth.status === "healthy"
                ? "saine"
                : accountingHealth.status === "attention"
                ? "a surveiller"
                : "critique"}
            </span>
            <span className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              {Number(stats.total_invoices || 0)} facture(s)
            </span>
            <span className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              {Number(commercialSummary.active_customers || 0)} client(s) actif(s)
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {tabItems.map((tab) => (
            <DashboardTabButton
              key={tab.key}
              active={activeTab === tab.key}
              label={tab.label}
              onClick={() => setActiveTab(tab.key)}
            />
          ))}
        </div>
      </div>

      {activeTab === "direction" ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <HeroMetricCard
              title="Chiffre d'affaires facture"
              value={formatMoney(stats.total_sales_amount)}
              subtitle={`${Number(stats.total_invoices || 0)} facture(s) emise(s) et ${formatMoney(
                stats.total_collected_amount
              )} deja encaisse(s)`}
              tone="brand"
            />
            <HeroMetricCard
              title="Profit brut"
              value={formatMoney(stats.gross_profit_amount)}
              subtitle={`Marge brute ${formatPercent(stats.gross_margin_percent)}`}
              tone="emerald"
            />
            <HeroMetricCard
              title="Base cash observee"
              value={formatMoney(cashSummary.current_cash_base)}
              subtitle="Paiements clients - paiements fournisseurs - depenses"
              tone="amber"
            />
            <HeroMetricCard
              title="Projection J+30"
              value={formatMoney(projected30Days?.projected_balance)}
              subtitle={
                projected30Days
                  ? `${formatMoney(projected30Days.expected_inflows)} a encaisser / ${formatMoney(
                      projected30Days.expected_outflows
                    )} a decaisser`
                  : "Aucune projection disponible"
              }
              tone={
                Number(projected30Days?.projected_balance || 0) >= 0
                  ? "slate"
                  : "red"
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {directionSignals.map((signal) => (
              <SignalCard
                key={signal.title}
                title={signal.title}
                value={signal.value}
                subtitle={signal.subtitle}
                tone={signal.tone}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <SalesPulseChart rows={overviewData?.sales_overview || []} />

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
              <div className="mb-2 text-lg font-semibold text-slate-900">
                Priorites direction
              </div>
              <div className="mb-5 text-sm text-slate-500">
                Lecture actionable des urgences et opportunites du moment.
              </div>

              <div className="space-y-4">
                {dashboardActions.map((item, index) => (
                  <div
                    key={`${item.title}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="text-sm font-semibold text-slate-900">
                      {item.title}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">
                      {item.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <TableCard
              title="Factures recentes"
              rows={overviewData?.recent_invoices || []}
              columns={[
                { key: "invoice_number", label: "Facture" },
                { key: "customer_name", label: "Client" },
                {
                  key: "invoice_date",
                  label: "Date",
                  render: (row) => formatDate(row.invoice_date)
                },
                {
                  key: "status",
                  label: "Statut",
                  render: (row) => (
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getInvoiceStatusClass(
                        row.status
                      )}`}
                    >
                      {row.status}
                    </span>
                  )
                },
                {
                  key: "total_amount",
                  label: "Montant",
                  render: (row) => formatMoney(row.total_amount)
                }
              ]}
            />

            <TableCard
              title="Encaissements recents"
              rows={overviewData?.recent_payments || []}
              emptyText="Aucun encaissement recent"
              columns={[
                {
                  key: "payment_date",
                  label: "Date",
                  render: (row) => formatDate(row.payment_date)
                },
                { key: "customer_name", label: "Client" },
                { key: "invoice_number", label: "Facture" },
                { key: "payment_method", label: "Mode" },
                {
                  key: "amount",
                  label: "Montant",
                  render: (row) => formatMoney(row.amount)
                }
              ]}
            />
          </div>
        </div>
      ) : null}

      {activeTab === "commercial" ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Ventes facturees"
              value={formatMoney(commercialSummary.total_sales_amount)}
              subtitle={`${Number(commercialSummary.total_invoices || 0)} facture(s)`}
            />
            <StatCard
              title="Profit brut"
              value={formatMoney(commercialSummary.gross_profit_amount)}
              subtitle={`Marge ${formatPercent(commercialSummary.gross_margin_percent)}`}
            />
            <StatCard
              title="Clients actifs"
              value={Number(commercialSummary.active_customers || 0)}
              subtitle={`${Number(commercialSummary.active_cities || 0)} ville(s) active(s)`}
            />
            <StatCard
              title="Creances clients"
              value={formatMoney(commercialSummary.total_receivables)}
              subtitle={`${formatMoney(commercialSummary.total_collected_amount)} deja encaisse(s)`}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <HorizontalBarChart
              title="Ventes par ville"
              rows={commercialData?.sales_by_city || []}
              labelKey="city"
              valueKey="total_sales_amount"
              helperText="Repere ou le chiffre d affaires se concentre reellement."
              colorClass="bg-emerald-500"
              valueFormatter={formatMoney}
              emptyText="Aucune vente par ville"
            />

            <HorizontalBarChart
              title="Top produits par chiffre d'affaires"
              rows={commercialData?.sales_by_product || []}
              labelKey="product_name"
              valueKey="total_sales_amount"
              helperText="References qui tirent la vente et la marge."
              colorClass="bg-brand-500"
              valueFormatter={formatMoney}
              emptyText="Aucun produit facture"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <TableCard
              title="Top clients"
              rows={commercialData?.sales_by_customer || []}
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
                }
              ]}
            />

            <TableCard
              title="Clients a reactiver"
              rows={commercialData?.reactivation_candidates || []}
              emptyText="Aucun client prioritaire a reactiver"
              columns={[
                { key: "business_name", label: "Client" },
                { key: "city", label: "Ville" },
                {
                  key: "days_since_last_invoice",
                  label: "Inactivite",
                  render: (row) => `${Number(row.days_since_last_invoice || 0)} j`
                },
                {
                  key: "total_sales_amount",
                  label: "Historique",
                  render: (row) => formatMoney(row.total_sales_amount)
                },
                {
                  key: "total_receivables",
                  label: "Creance",
                  render: (row) => formatMoney(row.total_receivables)
                }
              ]}
            />
          </div>
        </div>
      ) : null}

      {activeTab === "stock" ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Unites en stock"
              value={formatNumber(stats.total_units_in_stock)}
              subtitle={`${Number(stats.total_products || 0)} produit(s) actif(s)`}
            />
            <StatCard
              title="Depots actifs"
              value={formatNumber(stats.total_warehouses)}
              subtitle="inclus dans la vue globale"
            />
            <StatCard
              title="Alertes stock"
              value={formatNumber((overviewData?.stock_alerts || []).length)}
              subtitle="references sous seuil"
            />
            <StatCard
              title="Produits a faible rotation"
              value={formatNumber((overviewData?.low_rotation_products || []).length)}
              subtitle="sur la base des ventes facturees"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <TableCard
              title="Alertes stock"
              rows={overviewData?.stock_alerts || []}
              columns={[
                { key: "product_name", label: "Produit" },
                { key: "warehouse_name", label: "Depot" },
                {
                  key: "quantity",
                  label: "Stock",
                  render: (row) => formatNumber(row.quantity)
                },
                {
                  key: "alert_threshold",
                  label: "Seuil",
                  render: (row) => formatNumber(row.alert_threshold)
                }
              ]}
              emptyText="Aucune alerte stock"
            />

            <TableCard
              title="Produits a faible rotation"
              rows={overviewData?.low_rotation_products || []}
              emptyText="Aucun produit a faible rotation"
              columns={[
                { key: "product_name", label: "Produit" },
                { key: "sku", label: "SKU" },
                { key: "category", label: "Categorie" },
                {
                  key: "total_quantity_sold",
                  label: "Qte vendue",
                  render: (row) => formatNumber(row.total_quantity_sold)
                }
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <TableCard
              title="Top produits"
              rows={overviewData?.top_products || []}
              columns={[
                { key: "product_name", label: "Produit" },
                { key: "sku", label: "SKU" },
                {
                  key: "total_quantity_sold",
                  label: "Qte vendue",
                  render: (row) => formatNumber(row.total_quantity_sold)
                },
                {
                  key: "total_sales_value",
                  label: "Valeur",
                  render: (row) => formatMoney(row.total_sales_value)
                }
              ]}
            />

            <TableCard
              title="Repartition categories"
              rows={overviewData?.product_category_stats || []}
              emptyText="Aucune categorie"
              columns={[
                { key: "category", label: "Categorie" },
                {
                  key: "total_products",
                  label: "Produits",
                  render: (row) => formatNumber(row.total_products)
                }
              ]}
            />
          </div>
        </div>
      ) : null}

      {activeTab === "variations" ? (
        <div className="space-y-8">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-900">
                  Rapport des variations de stock
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Analyse des entrees, sorties, ajustements, transferts et transformations.
                </div>
              </div>

              {reportLoading ? (
                <div className="text-sm font-medium text-brand-600">
                  Chargement du rapport...
                </div>
              ) : null}
            </div>

            <form
              onSubmit={handleApplyFilters}
              className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-6"
            >
              <FilterField label="Date debut">
                <input
                  type="date"
                  name="start_date"
                  value={filters.start_date}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </FilterField>

              <FilterField label="Date fin">
                <input
                  type="date"
                  name="end_date"
                  value={filters.end_date}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </FilterField>

              <FilterField label="Depot">
                <select
                  name="warehouse_id"
                  value={filters.warehouse_id}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="">Tous les depots</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} - {warehouse.city}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Produit">
                <select
                  name="product_id"
                  value={filters.product_id}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="">Tous les produits</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} {product.sku ? `(${product.sku})` : ""}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Forme de stock">
                <select
                  name="stock_form"
                  value={filters.stock_form}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="">Toutes</option>
                  <option value="bulk">Produit fini</option>
                  <option value="package">Paquet</option>
                </select>
              </FilterField>

              <FilterField label="Vue timeline">
                <div className="flex gap-3">
                  <select
                    name="timeline"
                    value={filters.timeline}
                    onChange={handleFilterChange}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                  >
                    <option value="day">Jour</option>
                    <option value="month">Mois</option>
                  </select>

                  <button
                    type="submit"
                    disabled={reportLoading}
                    className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Filtrer
                  </button>
                </div>
              </FilterField>
            </form>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Mouvements"
              value={formatNumber(variationData?.overview?.total_movements)}
              subtitle={`${formatNumber(
                variationData?.overview?.total_products
              )} produits sur ${formatNumber(
                variationData?.overview?.total_warehouses
              )} depots`}
            />
            <StatCard
              title="Quantites entrantes"
              value={formatNumber(variationData?.overview?.total_positive_quantity)}
            />
            <StatCard
              title="Quantites sortantes"
              value={formatNumber(variationData?.overview?.total_negative_quantity)}
            />
            <StatCard
              title="Ajustements"
              value={formatNumber(variationData?.overview?.total_adjusted_quantity)}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <HorizontalBarChart
              title="Variations par type de mouvement"
              rows={movementTypeRows}
              labelKey="movement_label"
              valueKey="total_quantity"
              helperText="Volume total manipule par famille de mouvement."
              colorClass="bg-brand-500"
              valueFormatter={formatNumber}
            />

            <TimelineChart
              title="Evolution des variations"
              rows={variationData?.timeline || []}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <TableCard
              title="Produits les plus mouvementes"
              rows={variationData?.by_product || []}
              emptyText="Aucune variation par produit"
              columns={[
                { key: "product_name", label: "Produit" },
                { key: "sku", label: "SKU" },
                { key: "movements_count", label: "Mouvements" },
                {
                  key: "quantity_in",
                  label: "Entrees",
                  render: (row) => formatNumber(row.quantity_in)
                },
                {
                  key: "quantity_out",
                  label: "Sorties",
                  render: (row) => formatNumber(row.quantity_out)
                }
              ]}
            />

            <TableCard
              title="Depots les plus actifs"
              rows={variationData?.by_warehouse || []}
              emptyText="Aucune variation par depot"
              columns={[
                { key: "warehouse_name", label: "Depot" },
                { key: "warehouse_city", label: "Ville" },
                { key: "movements_count", label: "Mouvements" },
                {
                  key: "quantity_in",
                  label: "Entrees",
                  render: (row) => formatNumber(row.quantity_in)
                },
                {
                  key: "quantity_out",
                  label: "Sorties",
                  render: (row) => formatNumber(row.quantity_out)
                }
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <TableCard
              title="Synthese par type"
              rows={movementTypeRows}
              emptyText="Aucune synthese disponible"
              columns={[
                { key: "movement_label", label: "Type de mouvement" },
                { key: "movements_count", label: "Nombre" },
                {
                  key: "total_quantity",
                  label: "Quantite totale",
                  render: (row) => formatNumber(row.total_quantity)
                }
              ]}
            />

            <TableCard
              title="Dernieres variations"
              rows={variationData?.recent_movements || []}
              emptyText="Aucun mouvement recent"
              columns={[
                {
                  key: "created_at",
                  label: "Date",
                  render: (row) => formatDateTime(row.created_at)
                },
                { key: "product_name", label: "Produit" },
                { key: "warehouse_name", label: "Depot" },
                {
                  key: "movement_type",
                  label: "Type",
                  render: (row) => movementTypeLabel(row.movement_type)
                },
                {
                  key: "stock_form",
                  label: "Variation",
                  render: (row) => packageLabel(row)
                },
                {
                  key: "quantity",
                  label: "Quantite",
                  render: (row) => formatNumber(row.quantity)
                }
              ]}
            />
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
            <div className="mb-4 text-lg font-semibold text-slate-900">
              Lecture rapide du rapport
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <div className="font-semibold text-slate-900">Periode analysee</div>
                <div className="mt-2">
                  Du {filters.start_date || "-"} au {filters.end_date || "-"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <div className="font-semibold text-slate-900">Forme suivie</div>
                <div className="mt-2">
                  {filters.stock_form ? stockFormLabel(filters.stock_form) : "Toutes"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <div className="font-semibold text-slate-900">Dernier mouvement</div>
                <div className="mt-2">
                  {variationData?.overview?.last_movement_at
                    ? formatDateTime(variationData.overview.last_movement_at)
                    : "Aucun mouvement sur la periode"}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
