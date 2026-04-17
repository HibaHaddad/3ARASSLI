import React, { useEffect, useMemo, useState } from "react";
import "./provider.css";
import ProviderBookings from "./provider/ProviderBookings";
import ProviderCalendar from "./provider/ProviderCalendar";
import ProviderChat from "./provider/ProviderChat";
import ProviderDashboardHome from "./provider/ProviderDashboardHome";
import ProviderLayout from "./provider/ProviderLayout";
import ProviderProfile from "./provider/ProviderProfile";
import ProviderServices from "./provider/ProviderServices";
import {
  emptyServiceForm,
  initialCalendarDates,
  initialChats,
  initialProfile,
  initialPriorityActions,
  initialReservations,
  initialServices,
  providerSections,
} from "./provider/providerData";

const getDayStatus = (slots) => {
  const reservedCount = slots.filter((slot) => slot.status === "reserved").length;
  const occupiedCount = slots.filter((slot) => slot.status === "occupied").length;
  const busyCount = reservedCount + occupiedCount;

  if (busyCount === 0) {
    return { status: "free", statusLabel: "Journee libre" };
  }

  if (busyCount >= slots.length - 1) {
    return { status: "occupied", statusLabel: "Journee complete" };
  }

  return { status: "partial", statusLabel: "Partiellement occupee" };
};

const ProviderDashboard = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reservations, setReservations] = useState(initialReservations);
  const [reservationFilter, setReservationFilter] = useState("Tous");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReservationId, setSelectedReservationId] = useState(initialReservations[0].id);
  const [profileForm, setProfileForm] = useState(initialProfile);
  const [profileMessage, setProfileMessage] = useState("");
  const [services, setServices] = useState(initialServices);
  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [calendarDates, setCalendarDates] = useState(initialCalendarDates);
  const [selectedCalendarDateId, setSelectedCalendarDateId] = useState(null);
  const [calendarFilterMode, setCalendarFilterMode] = useState("all");
  const [chats, setChats] = useState(initialChats);
  const [activeChatId, setActiveChatId] = useState(initialChats[0].id);
  const [messageDraft, setMessageDraft] = useState("");

  useEffect(() => {
    setSidebarOpen(false);
  }, [activeSection]);

  const selectedReservation =
    reservations.find((item) => item.id === selectedReservationId) || reservations[0];
  const normalizedCalendarDates = useMemo(
    () =>
      calendarDates.map((item) => ({
        ...item,
        ...getDayStatus(item.slots),
      })),
    [calendarDates]
  );
  const selectedCalendarDate =
    normalizedCalendarDates.find((item) => item.id === selectedCalendarDateId) || null;
  const activeChat = chats.find((chat) => chat.id === activeChatId) || chats[0];

  const filteredReservations = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return reservations.filter((item) => {
      const filterMatch = reservationFilter === "Tous" || item.status === reservationFilter;
      const searchMatch =
        !normalized ||
        item.client.toLowerCase().includes(normalized) ||
        item.service.toLowerCase().includes(normalized) ||
        item.location.toLowerCase().includes(normalized);
      return filterMatch && searchMatch;
    });
  }, [reservationFilter, reservations, searchTerm]);

  const upcomingReservations = useMemo(
    () =>
      [...reservations]
        .filter((item) => item.status !== "Refusee")
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 3),
    [reservations]
  );

  const recentChats = useMemo(() => chats.slice(0, 3), [chats]);

  const heroSummary = useMemo(() => {
    const pending = reservations.filter((item) => item.status === "En attente").length;
    const weekBookings = reservations.filter((item) => item.status === "Validee").slice(0, 2).length;
    return `Vous avez ${pending} demande(s) en attente et ${weekBookings} prestation(s) deja validee(s) sur les prochaines semaines.`;
  }, [reservations]);

  const currentHour = useMemo(() => `${String(new Date().getHours()).padStart(2, "0")}:`, []);

  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
    setSidebarOpen(false);
  };

  const updateReservationStatus = (id, status) => {
    setReservations((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  const onProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveProfile = (event) => {
    event.preventDefault();
    setProfileMessage("Profil mis a jour avec succes.");
  };

  const onServiceChange = (event) => {
    const { name, value } = event.target;
    setServiceForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetServiceEditing = () => {
    setEditingServiceId(null);
    setServiceForm(emptyServiceForm);
  };

  const submitService = (event) => {
    event.preventDefault();

    if (!serviceForm.title || !serviceForm.price || !serviceForm.description || !serviceForm.image) {
      return;
    }

    if (editingServiceId) {
      setServices((prev) =>
        prev.map((item) => (item.id === editingServiceId ? { ...item, ...serviceForm } : item))
      );
    } else {
      setServices((prev) => [{ id: Date.now(), ...serviceForm }, ...prev]);
    }

    resetServiceEditing();
  };

  const editService = (service) => {
    setServiceForm({
      title: service.title,
      price: service.price,
      description: service.description,
      image: service.image,
      category: service.category,
    });
    setEditingServiceId(service.id);
    setActiveSection("services");
  };

  const deleteService = (serviceId) => {
    setServices((prev) => prev.filter((item) => item.id !== serviceId));
    if (editingServiceId === serviceId) {
      resetServiceEditing();
    }
  };

  const toggleCalendarDate = (id) => {
    setCalendarDates((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              slots: item.slots.map((slot) =>
                slot.status === "free"
                  ? { ...slot, status: "occupied" }
                  : slot.status === "occupied"
                    ? { ...slot, status: "free" }
                    : slot
              ),
            }
          : item
      )
    );
  };

  const toggleCalendarSlot = (slotId) => {
    if (!selectedCalendarDateId) {
      return;
    }

    setCalendarDates((prev) =>
      prev.map((day) =>
        day.id === selectedCalendarDateId
          ? {
              ...day,
              slots: day.slots.map((slot) =>
                slot.id === slotId
                  ? slot.status === "reserved"
                    ? slot
                    : { ...slot, status: slot.status === "occupied" ? "free" : "occupied" }
                  : slot
              ),
            }
          : day
      )
    );
  };

  const markEntireDayOccupied = () => {
    if (!selectedCalendarDateId) {
      return;
    }

    setCalendarDates((prev) =>
      prev.map((day) =>
        day.id === selectedCalendarDateId
          ? {
              ...day,
              slots: day.slots.map((slot) =>
                slot.status === "reserved" ? slot : { ...slot, status: "occupied" }
              ),
            }
          : day
      )
    );
  };

  const freeEntireDay = () => {
    if (!selectedCalendarDateId) {
      return;
    }

    setCalendarDates((prev) =>
      prev.map((day) =>
        day.id === selectedCalendarDateId
          ? {
              ...day,
              slots: day.slots.map((slot) =>
                slot.status === "reserved" ? slot : { ...slot, status: "free" }
              ),
            }
          : day
      )
    );
  };

  const sendMessage = (event) => {
    event.preventDefault();

    if (!messageDraft.trim()) {
      return;
    }

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId
          ? {
              ...chat,
              unread: 0,
              excerpt: messageDraft.trim(),
              messages: [
                ...chat.messages,
                {
                  id: Date.now(),
                  author: "provider",
                  text: messageDraft.trim(),
                },
              ],
            }
          : chat
      )
    );

    setMessageDraft("");
  };

  const openChat = (chatId) => {
    setActiveChatId(chatId);
    setChats((prev) =>
      prev.map((chat) => (chat.id === chatId ? { ...chat, unread: 0 } : chat))
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case "reservations":
        return (
          <ProviderBookings
            reservationFilter={reservationFilter}
            onFilterChange={setReservationFilter}
            searchTerm={searchTerm}
            onSearchChange={(event) => setSearchTerm(event.target.value)}
            reservations={filteredReservations}
            selectedReservation={selectedReservation}
            selectedReservationId={selectedReservationId}
            onSelectReservation={setSelectedReservationId}
            onUpdateStatus={updateReservationStatus}
          />
        );
      case "profile":
        return (
          <ProviderProfile
            profileForm={profileForm}
            onProfileChange={onProfileChange}
            onSaveProfile={saveProfile}
            profileMessage={profileMessage}
          />
        );
      case "services":
        return (
          <ProviderServices
            editingServiceId={editingServiceId}
            serviceForm={serviceForm}
            onServiceChange={onServiceChange}
            onSubmitService={submitService}
            onResetEditing={resetServiceEditing}
            services={services}
            onEditService={editService}
            onDeleteService={deleteService}
          />
        );
      case "calendar":
        return (
          <ProviderCalendar
            calendarDates={normalizedCalendarDates}
            selectedDate={selectedCalendarDate}
            selectedDateId={selectedCalendarDateId}
            onSelectDate={setSelectedCalendarDateId}
            onToggleSlot={toggleCalendarSlot}
            onMarkDayOccupied={markEntireDayOccupied}
            onFreeDay={freeEntireDay}
            filterMode={calendarFilterMode}
            onFilterChange={setCalendarFilterMode}
            currentHour={currentHour}
            onCloseDayPlanning={() => {
              setSelectedCalendarDateId(null);
            }}
            onBackToMonth={() => {
              setSelectedCalendarDateId(null);
              const monthPanel = document.getElementById("provider-month-panel");
              monthPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        );
      case "chat":
        return (
          <ProviderChat
            chats={chats}
            activeChat={activeChat}
            activeChatId={activeChatId}
            onOpenChat={openChat}
            messageDraft={messageDraft}
            onMessageDraftChange={(event) => setMessageDraft(event.target.value)}
            onSendMessage={sendMessage}
          />
        );
      default:
        return (
          <ProviderDashboardHome
            providerName={profileForm.name}
            heroSummary={heroSummary}
            priorityActions={initialPriorityActions}
            upcomingReservations={upcomingReservations}
            calendarDates={normalizedCalendarDates}
            recentChats={recentChats}
            onCalendarToggle={toggleCalendarDate}
            onGoToSection={setActiveSection}
          />
        );
    }
  };

  const currentSection =
    providerSections.find((section) => section.id === activeSection) || providerSections[0];

  return (
    <ProviderLayout
      sections={providerSections}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      isSidebarOpen={sidebarOpen}
      onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      currentSection={currentSection}
    >
      {renderContent()}
    </ProviderLayout>
  );
};

export default ProviderDashboard;