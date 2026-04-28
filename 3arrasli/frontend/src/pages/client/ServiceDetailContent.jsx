import React from "react";
import { Link } from "react-router-dom";
import { resolveAssetUrl } from "../../services/assets";

const ServiceDetailContent = ({
  service,
  booking,
  error,
  message,
  onBookingChange,
  onCreateReservation,
  onFavorite,
}) => (
  <>
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
        <Link className="client-btn client-btn-ghost" to={`/client/chat?provider=${service.prestataire_id}`}>
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
            onChange={(event) => onBookingChange("date", event.target.value)}
          />
          <input value={`${service.price} TND`} readOnly />
        </div>
        <textarea
          placeholder="Notes pour le prestataire"
          value={booking.notes}
          onChange={(event) => onBookingChange("notes", event.target.value)}
        />
        <button type="button" className="client-btn client-btn-primary" onClick={onCreateReservation}>
          Confirmer la reservation
        </button>
      </div>
    </div>
  </>
);

export default ServiceDetailContent;
