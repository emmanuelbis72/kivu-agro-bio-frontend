import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import TableCard from "../components/ui/TableCard";

const initialItem = {
  product_id: "",
  quantity: "",
  unit_price: ""
};

const initialForm = {
  customer_id: "",
  warehouse_id: "",
  invoice_date: new Date().toISOString().split("T")[0],
  discount_amount: "",
  tax_amount: "",
  notes: "",
  items: [{ ...initialItem }]
};

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

function getVariantLabel(item) {
  return item?.product_role === "finished_product" ? "Produit fini" : "Produit";
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);

  const pdfBaseUrl = import.meta.env.VITE_API_BASE_URL;

  async function fetchInitialData() {
    try {
      setLoading(true);
      setError("");

      const results = await Promise.allSettled([
        api.get("/invoices"),
        api.get("/customers"),
        api.get("/warehouses"),
        api.get("/products")
      ]);

      const [invoicesRes, customersRes, warehousesRes, productsRes] = results;
      const errors = [];

      if (invoicesRes.status === "fulfilled") {
        setInvoices(invoicesRes.value.data.data || []);
      } else {
        setInvoices([]);
        errors.push("factures");
      }

      if (customersRes.status === "fulfilled") {
        setCustomers(customersRes.value.data.data || []);
      } else {
        setCustomers([]);
        errors.push("clients");
      }

      if (warehousesRes.status === "fulfilled") {
        setWarehouses(warehousesRes.value.data.data || []);
      } else {
        setWarehouses([]);
        errors.push("depots");
      }

      if (productsRes.status === "fulfilled") {
        setProducts(productsRes.value.data.data || []);
      } else {
        setProducts([]);
        errors.push("produits");
      }

      if (errors.length > 0) {
        setError(
          `Certaines donnees de facturation n ont pas pu etre chargees : ${errors.join(", ")}.`
        );
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger les donnees de facturation."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInitialData();
  }, []);

  function resetForm() {
    setForm({
      ...initialForm,
      invoice_date: new Date().toISOString().split("T")[0],
      items: [{ ...initialItem }]
    });
    setEditingInvoiceId(null);
  }

  const saleProducts = useMemo(
    () => products.filter((product) => product.product_role === "finished_product"),
    [products]
  );

  const selectedCustomer = useMemo(() => {
    if (!form.customer_id) return null;

    return (
      customers.find(
        (customer) => Number(customer.id) === Number(form.customer_id)
      ) || null
    );
  }, [customers, form.customer_id]);

  const selectedCustomerWarehouseId = useMemo(() => {
    if (!selectedCustomer?.warehouse_id) return "";
    return String(selectedCustomer.warehouse_id);
  }, [selectedCustomer]);

  const availableWarehouses = useMemo(() => {
    if (!selectedCustomerWarehouseId) {
      return warehouses;
    }

    return warehouses.filter(
      (warehouse) => String(warehouse.id) === selectedCustomerWarehouseId
    );
  }, [warehouses, selectedCustomerWarehouseId]);

  useEffect(() => {
    if (!form.customer_id) {
      setForm((prev) => ({
        ...prev,
        warehouse_id: ""
      }));
      return;
    }

    if (!selectedCustomerWarehouseId) {
      return;
    }

    setForm((prev) => {
      if (String(prev.warehouse_id) === String(selectedCustomerWarehouseId)) {
        return prev;
      }

      return {
        ...prev,
        warehouse_id: String(selectedCustomerWarehouseId)
      };
    });
  }, [form.customer_id, selectedCustomerWarehouseId]);

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
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
        items: prev.items.filter((_, i) => i !== index)
      };
    });
  }

  const computedPreview = useMemo(() => {
    const discount = Number(form.discount_amount || 0);
    const tax = Number(form.tax_amount || 0);

    const subtotal = form.items.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.unit_price || 0);
    }, 0);

    return {
      subtotal,
      total: subtotal - discount + tax
    };
  }, [form]);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitLoading(true);
      setError("");
      setSuccessMessage("");

      if (!form.customer_id) {
        setError("Le client est obligatoire.");
        return;
      }

      if (!form.warehouse_id) {
        setError("Le depot est obligatoire.");
        return;
      }

      if (!form.items.length) {
        setError("Ajoute au moins une ligne de facture.");
        return;
      }

      const normalizedItems = form.items.map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price)
      }));

      const invalidItem = normalizedItems.find(
        (item) =>
          !Number.isInteger(item.product_id) ||
          item.product_id <= 0 ||
          !Number.isInteger(item.quantity) ||
          item.quantity <= 0 ||
          Number.isNaN(item.unit_price) ||
          item.unit_price < 0
      );

      if (invalidItem) {
        setError(
          "Chaque ligne doit avoir un produit fini valide, une quantite entiere positive et un prix correct."
        );
        return;
      }

      const payload = {
        customer_id: Number(form.customer_id),
        warehouse_id: Number(form.warehouse_id),
        invoice_date: form.invoice_date,
        discount_amount:
          form.discount_amount === "" ? 0 : Number(form.discount_amount),
        tax_amount: form.tax_amount === "" ? 0 : Number(form.tax_amount),
        notes: form.notes.trim(),
        items: normalizedItems
      };

      const response = editingInvoiceId
        ? await api.put(`/invoices/${editingInvoiceId}`, payload)
        : await api.post("/invoices", payload);
      const accounting = response?.data?.data?.accounting || null;

      if (accounting?.status === "posted") {
        setSuccessMessage(
          editingInvoiceId
            ? "Facture modifiee avec succes et ecriture comptable generee."
            : "Facture creee avec succes et ecriture comptable generee."
        );
      } else if (accounting?.status === "skipped") {
        setSuccessMessage(
          `${editingInvoiceId ? "Facture modifiee" : "Facture creee"} avec succes. Comptabilisation ignoree : ${
            accounting.reason || "parametrage manquant"
          }.`
        );
      } else if (accounting?.status === "error") {
        setSuccessMessage(
          `${editingInvoiceId ? "Facture modifiee" : "Facture creee"} avec succes. Comptabilisation en erreur : ${
            accounting.reason || "erreur inconnue"
          }.`
        );
      } else {
        setSuccessMessage(
          editingInvoiceId
            ? "Facture modifiee avec succes."
            : "Facture creee avec succes."
        );
      }

      resetForm();
      await fetchInitialData();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Erreur lors de la creation de la facture."
      );
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleViewInvoice(invoiceId) {
    try {
      setDetailsLoading(true);
      setError("");

      const response = await api.get(`/invoices/${invoiceId}`);
      setSelectedInvoice(response.data.data || null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger le detail de la facture."
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleEditInvoice(invoiceId) {
    try {
      setDetailsLoading(true);
      setError("");
      setSuccessMessage("");

      const response = await api.get(`/invoices/${invoiceId}`);
      const invoice = response.data.data || null;

      if (!invoice) {
        setError("Facture introuvable.");
        return;
      }

      if (Number(invoice.paid_amount || 0) > 0) {
        setError("Impossible de modifier une facture qui possede deja un paiement.");
        return;
      }

      setEditingInvoiceId(invoice.id);
      setSelectedInvoice(invoice);
      setForm({
        customer_id: String(invoice.customer_id || ""),
        warehouse_id: String(invoice.warehouse_id || ""),
        invoice_date: String(invoice.invoice_date || "").slice(0, 10),
        discount_amount: String(Number(invoice.discount_amount || 0)),
        tax_amount: String(Number(invoice.tax_amount || 0)),
        notes: invoice.notes || "",
        items: (invoice.items || []).map((item) => ({
          product_id: String(item.product_id || ""),
          quantity: String(Number(item.quantity || 0)),
          unit_price: String(Number(item.unit_price || 0))
        }))
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger la facture a modifier."
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleDeleteInvoice(invoiceId) {
    const confirmed = window.confirm(
      "Supprimer cette facture ? Le stock sorti par cette facture sera remis. Cette action est definitive."
    );

    if (!confirmed) {
      return;
    }

    try {
      setDetailsLoading(true);
      setError("");
      setSuccessMessage("");

      await api.delete(`/invoices/${invoiceId}`);

      if (editingInvoiceId === invoiceId) {
        resetForm();
      }

      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice(null);
      }

      setSuccessMessage("Facture supprimee avec succes.");
      await fetchInitialData();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de supprimer cette facture."
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  const filteredInvoices = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return invoices;
    }

    return invoices.filter((invoice) =>
      [
        invoice.invoice_number,
        invoice.customer_name,
        invoice.status,
        invoice.warehouse_name,
        invoice.accounting_status
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [invoices, search]);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Factures"
        subtitle="Creation et suivi des factures clients. Seuls les produits finis sont vendables."
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
              {editingInvoiceId ? "Modifier la facture" : "Creer une facture"}
            </div>
            {editingInvoiceId ? (
              <div className="mt-1 text-sm text-amber-700">
                Mode edition actif. Le stock de l'ancienne facture sera corrige automatiquement.
              </div>
            ) : null}
          </div>
          {editingInvoiceId ? (
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
                Client *
              </label>
              <select
                name="customer_id"
                value={form.customer_id}
                onChange={handleFormChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              >
                <option value="">Selectionner</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.business_name}
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
                disabled={Boolean(selectedCustomerWarehouseId)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500 disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="">Selectionner</option>
                {availableWarehouses.map((warehouse) => (
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
                Remise
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                name="discount_amount"
                value={form.discount_amount}
                onChange={handleFormChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                placeholder="0"
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
            La facture impacte uniquement le stock des produits finis. Les lignes de facture
            sont saisies en pieces, sans option de forme stock.
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-base font-semibold text-slate-900">
                Lignes de facture
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
                      Produit fini
                    </label>
                    <select
                      value={item.product_id}
                      onChange={(e) =>
                        handleItemChange(index, "product_id", e.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                    >
                      <option value="">Selectionner</option>
                      {saleProducts.map((product) => (
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
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, "quantity", e.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                      placeholder="1"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Prix unitaire
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) =>
                        handleItemChange(index, "unit_price", e.target.value)
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
                  ? editingInvoiceId
                    ? "Modification..."
                    : "Creation..."
                  : editingInvoiceId
                    ? "Enregistrer la modification"
                    : "Creer la facture"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {selectedInvoice ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-slate-900">
                Detail facture {selectedInvoice.invoice_number}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {selectedInvoice.customer_name} • {selectedInvoice.warehouse_name}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {getAccountingBadge(selectedInvoice)}

              <a
                href={`${pdfBaseUrl}/invoices/${selectedInvoice.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-700"
              >
                Ouvrir le PDF
              </a>

              <button
                onClick={() => handleEditInvoice(selectedInvoice.id)}
                className="rounded-2xl border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700"
              >
                Modifier
              </button>

              <button
                onClick={() => handleDeleteInvoice(selectedInvoice.id)}
                className="rounded-2xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700"
              >
                Supprimer
              </button>

              <button
                onClick={() => setSelectedInvoice(null)}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Fermer
              </button>
            </div>
          </div>

          {selectedInvoice.accounting_entry_id ? (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Ecriture comptable liee :{" "}
              <Link
                to={`/journal-entries/${selectedInvoice.accounting_entry_id}`}
                className="font-semibold text-brand-700 hover:underline"
              >
                #{selectedInvoice.accounting_entry_id}
              </Link>
            </div>
          ) : null}

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Statut</div>
              <div className="mt-2">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                    selectedInvoice.status
                  )}`}
                >
                  {selectedInvoice.status}
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Total</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {formatMoney(selectedInvoice.total_amount)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Paye</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {formatMoney(selectedInvoice.paid_amount)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Solde du</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {formatMoney(selectedInvoice.balance_due)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Profit brut</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {formatMoney(selectedInvoice.gross_profit_amount)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                COGS : {formatMoney(selectedInvoice.total_cogs_amount)}
              </div>
            </div>
          </div>

          <TableCard
            title="Lignes de facture"
            rows={selectedInvoice.items || []}
            emptyText="Aucune ligne"
            columns={[
              { key: "product_name", label: "Produit" },
              { key: "sku", label: "SKU" },
              { key: "product_role", label: "Role" },
              { key: "quantity", label: "Qte" },
              {
                key: "stock_form",
                label: "Variante stock",
                render: (row) => getVariantLabel(row)
              },
              {
                key: "unit_price",
                label: "P.U.",
                render: (row) => formatMoney(row.unit_price)
              },
              {
                key: "line_total",
                label: "Total",
                render: (row) => formatMoney(row.line_total)
              }
            ]}
          />
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="text-lg font-semibold text-slate-900">
            Liste des factures
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une facture..."
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500 md:w-80"
          />
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Chargement des factures...
            </div>
          ) : (
            <TableCard
              title={`Factures (${filteredInvoices.length})`}
              rows={filteredInvoices}
              emptyText="Aucune facture trouvee"
              columns={[
                { key: "invoice_number", label: "Facture" },
                { key: "customer_name", label: "Client" },
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
                  key: "gross_profit_amount",
                  label: "Profit brut",
                  render: (row) => formatMoney(row.gross_profit_amount)
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
                        onClick={() => handleViewInvoice(row.id)}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Voir
                      </button>
                      <button
                        onClick={() => handleEditInvoice(row.id)}
                        className="rounded-xl border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-700"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteInvoice(row.id)}
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
