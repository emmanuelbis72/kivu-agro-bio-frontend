export default function Topbar() {
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Tableau de gestion KIVU AGRO BIO
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Pilotage commercial, stock et facturation
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
        {today}
      </div>
    </header>
  );
}