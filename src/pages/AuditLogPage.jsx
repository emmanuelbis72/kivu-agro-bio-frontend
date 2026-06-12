import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Filter,
  LoaderCircle,
  Search,
  ShieldCheck
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import api from "../api/axios";
import { hasSession } from "../utils/auth";
import { formatDate } from "../utils/formatters";

const FILTER_DEFAULTS = {
  start_date: "",
  end_date: "",
  module: "",
  action_type: "",
  risk_level: ""
};

function badgeClass(value) {
  const normalized = String(value || "").toLowerCase();
  if (["critical", "failed", "denied", "delete"].includes(normalized)) {
    return "bg-red-100 text-red-700";
  }
  if (["high", "update", "cancel"].includes(normalized)) {
    return "bg-amber-100 text-amber-800";
  }
  if (["medium", "create", "validate"].includes(normalized)) {
    return "bg-blue-100 text-blue-700";
  }
  return "bg-emerald-100 text-emerald-700";
}

export default function AuditLogPage() {
  const location = useLocation();
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authenticationRequired, setAuthenticationRequired] = useState(
    !hasSession()
  );

  async function fetchLogs(selectedFilters = filters) {
    if (!hasSession()) {
      setAuthenticationRequired(true);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const params = Object.fromEntries(
        Object.entries(selectedFilters).filter(([, value]) => value)
      );
      const response = await api.get("/audit", {
        params: { ...params, limit: 200 }
      });
      setRows(response.data.data || []);
      setAuthenticationRequired(false);
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        setAuthenticationRequired(true);
      } else {
        setError(
          requestError?.response?.data?.message ||
            "Impossible de charger le journal d'audit."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs(FILTER_DEFAULTS);
  }, []);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  if (authenticationRequired) {
    return (
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-amber-200 bg-white p-8 text-center shadow-sm">
        <ShieldCheck className="mx-auto text-amber-600" size={42} />
        <h2 className="mt-5 text-2xl font-black text-slate-950">
          Authentification requise
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Le journal d'audit contient les anciennes et nouvelles valeurs des
          modifications sensibles. Son acces est reserve aux roles autorises.
        </p>
        <Link
          to="/login"
          state={{ from: location.pathname }}
          className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
        >
          Ouvrir la connexion
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            <ShieldCheck size={17} />
            Tracabilite
          </div>
          <h2 className="mt-2 text-3xl font-black text-slate-950">
            Journal d'audit
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Utilisateur, date, action, ancienne valeur et nouvelle valeur.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
          {rows.length} evenements affiches
        </div>
      </header>

      {error ? (
        <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="shrink-0" size={18} />
          {error}
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          fetchLogs(filters);
        }}
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="mb-4 flex items-center gap-2 font-bold text-slate-900">
          <Filter size={18} />
          Filtres
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <FilterInput label="Du" type="date" value={filters.start_date} onChange={(value) => updateFilter("start_date", value)} />
          <FilterInput label="Au" type="date" value={filters.end_date} onChange={(value) => updateFilter("end_date", value)} />
          <FilterInput label="Module" value={filters.module} onChange={(value) => updateFilter("module", value)} />
          <FilterSelect label="Action" value={filters.action_type} onChange={(value) => updateFilter("action_type", value)} options={["create", "update", "delete", "validate", "cancel", "analysis", "export"]} />
          <FilterSelect label="Risque" value={filters.risk_level} onChange={(value) => updateFilter("risk_level", value)} options={["low", "medium", "high", "critical"]} />
          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex h-[46px] items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-60"
          >
            {loading ? <LoaderCircle className="animate-spin" size={17} /> : <Search size={17} />}
            Rechercher
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Date / utilisateur</th>
                <th className="px-5 py-4">Action</th>
                <th className="px-5 py-4">Objet</th>
                <th className="px-5 py-4">Champs</th>
                <th className="px-5 py-4">Ancienne valeur</th>
                <th className="px-5 py-4">Nouvelle valeur</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 align-top">
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-900">
                      {formatDate(row.occurred_at, true)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {row.user_name || "Systeme"} · {row.user_role || "service"}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${badgeClass(row.action_type)}`}>
                      {row.action_type}
                    </span>
                    <div className="mt-2 text-xs text-slate-500">{row.module}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-800">{row.entity_type || "-"}</div>
                    <div className="mt-1 text-xs text-slate-500">{row.entity_id || row.document_reference || "-"}</div>
                  </td>
                  <td className="max-w-[180px] px-5 py-4 text-xs leading-5 text-slate-600">
                    {(row.changed_fields || []).join(", ") || "-"}
                  </td>
                  <td className="max-w-[260px] px-5 py-4">
                    <JsonPreview value={row.old_value} />
                  </td>
                  <td className="max-w-[260px] px-5 py-4">
                    <JsonPreview value={row.new_value} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !rows.length ? (
            <div className="py-14 text-center text-sm text-slate-500">
              Aucun evenement ne correspond aux filtres.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FilterInput({ label, type = "text", value, onChange }) {
  return (
    <label className="text-xs font-semibold text-slate-600">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-[46px] w-full rounded-2xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
      />
    </label>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="text-xs font-semibold text-slate-600">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-[46px] w-full rounded-2xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
      >
        <option value="">Tous</option>
        {options.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
    </label>
  );
}

function JsonPreview({ value }) {
  if (value === null || value === undefined) {
    return <span className="text-xs text-slate-400">-</span>;
  }

  return (
    <details>
      <summary className="cursor-pointer text-xs font-semibold text-emerald-700">
        Voir le detail
      </summary>
      <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-slate-950 p-3 text-[10px] leading-4 text-slate-200">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}
