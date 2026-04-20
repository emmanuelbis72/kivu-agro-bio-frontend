import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import TableCard from "../components/ui/TableCard";

const initialForm = {
  knowledge_key: "",
  title: "",
  category: "strategy",
  content: "",
  tags: "",
  source_type: "manual",
  source_reference: "",
  priority_level: "normal"
};

const categoryOptions = [
  { value: "company_profile", label: "Profil entreprise" },
  { value: "strategy", label: "Stratégie" },
  { value: "products", label: "Produits" },
  { value: "distribution", label: "Distribution" },
  { value: "operations", label: "Opérations" },
  { value: "finance", label: "Finance" },
  { value: "market", label: "Marché" },
  { value: "investor_notes", label: "Notes investisseurs" },
  { value: "founder_notes", label: "Notes CEO" }
];

const priorityOptions = [
  { value: "normal", label: "Normale" },
  { value: "high", label: "Haute" },
  { value: "critical", label: "Critique" }
];

function getPriorityBadge(priority) {
  const value = String(priority || "").toLowerCase();

  if (value === "critical") {
    return "bg-red-100 text-red-700";
  }

  if (value === "high") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-700";
}

export default function CompanyKnowledgePage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingKey, setEditingKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function fetchKnowledge() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/company-knowledge");
      setRows(response.data.data || []);
    } catch (err) {
      setError(err?.message || "Impossible de charger la mémoire entreprise.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchKnowledge();
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingKey(null);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function handleEdit(row) {
    setEditingKey(row.knowledge_key);
    setForm({
      knowledge_key: row.knowledge_key || "",
      title: row.title || "",
      category: row.category || "strategy",
      content: row.content || "",
      tags: Array.isArray(row.tags) ? row.tags.join(", ") : "",
      source_type: row.source_type || "manual",
      source_reference: row.source_reference || "",
      priority_level: row.priority_level || "normal"
    });

    setSuccessMessage("");
    setError("");
  }

  async function handleDelete(knowledgeKey) {
    try {
      setError("");
      setSuccessMessage("");

      await api.delete(`/company-knowledge/${knowledgeKey}`);
      setSuccessMessage("Connaissance désactivée avec succès.");

      if (editingKey === knowledgeKey) {
        resetForm();
      }

      await fetchKnowledge();
    } catch (err) {
      setError(err?.message || "Impossible de supprimer cette connaissance.");
    }
  }

  async function handleSeed() {
    try {
      setError("");
      setSuccessMessage("");

      await api.post("/company-knowledge/seed");
      setSuccessMessage("Mémoire entreprise initialisée avec succès.");
      await fetchKnowledge();
    } catch (err) {
      setError(err?.message || "Impossible d’initialiser la mémoire.");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitLoading(true);
      setError("");
      setSuccessMessage("");

      if (!form.knowledge_key.trim()) {
        setError("La clé mémoire est obligatoire.");
        return;
      }

      if (!form.title.trim()) {
        setError("Le titre est obligatoire.");
        return;
      }

      if (!form.category.trim()) {
        setError("La catégorie est obligatoire.");
        return;
      }

      if (!form.content.trim()) {
        setError("Le contenu est obligatoire.");
        return;
      }

      const payload = {
        knowledge_key: form.knowledge_key.trim(),
        title: form.title.trim(),
        category: form.category.trim(),
        content: form.content.trim(),
        tags: form.tags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        source_type: form.source_type.trim() || "manual",
        source_reference: form.source_reference.trim() || null,
        priority_level: form.priority_level.trim() || "normal"
      };

      if (editingKey) {
        await api.put(`/company-knowledge/${editingKey}`, payload);
        setSuccessMessage("Connaissance mise à jour avec succès.");
      } else {
        await api.post("/company-knowledge", payload);
        setSuccessMessage("Connaissance enregistrée avec succès.");
      }

      resetForm();
      await fetchKnowledge();
    } catch (err) {
      setError(err?.message || "Impossible d’enregistrer cette connaissance.");
    } finally {
      setSubmitLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return rows;
    }

    return rows.filter((row) =>
      [
        row.knowledge_key,
        row.title,
        row.category,
        row.content,
        Array.isArray(row.tags) ? row.tags.join(" ") : ""
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [rows, search]);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Mémoire entreprise"
        subtitle="Base de connaissance stratégique utilisée par KABOT et DeepSeek"
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

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="text-lg font-semibold text-slate-900">
                {editingKey ? "Modifier une connaissance" : "Nouvelle connaissance"}
              </div>

              <button
                type="button"
                onClick={handleSeed}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Seed
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Clé mémoire *
                </label>
                <input
                  name="knowledge_key"
                  value={form.knowledge_key}
                  onChange={handleChange}
                  disabled={Boolean(editingKey)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500 disabled:bg-slate-100"
                  placeholder="ex: strategic_products_core"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Titre *
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                  placeholder="Titre"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Catégorie *
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
                  Contenu *
                </label>
                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleChange}
                  rows="8"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                  placeholder="Texte stratégique ou connaissance métier"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Tags
                </label>
                <input
                  name="tags"
                  value={form.tags}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                  placeholder="finance, strategy, distribution"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Référence source
                </label>
                <input
                  name="source_reference"
                  value={form.source_reference}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                  placeholder="Document, réunion, note CEO..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Priorité
                </label>
                <select
                  name="priority_level"
                  value={form.priority_level}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  {priorityOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitLoading
                    ? "Enregistrement..."
                    : editingKey
                    ? "Mettre à jour"
                    : "Enregistrer"}
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
        </div>

        <div className="xl:col-span-3">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="text-lg font-semibold text-slate-900">
                Connaissances enregistrées
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une connaissance..."
                className="w-full md:w-80 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              />
            </div>

            {loading ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Chargement de la mémoire entreprise...
              </div>
            ) : (
              <TableCard
                title={`Mémoire (${filteredRows.length})`}
                rows={filteredRows}
                emptyText="Aucune connaissance trouvée"
                columns={[
                  { key: "knowledge_key", label: "Clé" },
                  { key: "title", label: "Titre" },
                  { key: "category", label: "Catégorie" },
                  {
                    key: "priority_level",
                    label: "Priorité",
                    render: (row) => (
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPriorityBadge(
                          row.priority_level
                        )}`}
                      >
                        {row.priority_level}
                      </span>
                    )
                  },
                  {
                    key: "content",
                    label: "Contenu",
                    render: (row) => (
                      <div className="max-w-md truncate" title={row.content}>
                        {row.content}
                      </div>
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
                          onClick={() => handleDelete(row.knowledge_key)}
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
    </div>
  );
}