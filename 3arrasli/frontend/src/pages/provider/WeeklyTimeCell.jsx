import React from "react";

const WeeklyTimeCell = ({ slot, isUpdating, onToggle }) => {
  const disabled = slot.status === "reserved" || isUpdating;

  return (
    <button
      type="button"
      className={`provider-week-cell ${slot.status}`}
      disabled={disabled}
      onClick={() => onToggle(slot)}
    >
      <span className="provider-week-cell-time">{slot.time}</span>
      {slot.status === "free" ? (
        <small>Libre</small>
      ) : slot.status === "occupied" ? (
        <small>{isUpdating ? "Mise a jour..." : "Bloque manuellement"}</small>
      ) : (
        <>
          <strong>{slot.clientName || "Client"}</strong>
          <small>{slot.serviceTitle || "Reservation"}</small>
        </>
      )}
    </button>
  );
};

export default WeeklyTimeCell;
