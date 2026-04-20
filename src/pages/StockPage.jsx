import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import TableCard from "../components/ui/TableCard";

const entryInitial = {
  warehouse_id: "",
  product_id: "",
  quantity: "",
  unit_cost: "",
  reference_type: "manual",
  notes: ""
};

const exitInitial = {
  warehouse_id: "",
  product_id: "",
  quantity: "",
  unit_cost: "",
  reference_type: "manual",
  notes: ""
};

const adjustmentInitial = {
  warehouse_id: "",
  product_id: "",
  new_quantity: "",
  unit_cost: "",
  reference_type: "manual",
  notes: ""
};

const transferItemInitial = {
  product_id: "",
  quantity: "",
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

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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
      setError(err?.message || "Impossible de charger les données de stock.");
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
      setError(err?.message || "Impossible de charger le stock du dépôt.");
    }
  }

  async function fetchMovements() {
    try {
      const response = await api.get("/stock/movements");
      setMovements(response.data.data || []);
    } catch (err) {
      setError(
        err?.message || "Impossible de charger les mouvements de stock."
      );
    }
  }

  async function fetchTransfers() {
    try {
      const response = await api.get("/stock/transfers");
      setTransfers(response.data.data || []);
    } catch (err) {
      setError(err?.message || "Impossible de charger les transferts.");
    }
  }

  async function handleLoadTransferDetails(transferId) {
    try {
      setTransferDetailsLoading(true);
      setError("");

      const response = await api.get(`/stock/transfers/${transferId}`);
      setSelectedTransfer(response.data.data || null);
    } catch (err) {
      setError(err?.message || "Impossible de charger le détail du transfert.");
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

  function resetForms() {
    setEntryForm(entryInitial);
    setExitForm(exitInitial);
    setAdjustmentForm(adjustmentInitial);
    setTransferForm({
      ...transferInitial,
      transfer_date: new Date().toISOString().split("T")[0],
      items: [{ ...transferItemInitial }]
    });
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
      setError(err?.message || "Erreur lors de l’entrée de stock.");
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
      setError(err?.message || "Erreur lors de la sortie de stock.");
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
      setError(err?.message || "Erreur lors de l’ajustement de stock.");
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
        unit_cost: item.unit_cost === "" ? 0 : Number(item.unit_cost),
        notes: item.notes.trim()
      }));

      const invalidItem = normalizedItems.find(
        (item) =>
          !Number.isInteger(item.product_id) ||
          item.product_id <= 0 ||
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0
      );

      if (invalidItem) {
        setError(
          "Chaque ligne de transfert doit contenir un produit valide et une quantité positive."
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
      setError(err?.message || "Erreur lors du transfert inter-dépôts.");
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
        row.warehouse_city
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
        row.notes
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
      TRANSFER_OUT: "bg-orange-100 text-orange-700"
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
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
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
              min="1"
              name="quantity"
              value={entryForm.quantity}
              onChange={handleEntryChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="100"
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
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
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
              min="1"
              name="quantity"
              value={exitForm.quantity}
              onChange={handleExitChange}
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
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
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
              name="new_quantity"
              value={adjustmentForm.new_quantity}
              onChange={handleAdjustmentChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="50"
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
                        {product.name} ({product.sku})
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
                    min="1"
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

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Stock"
        subtitle="Gestion des niveaux de stock, entrées, sorties, ajustements et transferts inter-dépôts"
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

      <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
        <div className="mb-5 flex flex-wrap gap-3">
          <button
            onClick={() => setActiveTab("entry")}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
              activeTab === "entry"
                ? "bg-brand-600 text-white"
                : "border border-slate-300 text-slate-700"
            }`}
          >
            Entrée stock
          </button>

          <button
            onClick={() => setActiveTab("exit")}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
              activeTab === "exit"
                ? "bg-brand-600 text-white"
                : "border border-slate-300 text-slate-700"
            }`}
          >
            Sortie stock
          </button>

          <button
            onClick={() => setActiveTab("adjustment")}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
              activeTab === "adjustment"
                ? "bg-brand-600 text-white"
                : "border border-slate-300 text-slate-700"
            }`}
          >
            Ajustement
          </button>

          <button
            onClick={() => setActiveTab("transfer")}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
              activeTab === "transfer"
                ? "bg-brand-600 text-white"
                : "border border-slate-300 text-slate-700"
            }`}
          >
            Transfert inter-dépôts
          </button>
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
                {selectedTransfer.source_warehouse_name} - {selectedTransfer.source_warehouse_city}
                {"  "}→{"  "}
                {selectedTransfer.destination_warehouse_name} - {selectedTransfer.destination_warehouse_city}
              </div>
            </div>

            <button
              onClick={() => setSelectedTransfer(null)}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Fermer
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Date</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {selectedTransfer.transfer_date}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Statut</div>
              <div className="mt-2">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getTransferStatusBadge(
                    selectedTransfer.status
                  )}`}
                >
                  {selectedTransfer.status}
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Source</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {selectedTransfer.source_warehouse_name}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Destination</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {selectedTransfer.destination_warehouse_name}
              </div>
            </div>
          </div>

          {selectedTransfer.notes ? (
            <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span className="font-semibold">Notes :</span> {selectedTransfer.notes}
            </div>
          ) : null}

          <TableCard
            title={`Lignes du transfert (${selectedTransfer.items?.length || 0})`}
            rows={selectedTransfer.items || []}
            emptyText="Aucune ligne de transfert"
            columns={[
              { key: "product_name", label: "Produit" },
              { key: "sku", label: "SKU" },
              { key: "quantity", label: "Quantité" },
              { key: "unit", label: "Unité" },
              { key: "unit_cost", label: "Coût unitaire" }
            ]}
          />
        </div>
      ) : null}

      <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-lg font-semibold text-slate-900">
            État du stock
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <select
              value={selectedWarehouse}
              onChange={(e) => handleWarehouseFilterChange(e.target.value)}
              className="w-full md:w-72 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
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
              placeholder="Rechercher dans le stock..."
              className="w-full md:w-80 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Chargement du stock...
            </div>
          ) : (
            <TableCard
              title={`Stock (${filteredStockRows.length})`}
              rows={filteredStockRows}
              emptyText="Aucune donnée de stock"
              columns={[
                { key: "product_name", label: "Produit" },
                { key: "sku", label: "SKU" },
                { key: "category", label: "Catégorie" },
                { key: "warehouse_name", label: "Dépôt" },
                { key: "warehouse_city", label: "Ville" },
                { key: "quantity", label: "Stock" },
                { key: "unit", label: "Unité" },
                {
                  key: "alert_threshold",
                  label: "Seuil",
                  render: (row) => (
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        Number(row.quantity) <= Number(row.alert_threshold)
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {row.alert_threshold}
                    </span>
                  )
                }
              ]}
            />
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-lg font-semibold text-slate-900">
            Historique des transferts
          </div>

          <input
            value={transferSearch}
            onChange={(e) => setTransferSearch(e.target.value)}
            placeholder="Rechercher un transfert..."
            className="w-full md:w-80 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
          />
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Chargement des transferts...
            </div>
          ) : (
            <TableCard
              title={`Transferts (${filteredTransfers.length})`}
              rows={filteredTransfers}
              emptyText="Aucun transfert inter-dépôts"
              columns={[
                {
                  key: "transfer_number",
                  label: "N° transfert",
                  render: (row) => (
                    <button
                      type="button"
                      onClick={() => handleLoadTransferDetails(row.id)}
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      {row.transfer_number}
                    </button>
                  )
                },
                {
                  key: "source_warehouse_name",
                  label: "Source",
                  render: (row) =>
                    `${row.source_warehouse_name} - ${row.source_warehouse_city}`
                },
                {
                  key: "destination_warehouse_name",
                  label: "Destination",
                  render: (row) =>
                    `${row.destination_warehouse_name} - ${row.destination_warehouse_city}`
                },
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
                { key: "items_count", label: "Lignes" },
                { key: "total_quantity", label: "Qté totale" },
                { key: "notes", label: "Notes" }
              ]}
            />
          )}
        </div>
      </div>

      {transferDetailsLoading ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Chargement du détail du transfert...
        </div>
      ) : null}

      <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-lg font-semibold text-slate-900">
            Historique des mouvements
          </div>

          <input
            value={movementSearch}
            onChange={(e) => setMovementSearch(e.target.value)}
            placeholder="Rechercher un mouvement..."
            className="w-full md:w-80 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
          />
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Chargement des mouvements...
            </div>
          ) : (
            <TableCard
              title={`Mouvements (${filteredMovements.length})`}
              rows={filteredMovements}
              emptyText="Aucun mouvement de stock"
              columns={[
                { key: "product_name", label: "Produit" },
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
                { key: "quantity", label: "Qté" },
                { key: "reference_type", label: "Référence" },
                { key: "notes", label: "Notes" },
                {
                  key: "created_at",
                  label: "Date",
                  render: (row) =>
                    new Date(row.created_at).toLocaleString("fr-FR")
                }
              ]}
            />
          )}
        </div>
      </div>
    </div>
  );
}