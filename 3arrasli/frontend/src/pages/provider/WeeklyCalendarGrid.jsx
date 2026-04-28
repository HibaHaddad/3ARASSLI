import React, { useMemo } from "react";
import WeeklyTimeCell from "./WeeklyTimeCell";

const WeeklyCalendarGrid = ({ days, updatingSlotKeys, targetSlot, onToggleSlot }) => {
  const today = new Date().toISOString().slice(0, 10);
  const timeLabels = useMemo(() => {
    const sourceDay = days.find((day) => day.slots?.length > 0);
    return sourceDay ? sourceDay.slots.map((slot) => slot.time) : [];
  }, [days]);

  if (!days.length || !timeLabels.length) {
    return (
      <div className="provider-empty-state">
        <h3>Aucun creneau a afficher</h3>
        <p>Les horaires de la semaine n'ont pas pu etre charges.</p>
      </div>
    );
  }

  return (
    <div className="provider-week-grid-shell">
      <div className="provider-week-grid provider-week-grid-header" role="row">
        <div className="provider-week-hour-head">Heure</div>
        {days.map((day) => (
          <div
            key={day.date}
            className={`provider-week-day-head ${day.date === today ? "today" : ""} ${
              day.slots?.some((slot) => slot.status === "reserved") ? "has-reservation" : ""
            }`}
          >
            <strong>{day.date === today ? "✨ " : ""}{day.weekDay}</strong>
            <span>
              {day.day} {day.month}
            </span>
            <small>{day.statusLabel}</small>
          </div>
        ))}
      </div>

      {timeLabels.map((timeLabel) => (
        <div key={timeLabel} className="provider-week-grid provider-week-grid-row">
          <div className="provider-week-hour-cell">{timeLabel}</div>
          {days.map((day) => {
            const slot = day.slots.find((item) => item.time === timeLabel);
            const slotKey = slot ? `${slot.date}-${slot.start_time}` : "";
            const isTargeted =
              Boolean(slot) &&
              targetSlot?.date === slot.date &&
              targetSlot?.time === slot.time;

            return (
              <div key={`${day.date}-${timeLabel}`} className="provider-week-cell-wrap">
                {slot ? (
                  <WeeklyTimeCell
                    slot={{ ...slot, weekDay: day.weekDay }}
                    isUpdating={updatingSlotKeys.includes(slotKey)}
                    isTargeted={isTargeted}
                    onToggle={onToggleSlot}
                  />
                ) : (
                  <div className="provider-week-cell empty" />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default WeeklyCalendarGrid;
