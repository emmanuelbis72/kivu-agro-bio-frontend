import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const metricOptions = [
  {
    key: "sales",
    label: "CA",
    description: "Chiffre d affaires facture",
    getValue: (row) => Number(row?.total_sales_amount || 0)
  },
  {
    key: "quantity",
    label: "Quantite",
    description: "Quantite vendue",
    getValue: (row) => Number(row?.total_quantity_sold || 0)
  },
  {
    key: "profit",
    label: "Profit brut",
    description: "Profit brut",
    getValue: (row) => Number(row?.gross_profit_amount || 0)
  },
  {
    key: "margin",
    label: "Marge",
    description: "Marge brute",
    getValue: (row) => Number(row?.gross_margin_percent || 0)
  }
];

function getMetricBackground(value, bounds) {
  const numericValue = Number(value || 0);

  if (numericValue === 0) {
    return "rgba(241, 245, 249, 0.92)";
  }

  if (numericValue > 0) {
    const intensity =
      bounds.positiveMax > 0 ? Math.min(numericValue / bounds.positiveMax, 1) : 0;
    return `rgba(5, 150, 105, ${0.16 + intensity * 0.58})`;
  }

  const negativeIntensity =
    bounds.negativeMaxAbs > 0
      ? Math.min(Math.abs(numericValue) / bounds.negativeMaxAbs, 1)
      : 0;
  return `rgba(220, 38, 38, ${0.16 + negativeIntensity * 0.58})`;
}

function getCellTextClass(value, bounds) {
  const numericValue = Number(value || 0);

  if (numericValue === 0) {
    return "text-slate-600";
  }

  const reference =
    numericValue > 0
      ? bounds.positiveMax > 0
        ? numericValue / bounds.positiveMax
        : 0
      : bounds.negativeMaxAbs > 0
      ? Math.abs(numericValue) / bounds.negativeMaxAbs
      : 0;

  if (reference >= 0.56) {
    return "text-white";
  }

  if (reference >= 0.2) {
    return "text-slate-900";
  }

  return "text-slate-600";
}

function buildMetricFormatter(metricKey, formatMoney, formatNumber, formatPercent) {
  if (metricKey === "sales" || metricKey === "profit") {
    return (value) => formatMoney(value);
  }

  if (metricKey === "quantity") {
    return (value) => `${formatNumber(value)} pcs`;
  }

  return (value) => formatPercent(value);
}

function summarizeHeatmapRows(rows, keyField) {
  const summaryMap = new Map();

  rows.forEach((row) => {
    const key = row?.[keyField];

    if (!key) {
      return;
    }

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        total_sales_amount: 0,
        total_quantity_sold: 0,
        gross_profit_amount: 0
      });
    }

    const current = summaryMap.get(key);
    current.total_sales_amount += Number(row.total_sales_amount || 0);
    current.total_quantity_sold += Number(row.total_quantity_sold || 0);
    current.gross_profit_amount += Number(row.gross_profit_amount || 0);
  });

  summaryMap.forEach((summary) => {
    summary.gross_margin_percent =
      summary.total_sales_amount > 0
        ? (summary.gross_profit_amount / summary.total_sales_amount) * 100
        : 0;
  });

  return summaryMap;
}

export default function ProductCityHeatmap({
  title,
  subtitle,
  data,
  filterSummary = null,
  summaryItems = null,
  formatMoney,
  formatNumber,
  formatPercent,
  emptyText = "Aucune matrice disponible",
  action = null
}) {
  const [selectedMetricKey, setSelectedMetricKey] = useState("sales");

  const products = data?.products || [];
  const cities = data?.cities || [];
  const cells = data?.cells || [];
  const appliedFilters = data?.filters || {};
  const activeMetric =
    metricOptions.find((metric) => metric.key === selectedMetricKey) ||
    metricOptions[0];
  const formatMetricValue = useMemo(
    () =>
      buildMetricFormatter(
        activeMetric.key,
        formatMoney,
        formatNumber,
        formatPercent
      ),
    [activeMetric.key, formatMoney, formatNumber, formatPercent]
  );

  const cellMap = useMemo(
    () => new Map(cells.map((cell) => [`${cell.product_id}::${cell.city}`, cell])),
    [cells]
  );

  const productSummaryMap = useMemo(
    () => summarizeHeatmapRows(cells, "product_id"),
    [cells]
  );
  const citySummaryMap = useMemo(
    () => summarizeHeatmapRows(cells, "city"),
    [cells]
  );

  const metricBounds = useMemo(() => {
    return cells.reduce(
      (accumulator, cell) => {
        const metricValue = activeMetric.getValue(cell);

        if (metricValue > accumulator.positiveMax) {
          accumulator.positiveMax = metricValue;
        }

        if (metricValue < 0 && Math.abs(metricValue) > accumulator.negativeMaxAbs) {
          accumulator.negativeMaxAbs = Math.abs(metricValue);
        }

        return accumulator;
      },
      { positiveMax: 0, negativeMaxAbs: 0 }
    );
  }, [activeMetric, cells]);

  const rankedPairs = useMemo(() => {
    const matrixPairs = cells
      .filter((cell) => activeMetric.getValue(cell) !== 0)
      .sort(
        (left, right) =>
          activeMetric.getValue(right) - activeMetric.getValue(left)
      );

    return matrixPairs.slice(0, 6);
  }, [activeMetric, cells]);
  const activeCellCount = useMemo(
    () =>
      cells.filter(
        (cell) =>
          Number(cell?.total_sales_amount || 0) !== 0 ||
          Number(cell?.total_quantity_sold || 0) !== 0 ||
          Number(cell?.gross_profit_amount || 0) !== 0
      ).length,
    [cells]
  );
  const totalMatrixCells = cells.length;
  const defaultSummaryItems = [
    {
      label: "Periode",
      value:
        filterSummary?.periodLabel ||
        `${Number(appliedFilters.period_days || 0)} jours`
    },
    {
      label: "Depot",
      value: filterSummary?.warehouseLabel || "Tous les depots"
    },
    {
      label: "Chaine",
      value: filterSummary?.chainLabel || "Toutes les chaines"
    },
    {
      label: "Canal",
      value: filterSummary?.channelLabel || "Tous les canaux"
    },
    {
      label: "Produits retenus",
      value: `${products.length} / ${Number(appliedFilters.top_products || products.length || 0)}`
    },
    {
      label: "Villes retenues",
      value: `${cities.length} / ${Number(appliedFilters.top_cities || cities.length || 0)}`
    },
    {
      label: "Cellules actives",
      value: `${activeCellCount} / ${totalMatrixCells}`
    }
  ];
  const renderedSummaryItems =
    Array.isArray(summaryItems) && summaryItems.length > 0
      ? summaryItems
      : defaultSummaryItems;

  return (
    <div className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-soft">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="text-lg font-semibold text-slate-900">{title}</div>
          {subtitle ? (
            <div className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</div>
          ) : null}
        </div>

        <div className="flex flex-col items-stretch gap-3">
          {action?.to ? (
            <div className="flex justify-end">
              <Link
                to={action.to}
                className="inline-flex rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                {action.label || "Voir detail"}
              </Link>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
            <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Metrique
            </div>
            <div className="flex flex-wrap gap-2">
              {metricOptions.map((metric) => (
                <button
                  key={metric.key}
                  type="button"
                  onClick={() => setSelectedMetricKey(metric.key)}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    selectedMetricKey === metric.key
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {metric.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {products.length === 0 || cities.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] border-separate border-spacing-2">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 min-w-[250px] rounded-2xl bg-slate-900 px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-white">
                    Produit / Ville
                  </th>
                  {cities.map((city) => {
                    const citySummary = citySummaryMap.get(city.city) || {};

                    return (
                      <th
                        key={city.city}
                        className="min-w-[135px] rounded-2xl bg-slate-100 px-4 py-4 text-left align-bottom"
                      >
                        <div className="text-sm font-semibold text-slate-900">
                          {city.city}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatMetricValue(activeMetric.getValue(citySummary))}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {products.map((product) => {
                  const productSummary = productSummaryMap.get(product.product_id) || {};

                  return (
                    <tr key={product.product_id}>
                      <th className="sticky left-0 z-10 min-w-[250px] rounded-2xl bg-white px-4 py-4 text-left shadow-sm ring-1 ring-slate-100">
                        <div className="text-sm font-semibold text-slate-900">
                          {product.product_name}
                        </div>
                        {product.category ? (
                          <div className="mt-1 text-xs text-slate-500">
                            {product.category}
                          </div>
                        ) : null}
                        <div className="mt-2 text-xs font-medium text-slate-500">
                          {activeMetric.label}:{" "}
                          {formatMetricValue(activeMetric.getValue(productSummary))}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          CA {formatMoney(productSummary.total_sales_amount || 0)} |{" "}
                          {formatNumber(productSummary.total_quantity_sold || 0)} pcs
                        </div>
                      </th>

                      {cities.map((city) => {
                        const cell =
                          cellMap.get(`${product.product_id}::${city.city}`) || null;
                        const metricValue = activeMetric.getValue(cell);
                        const textClass = getCellTextClass(metricValue, metricBounds);

                        return (
                          <td key={`${product.product_id}-${city.city}`}>
                            <div
                              className={`min-h-[108px] rounded-2xl px-4 py-4 shadow-sm ring-1 ring-white/60 ${textClass}`}
                              style={{
                                backgroundColor: getMetricBackground(
                                  metricValue,
                                  metricBounds
                                )
                              }}
                              title={`${product.product_name} | ${city.city}
Lecture active: ${activeMetric.description}
Valeur: ${formatMetricValue(metricValue)}
CA: ${formatMoney(cell?.total_sales_amount || 0)}
Quantite: ${formatNumber(cell?.total_quantity_sold || 0)}
Profit brut: ${formatMoney(cell?.gross_profit_amount || 0)}
Marge: ${formatPercent(cell?.gross_margin_percent || 0)}`}
                            >
                              <div className="text-lg font-bold">
                                {formatMetricValue(metricValue)}
                              </div>
                              <div className="mt-2 text-xs font-medium opacity-90">
                                CA {formatMoney(cell?.total_sales_amount || 0)}
                              </div>
                              <div className="mt-2 text-xs opacity-90">
                                {formatNumber(cell?.total_quantity_sold || 0)} pcs
                              </div>
                              <div className="mt-1 text-xs opacity-80">
                                Profit {formatMoney(cell?.gross_profit_amount || 0)} |{" "}
                                {formatPercent(cell?.gross_margin_percent || 0)}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Intensite:</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">faible</span>
            <span
              className="rounded-full px-3 py-1 text-slate-900"
              style={{ backgroundColor: getMetricBackground(0.45, { positiveMax: 1, negativeMaxAbs: 0 }) }}
            >
              moyenne positive
            </span>
            <span
              className="rounded-full px-3 py-1 text-white"
              style={{ backgroundColor: getMetricBackground(0.95, { positiveMax: 1, negativeMaxAbs: 0 }) }}
            >
              forte positive
            </span>
            <span
              className="rounded-full px-3 py-1 text-white"
              style={{ backgroundColor: getMetricBackground(-0.95, { positiveMax: 0, negativeMaxAbs: 1 }) }}
            >
              forte negative
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1">
              Base couleur: {activeMetric.description.toLowerCase()}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
            <div className="text-sm font-semibold text-slate-900">
              Rappel des filtres actifs
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
              {renderedSummaryItems.map((item, index) => (
                <span
                  key={`${item.label}-${index}`}
                  className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200"
                >
                  {item.label}: {item.value}
                </span>
              ))}
            </div>
          </div>

          {rankedPairs.length > 0 ? (
            <div>
              <div className="mb-3 text-sm font-semibold text-slate-900">
                Meilleurs couples produit x ville
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {rankedPairs.map((pair, index) => (
                  <div
                    key={`${pair.product_id}-${pair.city}-${index}`}
                    className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4"
                  >
                    <div className="text-sm font-semibold text-slate-900">
                      {pair.product_name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{pair.city}</div>
                    <div className="mt-3 text-lg font-bold text-slate-900">
                      {formatMetricValue(activeMetric.getValue(pair))}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      CA {formatMoney(pair.total_sales_amount || 0)} |{" "}
                      {formatNumber(pair.total_quantity_sold || 0)} pcs
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Profit {formatMoney(pair.gross_profit_amount || 0)} |{" "}
                      {formatPercent(pair.gross_margin_percent || 0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
