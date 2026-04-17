import React, { useEffect } from "react";
import CalendarDay from "./CalendarDay";

const DayPlanningModal = ({
  selectedDate,
  filterMode,
  onFilterChange,
  onToggleSlot,
  onMarkDayOccupied,
  onFreeDay,
  currentHour,
  onBackToMonth,
  onClose,
}) => {
  useEffect(() => {
    if (!selectedDate) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, selectedDate]);

  if (!selectedDate) {
    return null;
  }

  return (
    <div className="provider-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="provider-modal-shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby="provider-day-planning-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="provider-modal-close"
          onClick={onClose}
          aria-label="Fermer le planning du jour"
        >
          <span />
          <span />
        </button>

        <CalendarDay
          selectedDate={selectedDate}
          filterMode={filterMode}
          onFilterChange={onFilterChange}
          onToggleSlot={onToggleSlot}
          onMarkDayOccupied={onMarkDayOccupied}
          onFreeDay={onFreeDay}
          currentHour={currentHour}
          onBackToMonth={onBackToMonth}
        />
      </div>
    </div>
  );
};

export default DayPlanningModal;
