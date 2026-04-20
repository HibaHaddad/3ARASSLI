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
  onOpenChat,
}) => {
  const featuredReservation = calendarDays
    .flatMap((day) => (day.slots || []).map((slot) => ({ ...slot, day })))
    .find((slot) => slot.status === "reserved");

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
          { label: "Disponible", tone: "free" },
          { label: "Bloque manuellement", tone: "occupied" },
          { label: "Reserve", tone: "reserved" },
        ]}
      />

      {!loadingCalendar && featuredReservation ? (
        <section className="provider-calendar-focus-card">
          <div>
            <span className="provider-section-label">Reservation prioritaire</span>
            <h3>{featuredReservation.clientName || "Client"}</h3>
            <p>{featuredReservation.serviceTitle || "Reservation"} - {featuredReservation.day.weekDay} {featuredReservation.day.day} {featuredReservation.day.month} a {featuredReservation.time}</p>
          </div>
          <div className="provider-calendar-focus-actions">
            <strong>{featuredReservation.status === "reserved" ? "A preparer" : "Planning"}</strong>
            {featuredReservation.clientId ? (
              <button
                type="button"
                className="provider-primary-btn"
                onClick={() => onOpenChat(featuredReservation.clientId)}
              >
                Contacter client
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

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
