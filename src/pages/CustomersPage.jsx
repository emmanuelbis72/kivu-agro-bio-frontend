import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import SectionTitle from "../components/ui/SectionTitle";
import TableCard from "../components/ui/TableCard";

const initialForm = {
  customer_type: "retail",
  business_name: "",
  contact_name: "",
  phone: "",
  email: "",
  city: "",
  chain_name: "",
  sales_channel: "",
  commercial_name: "",
  address: "",
  payment_terms_days: "",
  credit_limit: "",
  notes: "",
  is_active: true
};

function normalizeForm(form) {
  return {
    customer_type: form.customer_type.trim() || "retail",
    business_name: form.business_name.trim(),
    contact_name: form.contact_name.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    city: form.city.trim(),
    chain_name: form.chain_name.trim(),
    sales_channel: form.sales_channel.trim(),
    commercial_name: form.commercial_name.trim(),
    address: form.address.trim(),
    payment_terms_days:
      form.payment_terms_days === "" ? 0 : Number(form.payment_terms_days),
    credit_limit: form.credit_limit === "" ? 0 : Number(form.credit_limit),
    notes: form.notes.trim(),
    is_active: Boolean(form.is_active)
  };
}

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [bulkCommercialName, setBulkCommercialName] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [onlyMissingCommercial, setOnlyMissingCommercial] = useState(false);

  async function fetchCustomers() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/customers");
      setCustomers(response.data.data || []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger les clients."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCustomers();
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingCustomerId(null);
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function handleEdit(customer) {
    setEditingCustomerId(customer.id);
    setError("");
    setSuccessMessage("");

    setForm({
      customer_type: customer.customer_type || "retail",
      business_name: customer.business_name || "",
      contact_name: customer.contact_name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      city: customer.city || "",
      chain_name: customer.chain_name || "",
      sales_channel: customer.sales_channel || "",
      commercial_name: customer.commercial_name || "",
      address: customer.address || "",
      payment_terms_days: customer.payment_terms_days ?? "",
      credit_limit: customer.credit_limit ?? "",
      notes: customer.notes || "",
      is_active: Boolean(customer.is_active)
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleOpenAccount(customer) {
    navigate(`/customer-accounts?customerId=${customer.id}`);
  }

  function handleOpenActivity(customer) {
    navigate(`/reports?report=customer_activity&customer_id=${customer.id}`);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitLoading(true);
      setError("");
      setSuccessMessage("");

      const payload = normalizeForm(form);

      if (!payload.business_name) {
        setError("Le nom du client est obligatoire.");
        return;
      }

      if (editingCustomerId) {
        await api.put(`/customers/${editingCustomerId}`, payload);
        setSuccessMessage("Client mis à jour avec succès.");
      } else {
        await api.post("/customers", payload);
        setSuccessMessage("Client créé avec succès.");
      }

      resetForm();
      await fetchCustomers();
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      const apiErrors = err?.response?.data?.errors;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(apiErrors.join(" "));
      } else {
        setError(apiMessage || "Erreur lors de l’enregistrement du client.");
      }
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleDelete(customer) {
    const confirmed = window.confirm(
      `Supprimer le client "${customer.business_name}" ?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccessMessage("");

      await api.delete(`/customers/${customer.id}`);
      setSuccessMessage("Client supprimé avec succès.");

      if (editingCustomerId === customer.id) {
        resetForm();
      }

      await fetchCustomers();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de supprimer ce client."
      );
    }
  }

  function toggleCustomerSelection(customerId) {
    setSelectedCustomerIds((prev) =>
      prev.includes(customerId)
        ? prev.filter((value) => value !== customerId)
        : [...prev, customerId]
    );
  }

  function handleSelectAllFiltered() {
    setSelectedCustomerIds(filteredCustomers.map((customer) => customer.id));
  }

  function handleClearSelection() {
    setSelectedCustomerIds([]);
  }

  async function handleBulkCommercialAssign() {
    if (selectedCustomerIds.length === 0) {
      setError("Selectionne au moins un client pour l'affectation commerciale.");
      return;
    }

    try {
      setBulkLoading(true);
      setError("");
      setSuccessMessage("");

      await api.put("/customers/bulk-commercial", {
        customer_ids: selectedCustomerIds,
        commercial_name: bulkCommercialName.trim()
      });

      setSuccessMessage("Affectation commerciale mise a jour en lot.");
      setSelectedCustomerIds([]);
      await fetchCustomers();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de mettre a jour le commercial en lot."
      );
    } finally {
      setBulkLoading(false);
    }
  }

  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return customers.filter((customer) => {
      if (
        onlyMissingCommercial &&
        String(customer.commercial_name || "").trim() !== ""
      ) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return (
      [
        customer.business_name,
        customer.contact_name,
        customer.phone,
        customer.email,
        customer.city,
        customer.chain_name,
        customer.sales_channel,
        customer.commercial_name,
        customer.address,
        customer.customer_type
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
      );
    });
  }, [customers, onlyMissingCommercial, search]);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Clients"
        subtitle="Gestion des clients, supermarchés, pharmacies et points de vente"
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

      <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
        <div className="mb-5 text-lg font-semibold text-slate-900">
          {editingCustomerId ? "Modifier le client" : "Créer un client"}
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Type de client
            </label>
            <select
              name="customer_type"
              value={form.customer_type}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              <option value="retail">Retail</option>
              <option value="supermarket">Supermarché</option>
              <option value="pharmacy">Pharmacie</option>
              <option value="distributor">Distributeur</option>
              <option value="wholesale">Grossiste</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Nom du client *
            </label>
            <input
              name="business_name"
              value={form.business_name}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Ex: GG Mart Lemba"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Contact
            </label>
            <input
              name="contact_name"
              value={form.contact_name}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Responsable achat"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Téléphone
            </label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="+243..."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="client@email.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Ville
            </label>
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Kinshasa"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Chaine / reseau
            </label>
            <input
              name="chain_name"
              value={form.chain_name}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Ex: GG MART, CARREFOUR, SWISSMART"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Canal commercial
            </label>
            <select
              name="sales_channel"
              value={form.sales_channel}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            >
              <option value="">Deduction automatique</option>
              <option value="Supermarches">Supermarches</option>
              <option value="Pharmacies">Pharmacies</option>
              <option value="Distribution B2B">Distribution B2B</option>
              <option value="Vente directe">Vente directe</option>
              <option value="Livraison">Livraison</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Site web">Site web</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Commercial responsable
            </label>
            <input
              name="commercial_name"
              value={form.commercial_name}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Ex: Emmanuel / Equipe Kin"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Délai de paiement (jours)
            </label>
            <input
              name="payment_terms_days"
              type="number"
              min="0"
              value={form.payment_terms_days}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="7"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Limite de crédit
            </label>
            <input
              name="credit_limit"
              type="number"
              min="0"
              step="0.01"
              value={form.credit_limit}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="1000"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700">
              <input
                name="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={handleChange}
              />
              Client actif
            </label>
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Adresse
            </label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              rows="3"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Adresse du client"
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows="3"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
              placeholder="Notes internes"
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitLoading}
              className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitLoading
                ? "Enregistrement..."
                : editingCustomerId
                ? "Mettre à jour"
                : "Créer le client"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Réinitialiser
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-100">
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-800">
            Affectation commerciale en lot
          </div>
          <div className="mt-1 text-sm text-amber-700">
            Renseigne progressivement le commercial responsable sur les clients selectionnes pour fiabiliser l'etat Ventes par commercial.
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-end">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Commercial responsable
              </label>
              <input
                value={bulkCommercialName}
                onChange={(event) => setBulkCommercialName(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
                placeholder="Ex: Emmanuel / Equipe Kin"
              />
            </div>
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Tout selectionner
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Vider
            </button>
            <button
              type="button"
              onClick={handleBulkCommercialAssign}
              disabled={bulkLoading}
              className="rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {bulkLoading ? "Affectation..." : `Affecter (${selectedCustomerIds.length})`}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="text-lg font-semibold text-slate-900">
            Liste des clients
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
            <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={onlyMissingCommercial}
                onChange={(event) => setOnlyMissingCommercial(event.target.checked)}
              />
              Voir seulement les clients sans commercial
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un client..."
              className="w-full md:w-80 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Chargement des clients...
            </div>
          ) : (
            <TableCard
              title={`Clients (${filteredCustomers.length})`}
              rows={filteredCustomers}
              emptyText="Aucun client trouvé"
              columns={[
                {
                  key: "select",
                  label: "Sel.",
                  render: (row) => (
                    <input
                      type="checkbox"
                      checked={selectedCustomerIds.includes(row.id)}
                      onChange={() => toggleCustomerSelection(row.id)}
                    />
                  )
                },
                { key: "business_name", label: "Client" },
                { key: "customer_type", label: "Type" },
                { key: "commercial_name", label: "Commercial" },
                { key: "chain_name", label: "Chaine" },
                { key: "sales_channel", label: "Canal" },
                { key: "city", label: "Ville" },
                {
                  key: "credit_limit",
                  label: "Crédit",
                  render: (row) => formatMoney(row.credit_limit)
                },
                {
                  key: "is_active",
                  label: "Statut",
                  render: (row) => (
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        row.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {row.is_active ? "Actif" : "Inactif"}
                    </span>
                  )
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenAccount(row)}
                        className="rounded-xl border border-brand-300 px-3 py-2 text-xs font-semibold text-brand-700"
                      >
                        Compte courant
                      </button>
                      <button
                        onClick={() => handleOpenActivity(row)}
                        className="rounded-xl border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-700"
                      >
                        Activite
                      </button>
                      <button
                        onClick={() => handleEdit(row)}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(row)}
                        className="rounded-xl border border-red-300 px-3 py-2 text-xs font-semibold text-red-700"
                      >
                        Supprimer
                      </button>
                    </div>
                  )
                }
              ]}
            />
          )}
        </div>
      </div>
    </div>
  );
}
