import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import TableCard from "../components/ui/TableCard";

const initialForm = {
  invoice_id: "",
  payment_date: new Date().toISOString().split("T")[0],
  amount: "",
  payment_method: "cash",
  reference: "",
  notes: ""
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

export default function PaymentsPage() {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function fetchInvoices() {
    const response = await api.get("/invoices");
    return response.data.data || [];
  }

  async function loadInitialData() {
    try {
      setLoading(true);
      setError("");

      const invoicesData = await fetchInvoices();
      setInvoices(invoicesData);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger les données de paiement."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  async function handleSelectInvoice(invoiceId) {
    try {
      if (!invoiceId) {
        setSelectedInvoice(null);
        setPayments([]);
        setForm((prev) => ({ ...prev, invoice_id: "" }));
        return;
      }

      setPaymentsLoading(true);
      setError("");
      setSuccessMessage("");

      const [invoiceRes, paymentsRes] = await Promise.all([
        api.get(`/invoices/${invoiceId}`),
        api.get(`/payments/invoice/${invoiceId}`)
      ]);

      const invoiceData = invoiceRes.data.data || null;
      const paymentsData = paymentsRes.data.data || [];

      setSelectedInvoice(invoiceData);
      setPayments(paymentsData);
      setForm((prev) => ({
        ...prev,
        invoice_id: String(invoiceId),
        amount:
          invoiceData && Number(invoiceData.balance_due) > 0
            ? String(Number(invoiceData.balance_due))
            : ""
      }));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger la facture sélectionnée."
      );
    } finally {
      setPaymentsLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function resetFormKeepInvoice() {
    setForm((prev) => ({
      invoice_id: prev.invoice_id,
      payment_date: new Date().toISOString().split("T")[0],
      amount:
        selectedInvoice && Number(selectedInvoice.balance_due) > 0
          ? String(Number(selectedInvoice.balance_due))
          : "",
      payment_method: "cash",
      reference: "",
      notes: ""
    }));
  }

  async function refreshSelectedInvoice(invoiceId) {
    const [invoiceRes, paymentsRes, invoicesData] = await Promise.all([
      api.get(`/invoices/${invoiceId}`),
      api.get(`/payments/invoice/${invoiceId}`),
      fetchInvoices()
    ]);

    setSelectedInvoice(invoiceRes.data.data || null);
    setPayments(paymentsRes.data.data || []);
    setInvoices(invoicesData || []);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitLoading(true);
      setError("");
      setSuccessMessage("");

      if (!form.invoice_id) {
        setError("Sélectionne une facture.");
        return;
      }

      const amount = Number(form.amount);

      if (Number.isNaN(amount) || amount <= 0) {
        setError("Le montant du paiement doit être supérieur à 0.");
        return;
      }

      const payload = {
        invoice_id: Number(form.invoice_id),
        payment_date: form.payment_date,
        amount,
        payment_method: form.payment_method,
        reference: form.reference.trim(),
        notes: form.notes.trim()
      };

      const response = await api.post("/payments", payload);
      const accounting = response?.data?.data?.accounting || null;

      if (accounting?.status === "posted") {
        setSuccessMessage(
          "Paiement enregistré avec succès et écriture comptable générée."
        );
      } else if (accounting?.status === "skipped") {
        setSuccessMessage(
          `Paiement enregistré avec succès. Comptabilisation ignorée : ${accounting.reason || "paramétrage manquant"}.`
        );
      } else if (accounting?.status === "error") {
        setSuccessMessage(
          `Paiement enregistré avec succès. Comptabilisation en erreur : ${accounting.reason || "erreur inconnue"}.`
        );
      } else {
        setSuccessMessage("Paiement enregistré avec succès.");
      }

      await refreshSelectedInvoice(form.invoice_id);
      resetFormKeepInvoice();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Erreur lors de l’enregistrement du paiement."
      );
    } finally {
      setSubmitLoading(false);
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
        invoice.warehouse_name
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [invoices, search]);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Paiements"
        subtitle="Encaissements, acomptes, soldes et suivi des factures clients"
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
        <div className="xl:col-span-2 space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
            <div className="mb-5 text-lg font-semibold text-slate-900">
              Sélectionner une facture
            </div>

            <div className="space-y-4">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une facture..."
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              />

              <select
                value={form.invoice_id}
                onChange={(e) => handleSelectInvoice(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              >
                <option value="">Sélectionner une facture</option>
                {filteredInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} — {invoice.customer_name} —{" "}
                    {formatMoney(invoice.balance_due)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
            <div className="mb-5 text-lg font-semibold text-slate-900">
              Enregistrer un paiement
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Date de paiement
                </label>
                <input
                  type="date"
                  name="payment_date"
                  value={form.payment_date}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
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
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                  placeholder="0"
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
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank_transfer">Virement bancaire</option>
                  <option value="card">Carte</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Référence
                </label>
                <input
                  name="reference"
                  value={form.reference}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                  placeholder="Ex: REC-001"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows="3"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                  placeholder="Acompte, règlement partiel, observation..."
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitLoading ? "Enregistrement..." : "Enregistrer le paiement"}
                </button>

                <button
                  type="button"
                  onClick={resetFormKeepInvoice}
                  className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
                >
                  Réinitialiser
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="xl:col-span-3 space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
            <div className="mb-5 text-lg font-semibold text-slate-900">
              Résumé de la facture
            </div>

            {paymentsLoading ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Chargement de la facture...
              </div>
            ) : !selectedInvoice ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Sélectionne une facture pour voir son détail.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Facture</div>
                    <div className="mt-2 text-lg font-bold text-slate-900">
                      {selectedInvoice.invoice_number}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {selectedInvoice.invoice_date}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Client</div>
                    <div className="mt-2 text-lg font-bold text-slate-900">
                      {selectedInvoice.customer_name}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {selectedInvoice.warehouse_name}
                    </div>
                  </div>

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
                    <div className="text-sm text-slate-500">Solde dû</div>
                    <div className="mt-2 text-lg font-bold text-slate-900">
                      {formatMoney(selectedInvoice.balance_due)}
                    </div>
                  </div>
                </div>

                {selectedInvoice.accounting_entry_id ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Écriture facture liée :{" "}
                    <Link
                      to={`/journal-entries/${selectedInvoice.accounting_entry_id}`}
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      #{selectedInvoice.accounting_entry_id}
                    </Link>
                  </div>
                ) : null}

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-sm text-slate-500">Montant total</div>
                    <div className="mt-2 text-xl font-bold text-slate-900">
                      {formatMoney(selectedInvoice.total_amount)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-sm text-slate-500">Déjà payé</div>
                    <div className="mt-2 text-xl font-bold text-slate-900">
                      {formatMoney(selectedInvoice.paid_amount)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-sm text-slate-500">Reste à payer</div>
                    <div className="mt-2 text-xl font-bold text-slate-900">
                      {formatMoney(selectedInvoice.balance_due)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
            <div className="mb-5 text-lg font-semibold text-slate-900">
              Historique des paiements
            </div>

            {paymentsLoading ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Chargement des paiements...
              </div>
            ) : (
              <TableCard
                title={`Paiements (${payments.length})`}
                rows={payments}
                emptyText="Aucun paiement pour cette facture"
                columns={[
                  { key: "payment_date", label: "Date" },
                  {
                    key: "amount",
                    label: "Montant",
                    render: (row) => formatMoney(row.amount)
                  },
                  { key: "payment_method", label: "Mode" },
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
                  { key: "reference", label: "Référence" },
                  { key: "notes", label: "Notes" }
                ]}
              />
            )}
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
            <div className="mb-5 text-lg font-semibold text-slate-900">
              Liste des factures
            </div>

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
                    key: "total_amount",
                    label: "Total",
                    render: (row) => formatMoney(row.total_amount)
                  },
                  {
                    key: "paid_amount",
                    label: "Payé",
                    render: (row) => formatMoney(row.paid_amount)
                  },
                  {
                    key: "balance_due",
                    label: "Solde",
                    render: (row) => formatMoney(row.balance_due)
                  },
                  {
                    key: "actions",
                    label: "Action",
                    render: (row) => (
                      <button
                        onClick={() => handleSelectInvoice(row.id)}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Sélectionner
                      </button>
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