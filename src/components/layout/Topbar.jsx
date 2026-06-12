import { useEffect, useState } from "react";
import { LogIn, LogOut, Menu, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { clearSession, getStoredUser } from "../../utils/auth";

export default function Topbar({ onMenuClick }) {
  const [user, setUser] = useState(getStoredUser);
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  useEffect(() => {
    const updateUser = () => setUser(getStoredUser());
    window.addEventListener("kab-auth-change", updateUser);
    window.addEventListener("storage", updateUser);
    return () => {
      window.removeEventListener("kab-auth-change", updateUser);
      window.removeEventListener("storage", updateUser);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 xl:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
        <h1 className="truncate text-lg font-bold text-slate-900 sm:text-2xl">
          Tableau de gestion KIVU AGRO BIO
        </h1>
        <p className="mt-1 hidden text-sm text-slate-500 sm:block">
          Pilotage commercial, stock et facturation
        </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 xl:block">
          {today}
        </div>
        {user ? (
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm md:flex">
              <UserRound size={16} className="text-emerald-600" />
              <span className="max-w-36 truncate font-semibold text-slate-700">
                {user.full_name || user.email}
              </span>
            </div>
            <button
              type="button"
              onClick={clearSession}
              className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-100"
              title="Se deconnecter"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-sm font-bold text-white"
          >
            <LogIn size={17} />
            <span className="hidden sm:inline">Connexion</span>
          </Link>
        )}
      </div>
    </header>
  );
}
