import React from "react";

const formatBookingDate = (date) =>
  new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });

const getStatusClass = (status = "") => status.replace(/\s/g, "").toLowerCase();

const ProviderBookingRequestStrip = ({
  reservations,
  selectedReservationId,
  loadingBookings = false,
  reservationFilter,
  searchTerm,
  onSelectReservation,
  className = "",
}) => {
  const hasFilters = reservationFilter !== "Tous" || searchTerm.trim().length > 0;

  return (
    <section className={`provider-sidebar-requests ${className}`}>
      <div className="provider-sidebar-requests-divider" />
      <div className="provider-bookings-strip-title">
        <span>🌸</span>
        <div>
          <small>Carnet secondaire</small>
          <strong>Carnet des demandes</strong>
        </div>
      </div>

      <div className="provider-bookings-request-strip">
        {loadingBookings ? (
          <div className="provider-empty-state provider-booking-empty">
            <span className="provider-booking-empty-icon">🕯️</span>
            <strong>Chargement...</strong>
            <p>Demandes en cours de recuperation.</p>
          </div>
        ) : null}

        {!loadingBookings && reservations.length === 0 ? (
          <div className="provider-empty-state provider-booking-empty">
            <span className="provider-booking-empty-icon">{hasFilters ? "🌸" : "🤍"}</span>
            <strong>{hasFilters ? "Aucun resultat" : "Aucune demande"}</strong>
            <p>{hasFilters ? "Changez le filtre ou la recherche." : "Les demandes apparaitront ici."}</p>
          </div>
        ) : null}

        {!loadingBookings &&
          reservations.map((booking, index) => (
            <button
              key={booking.id}
              type="button"
              className={`provider-booking-card provider-booking-note note-${index % 3} ${
                selectedReservationId === booking.id ? "active" : ""
              }`}
              onClick={() => onSelectReservation(booking.id)}
            >
              <span className="provider-booking-note-number">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{booking.client}</strong>
                <small>{booking.service}</small>
              </div>
              <span className={`provider-status ${getStatusClass(booking.status)}`}>
                {booking.status}
              </span>
              <p>
                {formatBookingDate(booking.date)} · {booking.time || "--"} · {booking.location}
              </p>
            </button>
          ))}
      </div>
    </section>
  );
};

export default ProviderBookingRequestStrip;
