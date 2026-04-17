import React from "react";

const ServiceCard = ({ service }) => {
  return (
    <article className="service-card carousel-service-card">
      <div className="service-media">
        <img src={service.image} alt={service.title} />
        <div className="service-media-overlay" />
        <div className="service-badges">
          <span className="service-badge">Selection premium</span>
          <span className="service-score">Note {service.rating}</span>
        </div>
      </div>

      <div className="service-body">
        <div className="service-topline">
          <span className="service-category">Luxe wedding</span>
          <span className="service-price">{service.price}</span>
        </div>
        <h3>{service.title}</h3>
        <p>
          Une presentation plus haut de gamme avec plus de profondeur, de douceur et un hover
          pense comme une experience premium.
        </p>
        <div className="service-footer">
          <span className="service-detail">Disponibilite rapide</span>
          <button type="button">Decouvrir</button>
        </div>
      </div>
    </article>
  );
};

export default ServiceCard;
