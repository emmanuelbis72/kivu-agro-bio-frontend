import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import TableCard from "../components/ui/TableCard";

const initialForm = {
  supplier_type: "vendor",
  business_name: "",
  contact_name: "",
  phone: "",
  email: "",
  city: "",
  address: "",
  payment_terms_days: "",
  credit_limit: "",
  notes: "",
  payable_account_id: "",
  is_active: true
};

const supplierTypeOptions = [
  { value: "vendor", label: "Fournisseur" },
  { value: "service_provider", label: "Prestataire" },
  { value: "transporter", label: "Transporteur" },
  { value: "landlord", label: "Bailleur" },
  { value: "other", label: "Autre" }
];

function normalizeForm(form) {
  return {
    supplier_type: form.supplier_type.trim() || "vendor",
    business_name: form.business_name.trim(),
    contact_name: form.contact_name.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    city: form.city.trim(),
    address: form.address.trim(),
    payment_terms_days:
      form.payment_terms_days === "" ? 0 : Number(form.payment_terms_days),
    credit_limit: form.credit_limit === "" ? 0 : Number(form.credit_limit),
    notes: form.notes.trim(),
    payable_account_id:
      form.payable_account_id === "" ? null : Number(form.payable_account_id),
    is_active: Boolean(form.is_active)
  };
}

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));
}

function formatSupplierTypeLabel(value) {
  const match = supplierTypeOptions.find((option) => option.value === value);
  return match ? match.label : value || "-";
}

export default function SuppliersPage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [editingSupplierId, setEditingSupplierId] = useState(null);
  const [form, setForm] = useState(initialForm);

  async function fetchPageData() {
    try {
      setLoading(true);
      setError("");

      const [suppliersResult, accountsResult] = await Promise.allSettled([
        api.get("/suppliers"),
        api.get("/accounts")
      ]);

      if (suppliersResult.status === "fulfilled") {
        setSuppliers(suppliersResult.value.data?.data || []);
      } else {
        throw suppliersResult.reason;
      }

      if (accountsResult.status === "fulfilled") {
        setAccounts(accountsResult.value.data?.data || []);
      } else {
        setAccounts([]);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger les fournisseurs."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPageData();
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingSupplierId(null);
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function handleEdit(supplier) {
    setEditingSupplierId(supplier.id);
    setError("");
    setSuccessMessage("");

    setForm({
      supplier_type: supplier.supplier_type || "vendor",
      business_name: supplier.business_name || "",
      contact_name: supplier.contact_name || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      city: supplier.city || "",
      address: supplier.address || "",
      payment_terms_days: supplier.payment_terms_days ?? "",
      credit_limit: supplier.credit_limit ?? "",
      notes: supplier.notes || "",
      payable_account_id: supplier.payable_account_id ?? "",
      is_active: Boolean(supplier.is_active)
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleOpenAccount(supplier) {
    navigate(`/supplier-accounts?supplierId=${supplier.id}`);
  }

  function handleOpenPurchases(supplier) {
    navigate(`/purchase-invoices?supplierId=${supplier.id}`);
  }

  function handleOpenPurchaseOrders(supplier) {
    navigate(`/purchase-orders?supplierId=${supplier.id}`);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitLoading(true);
      setError("");
      setSuccessMessage("");

      const payload = normalizeForm(form);

      if (!payload.business_name) {
        setError("Le nom du fournisseur est obligatoire.");
        return;
      }

      if (editingSupplierId) {
        await api.put(`/suppliers/${editingSupplierId}`, payload);
        setSuccessMessage("Fournisseur mis a jour avec succes.");
      } else {
        await api.post("/suppliers", payload);
        setSuccessMessage("Fournisseur cree avec succes.");
      }

      resetForm();
      await fetchPageData();
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      const apiErrors = err?.response?.data?.errors;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(apiErrors.join(" "));
      } else {
        setError(apiMessage || "Erreur lors de l'enregistrement du fournisseur.");
      }
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleDelete(supplier) {
    const confirmed = window.confirm(
      `Supprimer le fournisseur "${supplier.business_name}" ?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccessMessage("");

      await api.delete(`/suppliers/${supplier.id}`);
      setSuccessMessage("Fournisseur supprime avec succes.");

      if (editingSupplierId === supplier.id) {
        resetForm();
      }

      await fetchPageData();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de supprimer ce fournisseur."
      );
    }
  }

  const payableAccounts = useMemo(
    () =>
      accounts
        .filter((account) => account.is_active && account.is_postable)
        .sort((left, right) =>
          String(left.account_number || "").localeCompare(
            String(right.account_number || "")
          )
        ),
    [accounts]
  );

  const filteredSuppliers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return suppliers;
    }

    return suppliers.filter((supplier) =>
      [
        supplier.business_name,
        supplier.contact_name,
        supplier.phone,
        supplier.email,
        supplier.city,
        supplier.address,
        supplier.supplier_type,
        supplier.payable_account_number,
        supplier.payable_account_name
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [suppliers, search]);

  const stats = useMemo(() => {
    return suppliers.reduce(
      (accumulator, supplier) => {
        accumulator.total += 1;

        if (supplier.is_active) {
          accumulator.active += 1;
        }

        if (supplier.payable_account_id) {
          accumulator.withPayableAccount += 1;
        }

        accumulator.totalExpenses += Number(supplier.total_expenses || 0);

        if (Number(supplier.expense_count || 0) > 0) {
          accumulator.withExpenses += 1;
        }

        return accumulator;
      },
      {
        total: 0,
        active: 0,
        withPayableAccount: 0,
        totalExpenses: 0,
        withExpenses: 0
      }
    );
  }, [suppliers]);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Fournisseurs"
        subtitle="Base fournisseurs, comptes de tiers et beneficiaries relies aux depenses."
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

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
          <div className="text-sm text-slate-500">Nombre total</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {stats.total}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
          <div className="text-sm text-slate-500">Fournisseurs actifs</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {stats.active}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
          <div className="text-sm text-slate-500">Avec compte fournisseur</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {stats.withPayableAccount}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
          <div className="text-sm text-slate-500">Depenses liees</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {formatMoney(stats.totalExpenses)}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            {stats.withExpenses} fournisseur(s) avec historique
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="mb-5 text-lg font-semibold text-slate-900">
          {editingSupplierId ? "Modifier le fournisseur" : "Creer un fournisseur"}
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Type
            </label>
            <select
              name="supplier_type"
              value={form.supplier_type}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              {supplierTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Nom du fournisseur *
            </label>
            <input
              name="business_name"
              value={form.business_name}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Ex: SOCIETE DE TRANSPORT KIN"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Contact
            </label>
            <input
              name="contact_name"
              value={form.contact_name}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Nom du responsable"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Telephone
            </label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="+243..."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="contact@email.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Ville
            </label>
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Kinshasa"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Delai de paiement (jours)
            </label>
            <input
              name="payment_terms_days"
              type="number"
              min="0"
              value={form.payment_terms_days}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="0"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Limite fournisseur
            </label>
            <input
              name="credit_limit"
              type="number"
              min="0"
              step="0.01"
              value={form.credit_limit}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="0"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Compte fournisseur
            </label>
            <select
              name="payable_account_id"
              value={form.payable_account_id}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              <option value="">Aucun compte rattache</option>
              {payableAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_number} - {account.account_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700">
              <input
                name="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={handleChange}
              />
              Fournisseur actif
            </label>
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Adresse
            </label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              rows="3"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Adresse du fournisseur"
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows="3"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Conditions, observations, commentaires"
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitLoading}
              className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitLoading
                ? "Enregistrement..."
                : editingSupplierId
                ? "Mettre a jour"
                : "Creer le fournisseur"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Reinitialiser
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="text-lg font-semibold text-slate-900">
            Liste des fournisseurs
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un fournisseur..."
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500 md:w-80"
          />
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Chargement des fournisseurs...
            </div>
          ) : (
            <TableCard
              title={`Fournisseurs (${filteredSuppliers.length})`}
              rows={filteredSuppliers}
              emptyText="Aucun fournisseur trouve"
              columns={[
                { key: "business_name", label: "Fournisseur" },
                {
                  key: "supplier_type",
                  label: "Type",
                  render: (row) => formatSupplierTypeLabel(row.supplier_type)
                },
                { key: "city", label: "Ville" },
                { key: "phone", label: "Telephone" },
                {
                  key: "payable_account",
                  label: "Compte",
                  render: (row) =>
                    row.payable_account_number
                      ? `${row.payable_account_number} - ${row.payable_account_name}`
                      : "-"
                },
                {
                  key: "expense_count",
                  label: "Depenses",
                  render: (row) => Number(row.expense_count || 0)
                },
                {
                  key: "total_expenses",
                  label: "Total verse",
                  render: (row) => formatMoney(row.total_expenses)
                },
                {
                  key: "is_active",
                  label: "Statut",
                  render: (row) => (
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        row.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {row.is_active ? "Actif" : "Inactif"}
                    </span>
                  )
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleOpenAccount(row)}
                        className="rounded-xl border border-brand-300 px-3 py-2 text-xs font-semibold text-brand-700"
                      >
                        Compte courant
                      </button>
                      <button
                        onClick={() => handleOpenPurchaseOrders(row)}
                        className="rounded-xl border border-indigo-300 px-3 py-2 text-xs font-semibold text-indigo-700"
                      >
                        Commandes achats
                      </button>
                      <button
                        onClick={() => handleOpenPurchases(row)}
                        className="rounded-xl border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-700"
                      >
                        Factures achats
                      </button>
                      <button
                        onClick={() => handleEdit(row)}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(row)}
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
