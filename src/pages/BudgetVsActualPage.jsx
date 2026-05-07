import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import StatCard from "../components/ui/StatCard";
import TableCard from "../components/ui/TableCard";
import { saveBlobResponse } from "../utils/fileDownload";

const monthDefinitions = [
  { month_number: 1, label: "Jan" },
  { month_number: 2, label: "Fev" },
  { month_number: 3, label: "Mar" },
  { month_number: 4, label: "Avr" },
  { month_number: 5, label: "Mai" },
  { month_number: 6, label: "Juin" },
  { month_number: 7, label: "Juil" },
  { month_number: 8, label: "Aout" },
  { month_number: 9, label: "Sep" },
  { month_number: 10, label: "Oct" },
  { month_number: 11, label: "Nov" },
  { month_number: 12, label: "Dec" }
];

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)} %`;
}

function createDefaultBudgetForm() {
  return {
    id: null,
    name: "",
    fiscal_year: new Date().getFullYear(),
    warehouse_id: "",
    notes: "",
    is_active: true
  };
}

function createEmptyLineValues(categories = []) {
  const values = {};

  categories.forEach((category) => {
    monthDefinitions.forEach((month) => {
      values[`${category.key}::${month.month_number}`] = "0";
    });
  });

  return values;
}

function buildLineValuesFromBudget(categories = [], budget = null) {
  const values = createEmptyLineValues(categories);

  (budget?.lines || []).forEach((line) => {
    values[`${line.category_key}::${Number(line.month_number)}`] = String(
      Number(line.planned_amount || 0)
    );
  });

  return values;
}

function normalizeLineValue(value) {
  const parsed = Number(value);
  return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

function buildLinesPayload(lineValues = {}) {
  return Object.entries(lineValues).map(([key, value]) => {
    const [categoryKey, monthNumber] = key.split("::");

    return {
      category_key: categoryKey,
      month_number: Number(monthNumber),
      planned_amount: normalizeLineValue(value)
    };
  });
}

function getCategoryTotal(lineValues, categoryKey) {
  return monthDefinitions.reduce((sum, month) => {
    return sum + normalizeLineValue(lineValues[`${categoryKey}::${month.month_number}`]);
  }, 0);
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-200 text-slate-700"
      }`}
    >
      {active ? "Actif" : "Inactif"}
    </span>
  );
}

export default function BudgetVsActualPage() {
  const [budgets, setBudgets] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgetForm, setBudgetForm] = useState(createDefaultBudgetForm());
  const [lineValues, setLineValues] = useState({});
  const [comparison, setComparison] = useState(null);
  const [selectedBudgetId, setSelectedBudgetId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadBudgetWorkspace(budgetId, referenceCategories = categories) {
    if (!budgetId) {
      setSelectedBudgetId("");
      setBudgetForm(createDefaultBudgetForm());
      setLineValues(createEmptyLineValues(referenceCategories));
      setComparison(null);
      return;
    }

    const [budgetResponse, comparisonResponse] = await Promise.all([
      api.get(`/budgets/${budgetId}`),
      api.get(`/budgets/${budgetId}/vs-actual`)
    ]);

    const budget = budgetResponse.data.data;
    setSelectedBudgetId(String(budgetId));
    setBudgetForm({
      id: budget.id,
      name: budget.name || "",
      fiscal_year: Number(budget.fiscal_year || new Date().getFullYear()),
      warehouse_id: budget.warehouse_id ? String(budget.warehouse_id) : "",
      notes: budget.notes || "",
      is_active: Boolean(budget.is_active)
    });
    setLineValues(buildLineValuesFromBudget(referenceCategories, budget));
    setComparison(comparisonResponse.data.data || null);
  }

  async function loadReferenceData() {
    try {
      setLoading(true);
      setError("");

      const [budgetsResponse, warehousesResponse, categoriesResponse] =
        await Promise.all([
          api.get("/budgets"),
          api.get("/warehouses"),
          api.get("/budgets/categories")
        ]);

      const budgetsData = budgetsResponse.data.data || [];
      const warehousesData = warehousesResponse.data.data || [];
      const categoriesData = categoriesResponse.data.data || [];

      setBudgets(budgetsData);
      setWarehouses(warehousesData);
      setCategories(categoriesData);

      if (budgetsData.length > 0) {
        await loadBudgetWorkspace(budgetsData[0].id, categoriesData);
      } else {
        setSelectedBudgetId("");
        setBudgetForm(createDefaultBudgetForm());
        setLineValues(createEmptyLineValues(categoriesData));
        setComparison(null);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger les budgets."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReferenceData();
  }, []);

  const categorySummaryRows = useMemo(() => {
    return (comparison?.rows || []).map((row) => ({
      ...row,
      display_attainment: formatPercent(row.attainment_percent)
    }));
  }, [comparison]);

  const monthlySummaryRows = useMemo(() => {
    return (comparison?.month_rows || []).map((row) => ({
      ...row,
      display_label: row.month_label
    }));
  }, [comparison]);

  const budgetSummaryCards = useMemo(() => {
    if (!comparison) {
      return [];
    }

    return [
      {
        title: "Budget annuel",
        value: formatMoney(comparison.summary?.total_planned)
      },
      {
        title: "Realise annuel",
        value: formatMoney(comparison.summary?.total_actual)
      },
      {
        title: "Ecart",
        value: formatMoney(comparison.summary?.total_variance)
      },
      {
        title: "Taux d'atteinte",
        value: formatPercent(comparison.summary?.attainment_percent)
      }
    ];
  }, [comparison]);

  async function handleSelectBudget(event) {
    const nextId = event.target.value;
    setSuccessMessage("");
    setError("");

    if (!nextId) {
      setSelectedBudgetId("");
      setBudgetForm(createDefaultBudgetForm());
      setLineValues(createEmptyLineValues(categories));
      setComparison(null);
      return;
    }

    try {
      setLoading(true);
      await loadBudgetWorkspace(nextId);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger le budget."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleNewBudget() {
    setSuccessMessage("");
    setError("");
    setSelectedBudgetId("");
    setBudgetForm(createDefaultBudgetForm());
    setLineValues(createEmptyLineValues(categories));
    setComparison(null);
  }

  function handleLineValueChange(categoryKey, monthNumber, nextValue) {
    setLineValues((previous) => ({
      ...previous,
      [`${categoryKey}::${monthNumber}`]: nextValue
    }));
  }

  async function handleSaveBudget() {
    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        ...budgetForm,
        lines: buildLinesPayload(lineValues)
      };

      const saveResponse = budgetForm.id
        ? await api.put(`/budgets/${budgetForm.id}`, payload)
        : await api.post("/budgets", payload);

      const budgetsResponse = await api.get("/budgets");
      const budgetsData = budgetsResponse.data.data || [];
      setBudgets(budgetsData);

      const savedBudgetId = saveResponse?.data?.data?.id;
      const savedBudget =
        budgetsData.find((item) => item.id === savedBudgetId) || budgetsData[0];

      if (savedBudget) {
        await loadBudgetWorkspace(savedBudget.id, categories);
      }

      setSuccessMessage("Budget enregistre avec succes.");
    } catch (err) {
      setError(
        err?.response?.data?.errors?.join(" ") ||
          err?.response?.data?.message ||
          err?.message ||
          "Impossible d'enregistrer le budget."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBudget() {
    if (!budgetForm.id) {
      return;
    }

    const confirmed = window.confirm(
      "Supprimer ce budget et toutes ses lignes ?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      await api.delete(`/budgets/${budgetForm.id}`);

      const budgetsResponse = await api.get("/budgets");
      const budgetsData = budgetsResponse.data.data || [];
      setBudgets(budgetsData);

      if (budgetsData.length > 0) {
        await loadBudgetWorkspace(budgetsData[0].id, categories);
      } else {
        handleNewBudget();
      }

      setSuccessMessage("Budget supprime avec succes.");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de supprimer le budget."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleExport(format) {
    if (!budgetForm.id) {
      return;
    }

    try {
      const response = await api.get(`/budgets/${budgetForm.id}/export/${format}`, {
        responseType: "blob"
      });
      saveBlobResponse(
        response,
        `budget-vs-reel-${budgetForm.fiscal_year}.${format}`
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          `Impossible d'exporter le budget en ${format.toUpperCase()}.`
      );
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-soft">
        Chargement des budgets...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Budget vs realise"
        subtitle="Construire les budgets annuels, comparer le reel par categorie et sortir une version direction exportable."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px,1fr]">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-slate-900">
                Pilotage budgetaire
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Selectionner un budget existant ou preparer une nouvelle version.
              </div>
            </div>
            <StatusBadge active={budgetForm.is_active} />
          </div>

          <div className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Budget actif
              <select
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                value={selectedBudgetId}
                onChange={handleSelectBudget}
              >
                <option value="">Nouveau budget</option>
                {budgets.map((budget) => (
                  <option key={budget.id} value={budget.id}>
                    {budget.name} - {budget.fiscal_year}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Nom du budget
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                value={budgetForm.name}
                onChange={(event) =>
                  setBudgetForm((previous) => ({
                    ...previous,
                    name: event.target.value
                  }))
                }
                placeholder="Ex. Budget direction 2026"
              />
            </label>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Annee
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  value={budgetForm.fiscal_year}
                  onChange={(event) =>
                    setBudgetForm((previous) => ({
                      ...previous,
                      fiscal_year: event.target.value
                    }))
                  }
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Depot
                <select
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  value={budgetForm.warehouse_id}
                  onChange={(event) =>
                    setBudgetForm((previous) => ({
                      ...previous,
                      warehouse_id: event.target.value
                    }))
                  }
                >
                  <option value="">Global</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Notes
              <textarea
                rows={4}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                value={budgetForm.notes}
                onChange={(event) =>
                  setBudgetForm((previous) => ({
                    ...previous,
                    notes: event.target.value
                  }))
                }
                placeholder="Hypotheses, arbitrages, depot concerne..."
              />
            </label>

            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={budgetForm.is_active}
                onChange={(event) =>
                  setBudgetForm((previous) => ({
                    ...previous,
                    is_active: event.target.checked
                  }))
                }
              />
              Budget actif
            </label>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleNewBudget}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Nouveau
            </button>
            <button
              type="button"
              onClick={handleSaveBudget}
              disabled={saving}
              className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              disabled={!budgetForm.id}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Export PDF
            </button>
            <button
              type="button"
              onClick={() => handleExport("xlsx")}
              disabled={!budgetForm.id}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Export Excel
            </button>
          </div>

          <button
            type="button"
            onClick={handleDeleteBudget}
            disabled={!budgetForm.id || saving}
            className="mt-3 w-full rounded-2xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 disabled:opacity-50"
          >
            Supprimer le budget
          </button>

          {successMessage ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-900">
                  Saisie budgetaire mensuelle
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Tu peux saisir ou corriger le budget par categorie et par mois, puis enregistrer.
                </div>
              </div>
              {comparison?.budget?.scope_note ? (
                <div className="max-w-xl rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {comparison.budget.scope_note}
                </div>
              ) : null}
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-[1200px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-3 text-left font-semibold text-slate-600">
                      Categorie
                    </th>
                    <th className="px-3 py-3 text-left font-semibold text-slate-600">
                      Type
                    </th>
                    {monthDefinitions.map((month) => (
                      <th
                        key={month.month_number}
                        className="px-3 py-3 text-left font-semibold text-slate-600"
                      >
                        {month.label}
                      </th>
                    ))}
                    <th className="px-3 py-3 text-left font-semibold text-slate-600">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.key} className="border-b border-slate-100">
                      <td className="px-3 py-3 text-slate-700">
                        {category.label}
                      </td>
                      <td className="px-3 py-3 text-slate-500">
                        {category.type}
                      </td>
                      {monthDefinitions.map((month) => (
                        <td key={month.month_number} className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-right text-sm"
                            value={
                              lineValues[`${category.key}::${month.month_number}`] ?? "0"
                            }
                            onChange={(event) =>
                              handleLineValueChange(
                                category.key,
                                month.month_number,
                                event.target.value
                              )
                            }
                          />
                        </td>
                      ))}
                      <td className="px-3 py-3 font-semibold text-slate-900">
                        {formatMoney(getCategoryTotal(lineValues, category.key))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {budgetSummaryCards.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              {budgetSummaryCards.map((card) => (
                <StatCard
                  key={card.title}
                  title={card.title}
                  value={card.value}
                />
              ))}
            </div>
          ) : null}

          <TableCard
            title="Synthese par categorie"
            columns={[
              { key: "category_label", label: "Categorie" },
              { key: "category_type", label: "Type" },
              {
                key: "planned_total",
                label: "Budget",
                render: (row) => formatMoney(row.planned_total)
              },
              {
                key: "actual_total",
                label: "Realise",
                render: (row) => formatMoney(row.actual_total)
              },
              {
                key: "variance_total",
                label: "Ecart",
                render: (row) => formatMoney(row.variance_total)
              },
              {
                key: "display_attainment",
                label: "Atteinte",
                render: (row) => row.display_attainment
              }
            ]}
            rows={categorySummaryRows}
            emptyText="Le comparatif apparaitra ici des qu'un budget sera enregistre."
          />

          <TableCard
            title="Synthese mensuelle"
            columns={[
              { key: "display_label", label: "Mois" },
              {
                key: "planned_total",
                label: "Budget",
                render: (row) => formatMoney(row.planned_total)
              },
              {
                key: "actual_total",
                label: "Realise",
                render: (row) => formatMoney(row.actual_total)
              },
              {
                key: "variance_total",
                label: "Ecart",
                render: (row) => formatMoney(row.variance_total)
              }
            ]}
            rows={monthlySummaryRows}
            emptyText="Le comparatif mensuel apparaitra ici apres enregistrement."
          />
        </div>
      </div>
    </div>
  );
}
