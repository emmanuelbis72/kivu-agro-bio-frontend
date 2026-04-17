import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import TableCard from "../components/ui/TableCard";

const initialForm = {
  name: "",
  city: "",
  address: "",
  manager_name: "",
  phone: ""
};

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [editingWarehouseId, setEditingWarehouseId] = useState(null);
  const [form, setForm] = useState(initialForm);

  async function fetchWarehouses() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/warehouses");
      setWarehouses(response.data.data || []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger les dépôts."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWarehouses();
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingWarehouseId(null);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function handleEdit(warehouse) {
    setEditingWarehouseId(warehouse.id);
    setError("");
    setSuccessMessage("");

    setForm({
      name: warehouse.name || "",
      city: warehouse.city || "",
      address: warehouse.address || "",
      manager_name: warehouse.manager_name || "",
      phone: warehouse.phone || ""
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
        name: form.name.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        manager_name: form.manager_name.trim(),
        phone: form.phone.trim()
      };

      if (!payload.name) {
        setError("Le nom du dépôt est obligatoire.");
        return;
      }

      if (!payload.city) {
        setError("La ville du dépôt est obligatoire.");
        return;
      }

      if (editingWarehouseId) {
        await api.put(`/warehouses/${editingWarehouseId}`, payload);
        setSuccessMessage("Dépôt mis à jour avec succès.");
      } else {
        await api.post("/warehouses", payload);
        setSuccessMessage("Dépôt créé avec succès.");
      }

      resetForm();
      await fetchWarehouses();
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      const apiErrors = err?.response?.data?.errors;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(apiErrors.join(" "));
      } else {
        setError(apiMessage || "Erreur lors de l’enregistrement du dépôt.");
      }
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleDelete(warehouse) {
    const confirmed = window.confirm(
      `Supprimer le dépôt "${warehouse.name}" ?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccessMessage("");

      await api.delete(`/warehouses/${warehouse.id}`);
      setSuccessMessage("Dépôt supprimé avec succès.");

      if (editingWarehouseId === warehouse.id) {
        resetForm();
      }

      await fetchWarehouses();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de supprimer ce dépôt."
      );
    }
  }

  const filteredWarehouses = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return warehouses;
    }

    return warehouses.filter((warehouse) =>
      [
        warehouse.name,
        warehouse.city,
        warehouse.address,
        warehouse.manager_name,
        warehouse.phone
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [warehouses, search]);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Dépôts"
        subtitle="Gestion des dépôts et points de stockage"
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
          {editingWarehouseId ? "Modifier le dépôt" : "Créer un dépôt"}
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Nom du dépôt *
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Ex: Dépôt Kinshasa Centre"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Ville *
            </label>
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Ex: Kinshasa"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Responsable
            </label>
            <input
              name="manager_name"
              value={form.manager_name}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Nom du responsable"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Téléphone
            </label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="+243..."
            />
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
              placeholder="Adresse complète du dépôt"
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
                : editingWarehouseId
                ? "Mettre à jour"
                : "Créer le dépôt"}
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
            Liste des dépôts
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un dépôt..."
            className="w-full md:w-80 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
          />
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Chargement des dépôts...
            </div>
          ) : (
            <TableCard
              title={`Dépôts (${filteredWarehouses.length})`}
              rows={filteredWarehouses}
              emptyText="Aucun dépôt trouvé"
              columns={[
                { key: "name", label: "Dépôt" },
                { key: "city", label: "Ville" },
                { key: "manager_name", label: "Responsable" },
                { key: "phone", label: "Téléphone" },
                { key: "address", label: "Adresse" },
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