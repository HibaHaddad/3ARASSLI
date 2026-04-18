import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";
import { resolveAssetUrl } from "../services/assets";
import "../Home.css";
import "./client.css";

const FavoritesPage = () => {
  const [services, setServices] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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
      setMessage("Prestataire retire des favoris.");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Suppression impossible.");
    }
  };

  return (
    <div className="client-page">
      <Navbar />
      <main className="client-main">
        <section className="client-shell">
          <aside className="client-sidebar">
            <div className="client-sidebar-brand">
              <p className="client-eyebrow">Client</p>
              <h1>Favoris</h1>
              <span>Retrouvez vos prestataires preferes dans une vue elegante.</span>
            </div>

            <nav className="client-sidebar-nav">
              <Link className="client-sidebar-link" to="/client-dashboard">
                <strong>Dashboard</strong>
                <small>Recherche, services, reservation</small>
              </Link>
              <Link className="client-sidebar-link active" to="/favorites">
                <strong>Favoris</strong>
                <small>Prestataires sauvegardes</small>
              </Link>
              <Link className="client-sidebar-link" to="/planner">
                <strong>Planner</strong>
                <small>Checklist mariage</small>
              </Link>
              <Link className="client-sidebar-link" to="/chat">
                <strong>Chat</strong>
                <small>Conversation en direct</small>
              </Link>
            </nav>
          </aside>

          <section className="client-content">
            <header className="client-content-header">
              <div>
                <p className="client-section-label">Espace favoris</p>
                <h2>Vos selections de confiance</h2>
                <p>Chaque prestataire enregistre reste accessible ici pour une reprise rapide.</p>
              </div>
            </header>

            {message ? <p className="client-message">{message}</p> : null}
            {error ? <p className="client-error">{error}</p> : null}

            <div className="client-grid">
              <section className="client-panel">
                <h2>Mes prestataires favoris</h2>
                {services.length === 0 ? <p>Aucun favori pour le moment.</p> : null}
                <div className="services-grid">
                  {services.map((service) => (
                    <article key={service.id} className="service-card client-service-card">
                      <div className="service-media">
                        <img src={resolveAssetUrl(service.image)} alt={service.title} />
                        <div className="service-media-overlay" />
                      </div>
                      <div className="service-body">
                        <h3>{service.title}</h3>
                        <p>{service.description}</p>
                        <div className="client-actions">
                          <button type="button" className="client-btn client-btn-soft" onClick={() => removeFavorite(service)}>
                            Retirer
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
};

export default FavoritesPage;
