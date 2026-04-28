import React from "react";
import CalendarLegend from "./CalendarLegend";
import WeeklyCalendarGrid from "./WeeklyCalendarGrid";
import WeeklyCalendarHeader from "./WeeklyCalendarHeader";

const ProviderWeeklyCalendar = ({
  calendarDays,
  loadingCalendar,
  updatingSlotKeys,
  targetSlot,
  weekMeta,
  onPreviousWeek,
  onNextWeek,
  onToggleSlot,
  onOpenChat,
  selectedAppointment,
  updatingAppointmentId,
  onCloseAppointment,
  onUpdateAppointmentStatus,
}) => {
  const featuredReservation = calendarDays
    .flatMap((day) => (day.slots || []).map((slot) => ({ ...slot, day })))
    .find((slot) => slot.status === "reserved");

  return (
    <article className="provider-panel provider-weekly-calendar">
      <WeeklyCalendarHeader
        weekMeta={weekMeta}
        onPreviousWeek={onPreviousWeek}
        onNextWeek={onNextWeek}
      />

      <CalendarLegend
        items={[
          { label: "Disponible", tone: "free" },
          { label: "Bloque manuellement", tone: "occupied" },
          { label: "Reservation", tone: "reserved" },
          { label: "Rendez-vous", tone: "appointment" },
        ]}
      />

      {!loadingCalendar && featuredReservation ? (
        <section className="provider-calendar-focus-card">
          <div>
            <span className="provider-section-label">Reservation prioritaire</span>
            <h3>{featuredReservation.clientName || "Client"}</h3>
            <p>{featuredReservation.serviceTitle || "Reservation"} - {featuredReservation.day.weekDay} {featuredReservation.day.day} {featuredReservation.day.month} a {featuredReservation.time}</p>
          </div>
          <div className="provider-calendar-focus-actions">
            <strong>{featuredReservation.status === "reserved" ? "A preparer" : "Planning"}</strong>
            {featuredReservation.clientId ? (
              <button
                type="button"
                className="provider-primary-btn"
                onClick={() => onOpenChat(featuredReservation.clientId)}
              >
                Contacter client
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {loadingCalendar ? (
        <div className="provider-empty-state">
          <h3>Chargement de la semaine...</h3>
          <p>Nous recuperons vos disponibilites et vos reservations.</p>
        </div>
      ) : (
        <WeeklyCalendarGrid
          days={calendarDays}
          updatingSlotKeys={updatingSlotKeys}
          targetSlot={targetSlot}
          onToggleSlot={onToggleSlot}
        />
      )}

      {selectedAppointment ? (
        <div className="provider-booking-modal-overlay" role="presentation" onMouseDown={onCloseAppointment}>
          <section
            className="provider-booking-modal provider-appointment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="provider-appointment-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="provider-modal-close" aria-label="Fermer" onClick={onCloseAppointment}>
              <span />
              <span />
            </button>
            <header className="provider-booking-modal-head">
              <span className="provider-bookings-eyebrow">Rendez-vous</span>
              <h3 id="provider-appointment-modal-title">{selectedAppointment.clientName || "Client"}</h3>
              <p>
                {selectedAppointment.serviceTitle || "Service"} - {selectedAppointment.date} a{" "}
                {selectedAppointment.time}
              </p>
            </header>

            <div className="provider-booking-modal-grid">
              <div>
                <span>Client</span>
                <strong>{selectedAppointment.clientName || "Client"}</strong>
              </div>
              <div>
                <span>Date</span>
                <strong>{selectedAppointment.date}</strong>
              </div>
              <div>
                <span>Heure</span>
                <strong>{selectedAppointment.time}</strong>
              </div>
              <div>
                <span>Service / Prestataire</span>
                <strong>
                  {selectedAppointment.serviceTitle || "Service"} / {selectedAppointment.providerName || "Prestataire"}
                </strong>
              </div>
              <div>
                <span>Statut</span>
                <strong>{selectedAppointment.appointmentStatus === "accepted" ? "Accepte" : "En attente"}</strong>
              </div>
            </div>

            <div className="provider-booking-modal-notes">
              <article>
                <span>Note</span>
                <p>{selectedAppointment.note || "Aucune note client."}</p>
              </article>
            </div>

            <footer className="provider-booking-modal-actions">
              <button
                type="button"
                className="provider-primary-btn"
                disabled={updatingAppointmentId === selectedAppointment.appointmentId}
                onClick={() => onUpdateAppointmentStatus(selectedAppointment, "accepted")}
              >
                {updatingAppointmentId === selectedAppointment.appointmentId ? "Envoi..." : "Accepter"}
              </button>
              <button
                type="button"
                className="provider-secondary-btn"
                disabled={updatingAppointmentId === selectedAppointment.appointmentId}
                onClick={() => onUpdateAppointmentStatus(selectedAppointment, "refused")}
              >
                Refuser
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </article>
  );
};

export default ProviderWeeklyCalendar;
