import React from "react";
import CalendarLegend from "./CalendarLegend";
import WeeklyCalendarGrid from "./WeeklyCalendarGrid";
import WeeklyCalendarHeader from "./WeeklyCalendarHeader";

const ProviderWeeklyCalendar = ({
  calendarDays,
  loadingCalendar,
  calendarMessage,
  updatingSlotKeys,
  weekMeta,
  onPreviousWeek,
  onNextWeek,
  onToggleSlot,
}) => {
  return (
    <article className="provider-panel provider-weekly-calendar">
      <WeeklyCalendarHeader
        weekMeta={weekMeta}
        onPreviousWeek={onPreviousWeek}
        onNextWeek={onNextWeek}
      />

      {calendarMessage?.text ? (
        <div
          className={`provider-alert ${
            calendarMessage.type === "success" ? "provider-alert-success" : "provider-alert-error"
          }`}
        >
          {calendarMessage.text}
        </div>
      ) : null}

      <CalendarLegend
        items={[
          { label: "Libre", tone: "free" },
          { label: "Bloque manuellement", tone: "occupied" },
          { label: "Reserve", tone: "reserved" },
        ]}
      />

      {loadingCalendar ? (
        <div className="provider-empty-state">
          <h3>Chargement de la semaine...</h3>
          <p>Nous recuperons vos disponibilites et vos reservations.</p>
        </div>
      ) : (
        <WeeklyCalendarGrid
          days={calendarDays}
          updatingSlotKeys={updatingSlotKeys}
          onToggleSlot={onToggleSlot}
        />
      )}
    </article>
  );
};

export default ProviderWeeklyCalendar;
