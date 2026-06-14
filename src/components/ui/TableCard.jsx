export default function TableCard({
  title,
  columns = [],
  rows = [],
  emptyText = "Aucune donnee",
  rowClassName,
  getRowKey
}) {
  function renderCellValue(value) {
    if (value === null || value === undefined || value === "") {
      return "-";
    }

    if (Array.isArray(value)) {
      return value
        .map((item) =>
          item && typeof item === "object" ? JSON.stringify(item) : String(item)
        )
        .join(", ");
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return value;
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
      {title ? (
        <div className="mb-4 text-lg font-semibold text-slate-900">{title}</div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          {emptyText}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-3 py-3 text-left font-semibold text-slate-600"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={getRowKey ? getRowKey(row, index) : index}
                  className={`border-b border-slate-100 ${
                    rowClassName ? rowClassName(row, index) : ""
                  }`}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-3 py-3 text-slate-700">
                      {column.render
                        ? column.render(row)
                        : renderCellValue(row[column.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
