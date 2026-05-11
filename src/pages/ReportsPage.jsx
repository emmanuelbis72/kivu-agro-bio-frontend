import { useEffect, useMemo, useState } from "react";
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

function formatMonthLabel(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatBoolean(value) {
  return value ? "Oui" : "Non";
}

function getInitialFilters() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 29);

  return {
    as_of_date: new Date().toISOString().split("T")[0],
    start_date: startDate.toISOString().split("T")[0],
    end_date: endDate.toISOString().split("T")[0],
    warehouse_id: "",
    customer_id: "",
    product_id: "",
    customer_city: "",
    product_category: "",
    sku: "",
    invoice_status: "",
    report_variant: "summary",
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
  product_sales: {
    exportKey: "product-sales",
    label: "Analyse ventes par produit",
    description:
      "Savoir combien d'un produit a ete vendu sur une periode, par depot, par client ou par mois, avec lecture marge et chiffre d'affaires.",
    endpoint: "/reports/product-sales",
    buildParams: (filters, forExport = false) => ({
      start_date: filters.start_date,
      end_date: filters.end_date,
      warehouse_id: filters.warehouse_id || undefined,
      customer_id: filters.customer_id || undefined,
      product_id: filters.product_id || undefined,
      customer_city: filters.customer_city || undefined,
      product_category: filters.product_category || undefined,
      sku: filters.sku || undefined,
      invoice_status: filters.invoice_status || undefined,
      variant: filters.report_variant || "summary",
      limit: forExport ? 5000 : 500
    }),
    exportFilename: (filters) =>
      `analyse-ventes-produit-${filters.start_date || "debut"}-${filters.end_date || "fin"}.csv`,
    summaryCards: (summary) => [
      { title: "Regroupements", value: Number(summary.total_rows || 0) },
      { title: "Produits", value: Number(summary.total_products || 0) },
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
        key: "analysis_label",
        label: "Analyse",
        csvValue: (row) => row.analysis_label || ""
      },
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
        key: "period_month",
        label: "Mois",
        render: (row) => formatMonthLabel(row.period_month),
        csvValue: (row) => formatMonthLabel(row.period_month)
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

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState("customer_aging");
  const [filters, setFilters] = useState(getInitialFilters);
  const [warehouses, setWarehouses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingReport, setLoadingReport] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const activeConfig = reportConfigs[activeReport];
  const customerCities = useMemo(
    () =>
      [...new Set(customers.map((customer) => customer.city).filter(Boolean))].sort(
        (left, right) => left.localeCompare(right, "fr", { sensitivity: "base" })
      ),
    [customers]
  );
  const productCategories = useMemo(
    () =>
      [...new Set(products.map((product) => product.category).filter(Boolean))].sort(
        (left, right) => left.localeCompare(right, "fr", { sensitivity: "base" })
      ),
    [products]
  );

  async function fetchLookups() {
    try {
      setLoadingLookups(true);

      const results = await Promise.allSettled([
        api.get("/warehouses"),
        api.get("/customers"),
        api.get("/products")
      ]);

      const [warehousesRes, customersRes, productsRes] = results;

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
    await loadCurrentReport(activeReport);
  }

  async function handleChangeReport(reportKey) {
    setActiveReport(reportKey);

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
    const { name, value, type, checked } = event.target;
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

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="mb-5 flex flex-wrap gap-3">
          {Object.entries(reportConfigs).map(([key, config]) => (
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
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} - {warehouse.city}
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
                  {warehouses.map((warehouse) => (
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
                  {customers.map((customer) => (
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
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} {product.sku ? `(${product.sku})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {activeReport === "product_sales" ? (
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
                  Variante d'analyse
                </label>
                <select
                  name="report_variant"
                  value={filters.report_variant}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="summary">Synthese produit</option>
                  <option value="by_warehouse">Par depot</option>
                  <option value="by_customer">Par client</option>
                  <option value="by_month">Par mois</option>
                </select>
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
                  {warehouses.map((warehouse) => (
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
                  {customers.map((customer) => (
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
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} {product.sku ? `(${product.sku})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Ville client
                </label>
                <select
                  name="customer_city"
                  value={filters.customer_city}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="">Toutes les villes</option>
                  {customerCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Categorie produit
                </label>
                <select
                  name="product_category"
                  value={filters.product_category}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                >
                  <option value="">Toutes les categories</option>
                  {productCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  SKU
                </label>
                <input
                  type="text"
                  name="sku"
                  value={filters.sku}
                  onChange={handleFilterChange}
                  placeholder="Ex. KAB-001"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                />
              </div>

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
                  {warehouses.map((warehouse) => (
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
                  {products.map((product) => (
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
      </div>
    </div>
  );
}
