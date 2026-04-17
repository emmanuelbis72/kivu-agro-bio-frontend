import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="rounded-3xl bg-white p-10 shadow-soft text-center">
        <div className="text-3xl font-bold text-slate-900">404</div>
        <p className="mt-3 text-slate-600">Page introuvable.</p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block rounded-2xl bg-brand-600 px-5 py-3 text-white"
        >
          Retour au dashboard
        </Link>
      </div>
    </div>
  );
}