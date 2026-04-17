import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

function getDefaultDescription(ruleKey) {
  const map = {
    strategic_products: "Produits stratégiques KIVU AGRO BIO",
    priority_cities: "Villes prioritaires de pilotage et de croissance",
    priority_channels: "Canaux et enseignes structurants",
    minimum_cash_threshold_usd: "Seuil minimal de vigilance trésorerie",
    target_net_margin_range: "Fourchette cible de marge nette",
    high_priority_stock_alert_count:
      "Nombre d alertes stock à partir duquel la priorité devient élevée",
    monthly_revenue_targets:
      "Objectifs de chiffre d affaires mensuel base sur les paiements recus"
  };

  return map[ruleKey] || "";
}

export default function AIBusinessRulesPage() {
  const [rulesMap, setRulesMap] = useState({});
  const [drafts, setDrafts] = useState({});
  const [descriptions, setDescriptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function fetchRules() {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      const response = await api.get("/ai/business-rules");
      const rules = response.data.data || {};

      setRulesMap(rules);

      const nextDrafts = {};
      const nextDescriptions = {};

      Object.entries(rules).forEach(([key, value]) => {
        nextDrafts[key] = formatJson(value);
        nextDescriptions[key] = getDefaultDescription(key);
      });

      setDrafts(nextDrafts);
      setDescriptions(nextDescriptions);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger les règles métier."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRules();
  }, []);

  const ruleKeys = useMemo(
    () => Object.keys(rulesMap).sort((a, b) => a.localeCompare(b)),
    [rulesMap]
  );

  function handleDraftChange(ruleKey, value) {
    setDrafts((prev) => ({
      ...prev,
      [ruleKey]: value
    }));
  }

  function handleDescriptionChange(ruleKey, value) {
    setDescriptions((prev) => ({
      ...prev,
      [ruleKey]: value
    }));
  }

  async function handleSave(ruleKey) {
    try {
      setSavingKey(ruleKey);
      setError("");
      setSuccessMessage("");

      let parsedValue;

      try {
        parsedValue = JSON.parse(drafts[ruleKey]);
      } catch (parseError) {
        setError(`Le JSON de la règle "${ruleKey}" est invalide.`);
        return;
      }

      await api.put(`/ai/business-rules/${ruleKey}`, {
        rule_value: parsedValue,
        description: descriptions[ruleKey] || null
      });

      setSuccessMessage(`Règle "${ruleKey}" mise à jour avec succès.`);
      await fetchRules();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          `Impossible de mettre à jour la règle "${ruleKey}".`
      );
    } finally {
      setSavingKey("");
    }
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Administration des règles métier IA"
        subtitle="Configuration stratégique KIVU AGRO BIO utilisée par l’assistant direction"
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

      {loading ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-soft text-sm text-slate-500">
          Chargement des règles métier...
        </div>
      ) : (
        <div className="space-y-6">
          {ruleKeys.map((ruleKey) => (
            <div
              key={ruleKey}
              className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft"
            >
              <div className="mb-4 text-lg font-semibold text-slate-900">
                {ruleKey}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Description
                  </label>
                  <input
                    value={descriptions[ruleKey] || ""}
                    onChange={(e) =>
                      handleDescriptionChange(ruleKey, e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Valeur JSON
                  </label>
                  <textarea
                    value={drafts[ruleKey] || ""}
                    onChange={(e) => handleDraftChange(ruleKey, e.target.value)}
                    rows="10"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 font-mono text-sm outline-none focus:border-brand-500"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleSave(ruleKey)}
                    disabled={savingKey === ruleKey}
                    className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {savingKey === ruleKey ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}