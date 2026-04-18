import React from "react";
import CalendarMonth from "./CalendarMonth";
import DayPlanningModal from "./DayPlanningModal";

const ProviderCalendar = ({
  calendarDates,
  selectedDate,
  selectedDateId,
  onSelectDate,
  onToggleSlot,
  onMarkDayOccupied,
  onFreeDay,
  filterMode,
  onFilterChange,
  currentHour,
  loadingCalendar,
  calendarMessage,
  calendarUpdating,
  updatingSlotIds,
  monthMeta,
  onBackToMonth,
  onCloseDayPlanning,
}) => {
  const hasDates = calendarDates.length > 0;

  return (
    <>
      <div className="provider-calendar-layout">
        {calendarMessage?.text ? (
          <div
            className={`provider-alert ${
              calendarMessage.type === "success" ? "provider-alert-success" : "provider-alert-error"
            }`}
          >
            {calendarMessage.text}
          </div>
        ) : null}

        {loadingCalendar ? (
          <article className="provider-panel provider-empty-state">
            <h3>Chargement du calendrier...</h3>
            <p>Nous recuperons vos disponibilites et vos reservations.</p>
          </article>
        ) : !hasDates ? (
          <article className="provider-panel provider-empty-state">
            <h3>Aucune donnee calendrier</h3>
            <p>Les creneaux de disponibilite n'ont pas encore ete generes pour ce mois.</p>
          </article>
        ) : (
          <CalendarMonth
            days={calendarDates}
            selectedDateId={selectedDateId}
            onSelectDate={onSelectDate}
            monthMeta={monthMeta}
          />
        )}
      </div>

      <DayPlanningModal
        selectedDate={selectedDate}
        filterMode={filterMode}
        onFilterChange={onFilterChange}
        onToggleSlot={onToggleSlot}
        onMarkDayOccupied={onMarkDayOccupied}
        onFreeDay={onFreeDay}
        currentHour={currentHour}
        calendarUpdating={calendarUpdating}
        updatingSlotIds={updatingSlotIds}
        onBackToMonth={onBackToMonth}
        onClose={onCloseDayPlanning}
      />
    </>
  );
};

export default ProviderCalendar;
