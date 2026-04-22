import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { resolveAssetUrl } from "../../services/assets";

const ServiceModal = ({ service, onClose, onFavorite, onReserved }) => {
  const [booking, setBooking] = useState({ date: "", notes: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!service) {
      document.body.classList.remove("client-modal-open");
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.classList.add("client-modal-open");
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.classList.remove("client-modal-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, service]);

  if (!service) {
    return null;
  }

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
      onReserved?.();
    } catch (err) {
      setError(err.response?.data?.message || "Reservation impossible.");
    }
  };

  return (
    <div className="client-modal-overlay" role="presentation" onMouseDown={onClose}>
      <article
        className="client-service-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-service-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="client-modal-close" aria-label="Fermer" onClick={onClose}>
          x
        </button>

        <div className="client-modal-media">
          <img src={resolveAssetUrl(service.image)} alt={service.title} />
        </div>

        <div className="client-modal-content">
          <span className="section-kicker">Fiche service</span>
          <h2 id="client-service-modal-title">{service.title}</h2>
          <div className="client-detail-price">{service.price} TND</div>
          <p>{service.description}</p>

          <dl className="client-detail-list">
            <div>
              <dt>Categorie</dt>
              <dd>{service.type}</dd>
            </div>
            <div>
              <dt>Ville</dt>
              <dd>{service.city || "Tunisie"}</dd>
            </div>
            <div>
              <dt>Prestataire</dt>
              <dd>{service.prestataire_name || "Prestataire verifie"}</dd>
            </div>
            <div>
              <dt>Note</dt>
              <dd>{service.rating || "4.8"}</dd>
            </div>
          </dl>

          <div className="client-detail-actions">
            <button type="button" className="client-btn client-btn-soft" onClick={() => onFavorite(service)}>
              {service.is_favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            </button>
            <Link className="client-btn client-btn-ghost" to="/client/chat">
              Contacter
            </Link>
          </div>

          <div className="client-booking-box">
            <h3>Reserver ce service</h3>
            {message ? <p className="client-message">{message}</p> : null}
            {error ? <p className="client-error">{error}</p> : null}
            <div className="client-booking-fields">
              <input
                type="date"
                value={booking.date}
                onChange={(event) => setBooking((prev) => ({ ...prev, date: event.target.value }))}
              />
              <input value={`${service.price} TND`} readOnly />
            </div>
            <textarea
              placeholder="Notes pour le prestataire"
              value={booking.notes}
              onChange={(event) => setBooking((prev) => ({ ...prev, notes: event.target.value }))}
            />
            <button type="button" className="client-btn client-btn-primary" onClick={createReservation}>
              Confirmer la reservation
            </button>
          </div>
        </div>
      </article>
    </div>
  );
};

export default ServiceModal;
