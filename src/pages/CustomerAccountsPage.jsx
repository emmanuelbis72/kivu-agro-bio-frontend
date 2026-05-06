import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import StatCard from "../components/ui/StatCard";
import TableCard from "../components/ui/TableCard";

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("fr-FR").format(date);
}

function getInvoiceStatusLabel(status) {
  switch (String(status || "").toLowerCase()) {
    case "paid":
      return "Payee";
    case "partial":
      return "Partielle";
    case "issued":
      return "Impayee";
    default:
      return status || "-";
  }
}

function getBadgeClass(tone = "slate") {
  switch (tone) {
    case "green":
      return "bg-green-100 text-green-700";
    case "amber":
      return "bg-amber-100 text-amber-700";
    case "red":
      return "bg-red-100 text-red-700";
    case "blue":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function renderInvoiceStatus(status) {
  const normalized = String(status || "").toLowerCase();
  const tone =
    normalized === "paid"
      ? "green"
      : normalized === "partial"
      ? "amber"
      : normalized === "issued"
      ? "red"
      : "slate";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getBadgeClass(tone)}`}>
      {getInvoiceStatusLabel(status)}
    </span>
  );
}

function renderAccountingStatus(status) {
  const normalized = String(status || "").toLowerCase();

  if (!normalized) {
    return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getBadgeClass()}`}>-</span>;
  }

  const tone =
    normalized === "posted"
      ? "green"
      : normalized === "error"
      ? "red"
      : normalized === "skipped"
      ? "amber"
      : "slate";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getBadgeClass(tone)}`}>
      {normalized}
    </span>
  );
}

const tabItems = [
  { key: "movements", label: "Compte courant" },
  { key: "invoices", label: "Factures" },
  { key: "payments", label: "Paiements" }
];

export default function CustomerAccountsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCustomerId = searchParams.get("customerId") || "";
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [statement, setStatement] = useState(null);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("movements");

  useEffect(() => {
    async function fetchCustomers() {
      try {
        setLoadingCustomers(true);
        setError("");

        const response = await api.get("/customers");
        const rows = Array.isArray(response.data?.data) ? response.data.data : [];
        setCustomers(rows);
      } catch (err) {
        setError(err?.response?.data?.message || "Impossible de charger les clients.");
      } finally {
        setLoadingCustomers(false);
      }
    }

    fetchCustomers();
  }, []);

  useEffect(() => {
    if (customers.length === 0) {
      setSelectedCustomerId("");
      return;
    }

    const requestedId = Number(requestedCustomerId || 0);
    const hasRequestedId = requestedId > 0 && customers.some((customer) => Number(customer.id) === requestedId);

    if (hasRequestedId) {
      setSelectedCustomerId(String(requestedId));
      return;
    }

    setSelectedCustomerId((currentValue) => {
      if (currentValue && customers.some((customer) => String(customer.id) === String(currentValue))) {
        return currentValue;
      }

      return String(customers[0].id);
    });
  }, [customers, requestedCustomerId]);

  useEffect(() => {
    if (!selectedCustomerId || requestedCustomerId === String(selectedCustomerId)) {
      return;
    }

    setSearchParams({ customerId: String(selectedCustomerId) }, { replace: true });
  }, [requestedCustomerId, selectedCustomerId, setSearchParams]);

  useEffect(() => {
    if (!selectedCustomerId) {
      setStatement(null);
      return;
    }

    async function fetchStatement() {
      try {
        setLoadingStatement(true);
        setError("");

        const response = await api.get(`/customers/${selectedCustomerId}/account-statement`);
        setStatement(response.data?.data || null);
      } catch (err) {
        setStatement(null);
        setError(err?.response?.data?.message || "Impossible de charger le compte courant du client.");
      } finally {
        setLoadingStatement(false);
      }
    }

    fetchStatement();
  }, [selectedCustomerId]);

  const summary = statement?.summary || {};
  const customer = statement?.customer || null;

  const movementColumns = useMemo(
    () => [
      {
        key: "movement_date",
        label: "Date",
        render: (row) => formatDate(row.movement_date)
      },
      {
        key: "movement_label",
        label: "Type",
        render: (row) => {
          const tone = row.movement_type === "payment" ? "green" : "blue";
          return (
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getBadgeClass(tone)}`}>
              {row.movement_type === "payment" ? "Paiement" : "Facture"}
            </span>
          );
        }
      },
      { key: "reference", label: "Piece" },
      {
        key: "description",
        label: "Libelle",
        render: (row) => (
          <div>
            <div className="font-medium text-slate-800">{row.description}</div>
            {row.notes ? <div className="text-xs text-slate-500">{row.notes}</div> : null}
          </div>
        )
      },
      {
        key: "debit",
        label: "Debit",
        render: (row) => formatMoney(row.debit)
      },
      {
        key: "credit",
        label: "Credit",
        render: (row) => formatMoney(row.credit)
      },
      {
        key: "running_balance",
        label: "Solde",
        render: (row) => <span className="font-semibold text-slate-900">{formatMoney(row.running_balance)}</span>
      },
      {
        key: "accounting_status",
        label: "Compta",
        render: (row) => renderAccountingStatus(row.accounting_status)
      }
    ],
    []
  );

  const invoiceColumns = useMemo(
    () => [
      { key: "invoice_number", label: "Facture" },
      {
        key: "invoice_date",
        label: "Date",
        render: (row) => formatDate(row.invoice_date)
      },
      {
        key: "due_date",
        label: "Echeance",
        render: (row) => formatDate(row.due_date)
      },
      {
        key: "status",
        label: "Statut",
        render: (row) => renderInvoiceStatus(row.status)
      },
      {
        key: "total_amount",
        label: "Total",
        render: (row) => formatMoney(row.total_amount)
      },
      {
        key: "paid_amount",
        label: "Paye",
        render: (row) => formatMoney(row.paid_amount)
      },
      {
        key: "balance_due",
        label: "Solde du",
        render: (row) => <span className="font-semibold text-slate-900">{formatMoney(row.balance_due)}</span>
      }
    ],
    []
  );

  const paymentColumns = useMemo(
    () => [
      {
        key: "payment_date",
        label: "Date",
        render: (row) => formatDate(row.payment_date)
      },
      { key: "invoice_number", label: "Facture" },
      {
        key: "payment_method",
        label: "Mode",
        render: (row) => row.payment_method || "-"
      },
      {
        key: "reference",
        label: "Reference",
        render: (row) => row.reference || "-"
      },
      {
        key: "amount",
        label: "Montant",
        render: (row) => <span className="font-semibold text-slate-900">{formatMoney(row.amount)}</span>
      },
      {
        key: "accounting_status",
        label: "Compta",
        render: (row) => renderAccountingStatus(row.accounting_status)
      }
    ],
    []
  );

  const activeRows = useMemo(() => {
    if (!statement) {
      return [];
    }

    if (activeTab === "invoices") {
      return statement.invoices || [];
    }

    if (activeTab === "payments") {
      return statement.payments || [];
    }

    return statement.movements || [];
  }, [activeTab, statement]);

  const activeColumns = activeTab === "invoices" ? invoiceColumns : activeTab === "payments" ? paymentColumns : movementColumns;
  const activeTitle =
    activeTab === "invoices"
      ? `Factures (${statement?.invoices?.length || 0})`
      : activeTab === "payments"
      ? `Paiements (${statement?.payments?.length || 0})`
      : `Mouvements (${statement?.movements?.length || 0})`;

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Comptes courants clients"
        subtitle="Consulte le solde, les factures et les paiements de chaque client dans un seul onglet."
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(280px,360px)_1fr]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Client
            </label>
            <select
              value={selectedCustomerId}
              onChange={(event) => setSelectedCustomerId(event.target.value)}
              disabled={loadingCustomers || customers.length === 0}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              {customers.length === 0 ? (
                <option value="">
                  {loadingCustomers ? "Chargement des clients..." : "Aucun client"}
                </option>
              ) : null}
              {customers.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.business_name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl bg-slate-50 px-5 py-4">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Fiche client
            </div>
            {customer ? (
              <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Nom</div>
                  <div className="mt-1 font-semibold text-slate-900">{customer.business_name}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Type</div>
                  <div className="mt-1">{customer.customer_type || "-"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Ville</div>
                  <div className="mt-1">{customer.city || "-"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Telephone</div>
                  <div className="mt-1">{customer.phone || "-"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Delai paiement</div>
                  <div className="mt-1">{Number(customer.payment_terms_days || 0)} jours</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Limite credit</div>
                  <div className="mt-1">{formatMoney(customer.credit_limit)}</div>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-500">
                Selectionne un client pour voir son compte courant.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total facture"
          value={formatMoney(summary.total_invoiced)}
          subtitle={`${Number(summary.total_invoices || 0)} facture(s)`}
        />
        <StatCard
          title="Total paye"
          value={formatMoney(summary.total_paid)}
          subtitle={`${Number(summary.total_payments || 0)} paiement(s)`}
        />
        <StatCard
          title="Solde du"
          value={formatMoney(summary.balance_due)}
          subtitle={`${Number(summary.partial_invoices || 0) + Number(summary.issued_invoices || 0)} facture(s) ouvertes`}
        />
        <StatCard
          title="Echeances en retard"
          value={formatMoney(summary.overdue_balance)}
          subtitle={`${Number(summary.overdue_invoices || 0)} facture(s) echee(s)`}
        />
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="flex flex-wrap gap-3">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? "bg-brand-600 text-white"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {loadingStatement ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Chargement du compte courant...
            </div>
          ) : (
            <TableCard
              title={activeTitle}
              rows={activeRows}
              columns={activeColumns}
              emptyText="Aucune donnee pour ce client"
            />
          )}
        </div>
      </div>
    </div>
  );
}
