import React from "react";
import { resolveAssetUrl } from "../../services/assets";

const ServiceCard = ({ service, onOpen, onFavorite }) => (
  <article className="client-service-card">
    <button type="button" className="client-service-image" onClick={() => onOpen(service)}>
      <img src={resolveAssetUrl(service.image)} alt={service.title} />
      <span>{service.city || "Tunisie"}</span>
    </button>

    <div className="client-service-content">
      <div className="client-service-meta">
        <span>{service.type}</span>
        <strong>{service.price} TND</strong>
      </div>
      <h3>{service.title}</h3>
      <p>{service.description}</p>
      <div className="client-service-footer">
        <span>Note {service.rating || "4.8"}</span>
        <button
          type="button"
          onClick={() => onFavorite(service)}
          aria-label={service.is_favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          title={service.is_favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          {service.is_favorite ? "\u2665" : "\u2661"}
        </button>
      </div>
      <button type="button" className="client-card-action" onClick={() => onOpen(service)}>
        Voir la fiche
      </button>
    </div>
  </article>
);

export default ServiceCard;
