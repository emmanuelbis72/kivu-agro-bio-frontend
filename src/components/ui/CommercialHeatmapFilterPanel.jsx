import {
  heatmapPeriodOptions,
  heatmapTopProductOptions,
  heatmapTopCityOptions
} from "../../utils/commercialHeatmap";

function FilterSelect({ label, name, value, onChange, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
      >
        {children}
      </select>
    </div>
  );
}

export default function CommercialHeatmapFilterPanel({
  values,
  onChange,
  onSubmit,
  onReset,
  warehouseOptions = [],
  chainOptions = [],
  channelOptions = [],
  loading = false
}) {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-soft">
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="text-lg font-semibold text-slate-900">
            Filtres de la heatmap
          </div>
          <div className="mt-2 text-sm leading-6 text-slate-500">
            Ces filtres s appliquent uniquement a la matrice produit x ville.
          </div>
        </div>

        {loading ? (
          <div className="text-sm font-medium text-brand-600">
            Actualisation de la heatmap...
          </div>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FilterSelect
            label="Periode"
            name="days"
            value={values.days}
            onChange={onChange}
          >
            {heatmapPeriodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Depot"
            name="warehouse_id"
            value={values.warehouse_id}
            onChange={onChange}
          >
            <option value="">Tous les depots</option>
            {warehouseOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Chaine"
            name="chain_name"
            value={values.chain_name}
            onChange={onChange}
          >
            <option value="">Toutes les chaines</option>
            {chainOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Canal"
            name="sales_channel"
            value={values.sales_channel}
            onChange={onChange}
          >
            <option value="">Tous les canaux</option>
            {channelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Top N produits"
            name="top_products"
            value={values.top_products}
            onChange={onChange}
          >
            {heatmapTopProductOptions.map((option) => (
              <option key={option} value={option}>
                Top {option}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Top N villes"
            name="top_cities"
            value={values.top_cities}
            onChange={onChange}
          >
            {heatmapTopCityOptions.map((option) => (
              <option key={option} value={option}>
                Top {option}
              </option>
            ))}
          </FilterSelect>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            Appliquer a la heatmap
          </button>

          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-60"
          >
            Reinitialiser
          </button>
        </div>
      </form>
    </div>
  );
}
