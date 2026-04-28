import React, { useEffect, useState } from "react";
import api from "../../services/api";
import ServiceDetailContent from "./ServiceDetailContent";

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

        <ServiceDetailContent
          service={service}
          booking={booking}
          error={error}
          message={message}
          onBookingChange={(field, value) => setBooking((prev) => ({ ...prev, [field]: value }))}
          onCreateReservation={createReservation}
          onFavorite={onFavorite}
        />
      </article>
    </div>
  );
};

export default ServiceModal;
