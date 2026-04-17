import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import TableCard from "../components/ui/TableCard";

const paymentMethodOptions = [
  { value: "cash", label: "Cash" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "bank_transfer", label: "Virement bancaire" },
  { value: "card", label: "Carte" }
];

const expenseCategoryOptions = [
  { value: "transport", label: "Transport" },
  { value: "loyer", label: "Loyer" },
  { value: "salaires", label: "Salaires" },
  { value: "commissions", label: "Commissions" },
  { value: "marketing", label: "Marketing" },
  { value: "emballages", label: "Emballages" },
  { value: "matieres_premieres", label: "Matières premières" },
  { value: "maintenance", label: "Maintenance" },
  { value: "fret", label: "Fret" },
  { value: "divers", label: "Divers" }
];

const initialExpenseForm = {
  category: "transport",
  expense_account_id: ""
};

const initialPaymentForm = {
  payment_method: "cash",
  treasury_account_id: ""
};

function getPaymentMethodLabel(value) {
  const found = paymentMethodOptions.find((item) => item.value === value);
  return found ? found.label : value;
}

function getExpenseCategoryLabel(value) {
  const found = expenseCategoryOptions.find((item) => item.value === value);
  return found ? found.label : value;
}

export default function AccountingSettingsPage() {
  const [accounts, setAccounts] = useState([]);
  const [expenseCategoryAccounts, setExpenseCategoryAccounts] = useState([]);
  const [paymentMethodAccounts, setPaymentMethodAccounts] = useState([]);

  const [expenseForm, setExpenseForm] = useState(initialExpenseForm);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);

  const [loading, setLoading] = useState(true);
  const [expenseSubmitLoading, setExpenseSubmitLoading] = useState(false);
  const [paymentSubmitLoading, setPaymentSubmitLoading] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function fetchData() {
    try {
      setLoading(true);
      setError("");

      const [accountsRes, settingsRes] = await Promise.all([
        api.get("/accounts"),
        api.get("/accounting-settings")
      ]);

      setAccounts(accountsRes.data.data || []);
      setExpenseCategoryAccounts(
        settingsRes.data.data?.expense_category_accounts || []
      );
      setPaymentMethodAccounts(
        settingsRes.data.data?.payment_method_accounts || []
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger le paramétrage comptable."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function handleExpenseChange(event) {
    const { name, value } = event.target;
    setExpenseForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function handlePaymentChange(event) {
    const { name, value } = event.target;
    setPaymentForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function handleEditExpenseCategory(row) {
    setExpenseForm({
      category: row.category || "transport",
      expense_account_id: row.expense_account_id
        ? String(row.expense_account_id)
        : ""
    });
    setError("");
    setSuccessMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleEditPaymentMethod(row) {
    setPaymentForm({
      payment_method: row.payment_method || "cash",
      treasury_account_id: row.treasury_account_id
        ? String(row.treasury_account_id)
        : ""
    });
    setError("");
    setSuccessMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleExpenseSubmit(event) {
    event.preventDefault();

    try {
      setExpenseSubmitLoading(true);
      setError("");
      setSuccessMessage("");

      if (!expenseForm.category.trim()) {
        setError("La catégorie de dépense est obligatoire.");
        return;
      }

      if (!expenseForm.expense_account_id) {
        setError("Le compte de charge est obligatoire.");
        return;
      }

      await api.put("/accounting-settings/expense-categories", {
        category: expenseForm.category.trim(),
        expense_account_id: Number(expenseForm.expense_account_id)
      });

      setSuccessMessage(
        "Paramétrage de la catégorie de dépense enregistré avec succès."
      );
      setExpenseForm(initialExpenseForm);
      await fetchData();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible d’enregistrer la catégorie de dépense."
      );
    } finally {
      setExpenseSubmitLoading(false);
    }
  }

  async function handlePaymentSubmit(event) {
    event.preventDefault();

    try {
      setPaymentSubmitLoading(true);
      setError("");
      setSuccessMessage("");

      if (!paymentForm.payment_method.trim()) {
        setError("Le mode de paiement est obligatoire.");
        return;
      }

      if (!paymentForm.treasury_account_id) {
        setError("Le compte de trésorerie est obligatoire.");
        return;
      }

      await api.put("/accounting-settings/payment-methods", {
        payment_method: paymentForm.payment_method.trim(),
        treasury_account_id: Number(paymentForm.treasury_account_id)
      });

      setSuccessMessage(
        "Paramétrage du mode de paiement enregistré avec succès."
      );
      setPaymentForm(initialPaymentForm);
      await fetchData();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible d’enregistrer le mode de paiement."
      );
    } finally {
      setPaymentSubmitLoading(false);
    }
  }

  const postableAccounts = useMemo(() => {
    return accounts.filter(
      (account) => account.is_active !== false && account.is_postable !== false
    );
  }, [accounts]);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Paramétrage comptable"
        subtitle="Configuration ERP des comptes clients, charges et trésorerie"
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
          <div className="mb-5 text-lg font-semibold text-slate-900">
            Catégories de dépense → comptes de charge
          </div>

          <form onSubmit={handleExpenseSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Catégorie
              </label>
              <select
                name="category"
                value={expenseForm.category}
                onChange={handleExpenseChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              >
                {expenseCategoryOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Compte de charge
              </label>
              <select
                name="expense_account_id"
                value={expenseForm.expense_account_id}
                onChange={handleExpenseChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              >
                <option value="">Sélectionner</option>
                {postableAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_number} - {account.account_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={expenseSubmitLoading}
                className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {expenseSubmitLoading
                  ? "Enregistrement..."
                  : "Enregistrer la catégorie"}
              </button>

              <button
                type="button"
                onClick={() => setExpenseForm(initialExpenseForm)}
                className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Réinitialiser
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
          <div className="mb-5 text-lg font-semibold text-slate-900">
            Modes de paiement → comptes de trésorerie
          </div>

          <form onSubmit={handlePaymentSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Mode de paiement
              </label>
              <select
                name="payment_method"
                value={paymentForm.payment_method}
                onChange={handlePaymentChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              >
                {paymentMethodOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Compte de trésorerie
              </label>
              <select
                name="treasury_account_id"
                value={paymentForm.treasury_account_id}
                onChange={handlePaymentChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              >
                <option value="">Sélectionner</option>
                {postableAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_number} - {account.account_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={paymentSubmitLoading}
                className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {paymentSubmitLoading
                  ? "Enregistrement..."
                  : "Enregistrer le mode"}
              </button>

              <button
                type="button"
                onClick={() => setPaymentForm(initialPaymentForm)}
                className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Réinitialiser
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Chargement des catégories de dépense...
            </div>
          ) : (
            <TableCard
              title={`Catégories paramétrées (${expenseCategoryAccounts.length})`}
              rows={expenseCategoryAccounts}
              emptyText="Aucune catégorie configurée"
              columns={[
                {
                  key: "category",
                  label: "Catégorie",
                  render: (row) => getExpenseCategoryLabel(row.category)
                },
                { key: "account_number", label: "Compte" },
                { key: "account_name", label: "Intitulé" },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => (
                    <button
                      onClick={() => handleEditExpenseCategory(row)}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      Modifier
                    </button>
                  )
                }
              ]}
            />
          )}
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Chargement des modes de paiement...
            </div>
          ) : (
            <TableCard
              title={`Modes paramétrés (${paymentMethodAccounts.length})`}
              rows={paymentMethodAccounts}
              emptyText="Aucun mode configuré"
              columns={[
                {
                  key: "payment_method",
                  label: "Mode",
                  render: (row) => getPaymentMethodLabel(row.payment_method)
                },
                { key: "account_number", label: "Compte" },
                { key: "account_name", label: "Intitulé" },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => (
                    <button
                      onClick={() => handleEditPaymentMethod(row)}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      Modifier
                    </button>
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