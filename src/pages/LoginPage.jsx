import { useState } from "react";
import { KeyRound, LoaderCircle, LogIn, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { saveSession } from "../utils/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");
      const response = await api.post("/auth/login", { email, password });
      saveSession(response.data.data);
      navigate(location.state?.from || "/strategic-ai", { replace: true });
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          "Connexion impossible. Verifiez vos identifiants."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center">
      <div className="grid w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl lg:grid-cols-2">
        <div className="bg-slate-950 p-8 text-white md:p-12">
          <ShieldCheck className="text-emerald-400" size={40} />
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
            Acces securise
          </p>
          <h2 className="mt-3 text-3xl font-black">
            Espace de pilotage KIVU AGRO BIO
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            La connexion permet d'acceder au journal d'audit et aux operations
            reservees selon votre role.
          </p>
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs leading-5 text-slate-300">
            <KeyRound className="shrink-0 text-emerald-400" size={20} />
            Le jeton de session est conserve uniquement dans ce navigateur.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 md:p-12">
          <h3 className="text-2xl font-black text-slate-950">Connexion</h3>
          <p className="mt-2 text-sm text-slate-500">
            Utilisez le compte cree par l'administrateur du systeme.
          </p>

          {error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mt-7 space-y-5">
            <label className="block text-sm font-semibold text-slate-700">
              Adresse e-mail
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Mot de passe
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? (
              <LoaderCircle className="animate-spin" size={19} />
            ) : (
              <LogIn size={19} />
            )}
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
}
