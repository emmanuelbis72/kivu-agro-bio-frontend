import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import TableCard from "../components/ui/TableCard";

const initialForm = {
  expense_date: new Date().toISOString().split("T")[0],
  category: "transport",
  description: "",
  amount: "",
  payment_method: "cash",
  supplier_id: "",
  supplier: "",
  reference: "",
  notes: ""
};

const categoryOptions = [
  { value: "transport", label: "Transport" },
  { value: "loyer", label: "Loyer" },
  { value: "salaires", label: "Salaires" },
  { value: "commissions", label: "Commissions" },
  { value: "marketing", label: "Marketing" },
  { value: "emballages", label: "Emballages" },
  { value: "matieres_premieres", label: "Matieres premieres" },
  { value: "maintenance", label: "Maintenance" },
  { value: "fret", label: "Fret" },
  { value: "divers", label: "Divers" }
];

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

function formatCategoryLabel(value) {
  const found = categoryOptions.find((item) => item.value === value);
  return found ? found.label : value;
}

function formatPaymentMethodLabel(value) {
  const found = paymentMethods.find((item) => item.value === value);
  return found ? found.label : value;
}

function getAccountingBadge(row) {
  if (!row?.accounting_status) {
    return <span className="text-slate-400">-</span>;
  }

  const toneMap = {
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
        toneMap[row.accounting_status] || "bg-slate-200 text-slate-700"
      }`}
    >
      {labelMap[row.accounting_status] || row.accounting_status}
    </span>
  );
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  async function fetchPageData() {
    try {
      setLoading(true);
      setError("");

      const [expensesResult, suppliersResult] = await Promise.allSettled([
        api.get("/expenses"),
        api.get("/suppliers")
      ]);

      if (expensesResult.status === "fulfilled") {
        setExpenses(expensesResult.value.data?.data || []);
      } else {
        throw expensesResult.reason;
      }

      if (suppliersResult.status === "fulfilled") {
        setSuppliers(suppliersResult.value.data?.data || []);
      } else {
        setSuppliers([]);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger les depenses."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPageData();
  }, []);

  function resetForm() {
    setForm({
      ...initialForm,
      expense_date: new Date().toISOString().split("T")[0]
    });
    setEditingExpenseId(null);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    if (name === "supplier_id") {
      const selectedSupplier = suppliers.find(
        (supplier) => String(supplier.id) === String(value)
      );

      setForm((prev) => ({
        ...prev,
        supplier_id: value,
        supplier: selectedSupplier ? selectedSupplier.business_name : prev.supplier
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitLoading(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        expense_date: form.expense_date,
        category: form.category.trim(),
        description: form.description.trim(),
        amount: Number(form.amount),
        payment_method: form.payment_method.trim(),
        supplier_id: form.supplier_id === "" ? null : Number(form.supplier_id),
        supplier: form.supplier.trim(),
        reference: form.reference.trim(),
        notes: form.notes.trim()
      };

      if (!payload.expense_date) {
        setError("La date de depense est obligatoire.");
        return;
      }

      if (!payload.category) {
        setError("La categorie est obligatoire.");
        return;
      }

      if (!payload.description) {
        setError("La description est obligatoire.");
        return;
      }

      if (Number.isNaN(payload.amount) || payload.amount <= 0) {
        setError("Le montant doit etre superieur a 0.");
        return;
      }

      if (!payload.supplier_id && !payload.supplier) {
        setError("Selectionne un fournisseur ou saisis un beneficiaire.");
        return;
      }

      if (editingExpenseId) {
        await api.put(`/expenses/${editingExpenseId}`, payload);
        setSuccessMessage("Depense mise a jour avec succes.");
      } else {
        const response = await api.post("/expenses", payload);
        const accounting = response?.data?.data?.accounting || null;

        if (accounting?.status === "posted") {
          setSuccessMessage(
            "Depense enregistree avec succes et ecriture comptable generee."
          );
        } else if (accounting?.status === "skipped") {
          setSuccessMessage(
            `Depense enregistree avec succes. Comptabilisation ignoree : ${
              accounting.reason || "parametrage manquant"
            }.`
          );
        } else if (accounting?.status === "error") {
          setSuccessMessage(
            `Depense enregistree avec succes. Comptabilisation en erreur : ${
              accounting.reason || "erreur inconnue"
            }.`
          );
        } else {
          setSuccessMessage("Depense enregistree avec succes.");
        }
      }

      resetForm();
      await fetchPageData();
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      const apiErrors = err?.response?.data?.errors;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(apiErrors.join(" "));
      } else {
        setError(apiMessage || "Erreur lors de l'enregistrement de la depense.");
      }
    } finally {
      setSubmitLoading(false);
    }
  }

  function handleEdit(expense) {
    setError("");
    setSuccessMessage("");
    setEditingExpenseId(expense.id);

    setForm({
      expense_date:
        expense.expense_date || new Date().toISOString().split("T")[0],
      category: expense.category || "transport",
      description: expense.description || "",
      amount: String(expense.amount ?? ""),
      payment_method: expense.payment_method || "cash",
      supplier_id: expense.supplier_id ? String(expense.supplier_id) : "",
      supplier: expense.supplier || expense.supplier_business_name || "",
      reference: expense.reference || "",
      notes: expense.notes || ""
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(expense) {
    const confirmed = window.confirm(
      `Supprimer la depense "${expense.description}" ?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccessMessage("");

      await api.delete(`/expenses/${expense.id}`);

      if (editingExpenseId === expense.id) {
        resetForm();
      }

      setSuccessMessage("Depense supprimee avec succes.");
      await fetchPageData();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de supprimer cette depense."
      );
    }
  }

  const selectedSupplier = useMemo(
    () =>
      suppliers.find((supplier) => String(supplier.id) === String(form.supplier_id)) ||
      null,
    [form.supplier_id, suppliers]
  );

  const filteredExpenses = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return expenses;
    }

    return expenses.filter((expense) =>
      [
        expense.expense_date,
        expense.category,
        expense.description,
        expense.payment_method,
        expense.supplier_business_name,
        expense.supplier,
        expense.reference,
        expense.notes,
        expense.accounting_status
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [expenses, search]);

  const totals = useMemo(() => {
    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0
    );

    const totalFiltered = filteredExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0
    );

    return {
      totalExpenses,
      totalFiltered
    };
  }, [expenses, filteredExpenses]);

  const activeSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.is_active),
    [suppliers]
  );

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Depenses"
        subtitle="Suivi des charges operationnelles, administratives et des paiements fournisseurs"
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

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
          <div className="text-sm text-slate-500">Nombre total</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {expenses.length}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
          <div className="text-sm text-slate-500">Total depenses</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {formatMoney(totals.totalExpenses)}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
          <div className="text-sm text-slate-500">Total filtre</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {formatMoney(totals.totalFiltered)}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-lg font-semibold text-slate-900">
            {editingExpenseId ? "Modifier la depense" : "Enregistrer une depense"}
          </div>

          <Link
            to="/suppliers"
            className="inline-flex items-center rounded-2xl border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-700"
          >
            Gerer les fournisseurs
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Date *
            </label>
            <input
              type="date"
              name="expense_date"
              value={form.expense_date}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Categorie *
            </label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              {categoryOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Montant *
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              placeholder="0"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Description *
            </label>
            <input
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Ex: transport marchandises Goma vers Kinshasa"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Mode de paiement
            </label>
            <select
              name="payment_method"
              value={form.payment_method}
              onChange={handleChange}
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
              Fournisseur reference
            </label>
            <select
              name="supplier_id"
              value={form.supplier_id}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              <option value="">Aucun fournisseur lie</option>
              {activeSuppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.business_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Fournisseur / beneficiaire
            </label>
            <input
              name="supplier"
              value={selectedSupplier ? selectedSupplier.business_name : form.supplier}
              onChange={handleChange}
              disabled={Boolean(selectedSupplier)}
              placeholder="Nom libre si non reference"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none disabled:bg-slate-100 disabled:text-slate-500 focus:border-brand-500"
            />
            <div className="mt-2 text-xs text-slate-500">
              {selectedSupplier
                ? "Le nom est repris automatiquement depuis la fiche fournisseur."
                : "Tu peux laisser un beneficiaire libre si le fournisseur n'est pas encore cree."}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Reference
            </label>
            <input
              name="reference"
              value={form.reference}
              onChange={handleChange}
              placeholder="Ex: REC-001 / M-PESA / FACT-2026"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
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
              placeholder="Observations complementaires"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
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
                : editingExpenseId
                ? "Mettre a jour"
                : "Enregistrer la depense"}
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
            Liste des depenses
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une depense..."
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500 md:w-80"
          />
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Chargement des depenses...
            </div>
          ) : (
            <TableCard
              title={`Depenses (${filteredExpenses.length})`}
              rows={filteredExpenses}
              emptyText="Aucune depense enregistree"
              columns={[
                { key: "expense_date", label: "Date" },
                {
                  key: "category",
                  label: "Categorie",
                  render: (row) => formatCategoryLabel(row.category)
                },
                { key: "description", label: "Description" },
                {
                  key: "amount",
                  label: "Montant",
                  render: (row) => formatMoney(row.amount)
                },
                {
                  key: "payment_method",
                  label: "Paiement",
                  render: (row) => formatPaymentMethodLabel(row.payment_method)
                },
                {
                  key: "accounting_status",
                  label: "Compta",
                  render: (row) => getAccountingBadge(row)
                },
                {
                  key: "accounting_entry_id",
                  label: "Ecriture",
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
                  key: "supplier",
                  label: "Fournisseur",
                  render: (row) =>
                    row.supplier_business_name || row.supplier || "-"
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => (
                    <div className="flex gap-2">
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
