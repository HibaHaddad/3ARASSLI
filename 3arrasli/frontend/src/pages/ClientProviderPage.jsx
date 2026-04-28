import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import ClientPageLayout from "./client/ClientPageLayout";
import ServiceDetailContent from "./client/ServiceDetailContent";

const ClientProviderPage = () => {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [booking, setBooking] = useState({ date: "", notes: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadService = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/api/services/${id}`);
      setService(response.data.service || null);
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de charger cette fiche.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadService();
  }, [id]);

  const onBookingChange = (field, value) => {
    setBooking((prev) => ({ ...prev, [field]: value }));
  };

  const toggleFavorite = async (currentService) => {
    setError("");
    setMessage("");
    try {
      if (currentService.is_favorite && currentService.favorite_id) {
        await api.delete(`/api/favorites/${currentService.favorite_id}`);
        setMessage("Prestataire retire de vos favoris.");
      } else {
        await api.post("/api/favorites", { prestataire_id: currentService.prestataire_id });
        setMessage("Prestataire ajoute a vos favoris.");
      }
      await loadService();
    } catch (err) {
      setError(err.response?.data?.message || "Action favoris impossible.");
    }
  };

  const createReservation = async () => {
    if (!booking.date) {
      setError("Choisissez une date pour reserver ce service.");
      return;
    }

    try {
      await api.post("/api/reservations", {
        service_id: Number(service.id),
        date: booking.date,
        notes: booking.notes,
      });
      setError("");
      setMessage("Reservation enregistree. Vous pouvez la retrouver dans vos reservations.");
      setBooking({ date: "", notes: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Reservation impossible.");
    }
  };

  return (
    <ClientPageLayout
      kicker="Fiche prestataire"
      title={service?.title || "Decouvrez ce prestataire"}
      description="La fiche detaillee reprend la meme experience visuelle, maintenant dans une vraie page dediee."
    >
      <section className="client-section">
        <div className="client-shell">
          {loading ? <p className="client-loading">Chargement de la fiche...</p> : null}
          {!loading && error && !service ? <p className="client-error">{error}</p> : null}

          {!loading && !service ? (
            <div className="client-empty-state">
              <h3>Fiche indisponible.</h3>
              <p>Ce service n'existe plus ou n'est pas accessible pour le moment.</p>
              <Link className="client-btn client-btn-primary" to="/client/search">
                Retour a la recherche
              </Link>
            </div>
          ) : null}

          {service ? (
            <article
              className="client-service-modal client-service-page-card"
              role="dialog"
              aria-modal="false"
              aria-labelledby="client-service-modal-title"
            >
              <ServiceDetailContent
                service={service}
                booking={booking}
                error={error}
                message={message}
                onBookingChange={onBookingChange}
                onCreateReservation={createReservation}
                onFavorite={toggleFavorite}
              />
            </article>
          ) : null}
        </div>
      </section>
    </ClientPageLayout>
  );
};

export default ClientProviderPage;
