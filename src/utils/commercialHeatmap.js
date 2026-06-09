export const heatmapPeriodOptions = [
  { value: "30", label: "30 jours" },
  { value: "90", label: "90 jours" },
  { value: "180", label: "180 jours" },
  { value: "365", label: "12 mois" }
];

export const heatmapTopProductOptions = ["5", "8", "10", "12", "15"];
export const heatmapTopCityOptions = ["4", "6", "8", "10", "12"];

export function getDefaultCommercialHeatmapFilters({
  periodDays = "365",
  topProducts = "8",
  topCities = null
} = {}) {
  const resolvedTopProducts = String(topProducts || "8");

  return {
    days: String(periodDays || "365"),
    warehouse_id: "",
    chain_name: "",
    sales_channel: "",
    top_products: resolvedTopProducts,
    top_cities: String(topCities || resolvedTopProducts)
  };
}

export function buildCommercialHeatmapQueryParams(filters = {}) {
  const params = new URLSearchParams();

  if (filters.days) {
    params.set("heatmap_days", String(filters.days));
  }

  if (filters.warehouse_id) {
    params.set("heatmap_warehouse_id", String(filters.warehouse_id));
  }

  if (filters.chain_name) {
    params.set("heatmap_chain_name", String(filters.chain_name));
  }

  if (filters.sales_channel) {
    params.set("heatmap_sales_channel", String(filters.sales_channel));
  }

  if (filters.top_products) {
    params.set("heatmap_top_products", String(filters.top_products));
  }

  if (filters.top_cities) {
    params.set("heatmap_top_cities", String(filters.top_cities));
  }

  return params;
}

export function buildAlphabeticalOptions(
  rows = [],
  valueKey,
  labelKey = valueKey
) {
  const uniqueOptions = new Map();

  rows.forEach((row) => {
    const value = row?.[valueKey];
    const label = row?.[labelKey];

    if (!value || !label) {
      return;
    }

    uniqueOptions.set(String(value), {
      value: String(value),
      label: String(label)
    });
  });

  return [...uniqueOptions.values()].sort((left, right) =>
    left.label.localeCompare(right.label, "fr", { sensitivity: "base" })
  );
}
