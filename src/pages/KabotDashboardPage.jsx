import { useEffect, useMemo, useState } from "react";
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

function getPriorityBadgeClass(priority) {
  const normalized = String(priority || "").toUpperCase();

  if (normalized === "CRITICAL") {
    return "bg-red-100 text-red-700";
  }

  if (normalized === "HIGH") {
    return "bg-amber-100 text-amber-700";
  }

  if (normalized === "MEDIUM") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-emerald-100 text-emerald-700";
}

function getScoreBadgeClass(level) {
  const normalized = String(level || "").toUpperCase();

  if (normalized === "CRITICAL") {
    return "bg-red-100 text-red-700";
  }

  if (normalized === "HIGH") {
    return "bg-amber-100 text-amber-700";
  }

  if (normalized === "MEDIUM") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-emerald-100 text-emerald-700";
}

export default function KabotDashboardPage() {
  const [alertsData, setAlertsData] = useState(null);
  const [customerScoring, setCustomerScoring] = useState([]);
  const [productScoring, setProductScoring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchDashboard() {
    try {
      setLoading(true);
      setError("");

      const [alertsRes, customersRes, productsRes] = await Promise.all([
        api.get("/kabot/alerts"),
        api.get("/kabot/scoring/customers"),
        api.get("/kabot/scoring/products")
      ]);

      setAlertsData(alertsRes.data.data || null);
      setCustomerScoring(customersRes.data.data || []);
      setProductScoring(productsRes.data.data || []);
    } catch (err) {
      setError(err?.message || "Impossible de charger le dashboard KABOT.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboard();
  }, []);

  const summary = alertsData?.summary || {};
  const alerts = alertsData?.alerts || [];

  const topCriticalAlerts = useMemo(() => {
    return alerts.slice(0, 10);
  }, [alerts]);

  const topRiskCustomers = useMemo(() => {
    return customerScoring.slice(0, 10);
  }, [customerScoring]);

  const topStrategicProducts = useMemo(() => {
    return productScoring.slice(0, 10);
  }, [productScoring]);

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-soft border border-slate-100">
        Chargement du dashboard KABOT...
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

  return (
    <div className="space-y-8">
      <SectionTitle
        title="KABOT Dashboard"
        subtitle="Centre intelligent de pilotage CEO : alertes, risques, rentabilité et priorités"
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Alertes totales"
          value={Number(summary.total_alerts || 0)}
        />
        <StatCard
          title="Critiques"
          value={Number(summary.critical_count || 0)}
        />
        <StatCard
          title="Élevées"
          value={Number(summary.high_count || 0)}
        />
        <StatCard
          title="Créances"
          value={formatMoney(summary.reference_kpis?.total_receivables)}
        />
        <StatCard
          title="Profit brut"
          value={formatMoney(summary.reference_kpis?.gross_profit_amount)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-lg font-semibold text-slate-900">
              Alertes CEO prioritaires
            </div>
            <button
              onClick={fetchDashboard}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Rafraîchir
            </button>
          </div>

          <div className="space-y-4">
            {topCriticalAlerts.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Aucune alerte pour le moment.
              </div>
            ) : (
              topCriticalAlerts.map((alert) => (
                <div
                  key={alert.code}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-semibold text-slate-900">
                      {alert.title}
                    </div>

                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPriorityBadgeClass(
                        alert.priority
                      )}`}
                    >
                      {alert.priority}
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-slate-600">
                    {alert.summary}
                  </div>

                  <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <span className="font-semibold">Action :</span>{" "}
                    {alert.recommendation}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
          <div className="mb-4 text-lg font-semibold text-slate-900">
            Référence KPI KABOT
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Ventes</div>
              <div className="mt-2 text-xl font-bold text-slate-900">
                {formatMoney(summary.reference_kpis?.total_sales_amount)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Encaissements</div>
              <div className="mt-2 text-xl font-bold text-slate-900">
                {formatMoney(summary.reference_kpis?.total_collected_amount)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">COGS</div>
              <div className="mt-2 text-xl font-bold text-slate-900">
                {formatMoney(summary.reference_kpis?.total_cogs_amount)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Profit brut</div>
              <div className="mt-2 text-xl font-bold text-green-700">
                {formatMoney(summary.reference_kpis?.gross_profit_amount)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <TableCard
        title={`Clients à risque (${topRiskCustomers.length})`}
        rows={topRiskCustomers}
        emptyText="Aucun client risqué"
        columns={[
          { key: "business_name", label: "Client" },
          { key: "city", label: "Ville" },
          {
            key: "total_balance_due",
            label: "Créance",
            render: (row) => formatMoney(row.total_balance_due)
          },
          { key: "overdue_30_count", label: "Retards 30j+" },
          { key: "overdue_60_count", label: "Retards 60j+" },
          { key: "risk_score", label: "Score" },
          {
            key: "risk_level",
            label: "Niveau",
            render: (row) => (
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getScoreBadgeClass(
                  row.risk_level
                )}`}
              >
                {row.risk_level}
              </span>
            )
          },
          { key: "recommendation", label: "Recommandation" }
        ]}
      />

      <TableCard
        title={`Produits intelligents (${topStrategicProducts.length})`}
        rows={topStrategicProducts}
        emptyText="Aucun produit analysé"
        columns={[
          { key: "product_name", label: "Produit" },
          { key: "sku", label: "SKU" },
          { key: "total_quantity_sold", label: "Qté vendue" },
          {
            key: "total_sales_value",
            label: "Ventes",
            render: (row) => formatMoney(row.total_sales_value)
          },
          {
            key: "gross_profit_amount",
            label: "Profit brut",
            render: (row) => formatMoney(row.gross_profit_amount)
          },
          {
            key: "gross_margin_percent",
            label: "Marge %",
            render: (row) => `${Number(row.gross_margin_percent || 0).toFixed(2)} %`
          },
          { key: "intelligence_score", label: "Score" },
          {
            key: "intelligence_level",
            label: "Niveau",
            render: (row) => (
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getScoreBadgeClass(
                  row.intelligence_level
                )}`}
              >
                {row.intelligence_level}
              </span>
            )
          },
          { key: "recommendation", label: "Recommandation" }
        ]}
      />
    </div>
  );
}