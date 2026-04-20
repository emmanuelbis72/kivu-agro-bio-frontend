import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import TableCard from "../components/ui/TableCard";

const recipeLineInitial = {
  finished_product_id: "",
  component_product_id: "",
  quantity_required: "",
  quantity_unit: "g"
};

const batchInitial = {
  warehouse_id: "",
  finished_product_id: "",
  quantity_produced: "",
  production_date: new Date().toISOString().split("T")[0],
  notes: ""
};

function productLabel(product) {
  return `${product.name}${product.sku ? ` (${product.sku})` : ""}`;
}

function badgeClass(type) {
  const value = String(type || "").toLowerCase();

  if (value === "raw_material") {
    return "bg-amber-100 text-amber-700";
  }

  if (value === "packaging_material") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-emerald-100 text-emerald-700";
}

export default function ProductionPage() {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedFinishedProductId, setSelectedFinishedProductId] = useState("");
  const [recipeRows, setRecipeRows] = useState([]);

  const [recipeForm, setRecipeForm] = useState(recipeLineInitial);
  const [batchForm, setBatchForm] = useState(batchInitial);

  const [loading, setLoading] = useState(true);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [batchDetailsLoading, setBatchDetailsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("recipes");
  const [searchBatch, setSearchBatch] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const rawMaterials = useMemo(
    () =>
      products.filter(
        (item) =>
          item.product_type === "raw_material" ||
          item.product_type === "packaging_material"
      ),
    [products]
  );

  const finishedProducts = useMemo(
    () => products.filter((item) => item.product_type === "finished_product"),
    [products]
  );

  async function fetchInitialData() {
    try {
      setLoading(true);
      setError("");

      const [productsRes, warehousesRes, batchesRes] = await Promise.all([
        api.get("/products"),
        api.get("/warehouses"),
        api.get("/production/batches")
      ]);

      setProducts(productsRes.data.data || []);
      setWarehouses(warehousesRes.data.data || []);
      setBatches(batchesRes.data.data || []);
    } catch (err) {
      setError(err?.message || "Impossible de charger les données de production.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchRecipes(finishedProductId) {
    try {
      if (!finishedProductId) {
        setRecipeRows([]);
        return;
      }

      setRecipeLoading(true);
      setError("");

      const response = await api.get(`/production/recipes/${finishedProductId}`);
      setRecipeRows(response.data.data || []);
    } catch (err) {
      setError(err?.message || "Impossible de charger la recette.");
    } finally {
      setRecipeLoading(false);
    }
  }

  async function fetchBatches() {
    try {
      const response = await api.get("/production/batches");
      setBatches(response.data.data || []);
    } catch (err) {
      setError(err?.message || "Impossible de charger les batches.");
    }
  }

  async function handleLoadBatchDetails(batchId) {
    try {
      setBatchDetailsLoading(true);
      setError("");

      const response = await api.get(`/production/batches/${batchId}`);
      setSelectedBatch(response.data.data || null);
    } catch (err) {
      setError(err?.message || "Impossible de charger le détail du batch.");
    } finally {
      setBatchDetailsLoading(false);
    }
  }

  function handleRecipeSelectorChange(value) {
    setSelectedFinishedProductId(value);
    setRecipeForm((prev) => ({
      ...prev,
      finished_product_id: value
    }));
    fetchRecipes(value);
  }

  function handleRecipeFormChange(event) {
    const { name, value } = event.target;
    setRecipeForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function handleBatchFormChange(event) {
    const { name, value } = event.target;
    setBatchForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleRecipeSubmit(event) {
    event.preventDefault();

    try {
      setSubmitLoading(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        finished_product_id: Number(recipeForm.finished_product_id),
        component_product_id: Number(recipeForm.component_product_id),
        quantity_required: Number(recipeForm.quantity_required),
        quantity_unit: recipeForm.quantity_unit
      };

      await api.post("/production/recipes", payload);

      setSuccessMessage("Ligne de recette enregistrée avec succès.");
      setRecipeForm((prev) => ({
        ...recipeLineInitial,
        finished_product_id: prev.finished_product_id || selectedFinishedProductId
      }));

      if (payload.finished_product_id) {
        await fetchRecipes(payload.finished_product_id);
      }
    } catch (err) {
      setError(err?.message || "Impossible d’enregistrer la recette.");
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleDeleteRecipeLine(recipeId) {
    try {
      setError("");
      setSuccessMessage("");

      await api.delete(`/production/recipes/${recipeId}`);
      setSuccessMessage("Ligne de recette supprimée avec succès.");

      if (selectedFinishedProductId) {
        await fetchRecipes(selectedFinishedProductId);
      }
    } catch (err) {
      setError(err?.message || "Impossible de supprimer cette ligne.");
    }
  }

  async function handleBatchSubmit(event) {
    event.preventDefault();

    try {
      setSubmitLoading(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        warehouse_id: Number(batchForm.warehouse_id),
        finished_product_id: Number(batchForm.finished_product_id),
        quantity_produced: Number(batchForm.quantity_produced),
        production_date: batchForm.production_date,
        notes: batchForm.notes.trim()
      };

      const response = await api.post("/production/batches", payload);

      setSuccessMessage("Batch de production enregistré avec succès.");
      setBatchForm({
        ...batchInitial,
        production_date: new Date().toISOString().split("T")[0]
      });

      await fetchBatches();

      if (response?.data?.data?.id) {
        await handleLoadBatchDetails(response.data.data.id);
      }
    } catch (err) {
      setError(err?.message || "Impossible d’enregistrer le batch.");
    } finally {
      setSubmitLoading(false);
    }
  }

  const filteredBatches = useMemo(() => {
    const keyword = searchBatch.trim().toLowerCase();

    if (!keyword) {
      return batches;
    }

    return batches.filter((row) =>
      [
        row.batch_number,
        row.finished_product_name,
        row.finished_product_sku,
        row.warehouse_name,
        row.warehouse_city,
        row.status,
        row.notes
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [batches, searchBatch]);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Production / Conditionnement"
        subtitle="Recettes, fabrications, produits mélanges et sorties de vrac vers produits finis"
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
        <div className="mb-5 flex flex-wrap gap-3">
          <button
            onClick={() => setActiveTab("recipes")}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
              activeTab === "recipes"
                ? "bg-brand-600 text-white"
                : "border border-slate-300 text-slate-700"
            }`}
          >
            Recettes produits
          </button>

          <button
            onClick={() => setActiveTab("batches")}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
              activeTab === "batches"
                ? "bg-brand-600 text-white"
                : "border border-slate-300 text-slate-700"
            }`}
          >
            Batch de production
          </button>
        </div>

        {activeTab === "recipes" ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Produit fini à configurer
                </label>
                <select
                  value={selectedFinishedProductId}
                  onChange={(e) => handleRecipeSelectorChange(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="">Sélectionner</option>
                  {finishedProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {productLabel(product)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <form
              onSubmit={handleRecipeSubmit}
              className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Produit fini *
                </label>
                <select
                  name="finished_product_id"
                  value={recipeForm.finished_product_id}
                  onChange={handleRecipeFormChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="">Sélectionner</option>
                  {finishedProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {productLabel(product)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Composant *
                </label>
                <select
                  name="component_product_id"
                  value={recipeForm.component_product_id}
                  onChange={handleRecipeFormChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="">Sélectionner</option>
                  {rawMaterials.map((product) => (
                    <option key={product.id} value={product.id}>
                      {productLabel(product)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Quantité requise *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  name="quantity_required"
                  value={recipeForm.quantity_required}
                  onChange={handleRecipeFormChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                  placeholder="100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Unité *
                </label>
                <select
                  name="quantity_unit"
                  value={recipeForm.quantity_unit}
                  onChange={handleRecipeFormChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="l">l</option>
                  <option value="unit">unit</option>
                </select>
              </div>

              <div className="md:col-span-2 xl:col-span-4">
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitLoading ? "Enregistrement..." : "Ajouter / Mettre à jour la ligne"}
                </button>
              </div>
            </form>

            {recipeLoading ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Chargement de la recette...
              </div>
            ) : (
              <TableCard
                title={`Recette (${recipeRows.length})`}
                rows={recipeRows}
                emptyText="Aucune recette définie pour ce produit"
                columns={[
                  { key: "component_product_name", label: "Composant" },
                  { key: "component_product_sku", label: "SKU" },
                  {
                    key: "component_product_type",
                    label: "Type",
                    render: (row) => (
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(
                          row.component_product_type
                        )}`}
                      >
                        {row.component_product_type}
                      </span>
                    )
                  },
                  { key: "quantity_required", label: "Quantité requise" },
                  { key: "quantity_unit", label: "Unité" },
                  {
                    key: "actions",
                    label: "Actions",
                    render: (row) => (
                      <button
                        type="button"
                        onClick={() => handleDeleteRecipeLine(row.id)}
                        className="rounded-xl border border-red-300 px-3 py-2 text-xs font-semibold text-red-700"
                      >
                        Supprimer
                      </button>
                    )
                  }
                ]}
              />
            )}
          </div>
        ) : (
          <form
            onSubmit={handleBatchSubmit}
            className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Dépôt *
              </label>
              <select
                name="warehouse_id"
                value={batchForm.warehouse_id}
                onChange={handleBatchFormChange}
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
                Produit fini *
              </label>
              <select
                name="finished_product_id"
                value={batchForm.finished_product_id}
                onChange={handleBatchFormChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              >
                <option value="">Sélectionner</option>
                {finishedProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {productLabel(product)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Quantité produite *
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                name="quantity_produced"
                value={batchForm.quantity_produced}
                onChange={handleBatchFormChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                placeholder="100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Date de production
              </label>
              <input
                type="date"
                name="production_date"
                value={batchForm.production_date}
                onChange={handleBatchFormChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              />
            </div>

            <div className="md:col-span-2 xl:col-span-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Notes
              </label>
              <textarea
                name="notes"
                value={batchForm.notes}
                onChange={handleBatchFormChange}
                rows="3"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                placeholder="Conditionnement, fabrication mélange, lot de production..."
              />
            </div>

            <div className="md:col-span-2 xl:col-span-4">
              <button
                type="submit"
                disabled={submitLoading}
                className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitLoading ? "Enregistrement..." : "Créer le batch"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-lg font-semibold text-slate-900">
            Historique des batches
          </div>

          <input
            value={searchBatch}
            onChange={(e) => setSearchBatch(e.target.value)}
            placeholder="Rechercher un batch..."
            className="w-full md:w-80 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
          />
        </div>

        {loading ? (
          <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Chargement des batches...
          </div>
        ) : (
          <TableCard
            title={`Batches (${filteredBatches.length})`}
            rows={filteredBatches}
            emptyText="Aucun batch de production"
            columns={[
              {
                key: "batch_number",
                label: "N° batch",
                render: (row) => (
                  <button
                    type="button"
                    onClick={() => handleLoadBatchDetails(row.id)}
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    {row.batch_number}
                  </button>
                )
              },
              { key: "finished_product_name", label: "Produit fini" },
              { key: "finished_product_sku", label: "SKU" },
              { key: "warehouse_name", label: "Dépôt" },
              { key: "quantity_produced", label: "Qté produite" },
              { key: "finished_product_stock_unit", label: "Unité stock" },
              { key: "components_count", label: "Composants" },
              { key: "production_date", label: "Date" },
              { key: "status", label: "Statut" }
            ]}
          />
        )}
      </div>

      {batchDetailsLoading ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Chargement du détail du batch...
        </div>
      ) : null}

      {selectedBatch ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
          <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-lg font-semibold text-slate-900">
                Détail batch {selectedBatch.batch_number}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {selectedBatch.finished_product_name} • {selectedBatch.warehouse_name} - {selectedBatch.warehouse_city}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedBatch(null)}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Fermer
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Date</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {selectedBatch.production_date}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Produit fini</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {selectedBatch.finished_product_name}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Quantité produite</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {selectedBatch.quantity_produced}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Statut</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {selectedBatch.status}
              </div>
            </div>
          </div>

          {selectedBatch.notes ? (
            <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span className="font-semibold">Notes :</span> {selectedBatch.notes}
            </div>
          ) : null}

          <TableCard
            title={`Composants consommés (${selectedBatch.items?.length || 0})`}
            rows={selectedBatch.items || []}
            emptyText="Aucun composant consommé"
            columns={[
              { key: "component_product_name", label: "Composant" },
              { key: "component_product_sku", label: "SKU" },
              {
                key: "component_product_type",
                label: "Type",
                render: (row) => (
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(
                      row.component_product_type
                    )}`}
                  >
                    {row.component_product_type}
                  </span>
                )
              },
              { key: "quantity_consumed", label: "Qté consommée" },
              { key: "quantity_unit", label: "Unité" },
              { key: "unit_cost", label: "Coût unitaire" }
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}