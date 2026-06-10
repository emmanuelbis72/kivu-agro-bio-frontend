import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import StatCard from "../components/ui/StatCard";
import TableCard from "../components/ui/TableCard";
import ProductCityHeatmap from "../components/ui/ProductCityHeatmap";
import CommercialHeatmapFilterPanel from "../components/ui/CommercialHeatmapFilterPanel";
import TreasuryBreakdown from "../components/ui/TreasuryBreakdown";
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

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildPathWithQuery(pathname, paramsObject = {}) {
  const params = new URLSearchParams();

  Object.entries(paramsObject || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      const sanitizedValues = value
        .map((item) => String(item || "").trim())
        .filter(Boolean);

      if (sanitizedValues.length > 0) {
        params.set(key, sanitizedValues.join(","));
      }

      return;
    }

    if (typeof value === "boolean") {
      if (value) {
        params.set(key, "true");
      }

      return;
    }

    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
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

function formatPeriodRange(startValue, endValue) {
  if (!startValue && !endValue) {
    return "-";
  }

  if (startValue && endValue && startValue === endValue) {
    return formatDate(startValue);
  }

  return `${formatDate(startValue)} - ${formatDate(endValue)}`;
}

function formatSignedMoney(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "n.d.";
  }

  const numericValue = Number(value);
  return `${numericValue > 0 ? "+" : ""}${formatMoney(numericValue)}`;
}

function formatSignedPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "n.d.";
  }

  const numericValue = Number(value);
  return `${numericValue > 0 ? "+" : ""}${numericValue.toFixed(1)} %`;
}

function formatChartPeriodLabel(row) {
  const period = String(row?.period || "").trim();

  if (row?.period_start) {
    const date = new Date(row.period_start);

    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("fr-FR", {
        month: "short",
        year: "2-digit"
      }).format(date);
    }
  }

  return period;
}

function formatChartPeriodTitle(row) {
  const label = formatChartPeriodLabel(row);

  if (row?.period_start && row?.period_end) {
    return `${label} (${formatDate(row.period_start)} - ${formatDate(row.period_end)})`;
  }

  return row?.period || label;
}

function resolveOptionLabel(options, value, emptyLabel) {
  if (!value) {
    return emptyLabel;
  }

  return options.find((option) => String(option.value) === String(value))?.label || String(value);
}

function compareAlphabetic(leftValue, rightValue) {
  return String(leftValue || "").localeCompare(String(rightValue || ""), "fr", {
    sensitivity: "base"
  });
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

function getDefaultDirectionFilters() {
  const endDate = new Date();
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1);

  return {
    start_date: formatDateInput(startDate),
    end_date: formatDateInput(endDate),
    warehouse_id: ""
  };
}

function getDefaultCollectionFilters() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 89);

  return {
    start_date: formatDateInput(startDate),
    end_date: formatDateInput(endDate),
    warehouse_id: "",
    customer_id: "",
    customer_city: "",
    entry_type: "all",
    top_products: "8",
    top_cities: "8"
  };
}

function getDefaultCustomerBalanceFilters() {
  const endDate = new Date();
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1);

  return {
    start_date: formatDateInput(startDate),
    end_date: formatDateInput(endDate),
    warehouse_id: "",
    customer_id: ""
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

function getAccountingStatusClass(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "posted") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (normalized === "error") {
    return "bg-red-100 text-red-700";
  }

  if (normalized === "skipped") {
    return "bg-amber-100 text-amber-700";
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

function CardActionLink({ action }) {
  if (!action?.to) {
    return null;
  }

  return (
    <Link
      to={action.to}
      className="inline-flex rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
    >
      {action.label || "Voir detail"}
    </Link>
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

function DeltaBadge({ value, formatter = formatSignedPercent }) {
  const numericValue = Number(value);
  const isValid =
    value !== null && value !== undefined && Number.isFinite(numericValue);
  const badgeClass = !isValid
    ? "bg-slate-100 text-slate-600"
    : numericValue > 0
    ? "bg-emerald-100 text-emerald-700"
    : numericValue < 0
    ? "bg-red-100 text-red-700"
    : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
    >
      {isValid ? formatter(numericValue) : "n.d."}
    </span>
  );
}

function ExecutiveMetricCell({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-slate-100">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-base font-bold text-slate-900">{value}</div>
    </div>
  );
}

function ExecutivePeriodCard({ title, period, tone = "slate" }) {
  const toneClasses = {
    brand: "border-brand-100 bg-gradient-to-br from-brand-50/70 via-white to-white",
    emerald:
      "border-emerald-100 bg-gradient-to-br from-emerald-50/80 via-white to-white",
    amber: "border-amber-100 bg-gradient-to-br from-amber-50/80 via-white to-white",
    slate: "border-slate-100 bg-gradient-to-br from-slate-50/80 via-white to-white"
  };

  const currentPeriod = period || {};

  return (
    <div
      className={`rounded-[28px] border p-5 shadow-soft ${
        toneClasses[tone] || toneClasses.slate
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            {title}
          </div>
          <div className="mt-2 text-sm text-slate-600">
            {formatPeriodRange(
              currentPeriod.start_date,
              currentPeriod.end_date
            )}
          </div>
        </div>
        <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-100">
          {Number(currentPeriod.total_invoices || 0)} facture(s)
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ExecutiveMetricCell
          label="Facture"
          value={formatMoney(currentPeriod.invoiced_amount)}
        />
        <ExecutiveMetricCell
          label="Encaisse"
          value={formatMoney(currentPeriod.payments_received)}
        />
        <ExecutiveMetricCell
          label="Depenses"
          value={formatMoney(currentPeriod.expenses_amount)}
        />
        <ExecutiveMetricCell
          label="Profit brut"
          value={formatMoney(currentPeriod.gross_profit_amount)}
        />
        <ExecutiveMetricCell
          label="Net estime"
          value={formatMoney(currentPeriod.net_profit_estimate)}
        />
        <ExecutiveMetricCell
          label="Marge nette"
          value={formatPercent(currentPeriod.net_margin_percent)}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-100">
          {Number(currentPeriod.payments_count || 0)} paiement(s)
        </span>
        <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-100">
          {Number(currentPeriod.expenses_count || 0)} depense(s)
        </span>
        <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-100">
          {Number(currentPeriod.span_days || 0)} jour(s)
        </span>
      </div>
    </div>
  );
}

function ExecutiveInsightCard({
  eyebrow,
  title,
  value,
  subtitle,
  deltaValue,
  deltaFormatter = formatSignedPercent
}) {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {eyebrow}
          </div>
          <div className="mt-2 text-base font-semibold leading-6 text-slate-900">
            {title}
          </div>
        </div>
        <DeltaBadge value={deltaValue} formatter={deltaFormatter} />
      </div>

      <div className="mt-5 text-3xl font-bold text-slate-900">{value}</div>
      {subtitle ? (
        <div className="mt-3 text-sm leading-6 text-slate-600">{subtitle}</div>
      ) : null}
    </div>
  );
}

function ExecutiveKpiSnapshotSection({ snapshot }) {
  const periods = snapshot?.periods || {};
  const comparisons = snapshot?.comparisons || {};
  const targets = snapshot?.targets || {};
  const forecasts = snapshot?.forecasts || {};
  const previousMonth = comparisons.month_vs_previous_month_to_date || {};
  const lastYear = comparisons.month_vs_same_period_last_year || {};
  const salesForecastToDate = forecasts.sales_30d_forecast_to_date;
  const cashForecastToDate = forecasts.cash_30d_forecast_to_date;

  const insightCards = [
    {
      key: "previous",
      eyebrow: "Comparatif M-1",
      title: "Encaissements du mois vs mois precedent",
      value: formatMoney(previousMonth.current_period?.payments_received),
      subtitle: `Facture ${formatSignedMoney(
        previousMonth.invoiced_delta
      )} • Encaisse ${formatSignedMoney(previousMonth.payments_delta)}`,
      deltaValue: previousMonth.payments_delta_percent
    },
    {
      key: "last-year",
      eyebrow: "Comparatif N-1",
      title: "Meme periode de l annee precedente",
      value: formatMoney(lastYear.current_period?.payments_received),
      subtitle: `Profit net ${formatSignedMoney(
        lastYear.net_profit_delta
      )} • Facture ${formatSignedMoney(lastYear.invoiced_delta)}`,
      deltaValue: lastYear.payments_delta_percent
    },
    {
      key: "target",
      eyebrow: "Objectif mensuel",
      title: "Cadence d encaissement",
      value: formatMoney(targets.actual_collected_to_date),
      subtitle: `Attendu ${formatMoney(
        targets.expected_collected_to_date
      )} • objectif complet ${formatMoney(targets.monthly_revenue_target)}`,
      deltaValue: targets.collected_gap_to_target,
      deltaFormatter: formatSignedMoney
    },
    {
      key: "forecast",
      eyebrow: "Prevision IA",
      title: "Projection cash et ventes a date",
      value:
        cashForecastToDate === null || cashForecastToDate === undefined
          ? "n.d."
          : formatMoney(cashForecastToDate),
      subtitle: `Cash reel ${formatMoney(
        forecasts.actual_cash_to_date
      )} • ventes vs IA ${
        salesForecastToDate === null || salesForecastToDate === undefined
          ? "n.d."
          : formatSignedMoney(forecasts.sales_gap_to_forecast)
      }`,
      deltaValue: forecasts.cash_gap_to_forecast,
      deltaFormatter: formatSignedMoney
    }
  ];

  return (
    <div className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-soft">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
            Cockpit DG
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            Synthese jour, semaine et mois avec objectif et projection IA
          </div>
          <div className="mt-3 text-sm leading-7 text-slate-600">
            Lecture prioritaire pour arbitrer le cash, le recouvrement, les
            depenses et l avance du mois sans quitter la vue direction.
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:min-w-[360px]">
          <SignalCard
            title="Tresorerie disponible"
            value={formatMoney(snapshot?.current_cash_base)}
            subtitle={
              <TreasuryBreakdown
                cashOnHand={snapshot?.cash_on_hand_base}
                bank={snapshot?.bank_base}
                mobileMoney={snapshot?.mobile_money_base}
                other={snapshot?.other_treasury_base}
                header={`Photo au ${formatDateTime(snapshot?.as_of_date)}`}
              />
            }
            tone="green"
          />
          <SignalCard
            title="Creances ouvertes"
            value={formatMoney(snapshot?.open_receivables)}
            subtitle="Factures encore a encaisser"
            tone="amber"
          />
          <SignalCard
            title="Dettes ouvertes"
            value={formatMoney(snapshot?.open_payables)}
            subtitle="Decaissements fournisseurs a couvrir"
            tone="red"
          />
          <SignalCard
            title="Progression du mois"
            value={formatPercent(targets.month_progress_percent)}
            subtitle={targets.target_label || "Cadence du mois en cours"}
            tone="blue"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ExecutivePeriodCard title="Aujourd hui" period={periods.day} tone="brand" />
        <ExecutivePeriodCard title="Semaine" period={periods.week} tone="emerald" />
        <ExecutivePeriodCard title="Mois" period={periods.month} tone="amber" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {insightCards.map((card) => (
          <ExecutiveInsightCard
            key={card.key}
            eyebrow={card.eyebrow}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            deltaValue={card.deltaValue}
            deltaFormatter={card.deltaFormatter}
          />
        ))}
      </div>
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
  emptyText = "Aucune donnee",
  action = null
}) {
  const maxValue = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 0);

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div className="text-lg font-semibold text-slate-900">{title}</div>
        <CardActionLink action={action} />
      </div>
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

function ExpenseDonutChart({
  title,
  rows,
  action = null,
  emptyText = "Aucune depense sur la periode"
}) {
  const palette = [
    "#E11D48",
    "#EA580C",
    "#D97706",
    "#7C3AED",
    "#2563EB",
    "#0891B2",
    "#059669",
    "#475569"
  ];
  const normalizedRows = (Array.isArray(rows) ? rows : [])
    .map((row, index) => ({
      ...row,
      value: Number(row.total_amount || 0),
      color: palette[index % palette.length]
    }))
    .filter((row) => row.value > 0);
  const total = normalizedRows.reduce((sum, row) => sum + row.value, 0);
  let cursor = 0;
  const gradientStops = normalizedRows.map((row) => {
    const start = cursor;
    cursor += total > 0 ? (row.value / total) * 100 : 0;
    return `${row.color} ${start}% ${cursor}%`;
  });

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div className="text-lg font-semibold text-slate-900">{title}</div>
        <CardActionLink action={action} />
      </div>
      <div className="mb-5 text-sm text-slate-500">
        Repartition statistique des charges par categorie sur le filtre DG actif.
      </div>

      {normalizedRows.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          {emptyText}
        </div>
      ) : (
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="relative mx-auto h-52 w-52">
            <div
              className="h-full w-full rounded-full"
              style={{
                background: `conic-gradient(${gradientStops.join(", ")})`
              }}
            />
            <div className="absolute inset-10 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Total
              </div>
              <div className="mt-2 text-xl font-bold text-slate-900">
                {formatMoney(total)}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {normalizedRows.map((row) => (
              <div
                key={row.category}
                className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="truncate text-sm font-medium text-slate-700">
                    {row.category || "Non classe"}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">
                    {formatMoney(row.value)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatPercent(total > 0 ? (row.value / total) * 100 : 0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SalesPulseChart({ rows, action = null }) {
  const recentRows = rows.slice(-6);
  const maxValue = Math.max(
    ...recentRows.map((row) => Number(row.total_sales || 0)),
    0
  );

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div className="text-lg font-semibold text-slate-900">
          Pulse mensuel des ventes
        </div>
        <CardActionLink action={action} />
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

function MultiSeriesLineChart({
  title,
  subtitle,
  rows,
  series,
  valueFormatter = formatMoney,
  emptyText = "Aucune tendance disponible",
  action = null
}) {
  const chartRows = Array.isArray(rows) ? rows : [];
  const activeSeries = Array.isArray(series) ? series.filter(Boolean) : [];
  const width = 720;
  const height = 260;
  const padding = { top: 18, right: 18, bottom: 42, left: 18 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(
    ...chartRows.flatMap((row) =>
      activeSeries.map((item) => Number(row?.[item.key] || 0))
    ),
    0
  );

  function getX(index) {
    if (chartRows.length <= 1) {
      return padding.left + innerWidth / 2;
    }

    return padding.left + (index / (chartRows.length - 1)) * innerWidth;
  }

  function getY(value) {
    if (maxValue <= 0) {
      return padding.top + innerHeight;
    }

    return padding.top + innerHeight - (Number(value || 0) / maxValue) * innerHeight;
  }

  function buildPath(key) {
    return chartRows
      .map((row, index) => `${index === 0 ? "M" : "L"} ${getX(index)} ${getY(row[key])}`)
      .join(" ");
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div className="text-lg font-semibold text-slate-900">{title}</div>
        <CardActionLink action={action} />
      </div>
      {subtitle ? (
        <div className="mb-5 text-sm text-slate-500">{subtitle}</div>
      ) : null}

      {chartRows.length === 0 || activeSeries.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          {emptyText}
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-4 text-xs text-slate-500">
            {activeSeries.map((item) => (
              <span key={item.key} className="inline-flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </span>
            ))}
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full">
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = padding.top + innerHeight - innerHeight * ratio;

                  return (
                    <line
                      key={ratio}
                      x1={padding.left}
                      x2={width - padding.right}
                      y1={y}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeDasharray="4 4"
                    />
                  );
                })}

                {activeSeries.map((item) => (
                  <path
                    key={item.key}
                    d={buildPath(item.key)}
                    fill="none"
                    stroke={item.color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}

                {activeSeries.map((item) =>
                  chartRows.map((row, index) => (
                    <circle
                      key={`${item.key}-${row.period}-${index}`}
                      cx={getX(index)}
                      cy={getY(row[item.key])}
                      r="4"
                      fill={item.color}
                    >
                      <title>
                        {`${item.label} | ${formatChartPeriodTitle(row)} : ${valueFormatter(row[item.key])}`}
                      </title>
                    </circle>
                  ))
                )}

                {chartRows.map((row, index) => (
                  <text
                    key={row.period}
                    x={getX(index)}
                    y={height - 12}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="600"
                    fill="#475569"
                  >
                    {formatChartPeriodLabel(row)}
                  </text>
                ))}
              </svg>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DualMetricRankingChart({
  title,
  subtitle,
  rows,
  labelKey,
  primaryKey,
  secondaryKey,
  primaryLabel,
  secondaryLabel,
  primaryColor = "bg-brand-500",
  secondaryColor = "bg-emerald-500",
  valueFormatter = formatMoney,
  emptyText = "Aucune donnee",
  action = null
}) {
  const maxValue = Math.max(
    ...rows.flatMap((row) => [
      Number(row?.[primaryKey] || 0),
      Number(row?.[secondaryKey] || 0)
    ]),
    0
  );

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div className="text-lg font-semibold text-slate-900">{title}</div>
        <CardActionLink action={action} />
      </div>
      {subtitle ? (
        <div className="mb-5 text-sm text-slate-500">{subtitle}</div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${primaryColor}`} />
          {primaryLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${secondaryColor}`} />
          {secondaryLabel}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-5">
          {rows.map((row, index) => {
            const primaryValue = Number(row[primaryKey] || 0);
            const secondaryValue = Number(row[secondaryKey] || 0);
            const primaryWidth =
              maxValue > 0 ? Math.max((primaryValue / maxValue) * 100, 2) : 0;
            const secondaryWidth =
              maxValue > 0 ? Math.max((secondaryValue / maxValue) * 100, 2) : 0;

            return (
              <div key={`${row[labelKey]}-${index}`} className="space-y-2">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <div className="font-medium text-slate-700">
                    {row[labelKey] || "-"}
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>{primaryLabel}: {valueFormatter(primaryValue)}</div>
                    <div>{secondaryLabel}: {valueFormatter(secondaryValue)}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="h-3 rounded-full bg-slate-100">
                    <div
                      className={`h-3 rounded-full ${primaryColor}`}
                      style={{ width: `${primaryWidth}%` }}
                    />
                  </div>
                  <div className="h-3 rounded-full bg-slate-100">
                    <div
                      className={`h-3 rounded-full ${secondaryColor}`}
                      style={{ width: `${secondaryWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ParetoChart({
  title,
  subtitle,
  rows,
  emptyText = "Aucune analyse Pareto disponible",
  action = null
}) {
  const maxValue = Math.max(...rows.map((row) => Number(row.total_sales_amount || 0)), 0);

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div className="text-lg font-semibold text-slate-900">{title}</div>
        <CardActionLink action={action} />
      </div>
      {subtitle ? <div className="mb-5 text-sm text-slate-500">{subtitle}</div> : null}

      {rows.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const salesAmount = Number(row.total_sales_amount || 0);
            const width = maxValue > 0 ? Math.max((salesAmount / maxValue) * 100, 2) : 0;
            const cumulativeShare = Number(row.cumulative_sales_share_percent || 0);

            return (
              <div key={row.product_id} className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">
                      {row.rank_order}. {row.product_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {row.category || "Categorie non renseignee"}
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>{formatMoney(salesAmount)}</div>
                    <div>Cumul {formatPercent(cumulativeShare)}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="h-3 rounded-full bg-slate-100">
                    <div
                      className="h-3 rounded-full bg-brand-500"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(cumulativeShare, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PointOfSaleCoverageMap({
  title,
  subtitle,
  rows,
  emptyText = "Aucune couverture geographique disponible",
  action = null
}) {
  const positions = {
    Kinshasa: { x: 26, y: 58 },
    Lubumbashi: { x: 63, y: 78 },
    Kolwezi: { x: 52, y: 69 },
    Goma: { x: 79, y: 44 },
    Bukavu: { x: 74, y: 52 },
    Matadi: { x: 18, y: 63 },
    Johannesburg: { x: 56, y: 94 }
  };

  const plottedRows = rows
    .map((row) => {
      const cityName = String(row.city || row.warehouse_city || "").trim();
      const positionKey =
        Object.keys(positions).find(
          (key) => key.toLowerCase() === cityName.toLowerCase()
        ) || null;

      return positionKey
        ? {
            ...row,
            position: positions[positionKey],
            display_city: positionKey
          }
        : null;
    })
    .filter(Boolean);

  const maxSales = Math.max(
    ...plottedRows.map((row) => Number(row.total_sales_amount || 0)),
    0
  );

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div className="text-lg font-semibold text-slate-900">{title}</div>
        <CardActionLink action={action} />
      </div>
      {subtitle ? <div className="mb-5 text-sm text-slate-500">{subtitle}</div> : null}

      {plottedRows.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          {emptyText}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="rounded-3xl border border-emerald-100 bg-[radial-gradient(circle_at_top,#ecfdf5,transparent_55%),linear-gradient(180deg,#f8fafc_0%,#ecfeff_100%)] p-4">
            <svg viewBox="0 0 100 100" className="h-[320px] w-full">
              <rect x="10" y="10" width="80" height="80" rx="12" fill="#E2FBE8" />
              <path
                d="M26 24 L47 18 L70 23 L82 40 L78 61 L67 76 L49 83 L31 77 L21 59 L19 38 Z"
                fill="#BBF7D0"
                stroke="#22C55E"
                strokeWidth="1.4"
              />

              {plottedRows.map((row) => {
                const radius =
                  maxSales > 0
                    ? 4 + (Number(row.total_sales_amount || 0) / maxSales) * 8
                    : 5;

                return (
                  <g key={row.display_city}>
                    <circle
                      cx={row.position.x}
                      cy={row.position.y}
                      r={radius}
                      fill="#0F766E"
                      fillOpacity="0.78"
                      stroke="#ECFDF5"
                      strokeWidth="1.5"
                    >
                      <title>
                        {`${row.display_city} • ${formatMoney(
                          row.total_sales_amount
                        )} • ${Number(row.total_customers || 0)} point(s)`}
                      </title>
                    </circle>
                    <text
                      x={row.position.x}
                      y={row.position.y - radius - 2}
                      textAnchor="middle"
                      fontSize="4"
                      fontWeight="700"
                      fill="#065F46"
                    >
                      {row.display_city}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="space-y-3">
            {plottedRows.map((row) => (
              <div
                key={`legend-${row.display_city}`}
                className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div className="text-sm font-semibold text-slate-800">
                  {row.display_city}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {formatMoney(row.total_sales_amount)} •{" "}
                  {Number(row.total_customers || 0)} point(s) •{" "}
                  {Number(row.total_invoices || 0)} facture(s)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerBalanceBoardTable({
  board,
  filters,
  customers,
  warehouses,
  loading,
  onChange,
  onSubmit
}) {
  const rows = Array.isArray(board?.rows) ? board.rows : [];
  const monthlyTrend = Array.isArray(board?.monthly_trend)
    ? board.monthly_trend
    : [];
  const totals = board?.totals || {};

  function getBalanceClass(value) {
    const numericValue = Number(value || 0);

    if (numericValue > 0) {
      return "text-amber-700";
    }

    if (numericValue < 0) {
      return "text-emerald-700";
    }

    return "text-slate-700";
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="mb-2 text-lg font-semibold text-slate-900">
          Bilan clients
        </div>
        <div className="mb-5 text-sm text-slate-500">
          Filtrer les factures et paiements par periode, client et depot.
        </div>

        <form
          onSubmit={onSubmit}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5"
        >
          <FilterField label="Date debut">
            <input
              type="date"
              name="start_date"
              value={filters.start_date}
              onChange={onChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            />
          </FilterField>
          <FilterField label="Date fin">
            <input
              type="date"
              name="end_date"
              value={filters.end_date}
              onChange={onChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            />
          </FilterField>
          <FilterField label="Client">
            <select
              name="customer_id"
              value={filters.customer_id}
              onChange={onChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              <option value="">Tous les clients</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.business_name}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Depot">
            <select
              name="warehouse_id"
              value={filters.warehouse_id}
              onChange={onChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              <option value="">Tous les depots</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </FilterField>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Chargement..." : "Filtrer"}
            </button>
          </div>
        </form>
      </div>

      <MultiSeriesLineChart
        title="Suivi mensuel factures emises / paiements recus"
        subtitle="Comparaison superposee sur les six derniers mois du filtre selectionne."
        rows={monthlyTrend}
        series={[
          { key: "invoiced_amount", label: "Factures emises", color: "#2563EB" },
          { key: "payments_received", label: "Paiements recus", color: "#059669" }
        ]}
        valueFormatter={formatMoney}
        emptyText="Aucune tendance client disponible"
      />

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        {rows.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Aucun client facture pour ce bilan
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-3 py-3 text-left font-semibold text-slate-600">
                  Client
                </th>
                <th className="px-3 py-3 text-right font-semibold text-slate-600">
                  Factures
                </th>
                <th className="px-3 py-3 text-right font-semibold text-slate-600">
                  Paiements
                </th>
                <th className="px-3 py-3 text-right font-semibold text-slate-600">
                  Balance
                </th>
                <th className="px-3 py-3 text-right font-semibold text-slate-600">
                  Nb factures
                </th>
                <th className="px-3 py-3 text-right font-semibold text-slate-600">
                  Nb paiements
                </th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600">
                  Dernier paiement
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.customer_id}
                  className="border-b border-slate-100 last:border-b-0"
                >
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-800">
                      {row.business_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {row.city || "Ville non renseignee"}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-slate-700">
                    {formatMoney(row.invoiced_amount)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-700">
                    {formatMoney(row.paid_amount)}
                  </td>
                  <td
                    className={`px-3 py-3 text-right font-semibold ${getBalanceClass(
                      row.balance_amount
                    )}`}
                  >
                    {formatMoney(row.balance_amount)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-700">
                    {formatNumber(row.invoices_count)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-700">
                    {formatNumber(row.payments_count)}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {formatDate(row.last_payment_date)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50">
                <td className="px-3 py-3 font-bold text-slate-900">Total</td>
                <td className="px-3 py-3 text-right font-bold text-slate-900">
                  {formatMoney(totals.invoiced_amount)}
                </td>
                <td className="px-3 py-3 text-right font-bold text-slate-900">
                  {formatMoney(totals.paid_amount)}
                </td>
                <td
                  className={`px-3 py-3 text-right font-bold ${getBalanceClass(
                    totals.balance_amount
                  )}`}
                >
                  {formatMoney(totals.balance_amount)}
                </td>
                <td className="px-3 py-3 text-right font-bold text-slate-900">
                  {formatNumber(totals.invoices_count)}
                </td>
                <td className="px-3 py-3 text-right font-bold text-slate-900">
                  {formatNumber(totals.payments_count)}
                </td>
                <td className="px-3 py-3 font-bold text-slate-900">
                  {formatNumber(totals.total_customers)} client(s)
                </td>
              </tr>
            </tfoot>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineChart({
  title,
  rows,
  valueFormatter = formatNumber,
  emptyText = "Aucune variation sur la periode",
  action = null
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
      <div className="mb-2 flex items-start justify-between gap-4">
        <div className="text-lg font-semibold text-slate-900">{title}</div>
        <CardActionLink action={action} />
      </div>
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

                  <div className="text-center text-xs font-semibold text-slate-600">
                    {formatChartPeriodLabel(row)}
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

const tabItems = [
  { key: "direction", label: "Direction" },
  { key: "recouvrement", label: "Recouvrement" },
  { key: "commercial", label: "Commercial" },
  { key: "stock", label: "Stock" },
  { key: "variations", label: "Variations" }
];

export default function DashboardPage() {
  const [overviewData, setOverviewData] = useState(null);
  const [directionData, setDirectionData] = useState(null);
  const [customerBalanceData, setCustomerBalanceData] = useState(null);
  const [collectionData, setCollectionData] = useState(null);
  const [commercialData, setCommercialData] = useState(null);
  const [accountingData, setAccountingData] = useState(null);
  const [variationData, setVariationData] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [filters, setFilters] = useState(getDefaultFilters);
  const [directionFilters, setDirectionFilters] = useState(getDefaultDirectionFilters);
  const [collectionFilters, setCollectionFilters] = useState(
    getDefaultCollectionFilters
  );
  const [customerBalanceFilters, setCustomerBalanceFilters] = useState(
    getDefaultCustomerBalanceFilters
  );
  const [heatmapFilters, setHeatmapFilters] = useState(() =>
    getDefaultCommercialHeatmapFilters({
      periodDays: "365",
      topProducts: "8",
      topCities: "8"
    })
  );
  const [activeTab, setActiveTab] = useState("direction");
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [directionLoading, setDirectionLoading] = useState(false);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [customerBalanceLoading, setCustomerBalanceLoading] = useState(false);
  const [commercialRefreshing, setCommercialRefreshing] = useState(false);
  const [error, setError] = useState("");

  function buildCommercialOverviewPath(nextHeatmapFilters = heatmapFilters) {
    const params = new URLSearchParams();
    params.set("days", "365");
    params.set("top_limit", "8");

    buildCommercialHeatmapQueryParams(nextHeatmapFilters).forEach(
      (value, key) => {
        params.set(key, value);
      }
    );

    return `/dashboard/commercial-overview?${params.toString()}`;
  }

  async function fetchCommercialOverview(nextHeatmapFilters = heatmapFilters) {
    const response = await api.get(buildCommercialOverviewPath(nextHeatmapFilters));
    setCommercialData(response.data?.data || null);
  }

  async function fetchExecutiveAnalytics(currentDirectionFilters = directionFilters) {
    const params = new URLSearchParams();
    params.set("top_limit", "8");

    Object.entries(currentDirectionFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, value);
      }
    });

    const response = await api.get(
      `/dashboard/executive-analytics?${params.toString()}`
    );
    setDirectionData(response.data?.data || null);
  }

  async function fetchCustomerBalanceBoard(
    currentFilters = customerBalanceFilters
  ) {
    const params = new URLSearchParams();

    Object.entries(currentFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, value);
      }
    });

    const response = await api.get(
      `/dashboard/customer-balance-board?${params.toString()}`
    );
    setCustomerBalanceData(response.data?.data || null);
  }

  async function fetchCollectionsOverview(
    currentCollectionFilters = collectionFilters
  ) {
    const params = new URLSearchParams();

    Object.entries(currentCollectionFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, value);
      }
    });

    const response = await api.get(
      `/dashboard/collections-overview?${params.toString()}`
    );
    setCollectionData(response.data?.data || null);
  }

  async function fetchContextData(
    currentHeatmapFilters = heatmapFilters,
    currentCollectionFilters = collectionFilters
  ) {
    const results = await Promise.allSettled([
      api.get("/dashboard/overview?top_limit=8&recent_limit=8"),
      api.get(
        `/dashboard/collections-overview?${new URLSearchParams(
          currentCollectionFilters
        ).toString()}`
      ),
      api.get(buildCommercialOverviewPath(currentHeatmapFilters)),
      api.get("/dashboard/accounting-overview?recent_limit=8"),
      api.get("/customers"),
      api.get("/products"),
      api.get("/warehouses")
    ]);

    const errors = [];
    const [
      overviewResult,
      collectionResult,
      commercialResult,
      accountingResult,
      customersResult,
      productsResult,
      warehousesResult
    ] = results;

    if (overviewResult.status === "fulfilled") {
      setOverviewData(overviewResult.value.data?.data || null);
    } else {
      setOverviewData(null);
      errors.push("vue executif");
    }

    if (collectionResult.status === "fulfilled") {
      setCollectionData(collectionResult.value.data?.data || null);
    } else {
      setCollectionData(null);
      errors.push("vue recouvrement");
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

    if (customersResult.status === "fulfilled") {
      setCustomers(customersResult.value.data?.data || []);
    } else {
      setCustomers([]);
      errors.push("clients");
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

  async function fetchDashboard(
    initialFilters = filters,
    currentHeatmapFilters = heatmapFilters,
    currentDirectionFilters = directionFilters,
    currentCollectionFilters = collectionFilters
  ) {
    try {
      setLoading(true);
      setError("");

      const [
        contextErrors,
        variationResult,
        directionResult,
        customerBalanceResult
      ] = await Promise.all([
        fetchContextData(currentHeatmapFilters, currentCollectionFilters),
        fetchStockVariationReport(initialFilters)
          .then(() => ({ ok: true }))
          .catch((err) => ({ ok: false, err })),
        fetchExecutiveAnalytics(currentDirectionFilters)
          .then(() => ({ ok: true }))
          .catch((err) => ({ ok: false, err })),
        fetchCustomerBalanceBoard(customerBalanceFilters)
          .then(() => ({ ok: true }))
          .catch((err) => ({ ok: false, err }))
      ]);

      const errors = Array.isArray(contextErrors) ? [...contextErrors] : [];

      if (!variationResult.ok) {
        setVariationData(null);
        errors.push("rapport des variations");
      }

      if (!directionResult.ok) {
        setDirectionData(null);
        errors.push("analyse DG");
      }

      if (!customerBalanceResult.ok) {
        setCustomerBalanceData(null);
        errors.push("bilan clients");
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
    fetchDashboard(filters, heatmapFilters, directionFilters, collectionFilters);
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

  function handleDirectionFilterChange(event) {
    const { name, value } = event.target;
    setDirectionFilters((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function handleCollectionFilterChange(event) {
    const { name, value } = event.target;
    setCollectionFilters((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function handleCustomerBalanceFilterChange(event) {
    const { name, value } = event.target;
    setCustomerBalanceFilters((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleApplyCustomerBalanceFilters(event) {
    event.preventDefault();

    try {
      setCustomerBalanceLoading(true);
      setError("");
      await fetchCustomerBalanceBoard(customerBalanceFilters);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger le bilan clients."
      );
    } finally {
      setCustomerBalanceLoading(false);
    }
  }

  async function handleApplyCollectionFilters(event) {
    event.preventDefault();

    try {
      setCollectionLoading(true);
      setError("");
      await fetchCollectionsOverview(collectionFilters);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger le suivi recouvrement."
      );
    } finally {
      setCollectionLoading(false);
    }
  }

  async function handleApplyDirectionFilters(event) {
    event.preventDefault();

    try {
      setDirectionLoading(true);
      setError("");
      await fetchExecutiveAnalytics(directionFilters);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger l'analyse DG filtree."
      );
    } finally {
      setDirectionLoading(false);
    }
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

    try {
      setCommercialRefreshing(true);
      setError("");
      await fetchCommercialOverview(heatmapFilters);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de rafraichir la heatmap commerciale."
      );
    } finally {
      setCommercialRefreshing(false);
    }
  }

  async function handleHeatmapReset() {
    const defaults = getDefaultCommercialHeatmapFilters({
      periodDays: "365",
      topProducts: "8",
      topCities: "8"
    });

    setHeatmapFilters(defaults);

    try {
      setCommercialRefreshing(true);
      setError("");
      await fetchCommercialOverview(defaults);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de reinitialiser la heatmap commerciale."
      );
    } finally {
      setCommercialRefreshing(false);
    }
  }

  const stats = overviewData?.global_stats || {};
  const executiveSnapshot = overviewData?.executive_kpi_snapshot || {};
  const directionAnalytics = directionData || {};
  const directionMonthlyRevenueTrend =
    directionAnalytics?.monthly_revenue_trend || [];
  const directionCollectionsTrend =
    directionAnalytics?.collections_vs_invoices_trend || [];
  const directionForecastVsActual = directionAnalytics?.ai_forecast_vs_actual || {
    rows: []
  };
  const directionSalesByCity = directionAnalytics?.sales_by_city || [];
  const directionSalesByPointOfSale =
    directionAnalytics?.sales_by_point_of_sale || [];
  const directionSalesByWarehouse =
    directionAnalytics?.sales_by_warehouse || [];
  const directionProductPareto = directionAnalytics?.product_pareto || [];
  const directionNetMarginByProduct =
    directionAnalytics?.net_margin_by_product || [];
  const directionPointMap = directionAnalytics?.point_of_sale_map || [];
  const directionHeatmap = directionAnalytics?.product_city_heatmap || {
    products: [],
    cities: [],
    cells: []
  };
  const directionStockCoverage = directionAnalytics?.stock_coverage || [];
  const directionReceivablesAging = directionAnalytics?.receivables_aging || {
    summary: {},
    buckets: [],
    overdue_customers: []
  };
  const collectionOverview = collectionData || {};
  const collectionSummary = collectionOverview.summary || {};
  const collectionIssuedInvoices = collectionOverview.issued_invoices || [];
  const collectionUnpaidInvoices = collectionOverview.unpaid_invoices || [];
  const collectionPayments = collectionOverview.payments || [];
  const collectionHeatmap = collectionOverview.product_city_heatmap || {
    products: [],
    cities: [],
    cells: []
  };
  const directionExpensesByCategory =
    directionAnalytics?.expenses_by_category || [];
  const directionExpenseScopeNote =
    directionAnalytics?.filters?.expenses_scope_note || "";
  const customerBalanceBoard = customerBalanceData ||
    overviewData?.customer_balance_board || {
    rows: [],
    monthly_trend: [],
    totals: {}
  };
  const commercialSummary = commercialData?.summary || {};
  const commercialHighlights = commercialData?.performance_highlights || {};
  const commercialCities = commercialData?.sales_by_city || [];
  const commercialWarehouses = commercialData?.sales_by_warehouse || [];
  const commercialChains = commercialData?.sales_by_chain || [];
  const commercialChannels = commercialData?.sales_by_channel || [];
  const commercialCustomers = commercialData?.sales_by_customer || [];
  const commercialProducts = commercialData?.sales_by_product || [];
  const productCityHeatmap = commercialData?.product_city_heatmap || {
    products: [],
    cities: [],
    cells: [],
    best_pairs: []
  };
  const decliningProducts = commercialData?.declining_products || [];
  const reactivationCandidates = commercialData?.reactivation_candidates || [];
  const heatmapWarehouseOptions = useMemo(
    () => buildAlphabeticalOptions(warehouses, "id", "name"),
    [warehouses]
  );
  const sortedDashboardCustomers = useMemo(
    () =>
      [...customers].sort((left, right) =>
        compareAlphabetic(left.business_name, right.business_name)
      ),
    [customers]
  );
  const customerCityOptions = useMemo(
    () =>
      [...new Set(
        customers
          .map((customer) => String(customer.city || "").trim())
          .filter(Boolean)
      )].sort((left, right) => compareAlphabetic(left, right)),
    [customers]
  );
  const heatmapChainOptions = useMemo(
    () => buildAlphabeticalOptions(commercialChains, "chain_name"),
    [commercialChains]
  );
  const heatmapChannelOptions = useMemo(
    () => buildAlphabeticalOptions(commercialChannels, "sales_channel"),
    [commercialChannels]
  );
  const heatmapFilterSummary = useMemo(
    () => ({
      periodLabel:
        ({
          "30": "30 jours",
          "90": "90 jours",
          "180": "180 jours",
          "365": "12 mois"
        }[String(heatmapFilters.days)] || `${heatmapFilters.days} jours`),
      warehouseLabel: resolveOptionLabel(
        heatmapWarehouseOptions,
        heatmapFilters.warehouse_id,
        "Tous les depots"
      ),
      chainLabel: resolveOptionLabel(
        heatmapChainOptions,
        heatmapFilters.chain_name,
        "Toutes les chaines"
      ),
      channelLabel: resolveOptionLabel(
        heatmapChannelOptions,
        heatmapFilters.sales_channel,
        "Tous les canaux"
      )
    }),
    [
      heatmapChainOptions,
      heatmapChannelOptions,
      heatmapFilters,
      heatmapWarehouseOptions
    ]
  );
  const commercialDateRange = useMemo(() => {
    const endDate = new Date();
    const lookbackDays = Math.max(Number(heatmapFilters.days || 365), 1);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (lookbackDays - 1));

    return {
      start_date: formatDateInput(startDate),
      end_date: formatDateInput(endDate)
    };
  }, [heatmapFilters.days]);
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
  const executiveComparisonRows = overviewData?.executive_comparison_timeline || [];
  const executiveComparisonSeries = useMemo(
    () => [
      { key: "invoiced_amount", label: "Factures emises", color: "#2563EB" },
      { key: "payments_received", label: "Paiements recus", color: "#059669" },
      { key: "expenses_amount", label: "Depenses", color: "#DC2626" },
      { key: "gross_profit_amount", label: "Benefice brut", color: "#7C3AED" }
    ],
    []
  );
  const topPayingCustomers = commercialData?.top_paying_customers || [];
  const mostProfitableProducts = commercialData?.most_profitable_products || [];
  const directionMonthlyRevenueSeries = useMemo(
    () => [
      { key: "invoiced_amount", label: "CA facture", color: "#2563EB" }
    ],
    []
  );
  const directionCollectionsSeries = useMemo(
    () => [
      { key: "invoiced_amount", label: "Factures emises", color: "#2563EB" },
      { key: "payments_received", label: "Encaissements", color: "#059669" }
    ],
    []
  );
  const directionForecastSeries = useMemo(
    () => [
      { key: "invoiced_amount", label: "Ventes reelles", color: "#2563EB" },
      { key: "ai_sales_forecast_amount", label: "Prevision IA", color: "#7C3AED" }
    ],
    []
  );
  const selectedCollectionCustomer = useMemo(
    () =>
      sortedDashboardCustomers.find(
        (customer) =>
          String(customer.id) === String(collectionFilters.customer_id)
      ) || null,
    [collectionFilters.customer_id, sortedDashboardCustomers]
  );
  const collectionHeatmapSummaryItems = useMemo(
    () => [
      {
        label: "Periode",
        value: formatPeriodRange(
          collectionFilters.start_date,
          collectionFilters.end_date
        )
      },
      {
        label: "Depot",
        value:
          warehouses.find(
            (warehouse) =>
              String(warehouse.id) === String(collectionFilters.warehouse_id)
          )?.name || "Tous les depots"
      },
      {
        label: "Client",
        value: selectedCollectionCustomer?.business_name || "Tous les clients"
      },
      {
        label: "Ville",
        value: collectionFilters.customer_city || "Toutes les villes"
      },
      {
        label: "Produits retenus",
        value: `${collectionHeatmap.products?.length || 0} / ${Number(
          collectionHeatmap.filters?.top_products || collectionFilters.top_products || 0
        )}`
      },
      {
        label: "Villes retenues",
        value: `${collectionHeatmap.cities?.length || 0} / ${Number(
          collectionHeatmap.filters?.top_cities || collectionFilters.top_cities || 0
        )}`
      },
      {
        label: "Cellules actives",
        value: `${(collectionHeatmap.cells || []).filter(
          (cell) =>
            Number(cell?.total_sales_amount || 0) !== 0 ||
            Number(cell?.total_quantity_sold || 0) !== 0 ||
            Number(cell?.gross_profit_amount || 0) !== 0
        ).length} / ${(collectionHeatmap.cells || []).length}`
      }
    ],
    [
      collectionFilters.customer_city,
      collectionFilters.end_date,
      collectionFilters.start_date,
      collectionFilters.top_cities,
      collectionFilters.top_products,
      collectionFilters.warehouse_id,
      collectionHeatmap,
      selectedCollectionCustomer,
      warehouses
    ]
  );
  function buildDirectionReportPath(reportKey, extraParams = {}) {
    const sharedParams = {
      start_date: directionFilters.start_date,
      end_date: directionFilters.end_date
    };

    if (reportKey === "customer_aging") {
      return buildPathWithQuery("/reports", {
        report: reportKey,
        as_of_date: directionFilters.end_date,
        warehouse_id: directionFilters.warehouse_id || undefined,
        ...extraParams
      });
    }

    if (reportKey === "product_sales") {
      return buildPathWithQuery("/reports", {
        report: reportKey,
        ...sharedParams,
        warehouse_ids: directionFilters.warehouse_id
          ? [directionFilters.warehouse_id]
          : [],
        ...extraParams
      });
    }

    if (reportKey === "stock_state") {
      return buildPathWithQuery("/reports", {
        report: reportKey,
        warehouse_id: directionFilters.warehouse_id || undefined,
        ...extraParams
      });
    }

    return buildPathWithQuery("/reports", {
      report: reportKey,
      ...sharedParams,
      warehouse_id: directionFilters.warehouse_id || undefined,
      ...extraParams
    });
  }

  function buildCommercialReportPath(reportKey, extraParams = {}) {
    const sharedParams = {
      start_date: commercialDateRange.start_date,
      end_date: commercialDateRange.end_date
    };

    if (reportKey === "customer_aging") {
      return buildPathWithQuery("/reports", {
        report: reportKey,
        as_of_date: commercialDateRange.end_date,
        warehouse_id: heatmapFilters.warehouse_id || undefined,
        ...extraParams
      });
    }

    if (reportKey === "product_sales") {
      return buildPathWithQuery("/reports", {
        report: reportKey,
        ...sharedParams,
        warehouse_ids: heatmapFilters.warehouse_id
          ? [heatmapFilters.warehouse_id]
          : [],
        ...extraParams
      });
    }

    return buildPathWithQuery("/reports", {
      report: reportKey,
      ...sharedParams,
      warehouse_id: heatmapFilters.warehouse_id || undefined,
      ...extraParams
    });
  }

  function buildCollectionsReportPath(reportKey, extraParams = {}) {
    const sharedParams = {
      start_date: collectionFilters.start_date,
      end_date: collectionFilters.end_date
    };

    if (reportKey === "customer_aging") {
      return buildPathWithQuery("/reports", {
        report: reportKey,
        as_of_date: collectionFilters.end_date,
        warehouse_id: collectionFilters.warehouse_id || undefined,
        customer_id: collectionFilters.customer_id || undefined,
        ...extraParams
      });
    }

    if (reportKey === "receipts_journal") {
      return buildPathWithQuery("/reports", {
        report: reportKey,
        ...sharedParams,
        warehouse_id: collectionFilters.warehouse_id || undefined,
        customer_id: collectionFilters.customer_id || undefined,
        ...extraParams
      });
    }

    return buildPathWithQuery("/reports", {
      report: reportKey,
      ...sharedParams,
      warehouse_id: collectionFilters.warehouse_id || undefined,
      customer_id: collectionFilters.customer_id || undefined,
      ...extraParams
    });
  }

  const directionChartActions = useMemo(
    () => ({
      executiveComparison: {
        to: buildDirectionReportPath("treasury_statement"),
        label: "Voir etat"
      },
      salesPulse: {
        to: buildDirectionReportPath("income_statement"),
        label: "Voir etat"
      },
      topCustomers: {
        to: buildDirectionReportPath("customer_ledger"),
        label: "Voir clients"
      },
      revenueTrend: {
        to: buildDirectionReportPath("income_statement"),
        label: "Voir etat"
      },
      collectionsTrend: {
        to: buildDirectionReportPath("receipts_journal"),
        label: "Voir detail"
      },
      salesByCity: {
        to: buildDirectionReportPath("margin_by_city"),
        label: "Voir villes"
      },
      salesByCustomer: {
        to: buildDirectionReportPath("margin_by_customer"),
        label: "Voir clients"
      },
      productPareto: {
        to: buildDirectionReportPath("product_sales"),
        label: "Voir produits"
      },
      productMargin: {
        to: buildDirectionReportPath("product_sales"),
        label: "Voir produits"
      },
      pointMap: {
        to: buildDirectionReportPath("margin_by_customer"),
        label: "Voir points"
      },
      heatmap: {
        to: buildDirectionReportPath("product_sales"),
        label: "Voir detail"
      },
      stockCoverage: {
        to: buildDirectionReportPath("stock_state"),
        label: "Voir stock"
      },
      expensesByCategory: {
        to: buildDirectionReportPath("expenses_by_category"),
        label: "Voir depenses"
      },
      receivablesAging: {
        to: buildDirectionReportPath("customer_aging"),
        label: "Voir creances"
      },
      forecastVsActual: {
        to: "/ai-reasoning",
        label: "Voir IA"
      }
    }),
    [directionFilters]
  );
  const commercialChartActions = useMemo(
    () => ({
      salesByCity: {
        to: buildCommercialReportPath("margin_by_city"),
        label: "Voir villes"
      },
      salesByChain: {
        to: "/commercial-dashboard",
        label: "Voir detail"
      },
      chainCollections: {
        to: "/commercial-dashboard",
        label: "Voir detail"
      },
      channelProfit: {
        to: "/commercial-dashboard",
        label: "Voir detail"
      },
      salesByChannel: {
        to: "/commercial-dashboard",
        label: "Voir detail"
      },
      topProducts: {
        to: buildCommercialReportPath("product_sales"),
        label: "Voir produits"
      },
      heatmap: {
        to: buildCommercialReportPath("product_sales"),
        label: "Voir detail"
      },
      customerSalesTrend: {
        to: buildCommercialReportPath("customer_ledger"),
        label: "Voir clients"
      },
      customerPaymentsTrend: {
        to: buildCommercialReportPath("receipts_journal"),
        label: "Voir encaissements"
      },
      topPayers: {
        to: buildCommercialReportPath("customer_ledger"),
        label: "Voir clients"
      }
    }),
    [commercialDateRange, heatmapFilters.warehouse_id]
  );
  const collectionChartActions = useMemo(
    () => ({
      unpaidInvoices: {
        to: buildCollectionsReportPath("customer_aging"),
        label: "Voir creances"
      },
      issuedInvoices: {
        to: buildCollectionsReportPath("sales_detail"),
        label: "Voir factures"
      },
      payments: {
        to: buildCollectionsReportPath("receipts_journal"),
        label: "Voir paiements"
      },
      heatmap: {
        to: buildCollectionsReportPath("product_sales"),
        label: "Voir detail"
      }
    }),
    [collectionFilters]
  );
  const commercialLeaderSignals = useMemo(
    () => [
      {
        title: "Ville leader",
        value: commercialHighlights.top_city?.city || "-",
        tone: "green",
        subtitle: commercialHighlights.top_city
          ? `${formatMoney(
              commercialHighlights.top_city.total_sales_amount
            )} facture • ${formatPercent(
              commercialHighlights.top_city.collection_rate_percent
            )} encaisse`
          : "Aucune ville dominante"
      },
      {
        title: "Chaine leader",
        value: commercialHighlights.top_chain?.chain_name || "-",
        tone: "blue",
        subtitle: commercialHighlights.top_chain
          ? `${formatMoney(
              commercialHighlights.top_chain.total_sales_amount
            )} facture • ${Number(
              commercialHighlights.top_chain.total_customers || 0
            )} point(s)`
          : "Aucune chaine dominante"
      },
      {
        title: "Canal leader",
        value: commercialHighlights.top_channel?.sales_channel || "-",
        tone: "amber",
        subtitle: commercialHighlights.top_channel
          ? `${formatMoney(
              commercialHighlights.top_channel.total_sales_amount
            )} facture • marge ${formatPercent(
              commercialHighlights.top_channel.gross_margin_percent
            )}`
          : "Aucun canal dominant"
      },
      {
        title: "Client leader",
        value: commercialHighlights.top_customer?.business_name || "-",
        tone: "slate",
        subtitle: commercialHighlights.top_customer
          ? `${formatMoney(
              commercialHighlights.top_customer.total_sales_amount
            )} facture • ${formatMoney(
              commercialHighlights.top_customer.total_collected_amount
            )} encaisse`
          : "Aucun client moteur"
      },
      {
        title: "Produit moteur",
        value:
          commercialHighlights.top_product_by_profit?.product_name ||
          commercialHighlights.top_product_by_sales?.product_name ||
          "-",
        tone: "green",
        subtitle:
          commercialHighlights.top_product_by_profit ||
          commercialHighlights.top_product_by_sales
            ? `${formatMoney(
                (
                  commercialHighlights.top_product_by_profit ||
                  commercialHighlights.top_product_by_sales
                ).gross_profit_amount
              )} de profit brut`
            : "Aucun produit dominant"
      }
    ],
    [commercialHighlights]
  );
  const clientSalesTrend = useMemo(() => {
    const rows = commercialData?.customer_monthly_trend || [];

    if (rows.length === 0) {
      return {
        salesRows: [],
        paymentRows: [],
        series: []
      };
    }

    const series = [...new Set(rows.map((row) => row.business_name).filter(Boolean))]
      .slice(0, 5)
      .map((name, index) => ({
        key: `client_${index}`,
        label: name,
        color: ["#0F766E", "#2563EB", "#EA580C", "#7C3AED", "#E11D48"][index] || "#475569"
      }));

    const salesPeriodMap = new Map();
    const paymentPeriodMap = new Map();

    rows.forEach((row) => {
      if (!salesPeriodMap.has(row.period)) {
        salesPeriodMap.set(row.period, {
          period: row.period,
          period_start: row.period_start,
          period_end: row.period_end
        });
      }

      if (!paymentPeriodMap.has(row.period)) {
        paymentPeriodMap.set(row.period, {
          period: row.period,
          period_start: row.period_start,
          period_end: row.period_end
        });
      }

      const salesTarget = salesPeriodMap.get(row.period);
      const paymentTarget = paymentPeriodMap.get(row.period);
      const matchingSeries = series.find((item) => item.label === row.business_name);

      if (matchingSeries) {
        salesTarget[matchingSeries.key] = Number(row.billed_amount || 0);
        paymentTarget[matchingSeries.key] = Number(row.payments_received || 0);
      }
    });

    return {
      salesRows: [...salesPeriodMap.values()],
      paymentRows: [...paymentPeriodMap.values()],
      series
    };
  }, [commercialData]);

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
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="text-lg font-semibold text-slate-900">
                  Analyse DG prioritaire
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Filtres communs pour les graphes de pilotage: ventes, recouvrement, marge, stock, creances et depenses.
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    "CA mensuel",
                    "Factures / paiements",
                    "Ventes par ville et client",
                    "Pareto produits",
                    "Marge produits",
                    "Carte et heatmap",
                    "Couverture stock",
                    "Depenses",
                    "Creances",
                    "Prevision IA",
                    "Performance depots"
                  ].map((label) => (
                    <span
                      key={label}
                      className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              {directionExpenseScopeNote ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 xl:max-w-md">
                  {directionExpenseScopeNote}
                </div>
              ) : null}
            </div>

            <form
              onSubmit={handleApplyDirectionFilters}
              className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
            >
              <FilterField label="Date debut">
                <input
                  type="date"
                  name="start_date"
                  value={directionFilters.start_date}
                  onChange={handleDirectionFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </FilterField>

              <FilterField label="Date fin">
                <input
                  type="date"
                  name="end_date"
                  value={directionFilters.end_date}
                  onChange={handleDirectionFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </FilterField>

              <FilterField label="Depot">
                <select
                  name="warehouse_id"
                  value={directionFilters.warehouse_id}
                  onChange={handleDirectionFilterChange}
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

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={directionLoading}
                  className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {directionLoading ? "Chargement..." : "Appliquer"}
                </button>
              </div>
            </form>
          </div>

          <ExecutiveKpiSnapshotSection snapshot={executiveSnapshot} />

          <MultiSeriesLineChart
            title="Evolution comparee factures / paiements / depenses / benefice"
            subtitle="Lecture mensuelle pour rapprocher facturation, encaissement reel, depenses engagees et profit brut."
            rows={executiveComparisonRows}
            series={executiveComparisonSeries}
            valueFormatter={formatMoney}
            emptyText="Aucune serie executive disponible"
            action={directionChartActions.executiveComparison}
          />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <MultiSeriesLineChart
              title="Courbe du chiffre d'affaires mensuel"
              subtitle="Voir la croissance ou le ralentissement sur la periode filtree."
              rows={directionMonthlyRevenueTrend}
              series={directionMonthlyRevenueSeries}
              valueFormatter={formatMoney}
              emptyText="Aucune courbe de chiffre d'affaires disponible"
              action={directionChartActions.revenueTrend}
            />

            <MultiSeriesLineChart
              title="Encaissements contre factures emises"
              subtitle="Detecter rapidement un probleme de recouvrement par ecart entre facture et cash."
              rows={directionCollectionsTrend}
              series={directionCollectionsSeries}
              valueFormatter={formatMoney}
              emptyText="Aucune comparaison factures / encaissements disponible"
              action={directionChartActions.collectionsTrend}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <HorizontalBarChart
              title="Ventes par ville"
              rows={directionSalesByCity}
              labelKey="city"
              valueKey="total_sales_amount"
              helperText="Identifier les marches les plus performants."
              colorClass="bg-emerald-500"
              valueFormatter={formatMoney}
              emptyText="Aucune vente par ville sur la periode"
              action={directionChartActions.salesByCity}
            />

            <HorizontalBarChart
              title="Ventes par point de vente"
              rows={directionSalesByPointOfSale}
              labelKey="business_name"
              valueKey="total_sales_amount"
              helperText="Prioriser les magasins et pharmacies a suivre."
              colorClass="bg-brand-500"
              valueFormatter={formatMoney}
              emptyText="Aucun point de vente sur la periode"
              action={directionChartActions.salesByCustomer}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ParetoChart
              title="Diagramme de Pareto des produits"
              subtitle="Identifier les references qui portent l'essentiel du chiffre d'affaires."
              rows={directionProductPareto}
              action={directionChartActions.productPareto}
            />

            <HorizontalBarChart
              title="Marge nette estimee par produit"
              rows={directionNetMarginByProduct}
              labelKey="product_name"
              valueKey="net_profit_estimate"
              helperText="Eviter de pousser des produits qui paraissent actifs mais qui rapportent peu apres allocation des charges de periode."
              colorClass="bg-emerald-500"
              valueFormatter={formatMoney}
              emptyText="Aucune marge produit disponible"
              action={directionChartActions.productMargin}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <PointOfSaleCoverageMap
              title="Carte geographique des points de vente"
              subtitle="Visualiser la couverture territoriale active sur les villes servies."
              rows={directionPointMap}
              action={directionChartActions.pointMap}
            />

            <ProductCityHeatmap
              title="Heatmap produit x ville"
              subtitle="Voir quels produits fonctionnent le mieux dans quelles villes."
              data={directionHeatmap}
              filterSummary={{
                periodLabel: formatPeriodRange(
                  directionFilters.start_date,
                  directionFilters.end_date
                ),
                warehouseLabel:
                  warehouses.find(
                    (warehouse) =>
                      String(warehouse.id) === String(directionFilters.warehouse_id)
                  )?.name || "Tous les depots",
                chainLabel: "Toutes les chaines",
                channelLabel: "Tous les canaux"
              }}
              formatMoney={formatMoney}
              formatNumber={formatNumber}
              formatPercent={formatPercent}
              emptyText="Aucune heatmap produit x ville disponible"
              action={directionChartActions.heatmap}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <HorizontalBarChart
              title="Couverture des stocks"
              rows={directionStockCoverage}
              labelKey="product_name"
              valueKey="coverage_days"
              helperText="Anticiper les ruptures avec le nombre estimatif de jours de couverture par produit."
              colorClass="bg-amber-500"
              valueFormatter={(value) =>
                value === null || value === undefined ? "-" : `${formatNumber(value)} j`
              }
              emptyText="Aucune couverture stock exploitable"
              action={directionChartActions.stockCoverage}
            />

            <ExpenseDonutChart
              title="Depenses par categorie"
              rows={directionExpensesByCategory}
              emptyText="Aucune depense sur la periode"
              action={directionChartActions.expensesByCategory}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <HorizontalBarChart
              title="Balance agee des creances"
              rows={directionReceivablesAging.buckets || []}
              labelKey="label"
              valueKey="amount"
              helperText="Identifier les paiements en retard par tranche d'anciennete."
              colorClass="bg-amber-500"
              valueFormatter={formatMoney}
              emptyText="Aucune creance ouverte"
              action={directionChartActions.receivablesAging}
            />

            <MultiSeriesLineChart
              title="Prevision IA contre ventes reelles"
              subtitle="Comparer les ventes facturees a la derniere baseline IA disponible."
              rows={directionForecastVsActual.rows || []}
              series={directionForecastSeries}
              valueFormatter={formatMoney}
              emptyText="Aucune comparaison prevision IA / ventes disponible"
              action={directionChartActions.forecastVsActual}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <TableCard
              title="Clients les plus en retard"
              rows={directionReceivablesAging.overdue_customers || []}
              emptyText="Aucun client en retard"
              columns={[
                { key: "business_name", label: "Client" },
                { key: "city", label: "Ville" },
                {
                  key: "open_invoices_count",
                  label: "Factures",
                  render: (row) => formatNumber(row.open_invoices_count)
                },
                {
                  key: "max_days_overdue",
                  label: "Retard max",
                  render: (row) => `${Number(row.max_days_overdue || 0)} j`
                },
                {
                  key: "total_balance_due",
                  label: "Solde",
                  render: (row) => formatMoney(row.total_balance_due)
                }
              ]}
            />

            <TableCard
              title="Performance par depot"
              rows={directionSalesByWarehouse}
              emptyText="Aucune performance depot disponible"
              columns={[
                { key: "warehouse_name", label: "Depot" },
                { key: "warehouse_city", label: "Ville" },
                {
                  key: "total_sales_amount",
                  label: "CA",
                  render: (row) => formatMoney(row.total_sales_amount)
                },
                {
                  key: "total_collected_amount",
                  label: "Encaisse",
                  render: (row) => formatMoney(row.total_collected_amount)
                },
                {
                  key: "gross_profit_amount",
                  label: "Profit brut",
                  render: (row) => formatMoney(row.gross_profit_amount)
                }
              ]}
            />
          </div>

          <SalesPulseChart
            rows={overviewData?.sales_overview || []}
            action={directionChartActions.salesPulse}
          />

          <CustomerBalanceBoardTable
            board={customerBalanceBoard}
            filters={customerBalanceFilters}
            customers={sortedDashboardCustomers}
            warehouses={warehouses}
            loading={customerBalanceLoading}
            onChange={handleCustomerBalanceFilterChange}
            onSubmit={handleApplyCustomerBalanceFilters}
          />

          <DualMetricRankingChart
            title="Clients qui facturent et paient le plus"
            subtitle="Comparaison directe entre ventes facturees et encaissements reels par client."
            rows={topPayingCustomers}
            labelKey="business_name"
            primaryKey="total_sales_amount"
            secondaryKey="total_collected_amount"
            primaryLabel="Facture"
            secondaryLabel="Paye"
            primaryColor="bg-brand-500"
            secondaryColor="bg-emerald-500"
            valueFormatter={formatMoney}
            emptyText="Aucun client compare"
            action={directionChartActions.topCustomers}
          />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <HeroMetricCard
              title="Chiffre d'affaires facture"
              value={formatMoney(stats.total_sales_amount)}
              subtitle={`${Number(stats.total_invoices || 0)} facture(s) emise(s)`}
              tone="brand"
            />
            <HeroMetricCard
              title="Profit brut"
              value={formatMoney(stats.gross_profit_amount)}
              subtitle={`Marge brute ${formatPercent(stats.gross_margin_percent)}`}
              tone="emerald"
            />
            <HeroMetricCard
              title="Paiements clients"
              value={formatMoney(stats.total_payments_received)}
              subtitle={`${formatMoney(stats.total_receivables)} encore en attente`}
              tone="amber"
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

      {activeTab === "recouvrement" ? (
        <div className="space-y-8">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-900">
                  Suivi recouvrement et paiements
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Filtrer par date les factures emises et les paiements recus,
                  puis consulter les totaux avant le detail.
                </div>
              </div>

              {collectionLoading ? (
                <div className="text-sm font-medium text-brand-600">
                  Chargement du suivi...
                </div>
              ) : null}
            </div>

            <form
              onSubmit={handleApplyCollectionFilters}
              className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4"
            >
              <FilterField label="Date debut">
                <input
                  type="date"
                  name="start_date"
                  value={collectionFilters.start_date}
                  onChange={handleCollectionFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </FilterField>

              <FilterField label="Date fin">
                <input
                  type="date"
                  name="end_date"
                  value={collectionFilters.end_date}
                  onChange={handleCollectionFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </FilterField>

              <FilterField label="Client">
                <select
                  name="customer_id"
                  value={collectionFilters.customer_id}
                  onChange={handleCollectionFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="">Tous les clients</option>
                  {sortedDashboardCustomers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.business_name}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Ville client">
                <select
                  name="customer_city"
                  value={collectionFilters.customer_city}
                  onChange={handleCollectionFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="">Toutes les villes</option>
                  {customerCityOptions.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Depot">
                <select
                  name="warehouse_id"
                  value={collectionFilters.warehouse_id}
                  onChange={handleCollectionFilterChange}
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

              <FilterField label="Afficher">
                <select
                  name="entry_type"
                  value={collectionFilters.entry_type}
                  onChange={handleCollectionFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="all">Factures et paiements</option>
                  <option value="invoices">Factures emises</option>
                  <option value="payments">Paiements recus</option>
                </select>
              </FilterField>

              <FilterField label="Top produits heatmap">
                <select
                  name="top_products"
                  value={collectionFilters.top_products}
                  onChange={handleCollectionFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  {[6, 8, 10, 12].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Top villes heatmap">
                <div className="flex gap-3">
                  <select
                    name="top_cities"
                    value={collectionFilters.top_cities}
                    onChange={handleCollectionFilterChange}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                  >
                    {[6, 8, 10, 12].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    disabled={collectionLoading}
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
              title="Total factures emises"
              value={formatMoney(collectionSummary.total_invoiced_amount)}
              subtitle={`${formatNumber(collectionSummary.total_invoices)} facture(s)`}
            />
            <StatCard
              title="Total paiements recus"
              value={formatMoney(collectionSummary.total_payments_amount)}
              subtitle={`${formatNumber(collectionSummary.total_payments)} paiement(s)`}
            />
            <StatCard
              title="Ecart facture / encaisse"
              value={formatMoney(collectionSummary.invoiced_payment_gap)}
              subtitle={`Taux d encaissement ${formatPercent(
                collectionSummary.collection_rate_percent
              )}`}
            />
            <StatCard
              title="Solde a recouvrer"
              value={formatMoney(collectionSummary.total_unpaid_amount)}
              subtitle={`${formatNumber(
                collectionSummary.total_unpaid_invoices
              )} facture(s), dont ${formatNumber(
                collectionSummary.overdue_invoices_count
              )} echue(s)`}
            />
          </div>

          <div
            className={`grid grid-cols-1 gap-6 ${
              collectionFilters.entry_type === "all" ? "xl:grid-cols-2" : ""
            }`}
          >
            {collectionFilters.entry_type !== "payments" ? (
              <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-slate-900">
                    Factures emises
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Toutes les factures emises sur la periode filtree.
                  </div>
                </div>
                <CardActionLink action={collectionChartActions.issuedInvoices} />
              </div>

              <TableCard
                title=""
                rows={collectionIssuedInvoices}
                emptyText="Aucune facture emise sur ce filtre"
                columns={[
                  { key: "invoice_number", label: "Facture" },
                  {
                    key: "invoice_date",
                    label: "Date",
                    render: (row) => formatDate(row.invoice_date)
                  },
                  {
                    key: "due_date",
                    label: "Echeance",
                    render: (row) => formatDate(row.due_date)
                  },
                  { key: "customer_name", label: "Client" },
                  { key: "customer_city", label: "Ville" },
                  {
                    key: "status",
                    label: "Statut",
                    render: (row) => (
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getInvoiceStatusClass(
                          row.status
                        )}`}
                      >
                        {row.status || "-"}
                      </span>
                    )
                  },
                  {
                    key: "total_amount",
                    label: "Montant",
                    render: (row) => formatMoney(row.total_amount)
                  },
                  {
                    key: "paid_amount",
                    label: "Paye",
                    render: (row) => formatMoney(row.paid_amount)
                  },
                  {
                    key: "balance_due",
                    label: "Solde",
                    render: (row) => formatMoney(row.balance_due)
                  }
                ]}
              />
            </div>
            ) : null}

            {collectionFilters.entry_type !== "invoices" ? (
              <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-slate-900">
                    Paiements recus
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Encaissements recus sur la periode et le perimetre choisis.
                  </div>
                </div>
                <CardActionLink action={collectionChartActions.payments} />
              </div>

              <TableCard
                title=""
                rows={collectionPayments}
                emptyText="Aucun paiement sur ce filtre"
                columns={[
                  {
                    key: "payment_date",
                    label: "Date",
                    render: (row) => formatDate(row.payment_date)
                  },
                  { key: "invoice_number", label: "Facture" },
                  { key: "customer_name", label: "Client" },
                  { key: "customer_city", label: "Ville" },
                  { key: "payment_method", label: "Mode" },
                  {
                    key: "amount",
                    label: "Montant",
                    render: (row) => formatMoney(row.amount)
                  },
                  {
                    key: "accounting_status",
                    label: "Compta",
                    render: (row) => (
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getAccountingStatusClass(
                          row.accounting_status
                        )}`}
                      >
                        {row.accounting_status || "n.d."}
                      </span>
                    )
                  }
                ]}
              />
            </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">
                  Factures non encore payees
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Creances encore ouvertes, independamment du type de resultat affiche.
                </div>
              </div>
              <CardActionLink action={collectionChartActions.unpaidInvoices} />
            </div>

            <TableCard
              title=""
              rows={collectionUnpaidInvoices}
              emptyText="Aucune facture impayee sur ce filtre"
              columns={[
                { key: "invoice_number", label: "Facture" },
                {
                  key: "invoice_date",
                  label: "Date",
                  render: (row) => formatDate(row.invoice_date)
                },
                {
                  key: "due_date",
                  label: "Echeance",
                  render: (row) => formatDate(row.due_date)
                },
                { key: "customer_name", label: "Client" },
                { key: "customer_city", label: "Ville" },
                {
                  key: "balance_due",
                  label: "Solde",
                  render: (row) => formatMoney(row.balance_due)
                },
                {
                  key: "days_overdue",
                  label: "Retard",
                  render: (row) =>
                    row.days_overdue === null
                      ? "-"
                      : `${Number(row.days_overdue || 0)} j`
                }
              ]}
            />
          </div>

          <ProductCityHeatmap
            title="Heatmap produit x ville"
            subtitle="Visualiser, dans la zone recouvrement, quels produits ont ete factures dans quelles villes sur le filtre actif."
            data={collectionHeatmap}
            summaryItems={collectionHeatmapSummaryItems}
            formatMoney={formatMoney}
            formatNumber={formatNumber}
            formatPercent={formatPercent}
            emptyText="Aucune heatmap produit x ville disponible sur ce filtre"
            action={collectionChartActions.heatmap}
          />
        </div>
      ) : null}

      {activeTab === "commercial" ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <StatCard
              title="Ventes facturees"
              value={formatMoney(commercialSummary.total_sales_amount)}
              subtitle={`${Number(commercialSummary.total_invoices || 0)} facture(s) sur la periode`}
            />
            <StatCard
              title="Profit brut"
              value={formatMoney(commercialSummary.gross_profit_amount)}
              subtitle={`Marge ${formatPercent(commercialSummary.gross_margin_percent)}`}
            />
            <StatCard
              title="Encaissements clients"
              value={formatMoney(commercialSummary.total_collected_amount)}
              subtitle={`${Number(commercialSummary.active_customers || 0)} client(s) actif(s)`}
            />
            <StatCard
              title="Creances clients"
              value={formatMoney(commercialSummary.total_receivables)}
              subtitle={`${Number(commercialSummary.active_cities || 0)} ville(s) active(s)`}
            />
            <StatCard
              title="Chaines actives"
              value={Number(commercialSummary.active_chains || 0)}
              subtitle={`${Number(commercialSummary.active_warehouses || 0)} depot(s) mobilise(s)`}
            />
            <StatCard
              title="Canaux actifs"
              value={Number(commercialSummary.active_channels || 0)}
              subtitle="Lecture terrain multi-canal"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
            {commercialLeaderSignals.map((signal) => (
              <SignalCard
                key={signal.title}
                title={signal.title}
                value={signal.value}
                subtitle={signal.subtitle}
                tone={signal.tone}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <HorizontalBarChart
              title="Ventes par ville"
              rows={commercialCities}
              labelKey="city"
              valueKey="total_sales_amount"
              helperText="Repere immediat des villes qui portent le chiffre d affaires."
              colorClass="bg-emerald-500"
              valueFormatter={formatMoney}
              emptyText="Aucune vente par ville"
              action={commercialChartActions.salesByCity}
            />

            <HorizontalBarChart
              title="Ventes par chaine"
              rows={commercialChains}
              labelKey="chain_name"
              valueKey="total_sales_amount"
              helperText="Lecture des reseaux qui concentrent le plus de chiffre d affaires."
              colorClass="bg-brand-500"
              valueFormatter={formatMoney}
              emptyText="Aucune chaine analysee"
              action={commercialChartActions.salesByChain}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <DualMetricRankingChart
              title="Chaines: facture vs encaisse"
              subtitle="Comparer tout de suite les reseaux qui facturent le plus a ceux qui encaissent le mieux."
              rows={commercialChains}
              labelKey="chain_name"
              primaryKey="total_sales_amount"
              secondaryKey="total_collected_amount"
              primaryLabel="Facture"
              secondaryLabel="Encaisse"
              primaryColor="bg-brand-500"
              secondaryColor="bg-emerald-500"
              valueFormatter={formatMoney}
              emptyText="Aucune chaine comparee"
              action={commercialChartActions.chainCollections}
            />

            <DualMetricRankingChart
              title="Canaux: profit vs creance"
              subtitle="Voir quels canaux sont rentables et lesquels immobilisent encore du cash."
              rows={commercialChannels}
              labelKey="sales_channel"
              primaryKey="gross_profit_amount"
              secondaryKey="total_receivables"
              primaryLabel="Profit brut"
              secondaryLabel="Creance"
              primaryColor="bg-emerald-500"
              secondaryColor="bg-amber-500"
              valueFormatter={formatMoney}
              emptyText="Aucun canal compare"
              action={commercialChartActions.channelProfit}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <HorizontalBarChart
              title="Ventes par canal"
              rows={commercialChannels}
              labelKey="sales_channel"
              valueKey="total_sales_amount"
              helperText="Comparer supermarches, pharmacies, distribution et vente directe."
              colorClass="bg-amber-500"
              valueFormatter={formatMoney}
              emptyText="Aucun canal analyse"
              action={commercialChartActions.salesByChannel}
            />

            <HorizontalBarChart
              title="Produits les plus vendus"
              rows={commercialProducts}
              labelKey="product_name"
              valueKey="total_quantity_sold"
              helperText="Les references qui sortent le plus en volume sur la periode."
              colorClass="bg-brand-500"
              valueFormatter={formatNumber}
              emptyText="Aucun produit facture"
              action={commercialChartActions.topProducts}
            />
          </div>

          <div className="space-y-4">
            <CommercialHeatmapFilterPanel
              values={heatmapFilters}
              onChange={handleHeatmapFilterChange}
              onSubmit={handleHeatmapSubmit}
              onReset={handleHeatmapReset}
              warehouseOptions={heatmapWarehouseOptions}
              chainOptions={heatmapChainOptions}
              channelOptions={heatmapChannelOptions}
              loading={commercialRefreshing}
            />

            <ProductCityHeatmap
              title="Heatmap produit x ville"
              subtitle="Repere tout de suite dans quelles villes chaque produit performe le mieux, puis bascule entre CA, quantite, profit brut et marge."
              data={productCityHeatmap}
              filterSummary={heatmapFilterSummary}
              formatMoney={formatMoney}
              formatNumber={formatNumber}
              formatPercent={formatPercent}
              emptyText="Aucune matrice produit x ville disponible"
              action={commercialChartActions.heatmap}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <MultiSeriesLineChart
              title="Evolution des ventes suivant les clients"
              subtitle="Tendance mensuelle des meilleurs clients, pour voir qui porte vraiment la croissance."
              rows={clientSalesTrend.salesRows}
              series={clientSalesTrend.series}
              valueFormatter={formatMoney}
              emptyText="Aucune evolution client disponible"
              action={commercialChartActions.customerSalesTrend}
            />

            <MultiSeriesLineChart
              title="Evolution des paiements suivant les clients"
              subtitle="Lecture des encaissements reels des meilleurs clients mois par mois."
              rows={clientSalesTrend.paymentRows}
              series={clientSalesTrend.series}
              valueFormatter={formatMoney}
              emptyText="Aucune evolution de paiement client disponible"
              action={commercialChartActions.customerPaymentsTrend}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <TableCard
              title="Clients / points de vente les plus performants"
              rows={commercialCustomers}
              emptyText="Aucun client facture"
              columns={[
                { key: "business_name", label: "Client" },
                { key: "chain_name", label: "Chaine" },
                { key: "sales_channel", label: "Canal" },
                {
                  key: "total_sales_amount",
                  label: "Ventes",
                  render: (row) => formatMoney(row.total_sales_amount)
                },
                {
                  key: "total_collected_amount",
                  label: "Encaisse",
                  render: (row) => formatMoney(row.total_collected_amount)
                },
                {
                  key: "collection_rate_percent",
                  label: "Tx enc.",
                  render: (row) => formatPercent(row.collection_rate_percent)
                }
              ]}
            />

            <TableCard
              title="Performance par depot"
              rows={commercialWarehouses}
              emptyText="Aucune vente par depot"
              columns={[
                { key: "warehouse_name", label: "Depot" },
                { key: "warehouse_city", label: "Ville" },
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
                  key: "collection_rate_percent",
                  label: "Tx enc.",
                  render: (row) => formatPercent(row.collection_rate_percent)
                }
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <TableCard
              title="Produits qui apportent le plus de profit"
              rows={mostProfitableProducts}
              emptyText="Aucun produit rentable calcule"
              columns={[
                { key: "product_name", label: "Produit" },
                { key: "category", label: "Categorie" },
                {
                  key: "total_sales_amount",
                  label: "CA",
                  render: (row) => formatMoney(row.total_sales_amount)
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

            <TableCard
              title="Clients a reactiver"
              rows={reactivationCandidates}
              emptyText="Aucun client prioritaire a reactiver"
              columns={[
                { key: "business_name", label: "Client" },
                { key: "chain_name", label: "Chaine" },
                { key: "sales_channel", label: "Canal" },
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

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <TableCard
              title="Produits en baisse"
              rows={decliningProducts}
              emptyText="Aucun produit en baisse sur la fenetre recente"
              columns={[
                { key: "product_name", label: "Produit" },
                { key: "sku", label: "SKU" },
                {
                  key: "previous_quantity",
                  label: "Qte prec.",
                  render: (row) => formatNumber(row.previous_quantity)
                },
                {
                  key: "current_quantity",
                  label: "Qte recente",
                  render: (row) => formatNumber(row.current_quantity)
                },
                {
                  key: "sales_change_percent",
                  label: "Var. CA",
                  render: (row) => formatPercent(row.sales_change_percent)
                }
              ]}
            />

            <DualMetricRankingChart
              title="Qui paie le plus"
              subtitle="Comparer rapidement les encaissements reels aux restes dus sur les meilleurs clients."
              rows={topPayingCustomers}
              labelKey="business_name"
              primaryKey="total_collected_amount"
              secondaryKey="total_receivables"
              primaryLabel="Encaisse"
              secondaryLabel="Reste du"
              primaryColor="bg-emerald-500"
              secondaryColor="bg-amber-500"
              valueFormatter={formatMoney}
              emptyText="Aucun encaissement client"
              action={commercialChartActions.topPayers}
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
              action={{ to: "/stock", label: "Voir stock" }}
            />

            <TimelineChart
              title="Evolution des variations"
              rows={variationData?.timeline || []}
              action={{ to: "/stock", label: "Voir stock" }}
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
