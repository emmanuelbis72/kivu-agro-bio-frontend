import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import TableCard from "../components/ui/TableCard";

const initialItem = {
  product_id: "",
  quantity: "",
  unit_cost: ""
};

const initialForm = {
  supplier_id: "",
  warehouse_id: "",
  invoice_date: new Date().toISOString().split("T")[0],
  due_date: "",
  tax_amount: "",
  notes: "",
  items: [{ ...initialItem }]
};

const initialPaymentForm = {
  amount: "",
  payment_date: new Date().toISOString().split("T")[0],
  payment_method: "cash",
  reference: "",
  notes: ""
};

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "bank_transfer", label: "Virement bancaire" },
  { value: "card", label: "Carte" }
];

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));
}

function getStatusBadge(status) {
  const map = {
    draft: "bg-slate-200 text-slate-700",
    issued: "bg-amber-100 text-amber-700",
    partial: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700"
  };

  return map[status] || "bg-slate-200 text-slate-700";
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

  const labelMap = {
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
      {labelMap[row.accounting_status] || row.accounting_status}
    </span>
  );
}

export default function PurchaseInvoicesPage() {
  const [searchParams] = useSearchParams();
  const requestedSupplierId = searchParams.get("supplierId") || "";
  const [purchaseInvoices, setPurchaseInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedPurchaseInvoice, setSelectedPurchaseInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(initialForm);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [editingPurchaseInvoiceId, setEditingPurchaseInvoiceId] = useState(null);

  async function fetchInitialData() {
    try {
      setLoading(true);
      setError("");

      const results = await Promise.allSettled([
        api.get("/purchase-invoices"),
        api.get("/suppliers"),
        api.get("/warehouses"),
        api.get("/products")
      ]);

      const [purchaseInvoicesRes, suppliersRes, warehousesRes, productsRes] = results;
      const errors = [];

      if (purchaseInvoicesRes.status === "fulfilled") {
        setPurchaseInvoices(purchaseInvoicesRes.value.data?.data || []);
      } else {
        setPurchaseInvoices([]);
        errors.push("factures fournisseurs");
      }

      if (suppliersRes.status === "fulfilled") {
        const rows = suppliersRes.value.data?.data || [];
        setSuppliers(rows);
      } else {
        setSuppliers([]);
        errors.push("fournisseurs");
      }

      if (warehousesRes.status === "fulfilled") {
        setWarehouses(warehousesRes.value.data?.data || []);
      } else {
        setWarehouses([]);
        errors.push("depots");
      }

      if (productsRes.status === "fulfilled") {
        setProducts(productsRes.value.data?.data || []);
      } else {
        setProducts([]);
        errors.push("produits");
      }

      if (errors.length > 0) {
        setError(
          `Certaines donnees achats n'ont pas pu etre chargees : ${errors.join(", ")}.`
        );
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger les donnees achats."
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
      invoice_date: new Date().toISOString().split("T")[0],
      items: [{ ...initialItem }]
    });
    setEditingPurchaseInvoiceId(null);
  }

  function resetPaymentForm(balanceDue = "") {
    setPaymentForm({
      ...initialPaymentForm,
      amount: balanceDue ? String(Number(balanceDue)) : "",
      payment_date: new Date().toISOString().split("T")[0]
    });
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function handlePaymentFormChange(event) {
    const { name, value } = event.target;
    setPaymentForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function handleItemChange(index, field, value) {
    setForm((prev) => {
      const updatedItems = [...prev.items];
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value
      };

      return {
        ...prev,
        items: updatedItems
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

  const purchaseProducts = useMemo(
    () => products.filter((product) => product.is_active !== false),
    [products]
  );

  const computedPreview = useMemo(() => {
    const taxAmount = Number(form.tax_amount || 0);
    const subtotal = form.items.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.unit_cost || 0);
    }, 0);

    return {
      subtotal,
      total: subtotal + taxAmount
    };
  }, [form]);

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
        setError("Ajoute au moins une ligne d'achat.");
        return;
      }

      const normalizedItems = form.items.map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
        unit_cost: Number(item.unit_cost)
      }));

      const invalidItem = normalizedItems.find(
        (item) =>
          !Number.isInteger(item.product_id) ||
          item.product_id <= 0 ||
          Number.isNaN(item.quantity) ||
          Number(item.quantity) <= 0 ||
          Number.isNaN(item.unit_cost) ||
          Number(item.unit_cost) < 0
      );

      if (invalidItem) {
        setError(
          "Chaque ligne doit avoir un produit valide, une quantite positive et un cout unitaire correct."
        );
        return;
      }

      const payload = {
        supplier_id: Number(form.supplier_id),
        warehouse_id: Number(form.warehouse_id),
        invoice_date: form.invoice_date,
        due_date: form.due_date || null,
        tax_amount: form.tax_amount === "" ? 0 : Number(form.tax_amount),
        notes: form.notes.trim(),
        items: normalizedItems
      };

      const response = editingPurchaseInvoiceId
        ? await api.put(`/purchase-invoices/${editingPurchaseInvoiceId}`, payload)
        : await api.post("/purchase-invoices", payload);
      const accounting = response?.data?.data?.accounting || null;

      if (accounting?.status === "posted") {
        setSuccessMessage(
          editingPurchaseInvoiceId
            ? "Facture fournisseur modifiee avec succes et ecriture comptable generee."
            : "Facture fournisseur creee avec succes et ecriture comptable generee."
        );
      } else if (accounting?.status === "skipped") {
        setSuccessMessage(
          `${editingPurchaseInvoiceId ? "Facture fournisseur modifiee" : "Facture fournisseur creee"} avec succes. Comptabilisation ignoree : ${
            accounting.reason || "parametrage manquant"
          }.`
        );
      } else if (accounting?.status === "error") {
        setSuccessMessage(
          `${editingPurchaseInvoiceId ? "Facture fournisseur modifiee" : "Facture fournisseur creee"} avec succes. Comptabilisation en erreur : ${
            accounting.reason || "erreur inconnue"
          }.`
        );
      } else {
        setSuccessMessage(
          editingPurchaseInvoiceId
            ? "Facture fournisseur modifiee avec succes."
            : "Facture fournisseur creee avec succes."
        );
      }

      resetForm();
      await fetchInitialData();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Erreur lors de la creation de la facture fournisseur."
      );
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleViewPurchaseInvoice(purchaseInvoiceId) {
    try {
      setDetailsLoading(true);
      setError("");

      const response = await api.get(`/purchase-invoices/${purchaseInvoiceId}`);
      const invoice = response.data?.data || null;
      setSelectedPurchaseInvoice(invoice);
      resetPaymentForm(invoice?.balance_due || "");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger le detail de la facture fournisseur."
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleEditPurchaseInvoice(purchaseInvoiceId) {
    try {
      setDetailsLoading(true);
      setError("");
      setSuccessMessage("");

      const response = await api.get(`/purchase-invoices/${purchaseInvoiceId}`);
      const purchaseInvoice = response.data?.data || null;

      if (!purchaseInvoice) {
        setError("Facture fournisseur introuvable.");
        return;
      }

      if (Number(purchaseInvoice.paid_amount || 0) > 0) {
        setError(
          "Impossible de modifier une facture fournisseur qui possede deja un paiement."
        );
        return;
      }

      setEditingPurchaseInvoiceId(purchaseInvoice.id);
      setSelectedPurchaseInvoice(purchaseInvoice);
      setForm({
        supplier_id: String(purchaseInvoice.supplier_id || ""),
        warehouse_id: String(purchaseInvoice.warehouse_id || ""),
        invoice_date: String(purchaseInvoice.invoice_date || "").slice(0, 10),
        due_date: purchaseInvoice.due_date
          ? String(purchaseInvoice.due_date).slice(0, 10)
          : "",
        tax_amount: String(Number(purchaseInvoice.tax_amount || 0)),
        notes: purchaseInvoice.notes || "",
        items: (purchaseInvoice.items || []).map((item) => ({
          product_id: String(item.product_id || ""),
          quantity: String(Number(item.quantity || 0)),
          unit_cost: String(Number(item.unit_cost || 0))
        }))
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger la facture fournisseur a modifier."
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleDeletePurchaseInvoice(purchaseInvoiceId) {
    const confirmed = window.confirm(
      "Supprimer cette facture fournisseur ? Le stock entre par cet achat sera retire. Cette action est definitive."
    );

    if (!confirmed) {
      return;
    }

    try {
      setDetailsLoading(true);
      setError("");
      setSuccessMessage("");

      await api.delete(`/purchase-invoices/${purchaseInvoiceId}`);

      if (editingPurchaseInvoiceId === purchaseInvoiceId) {
        resetForm();
      }

      if (selectedPurchaseInvoice?.id === purchaseInvoiceId) {
        setSelectedPurchaseInvoice(null);
      }

      setSuccessMessage("Facture fournisseur supprimee avec succes.");
      await fetchInitialData();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de supprimer cette facture fournisseur."
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleSupplierPaymentSubmit(event) {
    event.preventDefault();

    if (!selectedPurchaseInvoice) {
      return;
    }

    try {
      setPaymentLoading(true);
      setError("");
      setSuccessMessage("");

      const amount = Number(paymentForm.amount);

      if (Number.isNaN(amount) || amount <= 0) {
        setError("Le montant du paiement fournisseur doit etre superieur a 0.");
        return;
      }

      const response = await api.post(
        `/purchase-invoices/${selectedPurchaseInvoice.id}/payments`,
        {
          amount,
          payment_date: paymentForm.payment_date,
          payment_method: paymentForm.payment_method,
          reference: paymentForm.reference.trim(),
          notes: paymentForm.notes.trim()
        }
      );

      const accounting = response?.data?.data?.accounting || null;

      if (accounting?.status === "posted") {
        setSuccessMessage(
          "Paiement fournisseur enregistre avec succes et ecriture comptable generee."
        );
      } else if (accounting?.status === "skipped") {
        setSuccessMessage(
          `Paiement fournisseur enregistre avec succes. Comptabilisation ignoree : ${
            accounting.reason || "parametrage manquant"
          }.`
        );
      } else if (accounting?.status === "error") {
        setSuccessMessage(
          `Paiement fournisseur enregistre avec succes. Comptabilisation en erreur : ${
            accounting.reason || "erreur inconnue"
          }.`
        );
      } else {
        setSuccessMessage("Paiement fournisseur enregistre avec succes.");
      }

      await fetchInitialData();
      await handleViewPurchaseInvoice(selectedPurchaseInvoice.id);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible d'enregistrer ce paiement fournisseur."
      );
    } finally {
      setPaymentLoading(false);
    }
  }

  const filteredPurchaseInvoices = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return purchaseInvoices;
    }

    return purchaseInvoices.filter((invoice) =>
      [
        invoice.purchase_invoice_number,
        invoice.supplier_name,
        invoice.status,
        invoice.warehouse_name,
        invoice.accounting_status
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [purchaseInvoices, search]);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Achats / Factures fournisseurs"
        subtitle="Enregistre les achats, alimente le stock et suit les paiements fournisseurs."
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
              {editingPurchaseInvoiceId
                ? "Modifier la facture fournisseur"
                : "Creer une facture fournisseur"}
            </div>
            {editingPurchaseInvoiceId ? (
              <div className="mt-1 text-sm text-amber-700">
                Mode edition actif. Le stock de l'ancienne facture sera corrige automatiquement.
              </div>
            ) : null}
          </div>

          {editingPurchaseInvoiceId ? (
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
                Date facture
              </label>
              <input
                type="date"
                name="invoice_date"
                value={form.invoice_date}
                onChange={handleFormChange}
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
                value={form.due_date}
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
                placeholder="Notes internes"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Chaque facture fournisseur entree le stock dans le depot choisi et ouvre un solde fournisseur jusqu'au reglement.
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-base font-semibold text-slate-900">
                Lignes d'achat
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
                      Quantite
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(event) =>
                        handleItemChange(index, "quantity", event.target.value)
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
              <div className="text-sm text-slate-500">Sous-total</div>
              <div className="mt-2 text-xl font-bold text-slate-900">
                {formatMoney(computedPreview.subtotal)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Total</div>
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
                  ? editingPurchaseInvoiceId
                    ? "Modification..."
                    : "Creation..."
                  : editingPurchaseInvoiceId
                  ? "Enregistrer la modification"
                  : "Creer la facture fournisseur"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {selectedPurchaseInvoice ? (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-900">
                  Detail facture fournisseur {selectedPurchaseInvoice.purchase_invoice_number}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {selectedPurchaseInvoice.supplier_name} • {selectedPurchaseInvoice.warehouse_name}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {getAccountingBadge(selectedPurchaseInvoice)}

                <button
                  onClick={() => handleEditPurchaseInvoice(selectedPurchaseInvoice.id)}
                  className="rounded-2xl border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700"
                >
                  Modifier
                </button>

                <button
                  onClick={() => handleDeletePurchaseInvoice(selectedPurchaseInvoice.id)}
                  className="rounded-2xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700"
                >
                  Supprimer
                </button>

                <button
                  onClick={() => setSelectedPurchaseInvoice(null)}
                  className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Fermer
                </button>
              </div>
            </div>

            {selectedPurchaseInvoice.accounting_entry_id ? (
              <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Ecriture comptable liee : #{selectedPurchaseInvoice.accounting_entry_id}
              </div>
            ) : null}

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Statut</div>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                      selectedPurchaseInvoice.status
                    )}`}
                  >
                    {selectedPurchaseInvoice.status}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Total</div>
                <div className="mt-2 text-lg font-bold text-slate-900">
                  {formatMoney(selectedPurchaseInvoice.total_amount)}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Paye</div>
                <div className="mt-2 text-lg font-bold text-slate-900">
                  {formatMoney(selectedPurchaseInvoice.paid_amount)}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Solde du</div>
                <div className="mt-2 text-lg font-bold text-slate-900">
                  {formatMoney(selectedPurchaseInvoice.balance_due)}
                </div>
              </div>
            </div>

            <TableCard
              title="Lignes de facture fournisseur"
              rows={selectedPurchaseInvoice.items || []}
              emptyText="Aucune ligne"
              columns={[
                { key: "product_name", label: "Produit" },
                { key: "sku", label: "SKU" },
                { key: "quantity", label: "Qte" },
                {
                  key: "unit_cost",
                  label: "Cout unitaire",
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

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,420px)]">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
              <TableCard
                title={`Paiements fournisseurs (${selectedPurchaseInvoice.payments?.length || 0})`}
                rows={selectedPurchaseInvoice.payments || []}
                emptyText="Aucun paiement fournisseur"
                columns={[
                  { key: "payment_date", label: "Date" },
                  {
                    key: "amount",
                    label: "Montant",
                    render: (row) => formatMoney(row.amount)
                  },
                  { key: "payment_method", label: "Mode" },
                  { key: "reference", label: "Reference" },
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
                Enregistrer un paiement fournisseur
              </div>

              <form onSubmit={handleSupplierPaymentSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Montant
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    name="amount"
                    value={paymentForm.amount}
                    onChange={handlePaymentFormChange}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Date
                  </label>
                  <input
                    type="date"
                    name="payment_date"
                    value={paymentForm.payment_date}
                    onChange={handlePaymentFormChange}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Mode de paiement
                  </label>
                  <select
                    name="payment_method"
                    value={paymentForm.payment_method}
                    onChange={handlePaymentFormChange}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                  >
                    {paymentMethods.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Reference
                  </label>
                  <input
                    name="reference"
                    value={paymentForm.reference}
                    onChange={handlePaymentFormChange}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                    placeholder="Ex: VRT-2026-001"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={paymentForm.notes}
                    onChange={handlePaymentFormChange}
                    rows="3"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                    placeholder="Observations"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    paymentLoading ||
                    Number(selectedPurchaseInvoice.balance_due || 0) <= 0
                  }
                  className="w-full rounded-2xl bg-brand-600 px-5 py-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {paymentLoading ? "Enregistrement..." : "Enregistrer le paiement"}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="text-lg font-semibold text-slate-900">
            Liste des factures fournisseurs
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une facture fournisseur..."
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500 md:w-80"
          />
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Chargement des factures fournisseurs...
            </div>
          ) : (
            <TableCard
              title={`Factures fournisseurs (${filteredPurchaseInvoices.length})`}
              rows={filteredPurchaseInvoices}
              emptyText="Aucune facture fournisseur trouvee"
              columns={[
                { key: "purchase_invoice_number", label: "Facture" },
                { key: "supplier_name", label: "Fournisseur" },
                { key: "warehouse_name", label: "Depot" },
                { key: "invoice_date", label: "Date" },
                {
                  key: "status",
                  label: "Statut",
                  render: (row) => (
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                        row.status
                      )}`}
                    >
                      {row.status}
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
                  label: "Solde du",
                  render: (row) => formatMoney(row.balance_due)
                },
                {
                  key: "accounting_status",
                  label: "Compta",
                  render: (row) => getAccountingBadge(row)
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleViewPurchaseInvoice(row.id)}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Voir
                      </button>
                      <button
                        onClick={() => handleEditPurchaseInvoice(row.id)}
                        className="rounded-xl border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-700"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDeletePurchaseInvoice(row.id)}
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
    </div>
  );
}
