import React from "react";

const WeeklyCalendarEventBlock = ({ slot, isUpdating }) => {
  if (slot.status === "occupied") {
    return (
      <div className="provider-week-event occupied">
        <div className="provider-week-event-topline">
          <span className="provider-week-event-badge">🕯️ Bloque</span>
          {isUpdating ? <small>Mise a jour...</small> : null}
        </div>
        <strong>{slot.time}</strong>
        <p>Indisponible</p>
      </div>
    );
  }

  if (slot.eventType === "appointment" || slot.status === "appointment") {
    return (
      <div className="provider-week-event appointment">
        <div className="provider-week-event-topline">
          <span className="provider-week-event-badge">Rendez-vous</span>
          <small>{slot.time}</small>
        </div>
        <strong>{slot.clientName || "Client"}</strong>
        <p>{slot.serviceTitle || "Service"} - {slot.appointmentStatus === "accepted" ? "Accepte" : "En attente"}</p>
      </div>
    );
  }

  return (
    <div className="provider-week-event reserved">
      <div className="provider-week-event-topline">
        <span className="provider-week-event-badge">💐 Reserve</span>
        <small>{slot.time}</small>
      </div>
      <strong>{slot.clientName || "Client"}</strong>
      <p>{slot.serviceTitle || "Reservation"}</p>
    </div>
  );
};

export default WeeklyCalendarEventBlock;
