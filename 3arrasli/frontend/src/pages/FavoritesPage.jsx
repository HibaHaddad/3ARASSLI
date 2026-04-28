import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import ClientPageLayout from "./client/ClientPageLayout";
import ServiceCard from "./client/ServiceCard";

const FavoritesPage = () => {
  const navigate = useNavigate();
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
    <ClientPageLayout
      kicker="Favoris"
      title="Vos coups de coeur mariage."
      description="Retrouvez les prestataires qui ont retenu votre attention, comparez et ouvrez leur fiche dans une page dediee."
    >
      <section className="client-section">
        <div className="client-shell">
          {message ? <p className="client-message">{message}</p> : null}
          {error ? <p className="client-error">{error}</p> : null}

          <div className="client-service-grid">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={{ ...service, is_favorite: true }}
                onOpen={(selectedService) => navigate(`/client/provider/${selectedService.id}`)}
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
    </ClientPageLayout>
  );
};

export default FavoritesPage;
