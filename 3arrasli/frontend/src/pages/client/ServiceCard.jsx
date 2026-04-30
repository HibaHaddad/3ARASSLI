import React from "react";
import { resolveAssetUrl } from "../../services/assets";

const ServiceCard = ({ service, onOpen, onFavorite, cardType = "service" }) => {
  const isProviderCard = cardType === "provider";
  const imageSrc = resolveAssetUrl(isProviderCard ? service.image : service.image);
  const title = isProviderCard ? service.name : service.title;
  const subtitle = isProviderCard ? service.service_type : service.type;
  const description = isProviderCard ? service.short_description : service.description;
  const location = service.city || "Tunisie";

  return (
    <article className={`client-service-card ${isProviderCard ? "client-provider-search-card" : ""}`}>
      <button type="button" className="client-service-image" onClick={() => onOpen(service)}>
        <img src={imageSrc} alt={title} />
        <span>{location}</span>
      </button>

      <div className="client-service-content">
        <div className="client-service-meta">
          <span>{subtitle}</span>
          {isProviderCard ? <strong>{service.service_count || 0} service(s)</strong> : <strong>{service.price} TND</strong>}
        </div>
        <h3>{title}</h3>
        <p>{description}</p>
        <div className="client-service-footer">
          {isProviderCard ? <span>{service.service_types?.slice(0, 2).join(" • ") || subtitle}</span> : <span>Note {service.rating || "4.8"}</span>}
          {!isProviderCard && onFavorite ? (
            <button
              type="button"
              onClick={() => onFavorite(service)}
              aria-label={service.is_favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              title={service.is_favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              {service.is_favorite ? "\u2665" : "\u2661"}
            </button>
          ) : null}
        </div>
        <button type="button" className="client-card-action" onClick={() => onOpen(service)}>
          {isProviderCard ? "Voir le prestataire" : "Voir la fiche"}
        </button>
      </div>
    </article>
  );
};

export default ServiceCard;
