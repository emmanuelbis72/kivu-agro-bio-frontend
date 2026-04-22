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
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0));
}

function formatDateInput(date) {
  return date.toISOString().split("T")[0];
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
    return "Paquet";
  }

  if (value === "bulk") {
    return "Vrac";
  }

  return value || "-";
}

function packageLabel(row) {
  if (row.stock_form !== "package") {
    return "Vrac";
  }

  if (row.package_size && row.package_unit) {
    return `Paquet - ${row.package_size} ${row.package_unit}`;
  }

  return "Paquet";
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

function HorizontalBarChart({
  title,
  rows,
  labelKey,
  valueKey,
  colorClass = "bg-brand-500",
  valueFormatter = formatNumber,
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

export default function DashboardPage() {
  const [overviewData, setOverviewData] = useState(null);
  const [variationData, setVariationData] = useState(null);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [filters, setFilters] = useState(getDefaultFilters);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchOverview() {
    const [overviewResponse, productsResponse, warehousesResponse] = await Promise.all([
      api.get("/dashboard/overview"),
      api.get("/products"),
      api.get("/warehouses")
    ]);

    setOverviewData(overviewResponse.data.data);
    setProducts(productsResponse.data.data || []);
    setWarehouses(warehousesResponse.data.data || []);
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

    setVariationData(response.data.data);
  }

  async function fetchDashboard(initialFilters = filters) {
    try {
      setLoading(true);
      setError("");

      await Promise.all([fetchOverview(), fetchStockVariationReport(initialFilters)]);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger le dashboard."
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

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-soft">
        Chargement du dashboard...
      </div>
    );
  }

  if (error && !overviewData && !variationData) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error}
      </div>
    );
  }

  const stats = overviewData?.global_stats || {};
  const variationOverview = variationData?.overview || {};
  const movementTypeRows = (variationData?.by_movement_type || []).map((row) => ({
    ...row,
    movement_label: movementTypeLabel(row.movement_type)
  }));

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Dashboard executif"
        subtitle="Vue globale de la performance commerciale et rapports de variations de stock"
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Ventes totales"
          value={formatMoney(stats.total_sales_amount)}
        />
        <StatCard
          title="Encaissements"
          value={formatMoney(stats.total_collected_amount)}
        />
        <StatCard
          title="Creances"
          value={formatMoney(stats.total_receivables)}
        />
        <StatCard
          title="Unites en stock"
          value={formatNumber(stats.total_units_in_stock)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TableCard
          title="Top produits"
          rows={overviewData?.top_products || []}
          columns={[
            { key: "product_name", label: "Produit" },
            { key: "sku", label: "SKU" },
            { key: "total_quantity_sold", label: "Qte vendue" },
            {
              key: "total_sales_value",
              label: "Valeur",
              render: (row) => formatMoney(row.total_sales_value)
            }
          ]}
        />

        <TableCard
          title="Top clients"
          rows={overviewData?.top_customers || []}
          columns={[
            { key: "business_name", label: "Client" },
            { key: "city", label: "Ville" },
            {
              key: "total_billed",
              label: "Facture",
              render: (row) => formatMoney(row.total_billed)
            },
            {
              key: "total_balance_due",
              label: "Solde du",
              render: (row) => formatMoney(row.total_balance_due)
            }
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TableCard
          title="Factures recentes"
          rows={overviewData?.recent_invoices || []}
          columns={[
            { key: "invoice_number", label: "Facture" },
            { key: "customer_name", label: "Client" },
            { key: "status", label: "Statut" },
            {
              key: "total_amount",
              label: "Montant",
              render: (row) => formatMoney(row.total_amount)
            }
          ]}
        />

        <TableCard
          title="Alertes stock"
          rows={overviewData?.stock_alerts || []}
          columns={[
            { key: "product_name", label: "Produit" },
            { key: "warehouse_name", label: "Depot" },
            { key: "quantity", label: "Stock" },
            { key: "alert_threshold", label: "Seuil" }
          ]}
          emptyText="Aucune alerte stock"
        />
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-900">
              Rapport des variations de stock
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Analyse des entrees, sorties, ajustements, transferts et transformations
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
              <option value="bulk">Vrac</option>
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
          value={formatNumber(variationOverview.total_movements)}
          subtitle={`${formatNumber(variationOverview.total_products)} produits sur ${formatNumber(
            variationOverview.total_warehouses
          )} depots`}
        />
        <StatCard
          title="Quantites entrantes"
          value={formatNumber(variationOverview.total_positive_quantity)}
        />
        <StatCard
          title="Quantites sortantes"
          value={formatNumber(variationOverview.total_negative_quantity)}
        />
        <StatCard
          title="Ajustements"
          value={formatNumber(variationOverview.total_adjusted_quantity)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <HorizontalBarChart
          title="Variations par type de mouvement"
          rows={movementTypeRows}
          labelKey="movement_label"
          valueKey="total_quantity"
          colorClass="bg-brand-500"
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
              {variationOverview.last_movement_at
                ? formatDateTime(variationOverview.last_movement_at)
                : "Aucun mouvement sur la periode"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
