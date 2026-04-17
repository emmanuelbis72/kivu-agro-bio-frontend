export default function StatCard({ title, value, subtitle }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
      <div className="text-sm font-medium text-slate-500">{title}</div>
      <div className="mt-3 text-3xl font-bold text-slate-900">{value}</div>
      {subtitle ? (
        <div className="mt-2 text-sm text-slate-500">{subtitle}</div>
      ) : null}
    </div>
  );
}