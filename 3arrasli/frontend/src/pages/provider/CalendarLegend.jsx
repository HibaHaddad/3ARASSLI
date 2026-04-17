import React from "react";

const CalendarLegend = ({ items, className = "" }) => {
  return (
    <div className={`provider-calendar-legend ${className}`.trim()}>
      {items.map((item) => (
        <span key={item.label}>
          <i className={`provider-dot ${item.tone}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
};

export default CalendarLegend;
