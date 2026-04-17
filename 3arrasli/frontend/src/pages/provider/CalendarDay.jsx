import React, { useEffect, useMemo, useRef } from "react";
import CalendarLegend from "./CalendarLegend";
import DaySummaryCard from "./DaySummaryCard";
import TimeSlot from "./TimeSlot";

const CalendarDay = ({
  selectedDate,
  filterMode,
  onFilterChange,
  onToggleSlot,
  onMarkDayOccupied,
  onFreeDay,
  currentHour,
  onBackToMonth,
}) => {
  const currentSlotRef = useRef(null);

  const visibleSlots = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    if (filterMode === "all") {
      return selectedDate.slots;
    }

    return selectedDate.slots.filter((slot) => slot.status === filterMode);
  }, [filterMode, selectedDate]);

  const summary = useMemo(() => {
    if (!selectedDate) {
      return { free: 0, occupied: 0, reserved: 0, total: 0 };
    }

    return selectedDate.slots.reduce(
      (acc, slot) => {
        acc.total += 1;
        acc[slot.status] += 1;
        return acc;
      },
      { free: 0, occupied: 0, reserved: 0, total: 0 }
    );
  }, [selectedDate]);

  const nextReservedSlot = useMemo(() => {
    if (!selectedDate) {
      return null;
    }

    return selectedDate.slots.find((slot) => slot.status === "reserved") || null;
  }, [selectedDate]);

  useEffect(() => {
    if (currentSlotRef.current) {
      currentSlotRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [selectedDate, filterMode]);

  return (
    <aside className="provider-panel provider-day-detail">
      <div className="provider-day-header">
        <div className="provider-day-header-main">
          <div className="provider-day-header-copy">
            <span className="provider-day-header-kicker">Planning du jour</span>
            <h3 id="provider-day-planning-title">
              Planning du{" "}
              {selectedDate?.weekDay} {selectedDate?.day} {selectedDate?.month}
            </h3>
            <p>
              {summary.free} libres, {summary.occupied} bloques, {summary.reserved} reserves.
              {nextReservedSlot ? ` Prochaine reservation a ${nextReservedSlot.time}.` : " Journee encore flexible."}
            </p>
          </div>

          <div className="provider-inline-actions">
            <button type="button" className="provider-ghost-btn" onClick={onBackToMonth}>
              Retour au calendrier
            </button>
            <button type="button" className="provider-primary-btn" onClick={onMarkDayOccupied}>
              Marquer la journee occupee
            </button>
            <button type="button" className="provider-ghost-btn" onClick={onFreeDay}>
              Liberer la journee
            </button>
          </div>
        </div>

        <div className={`provider-day-summary ${selectedDate?.status}`}>
          <strong>{selectedDate?.statusLabel}</strong>
          <span>{summary.total} creneaux au total sur cette journee.</span>
        </div>

        <div className="provider-day-stats">
          <DaySummaryCard label="Libres" value={summary.free} tone="free" />
          <DaySummaryCard label="Bloques" value={summary.occupied} tone="occupied" />
          <DaySummaryCard label="Reserves" value={summary.reserved} tone="reserved" />
        </div>
      </div>

      <CalendarLegend
        className="provider-calendar-legend-day"
        items={[
          { label: "Disponible", tone: "free" },
          { label: "Indisponible", tone: "occupied" },
          { label: "Reserve", tone: "reserved" },
        ]}
      />

      <div className="provider-calendar-toolbar">
        {[
          { id: "all", label: "Toutes" },
          { id: "free", label: "Libres" },
          { id: "occupied", label: "Occupees" },
          { id: "reserved", label: "Reservees" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            className={`provider-filter-chip ${filterMode === item.id ? "active" : ""}`}
            onClick={() => onFilterChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="provider-time-slot-list">
        {visibleSlots.map((slot) => {
          const isCurrentHour = slot.time.startsWith(currentHour);

          return (
            <div
              key={slot.id}
              ref={isCurrentHour ? currentSlotRef : null}
            >
              <TimeSlot
                slot={slot}
                isCurrentHour={isCurrentHour}
                onToggle={() => onToggleSlot(slot.id)}
              />
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default CalendarDay;
