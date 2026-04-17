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
    posted: "Comptabilisé",
    skipped: "Ignoré",
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

  const pdfBaseUrl = import.meta.env.VITE_API_BASE_URL;

  async function fetchInitialData() {
    try {
      setLoading(true);
      setError("");

      const [invoicesRes, customersRes, warehousesRes, productsRes] =
        await Promise.all([
          api.get("/invoices"),
          api.get("/customers"),
          api.get("/warehouses"),
          api.get("/products")
        ]);

      setInvoices(invoicesRes.data.data || []);
      setCustomers(customersRes.data.data || []);
      setWarehouses(warehousesRes.data.data || []);
      setProducts(productsRes.data.data || []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger les données de facturation."
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
  }

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

    if (name === "customer_id") {
      setForm((prev) => ({
        ...prev,
        customer_id: value
      }));
      return;
    }

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

      const updatedItems = prev.items.filter((_, i) => i !== index);
      return {
        ...prev,
        items: updatedItems
      };
    });
  }

  const computedPreview = useMemo(() => {
    const discount = Number(form.discount_amount || 0);
    const tax = Number(form.tax_amount || 0);

    const lines = form.items.map((item) => {
      const quantity = Number(item.quantity || 0);
      const unit_price = Number(item.unit_price || 0);
      return quantity * unit_price;
    });

    const subtotal = lines.reduce((sum, value) => sum + value, 0);
    const total = subtotal - discount + tax;

    return {
      subtotal,
      total
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
        setError("Le dépôt est obligatoire.");
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
          "Chaque ligne doit avoir un produit valide, une quantité entière positive et un prix unitaire valide."
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

      const response = await api.post("/invoices", payload);
      const accounting = response?.data?.data?.accounting || null;

      if (accounting?.status === "posted") {
        setSuccessMessage(
          "Facture créée avec succès et écriture comptable générée."
        );
      } else if (accounting?.status === "skipped") {
        setSuccessMessage(
          `Facture créée avec succès. Comptabilisation ignorée : ${
            accounting.reason || "paramétrage manquant"
          }.`
        );
      } else if (accounting?.status === "error") {
        setSuccessMessage(
          `Facture créée avec succès. Comptabilisation en erreur : ${
            accounting.reason || "erreur inconnue"
          }.`
        );
      } else {
        setSuccessMessage("Facture créée avec succès.");
      }

      resetForm();
      await fetchInitialData();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Erreur lors de la création de la facture."
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
          "Impossible de charger le détail de la facture."
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
        subtitle="Création et suivi des factures clients"
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
        <div className="mb-5 text-lg font-semibold text-slate-900">
          Créer une facture
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
                <option value="">Sélectionner</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.business_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Dépôt *
              </label>
              <select
                name="warehouse_id"
                value={form.warehouse_id}
                onChange={handleFormChange}
                disabled={Boolean(selectedCustomerWarehouseId)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500 disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="">Sélectionner</option>
                {availableWarehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} - {warehouse.city}
                  </option>
                ))}
              </select>

              {selectedCustomerWarehouseId ? (
                <p className="mt-2 text-xs text-slate-500">
                  Dépôt affecté automatiquement selon le point de vente sélectionné.
                </p>
              ) : (
                <p className="mt-2 text-xs text-amber-600">
                  Aucun dépôt lié trouvé pour ce client. Sélection manuelle requise.
                </p>
              )}
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
                      Produit
                    </label>
                    <select
                      value={item.product_id}
                      onChange={(e) =>
                        handleItemChange(index, "product_id", e.target.value)
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
                      Quantité
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

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeItemRow(index)}
                      className="w-full rounded-2xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-700"
                    >
                      Supprimer ligne
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
                {submitLoading ? "Création..." : "Créer la facture"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {selectedInvoice ? (
        <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
          <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-lg font-semibold text-slate-900">
                Détail facture {selectedInvoice.invoice_number}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {selectedInvoice.customer_name} • {selectedInvoice.warehouse_name}
              </div>
            </div>

            <div className="flex gap-2 items-center">
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
                onClick={() => setSelectedInvoice(null)}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Fermer
              </button>
            </div>
          </div>

          {selectedInvoice.accounting_entry_id ? (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Écriture comptable liée :{" "}
              <Link
                to={`/journal-entries/${selectedInvoice.accounting_entry_id}`}
                className="font-semibold text-brand-700 hover:underline"
              >
                #{selectedInvoice.accounting_entry_id}
              </Link>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
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
              <div className="text-sm text-slate-500">Payé</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {formatMoney(selectedInvoice.paid_amount)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Solde dû</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {formatMoney(selectedInvoice.balance_due)}
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
              { key: "quantity", label: "Qté" },
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

      <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="text-lg font-semibold text-slate-900">
            Liste des factures
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une facture..."
            className="w-full md:w-80 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
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
              emptyText="Aucune facture trouvée"
              columns={[
                { key: "invoice_number", label: "Facture" },
                { key: "customer_name", label: "Client" },
                { key: "warehouse_name", label: "Dépôt" },
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
                  key: "accounting_status",
                  label: "Compta",
                  render: (row) => getAccountingBadge(row)
                },
                {
                  key: "accounting_entry_id",
                  label: "Écriture",
                  render: (row) =>
                    row.accounting_entry_id ? (
                      <Link
                        to={`/journal-entries/${row.accounting_entry_id}`}
                        className="font-semibold text-brand-700 hover:underline"
                      >
                        #{row.accounting_entry_id}
                      </Link>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )
                },
                {
                  key: "total_amount",
                  label: "Montant",
                  render: (row) => formatMoney(row.total_amount)
                },
                {
                  key: "balance_due",
                  label: "Solde",
                  render: (row) => formatMoney(row.balance_due)
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewInvoice(row.id)}
                        disabled={detailsLoading}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Voir détail
                      </button>

                      <a
                        href={`${pdfBaseUrl}/invoices/${row.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-brand-300 px-3 py-2 text-xs font-semibold text-brand-700"
                      >
                        PDF
                      </a>
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