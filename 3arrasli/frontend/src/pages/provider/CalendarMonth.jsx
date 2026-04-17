import React from "react";
import CalendarLegend from "./CalendarLegend";

const CalendarMonth = ({ days, selectedDateId, onSelectDate }) => {
  return (
    <article className="provider-panel provider-month-panel" id="provider-month-panel">
      <div className="provider-panel-head provider-panel-head-inline">
        <div>
          <h3>Vue mensuelle</h3>
          <p>Cliquez sur une date pour voir les heures disponibles ou deja prises.</p>
        </div>
        <span className="provider-calendar-month">Mai - Juillet 2026</span>
      </div>

      <CalendarLegend
        items={[
          { label: "Libre", tone: "free" },
          { label: "Partiellement occupee", tone: "partial" },
          { label: "Complete", tone: "occupied" },
        ]}
      />

      <div className="provider-calendar-grid provider-calendar-grid-month">
        {days.map((day) => (
          <button
            key={day.id}
            type="button"
            className={`provider-calendar-card ${day.status} ${selectedDateId === day.id ? "active" : ""}`}
            onClick={() => onSelectDate(day.id)}
          >
            <strong>{day.day}</strong>
            <span>{day.weekDay}</span>
            <small>{day.month}</small>
            <em>{day.statusLabel}</em>
          </button>
        ))}
      </div>
    </article>
  );
};

export default CalendarMonth;
