import React from "react";
import { resolveAssetUrl } from "../services/assets";

const ServiceCard = ({ service }) => {
  const serviceCategory = service.category || service.type || "Service mariage";
  const serviceDescription =
    service.description || "Prestataire recommande selon les meilleures notes clients.";

  return (
    <article className="service-card carousel-service-card">
      <div className="service-media">
        <img src={resolveAssetUrl(service.image)} alt={service.title} />
        <div className="service-media-overlay" />
        <div className="service-badges">
          <span className="service-badge">Selection premium</span>
          <span className="service-score">Note {service.rating}</span>
        </div>
      </div>

      <div className="service-body">
        <div className="service-topline">
          <span className="service-category">{serviceCategory}</span>
          <span className="service-price">{service.price}</span>
        </div>
        <h3>{service.title}</h3>
        <p>{serviceDescription}</p>
        <div className="service-footer">
          <span className="service-detail">Disponibilite rapide</span>
          <button type="button">Decouvrir</button>
        </div>
      </div>
    </article>
  );
};

export default ServiceCard;
