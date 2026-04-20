import React from "react";
import WeeklyCalendarEventBlock from "./WeeklyCalendarEventBlock";

const WeeklyTimeCell = ({ slot, isUpdating, onToggle }) => {
  const disabled = slot.status === "reserved" || isUpdating;

  return (
    <button
      type="button"
      className={`provider-week-cell ${slot.status}`}
      disabled={disabled}
      onClick={() => onToggle(slot)}
      aria-label={`${slot.weekDay || ""} ${slot.date} ${slot.time}`}
    >
      {slot.status === "free" ? (
        <span className="provider-week-cell-hover-hint">{isUpdating ? "..." : "+"}</span>
      ) : (
        <WeeklyCalendarEventBlock slot={slot} isUpdating={isUpdating} />
      )}
    </button>
  );
};

export default WeeklyTimeCell;
