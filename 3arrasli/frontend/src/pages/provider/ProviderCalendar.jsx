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
  onBackToMonth,
  onCloseDayPlanning,
}) => {
  return (
    <>
      <div className="provider-calendar-layout">
        <CalendarMonth
          days={calendarDates}
          selectedDateId={selectedDateId}
          onSelectDate={onSelectDate}
        />
      </div>

      <DayPlanningModal
        selectedDate={selectedDate}
        filterMode={filterMode}
        onFilterChange={onFilterChange}
        onToggleSlot={onToggleSlot}
        onMarkDayOccupied={onMarkDayOccupied}
        onFreeDay={onFreeDay}
        currentHour={currentHour}
        onBackToMonth={onBackToMonth}
        onClose={onCloseDayPlanning}
      />
    </>
  );
};

export default ProviderCalendar;
