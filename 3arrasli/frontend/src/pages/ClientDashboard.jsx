import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";
import { getStoredUser } from "../services/auth";
import { showToast } from "../services/toast";
import "../Home.css";
import "./client.css";
import ServiceCard from "./client/ServiceCard";
import { cities, emptyFilters, serviceTypes, toSearchQuery } from "./client/clientData";

const ClientDashboard = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const firstName = user?.name?.split(" ")?.[0] || "Bienvenue";

  const [filters, setFilters] = useState(emptyFilters);
  const [services, setServices] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadServices = async () => {
    try {
      const response = await api.get("/api/services");
      setServices(response.data.services || []);
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de charger les services.");
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    if (message) {
      showToast("success", message);
    }
  }, [message]);

  useEffect(() => {
    if (error) {
      showToast("error", error);
    }
  }, [error]);

  const onFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const query = toSearchQuery(filters);
    navigate(query ? `/client/search?${query}` : "/client/search");
  };

  const toggleFavorite = async (service) => {
    setError("");
    setMessage("");
    try {
      if (service.is_favorite && service.favorite_id) {
        await api.delete(`/api/favorites/${service.favorite_id}`);
        setServices((current) =>
          current.map((item) =>
            item.id === service.id ? { ...item, is_favorite: false, favorite_id: null } : item
          )
        );
        setMessage("Service retire de vos favoris.");
      } else {
        const response = await api.post("/api/favorites", { service_id: service.id });
        setServices((current) =>
          current.map((item) =>
            item.id === service.id
              ? { ...item, is_favorite: true, favorite_id: response.data.favorite?.id }
              : item
          )
        );
        setMessage("Service ajoute a vos favoris.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Action favoris impossible.");
    }
  };

  return (
    <div className="client-page client-experience">
      <Navbar />

      <main>
        <section className="client-hero">
          <div className="client-hero-backdrop" />
          <div className="client-hero-layer" />

          <div className="client-shell">
            <div className="client-hero-grid">
              <div className="client-hero-copy">
                <span className="hero-pill">Votre mariage, version premium</span>
                <h1>{firstName}, imaginez votre celebration avec les bons prestataires.</h1>
                <p>
                  Une experience connectee qui garde le charme de la Home publique : recherche,
                  inspirations, favoris, conversations et organisation dans une vraie navigation de
                  site mariage.
                </p>

                <div className="client-hero-actions">
                  <Link className="client-btn client-btn-primary" to="/client/search">
                    Explorer les prestataires
                  </Link>
                  <Link className="client-btn client-btn-soft" to="/client/packs">
                    Voir les packs
                  </Link>
                  <Link className="client-btn client-btn-soft" to="/client/reservations">
                    Mes reservations
                  </Link>
                </div>
              </div>

            </div>

            <form className="client-search-card" onSubmit={submitSearch}>
              <div className="client-search-heading">
                <span className="section-kicker">Recherche avancee</span>
                <h2>Lancez votre recherche et ouvrez une vraie page de resultats.</h2>
              </div>

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
                </div>
              </div>
            </form>
          </div>
        </section>

        <section className="client-section">
          <div className="client-shell">
            <div className="client-section-head">
              <div>
                <span className="section-kicker">A decouvrir</span>
                <h2 className="client-dashboard-intro-title">Quelques prestataires pour commencer votre selection.</h2>
              </div>
            
            </div>

            <div className="client-service-grid">
              {services.slice(0, 3).map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onOpen={(selectedService) => navigate(`/client/provider/${selectedService.id}`)}
                  onFavorite={toggleFavorite}
                />
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ClientDashboard;
