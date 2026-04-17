import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import TableCard from "../components/ui/TableCard";

function formatMetricValue(value) {
  if (typeof value === "number") {
    return new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 2
    }).format(value);
  }

  return String(value ?? "-");
}

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));
}

function humanizeMetricKey(key) {
  const map = {
    total_sales_amount: "Ventes cumulées",
    total_collected_amount: "Paiements reçus",
    total_receivables: "Créances",
    strategic_products_in_top_sales: "Produits stratégiques en tête",
    priority_customers_with_receivables: "Clients prioritaires avec créances",
    total_invoices: "Factures",
    strategic_products_count: "Produits stratégiques",
    strategic_stock_alerts_count: "Alertes stock stratégiques",
    critical_items_count: "Alertes stock",
    priority_items_count: "Alertes prioritaires",
    strategic_items_in_alert: "Produits stratégiques en alerte",
    risky_customers_count: "Clients risqués",
    total_receivables_top_customers: "Créances top clients",
    risky_priority_customers_count: "Clients risqués prioritaires",
    total_expenses: "Dépenses totales",
    expense_count: "Nombre de dépenses",
    target_net_margin_min: "Marge nette min cible",
    target_net_margin_max: "Marge nette max cible",
    total_payments_received: "Encaissements",
    minimum_cash_threshold_usd: "Seuil cash minimum",
    total_accounts: "Comptes comptables",
    total_entries: "Écritures",
    posted_entries: "Écritures validées",
    draft_entries: "Écritures brouillon",
    total_posted_debit: "Total débit validé",
    total_posted_credit: "Total crédit validé",
    stock_alerts_count: "Alertes stock"
  };

  return map[key] || key;
}

function shouldDisplayAsMoney(key) {
  return [
    "total_sales_amount",
    "total_collected_amount",
    "total_receivables",
    "total_receivables_top_customers",
    "total_expenses",
    "total_payments_received",
    "minimum_cash_threshold_usd",
    "total_posted_debit",
    "total_posted_credit"
  ].includes(key);
}

function normalizeBusinessRules(payload) {
  const values = payload?.values || payload || {};
  const monthlyRevenueTargets =
    values?.monthly_revenue_targets &&
    typeof values.monthly_revenue_targets === "object"
      ? values.monthly_revenue_targets
      : {
          current_minimum_monthly_received_payments_usd: 30000,
          target_from_july_2026_monthly_received_payments_usd: 35000,
          target_by_december_2026_monthly_received_payments_usd: 50000
        };

  return {
    strategicProducts: Array.isArray(values?.strategic_products)
      ? values.strategic_products
      : [],
    priorityCities: Array.isArray(values?.priority_cities)
      ? values.priority_cities
      : [],
    priorityChannels: Array.isArray(values?.priority_channels)
      ? values.priority_channels
      : [],
    revenueTargets: monthlyRevenueTargets
  };
}

function getPriorityBadgeClass(priorityLevel) {
  const normalized = String(priorityLevel || "").toUpperCase();

  if (normalized === "CRITICAL") {
    return "bg-red-100 text-red-700 border border-red-200";
  }

  if (normalized === "HIGH") {
    return "bg-amber-100 text-amber-700 border border-amber-200";
  }

  if (normalized === "MEDIUM") {
    return "bg-blue-100 text-blue-700 border border-blue-200";
  }

  return "bg-emerald-100 text-emerald-700 border border-emerald-200";
}

function extractRiskAndOpportunityRows(drivers = []) {
  const risks = [];
  const opportunities = [];
  const neutral = [];

  for (const item of drivers) {
    const text = String(item || "").trim();

    if (!text) continue;

    if (text.startsWith("Risque:")) {
      risks.push({ item: text.replace(/^Risque:\s*/i, "").trim() });
      continue;
    }

    if (text.startsWith("Opportunité:") || text.startsWith("Opportunité :")) {
      opportunities.push({
        item: text.replace(/^Opportunité\s*:\s*/i, "").trim()
      });
      continue;
    }

    neutral.push({ item: text });
  }

  return { risks, opportunities, neutral };
}

export default function AIReasoningPage() {
  const [question, setQuestion] = useState("");
  const [quickQuestions, setQuickQuestions] = useState([]);
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [businessRules, setBusinessRules] = useState({
    strategicProducts: [],
    priorityCities: [],
    priorityChannels: [],
    revenueTargets: {
      current_minimum_monthly_received_payments_usd: 30000,
      target_from_july_2026_monthly_received_payments_usd: 35000,
      target_by_december_2026_monthly_received_payments_usd: 50000
    }
  });

  const [loadingQuickQuestions, setLoadingQuickQuestions] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingBusinessRules, setLoadingBusinessRules] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [error, setError] = useState("");

  async function fetchQuickQuestions() {
    try {
      setLoadingQuickQuestions(true);

      const response = await api.get("/ai/quick-questions");
      setQuickQuestions(response.data.data || []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger les questions suggérées."
      );
    } finally {
      setLoadingQuickQuestions(false);
    }
  }

  async function fetchHistory() {
    try {
      setLoadingHistory(true);

      const response = await api.get("/ai/history");
      setHistory(response.data.data || []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger l’historique IA."
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  async function fetchBusinessRules() {
    try {
      setLoadingBusinessRules(true);

      const response = await api.get("/ai/business-rules");
      setBusinessRules(normalizeBusinessRules(response.data.data || {}));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger les règles métier IA."
      );
    } finally {
      setLoadingBusinessRules(false);
    }
  }

  useEffect(() => {
    fetchQuickQuestions();
    fetchHistory();
    fetchBusinessRules();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitLoading(true);
      setError("");

      const normalizedQuestion = question.trim();

      if (!normalizedQuestion) {
        setError("La question est obligatoire.");
        return;
      }

      const response = await api.post("/ai/ask", {
        question: normalizedQuestion
      });

      setResult(response.data.data || null);
      await fetchHistory();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible d’interroger l’assistant IA."
      );
    } finally {
      setSubmitLoading(false);
    }
  }

  function handleQuickQuestionClick(item) {
    setQuestion(item);
    setError("");
  }

  const metricsRows = useMemo(() => {
    if (!result?.metrics || typeof result.metrics !== "object") {
      return [];
    }

    return Object.entries(result.metrics).map(([key, value]) => ({
      metric: humanizeMetricKey(key),
      rawKey: key,
      value
    }));
  }, [result]);

  const { risks, opportunities, neutral } = useMemo(
    () => extractRiskAndOpportunityRows(result?.drivers || []),
    [result]
  );

  const targetRows = [
    {
      label: "Objectif minimum actuel",
      value: formatMoney(
        businessRules.revenueTargets
          ?.current_minimum_monthly_received_payments_usd
      )
    },
    {
      label: "Objectif à partir de juillet 2026",
      value: formatMoney(
        businessRules.revenueTargets
          ?.target_from_july_2026_monthly_received_payments_usd
      )
    },
    {
      label: "Objectif pour décembre 2026",
      value: formatMoney(
        businessRules.revenueTargets
          ?.target_by_december_2026_monthly_received_payments_usd
      )
    }
  ];

  const isReasoningMode = result?.intent === "ai_reasoning";
  const sourceModuleLabel =
    result?.source_module === "ai_ceo"
      ? "KABOT CEO"
      : result?.source_module || "-";

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Assistant Direction IA"
        subtitle="Moteur de raisonnement métier pour KIVU AGRO BIO"
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft xl:col-span-2">
          <div className="mb-5 text-lg font-semibold text-slate-900">
            Poser une question à l’IA
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows="4"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Ex: Quelle est ma situation de trésorerie et quelles actions prioritaires dois-je prendre ?"
            />

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitLoading}
                className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitLoading ? "Analyse en cours..." : "Analyser"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setQuestion("");
                  setResult(null);
                  setError("");
                }}
                className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Réinitialiser
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6 shadow-soft">
          <div className="mb-4 text-lg font-semibold text-emerald-900">
            Cadre stratégique
          </div>

          {loadingBusinessRules ? (
            <div className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-slate-500">
              Chargement des règles métier...
            </div>
          ) : (
            <div className="space-y-4 text-sm text-emerald-900">
              <div>
                <div className="font-semibold">Villes prioritaires</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {businessRules.priorityCities.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-800"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="font-semibold">Canaux prioritaires</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {businessRules.priorityChannels.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-800"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="font-semibold">Produits stratégiques</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {businessRules.strategicProducts.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-800"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="mb-5 text-lg font-semibold text-slate-900">
          Objectifs de chiffre d’affaires mensuel
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {targetRows.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="text-sm text-slate-500">{item.label}</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        <div className="mb-5 text-lg font-semibold text-slate-900">
          Questions suggérées
        </div>

        {loadingQuickQuestions ? (
          <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Chargement des suggestions...
          </div>
        ) : quickQuestions.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Aucune suggestion disponible.
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {quickQuestions.map((item, index) => (
              <button
                key={`${item}-${index}`}
                type="button"
                onClick={() => handleQuickQuestionClick(item)}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      {result ? (
        <>
          {isReasoningMode ? (
            <div className="rounded-3xl border border-violet-100 bg-violet-50 p-6 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">
                    Mode CEO actif
                  </div>
                  <div className="mt-2 text-lg font-bold text-violet-950">
                    Réponse générée par KABOT CEO via DeepSeek Reasoner
                  </div>
                </div>

                <span
                  className={`inline-flex rounded-full px-4 py-2 text-xs font-semibold ${getPriorityBadgeClass(
                    result.priority_level
                  )}`}
                >
                  Priorité {String(result.priority_level || "MEDIUM").toUpperCase()}
                </span>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
              <div className="text-sm text-slate-500">Intention détectée</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {result.intent || "-"}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
              <div className="text-sm text-slate-500">Période</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {result.period || "-"}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
              <div className="text-sm text-slate-500">Module source</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {sourceModuleLabel}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
              <div className="text-sm text-slate-500">Confiance</div>
              <div className="mt-2 text-lg font-bold text-slate-900">
                {formatMetricValue(result.confidence_score)}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
            <div className="mb-3 text-lg font-semibold text-slate-900">
              Résumé exécutif
            </div>
            <p className="text-sm leading-7 text-slate-700">
              {result.summary || "-"}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
            <div className="mb-3 text-lg font-semibold text-slate-900">
              Analyse détaillée
            </div>
            <p className="text-sm leading-7 text-slate-700 whitespace-pre-line">
              {result.answer || "-"}
            </p>
          </div>

          {metricsRows.length > 0 ? (
            <TableCard
              title={`Indicateurs (${metricsRows.length})`}
              rows={metricsRows}
              emptyText="Aucun indicateur disponible"
              columns={[
                { key: "metric", label: "Indicateur" },
                {
                  key: "value",
                  label: "Valeur",
                  render: (row) =>
                    shouldDisplayAsMoney(row.rawKey)
                      ? formatMoney(row.value)
                      : formatMetricValue(row.value)
                }
              ]}
            />
          ) : null}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <TableCard
              title={`Risques (${risks.length})`}
              rows={risks}
              emptyText="Aucun risque identifié"
              columns={[{ key: "item", label: "Risque" }]}
            />

            <TableCard
              title={`Opportunités (${opportunities.length})`}
              rows={opportunities}
              emptyText="Aucune opportunité identifiée"
              columns={[{ key: "item", label: "Opportunité" }]}
            />

            <TableCard
              title={`Autres facteurs (${neutral.length})`}
              rows={neutral}
              emptyText="Aucun autre facteur"
              columns={[{ key: "item", label: "Facteur" }]}
            />
          </div>

          <TableCard
            title={`Recommandations CEO (${result.recommendations?.length || 0})`}
            rows={(result.recommendations || []).map((item) => ({ item }))}
            emptyText="Aucune recommandation"
            columns={[{ key: "item", label: "Action recommandée" }]}
          />
        </>
      ) : null}

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
        {loadingHistory ? (
          <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Chargement de l’historique...
          </div>
        ) : (
          <TableCard
            title={`Historique IA (${history.length})`}
            rows={history}
            emptyText="Aucune question posée pour le moment"
            columns={[
              { key: "question", label: "Question" },
              { key: "intent", label: "Intention" },
              { key: "summary", label: "Résumé" },
              { key: "created_at", label: "Date" }
            ]}
          />
        )}
      </div>
    </div>
  );
}