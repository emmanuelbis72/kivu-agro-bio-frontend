import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import TableCard from "../components/ui/TableCard";

const initialForm = {
  account_number: "",
  account_name: "",
  account_type: "asset",
  parent_account_id: "",
  is_postable: true,
  is_active: true,
  ohada_category: ""
};

const accountTypeOptions = [
  { value: "asset", label: "Actif" },
  { value: "liability", label: "Passif" },
  { value: "equity", label: "Capitaux propres" },
  { value: "income", label: "Produit" },
  { value: "expense", label: "Charge" },
  { value: "off_balance", label: "Hors bilan" }
];

function formatAccountTypeLabel(value) {
  const found = accountTypeOptions.find((item) => item.value === value);
  return found ? found.label : value;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [form, setForm] = useState(initialForm);

  async function fetchAccounts() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/accounts");
      setAccounts(response.data.data || []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger les comptes comptables."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAccounts();
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingAccountId(null);
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function handleEdit(account) {
    setEditingAccountId(account.id);
    setError("");
    setSuccessMessage("");

    setForm({
      account_number: account.account_number || "",
      account_name: account.account_name || "",
      account_type: account.account_type || "asset",
      parent_account_id: account.parent_account_id ?? "",
      is_postable:
        account.is_postable === undefined ? true : Boolean(account.is_postable),
      is_active:
        account.is_active === undefined ? true : Boolean(account.is_active),
      ohada_category: account.ohada_category || ""
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitLoading(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        account_number: form.account_number.trim(),
        account_name: form.account_name.trim(),
        account_type: form.account_type.trim(),
        parent_account_id:
          form.parent_account_id === "" ? null : Number(form.parent_account_id),
        is_postable: Boolean(form.is_postable),
        is_active: Boolean(form.is_active),
        ohada_category: form.ohada_category.trim()
      };

      if (!payload.account_number) {
        setError("Le numéro de compte est obligatoire.");
        return;
      }

      if (!payload.account_name) {
        setError("L’intitulé du compte est obligatoire.");
        return;
      }

      if (!payload.account_type) {
        setError("Le type de compte est obligatoire.");
        return;
      }

      if (
        payload.parent_account_id !== null &&
        (!Number.isInteger(payload.parent_account_id) ||
          payload.parent_account_id <= 0)
      ) {
        setError("Le compte parent doit être un entier positif.");
        return;
      }

      if (editingAccountId) {
        await api.put(`/accounts/${editingAccountId}`, payload);
        setSuccessMessage("Compte comptable mis à jour avec succès.");
      } else {
        await api.post("/accounts", payload);
        setSuccessMessage("Compte comptable créé avec succès.");
      }

      resetForm();
      await fetchAccounts();
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      const apiErrors = err?.response?.data?.errors;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(apiErrors.join(" "));
      } else {
        setError(apiMessage || "Erreur lors de l’enregistrement du compte.");
      }
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleDelete(account) {
    const confirmed = window.confirm(
      `Supprimer le compte "${account.account_number} - ${account.account_name}" ?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccessMessage("");

      await api.delete(`/accounts/${account.id}`);
      setSuccessMessage("Compte comptable supprimé avec succès.");

      if (editingAccountId === account.id) {
        resetForm();
      }

      await fetchAccounts();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de supprimer ce compte."
      );
    }
  }

  const parentAccountOptions = useMemo(() => {
    return accounts.filter((account) =>
      editingAccountId ? account.id !== editingAccountId : true
    );
  }, [accounts, editingAccountId]);

  const filteredAccounts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return accounts;
    }

    return accounts.filter((account) =>
      [
        account.account_number,
        account.account_name,
        account.account_class,
        account.account_type,
        account.ohada_category,
        account.parent_account_number,
        account.parent_account_name
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [accounts, search]);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Plan comptable OHADA"
        subtitle="Gestion des comptes comptables de l’entreprise"
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
          {editingAccountId ? "Modifier le compte" : "Créer un compte"}
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Numéro de compte *
            </label>
            <input
              name="account_number"
              value={form.account_number}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Ex: 601"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Intitulé du compte *
            </label>
            <input
              name="account_name"
              value={form.account_name}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Ex: Achats stockés de matières premières"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Type de compte *
            </label>
            <select
              name="account_type"
              value={form.account_type}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              {accountTypeOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Compte parent
            </label>
            <select
              name="parent_account_id"
              value={form.parent_account_id}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              <option value="">Aucun</option>
              {parentAccountOptions.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_number} - {account.account_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Catégorie OHADA
            </label>
            <input
              name="ohada_category"
              value={form.ohada_category}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Ex: exploitation, trésorerie, capitaux propres"
            />
          </div>

          <div className="flex flex-col gap-3 justify-end">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700">
              <input
                name="is_postable"
                type="checkbox"
                checked={form.is_postable}
                onChange={handleChange}
              />
              Compte mouvementable
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700">
              <input
                name="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={handleChange}
              />
              Compte actif
            </label>
          </div>

          <div className="md:col-span-2 xl:col-span-3 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitLoading}
              className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitLoading
                ? "Enregistrement..."
                : editingAccountId
                ? "Mettre à jour"
                : "Créer le compte"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Réinitialiser
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="text-lg font-semibold text-slate-900">
            Liste des comptes
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un compte..."
            className="w-full md:w-80 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
          />
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Chargement des comptes...
            </div>
          ) : (
            <TableCard
              title={`Comptes (${filteredAccounts.length})`}
              rows={filteredAccounts}
              emptyText="Aucun compte comptable trouvé"
              columns={[
                { key: "account_number", label: "Numéro" },
                { key: "account_name", label: "Intitulé" },
                { key: "account_class", label: "Classe" },
                {
                  key: "account_type",
                  label: "Type",
                  render: (row) => formatAccountTypeLabel(row.account_type)
                },
                {
                  key: "parent_account_name",
                  label: "Parent",
                  render: (row) =>
                    row.parent_account_number
                      ? `${row.parent_account_number} - ${row.parent_account_name}`
                      : "-"
                },
                {
                  key: "is_postable",
                  label: "Mvt",
                  render: (row) => (
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        row.is_postable
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {row.is_postable ? "Oui" : "Non"}
                    </span>
                  )
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