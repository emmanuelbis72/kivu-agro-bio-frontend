import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import StatCard from "../components/ui/StatCard";
import TableCard from "../components/ui/TableCard";

const packagingTypeOptions = [
  { value: "oil_bottle", label: "Bouteilles huiles" },
  { value: "butter_bottle", label: "Bouteilles beurres" },
  { value: "kraft_paper", label: "Papiers krafts" },
  { value: "essential_oil_bottle", label: "Bouteilles H. Essentielle" }
];

const consumerTypeOptions = [
  { value: "commercial", label: "Commercial" },
  { value: "production", label: "Production" },
  { value: "logistics", label: "Logistique" },
  { value: "administration", label: "Administration" },
  { value: "client", label: "Client" },
  { value: "other", label: "Autre" }
];

const purposeOptions = [
  { value: "conditioning", label: "Conditionnement" },
  { value: "delivery", label: "Livraison" },
  { value: "sampling", label: "Echantillon" },
  { value: "internal_use", label: "Usage interne" },
  { value: "loss", label: "Perte / casse" },
  { value: "other", label: "Autre" }
];

const today = new Date().toISOString().split("T")[0];
const monthStart = `${today.slice(0, 8)}01`;

const initialFilters = {
  start_date: monthStart,
  end_date: today,
  warehouse_id: "",
  packaging_type: "",
  product_id: "",
  consumer_name: "",
  consumer_type: ""
};

const initialConsumptionForm = {
  warehouse_id: "",
  product_id: "",
  packaging_type: "",
  quantity: "",
  consumption_date: today,
  consumer_name: "",
  consumer_type: "commercial",
  purpose: "conditioning",
  notes: ""
};

const initialReplenishmentForm = {
  warehouse_id: "",
  product_id: "",
  packaging_type: "",
  quantity: "",
  replenishment_date: today,
  source_name: "",
  notes: ""
};

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));
}

function formatNumber(value) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR").format(new Date(value));
}

function formatMonth(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

function getPackagingTypeLabel(value) {
  const match = packagingTypeOptions.find((option) => option.value === value);
  return match ? match.label : value === "unclassified" ? "A classer" : value || "-";
}

function getConsumerTypeLabel(value) {
  const match = consumerTypeOptions.find((option) => option.value === value);
  return match ? match.label : value || "-";
}

function getPurposeLabel(value) {
  const match = purposeOptions.find((option) => option.value === value);
  return match ? match.label : value || "-";
}

function FilterField({ label, children }) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-600">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

export default function PackagingPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [consumptionForm, setConsumptionForm] = useState(initialConsumptionForm);
  const [replenishmentForm, setReplenishmentForm] = useState(
    initialReplenishmentForm
  );
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [finishedProductConfigs, setFinishedProductConfigs] = useState([]);
  const [overview, setOverview] = useState(null);
  const [consumptions, setConsumptions] = useState([]);
  const [replenishments, setReplenishments] = useState([]);
  const [usageByInvoice, setUsageByInvoice] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [replenishmentLoading, setReplenishmentLoading] = useState(false);
  const [typeSaveByProductId, setTypeSaveByProductId] = useState({});
  const [configSaveByProductId, setConfigSaveByProductId] = useState({});
  const [typeDrafts, setTypeDrafts] = useState({});
  const [configDrafts, setConfigDrafts] = useState({});
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function fetchPageData(activeFilters = filters, preserveLoading = false) {
    try {
      if (!preserveLoading) {
        setLoading(true);
      }

      setError("");

      const [
        overviewResult,
        productsResult,
        consumptionsResult,
        replenishmentsResult,
        usageByInvoiceResult,
        configsResult,
        warehousesResult
      ] =
        await Promise.allSettled([
          api.get("/packaging/overview", { params: activeFilters }),
          api.get("/packaging/products"),
          api.get("/packaging/consumptions", {
            params: {
              ...activeFilters,
              limit: 100
            }
          }),
          api.get("/packaging/replenishments", {
            params: {
              ...activeFilters,
              limit: 100
            }
          }),
          api.get("/packaging/usage-by-invoice", {
            params: {
              ...activeFilters,
              limit: 100
            }
          }),
          api.get("/packaging/finished-products/configs"),
          api.get("/warehouses")
        ]);

      if (overviewResult.status === "fulfilled") {
        setOverview(overviewResult.value.data?.data || null);
      } else {
        throw overviewResult.reason;
      }

      if (productsResult.status === "fulfilled") {
        const rows = productsResult.value.data?.data || [];
        setProducts(rows);
        setTypeDrafts((current) => {
          const next = { ...current };

          for (const row of rows) {
            if (next[row.id] === undefined) {
              next[row.id] = row.packaging_type || "";
            }
          }

          return next;
        });
      } else {
        throw productsResult.reason;
      }

      if (consumptionsResult.status === "fulfilled") {
        setConsumptions(consumptionsResult.value.data?.data || []);
      } else {
        throw consumptionsResult.reason;
      }

      if (replenishmentsResult.status === "fulfilled") {
        setReplenishments(replenishmentsResult.value.data?.data || []);
      } else {
        throw replenishmentsResult.reason;
      }

      if (usageByInvoiceResult.status === "fulfilled") {
        setUsageByInvoice(usageByInvoiceResult.value.data?.data || []);
      } else {
        throw usageByInvoiceResult.reason;
      }

      if (configsResult.status === "fulfilled") {
        const rows = configsResult.value.data?.data || [];
        setFinishedProductConfigs(rows);
        setConfigDrafts((current) => {
          const next = { ...current };

          for (const row of rows) {
            if (!next[row.finished_product_id]) {
              next[row.finished_product_id] = {
                packaging_type: row.required_packaging_type || "",
                packaging_product_id: row.packaging_product_id
                  ? String(row.packaging_product_id)
                  : "",
                packaging_quantity_per_unit:
                  row.packaging_quantity_per_unit ?? 1
              };
            }
          }

          return next;
        });
      } else {
        throw configsResult.reason;
      }

      if (warehousesResult.status === "fulfilled") {
        const rows = warehousesResult.value.data?.data || [];
        setWarehouses(rows);

        setConsumptionForm((current) => ({
          ...current,
          warehouse_id:
            current.warehouse_id ||
            (rows.length > 0 ? String(rows[0].id) : "")
        }));
        setReplenishmentForm((current) => ({
          ...current,
          warehouse_id:
            current.warehouse_id ||
            (rows.length > 0 ? String(rows[0].id) : "")
        }));
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger la gestion des emballages."
      );
    } finally {
      if (!preserveLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    fetchPageData(initialFilters);
  }, []);

  useEffect(() => {
    if (!products.length) {
      return;
    }

    setConsumptionForm((current) => {
      if (current.product_id) {
        return current;
      }

      const firstProduct = products[0];
      return {
        ...current,
        product_id: String(firstProduct.id),
        packaging_type: firstProduct.packaging_type || ""
      };
    });
  }, [products]);

  useEffect(() => {
    if (!products.length) {
      return;
    }

    setReplenishmentForm((current) => {
      if (current.product_id) {
        return current;
      }

      const firstProduct = products[0];
      return {
        ...current,
        product_id: String(firstProduct.id),
        packaging_type: firstProduct.packaging_type || ""
      };
    });
  }, [products]);

  const selectedProduct = useMemo(
    () =>
      products.find(
        (product) => String(product.id) === String(consumptionForm.product_id)
      ) || null,
    [products, consumptionForm.product_id]
  );

  const selectedReplenishmentProduct = useMemo(
    () =>
      products.find(
        (product) => String(product.id) === String(replenishmentForm.product_id)
      ) || null,
    [products, replenishmentForm.product_id]
  );

  function handleDraftFilterChange(event) {
    const { name, value } = event.target;
    setDraftFilters((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleApplyFilters(event) {
    event.preventDefault();
    setFilters(draftFilters);
    await fetchPageData(draftFilters, true);
  }

  function handleConsumptionChange(event) {
    const { name, value } = event.target;

    if (name === "product_id") {
      const product = products.find((row) => String(row.id) === value);

      setConsumptionForm((current) => ({
        ...current,
        product_id: value,
        packaging_type: product?.packaging_type || ""
      }));
      return;
    }

    setConsumptionForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function handleReplenishmentChange(event) {
    const { name, value } = event.target;

    if (name === "product_id") {
      const product = products.find((row) => String(row.id) === value);

      setReplenishmentForm((current) => ({
        ...current,
        product_id: value,
        packaging_type: product?.packaging_type || ""
      }));
      return;
    }

    setReplenishmentForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleSubmitConsumption(event) {
    event.preventDefault();

    try {
      setSubmitLoading(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        warehouse_id: Number(consumptionForm.warehouse_id),
        product_id: Number(consumptionForm.product_id),
        packaging_type: consumptionForm.packaging_type || null,
        quantity: Number(consumptionForm.quantity),
        consumption_date: consumptionForm.consumption_date,
        consumer_name: consumptionForm.consumer_name.trim(),
        consumer_type: consumptionForm.consumer_type,
        purpose: consumptionForm.purpose,
        notes: consumptionForm.notes.trim()
      };

      if (!payload.warehouse_id) {
        setError("Veuillez selectionner un depot.");
        return;
      }

      if (!payload.product_id) {
        setError("Veuillez selectionner un emballage.");
        return;
      }

      if (!payload.quantity || payload.quantity <= 0) {
        setError("La quantite consommee doit etre > 0.");
        return;
      }

      if (!payload.consumer_name) {
        setError("Le champ 'Consomme par' est obligatoire.");
        return;
      }

      await api.post("/packaging/consumptions", payload);

      setSuccessMessage("Consommation d'emballage enregistree avec succes.");
      setConsumptionForm((current) => ({
        ...current,
        quantity: "",
        consumer_name: "",
        notes: ""
      }));

      await fetchPageData(filters, true);
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      const apiErrors = err?.response?.data?.errors;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(apiErrors.join(" "));
      } else {
        setError(
          apiMessage ||
            "Impossible d'enregistrer la consommation d'emballage."
        );
      }
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleSubmitReplenishment(event) {
    event.preventDefault();

    try {
      setReplenishmentLoading(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        warehouse_id: Number(replenishmentForm.warehouse_id),
        product_id: Number(replenishmentForm.product_id),
        packaging_type: replenishmentForm.packaging_type || null,
        quantity: Number(replenishmentForm.quantity),
        replenishment_date: replenishmentForm.replenishment_date,
        source_name: replenishmentForm.source_name.trim(),
        notes: replenishmentForm.notes.trim()
      };

      if (!payload.warehouse_id) {
        setError("Veuillez selectionner un depot d'approvisionnement.");
        return;
      }

      if (!payload.product_id) {
        setError("Veuillez selectionner un emballage a approvisionner.");
        return;
      }

      if (!payload.quantity || payload.quantity <= 0) {
        setError("La quantite approvisionnee doit etre > 0.");
        return;
      }

      await api.post("/packaging/replenishments", payload);

      setSuccessMessage("Approvisionnement d'emballage enregistre avec succes.");
      setReplenishmentForm((current) => ({
        ...current,
        quantity: "",
        source_name: "",
        notes: ""
      }));

      await fetchPageData(filters, true);
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      const apiErrors = err?.response?.data?.errors;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(apiErrors.join(" "));
      } else {
        setError(
          apiMessage ||
            "Impossible d'enregistrer l'approvisionnement d'emballage."
        );
      }
    } finally {
      setReplenishmentLoading(false);
    }
  }

  function handleTypeDraftChange(productId, value) {
    setTypeDrafts((current) => ({
      ...current,
      [productId]: value
    }));
  }

  async function handleSavePackagingType(productId) {
    try {
      setTypeSaveByProductId((current) => ({
        ...current,
        [productId]: true
      }));
      setError("");
      setSuccessMessage("");

      await api.put(`/packaging/products/${productId}/type`, {
        packaging_type: typeDrafts[productId] || null
      });

      setSuccessMessage("Type d'emballage mis a jour avec succes.");
      await fetchPageData(filters, true);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de mettre a jour le type d'emballage."
      );
    } finally {
      setTypeSaveByProductId((current) => ({
        ...current,
        [productId]: false
      }));
    }
  }

  function handleConfigDraftChange(finishedProductId, field, value) {
    setConfigDrafts((current) => ({
      ...current,
      [finishedProductId]: {
        packaging_type: current[finishedProductId]?.packaging_type ?? "",
        packaging_product_id:
          current[finishedProductId]?.packaging_product_id ?? "",
        packaging_quantity_per_unit:
          current[finishedProductId]?.packaging_quantity_per_unit ?? 1,
        ...current[finishedProductId],
        [field]: value
      }
    }));
  }

  async function handleSaveFinishedProductConfig(finishedProductId) {
    try {
      setConfigSaveByProductId((current) => ({
        ...current,
        [finishedProductId]: true
      }));
      setError("");
      setSuccessMessage("");

      const draft = configDrafts[finishedProductId] || {
        packaging_type: "",
        packaging_product_id: "",
        packaging_quantity_per_unit: 1
      };

      await api.put(`/packaging/finished-products/${finishedProductId}/config`, {
        packaging_type: draft.packaging_type || null,
        packaging_product_id: draft.packaging_product_id || null,
        packaging_quantity_per_unit:
          draft.packaging_product_id === ""
            ? null
            : Number(draft.packaging_quantity_per_unit || 1)
      });

      setSuccessMessage("Liaison produit fini -> emballage mise a jour.");
      await fetchPageData(filters, true);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de sauver la configuration d'emballage."
      );
    } finally {
      setConfigSaveByProductId((current) => ({
        ...current,
        [finishedProductId]: false
      }));
    }
  }

  const stockByTypeRows = overview?.stock_by_type || [];
  const consumptionByTypeRows = overview?.consumption_by_type || [];
  const topConsumersRows = overview?.top_consumers || [];
  const monthlyConsumptionRows = overview?.monthly_consumption || [];

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionTitle
          title="Emballages"
          subtitle="Chargement de la gestion des emballages..."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Emballages"
        subtitle="Suivi des papiers krafts, bouteilles huiles, bouteilles beurres et bouteilles H. Essentielle par depot, periode, facture et consommateur."
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <form
        onSubmit={handleApplyFilters}
        className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft"
      >
        <div className="mb-4 text-lg font-semibold text-slate-900">
          Filtres d'analyse
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <FilterField label="Du">
            <input
              type="date"
              name="start_date"
              value={draftFilters.start_date}
              onChange={handleDraftFilterChange}
              className="rounded-2xl border border-slate-200 px-4 py-3"
            />
          </FilterField>

          <FilterField label="Au">
            <input
              type="date"
              name="end_date"
              value={draftFilters.end_date}
              onChange={handleDraftFilterChange}
              className="rounded-2xl border border-slate-200 px-4 py-3"
            />
          </FilterField>

          <FilterField label="Depot">
            <select
              name="warehouse_id"
              value={draftFilters.warehouse_id}
              onChange={handleDraftFilterChange}
              className="rounded-2xl border border-slate-200 px-4 py-3"
            >
              <option value="">Tous les depots</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Type d'emballage">
            <select
              name="packaging_type"
              value={draftFilters.packaging_type}
              onChange={handleDraftFilterChange}
              className="rounded-2xl border border-slate-200 px-4 py-3"
            >
              <option value="">Tous les types</option>
              {packagingTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Emballage">
            <select
              name="product_id"
              value={draftFilters.product_id}
              onChange={handleDraftFilterChange}
              className="rounded-2xl border border-slate-200 px-4 py-3"
            >
              <option value="">Tous les emballages</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Consomme par">
            <input
              type="text"
              name="consumer_name"
              value={draftFilters.consumer_name}
              onChange={handleDraftFilterChange}
              placeholder="Ex: Production, Jean, Carrefour..."
              className="rounded-2xl border border-slate-200 px-4 py-3"
            />
          </FilterField>

          <FilterField label="Profil consommateur">
            <select
              name="consumer_type"
              value={draftFilters.consumer_type}
              onChange={handleDraftFilterChange}
              className="rounded-2xl border border-slate-200 px-4 py-3"
            >
              <option value="">Tous les profils</option>
              {consumerTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Appliquer les filtres
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftFilters(initialFilters);
              setFilters(initialFilters);
              fetchPageData(initialFilters, true);
            }}
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Reinitialiser
          </button>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Stock actuel emballages"
          value={formatNumber(overview?.summary?.current_stock || 0)}
          subtitle={`${overview?.summary?.active_warehouses_count || 0} depot(s) couverts`}
        />
        <StatCard
          title="Approvisionne periode"
          value={formatNumber(overview?.summary?.total_replenished || 0)}
          subtitle={`${overview?.summary?.replenishment_count || 0} mouvement(s) d'entree`}
        />
        <StatCard
          title="Consommation periode"
          value={formatNumber(overview?.summary?.total_consumed || 0)}
          subtitle={`${overview?.summary?.consumption_count || 0} mouvement(s) de consommation`}
        />
        <StatCard
          title="Consommateurs suivis"
          value={formatNumber(overview?.summary?.consumers_count || 0)}
          subtitle="Qui a consomme les emballages sur la periode"
        />
        <StatCard
          title="Produits emballages"
          value={formatNumber(overview?.summary?.packaging_products_count || 0)}
          subtitle="Produits emballages actuellement references"
        />
      </div>

      <form
        onSubmit={handleSubmitConsumption}
        className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft"
      >
        <div className="mb-4 text-lg font-semibold text-slate-900">
          Enregistrer une consommation d'emballage
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FilterField label="Depot">
            <select
              name="warehouse_id"
              value={consumptionForm.warehouse_id}
              onChange={handleConsumptionChange}
              className="rounded-2xl border border-slate-200 px-4 py-3"
            >
              <option value="">Selectionner</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Emballage">
            <select
              name="product_id"
              value={consumptionForm.product_id}
              onChange={handleConsumptionChange}
              className="rounded-2xl border border-slate-200 px-4 py-3"
            >
              <option value="">Selectionner</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Type">
            <select
              name="packaging_type"
              value={consumptionForm.packaging_type}
              onChange={handleConsumptionChange}
              className="rounded-2xl border border-slate-200 px-4 py-3"
            >
              <option value="">A classer</option>
              {packagingTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Quantite">
            <input
              type="number"
              min="0"
              step="0.01"
              name="quantity"
              value={consumptionForm.quantity}
              onChange={handleConsumptionChange}
              className="rounded-2xl border border-slate-200 px-4 py-3"
            />
          </FilterField>

          <FilterField label="Date">
            <input
              type="date"
              name="consumption_date"
              value={consumptionForm.consumption_date}
              onChange={handleConsumptionChange}
              className="rounded-2xl border border-slate-200 px-4 py-3"
            />
          </FilterField>

          <FilterField label="Consomme par">
            <input
              type="text"
              name="consumer_name"
              value={consumptionForm.consumer_name}
              onChange={handleConsumptionChange}
              placeholder="Ex: Production, Jean, Depot Goma..."
              className="rounded-2xl border border-slate-200 px-4 py-3"
            />
          </FilterField>

          <FilterField label="Profil consommateur">
            <select
              name="consumer_type"
              value={consumptionForm.consumer_type}
              onChange={handleConsumptionChange}
              className="rounded-2xl border border-slate-200 px-4 py-3"
            >
              {consumerTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Motif">
            <select
              name="purpose"
              value={consumptionForm.purpose}
              onChange={handleConsumptionChange}
              className="rounded-2xl border border-slate-200 px-4 py-3"
            >
              {purposeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr,320px]">
          <FilterField label="Notes">
            <textarea
              rows={4}
              name="notes"
              value={consumptionForm.notes}
              onChange={handleConsumptionChange}
              placeholder="Ex: emballages remis pour preparation livraison Carrefour Kinshasa"
              className="rounded-2xl border border-slate-200 px-4 py-3"
            />
          </FilterField>

          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">Lecture rapide</div>
            <div className="mt-3">
              Emballage choisi :{" "}
              <span className="font-medium text-slate-800">
                {selectedProduct?.name || "-"}
              </span>
            </div>
            <div className="mt-2">
              Stock global :{" "}
              <span className="font-medium text-slate-800">
                {formatNumber(selectedProduct?.total_stock || 0)}
              </span>
            </div>
            <div className="mt-2">
              Type actuel :{" "}
              <span className="font-medium text-slate-800">
                {getPackagingTypeLabel(
                  consumptionForm.packaging_type || selectedProduct?.packaging_type
                )}
              </span>
            </div>
            <div className="mt-2">
              Cout unitaire :{" "}
              <span className="font-medium text-slate-800">
                {formatMoney(selectedProduct?.cost_price || 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <button
            type="submit"
            disabled={submitLoading}
            className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitLoading
              ? "Enregistrement..."
              : "Enregistrer la consommation"}
          </button>
        </div>
      </form>

      <form
        onSubmit={handleSubmitReplenishment}
        className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft"
      >
        <div className="mb-4 text-lg font-semibold text-slate-900">
          Enregistrer un approvisionnement d'emballage
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FilterField label="Depot">
            <select
              name="warehouse_id"
              value={replenishmentForm.warehouse_id}
              onChange={handleReplenishmentChange}
              className="rounded-2xl border border-slate-200 px-4 py-3"
            >
              <option value="">Selectionner</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Emballage">
            <select
              name="product_id"
              value={replenishmentForm.product_id}
              onChange={handleReplenishmentChange}
              className="rounded-2xl border border-slate-200 px-4 py-3"
            >
              <option value="">Selectionner</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Type">
            <select
              name="packaging_type"
              value={replenishmentForm.packaging_type}
              onChange={handleReplenishmentChange}
              className="rounded-2xl border border-slate-200 px-4 py-3"
            >
              <option value="">A classer</option>
              {packagingTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Quantite ajoutee">
            <input
              type="number"
              min="0"
              step="0.01"
              name="quantity"
              value={replenishmentForm.quantity}
              onChange={handleReplenishmentChange}
              className="rounded-2xl border border-slate-200 px-4 py-3"
            />
          </FilterField>

          <FilterField label="Date">
            <input
              type="date"
              name="replenishment_date"
              value={replenishmentForm.replenishment_date}
              onChange={handleReplenishmentChange}
              className="rounded-2xl border border-slate-200 px-4 py-3"
            />
          </FilterField>

          <FilterField label="Source / fournisseur">
            <input
              type="text"
              name="source_name"
              value={replenishmentForm.source_name}
              onChange={handleReplenishmentChange}
              placeholder="Ex: fournisseur local, achat cash..."
              className="rounded-2xl border border-slate-200 px-4 py-3"
            />
          </FilterField>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr,320px]">
          <FilterField label="Notes">
            <textarea
              rows={4}
              name="notes"
              value={replenishmentForm.notes}
              onChange={handleReplenishmentChange}
              placeholder="Ex: approvisionnement avant campagne commerciale"
              className="rounded-2xl border border-slate-200 px-4 py-3"
            />
          </FilterField>

          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">Lecture rapide</div>
            <div className="mt-3">
              Emballage choisi :{" "}
              <span className="font-medium text-slate-800">
                {selectedReplenishmentProduct?.name || "-"}
              </span>
            </div>
            <div className="mt-2">
              Stock global actuel :{" "}
              <span className="font-medium text-slate-800">
                {formatNumber(selectedReplenishmentProduct?.total_stock || 0)}
              </span>
            </div>
            <div className="mt-2">
              Type actuel :{" "}
              <span className="font-medium text-slate-800">
                {getPackagingTypeLabel(
                  replenishmentForm.packaging_type ||
                    selectedReplenishmentProduct?.packaging_type
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <button
            type="submit"
            disabled={replenishmentLoading}
            className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {replenishmentLoading
              ? "Enregistrement..."
              : "Enregistrer l'approvisionnement"}
          </button>
        </div>
      </form>

      <div className="grid gap-6 xl:grid-cols-2">
        <TableCard
          title="Stock par type d'emballage"
          rows={stockByTypeRows}
          emptyText="Aucun stock d'emballage visible."
          columns={[
            {
              key: "packaging_type",
              label: "Type",
              render: (row) => getPackagingTypeLabel(row.packaging_type)
            },
            {
              key: "current_stock",
              label: "Stock actuel",
              render: (row) => formatNumber(row.current_stock)
            }
          ]}
        />

        <TableCard
          title="Consommation par type"
          rows={consumptionByTypeRows}
          emptyText="Aucune consommation sur la periode choisie."
          columns={[
            {
              key: "packaging_type",
              label: "Type",
              render: (row) => getPackagingTypeLabel(row.packaging_type)
            },
            {
              key: "total_consumed",
              label: "Quantite consommee",
              render: (row) => formatNumber(row.total_consumed)
            },
            {
              key: "consumption_count",
              label: "Mouvements",
              render: (row) => formatNumber(row.consumption_count)
            }
          ]}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <TableCard
          title="Top consommateurs"
          rows={topConsumersRows}
          emptyText="Aucun consommateur sur la periode choisie."
          columns={[
            { key: "consumer_name", label: "Consommateur" },
            {
              key: "consumer_type",
              label: "Profil",
              render: (row) => getConsumerTypeLabel(row.consumer_type)
            },
            {
              key: "total_consumed",
              label: "Quantite",
              render: (row) => formatNumber(row.total_consumed)
            },
            {
              key: "consumption_count",
              label: "Occurrences",
              render: (row) => formatNumber(row.consumption_count)
            }
          ]}
        />

        <TableCard
          title="Consommation par mois"
          rows={monthlyConsumptionRows}
          emptyText="Aucune projection historique disponible."
          columns={[
            {
              key: "period_start",
              label: "Periode",
              render: (row) => formatMonth(row.period_start)
            },
            {
              key: "total_consumed",
              label: "Quantite",
              render: (row) => formatNumber(row.total_consumed)
            },
            {
              key: "consumption_count",
              label: "Mouvements",
              render: (row) => formatNumber(row.consumption_count)
            }
          ]}
        />
      </div>

      <TableCard
        title={`Historique des approvisionnements (${replenishments.length})`}
        rows={replenishments}
        emptyText="Aucun approvisionnement d'emballage sur la periode choisie."
        columns={[
          {
            key: "replenishment_date",
            label: "Date",
            render: (row) => formatDate(row.replenishment_date)
          },
          { key: "product_name", label: "Emballage" },
          {
            key: "packaging_type",
            label: "Type",
            render: (row) => getPackagingTypeLabel(row.packaging_type)
          },
          {
            key: "quantity",
            label: "Quantite",
            render: (row) => formatNumber(row.quantity)
          },
          {
            key: "warehouse_name",
            label: "Depot",
            render: (row) => row.warehouse_name || "-"
          },
          {
            key: "source_name",
            label: "Source",
            render: (row) => row.source_name || "-"
          },
          {
            key: "notes",
            label: "Notes",
            render: (row) => row.notes || "-"
          }
        ]}
      />

      <TableCard
        title={`Usage des emballages par facture (${usageByInvoice.length})`}
        rows={usageByInvoice}
        emptyText="Aucune consommation d'emballage liee a une facture sur la periode choisie."
        columns={[
          {
            key: "invoice_date",
            label: "Date facture",
            render: (row) => formatDate(row.invoice_date)
          },
          { key: "invoice_number", label: "Facture" },
          { key: "customer_name", label: "Client" },
          { key: "warehouse_name", label: "Depot" },
          {
            key: "packaging_type",
            label: "Type d'emballage",
            render: (row) => getPackagingTypeLabel(row.packaging_type)
          },
          {
            key: "total_quantity",
            label: "Quantite utilisee",
            render: (row) => formatNumber(row.total_quantity)
          },
          {
            key: "consumption_lines_count",
            label: "Lignes emballages",
            render: (row) => formatNumber(row.consumption_lines_count)
          }
        ]}
      />

      <TableCard
        title={`Liaison produits finis -> emballages (${finishedProductConfigs.length})`}
        rows={finishedProductConfigs}
        emptyText="Aucun produit fini a configurer."
        columns={[
          { key: "finished_product_name", label: "Produit fini" },
          { key: "finished_product_sku", label: "SKU" },
          {
            key: "required_packaging_type",
            label: "Type d'emballage",
            render: (row) => (
              <select
                value={configDrafts[row.finished_product_id]?.packaging_type ?? ""}
                onChange={(event) =>
                  handleConfigDraftChange(
                    row.finished_product_id,
                    "packaging_type",
                    event.target.value
                  )
                }
                className="min-w-[220px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Aucun type impose</option>
                {packagingTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )
          },
          {
            key: "packaging_product_id",
            label: "Emballage lie",
            render: (row) => (
              <div className="flex min-w-[260px] items-center gap-2">
                <select
                  value={
                    configDrafts[row.finished_product_id]?.packaging_product_id ?? ""
                  }
                  onChange={(event) =>
                    handleConfigDraftChange(
                      row.finished_product_id,
                      "packaging_product_id",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Aucun emballage automatique</option>
                  {products
                    .filter((product) => {
                      const selectedType =
                        configDrafts[row.finished_product_id]?.packaging_type || "";

                      if (!selectedType) {
                        return true;
                      }

                      return product.packaging_type === selectedType;
                    })
                    .map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                </select>
              </div>
            )
          },
          {
            key: "packaging_quantity_per_unit",
            label: "Qte emballage / unite",
            render: (row) => (
              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  configDrafts[row.finished_product_id]?.packaging_quantity_per_unit ??
                  row.packaging_quantity_per_unit ??
                  1
                }
                onChange={(event) =>
                  handleConfigDraftChange(
                    row.finished_product_id,
                    "packaging_quantity_per_unit",
                    event.target.value
                  )
                }
                className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            )
          },
          {
            key: "packaging_product_name",
            label: "Type actuel",
            render: (row) =>
              row.required_packaging_type
                ? getPackagingTypeLabel(row.required_packaging_type)
                : "Non configure"
          },
          {
            key: "config_action",
            label: "Action",
            render: (row) => (
              <button
                type="button"
                onClick={() =>
                  handleSaveFinishedProductConfig(row.finished_product_id)
                }
                disabled={Boolean(configSaveByProductId[row.finished_product_id])}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {configSaveByProductId[row.finished_product_id] ? "..." : "Sauver"}
              </button>
            )
          }
        ]}
      />

      <TableCard
        title={`Produits emballages (${products.length})`}
        rows={products}
        emptyText="Aucun produit classe comme emballage pour le moment."
        columns={[
          { key: "name", label: "Emballage" },
          { key: "sku", label: "SKU" },
          {
            key: "packaging_type",
            label: "Type",
            render: (row) => (
              <div className="flex min-w-[220px] items-center gap-2">
                <select
                  value={typeDrafts[row.id] ?? row.packaging_type ?? ""}
                  onChange={(event) =>
                    handleTypeDraftChange(row.id, event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">A classer</option>
                  {packagingTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleSavePackagingType(row.id)}
                  disabled={Boolean(typeSaveByProductId[row.id])}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {typeSaveByProductId[row.id] ? "..." : "Sauver"}
                </button>
              </div>
            )
          },
          {
            key: "total_stock",
            label: "Stock global",
            render: (row) => formatNumber(row.total_stock)
          },
          {
            key: "warehouse_stock",
            label: "Repartition depots",
            render: (row) =>
              Array.isArray(row.warehouse_stock) && row.warehouse_stock.length > 0
                ? row.warehouse_stock
                    .map(
                      (entry) =>
                        `${entry.warehouse_name}: ${formatNumber(entry.quantity)}`
                    )
                    .join(" | ")
                : "-"
          }
        ]}
      />

      <TableCard
        title={`Historique des consommations (${consumptions.length})`}
        rows={consumptions}
        emptyText="Aucune consommation d'emballage sur la periode choisie."
        columns={[
          {
            key: "consumption_date",
            label: "Date",
            render: (row) => formatDate(row.consumption_date)
          },
          {
            key: "invoice_number",
            label: "Facture",
            render: (row) => row.invoice_number || "-"
          },
          {
            key: "consumer_name",
            label: "Consomme par",
            render: (row) => (
              <div>
                <div className="font-medium text-slate-800">{row.consumer_name}</div>
                <div className="text-xs text-slate-500">
                  {getConsumerTypeLabel(row.consumer_type)}
                </div>
              </div>
            )
          },
          { key: "product_name", label: "Emballage" },
          {
            key: "packaging_type",
            label: "Type",
            render: (row) => getPackagingTypeLabel(row.packaging_type)
          },
          {
            key: "quantity",
            label: "Quantite",
            render: (row) => formatNumber(row.quantity)
          },
          {
            key: "warehouse_name",
            label: "Depot",
            render: (row) => row.warehouse_name || "-"
          },
          {
            key: "purpose",
            label: "Motif",
            render: (row) => getPurposeLabel(row.purpose)
          },
          {
            key: "trigger_mode",
            label: "Origine",
            render: (row) =>
              row.trigger_mode === "automatic" ? "Facture automatique" : "Manuel"
          },
          {
            key: "notes",
            label: "Notes",
            render: (row) => row.notes || "-"
          }
        ]}
      />
    </div>
  );
}
