import { useEffect, useState } from "react";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import TableCard from "../components/ui/TableCard";
import StatCard from "../components/ui/StatCard";

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));
}

function getStatusBadge(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "critical") {
    return "bg-red-100 text-red-700";
  }

  if (
    normalized === "watch" ||
    normalized === "watchlist" ||
    normalized === "priority"
  ) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-green-100 text-green-700";
}

export default function AIScoringDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchScoringSummary() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/ai-scoring/summary");
      setData(response.data.data || null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger le scoring intelligent."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchScoringSummary();
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-soft text-sm text-slate-500">
        Chargement du scoring intelligent...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const topProducts = data?.top_priority_products || [];
  const topCustomers = data?.top_risky_customers || [];
  const cash = data?.cash || {};

  const criticalProducts = topProducts.filter(
    (item) => String(item.status).toLowerCase() === "critical"
  ).length;

  const criticalCustomers = topCustomers.filter(
    (item) => String(item.status).toLowerCase() === "critical"
  ).length;

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Scoring intelligent IA"
        subtitle="Priorisation produits, clients et trésorerie pour le pilotage de KIVU AGRO BIO"
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Cash health score"
          value={Number(cash.cash_health_score || 0)}
          subtitle={cash.status || "N/A"}
        />
        <StatCard
          title="Cash disponible"
          value={formatMoney(cash.total_collected_amount || 0)}
          subtitle="Paiements reçus"
        />
        <StatCard
          title="Créances"
          value={formatMoney(cash.total_receivables || 0)}
          subtitle="À recouvrer"
        />
        <StatCard
          title="Seuil cash minimum"
          value={formatMoney(cash.minimum_cash_threshold_usd || 0)}
          subtitle="Règle métier"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <StatCard
          title="Produits critiques"
          value={criticalProducts}
          subtitle="Scoring produits"
        />
        <StatCard
          title="Clients critiques"
          value={criticalCustomers}
          subtitle="Scoring clients"
        />
        <StatCard
          title="Produits suivis"
          value={topProducts.length}
          subtitle="Top priorités"
        />
      </div>

      <TableCard
        title={`Top produits prioritaires (${topProducts.length})`}
        rows={topProducts}
        emptyText="Aucun scoring produit disponible"
        columns={[
          { key: "product_name", label: "Produit" },
          {
            key: "total_quantity_sold",
            label: "Qté vendue"
          },
          {
            key: "total_sales_amount",
            label: "Ventes",
            render: (row) => formatMoney(row.total_sales_amount)
          },
          {
            key: "is_strategic",
            label: "Stratégique",
            render: (row) => (row.is_strategic ? "Oui" : "Non")
          },
          {
            key: "stock_alerts_count",
            label: "Alertes stock"
          },
          {
            key: "priority_score",
            label: "Score"
          },
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
          }
        ]}
      />

      <TableCard
        title={`Top clients risqués (${topCustomers.length})`}
        rows={topCustomers}
        emptyText="Aucun scoring client disponible"
        columns={[
          { key: "business_name", label: "Client" },
          { key: "city", label: "Ville" },
          {
            key: "total_sales_amount",
            label: "Ventes",
            render: (row) => formatMoney(row.total_sales_amount)
          },
          {
            key: "total_balance_due",
            label: "Créance",
            render: (row) => formatMoney(row.total_balance_due)
          },
          {
            key: "customer_risk_score",
            label: "Score risque"
          },
          {
            key: "customer_value_score",
            label: "Score valeur"
          },
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
          }
        ]}
      />

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="mb-3 text-lg font-semibold text-slate-900">
          Lecture directionnelle
        </div>
        <div className="space-y-2 text-sm leading-7 text-slate-700">
          <p>
            Le scoring produits identifie les références à protéger en priorité
            selon la combinaison : ventes, caractère stratégique et tension
            stock.
          </p>
          <p>
            Le scoring clients distingue les comptes à forte valeur mais aussi
            les clients à surveiller à cause des créances et de leur poids
            stratégique.
          </p>
          <p>
            Le cash health score indique si la trésorerie reste compatible avec
            les seuils métier définis pour KIVU AGRO BIO.
          </p>
        </div>
      </div>
    </div>
  );
}