import React from "react";

const TimeSlot = ({ slot, isCurrentHour, isUpdating, onToggle }) => {
  const isReserved = slot.status === "reserved";
  const disabled = isReserved || isUpdating;

  return (
    <button
      type="button"
      className={`provider-time-slot ${slot.status} ${isCurrentHour ? "now" : ""}`}
      disabled={disabled}
      onClick={onToggle}
    >
      <div className="provider-time-line" />

      <div className="provider-time-hour">
        <strong>{slot.time}</strong>
        <span className={`provider-slot-kind ${slot.status}`}>
          {slot.status === "free"
            ? "Disponible"
            : slot.status === "occupied"
              ? "Indisponible"
              : "Reserve"}
        </span>
      </div>

      <div className="provider-time-card">
        <div className="provider-time-main">
          <div className="provider-time-title">
            <strong>{slot.time}</strong>
            {isCurrentHour ? <span className="provider-now-badge">Maintenant</span> : null}
          </div>
          <span className={`provider-slot-badge ${slot.status}`}>
            {slot.status === "free"
              ? "Libre"
              : slot.status === "occupied"
                ? "Bloque"
                : "Reserve"}
          </span>
        </div>

        {slot.status === "free" ? (
          <div className="provider-time-copy">
            <p>Disponible pour une nouvelle reservation</p>
            <small>Cliquez pour marquer ce creneau comme occupe.</small>
          </div>
        ) : slot.status === "occupied" ? (
          <div className="provider-time-copy">
            <p>Indisponible manuellement</p>
            <small>Cliquez pour liberer ce creneau.</small>
          </div>
        ) : (
          <div className="provider-time-copy">
            <p>
              Reserve par <strong>{slot.clientName || slot.client}</strong>
            </p>
            <small>{slot.serviceTitle || slot.service}</small>
          </div>
        )}
      </div>
    </button>
  );
};

export default TimeSlot;
