import { formatMoney } from "../../utils/formatters";

const SERIES_COLORS = ["#059669", "#2563eb", "#f59e0b"];

function chartPoints(data, key, width, height, padding, maxValue) {
  if (!data.length) return "";

  return data
    .map((row, index) => {
      const x =
        data.length === 1
          ? width / 2
          : padding + (index / (data.length - 1)) * (width - padding * 2);
      const y =
        height -
        padding -
        (Number(row[key] || 0) / Math.max(maxValue, 1)) *
          (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

export function LineChart({ data = [], series = [], xKey = "period" }) {
  const width = 760;
  const height = 250;
  const padding = 34;
  const maxValue = Math.max(
    1,
    ...data.flatMap((row) => series.map((item) => Number(row[item.key] || 0)))
  );

  if (!data.length) {
    return <EmptyChart />;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
        {series.map((item, index) => (
          <span key={item.key} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color || SERIES_COLORS[index] }}
            />
            {item.label}
          </span>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[620px] w-full"
          role="img"
          aria-label="Evolution des indicateurs"
        >
          {[0, 1, 2, 3, 4].map((step) => {
            const y = padding + (step / 4) * (height - padding * 2);
            return (
              <line
                key={step}
                x1={padding}
                x2={width - padding}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            );
          })}
          {series.map((item, index) => (
            <polyline
              key={item.key}
              fill="none"
              stroke={item.color || SERIES_COLORS[index]}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={chartPoints(
                data,
                item.key,
                width,
                height,
                padding,
                maxValue
              )}
            />
          ))}
          {data.map((row, index) => {
            const x =
              data.length === 1
                ? width / 2
                : padding +
                  (index / (data.length - 1)) * (width - padding * 2);
            return (
              <text
                key={`${row[xKey]}-${index}`}
                x={x}
                y={height - 8}
                textAnchor="middle"
                className="fill-slate-500 text-[11px]"
              >
                {String(row[xKey] || "")}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function HorizontalBarChart({
  data = [],
  labelKey,
  valueKey,
  color = "bg-emerald-500"
}) {
  const maxValue = Math.max(1, ...data.map((row) => Number(row[valueKey] || 0)));

  if (!data.length) {
    return <EmptyChart />;
  }

  return (
    <div className="space-y-4">
      {data.slice(0, 8).map((row, index) => {
        const value = Number(row[valueKey] || 0);
        const width = Math.max(2, (value / maxValue) * 100);

        return (
          <div key={`${row[labelKey]}-${index}`}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-medium text-slate-700">
                {row[labelKey] || "Sans libelle"}
              </span>
              <span className="shrink-0 font-semibold text-slate-900">
                {formatMoney(value)}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${color}`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-48 items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">
      Donnees insuffisantes pour afficher le graphique.
    </div>
  );
}
