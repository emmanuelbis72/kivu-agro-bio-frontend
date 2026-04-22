import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import StatCard from "../components/ui/StatCard";
import TableCard from "../components/ui/TableCard";

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function getBadgeClass(level) {
  const normalized = String(level || "").toLowerCase();

  if (["critical", "failed", "rejected"].includes(normalized)) {
    return "bg-red-100 text-red-700";
  }

  if (["high", "running", "pending", "approved"].includes(normalized)) {
    return "bg-amber-100 text-amber-700";
  }

  if (["medium", "queued", "proposed"].includes(normalized)) {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-emerald-100 text-emerald-700";
}

function formatNumber(value) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

export default function AIControlTowerPage() {
  const [alerts, setAlerts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [history, setHistory] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [customerScores, setCustomerScores] = useState([]);

  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function fetchControlTower() {
    try {
      setLoading(true);
      setError("");

      const [
        alertsRes,
        recommendationsRes,
        historyRes,
        forecastsRes,
        customerScoresRes
      ] = await Promise.all([
        api.get("/ai/alerts"),
        api.get("/ai/recommendations"),
        api.get("/ai/history"),
        api.get("/ai/forecasts"),
        api.get("/ai-scoring/customers", {
          params: { sync: "false" }
        })
      ]);

      setAlerts(alertsRes.data.data || []);
      setRecommendations(recommendationsRes.data.data || []);
      setHistory(historyRes.data.data || []);
      setForecasts(forecastsRes.data.data || []);
      setCustomerScores(customerScoresRes.data.data || []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de charger la tour de contrôle IA."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchControlTower();
  }, []);

  async function handleSyncAll() {
    try {
      setSyncLoading(true);
      setError("");
      setSuccessMessage("");

      await Promise.all([
        api.post("/ai/alerts/sync"),
        api.post("/ai/forecasts/sync"),
        api.post("/ai-scoring/customers/sync")
      ]);

      setSuccessMessage("Les données IA ont été synchronisées avec succès.");
      await fetchControlTower();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Impossible de synchroniser les données IA."
      );
    } finally {
      setSyncLoading(false);
    }
  }

  const openAlertsCount = useMemo(
    () => alerts.filter((item) => item.resolution_state !== "resolved").length,
    [alerts]
  );

  const proposedRecommendationsCount = useMemo(
    () =>
      recommendations.filter((item) =>
        ["proposed", "approved"].includes(String(item.decision_state || "").toLowerCase())
      ).length,
    [recommendations]
  );

  const latestForecastDate = useMemo(() => {
    if (forecasts.length === 0) {
      return "-";
    }

    return formatDateTime(forecasts[0].created_at);
  }, [forecasts]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-soft text-sm text-slate-500">
        Chargement de la tour de contrôle IA...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Tour de contrôle IA"
        subtitle="Vue unifiée des alertes, recommandations, historiques d'analyse, prévisions et scores clients."
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

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSyncAll}
          disabled={syncLoading}
          className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {syncLoading ? "Synchronisation..." : "Synchroniser la couche IA"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Alertes ouvertes" value={openAlertsCount} />
        <StatCard title="Recommandations actives" value={proposedRecommendationsCount} />
        <StatCard title="Runs IA" value={history.length} />
        <StatCard title="Prévisions" value={forecasts.length} />
        <StatCard title="Scores clients" value={customerScores.length} subtitle={`Dernière prévision : ${latestForecastDate}`} />
      </div>

      <TableCard
        title={`Alertes IA (${alerts.length})`}
        rows={alerts.slice(0, 20)}
        emptyText="Aucune alerte IA"
        columns={[
          { key: "title", label: "Alerte" },
          { key: "domain", label: "Domaine" },
          {
            key: "severity",
            label: "Sévérité",
            render: (row) => (
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getBadgeClass(row.severity)}`}>
                {String(row.severity || "").toUpperCase()}
              </span>
            )
          },
          { key: "resolution_state", label: "État" },
          {
            key: "detected_at",
            label: "Détectée le",
            render: (row) => formatDateTime(row.detected_at)
          }
        ]}
      />

      <TableCard
        title={`Recommandations IA (${recommendations.length})`}
        rows={recommendations.slice(0, 20)}
        emptyText="Aucune recommandation IA"
        columns={[
          { key: "title", label: "Recommandation" },
          { key: "domain", label: "Domaine" },
          {
            key: "urgency",
            label: "Urgence",
            render: (row) => (
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getBadgeClass(row.urgency)}`}>
                {String(row.urgency || "").toUpperCase()}
              </span>
            )
          },
          { key: "decision_state", label: "Décision" },
          {
            key: "created_at",
            label: "Créée le",
            render: (row) => formatDateTime(row.created_at)
          }
        ]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TableCard
          title={`Historique IA (${history.length})`}
          rows={history.slice(0, 15)}
          emptyText="Aucun historique IA"
          columns={[
            { key: "request_text", label: "Question / demande" },
            { key: "target_domain", label: "Domaine" },
            { key: "status", label: "Statut" },
            {
              key: "started_at",
              label: "Démarré le",
              render: (row) => formatDateTime(row.started_at || row.created_at)
            }
          ]}
        />

        <TableCard
          title={`Prévisions (${forecasts.length})`}
          rows={forecasts.slice(0, 15)}
          emptyText="Aucune prévision IA"
          columns={[
            { key: "forecast_type", label: "Type" },
            { key: "forecast_domain", label: "Domaine" },
            {
              key: "projected_value",
              label: "Valeur projetée",
              render: (row) =>
                `${formatNumber(row.projected_value)} ${row.projected_unit || ""}`.trim()
            },
            { key: "scenario_label", label: "Scénario" },
            {
              key: "horizon_end",
              label: "Horizon",
              render: (row) => row.horizon_end || "-"
            }
          ]}
        />
      </div>

      <TableCard
        title={`Scores clients (${customerScores.length})`}
        rows={customerScores.slice(0, 20)}
        emptyText="Aucun score client disponible"
        columns={[
          { key: "business_name", label: "Client" },
          { key: "city", label: "Ville" },
          {
            key: "payment_risk_score",
            label: "Risque paiement",
            render: (row) => formatNumber(row.payment_risk_score)
          },
          {
            key: "strategic_value_score",
            label: "Valeur stratégique",
            render: (row) => formatNumber(row.strategic_value_score)
          },
          { key: "customer_segment", label: "Segment" },
          { key: "score_date", label: "Date score" }
        ]}
      />
    </div>
  );
}
