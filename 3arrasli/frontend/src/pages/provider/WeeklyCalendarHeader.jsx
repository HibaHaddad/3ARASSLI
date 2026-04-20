import React from "react";

const WeeklyCalendarHeader = ({ weekMeta, onPreviousWeek, onNextWeek }) => {
  return (
    <div className="provider-week-header">
      <div className="provider-week-header-copy">
        <span className="provider-week-kicker">✨ Planning signature</span>
      </div>

      <div className="provider-week-header-actions">
        <button type="button" className="provider-week-nav" onClick={onPreviousWeek}>
          <span aria-hidden="true">‹</span>
          <span>Precedente</span>
        </button>
        <div className="provider-week-range-pill">
          <span aria-hidden="true" className="provider-week-range-icon">💍</span>
          <strong>{weekMeta.weekLabel}</strong>
          <small>
            {weekMeta.startDate} au {weekMeta.endDate}
          </small>
        </div>
        <button type="button" className="provider-week-nav primary" onClick={onNextWeek}>
          <span>Suivante</span>
          <span aria-hidden="true">›</span>
        </button>
      </div>
    </div>
  );
};

export default WeeklyCalendarHeader;
