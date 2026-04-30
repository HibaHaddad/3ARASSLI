import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { showToast } from "../services/toast";
import ClientPageLayout from "./client/ClientPageLayout";
import ServiceCard from "./client/ServiceCard";
import {
  buildServiceParams,
  cities,
  getFiltersFromSearch,
  serviceTypes,
  toSearchQuery,
} from "./client/clientData";

const SERVICES_PER_PAGE = 9;

const ClientSearchPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => getFiltersFromSearch(searchParams));
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const loadServices = async (nextFilters = filters) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/providers", { params: buildServiceParams(nextFilters) });
      setProviders(response.data.providers || []);
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de charger les services.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const nextFilters = getFiltersFromSearch(searchParams);
    setFilters(nextFilters);
    setCurrentPage(1);
    loadServices(nextFilters);
  }, [searchParams]);

  useEffect(() => {
    if (error) {
      showToast("error", error);
    }
  }, [error]);

  const totalPages = Math.max(Math.ceil(providers.length / SERVICES_PER_PAGE), 1);
  const paginatedServices = useMemo(() => {
    const startIndex = (currentPage - 1) * SERVICES_PER_PAGE;
    return providers.slice(startIndex, startIndex + SERVICES_PER_PAGE);
  }, [currentPage, providers]);
  const pageNumbers = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index + 1),
    [totalPages]
  );
  const firstResultIndex = providers.length === 0 ? 0 : (currentPage - 1) * SERVICES_PER_PAGE + 1;
  const lastResultIndex = Math.min(currentPage * SERVICES_PER_PAGE, providers.length);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const onFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setSearchParams(toSearchQuery(filters));
  };

  const resetSearch = () => {
    setFilters({ q: "", city: "", budget: "", min_price: "", max_price: "", type: "", provider_id: "" });
    setSearchParams("");
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
          <div className="client-section-head">
            <div>
              <span className="section-kicker">Resultats</span>
              <h2>{providers.length} prestataire(s) disponible(s)</h2>
            </div>
            {providers.length > 0 ? (
              <p>
                Affichage {firstResultIndex} - {lastResultIndex} sur {providers.length}
              </p>
            ) : null}
          </div>

          {loading ? <p className="client-loading">Chargement des prestataires...</p> : null}

          <div className="client-service-grid client-search-service-grid">
            {paginatedServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                cardType="provider"
                onOpen={(selectedProvider) => navigate(`/client/provider/${selectedProvider.id}`)}
              />
            ))}
          </div>

          {!loading && providers.length > SERVICES_PER_PAGE ? (
            <nav className="client-search-pagination" aria-label="Pagination des services">
              <button
                type="button"
                className="client-pagination-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              >
                Precedent
              </button>

              <div className="client-pagination-pages">
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={`client-pagination-page ${page === currentPage ? "active" : ""}`}
                    onClick={() => setCurrentPage(page)}
                    aria-current={page === currentPage ? "page" : undefined}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="client-pagination-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
              >
                Suivant
              </button>
            </nav>
          ) : null}

          {!loading && providers.length === 0 ? (
            <div className="client-empty-state">
              <h3>Aucun prestataire trouve.</h3>
              <p>Essayez une autre ville, un budget plus large ou une autre categorie.</p>
            </div>
          ) : null}
        </div>
      </section>
    </ClientPageLayout>
  );
};

export default ClientSearchPage;
