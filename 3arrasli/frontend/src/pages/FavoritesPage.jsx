import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api from "../services/api";
import "../Home.css";
import "./client.css";
import ClientNav from "./client/ClientNav";
import ServiceCard from "./client/ServiceCard";
import ServiceModal from "./client/ServiceModal";

const FavoritesPage = () => {
  const [services, setServices] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
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
      <main className="client-page-main">
        <section className="client-page-hero compact">
          <div className="client-shell">
            <ClientNav />
            <div className="client-page-heading">
              <span className="section-kicker">Favoris</span>
              <h1>Vos coups de coeur mariage.</h1>
              <p>Retrouvez les prestataires qui ont retenu votre attention, comparez et ouvrez leur fiche en pop-up.</p>
            </div>
          </div>
        </section>

        <section className="client-section">
          <div className="client-shell">
            {message ? <p className="client-message">{message}</p> : null}
            {error ? <p className="client-error">{error}</p> : null}

            <div className="client-service-grid">
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={{ ...service, is_favorite: true }}
                  onOpen={setSelectedService}
                  onFavorite={removeFavorite}
                />
              ))}
            </div>

            {services.length === 0 ? (
              <div className="client-empty-state">
                <h3>Aucun favori pour le moment.</h3>
                <p>Ajoutez des prestataires depuis la page de recherche pour les retrouver ici.</p>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <ServiceModal
        service={selectedService}
        onClose={() => setSelectedService(null)}
        onFavorite={removeFavorite}
        onReserved={load}
      />
    </div>
  );
};

export default FavoritesPage;
