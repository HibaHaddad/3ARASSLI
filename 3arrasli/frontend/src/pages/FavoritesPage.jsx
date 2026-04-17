import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";
import "../Home.css";
import "./client.css";

const FavoritesPage = () => {
  const [services, setServices] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const response = await api.get("/api/favorites");
      setServices(response.data.services || []);
      setFavorites(response.data.favorites || []);
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de charger les favoris.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const removeFavorite = async (service) => {
    const fav = favorites.find((item) => item.prestataire_id === service.prestataire_id);
    if (!fav) {
      return;
    }
    try {
      await api.delete(`/api/favorites/${fav.favorite_id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Suppression impossible.");
    }
  };

  return (
    <div className="client-page">
      <Navbar />
      <div className="client-shell client-top">
        <div className="client-panel">
          <h2>Favorites</h2>
          <p>Vos prestataires favoris.</p>
          <div className="client-actions">
            <Link className="client-btn client-btn-soft" to="/client-dashboard">
              Retour dashboard
            </Link>
          </div>
          {error ? <p className="client-error">{error}</p> : null}
        </div>

        <div className="client-panel">
          <div className="services-grid">
            {services.map((service) => (
              <article key={service.id} className="service-card client-service-card">
                <div className="service-media">
                  <img src={service.image} alt={service.title} />
                  <div className="service-media-overlay" />
                </div>
                <div className="service-body">
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <div className="client-actions">
                    <button type="button" className="client-btn client-btn-soft" onClick={() => removeFavorite(service)}>
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FavoritesPage;
