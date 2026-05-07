import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import TableCard from "../components/ui/TableCard";

const initialItem = {
  product_id: "",
  ordered_quantity: "",
  unit_cost: ""
};

const initialForm = {
  supplier_id: "",
  warehouse_id: "",
  order_date: new Date().toISOString().split("T")[0],
  expected_date: "",
  tax_amount: "",
  notes: "",
  items: [{ ...initialItem }]
};

function createInitialReceiveForm(purchaseOrder = null) {
  return {
    purchase_invoice_number: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: "",
    tax_amount: "",
    notes: purchaseOrder
      ? `Reception de commande ${purchaseOrder.purchase_order_number}`
      : "",
    items: (purchaseOrder?.items || [])
      .filter((item) => Number(item.remaining_quantity || 0) > 0)
      .map((item) => ({
        purchase_order_item_id: String(item.id),
        product_name: item.product_name || "",
        sku: item.sku || "",
        remaining_quantity: String(Number(item.remaining_quantity || 0)),
        received_quantity: String(Number(item.remaining_quantity || 0)),
        unit_cost: String(Number(item.unit_cost || 0))
      }))
  };
}

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

function getStatusMeta(status) {
  const normalized = String(status || "").toLowerCase();

  switch (normalized) {
    case "draft":
      return { label: "Brouillon", className: "bg-slate-200 text-slate-700" };
    case "ordered":
      return { label: "Commandee", className: "bg-blue-100 text-blue-700" };
    case "partially_received":
      return {
        label: "Reception partielle",
        className: "bg-amber-100 text-amber-700"
      };
    case "received":
      return { label: "Receptionnee", className: "bg-green-100 text-green-700" };
    case "cancelled":
      return { label: "Annulee", className: "bg-red-100 text-red-700" };
    default:
      return {
        label: status || "-",
        className: "bg-slate-200 text-slate-700"
      };
  }
}

function getPurchaseInvoiceStatusMeta(status) {
  const normalized = String(status || "").toLowerCase();

  switch (normalized) {
    case "draft":
      return { label: "Brouillon", className: "bg-slate-200 text-slate-700" };
    case "issued":
      return { label: "Impayee", className: "bg-amber-100 text-amber-700" };
    case "partial":
      return { label: "Partielle", className: "bg-blue-100 text-blue-700" };
    case "paid":
      return { label: "Reglee", className: "bg-green-100 text-green-700" };
    case "cancelled":
      return { label: "Annulee", className: "bg-red-100 text-red-700" };
    default:
      return {
        label: status || "-",
        className: "bg-slate-200 text-slate-700"
      };
  }
}

function getAccountingBadge(row) {
  if (!row?.accounting_status) {
    return <span className="text-slate-400">-</span>;
  }

  const map = {
    posted: "bg-green-100 text-green-700",
    skipped: "bg-amber-100 text-amber-700",
    error: "bg-red-100 text-red-700"
  };

  const labels = {
    posted: "Comptabilise",
    skipped: "Ignore",
    error: "Erreur"
  };

  return (
    <span
      title={row.accounting_message || ""}
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        map[row.accounting_status] || "bg-slate-200 text-slate-700"
      }`}
    >
      {labels[row.accounting_status] || row.accounting_status}
    </span>
  );
}

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedSupplierId = searchParams.get("supplierId") || "";
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [receivingLoading, setReceivingLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [editingPurchaseOrderId, setEditingPurchaseOrderId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [receiveForm, setReceiveForm] = useState(createInitialReceiveForm());

  async function fetchInitialData() {
    try {
      setLoading(true);
      setError("");

      const results = await Promise.allSettled([
        api.get("/purchase-orders"),
        api.get("/suppliers"),
        api.get("/warehouses"),
        api.get("/products")
      ]);

      const [ordersRes, suppliersRes, warehousesRes, productsRes] = results;
      const failed = [];

      if (ordersRes.status === "fulfilled") {
        setPurchaseOrders(ordersRes.value.data?.data || []);
      } else {
        setPurchaseOrders([]);
        failed.push("commandes d'achat");
      }

      if (suppliersRes.status === "fulfilled") {
        setSuppliers(suppliersRes.value.data?.data || []);
      } else {
        setSuppliers([]);
        failed.push("fournisseurs");
      }

      if (warehousesRes.status === "fulfilled") {
        setWarehouses(warehousesRes.value.data?.data || []);
      } else {
        setWarehouses([]);
        failed.push("depots");
      }

      if (productsRes.status === "fulfilled") {
        setProducts(productsRes.value.data?.data || []);
      } else {
        setProducts([]);
        failed.push("produits");
      }

      if (failed.length > 0) {
        setError(
          `Certaines donnees achats n'ont pas pu etre chargees : ${failed.join(", ")}.`
        );
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger les commandes d'achat."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!requestedSupplierId) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      supplier_id: String(requestedSupplierId)
    }));
  }, [requestedSupplierId]);

  function resetForm() {
    setForm({
      ...initialForm,
      supplier_id: requestedSupplierId || "",
      order_date: new Date().toISOString().split("T")[0],
      items: [{ ...initialItem }]
    });
    setEditingPurchaseOrderId(null);
  }

  function resetReceiveForm(purchaseOrder = selectedPurchaseOrder) {
    setReceiveForm(createInitialReceiveForm(purchaseOrder));
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function handleItemChange(index, field, value) {
    setForm((prev) => {
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

  function addItemRow() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...initialItem }]
    }));
  }

  function removeItemRow(index) {
    setForm((prev) => {
      if (prev.items.length === 1) {
        return prev;
      }

      return {
        ...prev,
        items: prev.items.filter((_, currentIndex) => currentIndex !== index)
      };
    });
  }

  function handleReceiveFormChange(event) {
    const { name, value } = event.target;
    setReceiveForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function handleReceiveItemChange(index, field, value) {
    setReceiveForm((prev) => {
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

  const purchaseProducts = useMemo(
    () => products.filter((product) => product.is_active !== false),
    [products]
  );

  const computedPreview = useMemo(() => {
    const subtotal = form.items.reduce((sum, item) => {
      return (
        sum +
        Number(item.ordered_quantity || 0) * Number(item.unit_cost || 0)
      );
    }, 0);
    const taxAmount = Number(form.tax_amount || 0);

    return {
      subtotal,
      total: subtotal + taxAmount
    };
  }, [form]);

  const computedReceivePreview = useMemo(() => {
    const subtotal = receiveForm.items.reduce((sum, item) => {
      return (
        sum +
        Number(item.received_quantity || 0) * Number(item.unit_cost || 0)
      );
    }, 0);
    const taxAmount = Number(receiveForm.tax_amount || 0);

    return {
      subtotal,
      total: subtotal + taxAmount
    };
  }, [receiveForm]);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitLoading(true);
      setError("");
      setSuccessMessage("");

      if (!form.supplier_id) {
        setError("Le fournisseur est obligatoire.");
        return;
      }

      if (!form.warehouse_id) {
        setError("Le depot est obligatoire.");
        return;
      }

      if (!form.items.length) {
        setError("Ajoute au moins une ligne de commande.");
        return;
      }

      const normalizedItems = form.items.map((item) => ({
        product_id: Number(item.product_id),
        ordered_quantity: Number(item.ordered_quantity),
        unit_cost: Number(item.unit_cost)
      }));

      const invalidItem = normalizedItems.find(
        (item) =>
          !Number.isInteger(item.product_id) ||
          item.product_id <= 0 ||
          Number.isNaN(item.ordered_quantity) ||
          item.ordered_quantity <= 0 ||
          Number.isNaN(item.unit_cost) ||
          item.unit_cost < 0
      );

      if (invalidItem) {
        setError(
          "Chaque ligne doit avoir un produit valide, une quantite commandee positive et un cout unitaire correct."
        );
        return;
      }

      const payload = {
        supplier_id: Number(form.supplier_id),
        warehouse_id: Number(form.warehouse_id),
        order_date: form.order_date,
        expected_date: form.expected_date || null,
        tax_amount: form.tax_amount === "" ? 0 : Number(form.tax_amount),
        notes: form.notes.trim(),
        items: normalizedItems
      };

      if (editingPurchaseOrderId) {
        await api.put(`/purchase-orders/${editingPurchaseOrderId}`, payload);
        setSuccessMessage("Commande d'achat modifiee avec succes.");
      } else {
        await api.post("/purchase-orders", payload);
        setSuccessMessage("Commande d'achat creee avec succes.");
      }

      resetForm();
      await fetchInitialData();
    } catch (err) {
      const apiErrors = err?.response?.data?.errors;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(apiErrors.join(" "));
      } else {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Impossible d'enregistrer la commande d'achat."
        );
      }
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleViewPurchaseOrder(purchaseOrderId) {
    try {
      setDetailsLoading(true);
      setError("");

      const response = await api.get(`/purchase-orders/${purchaseOrderId}`);
      const purchaseOrder = response.data?.data || null;
      setSelectedPurchaseOrder(purchaseOrder);
      setReceiveForm(createInitialReceiveForm(purchaseOrder));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger le detail de la commande d'achat."
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleEditPurchaseOrder(purchaseOrderId) {
    try {
      setDetailsLoading(true);
      setError("");
      setSuccessMessage("");

      const response = await api.get(`/purchase-orders/${purchaseOrderId}`);
      const purchaseOrder = response.data?.data || null;

      if (!purchaseOrder) {
        setError("Commande d'achat introuvable.");
        return;
      }

      if (Number(purchaseOrder.total_received_quantity || 0) > 0) {
        setError(
          "Impossible de modifier une commande d'achat deja receptionnee partiellement."
        );
        return;
      }

      setEditingPurchaseOrderId(purchaseOrder.id);
      setSelectedPurchaseOrder(purchaseOrder);
      setReceiveForm(createInitialReceiveForm(purchaseOrder));
      setForm({
        supplier_id: String(purchaseOrder.supplier_id || ""),
        warehouse_id: String(purchaseOrder.warehouse_id || ""),
        order_date: String(purchaseOrder.order_date || "").slice(0, 10),
        expected_date: purchaseOrder.expected_date
          ? String(purchaseOrder.expected_date).slice(0, 10)
          : "",
        tax_amount: String(Number(purchaseOrder.tax_amount || 0)),
        notes: purchaseOrder.notes || "",
        items: (purchaseOrder.items || []).map((item) => ({
          product_id: String(item.product_id || ""),
          ordered_quantity: String(Number(item.ordered_quantity || 0)),
          unit_cost: String(Number(item.unit_cost || 0))
        }))
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger la commande d'achat a modifier."
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleDeletePurchaseOrder(purchaseOrderId) {
    const confirmed = window.confirm(
      "Supprimer cette commande d'achat ? Cette action est definitive."
    );

    if (!confirmed) {
      return;
    }

    try {
      setDetailsLoading(true);
      setError("");
      setSuccessMessage("");

      await api.delete(`/purchase-orders/${purchaseOrderId}`);

      if (editingPurchaseOrderId === purchaseOrderId) {
        resetForm();
      }

      if (selectedPurchaseOrder?.id === purchaseOrderId) {
        setSelectedPurchaseOrder(null);
        resetReceiveForm(null);
      }

      setSuccessMessage("Commande d'achat supprimee avec succes.");
      await fetchInitialData();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de supprimer cette commande d'achat."
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleReceiveSubmit(event) {
    event.preventDefault();

    if (!selectedPurchaseOrder) {
      return;
    }

    try {
      setReceivingLoading(true);
      setError("");
      setSuccessMessage("");

      const normalizedItems = receiveForm.items.map((item) => ({
        purchase_order_item_id: Number(item.purchase_order_item_id),
        received_quantity: Number(item.received_quantity || 0),
        unit_cost:
          item.unit_cost === "" ? null : Number(item.unit_cost)
      }));

      const invalidItem = normalizedItems.find(
        (item) =>
          !Number.isInteger(item.purchase_order_item_id) ||
          item.purchase_order_item_id <= 0 ||
          Number.isNaN(item.received_quantity) ||
          item.received_quantity < 0 ||
          (item.unit_cost !== null &&
            (Number.isNaN(item.unit_cost) || item.unit_cost < 0))
      );

      if (invalidItem) {
        setError(
          "Chaque ligne de reception doit avoir une ligne valide, une quantite recue positive ou nulle et un cout correct."
        );
        return;
      }

      if (!normalizedItems.some((item) => item.received_quantity > 0)) {
        setError("Renseigne au moins une quantite recue superieure a 0.");
        return;
      }

      const response = await api.post(
        `/purchase-orders/${selectedPurchaseOrder.id}/receive`,
        {
          purchase_invoice_number:
            receiveForm.purchase_invoice_number.trim() || undefined,
          invoice_date: receiveForm.invoice_date,
          due_date: receiveForm.due_date || null,
          tax_amount:
            receiveForm.tax_amount === "" ? 0 : Number(receiveForm.tax_amount),
          notes: receiveForm.notes.trim(),
          items: normalizedItems
        }
      );

      const accounting = response?.data?.data?.accounting || null;
      const purchaseInvoice =
        response?.data?.data?.purchase_invoice || null;

      if (accounting?.status === "posted") {
        setSuccessMessage(
          `Reception enregistree avec succes. Facture fournisseur ${purchaseInvoice?.purchase_invoice_number || ""} creee et comptabilisee.`
        );
      } else if (accounting?.status === "skipped") {
        setSuccessMessage(
          `Reception enregistree avec succes. Facture fournisseur ${purchaseInvoice?.purchase_invoice_number || ""} creee. Comptabilisation ignoree : ${
            accounting.reason || "parametrage manquant"
          }.`
        );
      } else if (accounting?.status === "error") {
        setSuccessMessage(
          `Reception enregistree avec succes. Facture fournisseur ${purchaseInvoice?.purchase_invoice_number || ""} creee. Comptabilisation en erreur : ${
            accounting.reason || "erreur inconnue"
          }.`
        );
      } else {
        setSuccessMessage(
          `Reception enregistree avec succes. Facture fournisseur ${purchaseInvoice?.purchase_invoice_number || ""} creee.`
        );
      }

      await fetchInitialData();
      await handleViewPurchaseOrder(selectedPurchaseOrder.id);
    } catch (err) {
      const apiErrors = err?.response?.data?.errors;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(apiErrors.join(" "));
      } else {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Impossible d'enregistrer cette reception."
        );
      }
    } finally {
      setReceivingLoading(false);
    }
  }

  const filteredPurchaseOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return purchaseOrders;
    }

    return purchaseOrders.filter((purchaseOrder) =>
      [
        purchaseOrder.purchase_order_number,
        purchaseOrder.supplier_name,
        purchaseOrder.warehouse_name,
        purchaseOrder.warehouse_city,
        purchaseOrder.status
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [purchaseOrders, search]);

  const hasRemainingItems = useMemo(
    () =>
      (selectedPurchaseOrder?.items || []).some(
        (item) => Number(item.remaining_quantity || 0) > 0
      ),
    [selectedPurchaseOrder]
  );

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Commandes d'achat"
        subtitle="Prepare les commandes fournisseurs, enregistre les receptions et genere automatiquement les factures fournisseurs d'entree en stock."
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

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-900">
              {editingPurchaseOrderId
                ? "Modifier la commande d'achat"
                : "Creer une commande d'achat"}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              La commande prepare l'approvisionnement. La reception fera entrer le stock et creera une facture fournisseur.
            </div>
          </div>

          {editingPurchaseOrderId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Annuler la modification
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Fournisseur *
              </label>
              <select
                name="supplier_id"
                value={form.supplier_id}
                onChange={handleFormChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              >
                <option value="">Selectionner</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.business_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Depot *
              </label>
              <select
                name="warehouse_id"
                value={form.warehouse_id}
                onChange={handleFormChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              >
                <option value="">Selectionner</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} - {warehouse.city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Date commande
              </label>
              <input
                type="date"
                name="order_date"
                value={form.order_date}
                onChange={handleFormChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Date prevue
              </label>
              <input
                type="date"
                name="expected_date"
                value={form.expected_date}
                onChange={handleFormChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Taxe
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                name="tax_amount"
                value={form.tax_amount}
                onChange={handleFormChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                placeholder="0"
              />
            </div>

            <div className="md:col-span-2 xl:col-span-3">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Notes
              </label>
              <input
                name="notes"
                value={form.notes}
                onChange={handleFormChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                placeholder="Consignes, delai, observations"
              />
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-base font-semibold text-slate-900">
                Lignes de commande
              </div>
              <button
                type="button"
                onClick={addItemRow}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                + Ajouter une ligne
              </button>
            </div>

            <div className="space-y-4">
              {form.items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 p-4 md:grid-cols-4"
                >
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Produit
                    </label>
                    <select
                      value={item.product_id}
                      onChange={(event) =>
                        handleItemChange(index, "product_id", event.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                    >
                      <option value="">Selectionner</option>
                      {purchaseProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Quantite commandee
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.ordered_quantity}
                      onChange={(event) =>
                        handleItemChange(
                          index,
                          "ordered_quantity",
                          event.target.value
                        )
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                      placeholder="1"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Cout unitaire
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_cost}
                      onChange={(event) =>
                        handleItemChange(index, "unit_cost", event.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                      placeholder="0"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={addItemRow}
                      className="flex-1 rounded-2xl border border-brand-300 px-4 py-3 text-sm font-semibold text-brand-700"
                    >
                      + Ajouter ligne
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItemRow(index)}
                      className="flex-1 rounded-2xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-700"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Sous-total commande</div>
              <div className="mt-2 text-xl font-bold text-slate-900">
                {formatMoney(computedPreview.subtotal)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Total commande</div>
              <div className="mt-2 text-xl font-bold text-slate-900">
                {formatMoney(computedPreview.total)}
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitLoading}
                className="w-full rounded-2xl bg-brand-600 px-5 py-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitLoading
                  ? editingPurchaseOrderId
                    ? "Modification..."
                    : "Creation..."
                  : editingPurchaseOrderId
                  ? "Enregistrer la modification"
                  : "Creer la commande d'achat"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {selectedPurchaseOrder ? (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-900">
                  Detail commande {selectedPurchaseOrder.purchase_order_number}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {selectedPurchaseOrder.supplier_name} -{" "}
                  {selectedPurchaseOrder.warehouse_name}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/purchase-invoices?supplierId=${selectedPurchaseOrder.supplier_id}`
                    )
                  }
                  className="rounded-2xl border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-700"
                >
                  Ouvrir les achats
                </button>
                <button
                  type="button"
                  onClick={() => handleEditPurchaseOrder(selectedPurchaseOrder.id)}
                  className="rounded-2xl border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePurchaseOrder(selectedPurchaseOrder.id)}
                  className="rounded-2xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700"
                >
                  Supprimer
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPurchaseOrder(null)}
                  className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Fermer
                </button>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Statut</div>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      getStatusMeta(selectedPurchaseOrder.status).className
                    }`}
                  >
                    {getStatusMeta(selectedPurchaseOrder.status).label}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Qte commandee</div>
                <div className="mt-2 text-lg font-bold text-slate-900">
                  {formatNumber(selectedPurchaseOrder.total_ordered_quantity)}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Qte recue</div>
                <div className="mt-2 text-lg font-bold text-slate-900">
                  {formatNumber(selectedPurchaseOrder.total_received_quantity)}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Total commande</div>
                <div className="mt-2 text-lg font-bold text-slate-900">
                  {formatMoney(selectedPurchaseOrder.total_amount)}
                </div>
              </div>
            </div>

            <TableCard
              title="Lignes de commande"
              rows={selectedPurchaseOrder.items || []}
              emptyText="Aucune ligne"
              columns={[
                { key: "product_name", label: "Produit" },
                { key: "sku", label: "SKU" },
                {
                  key: "ordered_quantity",
                  label: "Commande",
                  render: (row) => formatNumber(row.ordered_quantity)
                },
                {
                  key: "received_quantity",
                  label: "Recue",
                  render: (row) => formatNumber(row.received_quantity)
                },
                {
                  key: "remaining_quantity",
                  label: "Reste",
                  render: (row) => (
                    <span className="font-semibold text-slate-900">
                      {formatNumber(row.remaining_quantity)}
                    </span>
                  )
                },
                {
                  key: "unit_cost",
                  label: "Cout unit.",
                  render: (row) => formatMoney(row.unit_cost)
                },
                {
                  key: "line_total",
                  label: "Total",
                  render: (row) => formatMoney(row.line_total)
                }
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,420px)]">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
              <TableCard
                title={`Factures fournisseurs generees (${selectedPurchaseOrder.related_invoices?.length || 0})`}
                rows={selectedPurchaseOrder.related_invoices || []}
                emptyText="Aucune reception facturee"
                columns={[
                  { key: "purchase_invoice_number", label: "Facture" },
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
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          getPurchaseInvoiceStatusMeta(row.status).className
                        }`}
                      >
                        {getPurchaseInvoiceStatusMeta(row.status).label}
                      </span>
                    )
                  },
                  {
                    key: "total_amount",
                    label: "Total",
                    render: (row) => formatMoney(row.total_amount)
                  },
                  {
                    key: "balance_due",
                    label: "Solde",
                    render: (row) => formatMoney(row.balance_due)
                  },
                  {
                    key: "accounting_status",
                    label: "Compta",
                    render: (row) => getAccountingBadge(row)
                  }
                ]}
              />
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
              <div className="mb-5 text-lg font-semibold text-slate-900">
                Reception et entree en stock
              </div>

              {!hasRemainingItems ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-700">
                  Cette commande est completement receptionnee. Toutes les quantites ont deja ete entrees en stock.
                </div>
              ) : (
                <form onSubmit={handleReceiveSubmit} className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Chaque reception cree automatiquement une facture fournisseur et une entree de stock dans le depot de la commande.
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Numero facture fournisseur
                    </label>
                    <input
                      name="purchase_invoice_number"
                      value={receiveForm.purchase_invoice_number}
                      onChange={handleReceiveFormChange}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                      placeholder="Laisser vide pour numerotation automatique"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Date facture
                      </label>
                      <input
                        type="date"
                        name="invoice_date"
                        value={receiveForm.invoice_date}
                        onChange={handleReceiveFormChange}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Echeance
                      </label>
                      <input
                        type="date"
                        name="due_date"
                        value={receiveForm.due_date}
                        onChange={handleReceiveFormChange}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Taxe
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="tax_amount"
                      value={receiveForm.tax_amount}
                      onChange={handleReceiveFormChange}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-3">
                    {receiveForm.items.map((item, index) => (
                      <div
                        key={item.purchase_order_item_id}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="text-sm font-semibold text-slate-900">
                          {item.product_name}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {item.sku || "-"} - Reste a recevoir :{" "}
                          {formatNumber(item.remaining_quantity)}
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                              Quantite recue
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.received_quantity}
                              onChange={(event) =>
                                handleReceiveItemChange(
                                  index,
                                  "received_quantity",
                                  event.target.value
                                )
                              }
                              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                              Cout unitaire
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_cost}
                              onChange={(event) =>
                                handleReceiveItemChange(
                                  index,
                                  "unit_cost",
                                  event.target.value
                                )
                              }
                              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={receiveForm.notes}
                      onChange={handleReceiveFormChange}
                      rows="3"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                      placeholder="Observations sur la reception"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-sm text-slate-500">
                        Sous-total reception
                      </div>
                      <div className="mt-2 text-lg font-bold text-slate-900">
                        {formatMoney(computedReceivePreview.subtotal)}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-sm text-slate-500">
                        Total facture creee
                      </div>
                      <div className="mt-2 text-lg font-bold text-slate-900">
                        {formatMoney(computedReceivePreview.total)}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={receivingLoading}
                      className="flex-1 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {receivingLoading
                        ? "Reception..."
                        : "Enregistrer la reception"}
                    </button>
                    <button
                      type="button"
                      onClick={() => resetReceiveForm(selectedPurchaseOrder)}
                      className="rounded-2xl border border-slate-300 px-5 py-4 text-sm font-semibold text-slate-700"
                    >
                      Reinitialiser
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="text-lg font-semibold text-slate-900">
            Liste des commandes d'achat
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une commande d'achat..."
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500 md:w-80"
          />
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Chargement des commandes d'achat...
            </div>
          ) : (
            <TableCard
              title={`Commandes d'achat (${filteredPurchaseOrders.length})`}
              rows={filteredPurchaseOrders}
              emptyText="Aucune commande d'achat trouvee"
              columns={[
                { key: "purchase_order_number", label: "Commande" },
                { key: "supplier_name", label: "Fournisseur" },
                { key: "warehouse_name", label: "Depot" },
                {
                  key: "order_date",
                  label: "Date",
                  render: (row) => formatDate(row.order_date)
                },
                {
                  key: "expected_date",
                  label: "Prevue",
                  render: (row) => formatDate(row.expected_date)
                },
                {
                  key: "status",
                  label: "Statut",
                  render: (row) => (
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        getStatusMeta(row.status).className
                      }`}
                    >
                      {getStatusMeta(row.status).label}
                    </span>
                  )
                },
                {
                  key: "total_ordered_quantity",
                  label: "Qte cmd.",
                  render: (row) => formatNumber(row.total_ordered_quantity)
                },
                {
                  key: "total_received_quantity",
                  label: "Qte recue",
                  render: (row) => formatNumber(row.total_received_quantity)
                },
                {
                  key: "total_amount",
                  label: "Total",
                  render: (row) => formatMoney(row.total_amount)
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewPurchaseOrder(row.id)}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Voir
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditPurchaseOrder(row.id)}
                        className="rounded-xl border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-700"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePurchaseOrder(row.id)}
                        className="rounded-xl border border-red-300 px-3 py-2 text-xs font-semibold text-red-700"
                      >
                        Supprimer
                      </button>
                    </div>
                  )
                }
              ]}
            />
          )}
        </div>
      </div>

      {detailsLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Chargement du detail de la commande d'achat...
        </div>
      ) : null}
    </div>
  );
}
