import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import TableCard from "../components/ui/TableCard";

const initialLine = {
  account_id: "",
  description: "",
  debit: "",
  credit: ""
};

const initialForm = {
  entry_date: new Date().toISOString().split("T")[0],
  journal_code: "OD",
  description: "",
  reference_type: "",
  reference_id: "",
  source_module: "",
  lines: [{ ...initialLine }, { ...initialLine }]
};

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));
}

function getEntryStatusBadge(status) {
  const map = {
    draft: "bg-amber-100 text-amber-700",
    posted: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700"
  };

  return map[status] || "bg-slate-200 text-slate-700";
}

export default function JournalEntriesPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState(initialForm);

  async function fetchInitialData() {
    try {
      setLoading(true);
      setError("");

      const [entriesRes, accountsRes] = await Promise.all([
        api.get("/journal-entries"),
        api.get("/accounts")
      ]);

      setEntries(entriesRes.data.data || []);
      setAccounts(accountsRes.data.data || []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger les écritures comptables."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!id) {
      setSelectedEntry(null);
      return;
    }

    handleViewEntry(id);
  }, [id]);

  function resetForm() {
    setForm({
      ...initialForm,
      entry_date: new Date().toISOString().split("T")[0],
      lines: [{ ...initialLine }, { ...initialLine }]
    });
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function handleLineChange(index, field, value) {
    setForm((prev) => {
      const updatedLines = [...prev.lines];
      updatedLines[index] = {
        ...updatedLines[index],
        [field]: value
      };

      return {
        ...prev,
        lines: updatedLines
      };
    });
  }

  function addLine() {
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { ...initialLine }]
    }));
  }

  function removeLine(index) {
    setForm((prev) => {
      if (prev.lines.length <= 2) {
        return prev;
      }

      return {
        ...prev,
        lines: prev.lines.filter((_, i) => i !== index)
      };
    });
  }

  const totals = useMemo(() => {
    const totalDebit = form.lines.reduce(
      (sum, line) => sum + Number(line.debit || 0),
      0
    );
    const totalCredit = form.lines.reduce(
      (sum, line) => sum + Number(line.credit || 0),
      0
    );

    return {
      totalDebit,
      totalCredit,
      isBalanced: totalDebit === totalCredit
    };
  }, [form.lines]);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitLoading(true);
      setError("");
      setSuccessMessage("");

      if (!form.entry_date) {
        setError("La date d’écriture est obligatoire.");
        return;
      }

      if (!form.journal_code.trim()) {
        setError("Le code journal est obligatoire.");
        return;
      }

      if (!form.description.trim()) {
        setError("Le libellé est obligatoire.");
        return;
      }

      const lines = form.lines.map((line) => ({
        account_id: Number(line.account_id),
        description: line.description.trim(),
        debit: line.debit === "" ? 0 : Number(line.debit),
        credit: line.credit === "" ? 0 : Number(line.credit)
      }));

      const invalidLine = lines.find(
        (line) =>
          !Number.isInteger(line.account_id) ||
          line.account_id <= 0 ||
          Number.isNaN(line.debit) ||
          Number.isNaN(line.credit)
      );

      if (invalidLine) {
        setError("Chaque ligne doit avoir un compte valide.");
        return;
      }

      const payload = {
        entry_date: form.entry_date,
        journal_code: form.journal_code.trim(),
        description: form.description.trim(),
        reference_type: form.reference_type.trim(),
        reference_id: form.reference_id ? Number(form.reference_id) : null,
        source_module: form.source_module.trim(),
        lines
      };

      await api.post("/journal-entries", payload);
      setSuccessMessage("Écriture comptable créée avec succès.");
      resetForm();
      await fetchInitialData();
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      const apiErrors = err?.response?.data?.errors;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(apiErrors.join(" "));
      } else {
        setError(apiMessage || "Erreur lors de la création de l’écriture.");
      }
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleViewEntry(entryId) {
    try {
      setDetailsLoading(true);
      setError("");

      const response = await api.get(`/journal-entries/${entryId}`);
      setSelectedEntry(response.data.data || null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger le détail de l’écriture."
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handlePostEntry(entryId) {
    try {
      setError("");
      setSuccessMessage("");

      await api.post(`/journal-entries/${entryId}/post`, {});
      setSuccessMessage("Écriture validée avec succès.");

      if (selectedEntry?.id === Number(entryId)) {
        await handleViewEntry(entryId);
      }

      await fetchInitialData();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de valider cette écriture."
      );
    }
  }

  const filteredEntries = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return entries;
    }

    return entries.filter((entry) =>
      [
        entry.entry_number,
        entry.journal_code,
        entry.description,
        entry.status,
        entry.reference_type,
        entry.source_module
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [entries, search]);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Journal des écritures"
        subtitle="Saisie, consultation et validation des écritures comptables"
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
          Nouvelle écriture
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Date
              </label>
              <input
                type="date"
                name="entry_date"
                value={form.entry_date}
                onChange={handleFormChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Journal
              </label>
              <input
                name="journal_code"
                value={form.journal_code}
                onChange={handleFormChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                placeholder="Ex: VE, TR, AC, OD"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Référence type
              </label>
              <input
                name="reference_type"
                value={form.reference_type}
                onChange={handleFormChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                placeholder="invoice, payment, expense..."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Référence ID
              </label>
              <input
                name="reference_id"
                type="number"
                min="1"
                value={form.reference_id}
                onChange={handleFormChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                placeholder="1"
              />
            </div>

            <div className="md:col-span-2 xl:col-span-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Libellé
              </label>
              <input
                name="description"
                value={form.description}
                onChange={handleFormChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                placeholder="Ex: Vente facture KAB-2026-00001"
              />
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-base font-semibold text-slate-900">
                Lignes d’écriture
              </div>
              <button
                type="button"
                onClick={addLine}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                + Ajouter une ligne
              </button>
            </div>

            <div className="space-y-4">
              {form.lines.map((line, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 p-4 md:grid-cols-5"
                >
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Compte
                    </label>
                    <select
                      value={line.account_id}
                      onChange={(e) =>
                        handleLineChange(index, "account_id", e.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                    >
                      <option value="">Sélectionner</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.account_number} - {account.account_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Description
                    </label>
                    <input
                      value={line.description}
                      onChange={(e) =>
                        handleLineChange(index, "description", e.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                      placeholder="Libellé ligne"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Débit
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.debit}
                      onChange={(e) =>
                        handleLineChange(index, "debit", e.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Crédit
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.credit}
                        onChange={(e) =>
                          handleLineChange(index, "credit", e.target.value)
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                        placeholder="0"
                      />
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="rounded-2xl border border-red-300 px-3 py-3 text-xs font-semibold text-red-700"
                      >
                        X
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Débit total</div>
              <div className="mt-2 text-xl font-bold text-slate-900">
                {formatMoney(totals.totalDebit)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Crédit total</div>
              <div className="mt-2 text-xl font-bold text-slate-900">
                {formatMoney(totals.totalCredit)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Équilibre</div>
              <div
                className={`mt-2 text-xl font-bold ${
                  totals.isBalanced ? "text-green-700" : "text-red-700"
                }`}
              >
                {totals.isBalanced ? "Équilibré" : "Non équilibré"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitLoading}
              className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitLoading ? "Enregistrement..." : "Créer l’écriture"}
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

      {selectedEntry ? (
        <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
          <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-lg font-semibold text-slate-900">
                Détail écriture {selectedEntry.entry_number}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {selectedEntry.description}
              </div>
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getEntryStatusBadge(
                  selectedEntry.status
                )}`}
              >
                {selectedEntry.status}
              </span>

              {selectedEntry.status === "draft" ? (
                <button
                  onClick={() => handlePostEntry(selectedEntry.id)}
                  className="rounded-2xl border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-700"
                >
                  Valider
                </button>
              ) : null}

              <button
                onClick={() => navigate("/journal-entries")}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Fermer
              </button>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Date</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {selectedEntry.entry_date}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Journal</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {selectedEntry.journal_code}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Débit total</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {formatMoney(selectedEntry.total_debit)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Crédit total</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {formatMoney(selectedEntry.total_credit)}
              </div>
            </div>
          </div>

          <TableCard
            title="Lignes de l’écriture"
            rows={selectedEntry.lines || []}
            emptyText="Aucune ligne"
            columns={[
              { key: "line_number", label: "Ligne" },
              { key: "account_number", label: "Compte" },
              { key: "account_name", label: "Intitulé" },
              { key: "description", label: "Description" },
              {
                key: "debit",
                label: "Débit",
                render: (row) => formatMoney(row.debit)
              },
              {
                key: "credit",
                label: "Crédit",
                render: (row) => formatMoney(row.credit)
              }
            ]}
          />
        </div>
      ) : null}

      <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="text-lg font-semibold text-slate-900">
            Liste des écritures
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une écriture..."
            className="w-full md:w-80 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
          />
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Chargement des écritures...
            </div>
          ) : (
            <TableCard
              title={`Écritures (${filteredEntries.length})`}
              rows={filteredEntries}
              emptyText="Aucune écriture comptable"
              columns={[
                { key: "entry_number", label: "N° écriture" },
                { key: "entry_date", label: "Date" },
                { key: "journal_code", label: "Journal" },
                { key: "description", label: "Libellé" },
                {
                  key: "status",
                  label: "Statut",
                  render: (row) => (
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getEntryStatusBadge(
                        row.status
                      )}`}
                    >
                      {row.status}
                    </span>
                  )
                },
                {
                  key: "total_debit",
                  label: "Débit",
                  render: (row) => formatMoney(row.total_debit)
                },
                {
                  key: "total_credit",
                  label: "Crédit",
                  render: (row) => formatMoney(row.total_credit)
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => (
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/journal-entries/${row.id}`)}
                        disabled={detailsLoading}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Voir
                      </button>
                      {row.status === "draft" ? (
                        <button
                          onClick={() => handlePostEntry(row.id)}
                          className="rounded-xl border border-brand-300 px-3 py-2 text-xs font-semibold text-brand-700"
                        >
                          Valider
                        </button>
                      ) : null}
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