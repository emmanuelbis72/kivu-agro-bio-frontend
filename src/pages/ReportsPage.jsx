import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import StatCard from "../components/ui/StatCard";
import TableCard from "../components/ui/TableCard";
import { saveBlobResponse } from "../utils/fileDownload";

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));
}

function formatNumber(value) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }

  return `${Number(value).toFixed(2)} %`;
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

function formatBoolean(value) {
  return value ? "Oui" : "Non";
}

function compareAlphabetic(leftValue, rightValue) {
  return String(leftValue || "").localeCompare(String(rightValue || ""), "fr", {
    sensitivity: "base"
  });
}

function getInitialFilters() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 29);

  return {
    as_of_date: new Date().toISOString().split("T")[0],
    start_date: startDate.toISOString().split("T")[0],
    end_date: endDate.toISOString().split("T")[0],
    budget_id: "",
    category: "",
    warehouse_id: "",
    customer_id: "",
    product_id: "",
    warehouse_ids: [],
    customer_ids: [],
    product_ids: [],
    invoice_number: "",
    invoice_status: "",
    low_stock_only: false,
    detail_limit: 20
  };
}

function escapeCsvValue(value) {
  const stringValue =
    value === null || value === undefined ? "" : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function triggerCsvDownload(filename, content) {
  const blob = new Blob([`\uFEFF${content}`], {
    type: "text/csv;charset=utf-8;"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

const reportConfigs = {
  customer_aging: {
    exportKey: "customer-aging",
    label: "Balance agee clients",
    description:
      "Vue des creances ouvertes par client, avec ventilation par tranches d'age.",
    endpoint: "/reports/customer-aging",
    buildParams: (filters) => ({
      as_of_date: filters.as_of_date,
      warehouse_id: filters.warehouse_id || undefined
    }),
    exportFilename: (filters) =>
      `balance-agee-clients-${filters.as_of_date || "export"}.csv`,
    summaryCards: (summary) => [
      { title: "Clients", value: Number(summary.total_customers || 0) },
      {
        title: "Solde total",
        value: formatMoney(summary.total_balance_due)
      },
      {
        title: "0-30 jours",
        value: formatMoney(summary.bucket_1_30)
      },
      {
        title: "90+ jours",
        value: formatMoney(summary.bucket_90_plus)
      }
    ],
    columns: [
      { key: "business_name", label: "Client", csvValue: (row) => row.business_name },
      { key: "city", label: "Ville", csvValue: (row) => row.city || "" },
      {
        key: "open_invoices_count",
        label: "Factures ouvertes",
        render: (row) => Number(row.open_invoices_count || 0),
        csvValue: (row) => Number(row.open_invoices_count || 0)
      },
      {
        key: "oldest_due_date",
        label: "Plus ancienne echeance",
        render: (row) => formatDate(row.oldest_due_date),
        csvValue: (row) => formatDate(row.oldest_due_date)
      },
      {
        key: "total_balance_due",
        label: "Solde total",
        render: (row) => formatMoney(row.total_balance_due),
        csvValue: (row) => row.total_balance_due
      },
      {
        key: "current_balance",
        label: "Non echu",
        render: (row) => formatMoney(row.current_balance),
        csvValue: (row) => row.current_balance
      },
      {
        key: "bucket_1_30",
        label: "1-30 j",
        render: (row) => formatMoney(row.bucket_1_30),
        csvValue: (row) => row.bucket_1_30
      },
      {
        key: "bucket_31_60",
        label: "31-60 j",
        render: (row) => formatMoney(row.bucket_31_60),
        csvValue: (row) => row.bucket_31_60
      },
      {
        key: "bucket_61_90",
        label: "61-90 j",
        render: (row) => formatMoney(row.bucket_61_90),
        csvValue: (row) => row.bucket_61_90
      },
      {
        key: "bucket_90_plus",
        label: "90+ j",
        render: (row) => formatMoney(row.bucket_90_plus),
        csvValue: (row) => row.bucket_90_plus
      }
    ],
    emptyText: "Aucune creance client ouverte"
  },
  supplier_aging: {
    exportKey: "supplier-aging",
    label: "Balance agee fournisseurs",
    description:
      "Vue des dettes fournisseurs ouvertes, avec ventilation par tranches d'age.",
    endpoint: "/reports/supplier-aging",
    buildParams: (filters) => ({
      as_of_date: filters.as_of_date,
      warehouse_id: filters.warehouse_id || undefined
    }),
    exportFilename: (filters) =>
      `balance-agee-fournisseurs-${filters.as_of_date || "export"}.csv`,
    summaryCards: (summary) => [
      { title: "Fournisseurs", value: Number(summary.total_suppliers || 0) },
      {
        title: "Solde total",
        value: formatMoney(summary.total_balance_due)
      },
      {
        title: "0-30 jours",
        value: formatMoney(summary.bucket_1_30)
      },
      {
        title: "90+ jours",
        value: formatMoney(summary.bucket_90_plus)
      }
    ],
    columns: [
      { key: "business_name", label: "Fournisseur", csvValue: (row) => row.business_name },
      { key: "city", label: "Ville", csvValue: (row) => row.city || "" },
      {
        key: "open_invoices_count",
        label: "Factures ouvertes",
        render: (row) => Number(row.open_invoices_count || 0),
        csvValue: (row) => Number(row.open_invoices_count || 0)
      },
      {
        key: "oldest_due_date",
        label: "Plus ancienne echeance",
        render: (row) => formatDate(row.oldest_due_date),
        csvValue: (row) => formatDate(row.oldest_due_date)
      },
      {
        key: "total_balance_due",
        label: "Solde total",
        render: (row) => formatMoney(row.total_balance_due),
        csvValue: (row) => row.total_balance_due
      },
      {
        key: "current_balance",
        label: "Non echu",
        render: (row) => formatMoney(row.current_balance),
        csvValue: (row) => row.current_balance
      },
      {
        key: "bucket_1_30",
        label: "1-30 j",
        render: (row) => formatMoney(row.bucket_1_30),
        csvValue: (row) => row.bucket_1_30
      },
      {
        key: "bucket_31_60",
        label: "31-60 j",
        render: (row) => formatMoney(row.bucket_31_60),
        csvValue: (row) => row.bucket_31_60
      },
      {
        key: "bucket_61_90",
        label: "61-90 j",
        render: (row) => formatMoney(row.bucket_61_90),
        csvValue: (row) => row.bucket_61_90
      },
      {
        key: "bucket_90_plus",
        label: "90+ j",
        render: (row) => formatMoney(row.bucket_90_plus),
        csvValue: (row) => row.bucket_90_plus
      }
    ],
    emptyText: "Aucune dette fournisseur ouverte"
  },
  customer_ledger: {
    exportKey: "customer-ledger",
    label: "Compte courant clients",
    description:
      "Vue bilan par client avec le total des factures, le total des paiements et la balance sur la periode choisie.",
    endpoint: "/reports/customer-ledger",
    buildParams: (filters) => ({
      start_date: filters.start_date,
      end_date: filters.end_date,
      customer_id: filters.customer_id || undefined
    }),
    exportFilename: (filters) =>
      `compte-courant-clients-${filters.start_date || "debut"}-${filters.end_date || "fin"}.csv`,
    summaryCards: (summary) => [
      { title: "Clients", value: Number(summary.total_customers || 0) },
      { title: "Nb factures", value: Number(summary.invoices_count || 0) },
      { title: "Nb paiements", value: Number(summary.payments_count || 0) },
      {
        title: "Total factures",
        value: formatMoney(summary.invoiced_amount)
      },
      {
        title: "Total paiements",
        value: formatMoney(summary.paid_amount)
      },
      {
        title: "Balance",
        value: formatMoney(summary.balance_amount)
      }
    ],
    columns: [
      { key: "business_name", label: "Client", csvValue: (row) => row.business_name },
      { key: "city", label: "Ville", csvValue: (row) => row.city || "" },
      {
        key: "invoiced_amount",
        label: "Factures",
        render: (row) => formatMoney(row.invoiced_amount),
        csvValue: (row) => row.invoiced_amount
      },
      {
        key: "paid_amount",
        label: "Paiements",
        render: (row) => formatMoney(row.paid_amount),
        csvValue: (row) => row.paid_amount
      },
      {
        key: "balance_amount",
        label: "Balance",
        render: (row) => (
          <span
            className={`font-semibold ${
              Number(row.balance_amount || 0) > 0
                ? "text-amber-700"
                : Number(row.balance_amount || 0) < 0
                ? "text-emerald-700"
                : "text-slate-700"
            }`}
          >
            {formatMoney(row.balance_amount)}
          </span>
        ),
        csvValue: (row) => row.balance_amount
      },
      {
        key: "invoices_count",
        label: "Nb factures",
        render: (row) => Number(row.invoices_count || 0),
        csvValue: (row) => Number(row.invoices_count || 0)
      },
      {
        key: "payments_count",
        label: "Nb paiements",
        render: (row) => Number(row.payments_count || 0),
        csvValue: (row) => Number(row.payments_count || 0)
      },
      {
        key: "last_invoice_date",
        label: "Derniere facture",
        render: (row) => formatDate(row.last_invoice_date),
        csvValue: (row) => formatDate(row.last_invoice_date)
      },
      {
        key: "last_payment_date",
        label: "Dernier paiement",
        render: (row) => formatDate(row.last_payment_date),
        csvValue: (row) => formatDate(row.last_payment_date)
      }
    ],
    emptyText: "Aucun mouvement client sur cette periode"
  },
  sales_detail: {
    exportKey: "sales-detail",
    label: "Etat commercial detaille",
    description:
      "Lignes facturees avec client, depot, produit, chiffre d'affaires, cout et profit brut.",
    endpoint: "/reports/sales-detail",
    buildParams: (filters, forExport = false) => ({
      start_date: filters.start_date,
      end_date: filters.end_date,
      warehouse_id: filters.warehouse_id || undefined,
      customer_id: filters.customer_id || undefined,
      product_id: filters.product_id || undefined,
      limit: forExport ? 5000 : 200
    }),
    exportFilename: (filters) =>
      `etat-commercial-${filters.start_date || "debut"}-${filters.end_date || "fin"}.csv`,
    summaryCards: (summary) => [
      { title: "Lignes", value: Number(summary.total_lines || 0) },
      { title: "Factures", value: Number(summary.total_invoices || 0) },
      {
        title: "Chiffre d'affaires",
        value: formatMoney(summary.total_sales_amount)
      },
      {
        title: "Profit brut",
        value: formatMoney(summary.gross_profit_amount)
      }
    ],
    columns: [
      { key: "invoice_number", label: "Facture", csvValue: (row) => row.invoice_number },
      {
        key: "invoice_date",
        label: "Date",
        render: (row) => formatDate(row.invoice_date),
        csvValue: (row) => formatDate(row.invoice_date)
      },
      { key: "customer_name", label: "Client", csvValue: (row) => row.customer_name },
      { key: "customer_city", label: "Ville", csvValue: (row) => row.customer_city || "" },
      { key: "warehouse_name", label: "Depot", csvValue: (row) => row.warehouse_name },
      { key: "product_name", label: "Produit", csvValue: (row) => row.product_name },
      { key: "sku", label: "SKU", csvValue: (row) => row.sku || "" },
      {
        key: "quantity",
        label: "Qte",
        render: (row) => formatNumber(row.quantity),
        csvValue: (row) => row.quantity
      },
      {
        key: "unit_price",
        label: "P.U.",
        render: (row) => formatMoney(row.unit_price),
        csvValue: (row) => row.unit_price
      },
      {
        key: "line_total",
        label: "CA",
        render: (row) => formatMoney(row.line_total),
        csvValue: (row) => row.line_total
      },
      {
        key: "line_cogs_amount",
        label: "Cout",
        render: (row) => formatMoney(row.line_cogs_amount),
        csvValue: (row) => row.line_cogs_amount
      },
      {
        key: "gross_profit_amount",
        label: "Profit brut",
        render: (row) => formatMoney(row.gross_profit_amount),
        csvValue: (row) => row.gross_profit_amount
      },
      {
        key: "gross_margin_percent",
        label: "Marge",
        render: (row) => formatPercent(row.gross_margin_percent),
        csvValue: (row) => row.gross_margin_percent
      }
    ],
    emptyText: "Aucune ligne commerciale sur cette periode"
  },
  sales_by_category: {
    exportKey: "sales-by-category",
    label: "Ventes par categorie",
    description:
      "Vrai etat commercial par categorie avec volume, clients, depots, chiffre d'affaires, cout, profit et marge.",
    endpoint: "/reports/sales-by-category",
    buildParams: (filters, forExport = false) => ({
      start_date: filters.start_date,
      end_date: filters.end_date,
      warehouse_id: filters.warehouse_id || undefined,
      customer_id: filters.customer_id || undefined,
      limit: forExport ? 5000 : 500
    }),
    exportFilename: (filters) =>
      `ventes-par-categorie-${filters.start_date || "debut"}-${filters.end_date || "fin"}.csv`,
    summaryCards: (summary) => [
      { title: "Categories", value: Number(summary.total_categories || 0) },
      { title: "Produits", value: Number(summary.total_products || 0) },
      { title: "Clients", value: Number(summary.total_customers || 0) },
      { title: "Depots", value: Number(summary.total_warehouses || 0) },
      { title: "Factures", value: Number(summary.total_invoices || 0) },
      {
        title: "Quantite",
        value: formatNumber(summary.total_quantity)
      },
      {
        title: "Chiffre d'affaires",
        value: formatMoney(summary.total_sales_amount)
      },
      {
        title: "Profit brut",
        value: formatMoney(summary.gross_profit_amount)
      },
      {
        title: "Marge moyenne",
        value: formatPercent(summary.gross_margin_percent)
      }
    ],
    columns: [
      {
        key: "category_label",
        label: "Categorie",
        csvValue: (row) => row.category_label
      },
      {
        key: "products_count",
        label: "Produits",
        render: (row) => Number(row.products_count || 0),
        csvValue: (row) => Number(row.products_count || 0)
      },
      {
        key: "customers_count",
        label: "Clients",
        render: (row) => Number(row.customers_count || 0),
        csvValue: (row) => Number(row.customers_count || 0)
      },
      {
        key: "warehouses_count",
        label: "Depots",
        render: (row) => Number(row.warehouses_count || 0),
        csvValue: (row) => Number(row.warehouses_count || 0)
      },
      {
        key: "invoices_count",
        label: "Factures",
        render: (row) => Number(row.invoices_count || 0),
        csvValue: (row) => Number(row.invoices_count || 0)
      },
      {
        key: "total_quantity",
        label: "Quantite",
        render: (row) => formatNumber(row.total_quantity),
        csvValue: (row) => row.total_quantity
      },
      {
        key: "total_sales_amount",
        label: "CA",
        render: (row) => formatMoney(row.total_sales_amount),
        csvValue: (row) => row.total_sales_amount
      },
      {
        key: "total_cogs_amount",
        label: "Cout",
        render: (row) => formatMoney(row.total_cogs_amount),
        csvValue: (row) => row.total_cogs_amount
      },
      {
        key: "gross_profit_amount",
        label: "Profit brut",
        render: (row) => formatMoney(row.gross_profit_amount),
        csvValue: (row) => row.gross_profit_amount
      },
      {
        key: "gross_margin_percent",
        label: "Marge",
        render: (row) => formatPercent(row.gross_margin_percent),
        csvValue: (row) => row.gross_margin_percent
      },
      {
        key: "first_invoice_date",
        label: "Premiere vente",
        render: (row) => formatDate(row.first_invoice_date),
        csvValue: (row) => formatDate(row.first_invoice_date)
      },
      {
        key: "last_invoice_date",
        label: "Derniere vente",
        render: (row) => formatDate(row.last_invoice_date),
        csvValue: (row) => formatDate(row.last_invoice_date)
      }
    ],
    emptyText: "Aucune vente agregee par categorie sur cette periode"
  },
  sales_by_commercial: {
    exportKey: "sales-by-commercial",
    label: "Ventes par commercial",
    description:
      "Etat commercial par responsable avec CA, encaissements, encours, profit et taux de recouvrement. Fallback sur le responsable depot si le client n'a pas encore de commercial renseigne.",
    endpoint: "/reports/sales-by-commercial",
    buildParams: (filters, forExport = false) => ({
      start_date: filters.start_date,
      end_date: filters.end_date,
      warehouse_id: filters.warehouse_id || undefined,
      customer_id: filters.customer_id || undefined,
      limit: forExport ? 5000 : 500
    }),
    exportFilename: (filters) =>
      `ventes-par-commercial-${filters.start_date || "debut"}-${filters.end_date || "fin"}.csv`,
    summaryCards: (summary) => [
      { title: "Commerciaux", value: Number(summary.total_commercials || 0) },
      { title: "Clients", value: Number(summary.total_customers || 0) },
      { title: "Villes", value: Number(summary.total_cities || 0) },
      { title: "Depots", value: Number(summary.total_warehouses || 0) },
      { title: "Factures", value: Number(summary.total_invoices || 0) },
      {
        title: "Chiffre d'affaires",
        value: formatMoney(summary.total_sales_amount)
      },
      {
        title: "Encaissements",
        value: formatMoney(summary.total_collected_amount)
      },
      {
        title: "Encours",
        value: formatMoney(summary.total_receivables)
      },
      {
        title: "Profit brut",
        value: formatMoney(summary.gross_profit_amount)
      }
    ],
    columns: [
      {
        key: "commercial_name",
        label: "Commercial",
        csvValue: (row) => row.commercial_name
      },
      {
        key: "commercial_source",
        label: "Source",
        render: (row) =>
          row.commercial_source === "client"
            ? "Client"
            : row.commercial_source === "depot_manager"
            ? "Depot"
            : "A completer",
        csvValue: (row) => row.commercial_source || ""
      },
      {
        key: "customers_count",
        label: "Clients",
        render: (row) => Number(row.customers_count || 0),
        csvValue: (row) => Number(row.customers_count || 0)
      },
      {
        key: "cities_count",
        label: "Villes",
        render: (row) => Number(row.cities_count || 0),
        csvValue: (row) => Number(row.cities_count || 0)
      },
      {
        key: "chains_count",
        label: "Chaines",
        render: (row) => Number(row.chains_count || 0),
        csvValue: (row) => Number(row.chains_count || 0)
      },
      {
        key: "warehouses_count",
        label: "Depots",
        render: (row) => Number(row.warehouses_count || 0),
        csvValue: (row) => Number(row.warehouses_count || 0)
      },
      {
        key: "invoices_count",
        label: "Factures",
        render: (row) => Number(row.invoices_count || 0),
        csvValue: (row) => Number(row.invoices_count || 0)
      },
      {
        key: "total_quantity",
        label: "Quantite",
        render: (row) => formatNumber(row.total_quantity),
        csvValue: (row) => row.total_quantity
      },
      {
        key: "total_sales_amount",
        label: "CA",
        render: (row) => formatMoney(row.total_sales_amount),
        csvValue: (row) => row.total_sales_amount
      },
      {
        key: "total_collected_amount",
        label: "Encaisse",
        render: (row) => formatMoney(row.total_collected_amount),
        csvValue: (row) => row.total_collected_amount
      },
      {
        key: "total_receivables",
        label: "Encours",
        render: (row) => formatMoney(row.total_receivables),
        csvValue: (row) => row.total_receivables
      },
      {
        key: "gross_profit_amount",
        label: "Profit brut",
        render: (row) => formatMoney(row.gross_profit_amount),
        csvValue: (row) => row.gross_profit_amount
      },
      {
        key: "collection_rate_percent",
        label: "Recouvrement",
        render: (row) => formatPercent(row.collection_rate_percent),
        csvValue: (row) => row.collection_rate_percent
      },
      {
        key: "gross_margin_percent",
        label: "Marge",
        render: (row) => formatPercent(row.gross_margin_percent),
        csvValue: (row) => row.gross_margin_percent
      }
    ],
    emptyText: "Aucune vente agregee par commercial sur cette periode"
  },
  break_even: {
    exportKey: "break-even",
    label: "Seuil de rentabilite",
    description:
      "Point mort observe sur la periode, a partir du CA net, du cout variable direct et des charges d'exploitation, avec evolution mensuelle.",
    endpoint: "/reports/break-even",
    buildParams: (filters) => ({
      start_date: filters.start_date,
      end_date: filters.end_date
    }),
    exportFilename: (filters) =>
      `seuil-rentabilite-${filters.start_date || "debut"}-${filters.end_date || "fin"}.csv`,
    summaryCards: (summary) => [
      { title: "Factures", value: Number(summary.total_invoices || 0) },
      { title: "Depenses", value: Number(summary.total_expenses || 0) },
      {
        title: "CA net",
        value: formatMoney(summary.net_sales_amount)
      },
      {
        title: "Cout variable",
        value: formatMoney(summary.variable_cost_amount)
      },
      {
        title: "Point mort CA",
        value:
          summary.break_even_sales_amount === null ||
          summary.break_even_sales_amount === undefined
            ? "-"
            : formatMoney(summary.break_even_sales_amount)
      },
      {
        title: "Marge de securite",
        value:
          summary.safety_margin_amount === null ||
          summary.safety_margin_amount === undefined
            ? "-"
            : formatMoney(summary.safety_margin_amount)
      },
      {
        title: "Taux de contribution",
        value: formatPercent(summary.contribution_margin_ratio)
      },
      {
        title: "Securite %",
        value:
          summary.safety_margin_percent === null ||
          summary.safety_margin_percent === undefined
            ? "-"
            : formatPercent(summary.safety_margin_percent)
      }
    ],
    columns: [
      {
        key: "period_label",
        label: "Periode",
        csvValue: (row) => row.period_label
      },
      {
        key: "invoices_count",
        label: "Factures",
        render: (row) => Number(row.invoices_count || 0),
        csvValue: (row) => Number(row.invoices_count || 0)
      },
      {
        key: "expenses_count",
        label: "Depenses",
        render: (row) => Number(row.expenses_count || 0),
        csvValue: (row) => Number(row.expenses_count || 0)
      },
      {
        key: "total_quantity",
        label: "Quantite",
        render: (row) => formatNumber(row.total_quantity),
        csvValue: (row) => row.total_quantity
      },
      {
        key: "net_sales_amount",
        label: "CA net",
        render: (row) => formatMoney(row.net_sales_amount),
        csvValue: (row) => row.net_sales_amount
      },
      {
        key: "variable_cost_amount",
        label: "Cout variable",
        render: (row) => formatMoney(row.variable_cost_amount),
        csvValue: (row) => row.variable_cost_amount
      },
      {
        key: "contribution_margin_amount",
        label: "Marge sur cout variable",
        render: (row) => formatMoney(row.contribution_margin_amount),
        csvValue: (row) => row.contribution_margin_amount
      },
      {
        key: "contribution_margin_ratio",
        label: "Taux de contribution",
        render: (row) => formatPercent(row.contribution_margin_ratio),
        csvValue: (row) => row.contribution_margin_ratio
      },
      {
        key: "operating_expenses_amount",
        label: "Charges",
        render: (row) => formatMoney(row.operating_expenses_amount),
        csvValue: (row) => row.operating_expenses_amount
      },
      {
        key: "break_even_sales_amount",
        label: "Point mort CA",
        render: (row) =>
          row.break_even_sales_amount === null || row.break_even_sales_amount === undefined
            ? "-"
            : formatMoney(row.break_even_sales_amount),
        csvValue: (row) => row.break_even_sales_amount ?? ""
      },
      {
        key: "break_even_units",
        label: "Point mort unites",
        render: (row) =>
          row.break_even_units === null || row.break_even_units === undefined
            ? "-"
            : formatNumber(row.break_even_units),
        csvValue: (row) => row.break_even_units ?? ""
      },
      {
        key: "safety_margin_amount",
        label: "Marge de securite",
        render: (row) =>
          row.safety_margin_amount === null || row.safety_margin_amount === undefined
            ? "-"
            : formatMoney(row.safety_margin_amount),
        csvValue: (row) => row.safety_margin_amount ?? ""
      },
      {
        key: "safety_margin_percent",
        label: "Securite %",
        render: (row) =>
          row.safety_margin_percent === null || row.safety_margin_percent === undefined
            ? "-"
            : formatPercent(row.safety_margin_percent),
        csvValue: (row) => row.safety_margin_percent ?? ""
      },
      {
        key: "status",
        label: "Statut",
        render: (row) =>
          row.status === "au-dessus"
            ? "Au-dessus"
            : row.status === "en-dessous"
            ? "En-dessous"
            : "Indetermine",
        csvValue: (row) => row.status || ""
      }
    ],
    emptyText: "Aucune lecture du seuil de rentabilite sur cette periode"
  },
  income_statement: {
    exportKey: "income-statement",
    label: "Compte de resultat",
    description:
      "Produits, charges, benefice brut et resultat net sur la periode.",
    endpoint: "/reports/income-statement",
    buildParams: (filters) => ({
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined
    }),
    exportFilename: (filters) =>
      `compte-resultat-${filters.start_date || "debut"}-${filters.end_date || "fin"}.csv`,
    summaryCards: (summary) => [
      { title: "Produits", value: formatMoney(summary.total_revenue) },
      { title: "Charges", value: formatMoney(summary.total_expense) },
      { title: "Benefice brut", value: formatMoney(summary.gross_profit_amount) },
      { title: "Resultat net", value: formatMoney(summary.net_result) }
    ],
    columns: [
      { key: "section", label: "Section", csvValue: (row) => row.section || "" },
      { key: "account_number", label: "Compte", csvValue: (row) => row.account_number || "" },
      { key: "account_name", label: "Libelle", csvValue: (row) => row.account_name || "" },
      { key: "account_type", label: "Type", csvValue: (row) => row.account_type || "" },
      {
        key: "total_debit",
        label: "Debit",
        render: (row) => formatMoney(row.total_debit),
        csvValue: (row) => row.total_debit
      },
      {
        key: "total_credit",
        label: "Credit",
        render: (row) => formatMoney(row.total_credit),
        csvValue: (row) => row.total_credit
      },
      {
        key: "net_amount",
        label: "Net",
        render: (row) => formatMoney(row.net_amount),
        csvValue: (row) => row.net_amount
      }
    ],
    emptyText: "Aucune ligne comptable disponible"
  },
  treasury_statement: {
    exportKey: "treasury-statement",
    label: "Etat de tresorerie",
    description:
      "Encaissements, decaissements et flux nets de tresorerie par periode.",
    endpoint: "/reports/treasury-statement",
    buildParams: (filters) => ({
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined
    }),
    exportFilename: (filters) =>
      `etat-tresorerie-${filters.start_date || "debut"}-${filters.end_date || "fin"}.csv`,
    summaryCards: (summary) => [
      { title: "Encaissements", value: formatMoney(summary.total_receipts) },
      { title: "Sorties", value: formatMoney(summary.total_outflows) },
      { title: "Flux net", value: formatMoney(summary.net_cash_flow) },
      { title: "Tresorerie observee", value: formatMoney(summary.current_cash_base) }
    ],
    columns: [
      { key: "period_label", label: "Periode", csvValue: (row) => row.period_label || "" },
      {
        key: "customer_receipts",
        label: "Encaissements",
        render: (row) => formatMoney(row.customer_receipts),
        csvValue: (row) => row.customer_receipts
      },
      {
        key: "supplier_payments",
        label: "Paiements fournisseurs",
        render: (row) => formatMoney(row.supplier_payments),
        csvValue: (row) => row.supplier_payments
      },
      {
        key: "operating_expenses",
        label: "Depenses",
        render: (row) => formatMoney(row.operating_expenses),
        csvValue: (row) => row.operating_expenses
      },
      {
        key: "total_outflows",
        label: "Sorties",
        render: (row) => formatMoney(row.total_outflows),
        csvValue: (row) => row.total_outflows
      },
      {
        key: "net_cash_flow",
        label: "Flux net",
        render: (row) => formatMoney(row.net_cash_flow),
        csvValue: (row) => row.net_cash_flow
      },
      {
        key: "cumulative_net_cash_flow",
        label: "Cumul",
        render: (row) => formatMoney(row.cumulative_net_cash_flow),
        csvValue: (row) => row.cumulative_net_cash_flow
      }
    ],
    emptyText: "Aucune periode de tresorerie disponible"
  },
  receipts_journal: {
    exportKey: "receipts-journal",
    label: "Journal des recettes",
    description:
      "Paiements clients encaisses, avec facture, depot et comptabilisation.",
    endpoint: "/reports/receipts-journal",
    buildParams: (filters) => ({
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined,
      warehouse_id: filters.warehouse_id || undefined,
      customer_id: filters.customer_id || undefined
    }),
    exportFilename: (filters) =>
      `journal-recettes-${filters.start_date || "debut"}-${filters.end_date || "fin"}.csv`,
    summaryCards: (summary) => [
      { title: "Paiements", value: Number(summary.total_payments || 0) },
      { title: "Clients", value: Number(summary.total_customers || 0) },
      { title: "Depots", value: Number(summary.total_warehouses || 0) },
      { title: "Total encaisse", value: formatMoney(summary.total_amount) }
    ],
    columns: [
      {
        key: "payment_date",
        label: "Date",
        render: (row) => formatDate(row.payment_date),
        csvValue: (row) => formatDate(row.payment_date)
      },
      { key: "customer_name", label: "Client", csvValue: (row) => row.customer_name || "" },
      { key: "warehouse_name", label: "Depot", csvValue: (row) => row.warehouse_name || "" },
      { key: "invoice_number", label: "Facture", csvValue: (row) => row.invoice_number || "" },
      { key: "payment_method", label: "Mode", csvValue: (row) => row.payment_method || "" },
      {
        key: "amount",
        label: "Montant",
        render: (row) => formatMoney(row.amount),
        csvValue: (row) => row.amount
      },
      { key: "reference", label: "Reference", csvValue: (row) => row.reference || "" },
      { key: "accounting_status", label: "Compta", csvValue: (row) => row.accounting_status || "" }
    ],
    emptyText: "Aucun paiement client sur cette periode"
  },
  expenses_journal: {
    exportKey: "expenses-journal",
    label: "Journal des depenses",
    description:
      "Historique des depenses avec categorie, fournisseur et statut comptable.",
    endpoint: "/reports/expenses-journal",
    buildParams: (filters) => ({
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined,
      category: filters.category || undefined
    }),
    exportFilename: (filters) =>
      `journal-depenses-${filters.start_date || "debut"}-${filters.end_date || "fin"}.csv`,
    summaryCards: (summary) => [
      { title: "Depenses", value: Number(summary.total_expenses || 0) },
      { title: "Categories", value: Number(summary.total_categories || 0) },
      { title: "Montant", value: formatMoney(summary.total_amount) },
      { title: "Postees", value: Number(summary.posted_count || 0) }
    ],
    columns: [
      {
        key: "expense_date",
        label: "Date",
        render: (row) => formatDate(row.expense_date),
        csvValue: (row) => formatDate(row.expense_date)
      },
      { key: "category", label: "Categorie", csvValue: (row) => row.category || "" },
      { key: "description", label: "Description", csvValue: (row) => row.description || "" },
      { key: "supplier_name", label: "Fournisseur", csvValue: (row) => row.supplier_name || "" },
      { key: "payment_method", label: "Mode", csvValue: (row) => row.payment_method || "" },
      {
        key: "amount",
        label: "Montant",
        render: (row) => formatMoney(row.amount),
        csvValue: (row) => row.amount
      },
      { key: "reference", label: "Reference", csvValue: (row) => row.reference || "" },
      { key: "accounting_status", label: "Compta", csvValue: (row) => row.accounting_status || "" }
    ],
    emptyText: "Aucune depense sur cette periode"
  },
  expenses_by_category: {
    exportKey: "expenses-by-category",
    label: "Depenses par categorie",
    description:
      "Analyse des charges par categorie de depense et poids relatif.",
    endpoint: "/reports/expenses-by-category",
    buildParams: (filters) => ({
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined,
      category: filters.category || undefined
    }),
    exportFilename: (filters) =>
      `depenses-par-categorie-${filters.start_date || "debut"}-${filters.end_date || "fin"}.csv`,
    summaryCards: (summary) => [
      { title: "Categories", value: Number(summary.total_categories || 0) },
      { title: "Depenses", value: Number(summary.total_expenses || 0) },
      { title: "Montant", value: formatMoney(summary.total_amount) },
      { title: "Marketing", value: formatMoney(summary.marketing_amount) }
    ],
    columns: [
      { key: "category_label", label: "Categorie", csvValue: (row) => row.category_label || "" },
      {
        key: "expenses_count",
        label: "Lignes",
        render: (row) => Number(row.expenses_count || 0),
        csvValue: (row) => Number(row.expenses_count || 0)
      },
      {
        key: "suppliers_count",
        label: "Fournisseurs",
        render: (row) => Number(row.suppliers_count || 0),
        csvValue: (row) => Number(row.suppliers_count || 0)
      },
      {
        key: "average_amount",
        label: "Panier moyen",
        render: (row) => formatMoney(row.average_amount),
        csvValue: (row) => row.average_amount
      },
      {
        key: "total_amount",
        label: "Montant",
        render: (row) => formatMoney(row.total_amount),
        csvValue: (row) => row.total_amount
      },
      {
        key: "first_expense_date",
        label: "Premiere",
        render: (row) => formatDate(row.first_expense_date),
        csvValue: (row) => formatDate(row.first_expense_date)
      },
      {
        key: "last_expense_date",
        label: "Derniere",
        render: (row) => formatDate(row.last_expense_date),
        csvValue: (row) => formatDate(row.last_expense_date)
      }
    ],
    emptyText: "Aucune categorie de depense disponible"
  },
  margin_by_city: {
    exportKey: "margin-by-city",
    label: "Marge par ville",
    description:
      "Chiffre d'affaires, profit brut et recouvrement par ville cliente.",
    endpoint: "/reports/margin-by-city",
    buildParams: (filters) => ({
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined,
      warehouse_id: filters.warehouse_id || undefined,
      customer_id: filters.customer_id || undefined
    }),
    exportFilename: (filters) =>
      `marge-par-ville-${filters.start_date || "debut"}-${filters.end_date || "fin"}.csv`,
    summaryCards: (summary) => [
      { title: "Villes", value: Number(summary.total_cities || 0) },
      { title: "CA", value: formatMoney(summary.total_sales_amount) },
      { title: "Profit brut", value: formatMoney(summary.gross_profit_amount) },
      { title: "Marge %", value: formatPercent(summary.gross_margin_percent) }
    ],
    columns: [
      { key: "customer_city", label: "Ville", csvValue: (row) => row.customer_city || "" },
      {
        key: "customers_count",
        label: "Clients",
        render: (row) => Number(row.customers_count || 0),
        csvValue: (row) => Number(row.customers_count || 0)
      },
      {
        key: "invoices_count",
        label: "Factures",
        render: (row) => Number(row.invoices_count || 0),
        csvValue: (row) => Number(row.invoices_count || 0)
      },
      {
        key: "total_sales_amount",
        label: "CA",
        render: (row) => formatMoney(row.total_sales_amount),
        csvValue: (row) => row.total_sales_amount
      },
      {
        key: "gross_profit_amount",
        label: "Profit brut",
        render: (row) => formatMoney(row.gross_profit_amount),
        csvValue: (row) => row.gross_profit_amount
      },
      {
        key: "gross_margin_percent",
        label: "Marge %",
        render: (row) => formatPercent(row.gross_margin_percent),
        csvValue: (row) => row.gross_margin_percent
      },
      {
        key: "total_collected_amount",
        label: "Encaisse",
        render: (row) => formatMoney(row.total_collected_amount),
        csvValue: (row) => row.total_collected_amount
      },
      {
        key: "collection_rate_percent",
        label: "Recouvrement %",
        render: (row) => formatPercent(row.collection_rate_percent),
        csvValue: (row) => row.collection_rate_percent
      }
    ],
    emptyText: "Aucune ville cliente sur cette periode"
  },
  margin_by_customer: {
    exportKey: "margin-by-customer",
    label: "Marge par client",
    description:
      "Analyse client par client du CA, profit brut, encaissements et creances.",
    endpoint: "/reports/margin-by-customer",
    buildParams: (filters) => ({
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined,
      warehouse_id: filters.warehouse_id || undefined,
      customer_id: filters.customer_id || undefined
    }),
    exportFilename: (filters) =>
      `marge-par-client-${filters.start_date || "debut"}-${filters.end_date || "fin"}.csv`,
    summaryCards: (summary) => [
      { title: "Clients", value: Number(summary.total_customers || 0) },
      { title: "CA", value: formatMoney(summary.total_sales_amount) },
      { title: "Profit brut", value: formatMoney(summary.gross_profit_amount) },
      { title: "Marge %", value: formatPercent(summary.gross_margin_percent) }
    ],
    columns: [
      { key: "customer_name", label: "Client", csvValue: (row) => row.customer_name || "" },
      { key: "customer_city", label: "Ville", csvValue: (row) => row.customer_city || "" },
      {
        key: "invoices_count",
        label: "Factures",
        render: (row) => Number(row.invoices_count || 0),
        csvValue: (row) => Number(row.invoices_count || 0)
      },
      {
        key: "total_sales_amount",
        label: "CA",
        render: (row) => formatMoney(row.total_sales_amount),
        csvValue: (row) => row.total_sales_amount
      },
      {
        key: "gross_profit_amount",
        label: "Profit brut",
        render: (row) => formatMoney(row.gross_profit_amount),
        csvValue: (row) => row.gross_profit_amount
      },
      {
        key: "gross_margin_percent",
        label: "Marge %",
        render: (row) => formatPercent(row.gross_margin_percent),
        csvValue: (row) => row.gross_margin_percent
      },
      {
        key: "total_collected_amount",
        label: "Encaisse",
        render: (row) => formatMoney(row.total_collected_amount),
        csvValue: (row) => row.total_collected_amount
      },
      {
        key: "total_receivables",
        label: "Creances",
        render: (row) => formatMoney(row.total_receivables),
        csvValue: (row) => row.total_receivables
      }
    ],
    emptyText: "Aucun client sur cette periode"
  },
  budget_vs_actual: {
    exportKey: "budget-vs-actual",
    label: "Budget vs realise",
    description:
      "Comparaison budgetaire entre le plan et le realise par categorie.",
    endpoint: "/reports/budget-vs-actual",
    buildParams: (filters) => ({
      budget_id: filters.budget_id || undefined
    }),
    exportFilename: (filters) =>
      `budget-vs-realise-${filters.budget_id || "auto"}.csv`,
    summaryCards: (summary) => [
      { title: "Budget", value: formatMoney(summary.total_planned) },
      { title: "Realise", value: formatMoney(summary.total_actual) },
      { title: "Ecart", value: formatMoney(summary.total_variance) },
      { title: "Atteinte %", value: formatPercent(summary.attainment_percent) }
    ],
    columns: [
      { key: "category_label", label: "Categorie", csvValue: (row) => row.category_label || "" },
      { key: "category_type", label: "Type", csvValue: (row) => row.category_type || "" },
      {
        key: "planned_total",
        label: "Budget",
        render: (row) => formatMoney(row.planned_total),
        csvValue: (row) => row.planned_total
      },
      {
        key: "actual_total",
        label: "Realise",
        render: (row) => formatMoney(row.actual_total),
        csvValue: (row) => row.actual_total
      },
      {
        key: "variance_total",
        label: "Ecart",
        render: (row) => formatMoney(row.variance_total),
        csvValue: (row) => row.variance_total
      },
      {
        key: "attainment_percent",
        label: "Atteinte %",
        render: (row) => formatPercent(row.attainment_percent),
        csvValue: (row) => row.attainment_percent
      }
    ],
    emptyText: "Aucun budget charge"
  },
  marketing_ratio: {
    exportKey: "marketing-ratio",
    label: "Marketing / CA",
    description:
      "Part des depenses marketing dans le chiffre d'affaires facture.",
    endpoint: "/reports/marketing-ratio",
    buildParams: (filters) => ({
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined
    }),
    exportFilename: (filters) =>
      `marketing-sur-ca-${filters.start_date || "debut"}-${filters.end_date || "fin"}.csv`,
    summaryCards: (summary) => [
      { title: "CA", value: formatMoney(summary.total_sales_amount) },
      { title: "Marketing", value: formatMoney(summary.marketing_expenses_amount) },
      { title: "Marketing % CA", value: formatPercent(summary.marketing_ratio_percent) }
    ],
    columns: [
      { key: "period_label", label: "Periode", csvValue: (row) => row.period_label || "" },
      {
        key: "total_sales_amount",
        label: "CA",
        render: (row) => formatMoney(row.total_sales_amount),
        csvValue: (row) => row.total_sales_amount
      },
      {
        key: "marketing_expenses_amount",
        label: "Marketing",
        render: (row) => formatMoney(row.marketing_expenses_amount),
        csvValue: (row) => row.marketing_expenses_amount
      },
      {
        key: "marketing_ratio_percent",
        label: "Marketing % CA",
        render: (row) => formatPercent(row.marketing_ratio_percent),
        csvValue: (row) => row.marketing_ratio_percent
      }
    ],
    emptyText: "Aucune periode marketing disponible"
  },
  commission_due: {
    exportKey: "commission-due",
    label: "Commissions dues",
    description:
      "Commissions calculees sur les montants reellement encaisses pour commerciaux et revendeurs.",
    endpoint: "/reports/commission-due",
    buildParams: (filters) => ({
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined,
      warehouse_id: filters.warehouse_id || undefined,
      customer_id: filters.customer_id || undefined
    }),
    exportFilename: (filters) =>
      `commissions-dues-${filters.start_date || "debut"}-${filters.end_date || "fin"}.csv`,
    summaryCards: (summary) => [
      { title: "Beneficiaires", value: Number(summary.total_beneficiaries || 0) },
      { title: "Encaisse base", value: formatMoney(summary.total_collections_amount) },
      { title: "Commission due", value: formatMoney(summary.total_commission_due_amount) },
      { title: "Profils configures", value: Number(summary.configured_profiles_count || 0) }
    ],
    columns: [
      { key: "beneficiary_type", label: "Type", csvValue: (row) => row.beneficiary_type || "" },
      { key: "beneficiary_name", label: "Beneficiaire", csvValue: (row) => row.beneficiary_name || "" },
      {
        key: "payments_count",
        label: "Paiements",
        render: (row) => Number(row.payments_count || 0),
        csvValue: (row) => Number(row.payments_count || 0)
      },
      {
        key: "collections_amount",
        label: "Encaisse",
        render: (row) => formatMoney(row.collections_amount),
        csvValue: (row) => row.collections_amount
      },
      {
        key: "commission_rate_percent",
        label: "Taux %",
        render: (row) => formatPercent(row.commission_rate_percent),
        csvValue: (row) => row.commission_rate_percent
      },
      {
        key: "commission_due_amount",
        label: "Commission",
        render: (row) => formatMoney(row.commission_due_amount),
        csvValue: (row) => row.commission_due_amount
      },
      {
        key: "profile_configured",
        label: "Profil configure",
        render: (row) => formatBoolean(row.profile_configured),
        csvValue: (row) => formatBoolean(row.profile_configured)
      }
    ],
    emptyText: "Aucune commission calculee"
  },
  product_ledger: {
    exportKey: "product-ledger",
    label: "Compte courant produits",
    description:
      "Suivre produit par produit les lignes facturees, les quantites vendues, les clients, les depots et les factures sur une periode.",
    endpoint: "/reports/product-ledger",
    buildParams: (filters, forExport = false) => ({
      start_date: filters.start_date,
      end_date: filters.end_date,
      warehouse_ids:
        Array.isArray(filters.warehouse_ids) && filters.warehouse_ids.length > 0
          ? filters.warehouse_ids.join(",")
          : undefined,
      customer_ids:
        Array.isArray(filters.customer_ids) && filters.customer_ids.length > 0
          ? filters.customer_ids.join(",")
          : undefined,
      product_ids:
        Array.isArray(filters.product_ids) && filters.product_ids.length > 0
          ? filters.product_ids.join(",")
          : undefined,
      invoice_status: filters.invoice_status || undefined,
      invoice_number: filters.invoice_number || undefined,
      limit: forExport ? 5000 : 500
    }),
    exportFilename: (filters) =>
      `compte-courant-produits-${filters.start_date || "debut"}-${filters.end_date || "fin"}.csv`,
    summaryCards: (summary) => [
      { title: "Lignes", value: Number(summary.total_lines || 0) },
      { title: "Factures", value: Number(summary.total_invoices || 0) },
      { title: "Produits", value: Number(summary.total_products || 0) },
      { title: "Clients", value: Number(summary.total_customers || 0) },
      { title: "Depots", value: Number(summary.total_warehouses || 0) },
      {
        title: "Quantite vendue",
        value: formatNumber(summary.total_quantity)
      },
      {
        title: "Chiffre d'affaires",
        value: formatMoney(summary.total_sales_amount)
      },
      {
        title: "Profit brut",
        value: formatMoney(summary.gross_profit_amount)
      },
      {
        title: "Paye facture",
        value: formatMoney(summary.total_paid_amount)
      },
      {
        title: "Solde facture",
        value: formatMoney(summary.total_balance_due)
      }
    ],
    columns: [
      { key: "invoice_number", label: "Facture", csvValue: (row) => row.invoice_number },
      {
        key: "invoice_date",
        label: "Date",
        render: (row) => formatDate(row.invoice_date),
        csvValue: (row) => formatDate(row.invoice_date)
      },
      { key: "product_name", label: "Produit", csvValue: (row) => row.product_name },
      { key: "customer_name", label: "Client", csvValue: (row) => row.customer_name },
      { key: "warehouse_name", label: "Depot", csvValue: (row) => row.warehouse_name },
      {
        key: "invoice_status",
        label: "Statut",
        csvValue: (row) => row.invoice_status
      },
      {
        key: "quantity",
        label: "Qte",
        render: (row) => formatNumber(row.quantity),
        csvValue: (row) => row.quantity
      },
      {
        key: "unit_price",
        label: "P.U.",
        render: (row) => formatMoney(row.unit_price),
        csvValue: (row) => row.unit_price
      },
      {
        key: "line_total",
        label: "CA",
        render: (row) => formatMoney(row.line_total),
        csvValue: (row) => row.line_total
      },
      {
        key: "gross_profit_amount",
        label: "Profit brut",
        render: (row) => formatMoney(row.gross_profit_amount),
        csvValue: (row) => row.gross_profit_amount
      },
      {
        key: "invoice_paid_amount",
        label: "Paye facture",
        render: (row) => formatMoney(row.invoice_paid_amount),
        csvValue: (row) => row.invoice_paid_amount
      },
      {
        key: "invoice_balance_due",
        label: "Solde facture",
        render: (row) => formatMoney(row.invoice_balance_due),
        csvValue: (row) => row.invoice_balance_due
      }
    ],
    emptyText: "Aucune ligne de compte produit sur cette periode"
  },
  product_sales: {
    exportKey: "product-sales",
    label: "Analyse ventes par produit",
    description:
      "Savoir combien d'un ou plusieurs produits ont ete vendus sur une periode, dans un ou plusieurs depots, et chez un ou plusieurs clients.",
    endpoint: "/reports/product-sales",
    buildParams: (filters, forExport = false) => ({
      start_date: filters.start_date,
      end_date: filters.end_date,
      warehouse_ids:
        Array.isArray(filters.warehouse_ids) && filters.warehouse_ids.length > 0
          ? filters.warehouse_ids.join(",")
          : undefined,
      customer_ids:
        Array.isArray(filters.customer_ids) && filters.customer_ids.length > 0
          ? filters.customer_ids.join(",")
          : undefined,
      product_ids:
        Array.isArray(filters.product_ids) && filters.product_ids.length > 0
          ? filters.product_ids.join(",")
          : undefined,
      invoice_status: filters.invoice_status || undefined,
      limit: forExport ? 5000 : 500
    }),
    exportFilename: (filters) =>
      `analyse-ventes-produit-${filters.start_date || "debut"}-${filters.end_date || "fin"}.csv`,
    summaryCards: (summary) => [
      { title: "Regroupements", value: Number(summary.total_rows || 0) },
      { title: "Produits", value: Number(summary.total_products || 0) },
      { title: "Depots", value: Number(summary.total_warehouses || 0) },
      { title: "Clients", value: Number(summary.total_customers || 0) },
      { title: "Factures", value: Number(summary.total_invoices || 0) },
      {
        title: "Quantite vendue",
        value: formatNumber(summary.total_quantity)
      },
      {
        title: "Chiffre d'affaires",
        value: formatMoney(summary.total_sales_amount)
      },
      {
        title: "Profit brut",
        value: formatMoney(summary.gross_profit_amount)
      },
      {
        title: "Marge moyenne",
        value: formatPercent(summary.gross_margin_percent)
      }
    ],
    columns: [
      {
        key: "product_name",
        label: "Produit",
        csvValue: (row) => row.product_name
      },
      {
        key: "sku",
        label: "SKU",
        csvValue: (row) => row.sku || ""
      },
      {
        key: "category",
        label: "Categorie",
        csvValue: (row) => row.category || ""
      },
      {
        key: "warehouse_name",
        label: "Depot",
        csvValue: (row) => row.warehouse_name || ""
      },
      {
        key: "customer_name",
        label: "Client",
        csvValue: (row) => row.customer_name || ""
      },
      {
        key: "customer_city",
        label: "Ville client",
        csvValue: (row) => row.customer_city || ""
      },
      {
        key: "invoices_count",
        label: "Factures",
        render: (row) => Number(row.invoices_count || 0),
        csvValue: (row) => Number(row.invoices_count || 0)
      },
      {
        key: "total_quantity",
        label: "Quantite",
        render: (row) => formatNumber(row.total_quantity),
        csvValue: (row) => row.total_quantity
      },
      {
        key: "total_sales_amount",
        label: "CA",
        render: (row) => formatMoney(row.total_sales_amount),
        csvValue: (row) => row.total_sales_amount
      },
      {
        key: "gross_profit_amount",
        label: "Profit brut",
        render: (row) => formatMoney(row.gross_profit_amount),
        csvValue: (row) => row.gross_profit_amount
      },
      {
        key: "gross_margin_percent",
        label: "Marge",
        render: (row) => formatPercent(row.gross_margin_percent),
        csvValue: (row) => row.gross_margin_percent
      },
      {
        key: "first_invoice_date",
        label: "Premiere vente",
        render: (row) => formatDate(row.first_invoice_date),
        csvValue: (row) => formatDate(row.first_invoice_date)
      },
      {
        key: "last_invoice_date",
        label: "Derniere vente",
        render: (row) => formatDate(row.last_invoice_date),
        csvValue: (row) => formatDate(row.last_invoice_date)
      }
    ],
    emptyText: "Aucune vente de produit sur cette periode"
  },
  stock_state: {
    exportKey: "stock-state",
    label: "Etat de stock",
    description:
      "Photo du stock par depot et produit, avec seuil d'alerte et valorisation.",
    endpoint: "/reports/stock-state",
    buildParams: (filters, forExport = false) => ({
      warehouse_id: filters.warehouse_id || undefined,
      product_id: filters.product_id || undefined,
      low_stock_only: filters.low_stock_only ? "true" : undefined,
      limit: forExport ? 5000 : 500
    }),
    exportFilename: () => "etat-stock.csv",
    summaryCards: (summary) => [
      { title: "Lignes stock", value: Number(summary.total_rows || 0) },
      {
        title: "Unites totales",
        value: formatNumber(summary.total_units)
      },
      {
        title: "Valeur stock",
        value: formatMoney(summary.total_stock_value)
      },
      {
        title: "Lignes sous seuil",
        value: Number(summary.low_stock_rows || 0)
      }
    ],
    columns: [
      { key: "warehouse_name", label: "Depot", csvValue: (row) => row.warehouse_name },
      { key: "warehouse_city", label: "Ville", csvValue: (row) => row.warehouse_city || "" },
      { key: "product_name", label: "Produit", csvValue: (row) => row.product_name },
      { key: "sku", label: "SKU", csvValue: (row) => row.sku || "" },
      { key: "category", label: "Categorie", csvValue: (row) => row.category || "" },
      {
        key: "quantity",
        label: "Stock",
        render: (row) => formatNumber(row.quantity),
        csvValue: (row) => row.quantity
      },
      { key: "unit", label: "Unite", csvValue: (row) => row.unit || "" },
      {
        key: "alert_threshold",
        label: "Seuil",
        render: (row) => formatNumber(row.alert_threshold),
        csvValue: (row) => row.alert_threshold
      },
      {
        key: "unit_cost",
        label: "Cout unitaire",
        render: (row) => formatMoney(row.unit_cost),
        csvValue: (row) => row.unit_cost
      },
      {
        key: "stock_value",
        label: "Valeur stock",
        render: (row) => formatMoney(row.stock_value),
        csvValue: (row) => row.stock_value
      },
      {
        key: "is_below_alert",
        label: "Sous seuil",
        render: (row) => formatBoolean(row.is_below_alert),
        csvValue: (row) => formatBoolean(row.is_below_alert)
      }
    ],
    emptyText: "Aucune ligne de stock"
  },
  cash_forecast: {
    exportKey: "cash-forecast",
    label: "Tresorerie previsionnelle",
    description:
      "Projection a J+7, J+30 et J+60 avec encaissements attendus, decaissements a planifier et solde projete.",
    endpoint: "/reports/cash-forecast",
    buildParams: (filters) => ({
      detail_limit: Number(filters.detail_limit || 20)
    }),
    exportFilename: () => `tresorerie-previsionnelle-${new Date().toISOString().split("T")[0]}.csv`,
    summaryCards: (summary) => [
      {
        title: "Base cash",
        value: formatMoney(summary.current_cash_base)
      },
      {
        title: "Caisse",
        value: formatMoney(summary.cash_on_hand_base)
      },
      {
        title: "Banque",
        value: formatMoney(summary.bank_base)
      },
      {
        title: "Mobile money",
        value: formatMoney(summary.mobile_money_base)
      },
      {
        title: "Creances ouvertes",
        value: formatMoney(summary.open_receivables)
      },
      {
        title: "Dettes ouvertes",
        value: formatMoney(summary.open_payables)
      },
      {
        title: "Creances echues",
        value: formatMoney(summary.overdue_receivables)
      }
    ],
    columns: [
      {
        key: "horizon_days",
        label: "Horizon",
        render: (row) => `J+${Number(row.horizon_days || 0)}`,
        csvValue: (row) => `J+${Number(row.horizon_days || 0)}`
      },
      {
        key: "expected_inflows",
        label: "Encaissements prevus",
        render: (row) => formatMoney(row.expected_inflows),
        csvValue: (row) => row.expected_inflows
      },
      {
        key: "due_receivables_count",
        label: "Nb factures clients",
        render: (row) => Number(row.due_receivables_count || 0),
        csvValue: (row) => Number(row.due_receivables_count || 0)
      },
      {
        key: "expected_outflows",
        label: "Decaissements prevus",
        render: (row) => formatMoney(row.expected_outflows),
        csvValue: (row) => row.expected_outflows
      },
      {
        key: "due_payables_count",
        label: "Nb factures fournisseurs",
        render: (row) => Number(row.due_payables_count || 0),
        csvValue: (row) => Number(row.due_payables_count || 0)
      },
      {
        key: "projected_balance",
        label: "Solde projete",
        render: (row) => formatMoney(row.projected_balance),
        csvValue: (row) => row.projected_balance
      }
    ],
    emptyText: "Aucune projection disponible"
  }
};

const reportSections = [
  {
    title: "Finance & compta",
    keys: [
      "income_statement",
      "treasury_statement",
      "expenses_journal",
      "expenses_by_category",
      "budget_vs_actual",
      "marketing_ratio",
      "break_even",
      "cash_forecast"
    ]
  },
  {
    title: "Recouvrement",
    keys: [
      "receipts_journal",
      "customer_aging",
      "supplier_aging",
      "customer_ledger"
    ]
  },
  {
    title: "Marge & commercial",
    keys: [
      "margin_by_city",
      "margin_by_customer",
      "sales_by_category",
      "sales_by_commercial",
      "product_sales"
    ]
  },
  {
    title: "Stock",
    keys: ["stock_state"]
  }
];

const visibleReportKeys = reportSections.flatMap((section) => section.keys);

function resolveReportKey(value) {
  const normalized = String(value || "").trim();
  return visibleReportKeys.includes(normalized) ? normalized : "income_statement";
}

function buildFiltersFromSearchParams(searchParams) {
  const defaults = getInitialFilters();
  const nextFilters = { ...defaults };
  const scalarKeys = [
    "as_of_date",
    "start_date",
    "end_date",
    "budget_id",
    "category",
    "warehouse_id",
    "customer_id",
    "product_id",
    "invoice_number",
    "invoice_status",
    "detail_limit"
  ];

  scalarKeys.forEach((key) => {
    const value = searchParams.get(key);

    if (value !== null && value !== "") {
      nextFilters[key] = value;
    }
  });

  ["warehouse_ids", "customer_ids", "product_ids"].forEach((key) => {
    const value = searchParams.get(key);

    if (value) {
      nextFilters[key] = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  });

  const lowStockOnly = searchParams.get("low_stock_only");
  if (lowStockOnly !== null) {
    nextFilters.low_stock_only =
      lowStockOnly === "true" || lowStockOnly === "1";
  }

  return nextFilters;
}

function buildSearchParamsFromState(reportKey, filters) {
  const params = new URLSearchParams();
  params.set("report", reportKey);

  Object.entries(filters || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        params.set(key, value.join(","));
      }
      return;
    }

    if (typeof value === "boolean") {
      if (value) {
        params.set(key, "true");
      }
      return;
    }

    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  return params;
}

export default function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeReport, setActiveReport] = useState(() =>
    resolveReportKey(searchParams.get("report"))
  );
  const [filters, setFilters] = useState(() =>
    buildFiltersFromSearchParams(searchParams)
  );
  const [warehouses, setWarehouses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingReport, setLoadingReport] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const activeConfig = reportConfigs[activeReport];
  const sortedWarehouses = useMemo(
    () =>
      [...warehouses].sort((left, right) => {
        const nameCompare = compareAlphabetic(left.name, right.name);
        return nameCompare !== 0
          ? nameCompare
          : compareAlphabetic(left.city, right.city);
      }),
    [warehouses]
  );
  const sortedCustomers = useMemo(
    () =>
      [...customers].sort((left, right) =>
        compareAlphabetic(left.business_name, right.business_name)
      ),
    [customers]
  );
  const sortedProducts = useMemo(
    () =>
      [...products].sort((left, right) => compareAlphabetic(left.name, right.name)),
    [products]
  );
  const sortedBudgets = useMemo(
    () =>
      [...budgets].sort((left, right) => {
        const fiscalYearCompare =
          Number(right.fiscal_year || 0) - Number(left.fiscal_year || 0);

        if (fiscalYearCompare !== 0) {
          return fiscalYearCompare;
        }

        return compareAlphabetic(left.name, right.name);
      }),
    [budgets]
  );

  function syncSearchParams(nextReport = activeReport, nextFilters = filters) {
    setSearchParams(buildSearchParamsFromState(nextReport, nextFilters), {
      replace: true
    });
  }

  async function fetchLookups() {
    try {
      setLoadingLookups(true);

      const results = await Promise.allSettled([
        api.get("/warehouses"),
        api.get("/customers"),
        api.get("/products"),
        api.get("/budgets")
      ]);

      const [warehousesRes, customersRes, productsRes, budgetsRes] = results;

      setWarehouses(
        warehousesRes.status === "fulfilled"
          ? warehousesRes.value.data?.data || []
          : []
      );
      setCustomers(
        customersRes.status === "fulfilled"
          ? customersRes.value.data?.data || []
          : []
      );
      setProducts(
        productsRes.status === "fulfilled"
          ? productsRes.value.data?.data || []
          : []
      );
      setBudgets(
        budgetsRes.status === "fulfilled"
          ? budgetsRes.value.data?.data || []
          : []
      );
    } finally {
      setLoadingLookups(false);
    }
  }

  async function fetchReport(reportKey = activeReport, options = {}) {
    const config = reportConfigs[reportKey];
    const params = config.buildParams(filters, options.forExport === true);

    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.set(key, value);
      }
    });

    const response = await api.get(`${config.endpoint}?${searchParams.toString()}`);
    return response.data?.data || null;
  }

  async function loadCurrentReport(reportKey = activeReport) {
    try {
      setLoadingReport(true);
      setError("");
      const reportData = await fetchReport(reportKey);
      setData(reportData);
    } catch (err) {
      setData(null);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger cet etat."
      );
    } finally {
      setLoadingReport(false);
    }
  }

  useEffect(() => {
    fetchLookups();
    loadCurrentReport(activeReport);
  }, []);

  async function handleApplyFilters(event) {
    event.preventDefault();
    syncSearchParams(activeReport, filters);
    await loadCurrentReport(activeReport);
  }

  async function handleChangeReport(reportKey) {
    setActiveReport(reportKey);
    syncSearchParams(reportKey, filters);

    try {
      setLoadingReport(true);
      setError("");
      const reportData = await fetchReport(reportKey);
      setData(reportData);
    } catch (err) {
      setData(null);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger cet etat."
      );
    } finally {
      setLoadingReport(false);
    }
  }

  function handleFilterChange(event) {
    const { name, value, type, checked, multiple, options } = event.target;

    if (multiple) {
      const selectedValues = Array.from(options)
        .filter((option) => option.selected)
        .map((option) => option.value);

      setFilters((prev) => ({
        ...prev,
        [name]: selectedValues
      }));
      return;
    }

    setFilters((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  async function handleExportCsv() {
    try {
      setExporting(true);
      setError("");

      const exportData = await fetchReport(activeReport, { forExport: true });
      const rows = exportData?.rows || [];
      const columns = activeConfig.columns;

      if (rows.length === 0) {
        setError("Aucune donnee a exporter pour cet etat.");
        return;
      }

      const headerRow = columns.map((column) => escapeCsvValue(column.label)).join(";");
      const dataRows = rows.map((row) =>
        columns
          .map((column) => {
            const rawValue = column.csvValue ? column.csvValue(row) : row[column.key];
            return escapeCsvValue(rawValue);
          })
          .join(";")
      );

      const summaryRows = Object.entries(exportData?.summary || {}).map(
        ([key, value]) => `${escapeCsvValue(key)};${escapeCsvValue(value)}`
      );

      const csvContent = [
        `${escapeCsvValue(activeConfig.label)}`,
        `${escapeCsvValue("Export genere le")};${escapeCsvValue(
          new Date().toLocaleString("fr-FR")
        )}`,
        "",
        ...summaryRows,
        "",
        headerRow,
        ...dataRows
      ].join("\n");

      triggerCsvDownload(activeConfig.exportFilename(filters), csvContent);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible d'exporter cet etat."
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleExportFile(format) {
    try {
      setExporting(true);
      setError("");

      const params = activeConfig.buildParams(filters, true);
      const searchParams = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.set(key, value);
        }
      });

      const response = await api.get(
        `/reports/${activeConfig.exportKey}/export/${format}?${searchParams.toString()}`,
        {
          responseType: "blob"
        }
      );

      saveBlobResponse(
        response,
        `${activeConfig.exportKey}.${format === "xlsx" ? "xlsx" : "pdf"}`
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible d'exporter cet etat."
      );
    } finally {
      setExporting(false);
    }
  }

  const summaryCards = useMemo(
    () => activeConfig.summaryCards(data?.summary || {}),
    [activeConfig, data]
  );

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Etats et exports"
        subtitle="Centre de sorties pour la gestion, la comptabilite, le commercial et le stock."
      />

      <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        Les commissions encodees manuellement restent suivies dans
        <span className="font-semibold"> Journal des depenses </span>
        et
        <span className="font-semibold"> Depenses par categorie</span>,
        en utilisant la categorie <span className="font-semibold">commissions</span>.
        Le calcul automatique des commissions n'est pas encore active a l'ecran.
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="mb-5 space-y-5">
          {reportSections.map((section) => (
            <div key={section.title}>
              <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                {section.title}
              </div>
              <div className="flex flex-wrap gap-3">
                {section.keys.map((key) => {
                  const config = reportConfigs[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleChangeReport(key)}
                      className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        activeReport === key
                          ? "bg-brand-600 text-white"
                          : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div>
            <div className="text-lg font-semibold text-slate-900">
              {activeConfig.label}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {activeConfig.description}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleExportFile("pdf")}
              disabled={exporting || loadingReport}
              className="rounded-2xl border border-brand-300 px-5 py-3 text-sm font-semibold text-brand-700 disabled:opacity-60"
            >
              {exporting ? "Export..." : "Exporter PDF"}
            </button>
            <button
              type="button"
              onClick={() => handleExportFile("xlsx")}
              disabled={exporting || loadingReport}
              className="rounded-2xl border border-emerald-300 px-5 py-3 text-sm font-semibold text-emerald-700 disabled:opacity-60"
            >
              {exporting ? "Export..." : "Exporter Excel"}
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exporting || loadingReport}
              className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              {exporting ? "Export..." : "Exporter CSV"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="mb-5 text-lg font-semibold text-slate-900">Filtres</div>

        <form onSubmit={handleApplyFilters} className="space-y-5">
          {activeReport === "customer_aging" || activeReport === "supplier_aging" ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Date d'arrete
                </label>
                <input
                  type="date"
                  name="as_of_date"
                  value={filters.as_of_date}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Depot
                </label>
                <select
                  name="warehouse_id"
                  value={filters.warehouse_id}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="">Tous les depots</option>
                  {sortedWarehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} - {warehouse.city}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {activeReport === "income_statement" ||
          activeReport === "treasury_statement" ||
          activeReport === "marketing_ratio" ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Date debut
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={filters.start_date}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Date fin
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={filters.end_date}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </div>
            </div>
          ) : null}

          {activeReport === "receipts_journal" ||
          activeReport === "margin_by_city" ||
          activeReport === "margin_by_customer" ||
          activeReport === "commission_due" ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Date debut
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={filters.start_date}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Date fin
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={filters.end_date}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Depot
                </label>
                <select
                  name="warehouse_id"
                  value={filters.warehouse_id}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="">Tous les depots</option>
                  {sortedWarehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} - {warehouse.city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Client
                </label>
                <select
                  name="customer_id"
                  value={filters.customer_id}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="">Tous les clients</option>
                  {sortedCustomers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.business_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {activeReport === "expenses_journal" ||
          activeReport === "expenses_by_category" ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Date debut
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={filters.start_date}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Date fin
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={filters.end_date}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Categorie
                </label>
                <input
                  type="text"
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                  placeholder="Ex: marketing"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </div>
            </div>
          ) : null}

          {activeReport === "budget_vs_actual" ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Budget
                </label>
                <select
                  name="budget_id"
                  value={filters.budget_id}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="">Selection auto</option>
                  {sortedBudgets.map((budget) => (
                    <option key={budget.id} value={budget.id}>
                      {budget.fiscal_year} - {budget.name}
                      {budget.warehouse_name ? ` (${budget.warehouse_name})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {activeReport === "customer_ledger" ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Date debut
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={filters.start_date}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Date fin
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={filters.end_date}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Client
                </label>
                <select
                  name="customer_id"
                  value={filters.customer_id}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="">Tous les clients</option>
                  {sortedCustomers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.business_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {activeReport === "sales_detail" ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Date debut
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={filters.start_date}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Date fin
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={filters.end_date}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Depot
                </label>
                <select
                  name="warehouse_id"
                  value={filters.warehouse_id}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="">Tous les depots</option>
                  {sortedWarehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} - {warehouse.city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Client
                </label>
                <select
                  name="customer_id"
                  value={filters.customer_id}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="">Tous les clients</option>
                  {sortedCustomers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.business_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Produit
                </label>
                <select
                  name="product_id"
                  value={filters.product_id}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="">Tous les produits</option>
                  {sortedProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} {product.sku ? `(${product.sku})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {activeReport === "sales_by_category" ||
          activeReport === "sales_by_commercial" ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Date debut
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={filters.start_date}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Date fin
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={filters.end_date}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Depot
                </label>
                <select
                  name="warehouse_id"
                  value={filters.warehouse_id}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="">Tous les depots</option>
                  {sortedWarehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} - {warehouse.city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Client
                </label>
                <select
                  name="customer_id"
                  value={filters.customer_id}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="">Tous les clients</option>
                  {sortedCustomers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.business_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {activeReport === "break_even" ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Date debut
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={filters.start_date}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Date fin
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={filters.end_date}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </div>
            </div>
          ) : null}

          {activeReport === "product_sales" || activeReport === "product_ledger" ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Date debut
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={filters.start_date}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Date fin
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={filters.end_date}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Depots
                </label>
                <select
                  multiple
                  name="warehouse_ids"
                  value={filters.warehouse_ids}
                  onChange={handleFilterChange}
                  className="min-h-40 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  {sortedWarehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} - {warehouse.city}
                    </option>
                  ))}
                </select>
                <div className="mt-2 text-xs text-slate-500">
                  Maintiens `Ctrl` ou `Cmd` pour choisir plusieurs depots.
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Clients
                </label>
                <select
                  multiple
                  name="customer_ids"
                  value={filters.customer_ids}
                  onChange={handleFilterChange}
                  className="min-h-40 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  {sortedCustomers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.business_name}
                    </option>
                  ))}
                </select>
                <div className="mt-2 text-xs text-slate-500">
                  Tu peux choisir un ou plusieurs clients.
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Produits
                </label>
                <select
                  multiple
                  name="product_ids"
                  value={filters.product_ids}
                  onChange={handleFilterChange}
                  className="min-h-40 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  {sortedProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} {product.sku ? `(${product.sku})` : ""}
                    </option>
                  ))}
                </select>
                <div className="mt-2 text-xs text-slate-500">
                  Tu peux comparer plusieurs produits dans un seul etat.
                </div>
              </div>

              {activeReport === "product_ledger" ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Numero de facture
                  </label>
                  <input
                    type="text"
                    name="invoice_number"
                    value={filters.invoice_number}
                    onChange={handleFilterChange}
                    placeholder="Ex: 004/03-2026"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    Optionnel pour isoler une facture precise.
                  </div>
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Statut facture
                </label>
                <select
                  name="invoice_status"
                  value={filters.invoice_status}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="">Tous les statuts</option>
                  <option value="issued">Emise</option>
                  <option value="partial">Partielle</option>
                  <option value="paid">Payee</option>
                </select>
              </div>
            </div>
          ) : null}

          {activeReport === "stock_state" ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Depot
                </label>
                <select
                  name="warehouse_id"
                  value={filters.warehouse_id}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="">Tous les depots</option>
                  {sortedWarehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} - {warehouse.city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Produit
                </label>
                <select
                  name="product_id"
                  value={filters.product_id}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="">Tous les produits</option>
                  {sortedProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} {product.sku ? `(${product.sku})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex w-full items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="low_stock_only"
                    checked={filters.low_stock_only}
                    onChange={handleFilterChange}
                  />
                  Afficher seulement les lignes sous seuil
                </label>
              </div>
            </div>
          ) : null}

          {activeReport === "cash_forecast" ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nombre de lignes detail
                </label>
                <input
                  type="number"
                  min="5"
                  max="200"
                  name="detail_limit"
                  value={filters.detail_limit}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </div>
            </div>
          ) : null}

          <div>
            <button
              type="submit"
              disabled={loadingReport || loadingLookups}
              className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loadingReport ? "Chargement..." : "Charger l'etat"}
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <StatCard key={card.title} title={card.title} value={card.value} />
        ))}
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        {loadingReport ? (
          <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Chargement de l'etat...
          </div>
        ) : (
          <TableCard
            title={activeConfig.label}
            rows={data?.rows || []}
            columns={activeConfig.columns}
            emptyText={activeConfig.emptyText}
          />
        )}

        {!loadingReport && activeReport === "customer_ledger" ? (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Total factures</div>
              <div className="mt-2 text-xl font-bold text-slate-900">
                {formatMoney(data?.summary?.invoiced_amount)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Total paiements</div>
              <div className="mt-2 text-xl font-bold text-slate-900">
                {formatMoney(data?.summary?.paid_amount)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Balance totale</div>
              <div
                className={`mt-2 text-xl font-bold ${
                  Number(data?.summary?.balance_amount || 0) > 0
                    ? "text-amber-700"
                    : Number(data?.summary?.balance_amount || 0) < 0
                    ? "text-emerald-700"
                    : "text-slate-900"
                }`}
              >
                {formatMoney(data?.summary?.balance_amount)}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
