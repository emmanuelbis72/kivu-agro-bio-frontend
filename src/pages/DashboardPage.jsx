import { useEffect, useState } from "react";
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

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchDashboard() {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/dashboard/overview");
      setData(response.data.data);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger le dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-soft">
        Chargement du dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error}
      </div>
    );
  }

  const stats = data?.global_stats || {};

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Dashboard exécutif"
        subtitle="Vue globale de la performance commerciale et opérationnelle"
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Ventes totales"
          value={formatMoney(stats.total_sales_amount)}
        />
        <StatCard
          title="Encaissements"
          value={formatMoney(stats.total_collected_amount)}
        />
        <StatCard
          title="Créances"
          value={formatMoney(stats.total_receivables)}
        />
        <StatCard
          title="Unités en stock"
          value={Number(stats.total_units_in_stock || 0)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TableCard
          title="Top produits"
          rows={data?.top_products || []}
          columns={[
            { key: "product_name", label: "Produit" },
            { key: "sku", label: "SKU" },
            { key: "total_quantity_sold", label: "Qté vendue" },
            {
              key: "total_sales_value",
              label: "Valeur",
              render: (row) => formatMoney(row.total_sales_value)
            }
          ]}
        />

        <TableCard
          title="Top clients"
          rows={data?.top_customers || []}
          columns={[
            { key: "business_name", label: "Client" },
            { key: "city", label: "Ville" },
            {
              key: "total_billed",
              label: "Facturé",
              render: (row) => formatMoney(row.total_billed)
            },
            {
              key: "total_balance_due",
              label: "Solde dû",
              render: (row) => formatMoney(row.total_balance_due)
            }
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TableCard
          title="Factures récentes"
          rows={data?.recent_invoices || []}
          columns={[
            { key: "invoice_number", label: "Facture" },
            { key: "customer_name", label: "Client" },
            { key: "status", label: "Statut" },
            {
              key: "total_amount",
              label: "Montant",
              render: (row) => formatMoney(row.total_amount)
            }
          ]}
        />

        <TableCard
          title="Alertes stock"
          rows={data?.stock_alerts || []}
          columns={[
            { key: "product_name", label: "Produit" },
            { key: "warehouse_name", label: "Dépôt" },
            { key: "quantity", label: "Stock" },
            { key: "alert_threshold", label: "Seuil" }
          ]}
          emptyText="Aucune alerte stock"
        />
      </div>
    </div>
  );
}