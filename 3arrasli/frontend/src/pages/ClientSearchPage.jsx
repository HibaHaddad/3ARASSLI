import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import ClientPageLayout from "./client/ClientPageLayout";
import ServiceCard from "./client/ServiceCard";
import {
  buildServiceParams,
  cities,
  getFiltersFromSearch,
  serviceTypes,
  toSearchQuery,
} from "./client/clientData";

const ClientSearchPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => getFiltersFromSearch(searchParams));
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadServices = async (nextFilters = filters) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/services", { params: buildServiceParams(nextFilters) });
      setServices(response.data.services || []);
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de charger les services.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const nextFilters = getFiltersFromSearch(searchParams);
    setFilters(nextFilters);
    loadServices(nextFilters);
  }, [searchParams]);

  const onFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setSearchParams(toSearchQuery(filters));
  };

  const resetSearch = () => {
    setFilters({ q: "", city: "", budget: "", min_price: "", max_price: "", type: "" });
    setSearchParams("");
  };

  const toggleFavorite = async (service) => {
    setError("");
    setMessage("");
    try {
      if (service.is_favorite && service.favorite_id) {
        await api.delete(`/api/favorites/${service.favorite_id}`);
        setMessage("Prestataire retire de vos favoris.");
      } else {
        await api.post("/api/favorites", { prestataire_id: service.prestataire_id });
        setMessage("Prestataire ajoute a vos favoris.");
      }
      await loadServices(filters);
    } catch (err) {
      setError(err.response?.data?.message || "Action favoris impossible.");
    }
  };

  return (
    <ClientPageLayout
      kicker="Marketplace mariage"
      title="Recherchez les prestataires qui correspondent a votre journee."
      description="Filtrez par ville, budget et type de service, puis ouvrez chaque fiche dans sa page dediee."
    >
      <section className="client-section client-search-top-section">
        <div className="client-shell">
          <form className="client-search-card" onSubmit={submitSearch}>
            <div className="client-search-fields">
              <label className="client-field">
                <span>Nom / Service</span>
                <input
                  type="text"
                  name="q"
                  value={filters.q}
                  onChange={onFilterChange}
                  placeholder="Ex: Studio Lumiere, Photographe..."
                />
              </label>

              <label className="client-field">
                <span>Ville</span>
                <select name="city" value={filters.city} onChange={onFilterChange}>
                  <option value="">Toutes les villes</option>
                  {cities.map((city) => (
                    <option key={city} value={city.toLowerCase()}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>

              <label className="client-field">
                <span>Budget</span>
                <select name="budget" value={filters.budget} onChange={onFilterChange}>
                  <option value="">Tous budgets</option>
                  <option value="less1000">Moins de 1000 TND</option>
                  <option value="from1000to3000">1000 - 3000 TND</option>
                  <option value="from3000to5000">3000 - 5000 TND</option>
                  <option value="plus5000">Plus de 5000 TND</option>
                </select>
              </label>

              <label className="client-field">
                <span>Type</span>
                <select name="type" value={filters.type} onChange={onFilterChange}>
                  <option value="">Tous les services</option>
                  {serviceTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="client-search-actions">
                <button type="submit" className="client-btn client-btn-primary">
                  Rechercher
                </button>
                <button type="button" className="client-btn client-btn-ghost" onClick={resetSearch}>
                  Reinitialiser
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      <section className="client-section client-search-results-section">
        <div className="client-shell">
          {message ? <p className="client-message">{message}</p> : null}
          {error ? <p className="client-error">{error}</p> : null}

          <div className="client-section-head">
            <div>
              <span className="section-kicker">Resultats</span>
              <h2>{services.length} service(s) disponible(s)</h2>
            </div>
           
          </div>

          {loading ? <p className="client-loading">Chargement des prestataires...</p> : null}

          <div className="client-service-grid client-search-service-grid">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onOpen={(selectedService) => navigate(`/client/provider/${selectedService.id}`)}
                onFavorite={toggleFavorite}
              />
            ))}
          </div>

          {!loading && services.length === 0 ? (
            <div className="client-empty-state">
              <h3>Aucun service trouve.</h3>
              <p>Essayez une autre ville, un budget plus large ou une autre categorie.</p>
            </div>
          ) : null}
        </div>
      </section>
    </ClientPageLayout>
  );
};

export default ClientSearchPage;
