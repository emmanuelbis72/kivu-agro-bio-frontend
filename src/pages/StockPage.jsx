import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import TableCard from "../components/ui/TableCard";

const allowedUnits = ["g", "kg", "ml", "l", "unit", "piece"];

const entryInitial = {
  warehouse_id: "",
  product_id: "",
  quantity: "",
  stock_form: "bulk",
  package_size: "",
  package_unit: "unit",
  unit_cost: "",
  reference_type: "manual",
  notes: ""
};

const exitInitial = {
  warehouse_id: "",
  product_id: "",
  quantity: "",
  stock_form: "",
  package_size: "",
  package_unit: "unit",
  unit_cost: "",
  reference_type: "manual",
  notes: ""
};

const adjustmentInitial = {
  warehouse_id: "",
  product_id: "",
  new_quantity: "",
  stock_form: "bulk",
  package_size: "",
  package_unit: "unit",
  unit_cost: "",
  reference_type: "manual",
  notes: ""
};

const transferItemInitial = {
  product_id: "",
  quantity: "",
  stock_form: "bulk",
  package_size: "",
  package_unit: "unit",
  unit_cost: "",
  notes: ""
};

const transferInitial = {
  source_warehouse_id: "",
  destination_warehouse_id: "",
  transfer_date: new Date().toISOString().split("T")[0],
  notes: "",
  items: [{ ...transferItemInitial }]
};

const packageTransformInitial = {
  warehouse_id: "",
  source_product_id: "",
  target_product_id: "",
  source_quantity: "",
  target_quantity: "",
  package_size: "",
  package_unit: "unit",
  unit_cost: "",
  notes: ""
};

const mixtureItemInitial = {
  product_id: "",
  quantity: "",
  unit_cost: ""
};

const mixtureInitial = {
  warehouse_id: "",
  target_product_id: "",
  create_target_product: false,
  target_product_name: "",
  target_product_sku: "",
  target_product_category: "",
  target_product_unit: "piece",
  target_product_selling_price: "",
  target_product_alert_threshold: "",
  target_product_description: "",
  target_quantity: "",
  target_stock_form: "bulk",
  package_size: "",
  package_unit: "unit",
  unit_cost: "",
  notes: "",
  components: [{ ...mixtureItemInitial }]
};

function normalizeUnit(value, fallback = "unit") {
  const unit = String(value || fallback).trim().toLowerCase();
  return unit || fallback;
}

function getProductLabel(product) {
  if (!product) return "";
  return `${product.name} (${product.sku})`;
}

function getStockFormLabel(stockForm) {
  return stockForm === "package" ? "Produit fini conditionne" : "Produit fini";
}

function getVariantLabel(row) {
  if (!row) return "-";

  if (row.product_role === "finished_product") {
    return "Produit fini";
  }

  if (row.stock_form === "package") {
    const size = row.package_size ? Number(row.package_size) : null;
    const unit = row.package_unit || "unit";

    if (size) {
      return `Paquet - ${size} ${unit}`;
    }

    return "Paquet";
  }

  return "Stock";
}

function getStockDisplay(row) {
  const quantity = Number(row.quantity || 0);

  if (row.stock_form === "package") {
    return `${quantity} paquet(s)`;
  }

  return `${quantity} ${row.unit || "unit"}`;
}

function getMovementQuantityDisplay(row) {
  const quantity = Number(row.quantity || 0);

  if (row.stock_form === "package") {
    const details =
      row.package_size && row.package_unit
        ? ` (${row.package_size} ${row.package_unit} / paquet)`
        : "";
    return `${quantity} paquet(s)${details}`;
  }

  return `${quantity} ${row.unit || "piece"}`;
}

function buildSkuSuggestion(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 18);

  return normalized ? `MIX-${normalized}` : "MIX-001";
}

function isPackageVariant(form) {
  return form.stock_form === "package" || form.target_stock_form === "package";
}

function renderStockFormFields(form, onChange, formKey = "stock_form") {
  const currentFormValue = form[formKey];

  return (
    <>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Forme de stock *
        </label>
        <select
          name={formKey}
          value={currentFormValue}
          onChange={onChange}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
        >
          <option value="bulk">Produit fini</option>
          <option value="package">Paquet</option>
        </select>
      </div>

      {currentFormValue === "package" ? (
        <>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Taille du paquet *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              name="package_size"
              value={form.package_size}
              onChange={onChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Ex: 25"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Unité du paquet *
            </label>
            <select
              name="package_unit"
              value={form.package_unit}
              onChange={onChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              {allowedUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : null}
    </>
  );
}

export default function StockPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [stockRows, setStockRows] = useState([]);
  const [movements, setMovements] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [transferDetailsLoading, setTransferDetailsLoading] = useState(false);

  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [search, setSearch] = useState("");
  const [movementSearch, setMovementSearch] = useState("");
  const [transferSearch, setTransferSearch] = useState("");
  const [activeTab, setActiveTab] = useState("entry");

  const [entryForm, setEntryForm] = useState(entryInitial);
  const [exitForm, setExitForm] = useState(exitInitial);
  const [adjustmentForm, setAdjustmentForm] = useState(adjustmentInitial);
  const [transferForm, setTransferForm] = useState(transferInitial);
  const [packageTransformForm, setPackageTransformForm] = useState(
    packageTransformInitial
  );
  const [mixtureForm, setMixtureForm] = useState(mixtureInitial);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const activeProducts = useMemo(
    () => products.filter((product) => product.is_active !== false),
    [products]
  );

  const finishedProducts = useMemo(
    () =>
      activeProducts.filter(
        (product) => product.product_role === "finished_product"
      ),
    [activeProducts]
  );

  const packageSourceProducts = useMemo(
    () =>
      activeProducts.filter(
        (product) => product.product_role !== "packaging_material"
      ),
    [activeProducts]
  );

  const mixtureComponentProducts = useMemo(
    () =>
      activeProducts.filter(
        (product) => product.product_role !== "packaging_material"
      ),
    [activeProducts]
  );

  async function fetchInitialData() {
    try {
      setLoading(true);
      setError("");

      const [
        warehousesRes,
        productsRes,
        stockRes,
        movementsRes,
        transfersRes
      ] = await Promise.all([
        api.get("/warehouses"),
        api.get("/products"),
        api.get("/stock"),
        api.get("/stock/movements"),
        api.get("/stock/transfers")
      ]);

      setWarehouses(warehousesRes.data.data || []);
      setProducts(productsRes.data.data || []);
      setStockRows(stockRes.data.data || []);
      setMovements(movementsRes.data.data || []);
      setTransfers(transfersRes.data.data || []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger les données de stock."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchStockByWarehouse(warehouseId) {
    try {
      if (!warehouseId) {
        const stockRes = await api.get("/stock");
        setStockRows(stockRes.data.data || []);
        return;
      }

      const response = await api.get(`/stock/warehouse/${warehouseId}`);
      setStockRows(response.data.data || []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger le stock du dépôt."
      );
    }
  }

  async function fetchMovements() {
    try {
      const response = await api.get("/stock/movements");
      setMovements(response.data.data || []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger les mouvements de stock."
      );
    }
  }

  async function fetchTransfers() {
    try {
      const response = await api.get("/stock/transfers");
      setTransfers(response.data.data || []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger les transferts."
      );
    }
  }

  async function handleLoadTransferDetails(transferId) {
    try {
      setTransferDetailsLoading(true);
      setError("");

      const response = await api.get(`/stock/transfers/${transferId}`);
      setSelectedTransfer(response.data.data || null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger le détail du transfert."
      );
    } finally {
      setTransferDetailsLoading(false);
    }
  }

  function handleWarehouseFilterChange(value) {
    setSelectedWarehouse(value);
    fetchStockByWarehouse(value);
  }

  function handleEntryChange(event) {
    const { name, value } = event.target;
    setEntryForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleExitChange(event) {
    const { name, value } = event.target;
    setExitForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleAdjustmentChange(event) {
    const { name, value } = event.target;
    setAdjustmentForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleTransferChange(event) {
    const { name, value } = event.target;
    setTransferForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleTransferItemChange(index, field, value) {
    setTransferForm((prev) => {
      const items = [...prev.items];
      items[index] = {
        ...items[index],
        [field]: value
      };

      return {
        ...prev,
        items
      };
    });
  }

  function addTransferItemRow() {
    setTransferForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...transferItemInitial }]
    }));
  }

  function removeTransferItemRow(index) {
    setTransferForm((prev) => {
      if (prev.items.length === 1) {
        return prev;
      }

      return {
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      };
    });
  }

  function handlePackageTransformChange(event) {
    const { name, value } = event.target;
    setPackageTransformForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleMixtureChange(event) {
    const { name, value, type, checked } = event.target;

    setMixtureForm((prev) => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? checked : value
      };

      if (name === "create_target_product" && checked) {
        next.target_product_id = "";
      }

      if (name === "target_product_name" && prev.create_target_product) {
        const currentSku = String(prev.target_product_sku || "").trim();

        if (!currentSku) {
          next.target_product_sku = buildSkuSuggestion(value);
        }
      }

      return next;
    });
  }

  function handleMixtureItemChange(index, field, value) {
    setMixtureForm((prev) => {
      const components = [...prev.components];
      components[index] = {
        ...components[index],
        [field]: value
      };

      return {
        ...prev,
        components
      };
    });
  }

  function addMixtureItemRow() {
    setMixtureForm((prev) => ({
      ...prev,
      components: [...prev.components, { ...mixtureItemInitial }]
    }));
  }

  function removeMixtureItemRow(index) {
    setMixtureForm((prev) => {
      if (prev.components.length === 1) {
        return prev;
      }

      return {
        ...prev,
        components: prev.components.filter((_, i) => i !== index)
      };
    });
  }

  function resetForms() {
    setEntryForm(entryInitial);
    setExitForm(exitInitial);
    setAdjustmentForm(adjustmentInitial);
    setTransferForm({
      ...transferInitial,
      transfer_date: new Date().toISOString().split("T")[0],
      items: [{ ...transferItemInitial }]
    });
    setPackageTransformForm(packageTransformInitial);
    setMixtureForm(mixtureInitial);
  }

  async function handleEntrySubmit(event) {
    event.preventDefault();

    try {
      setSubmitLoading(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        warehouse_id: Number(entryForm.warehouse_id),
        product_id: Number(entryForm.product_id),
        quantity: Number(entryForm.quantity),
        stock_form: entryForm.stock_form,
        package_size:
          entryForm.stock_form === "package"
            ? Number(entryForm.package_size)
            : undefined,
        package_unit:
          entryForm.stock_form === "package"
            ? normalizeUnit(entryForm.package_unit)
            : undefined,
        unit_cost: entryForm.unit_cost === "" ? 0 : Number(entryForm.unit_cost),
        reference_type: entryForm.reference_type,
        notes: entryForm.notes.trim()
      };

      await api.post("/stock/entry", payload);
      setSuccessMessage("Entrée de stock enregistrée avec succès.");
      resetForms();
      await fetchStockByWarehouse(selectedWarehouse);
      await fetchMovements();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Erreur lors de l’entrée de stock."
      );
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleExitSubmit(event) {
    event.preventDefault();

    try {
      setSubmitLoading(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        warehouse_id: Number(exitForm.warehouse_id),
        product_id: Number(exitForm.product_id),
        quantity: Number(exitForm.quantity),
        stock_form: exitForm.stock_form || undefined,
        package_size:
          exitForm.stock_form === "package"
            ? Number(exitForm.package_size)
            : undefined,
        package_unit:
          exitForm.stock_form === "package"
            ? normalizeUnit(exitForm.package_unit)
            : undefined,
        unit_cost: exitForm.unit_cost === "" ? 0 : Number(exitForm.unit_cost),
        reference_type: exitForm.reference_type,
        notes: exitForm.notes.trim()
      };

      await api.post("/stock/exit", payload);
      setSuccessMessage("Sortie de stock enregistrée avec succès.");
      resetForms();
      await fetchStockByWarehouse(selectedWarehouse);
      await fetchMovements();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Erreur lors de la sortie de stock."
      );
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleAdjustmentSubmit(event) {
    event.preventDefault();

    try {
      setSubmitLoading(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        warehouse_id: Number(adjustmentForm.warehouse_id),
        product_id: Number(adjustmentForm.product_id),
        new_quantity: Number(adjustmentForm.new_quantity),
        stock_form: adjustmentForm.stock_form,
        package_size:
          adjustmentForm.stock_form === "package"
            ? Number(adjustmentForm.package_size)
            : undefined,
        package_unit:
          adjustmentForm.stock_form === "package"
            ? normalizeUnit(adjustmentForm.package_unit)
            : undefined,
        unit_cost:
          adjustmentForm.unit_cost === ""
            ? 0
            : Number(adjustmentForm.unit_cost),
        reference_type: adjustmentForm.reference_type,
        notes: adjustmentForm.notes.trim()
      };

      await api.post("/stock/adjustment", payload);
      setSuccessMessage("Ajustement de stock enregistré avec succès.");
      resetForms();
      await fetchStockByWarehouse(selectedWarehouse);
      await fetchMovements();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Erreur lors de l’ajustement de stock."
      );
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleTransferSubmit(event) {
    event.preventDefault();

    try {
      setSubmitLoading(true);
      setError("");
      setSuccessMessage("");

      const normalizedItems = transferForm.items.map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
        stock_form: item.stock_form,
        package_size:
          item.stock_form === "package" ? Number(item.package_size) : undefined,
        package_unit:
          item.stock_form === "package"
            ? normalizeUnit(item.package_unit)
            : undefined,
        unit_cost: item.unit_cost === "" ? 0 : Number(item.unit_cost),
        notes: item.notes.trim()
      }));

      const invalidItem = normalizedItems.find(
        (item) =>
          !Number.isInteger(item.product_id) ||
          item.product_id <= 0 ||
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0 ||
          !item.stock_form ||
          (item.stock_form === "package" &&
            (!Number.isFinite(item.package_size) || item.package_size <= 0))
      );

      if (invalidItem) {
        setError(
          "Chaque ligne de transfert doit contenir un produit valide, une quantité positive et une variante correcte."
        );
        return;
      }

      const payload = {
        source_warehouse_id: Number(transferForm.source_warehouse_id),
        destination_warehouse_id: Number(transferForm.destination_warehouse_id),
        transfer_date: transferForm.transfer_date,
        notes: transferForm.notes.trim(),
        items: normalizedItems
      };

      const response = await api.post("/stock/transfer", payload);

      setSuccessMessage("Transfert inter-dépôts enregistré avec succès.");
      resetForms();
      await fetchStockByWarehouse(selectedWarehouse);
      await fetchMovements();
      await fetchTransfers();

      if (response?.data?.data?.id) {
        await handleLoadTransferDetails(response.data.data.id);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Erreur lors du transfert inter-dépôts."
      );
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handlePackageTransformSubmit(event) {
    event.preventDefault();

    try {
      setSubmitLoading(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        warehouse_id: Number(packageTransformForm.warehouse_id),
        source_product_id: Number(packageTransformForm.source_product_id),
        target_product_id: Number(packageTransformForm.target_product_id),
        source_quantity: Number(packageTransformForm.source_quantity),
        target_quantity: Number(packageTransformForm.target_quantity),
        package_size: Number(packageTransformForm.package_size),
        package_unit: normalizeUnit(packageTransformForm.package_unit),
        unit_cost:
          packageTransformForm.unit_cost === ""
            ? 0
            : Number(packageTransformForm.unit_cost),
        notes: packageTransformForm.notes.trim()
      };

      await api.post("/stock/transform/package", payload);
      setSuccessMessage("Transformation de produit fini enregistrée avec succès.");
      resetForms();
      await fetchStockByWarehouse(selectedWarehouse);
      await fetchMovements();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Erreur lors de la transformation du produit fini."
      );
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleMixtureSubmit(event) {
    event.preventDefault();

    try {
      setSubmitLoading(true);
      setError("");
      setSuccessMessage("");

      if (mixtureForm.create_target_product) {
        if (!mixtureForm.target_product_name.trim()) {
          setError("Le nom du nouveau produit mixture est obligatoire.");
          return;
        }

        if (!mixtureForm.target_product_sku.trim()) {
          setError("Le SKU du nouveau produit mixture est obligatoire.");
          return;
        }
      } else if (!Number(mixtureForm.target_product_id)) {
        setError("Selectionne un produit fini cible ou cree-en un nouveau.");
        return;
      }

      const components = mixtureForm.components.map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
        unit_cost: item.unit_cost === "" ? 0 : Number(item.unit_cost)
      }));

      const invalidItem = components.find(
        (item) =>
          !Number.isInteger(item.product_id) ||
          item.product_id <= 0 ||
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0
      );

      if (invalidItem) {
        setError(
          "Chaque composant du mélange doit contenir un produit valide et une quantité positive."
        );
        return;
      }

      const componentIds = components.map((item) => item.product_id);
      if (new Set(componentIds).size !== componentIds.length) {
        setError(
          "Chaque composant doit apparaitre une seule fois dans la mixture. Regroupe les quantites sur une seule ligne."
        );
        return;
      }

      const payload = {
        warehouse_id: Number(mixtureForm.warehouse_id),
        target_product_id: mixtureForm.create_target_product
          ? undefined
          : Number(mixtureForm.target_product_id),
        target_product: mixtureForm.create_target_product
          ? {
              name: mixtureForm.target_product_name.trim(),
              sku: mixtureForm.target_product_sku.trim(),
              category: mixtureForm.target_product_category.trim(),
              unit: mixtureForm.target_product_unit.trim() || "piece",
              selling_price:
                mixtureForm.target_product_selling_price === ""
                  ? 0
                  : Number(mixtureForm.target_product_selling_price),
              alert_threshold:
                mixtureForm.target_product_alert_threshold === ""
                  ? 0
                  : Number(mixtureForm.target_product_alert_threshold),
              description: mixtureForm.target_product_description.trim()
            }
          : undefined,
        target_quantity: Number(mixtureForm.target_quantity),
        target_stock_form: mixtureForm.target_stock_form,
        package_size:
          mixtureForm.target_stock_form === "package"
            ? Number(mixtureForm.package_size)
            : undefined,
        package_unit:
          mixtureForm.target_stock_form === "package"
            ? normalizeUnit(mixtureForm.package_unit)
            : undefined,
        unit_cost:
          mixtureForm.unit_cost === "" ? 0 : Number(mixtureForm.unit_cost),
        notes: mixtureForm.notes.trim(),
        components
      };

      await api.post("/stock/transform/mixture", payload);
      setSuccessMessage("Produit mixture enregistré avec succès.");
      resetForms();
      await fetchStockByWarehouse(selectedWarehouse);
      await fetchMovements();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Erreur lors de la création du produit mixture."
      );
    } finally {
      setSubmitLoading(false);
    }
  }

  const filteredStockRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return stockRows;
    }

    return stockRows.filter((row) =>
      [
        row.product_name,
        row.sku,
        row.category,
        row.warehouse_name,
        row.warehouse_city,
        row.stock_form,
        row.package_unit
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [stockRows, search]);

  const filteredMovements = useMemo(() => {
    const keyword = movementSearch.trim().toLowerCase();

    if (!keyword) {
      return movements;
    }

    return movements.filter((row) =>
      [
        row.product_name,
        row.sku,
        row.warehouse_name,
        row.warehouse_city,
        row.movement_type,
        row.reference_type,
        row.notes,
        row.stock_form,
        row.package_unit
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [movements, movementSearch]);

  const filteredTransfers = useMemo(() => {
    const keyword = transferSearch.trim().toLowerCase();

    if (!keyword) {
      return transfers;
    }

    return transfers.filter((row) =>
      [
        row.transfer_number,
        row.source_warehouse_name,
        row.source_warehouse_city,
        row.destination_warehouse_name,
        row.destination_warehouse_city,
        row.status,
        row.notes
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [transfers, transferSearch]);

  function getMovementBadge(type) {
    const map = {
      IN: "bg-green-100 text-green-700",
      OUT: "bg-red-100 text-red-700",
      ADJUSTMENT: "bg-blue-100 text-blue-700",
      TRANSFER_IN: "bg-emerald-100 text-emerald-700",
      TRANSFER_OUT: "bg-orange-100 text-orange-700",
      PRODUCTION_CONSUME: "bg-amber-100 text-amber-700",
      PRODUCTION_OUTPUT: "bg-emerald-100 text-emerald-700",
      TRANSFORM_IN: "bg-cyan-100 text-cyan-700",
      TRANSFORM_OUT: "bg-yellow-100 text-yellow-700",
      MIXTURE_IN: "bg-violet-100 text-violet-700",
      MIXTURE_OUT: "bg-rose-100 text-rose-700"
    };

    return map[type] || "bg-slate-100 text-slate-700";
  }

  function getTransferStatusBadge(status) {
    const map = {
      completed: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700"
    };

    return map[status] || "bg-slate-100 text-slate-700";
  }

  function renderStockForm() {
    if (activeTab === "entry") {
      return (
        <form
          onSubmit={handleEntrySubmit}
          className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Dépôt *
            </label>
            <select
              name="warehouse_id"
              value={entryForm.warehouse_id}
              onChange={handleEntryChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              <option value="">Sélectionner</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} - {warehouse.city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Produit *
            </label>
            <select
              name="product_id"
              value={entryForm.product_id}
              onChange={handleEntryChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              <option value="">Sélectionner</option>
              {finishedProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {getProductLabel(product)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Quantité *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              name="quantity"
              value={entryForm.quantity}
              onChange={handleEntryChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Ex: 25"
            />
          </div>

          {renderStockFormFields(entryForm, handleEntryChange)}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Coût unitaire
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              name="unit_cost"
              value={entryForm.unit_cost}
              onChange={handleEntryChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="0"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Référence
            </label>
            <select
              name="reference_type"
              value={entryForm.reference_type}
              onChange={handleEntryChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              <option value="manual">manual</option>
              <option value="purchase">purchase</option>
              <option value="supply">supply</option>
              <option value="initial_stock">initial_stock</option>
            </select>
          </div>

          <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            L’entrée en dépôt définit maintenant la forme réelle du stock :
            produit fini ou conditionne.
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              name="notes"
              value={entryForm.notes}
              onChange={handleEntryChange}
              rows="3"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Stock initial, achat, réception..."
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <button
              type="submit"
              disabled={submitLoading}
              className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitLoading ? "Enregistrement..." : "Enregistrer l’entrée"}
            </button>
          </div>
        </form>
      );
    }

    if (activeTab === "exit") {
      return (
        <form
          onSubmit={handleExitSubmit}
          className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Dépôt *
            </label>
            <select
              name="warehouse_id"
              value={exitForm.warehouse_id}
              onChange={handleExitChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              <option value="">Sélectionner</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} - {warehouse.city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Produit *
            </label>
            <select
              name="product_id"
              value={exitForm.product_id}
              onChange={handleExitChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              <option value="">Sélectionner</option>
              {packageSourceProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {getProductLabel(product)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Quantité *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              name="quantity"
              value={exitForm.quantity}
              onChange={handleExitChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Ex: 10"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Variante à sortir
            </label>
            <select
              name="stock_form"
              value={exitForm.stock_form}
              onChange={handleExitChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              <option value="">Auto / stock unique</option>
              <option value="bulk">Produit fini</option>
              <option value="package">Paquet</option>
            </select>
          </div>

          {exitForm.stock_form === "package" ? (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Taille du paquet *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="package_size"
                  value={exitForm.package_size}
                  onChange={handleExitChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                  placeholder="Ex: 25"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Unité du paquet *
                </label>
                <select
                  name="package_unit"
                  value={exitForm.package_unit}
                  onChange={handleExitChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  {allowedUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Coût unitaire
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              name="unit_cost"
              value={exitForm.unit_cost}
              onChange={handleExitChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="0"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Référence
            </label>
            <select
              name="reference_type"
              value={exitForm.reference_type}
              onChange={handleExitChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              <option value="manual">manual</option>
              <option value="sale">sale</option>
              <option value="damage">damage</option>
              <option value="loss">loss</option>
            </select>
          </div>

          <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Si plusieurs variantes existent pour un produit dans un dépôt,
            choisissez explicitement le stock produit fini ou conditionne.
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              name="notes"
              value={exitForm.notes}
              onChange={handleExitChange}
              rows="3"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Sortie, casse, perte..."
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <button
              type="submit"
              disabled={submitLoading}
              className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitLoading ? "Enregistrement..." : "Enregistrer la sortie"}
            </button>
          </div>
        </form>
      );
    }

    if (activeTab === "adjustment") {
      return (
        <form
          onSubmit={handleAdjustmentSubmit}
          className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Dépôt *
            </label>
            <select
              name="warehouse_id"
              value={adjustmentForm.warehouse_id}
              onChange={handleAdjustmentChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              <option value="">Sélectionner</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} - {warehouse.city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Produit *
            </label>
            <select
              name="product_id"
              value={adjustmentForm.product_id}
              onChange={handleAdjustmentChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              <option value="">Sélectionner</option>
              {finishedProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {getProductLabel(product)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Nouveau stock *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              name="new_quantity"
              value={adjustmentForm.new_quantity}
              onChange={handleAdjustmentChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Ex: 50"
            />
          </div>

          {renderStockFormFields(adjustmentForm, handleAdjustmentChange)}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Coût unitaire
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              name="unit_cost"
              value={adjustmentForm.unit_cost}
              onChange={handleAdjustmentChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="0"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Référence
            </label>
            <select
              name="reference_type"
              value={adjustmentForm.reference_type}
              onChange={handleAdjustmentChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              <option value="manual">manual</option>
              <option value="inventory">inventory</option>
              <option value="correction">correction</option>
            </select>
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              name="notes"
              value={adjustmentForm.notes}
              onChange={handleAdjustmentChange}
              rows="3"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Correction inventaire..."
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <button
              type="submit"
              disabled={submitLoading}
              className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitLoading ? "Enregistrement..." : "Enregistrer l’ajustement"}
            </button>
          </div>
        </form>
      );
    }

    if (activeTab === "packageTransform") {
      return (
        <form
          onSubmit={handlePackageTransformSubmit}
          className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Utilise cette operation pour conditionner un stock de produit fini.
            Le produit source ne peut pas etre un emballage, et le produit cible doit etre un produit fini vendable.
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Dépôt *
            </label>
            <select
              name="warehouse_id"
              value={packageTransformForm.warehouse_id}
              onChange={handlePackageTransformChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              <option value="">Sélectionner</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} - {warehouse.city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Produit fini source *
            </label>
            <select
              name="source_product_id"
              value={packageTransformForm.source_product_id}
              onChange={handlePackageTransformChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              <option value="">Sélectionner</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {getProductLabel(product)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Produit cible paquet *
            </label>
            <select
              name="target_product_id"
              value={packageTransformForm.target_product_id}
              onChange={handlePackageTransformChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              <option value="">Sélectionner</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {getProductLabel(product)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Quantite de produit fini consommee *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              name="source_quantity"
              value={packageTransformForm.source_quantity}
              onChange={handlePackageTransformChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Ex: 100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Nombre de paquets créés *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              name="target_quantity"
              value={packageTransformForm.target_quantity}
              onChange={handlePackageTransformChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Ex: 20"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Taille du paquet *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              name="package_size"
              value={packageTransformForm.package_size}
              onChange={handlePackageTransformChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Ex: 5"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Unité du paquet *
            </label>
            <select
              name="package_unit"
              value={packageTransformForm.package_unit}
              onChange={handlePackageTransformChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              {allowedUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Coût unitaire
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              name="unit_cost"
              value={packageTransformForm.unit_cost}
              onChange={handlePackageTransformChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="0"
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              name="notes"
              value={packageTransformForm.notes}
              onChange={handlePackageTransformChange}
              rows="3"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Conditionnement du produit fini..."
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <button
              type="submit"
              disabled={submitLoading}
              className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitLoading ? "Enregistrement..." : "Transformer en paquets"}
            </button>
          </div>
        </form>
      );
    }

    if (activeTab === "mixture") {
      return (
        <form onSubmit={handleMixtureSubmit} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            La mixture consomme plusieurs stocks existants et cree un seul produit fini.
            Tu peux choisir un produit fini deja cree ou creer ce produit directement ici.
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Dépôt *
              </label>
              <select
                name="warehouse_id"
                value={mixtureForm.warehouse_id}
                onChange={handleMixtureChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              >
                <option value="">Sélectionner</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} - {warehouse.city}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 xl:col-span-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="create_target_product"
                  checked={mixtureForm.create_target_product}
                  onChange={handleMixtureChange}
                />
                Creer directement un nouveau produit fini pour cette mixture
              </label>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Produit mixture *
              </label>
              <select
                name="target_product_id"
                value={mixtureForm.target_product_id}
                onChange={handleMixtureChange}
                disabled={mixtureForm.create_target_product}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500 disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="">Sélectionner</option>
                {finishedProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {getProductLabel(product)}
                  </option>
                ))}
              </select>
            </div>

            {mixtureForm.create_target_product ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Nom du nouveau produit *
                  </label>
                  <input
                    name="target_product_name"
                    value={mixtureForm.target_product_name}
                    onChange={handleMixtureChange}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                    placeholder="Ex: Mixture Energie"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    SKU du nouveau produit *
                  </label>
                  <input
                    name="target_product_sku"
                    value={mixtureForm.target_product_sku}
                    onChange={handleMixtureChange}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                    placeholder="Ex: KAB-MIX-001"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Categorie
                  </label>
                  <input
                    name="target_product_category"
                    value={mixtureForm.target_product_category}
                    onChange={handleMixtureChange}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                    placeholder="Ex: Mix nutrition"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Unite commerciale
                  </label>
                  <input
                    name="target_product_unit"
                    value={mixtureForm.target_product_unit}
                    onChange={handleMixtureChange}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                    placeholder="piece"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Prix de vente
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="target_product_selling_price"
                    value={mixtureForm.target_product_selling_price}
                    onChange={handleMixtureChange}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Seuil d'alerte
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="target_product_alert_threshold"
                    value={mixtureForm.target_product_alert_threshold}
                    onChange={handleMixtureChange}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                    placeholder="0"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() =>
                      setMixtureForm((prev) => ({
                        ...prev,
                        target_product_sku: buildSkuSuggestion(
                          prev.target_product_name
                        )
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    Generer le SKU
                  </button>
                </div>
              </>
            ) : null}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Quantité produite *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                name="target_quantity"
                value={mixtureForm.target_quantity}
                onChange={handleMixtureChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                placeholder="Ex: 200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Coût unitaire
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                name="unit_cost"
                value={mixtureForm.unit_cost}
                onChange={handleMixtureChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                placeholder="0"
              />
            </div>

            {renderStockFormFields(
              {
                ...mixtureForm,
                stock_form: mixtureForm.target_stock_form
              },
              (event) => {
                const { name, value } = event.target;
                if (name === "stock_form") {
                  setMixtureForm((prev) => ({
                    ...prev,
                    target_stock_form: value
                  }));
                  return;
                }
                handleMixtureChange(event);
              }
            )}
          </div>

          {mixtureForm.create_target_product ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Description du nouveau produit
              </label>
              <textarea
                name="target_product_description"
                value={mixtureForm.target_product_description}
                onChange={handleMixtureChange}
                rows="3"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                placeholder="Description commerciale ou interne du produit fini cree par cette mixture"
              />
            </div>
          ) : null}

          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-base font-semibold text-slate-900">
                Composants produits finis
              </div>
              <button
                type="button"
                onClick={addMixtureItemRow}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                + Ajouter un composant
              </button>
            </div>

            <div className="space-y-4">
              {mixtureForm.components.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 p-4 md:grid-cols-4"
                >
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Produit composant *
                    </label>
                    <select
                      value={item.product_id}
                      onChange={(e) =>
                        handleMixtureItemChange(index, "product_id", e.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                    >
                      <option value="">Sélectionner</option>
                      {mixtureComponentProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {getProductLabel(product)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Quantité *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) =>
                        handleMixtureItemChange(index, "quantity", e.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                      placeholder="10"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Coût unitaire
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_cost}
                      onChange={(e) =>
                        handleMixtureItemChange(index, "unit_cost", e.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                      placeholder="0"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeMixtureItemRow(index)}
                      className="w-full rounded-2xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-700"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              name="notes"
              value={mixtureForm.notes}
              onChange={handleMixtureChange}
              rows="3"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Mélange de plusieurs matières premières..."
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={submitLoading}
              className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitLoading ? "Enregistrement..." : "Créer la mixture"}
            </button>
          </div>
        </form>
      );
    }

    return (
      <form onSubmit={handleTransferSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Dépôt source *
            </label>
            <select
              name="source_warehouse_id"
              value={transferForm.source_warehouse_id}
              onChange={handleTransferChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              <option value="">Sélectionner</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} - {warehouse.city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Dépôt destination *
            </label>
            <select
              name="destination_warehouse_id"
              value={transferForm.destination_warehouse_id}
              onChange={handleTransferChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              <option value="">Sélectionner</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} - {warehouse.city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Date de transfert
            </label>
            <input
              type="date"
              name="transfer_date"
              value={transferForm.transfer_date}
              onChange={handleTransferChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Notes générales
            </label>
            <input
              name="notes"
              value={transferForm.notes}
              onChange={handleTransferChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Motif du transfert"
            />
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-base font-semibold text-slate-900">
              Lignes de transfert
            </div>
            <button
              type="button"
              onClick={addTransferItemRow}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              + Ajouter une ligne
            </button>
          </div>

          <div className="space-y-4">
            {transferForm.items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 p-4 md:grid-cols-4"
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Produit *
                  </label>
                  <select
                    value={item.product_id}
                    onChange={(e) =>
                      handleTransferItemChange(index, "product_id", e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                  >
                    <option value="">Sélectionner</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {getProductLabel(product)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Quantité *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) =>
                      handleTransferItemChange(index, "quantity", e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                    placeholder="10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Forme *
                  </label>
                  <select
                    value={item.stock_form}
                    onChange={(e) =>
                      handleTransferItemChange(index, "stock_form", e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                  >
                    <option value="bulk">Produit fini</option>
                    <option value="package">Paquet</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Coût unitaire
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_cost}
                    onChange={(e) =>
                      handleTransferItemChange(index, "unit_cost", e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                    placeholder="0"
                  />
                </div>

                {item.stock_form === "package" ? (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Taille paquet *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.package_size}
                        onChange={(e) =>
                          handleTransferItemChange(index, "package_size", e.target.value)
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                        placeholder="Ex: 25"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Unité paquet *
                      </label>
                      <select
                        value={item.package_unit}
                        onChange={(e) =>
                          handleTransferItemChange(index, "package_unit", e.target.value)
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                      >
                        {allowedUnits.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : null}

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeTransferItemRow(index)}
                    className="w-full rounded-2xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-700"
                  >
                    Supprimer ligne
                  </button>
                </div>

                <div className="md:col-span-4">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Notes ligne
                  </label>
                  <input
                    value={item.notes}
                    onChange={(e) =>
                      handleTransferItemChange(index, "notes", e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                    placeholder="Note optionnelle sur cette ligne"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={submitLoading}
            className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitLoading ? "Enregistrement..." : "Enregistrer le transfert"}
          </button>
        </div>
      </form>
    );
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-soft text-sm text-slate-500">
        Chargement des données de stock...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Stock"
        subtitle="Organisation professionnelle du stock par depot : les stocks visibles sont des produits finis et leurs mouvements"
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Regle pratique : les produits visibles en stock et sur facture sont des produits finis vendables.
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
        <div className="mb-5 flex flex-wrap gap-3">
          {[
            ["entry", "Entrée stock"],
            ["exit", "Sortie stock"],
            ["adjustment", "Ajustement"],
            ["packageTransform", "Conditionnement"],
            ["mixture", "Créer mixture"],
            ["transfer", "Transfert inter-dépôts"]
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                activeTab === key
                  ? "bg-brand-600 text-white"
                  : "border border-slate-300 text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {renderStockForm()}
      </div>

      {selectedTransfer ? (
        <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
          <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-lg font-semibold text-slate-900">
                Détail transfert {selectedTransfer.transfer_number}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {selectedTransfer.source_warehouse_name} -{" "}
                {selectedTransfer.source_warehouse_city}
                {"  "}→{"  "}
                {selectedTransfer.destination_warehouse_name} -{" "}
                {selectedTransfer.destination_warehouse_city}
              </div>
            </div>

            <button
              onClick={() => setSelectedTransfer(null)}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Fermer
            </button>
          </div>

          {transferDetailsLoading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Chargement du détail du transfert...
            </div>
          ) : (
            <TableCard
              title={`Lignes du transfert (${selectedTransfer.items?.length || 0})`}
              rows={selectedTransfer.items || []}
              emptyText="Aucune ligne de transfert"
              columns={[
                { key: "product_name", label: "Produit" },
                { key: "sku", label: "SKU" },
                {
                  key: "stock_form",
                  label: "Forme",
                  render: (row) => getVariantLabel(row)
                },
                {
                  key: "quantity",
                  label: "Quantité",
                  render: (row) =>
                    row.stock_form === "package"
                      ? `${row.quantity} paquet(s)`
                      : `${row.quantity} ${row.unit || "unit"}`
                },
                {
                  key: "unit_cost",
                  label: "Coût unitaire"
                }
              ]}
            />
          )}
        </div>
      ) : null}

      <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
        <div className="mb-5 flex flex-wrap items-center gap-3 justify-between">
          <div className="text-lg font-semibold text-slate-900">
            Stock par dépôt
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={selectedWarehouse}
              onChange={(e) => handleWarehouseFilterChange(e.target.value)}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-500"
            >
              <option value="">Tous les dépôts</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} - {warehouse.city}
                </option>
              ))}
            </select>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-500"
              placeholder="Rechercher produit / dépôt"
            />
          </div>
        </div>

        <TableCard
          title={`Stock visible (${filteredStockRows.length})`}
          rows={filteredStockRows}
          emptyText="Aucune ligne de stock"
          columns={[
            { key: "product_name", label: "Produit" },
            { key: "sku", label: "SKU" },
            { key: "warehouse_name", label: "Dépôt" },
            { key: "warehouse_city", label: "Ville" },
            {
              key: "stock_form",
              label: "Forme",
              render: (row) => getVariantLabel(row)
            },
            {
              key: "quantity",
              label: "Stock réel",
              render: (row) => getStockDisplay(row)
            }
          ]}
        />
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
        <div className="mb-5 flex flex-wrap items-center gap-3 justify-between">
          <div className="text-lg font-semibold text-slate-900">
            Mouvements de stock
          </div>

          <input
            value={movementSearch}
            onChange={(e) => setMovementSearch(e.target.value)}
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-500"
            placeholder="Rechercher mouvement"
          />
        </div>

        <TableCard
          title={`Mouvements (${filteredMovements.length})`}
          rows={filteredMovements}
          emptyText="Aucun mouvement de stock"
          columns={[
            { key: "product_name", label: "Produit" },
            { key: "sku", label: "SKU" },
            { key: "warehouse_name", label: "Dépôt" },
            {
              key: "movement_type",
              label: "Type",
              render: (row) => (
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getMovementBadge(
                    row.movement_type
                  )}`}
                >
                  {row.movement_type}
                </span>
              )
            },
            {
              key: "stock_form",
              label: "Forme",
              render: (row) => getVariantLabel(row)
            },
            {
              key: "quantity",
              label: "Quantité",
              render: (row) => getMovementQuantityDisplay(row)
            },
            { key: "reference_type", label: "Référence" },
            { key: "notes", label: "Notes" }
          ]}
        />
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
        <div className="mb-5 flex flex-wrap items-center gap-3 justify-between">
          <div className="text-lg font-semibold text-slate-900">
            Transferts inter-dépôts
          </div>

          <input
            value={transferSearch}
            onChange={(e) => setTransferSearch(e.target.value)}
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-500"
            placeholder="Rechercher transfert"
          />
        </div>

        <TableCard
          title={`Transferts (${filteredTransfers.length})`}
          rows={filteredTransfers}
          emptyText="Aucun transfert"
          columns={[
            { key: "transfer_number", label: "N° transfert" },
            { key: "source_warehouse_name", label: "Dépôt source" },
            { key: "destination_warehouse_name", label: "Dépôt destination" },
            { key: "transfer_date", label: "Date" },
            {
              key: "status",
              label: "Statut",
              render: (row) => (
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getTransferStatusBadge(
                    row.status
                  )}`}
                >
                  {row.status}
                </span>
              )
            },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <button
                  type="button"
                  onClick={() => handleLoadTransferDetails(row.id)}
                  className="rounded-2xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  Voir détail
                </button>
              )
            }
          ]}
        />
      </div>
    </div>
  );
}
