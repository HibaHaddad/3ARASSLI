import React from "react";

const reservationFilters = ["Tous", "En attente", "Validee", "Refusee"];

const ProviderBookings = ({
  reservationFilter,
  onFilterChange,
  searchTerm,
  onSearchChange,
  reservations,
  selectedReservation,
  selectedReservationId,
  onSelectReservation,
  onUpdateStatus,
}) => {
  return (
    <div className="provider-stack">
      <article className="provider-panel">
        <div className="provider-panel-head provider-panel-head-inline">
          <div>
            <h3>Reservations</h3>
            <p>Suivez vos demandes, acceptez-les ou refusez-les avec une vue claire.</p>
          </div>

          <div className="provider-filter-row">
            {reservationFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`provider-filter-chip ${reservationFilter === filter ? "active" : ""}`}
                onClick={() => onFilterChange(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="provider-search-row">
          <input
            type="text"
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Rechercher par client, service ou lieu..."
          />
        </div>

        <div className="provider-bookings-layout">
          <div className="provider-booking-list">
            {reservations.map((booking) => (
              <button
                key={booking.id}
                type="button"
                className={`provider-booking-card ${selectedReservationId === booking.id ? "active" : ""}`}
                onClick={() => onSelectReservation(booking.id)}
              >
                <div className="provider-booking-topline">
                  <strong>{booking.client}</strong>
                  <span className={`provider-status ${booking.status.replace(/\s/g, "").toLowerCase()}`}>
                    {booking.status}
                  </span>
                </div>
                <p>{booking.service}</p>
                <div className="provider-booking-meta">
                  <span>
                    {new Date(booking.date).toLocaleDateString("fr-FR")} - {booking.time}
                  </span>
                  <span>{booking.location}</span>
                  <span>{booking.amount} TND</span>
                </div>
              </button>
            ))}
          </div>

          <div className="provider-booking-detail">
            <div className="provider-panel-head">
              <h3>{selectedReservation?.service}</h3>
              <p>{selectedReservation?.client}</p>
            </div>

            <div className="provider-detail-grid">
              <div>
                <span>Date</span>
                <strong>
                  {selectedReservation
                    ? new Date(selectedReservation.date).toLocaleDateString("fr-FR")
                    : "--"}
                </strong>
              </div>
              <div>
                <span>Lieu</span>
                <strong>{selectedReservation?.location ?? "--"}</strong>
              </div>
              <div>
                <span>Montant</span>
                <strong>{selectedReservation?.amount ?? "--"} TND</strong>
              </div>
              <div>
                <span>Statut</span>
                <strong>{selectedReservation?.status ?? "--"}</strong>
              </div>
            </div>

            <p className="provider-detail-text">{selectedReservation?.details}</p>

            <div className="provider-inline-actions">
              <button
                type="button"
                className="provider-primary-btn"
                onClick={() => onUpdateStatus(selectedReservation.id, "Validee")}
              >
                Accepter
              </button>
              <button
                type="button"
                className="provider-secondary-btn"
                onClick={() => onUpdateStatus(selectedReservation.id, "Refusee")}
              >
                Refuser
              </button>
              <button type="button" className="provider-ghost-btn">
                Voir
              </button>
              <button type="button" className="provider-ghost-btn">
                Contacter client
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
};

export default ProviderBookings;
