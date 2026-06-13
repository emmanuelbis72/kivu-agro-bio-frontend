import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bot,
  Boxes,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Database,
  LoaderCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users
} from "lucide-react";
import api from "../api/axios";
import {
  HorizontalBarChart,
  LineChart
} from "../components/analytics/AnalyticsCharts";
import {
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent
} from "../utils/formatters";

const PERIODS = [
  { value: "today", label: "Aujourd'hui" },
  { value: "this_week", label: "Cette semaine" },
  { value: "this_month", label: "Ce mois" }
];

const QUICK_QUESTIONS = [
  "Quelles creances dois-je recouvrer en priorite aujourd'hui ?",
  "Quels produits sont les plus rentables ce mois-ci ?",
  "Quels stocks exigent un reapprovisionnement immediat ?",
  "Quelle est la prevision de chiffre d'affaires du mois prochain ?"
];

const TAB_ITEMS = [
  { id: "overview", label: "Vue dirigeant", icon: BarChart3 },
  { id: "collections", label: "Recouvrements", icon: Users },
  { id: "profitability", label: "Rentabilite", icon: TrendingUp },
  { id: "stock", label: "Stocks", icon: Boxes },
  { id: "simulation", label: "Simulation", icon: Calculator },
  { id: "sources", label: "Fiabilite", icon: ShieldCheck }
];

function getTable(analysis, id) {
  return analysis?.tables?.find((table) => table.id === id)?.rows || [];
}

function statusClasses(status) {
  const normalized = String(status || "").toLowerCase();

  if (["critical", "critique"].includes(normalized)) {
    return "bg-red-100 text-red-700";
  }
  if (["urgent", "high", "elevee"].includes(normalized)) {
    return "bg-amber-100 text-amber-800";
  }
  if (["important", "watch", "medium"].includes(normalized)) {
    return "bg-blue-100 text-blue-700";
  }
  return "bg-emerald-100 text-emerald-700";
}

function StatusBadge({ children }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusClasses(
        children
      )}`}
    >
      {children || "normal"}
    </span>
  );
}

function Card({ title, subtitle, children, className = "" }) {
  return (
    <section
      className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      {title ? (
        <div className="mb-5">
          <h3 className="font-bold text-slate-900">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function MetricCard({ label, value, detail, icon: Icon, tone = "emerald" }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
    red: "bg-red-50 text-red-700"
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {label}
          </p>
          <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">
            {value}
          </p>
          {detail ? (
            <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
          ) : null}
        </div>
        <span className={`rounded-2xl p-3 ${tones[tone]}`}>
          <Icon size={21} />
        </span>
      </div>
    </div>
  );
}

function ErrorBanner({ error }) {
  if (!error) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertTriangle className="mt-0.5 shrink-0" size={18} />
      <span>{error}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
      <div className="text-center">
        <LoaderCircle className="mx-auto animate-spin text-emerald-600" size={34} />
        <p className="mt-4 text-sm font-semibold text-slate-700">
          Analyse de la base de donnees...
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Calcul des marges, creances, stocks et previsions.
        </p>
      </div>
    </div>
  );
}

export default function StrategicAIPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [period, setPeriod] = useState("this_month");
  const [activeTab, setActiveTab] = useState("overview");
  const [analysis, setAnalysis] = useState(null);
  const [answer, setAnswer] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  async function loadAnalysis(selectedPeriod = period) {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/analytics/run", {
        params: { period: selectedPeriod }
      });
      setAnalysis(response.data.data || null);
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        navigate("/login", {
          replace: true,
          state: {
            from: `${location.pathname}${location.search}`,
            message:
              "Votre session est absente ou expiree. Connectez-vous pour acceder a l'Assistant strategique IA."
          }
        });
        return;
      }

      setError(
        requestError?.response?.data?.message ||
          "Le moteur analytique est indisponible. Verifiez que le backend est demarre."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalysis(period);
  }, [period]);

  async function askAssistant(event, suggestedQuestion) {
    event?.preventDefault();
    const submittedQuestion = String(suggestedQuestion || question).trim();
    if (!submittedQuestion) return;

    try {
      setAsking(true);
      setError("");
      setQuestion(submittedQuestion);
      const response = await api.post(
        "/ai/ask",
        { question: submittedQuestion, period },
        { timeout: Number(import.meta.env.VITE_AI_REASONING_TIMEOUT_MS || 120000) }
      );
      const payload = response.data.data || {};
      setAnalysis(payload);
      setAnswer(payload.answer || payload.summary || "");
      setActiveTab("overview");
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        navigate("/login", {
          replace: true,
          state: {
            from: `${location.pathname}${location.search}`,
            message:
              "Votre session est absente ou expiree. Connectez-vous pour acceder a l'Assistant strategique IA."
          }
        });
        return;
      }

      setError(
        requestError?.response?.data?.message ||
          "L'assistant ne peut pas repondre pour le moment."
      );
    } finally {
      setAsking(false);
    }
  }

  const metrics = analysis?.metrics || {};
  const collections = useMemo(
    () => getTable(analysis, "collection_priorities"),
    [analysis]
  );
  const profitability = useMemo(
    () => getTable(analysis, "profitability_by_product"),
    [analysis]
  );
  const stock = useMemo(
    () => getTable(analysis, "stock_coverage"),
    [analysis]
  );
  const trend = useMemo(
    () => getTable(analysis, "sales_trend"),
    [analysis]
  );

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-7 text-white shadow-xl md:px-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
              <Sparkles size={16} />
              Intelligence de gestion certifiee
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              Assistant strategique KIVU AGRO BIO
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Les chiffres sont calcules par le moteur deterministe. L'IA les
              explique et transforme les constats en actions prioritaires.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-white outline-none"
            >
              {PERIODS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => loadAnalysis(period)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-50 disabled:opacity-60"
            >
              <RefreshCw className={loading ? "animate-spin" : ""} size={17} />
              Actualiser
            </button>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-300">
          <span className="rounded-full border border-slate-700 px-3 py-1.5">
            Moteur: {analysis?.engine?.version || "1.0.0"}
          </span>
          <span className="rounded-full border border-slate-700 px-3 py-1.5">
            Donnees au {formatDate(analysis?.generated_at, true)}
          </span>
          <span className="rounded-full border border-emerald-800 bg-emerald-950 px-3 py-1.5 text-emerald-300">
            Calcul deterministe
          </span>
        </div>
      </header>

      <ErrorBanner error={error} />

      {loading && !analysis ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="Ventes nettes"
              value={formatMoney(metrics.net_sales)}
              detail={`Evolution: ${
                metrics.revenue_change_percent === null
                  ? "non disponible"
                  : formatPercent(metrics.revenue_change_percent)
              }`}
              icon={CircleDollarSign}
            />
            <MetricCard
              label="Marge brute"
              value={formatMoney(metrics.gross_profit)}
              detail={formatPercent(metrics.gross_margin_percent)}
              icon={TrendingUp}
              tone="blue"
            />
            <MetricCard
              label="Resultat estime"
              value={formatMoney(metrics.estimated_net_profit)}
              detail={`Marge nette: ${formatPercent(
                metrics.estimated_net_margin_percent
              )}`}
              icon={BarChart3}
              tone={Number(metrics.estimated_net_profit) < 0 ? "red" : "violet"}
            />
            <MetricCard
              label="Creances en retard"
              value={formatMoney(metrics.overdue_receivables)}
              detail={`${formatNumber(
                metrics.critical_collection_count
              )} dossiers critiques`}
              icon={Clock3}
              tone="amber"
            />
            <MetricCard
              label="Prevision suivante"
              value={formatMoney(metrics.forecast_next_month_revenue)}
              detail={`Confiance: ${formatPercent(
                metrics.forecast_confidence_score
              )}`}
              icon={ArrowUpRight}
              tone="emerald"
            />
          </div>

          <Card className="border-emerald-200 bg-gradient-to-br from-white to-emerald-50">
            <form
              onSubmit={(event) => askAssistant(event)}
              className="flex flex-col gap-3 lg:flex-row"
            >
              <div className="relative flex-1">
                <Bot
                  className="absolute left-4 top-3.5 text-emerald-600"
                  size={20}
                />
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Posez une question sur les ventes, creances, stocks ou marges..."
                  className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>
              <button
                type="submit"
                disabled={asking || !question.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {asking ? (
                  <LoaderCircle className="animate-spin" size={18} />
                ) : (
                  <Send size={18} />
                )}
                Analyser
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_QUESTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => askAssistant(null, item)}
                  disabled={asking}
                  className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 transition hover:border-emerald-400"
                >
                  {item}
                </button>
              ))}
            </div>
          </Card>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5">
            <div className="flex min-w-max gap-1">
              {TAB_ITEMS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      activeTab === tab.id
                        ? "bg-slate-950 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {activeTab === "overview" ? (
            <OverviewTab
              analysis={analysis}
              answer={answer}
              trend={trend}
              profitability={profitability}
            />
          ) : null}
          {activeTab === "collections" ? (
            <CollectionsTab rows={collections} />
          ) : null}
          {activeTab === "profitability" ? (
            <ProfitabilityTab rows={profitability} />
          ) : null}
          {activeTab === "stock" ? <StockTab rows={stock} /> : null}
          {activeTab === "simulation" ? (
            <SimulationTab metrics={metrics} />
          ) : null}
          {activeTab === "sources" ? (
            <SourcesTab analysis={analysis} />
          ) : null}
        </>
      )}
    </div>
  );
}

function OverviewTab({ analysis, answer, trend, profitability }) {
  const forecast = analysis?.forecast || {};
  const recommendations = analysis?.recommendation_details || analysis?.recommendations || [];
  const lineChart = analysis?.charts?.find(
    (chart) => chart.id === "sales_collections_trend"
  );

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <div className="space-y-5 xl:col-span-2">
        {answer ? (
          <Card title="Reponse de l'assistant">
            <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
              {answer}
            </p>
          </Card>
        ) : null}
        <Card
          title="Ventes et encaissements"
          subtitle="Evolution mensuelle issue des factures et paiements enregistres."
        >
          <LineChart
            data={lineChart?.data || trend}
            series={
              lineChart?.series || [
                { key: "revenue", label: "Chiffre d'affaires" },
                { key: "collected", label: "Encaissements" }
              ]
            }
          />
        </Card>
        <Card title="Produits createurs de marge">
          <HorizontalBarChart
            data={profitability}
            labelKey="product_name"
            valueKey="gross_profit"
          />
        </Card>
      </div>

      <div className="space-y-5">
        <Card
          title="Recommandations prioritaires"
          subtitle="Actions justifiees par les indicateurs calcules."
        >
          <div className="space-y-3">
            {recommendations.length ? (
              recommendations.map((item, index) => (
                <div
                  key={`${item.title}-${index}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-bold text-slate-900">
                      {item.title || item.action}
                    </h4>
                    <StatusBadge>{item.priority}</StatusBadge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    {item.justification}
                  </p>
                  {item.action ? (
                    <p className="mt-2 text-xs font-semibold leading-5 text-emerald-700">
                      Action: {item.action}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                Aucune recommandation prioritaire.
              </p>
            )}
          </div>
        </Card>
        <Card title="Prevision du mois prochain">
          <div className="space-y-4">
            <ForecastRow
              label="Scenario prudent"
              value={forecast.prudent_projection}
            />
            <ForecastRow
              label="Projection centrale"
              value={forecast.projected_revenue}
              strong
            />
            <ForecastRow
              label="Scenario optimiste"
              value={forecast.optimistic_projection}
            />
            <div className="rounded-2xl bg-blue-50 p-4 text-xs leading-5 text-blue-800">
              {forecast.method || "Moyenne mobile ponderee."}
              <br />
              Confiance: {formatPercent(forecast.confidence_score)}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ForecastRow({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={strong ? "text-lg font-black text-emerald-700" : "font-bold text-slate-900"}>
        {formatMoney(value)}
      </span>
    </div>
  );
}

function CollectionsTab({ rows }) {
  const criticalBalance = rows
    .filter((row) => ["critical", "urgent"].includes(row.priority))
    .reduce((sum, row) => sum + Number(row.balance_due || 0), 0);

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <Card
        title="Montants a traiter en premier"
        subtitle="Classement par score explicable de risque et de retard."
        className="xl:col-span-1"
      >
        <div className="rounded-2xl bg-red-50 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-red-700">
            Critique et urgent
          </p>
          <p className="mt-2 text-3xl font-black text-red-900">
            {formatMoney(criticalBalance)}
          </p>
        </div>
        <div className="mt-5">
          <HorizontalBarChart
            data={rows}
            labelKey="customer_name"
            valueKey="balance_due"
            color="bg-amber-500"
          />
        </div>
      </Card>
      <Card title="Plan de recouvrement" className="overflow-hidden xl:col-span-2">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-3 pr-4">Priorite</th>
                <th className="pb-3 pr-4">Client / Facture</th>
                <th className="pb-3 pr-4">Solde</th>
                <th className="pb-3 pr-4">Retard</th>
                <th className="pb-3 pr-4">Score</th>
                <th className="pb-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.invoice_id} className="border-b border-slate-100 align-top">
                  <td className="py-4 pr-4"><StatusBadge>{row.priority}</StatusBadge></td>
                  <td className="py-4 pr-4">
                    <div className="font-bold text-slate-900">{row.customer_name}</div>
                    <div className="mt-1 text-xs text-slate-500">{row.invoice_number} · {row.city || "-"}</div>
                  </td>
                  <td className="py-4 pr-4 font-bold text-slate-900">{formatMoney(row.balance_due)}</td>
                  <td className="py-4 pr-4">{formatNumber(row.days_overdue)} j</td>
                  <td className="py-4 pr-4 font-bold">{formatNumber(row.score)}/100</td>
                  <td className="max-w-xs py-4 text-xs leading-5 text-slate-600">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length ? <EmptyTable /> : null}
        </div>
      </Card>
    </div>
  );
}

function ProfitabilityTab({ rows }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card title="Marge brute par produit">
        <HorizontalBarChart
          data={rows}
          labelKey="product_name"
          valueKey="gross_profit"
        />
      </Card>
      <Card title="Detail de rentabilite" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-3 pr-4">Produit</th>
                <th className="pb-3 pr-4">Ventes</th>
                <th className="pb-3 pr-4">Cout</th>
                <th className="pb-3 pr-4">Marge</th>
                <th className="pb-3">Taux</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.product_id} className="border-b border-slate-100">
                  <td className="py-4 pr-4">
                    <div className="font-bold text-slate-900">{row.product_name}</div>
                    <div className="text-xs text-slate-500">{row.category || "-"}</div>
                  </td>
                  <td className="py-4 pr-4">{formatMoney(row.revenue)}</td>
                  <td className="py-4 pr-4">{formatMoney(row.cogs)}</td>
                  <td className={`py-4 pr-4 font-bold ${row.at_loss ? "text-red-700" : "text-emerald-700"}`}>
                    {formatMoney(row.gross_profit)}
                  </td>
                  <td className="py-4 font-bold">{formatPercent(row.gross_margin_percent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length ? <EmptyTable /> : null}
        </div>
      </Card>
    </div>
  );
}

function StockTab({ rows }) {
  return (
    <Card
      title="Couverture et recommandations de stock"
      subtitle="La recommandation vise trente jours de couverture sur la base des ventes des 90 derniers jours."
      className="overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="pb-3 pr-4">Statut</th>
              <th className="pb-3 pr-4">Produit</th>
              <th className="pb-3 pr-4">Depot</th>
              <th className="pb-3 pr-4">Stock</th>
              <th className="pb-3 pr-4">Couverture</th>
              <th className="pb-3">A commander</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.product_id}-${row.warehouse_id}`}
                className="border-b border-slate-100"
              >
                <td className="py-4 pr-4"><StatusBadge>{row.status}</StatusBadge></td>
                <td className="py-4 pr-4 font-bold text-slate-900">{row.product_name}</td>
                <td className="py-4 pr-4">
                  {row.warehouse_name}
                  <div className="text-xs text-slate-500">{row.city || "-"}</div>
                </td>
                <td className="py-4 pr-4">{formatNumber(row.stock_quantity)}</td>
                <td className="py-4 pr-4">
                  {row.coverage_days === null ? "Non calculee" : `${formatNumber(row.coverage_days)} j`}
                </td>
                <td className="py-4 font-black text-emerald-700">
                  {formatNumber(row.recommended_reorder_quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <EmptyTable /> : null}
      </div>
    </Card>
  );
}

function SimulationTab({ metrics }) {
  const [priceChange, setPriceChange] = useState(0);
  const [volumeChange, setVolumeChange] = useState(0);
  const [costChange, setCostChange] = useState(0);
  const [commissionRate, setCommissionRate] = useState(0);
  const [extraExpenses, setExtraExpenses] = useState(0);

  const result = useMemo(() => {
    const projectedRevenue =
      Number(metrics.net_sales || 0) *
      (1 + Number(priceChange) / 100) *
      (1 + Number(volumeChange) / 100);
    const projectedCogs =
      Number(metrics.cogs || 0) *
      (1 + Number(volumeChange) / 100) *
      (1 + Number(costChange) / 100);
    const commissions = projectedRevenue * (Number(commissionRate) / 100);
    const projectedExpenses =
      Number(metrics.operating_expenses || 0) +
      commissions +
      Number(extraExpenses || 0);
    const projectedGrossProfit = projectedRevenue - projectedCogs;
    const projectedNetProfit = projectedGrossProfit - projectedExpenses;

    return {
      projectedRevenue,
      projectedGrossProfit,
      projectedNetProfit,
      projectedNetMargin:
        projectedRevenue > 0 ? (projectedNetProfit / projectedRevenue) * 100 : 0
    };
  }, [
    metrics,
    priceChange,
    volumeChange,
    costChange,
    commissionRate,
    extraExpenses
  ]);

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card
        title="Hypotheses de simulation"
        subtitle="Aucun changement n'est applique a la base de donnees."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SimulationInput label="Variation des prix (%)" value={priceChange} onChange={setPriceChange} />
          <SimulationInput label="Variation du volume (%)" value={volumeChange} onChange={setVolumeChange} />
          <SimulationInput label="Variation des couts (%)" value={costChange} onChange={setCostChange} />
          <SimulationInput label="Commission commerciale (%)" value={commissionRate} onChange={setCommissionRate} />
          <SimulationInput label="Depenses additionnelles (USD)" value={extraExpenses} onChange={setExtraExpenses} />
        </div>
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
          Formule: ventes projetees moins couts variables, charges actuelles,
          commissions et depenses additionnelles.
        </div>
      </Card>
      <Card title="Resultat du scenario">
        <div className="grid gap-4 sm:grid-cols-2">
          <SimulationResult label="Ventes projetees" value={formatMoney(result.projectedRevenue)} />
          <SimulationResult label="Marge brute" value={formatMoney(result.projectedGrossProfit)} />
          <SimulationResult
            label="Resultat net estime"
            value={formatMoney(result.projectedNetProfit)}
            negative={result.projectedNetProfit < 0}
          />
          <SimulationResult
            label="Marge nette estimee"
            value={formatPercent(result.projectedNetMargin)}
            negative={result.projectedNetMargin < 0}
          />
        </div>
        <div className={`mt-5 flex items-start gap-3 rounded-2xl p-4 text-sm ${
          result.projectedNetProfit >= Number(metrics.estimated_net_profit || 0)
            ? "bg-emerald-50 text-emerald-800"
            : "bg-amber-50 text-amber-800"
        }`}>
          {result.projectedNetProfit >= Number(metrics.estimated_net_profit || 0) ? (
            <CheckCircle2 className="shrink-0" size={20} />
          ) : (
            <AlertTriangle className="shrink-0" size={20} />
          )}
          <span>
            Ecart par rapport a la situation actuelle:{" "}
            <strong>
              {formatMoney(
                result.projectedNetProfit -
                  Number(metrics.estimated_net_profit || 0)
              )}
            </strong>
          </span>
        </div>
      </Card>
    </div>
  );
}

function SimulationInput({ label, value, onChange }) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <input
        type="number"
        step="0.5"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      />
    </label>
  );
}

function SimulationResult({ label, value, negative = false }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-black ${negative ? "text-red-700" : "text-slate-950"}`}>
        {value}
      </p>
    </div>
  );
}

function SourcesTab({ analysis }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card title="Sources parcourues">
        <div className="grid gap-3 sm:grid-cols-2">
          {(analysis?.sources || []).map((source) => (
            <div key={source.table} className="flex gap-3 rounded-2xl border border-slate-200 p-4">
              <Database className="shrink-0 text-emerald-600" size={19} />
              <div>
                <p className="text-sm font-bold text-slate-900">{source.table}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{source.purpose}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <div className="space-y-5">
        <Card title="Methodologie">
          <ol className="space-y-3">
            {(analysis?.methodology || []).map((item, index) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
                  {index + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </Card>
        <Card title="Qualite des donnees">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-slate-600">Statut</span>
            <StatusBadge>{analysis?.data_quality?.status}</StatusBadge>
          </div>
          <div className="space-y-3">
            {(analysis?.data_quality?.warnings || []).map((warning) => (
              <div key={warning} className="flex gap-3 rounded-2xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                <AlertTriangle className="mt-0.5 shrink-0" size={16} />
                {warning}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function EmptyTable() {
  return (
    <div className="py-12 text-center text-sm text-slate-500">
      Aucune donnee disponible pour cette periode.
    </div>
  );
}
