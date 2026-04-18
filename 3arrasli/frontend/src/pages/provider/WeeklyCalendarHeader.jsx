import React from "react";

const WeeklyCalendarHeader = ({ weekMeta, onPreviousWeek, onNextWeek }) => {
  return (
    <div className="provider-panel-head provider-panel-head-inline">
      <div>
        <h3>Calendrier hebdomadaire</h3>
        <p>Bloquez ou liberez vos creneaux directement depuis la semaine complete.</p>
      </div>

      <div className="provider-inline-actions">
        <button type="button" className="provider-ghost-btn" onClick={onPreviousWeek}>
          Semaine precedente
        </button>
        <span className="provider-calendar-month">{weekMeta.weekLabel}</span>
        <button type="button" className="provider-primary-btn" onClick={onNextWeek}>
          Semaine suivante
        </button>
      </div>
    </div>
  );
};

export default WeeklyCalendarHeader;
