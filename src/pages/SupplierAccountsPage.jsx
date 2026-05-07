import { useEffect, useMemo, useRef, useState } from "react";
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
      return "Reglee";
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
  { key: "invoices", label: "Factures fournisseurs" },
  { key: "payments", label: "Paiements fournisseurs" }
];

export default function SupplierAccountsPage() {
  const tableSectionRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSupplierId = searchParams.get("supplierId") || "";
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [statement, setStatement] = useState(null);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("movements");
  const [invoiceFilter, setInvoiceFilter] = useState("all");
  const [selectedDetail, setSelectedDetail] = useState(null);

  useEffect(() => {
    async function fetchSuppliers() {
      try {
        setLoadingSuppliers(true);
        setError("");

        const response = await api.get("/suppliers");
        const rows = Array.isArray(response.data?.data) ? response.data.data : [];
        setSuppliers(rows);
      } catch (err) {
        setError(err?.response?.data?.message || "Impossible de charger les fournisseurs.");
      } finally {
        setLoadingSuppliers(false);
      }
    }

    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (suppliers.length === 0) {
      setSelectedSupplierId("");
      return;
    }

    const requestedId = Number(requestedSupplierId || 0);
    const hasRequestedId =
      requestedId > 0 &&
      suppliers.some((supplier) => Number(supplier.id) === requestedId);

    if (hasRequestedId) {
      setSelectedSupplierId(String(requestedId));
      return;
    }

    setSelectedSupplierId((currentValue) => {
      if (
        currentValue &&
        suppliers.some((supplier) => String(supplier.id) === String(currentValue))
      ) {
        return currentValue;
      }

      return String(suppliers[0].id);
    });
  }, [suppliers, requestedSupplierId]);

  useEffect(() => {
    if (!selectedSupplierId || requestedSupplierId === String(selectedSupplierId)) {
      return;
    }

    setSearchParams({ supplierId: String(selectedSupplierId) }, { replace: true });
  }, [requestedSupplierId, selectedSupplierId, setSearchParams]);

  useEffect(() => {
    if (!selectedSupplierId) {
      setStatement(null);
      return;
    }

    setSelectedDetail(null);
    setInvoiceFilter("all");
    setActiveTab("movements");

    async function fetchStatement() {
      try {
        setLoadingStatement(true);
        setError("");

        const response = await api.get(`/suppliers/${selectedSupplierId}/account-statement`);
        setStatement(response.data?.data || null);
      } catch (err) {
        setStatement(null);
        setError(err?.response?.data?.message || "Impossible de charger le compte fournisseur.");
      } finally {
        setLoadingStatement(false);
      }
    }

    fetchStatement();
  }, [selectedSupplierId]);

  function focusDetailsTable() {
    window.requestAnimationFrame(() => {
      tableSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }

  function openInvoiceList(filter = "all") {
    setActiveTab("invoices");
    setInvoiceFilter(filter);
    setSelectedDetail(null);
    focusDetailsTable();
  }

  function openPaymentsList() {
    setActiveTab("payments");
    setSelectedDetail(null);
    focusDetailsTable();
  }

  function handleSelectDetail(type, row) {
    setSelectedDetail({ type, row });
  }

  const summary = statement?.summary || {};
  const supplier = statement?.supplier || null;

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
          const tone = row.movement_type === "supplier_payment" ? "green" : "blue";
          return (
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getBadgeClass(tone)}`}>
              {row.movement_type === "supplier_payment" ? "Paiement" : "Facture"}
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
        label: "Solde du",
        render: (row) => <span className="font-semibold text-slate-900">{formatMoney(row.running_balance)}</span>
      },
      {
        key: "accounting_status",
        label: "Compta",
        render: (row) => renderAccountingStatus(row.accounting_status)
      },
      {
        key: "actions",
        label: "Details",
        render: (row) => (
          <button
            type="button"
            onClick={() => handleSelectDetail("movement", row)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
          >
            Voir details
          </button>
        )
      }
    ],
    []
  );

  const invoiceColumns = useMemo(
    () => [
      { key: "purchase_invoice_number", label: "Facture" },
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
      },
      {
        key: "actions",
        label: "Details",
        render: (row) => (
          <button
            type="button"
            onClick={() => handleSelectDetail("invoice", row)}
            className="rounded-xl border border-brand-300 px-3 py-2 text-xs font-semibold text-brand-700"
          >
            Voir details
          </button>
        )
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
      { key: "purchase_invoice_number", label: "Facture" },
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
      },
      {
        key: "actions",
        label: "Details",
        render: (row) => (
          <button
            type="button"
            onClick={() => handleSelectDetail("payment", row)}
            className="rounded-xl border border-brand-300 px-3 py-2 text-xs font-semibold text-brand-700"
          >
            Voir details
          </button>
        )
      }
    ],
    []
  );

  const filteredInvoices = useMemo(() => {
    const invoices = statement?.invoices || [];

    if (invoiceFilter === "open") {
      return invoices.filter((row) =>
        ["issued", "partial"].includes(String(row.status || "").toLowerCase())
      );
    }

    if (invoiceFilter === "overdue") {
      return invoices.filter((row) => {
        if (!row.due_date || Number(row.balance_due || 0) <= 0) {
          return false;
        }

        const dueDate = new Date(row.due_date);

        if (Number.isNaN(dueDate.getTime())) {
          return false;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);

        return dueDate < today;
      });
    }

    return invoices;
  }, [invoiceFilter, statement]);

  const activeRows = useMemo(() => {
    if (!statement) {
      return [];
    }

    if (activeTab === "invoices") {
      return filteredInvoices;
    }

    if (activeTab === "payments") {
      return statement.payments || [];
    }

    return statement.movements || [];
  }, [activeTab, filteredInvoices, statement]);

  const activeColumns =
    activeTab === "invoices"
      ? invoiceColumns
      : activeTab === "payments"
      ? paymentColumns
      : movementColumns;

  const activeTitle =
    activeTab === "invoices"
      ? invoiceFilter === "open"
        ? `Factures ouvertes (${filteredInvoices.length})`
        : invoiceFilter === "overdue"
        ? `Factures echees (${filteredInvoices.length})`
        : `Factures fournisseurs (${filteredInvoices.length})`
      : activeTab === "payments"
      ? `Paiements fournisseurs (${statement?.payments?.length || 0})`
      : `Mouvements (${statement?.movements?.length || 0})`;

  const detailTitle =
    selectedDetail?.type === "invoice"
      ? `Detail facture ${selectedDetail?.row?.purchase_invoice_number || ""}`
      : selectedDetail?.type === "payment"
      ? `Detail paiement ${selectedDetail?.row?.reference || selectedDetail?.row?.id || ""}`
      : selectedDetail?.type === "movement"
      ? `Detail mouvement ${selectedDetail?.row?.reference || ""}`
      : "";

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Comptes fournisseurs"
        subtitle="Consulte le solde, les factures fournisseurs et les paiements dans un seul onglet."
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
              Fournisseur
            </label>
            <select
              value={selectedSupplierId}
              onChange={(event) => setSelectedSupplierId(event.target.value)}
              disabled={loadingSuppliers || suppliers.length === 0}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              {suppliers.length === 0 ? (
                <option value="">
                  {loadingSuppliers ? "Chargement des fournisseurs..." : "Aucun fournisseur"}
                </option>
              ) : null}
              {suppliers.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.business_name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl bg-slate-50 px-5 py-4">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Fiche fournisseur
            </div>
            {supplier ? (
              <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Nom</div>
                  <div className="mt-1 font-semibold text-slate-900">{supplier.business_name}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Type</div>
                  <div className="mt-1">{supplier.supplier_type || "-"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Ville</div>
                  <div className="mt-1">{supplier.city || "-"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Telephone</div>
                  <div className="mt-1">{supplier.phone || "-"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Delai paiement</div>
                  <div className="mt-1">{Number(supplier.payment_terms_days || 0)} jours</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Compte fournisseur</div>
                  <div className="mt-1">
                    {supplier.payable_account_number
                      ? `${supplier.payable_account_number} - ${supplier.payable_account_name}`
                      : "-"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-500">
                Selectionne un fournisseur pour voir son compte courant.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total achats"
          value={formatMoney(summary.total_purchased)}
          subtitle={
            <button
              type="button"
              onClick={() => openInvoiceList("all")}
              className="text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
            >
              {Number(summary.total_invoices || 0)} facture(s)
            </button>
          }
        />
        <StatCard
          title="Total paye"
          value={formatMoney(summary.total_paid)}
          subtitle={
            <button
              type="button"
              onClick={openPaymentsList}
              className="text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
            >
              {Number(summary.total_payments || 0)} paiement(s)
            </button>
          }
        />
        <StatCard
          title="Solde du"
          value={formatMoney(summary.balance_due)}
          subtitle={
            <button
              type="button"
              onClick={() => openInvoiceList("open")}
              className="text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
            >
              {Number(summary.partial_invoices || 0) + Number(summary.issued_invoices || 0)} facture(s) ouvertes
            </button>
          }
        />
        <StatCard
          title="Echeances en retard"
          value={formatMoney(summary.overdue_balance)}
          subtitle={
            <button
              type="button"
              onClick={() => openInvoiceList("overdue")}
              className="text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
            >
              {Number(summary.overdue_invoices || 0)} facture(s) echee(s)
            </button>
          }
        />
      </div>

      <div ref={tableSectionRef} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
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

        {activeTab === "invoices" ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setInvoiceFilter("all")}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                invoiceFilter === "all"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Toutes les factures
            </button>
            <button
              type="button"
              onClick={() => setInvoiceFilter("open")}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                invoiceFilter === "open"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Factures ouvertes
            </button>
            <button
              type="button"
              onClick={() => setInvoiceFilter("overdue")}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                invoiceFilter === "overdue"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Factures echees
            </button>
          </div>
        ) : null}

        <div className="mt-6">
          {loadingStatement ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Chargement du compte fournisseur...
            </div>
          ) : (
            <TableCard
              title={activeTitle}
              rows={activeRows}
              columns={activeColumns}
              emptyText="Aucune donnee pour ce fournisseur"
            />
          )}
        </div>
      </div>

      {selectedDetail ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-lg font-semibold text-slate-900">{detailTitle}</div>
            <button
              type="button"
              onClick={() => setSelectedDetail(null)}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Fermer
            </button>
          </div>

          {selectedDetail.type === "invoice" ? (
            <div className="mt-5 grid grid-cols-1 gap-4 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Facture</div>
                <div className="mt-1 font-semibold text-slate-900">{selectedDetail.row.purchase_invoice_number}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Date</div>
                <div className="mt-1">{formatDate(selectedDetail.row.invoice_date)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Echeance</div>
                <div className="mt-1">{formatDate(selectedDetail.row.due_date)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Statut</div>
                <div className="mt-1">{renderInvoiceStatus(selectedDetail.row.status)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Total facture</div>
                <div className="mt-1 font-semibold text-slate-900">{formatMoney(selectedDetail.row.total_amount)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Montant paye</div>
                <div className="mt-1">{formatMoney(selectedDetail.row.paid_amount)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Solde du</div>
                <div className="mt-1">{formatMoney(selectedDetail.row.balance_due)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Comptabilisation</div>
                <div className="mt-1">{renderAccountingStatus(selectedDetail.row.accounting_status)}</div>
              </div>
              <div className="md:col-span-2 xl:col-span-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Notes</div>
                <div className="mt-1 rounded-2xl bg-slate-50 px-4 py-3">{selectedDetail.row.notes || "-"}</div>
              </div>
            </div>
          ) : null}

          {selectedDetail.type === "payment" ? (
            <div className="mt-5 grid grid-cols-1 gap-4 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Paiement</div>
                <div className="mt-1 font-semibold text-slate-900">{selectedDetail.row.reference || `SUP-PAY-${selectedDetail.row.id}`}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Facture</div>
                <div className="mt-1">{selectedDetail.row.purchase_invoice_number || "-"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Date</div>
                <div className="mt-1">{formatDate(selectedDetail.row.payment_date)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Mode</div>
                <div className="mt-1">{selectedDetail.row.payment_method || "-"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Montant</div>
                <div className="mt-1 font-semibold text-slate-900">{formatMoney(selectedDetail.row.amount)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Comptabilisation</div>
                <div className="mt-1">{renderAccountingStatus(selectedDetail.row.accounting_status)}</div>
              </div>
              <div className="md:col-span-2 xl:col-span-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Notes</div>
                <div className="mt-1 rounded-2xl bg-slate-50 px-4 py-3">{selectedDetail.row.notes || "-"}</div>
              </div>
            </div>
          ) : null}

          {selectedDetail.type === "movement" ? (
            <div className="mt-5 grid grid-cols-1 gap-4 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Piece</div>
                <div className="mt-1 font-semibold text-slate-900">{selectedDetail.row.reference}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Type</div>
                <div className="mt-1">{selectedDetail.row.movement_label}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Date</div>
                <div className="mt-1">{formatDate(selectedDetail.row.movement_date)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Solde courant</div>
                <div className="mt-1">{formatMoney(selectedDetail.row.running_balance)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Debit</div>
                <div className="mt-1">{formatMoney(selectedDetail.row.debit)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Credit</div>
                <div className="mt-1">{formatMoney(selectedDetail.row.credit)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Comptabilisation</div>
                <div className="mt-1">{renderAccountingStatus(selectedDetail.row.accounting_status)}</div>
              </div>
              <div className="md:col-span-2 xl:col-span-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Notes</div>
                <div className="mt-1 rounded-2xl bg-slate-50 px-4 py-3">{selectedDetail.row.notes || "-"}</div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
