import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import TableCard from "../components/ui/TableCard";

const initialForm = {
  name: "",
  category: "",
  sku: "",
  barcode: "",
  unit: "piece",
  cost_price: "",
  selling_price: "",
  alert_threshold: "",
  is_active: true,
  description: ""
};

function normalizeForm(form) {
  return {
    name: form.name.trim(),
    category: form.category.trim(),
    sku: form.sku.trim(),
    barcode: form.barcode.trim(),
    unit: form.unit.trim() || "piece",
    cost_price: form.cost_price === "" ? 0 : Number(form.cost_price),
    selling_price: form.selling_price === "" ? 0 : Number(form.selling_price),
    alert_threshold:
      form.alert_threshold === "" ? 0 : Number(form.alert_threshold),
    is_active: Boolean(form.is_active),
    description: form.description.trim()
  };
}

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [editingProductId, setEditingProductId] = useState(null);
  const [form, setForm] = useState(initialForm);

  async function fetchProducts() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/products");
      setProducts(response.data.data || []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger les produits."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingProductId(null);
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function handleEdit(product) {
    setEditingProductId(product.id);
    setSuccessMessage("");
    setError("");

    setForm({
      name: product.name || "",
      category: product.category || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      unit: product.unit || "piece",
      cost_price: product.cost_price ?? "",
      selling_price: product.selling_price ?? "",
      alert_threshold: product.alert_threshold ?? "",
      is_active: Boolean(product.is_active),
      description: product.description || ""
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitLoading(true);
      setError("");
      setSuccessMessage("");

      const payload = normalizeForm(form);

      if (!payload.name) {
        setError("Le nom du produit est obligatoire.");
        return;
      }

      if (!payload.sku) {
        setError("Le SKU du produit est obligatoire.");
        return;
      }

      if (!payload.unit) {
        setError("L’unité commerciale du produit est obligatoire.");
        return;
      }

      if (editingProductId) {
        await api.put(`/products/${editingProductId}`, payload);
        setSuccessMessage("Produit mis à jour avec succès.");
      } else {
        await api.post("/products", payload);
        setSuccessMessage("Produit créé avec succès.");
      }

      resetForm();
      await fetchProducts();
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      const apiErrors = err?.response?.data?.errors;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(apiErrors.join(" "));
      } else {
        setError(apiMessage || "Erreur lors de l’enregistrement du produit.");
      }
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(
      `Supprimer le produit "${product.name}" ?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccessMessage("");

      await api.delete(`/products/${product.id}`);
      setSuccessMessage("Produit supprimé avec succès.");

      if (editingProductId === product.id) {
        resetForm();
      }

      await fetchProducts();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de supprimer ce produit."
      );
    }
  }

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return products;
    }

    return products.filter((product) => {
      return [
        product.name,
        product.category,
        product.sku,
        product.barcode,
        product.description,
        product.unit
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [products, search]);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Produits"
        subtitle="Catalogue produits : informations commerciales de base. Le type vrac / paquet se gère désormais dans le stock."
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
          {editingProductId ? "Modifier le produit" : "Créer un produit"}
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Nom du produit *
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Ex: Moringa Powder"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Catégorie
            </label>
            <input
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Ex: Superaliment"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              SKU *
            </label>
            <input
              name="sku"
              value={form.sku}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Ex: KAB-MOR-001"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Code-barres
            </label>
            <input
              name="barcode"
              value={form.barcode}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Ex: 1234567890123"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Unité commerciale
            </label>
            <input
              name="unit"
              value={form.unit}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Ex: piece, sachet, bouteille"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Seuil d’alerte
            </label>
            <input
              name="alert_threshold"
              type="number"
              min="0"
              value={form.alert_threshold}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="10"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Prix de revient
            </label>
            <input
              name="cost_price"
              type="number"
              min="0"
              step="0.01"
              value={form.cost_price}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="0"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Prix de vente
            </label>
            <input
              name="selling_price"
              type="number"
              min="0"
              step="0.01"
              value={form.selling_price}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="0"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700">
              <input
                name="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={handleChange}
              />
              Produit actif
            </label>
          </div>

          <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Les informations vrac, paquet, mélange et conditionnement ne se configurent plus ici.
            Elles se définissent désormais dans le module stock au moment de l’entrée ou de la transformation.
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="4"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Description du produit"
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
                : editingProductId
                ? "Mettre à jour"
                : "Créer le produit"}
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
            Liste des produits
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit..."
            className="w-full md:w-80 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
          />
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Chargement des produits...
            </div>
          ) : (
            <TableCard
              title={`Produits (${filteredProducts.length})`}
              rows={filteredProducts}
              emptyText="Aucun produit trouvé"
              columns={[
                { key: "name", label: "Produit" },
                { key: "category", label: "Catégorie" },
                { key: "sku", label: "SKU" },
                { key: "unit", label: "Unité commerciale" },
                {
                  key: "cost_price",
                  label: "Revient",
                  render: (row) => formatMoney(row.cost_price)
                },
                {
                  key: "selling_price",
                  label: "Vente",
                  render: (row) => formatMoney(row.selling_price)
                },
                { key: "alert_threshold", label: "Seuil" },
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
