import React from "react";
import ProviderBookingRequestStrip from "./ProviderBookingRequestStrip";

const reservationFilters = ["Tous", "En attente", "Validee", "Refusee"];

const formatBookingDate = (date) =>
  new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const getStatusClass = (status = "") => status.replace(/\s/g, "").toLowerCase();

const ProviderBookings = ({
  reservationFilter,
  onFilterChange,
  searchTerm,
  onSearchChange,
  reservations,
  selectedReservation,
  selectedReservationId,
  loadingBookings = false,
  bookingsMessage,
  updatingBookingId,
  onSelectReservation,
  onUpdateStatus,
  onViewInCalendar,
  onContactClient,
}) => {
  const isUpdatingSelected = updatingBookingId === selectedReservation?.id;
  const canAccept = selectedReservation && selectedReservation.status !== "Validee";
  const canReject = selectedReservation && selectedReservation.status !== "Refusee";
  const messageClass =
    bookingsMessage?.type === "error" ? "provider-alert-error" : "provider-alert-success";

  return (
    <div className="provider-bookings-editorial">
      

      <section className="provider-bookings-editorial-controls">
        <div className="provider-bookings-filter-row">
          {reservationFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`provider-bookings-filter-chip ${reservationFilter === filter ? "active" : ""}`}
              onClick={() => onFilterChange(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        <label className="provider-bookings-search">
          <span>⌕</span>
          <input
            type="text"
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Rechercher par client, service ou lieu..."
          />
        </label>
      </section>

      <ProviderBookingRequestStrip
        className="provider-bookings-main-requests"
        reservations={reservations}
        selectedReservationId={selectedReservationId}
        loadingBookings={loadingBookings}
        reservationFilter={reservationFilter}
        searchTerm={searchTerm}
        onSelectReservation={onSelectReservation}
      />

      {bookingsMessage?.text ? (
        <div className={`provider-alert provider-bookings-alert ${messageClass}`}>
          <span>{bookingsMessage.type === "error" ? "🕊️" : "✨"}</span>
          {bookingsMessage.text}
        </div>
      ) : null}

      <section className="provider-bookings-editorial-stage">
        <main className="provider-booking-detail provider-bookings-centerpiece">
          {selectedReservation ? (
            <>
              <div className="provider-booking-centerpiece-bg" />
              <div className="provider-booking-centerpiece-mark">✦</div>

              <div className="provider-booking-editorial-status">
                <span>Statut</span>
                <strong className={getStatusClass(selectedReservation.status)}>
                  {selectedReservation.status}
                </strong>
              </div>

              <div className="provider-booking-editorial-title">
                <span className="provider-bookings-kicker">Reservation selectionnee</span>
                <h3>{selectedReservation.service}</h3>
                <p>
                  Pour <strong>{selectedReservation.client}</strong>, une demande a traiter comme
                  une experience signature.
                </p>
              </div>

              <div className="provider-booking-editorial-moments">
                <div className="moment-date">
                  <span>📅</span>
                  <small>Date</small>
                  <strong>{formatBookingDate(selectedReservation.date)}</strong>
                  <em>{selectedReservation.time || "--"}</em>
                </div>
                <div className="moment-place">
                  <span>🌸</span>
                  <small>Lieu</small>
                  <strong>{selectedReservation.location ?? "--"}</strong>
                </div>
                <div className="moment-budget">
                  <span>✨</span>
                  <small>Budget</small>
                  <strong>{selectedReservation.amount ?? "--"} TND</strong>
                </div>
              </div>

              <blockquote className="provider-booking-editorial-note">
                <span>Note de la demande</span>
                <p>
                  {selectedReservation.details ||
                    "Aucun detail supplementaire pour cette reservation."}
                </p>
              </blockquote>

              <div className="provider-booking-editorial-actions">
                <div>
                  <span>Action recommandee</span>
                  <strong>Donnez une reponse claire au client</strong>
                </div>
                <div className="provider-inline-actions provider-booking-actions">
                  <button
                    type="button"
                    className="provider-primary-btn provider-booking-accept-btn"
                    disabled={!canAccept || isUpdatingSelected}
                    onClick={() => onUpdateStatus(selectedReservation.id, "Validee")}
                  >
                    {isUpdatingSelected ? "Envoi..." : "Accepter ✨"}
                  </button>
                  <button
                    type="button"
                    className="provider-secondary-btn provider-booking-refuse-btn"
                    disabled={!canReject || isUpdatingSelected}
                    onClick={() => onUpdateStatus(selectedReservation.id, "Refusee")}
                  >
                    {isUpdatingSelected ? "Envoi..." : "Refuser"}
                  </button>
                  <button
                    type="button"
                    className="provider-ghost-btn"
                    onClick={() => onViewInCalendar(selectedReservation)}
                  >
                    Voir
                  </button>
                  <button
                    type="button"
                    className="provider-ghost-btn"
                    onClick={() => onContactClient(selectedReservation)}
                  >
                    Contacter client
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="provider-empty-state provider-booking-empty">
              <span className="provider-booking-empty-icon">💐</span>
              <strong>Aucune reservation selectionnee</strong>
              <p>Selectionnez une demande dans le carnet pour afficher son histoire.</p>
            </div>
          )}
        </main>
      </section>
    </div>
  );
};

export default ProviderBookings;
