import React, { useEffect, useMemo, useState } from "react";
import "./provider.css";
import ProviderBookings from "./provider/ProviderBookings";
import ProviderCalendar from "./provider/ProviderCalendar";
import ProviderChat from "./provider/ProviderChat";
import ProviderDashboardHome from "./provider/ProviderDashboardHome";
import ProviderLayout from "./provider/ProviderLayout";
import ProviderProfile from "./provider/ProviderProfile";
import ProviderServices from "./provider/ProviderServices";
import { resolveAssetUrl } from "../services/assets";
import { getStoredSession, saveStoredUser } from "../services/auth";
import {
  freeProviderCalendarDay,
  generateProviderCalendar,
  getProviderCalendar,
  occupyProviderCalendarDay,
  toggleProviderCalendarSlot,
} from "../services/providerCalendar";
import { getProviderProfile, updateProviderProfile } from "../services/providerProfile";
import { validateServiceForm } from "./provider/serviceForm";
import {
  emptyServiceForm,
  initialChats,
  initialProfile,
  initialPriorityActions,
  initialReservations,
  providerSections,
} from "./provider/providerData";
import {
  createProviderService,
  deleteProviderService,
  getProviderServices,
  updateProviderService,
} from "../services/providerServices";

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
  const [profileMessage, setProfileMessage] = useState({ type: "", text: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");
  const [coverPhotoPreview, setCoverPhotoPreview] = useState("");
  const [profileImageInputKey, setProfileImageInputKey] = useState(0);
  const [coverImageInputKey, setCoverImageInputKey] = useState(0);
  const [services, setServices] = useState([]);
  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [serviceFormErrors, setServiceFormErrors] = useState({});
  const [serviceFeedback, setServiceFeedback] = useState({ type: "", text: "" });
  const [servicesLoading, setServicesLoading] = useState(false);
  const [serviceSubmitting, setServiceSubmitting] = useState(false);
  const [serviceImageFile, setServiceImageFile] = useState(null);
  const [serviceImagePreview, setServiceImagePreview] = useState("");
  const [imageInputKey, setImageInputKey] = useState(0);
  const [calendarDates, setCalendarDates] = useState([]);
  const [selectedCalendarDateId, setSelectedCalendarDateId] = useState(null);
  const [calendarFilterMode, setCalendarFilterMode] = useState("all");
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarMessage, setCalendarMessage] = useState({ type: "", text: "" });
  const [calendarUpdating, setCalendarUpdating] = useState(false);
  const [updatingSlotIds, setUpdatingSlotIds] = useState([]);
  const [calendarMonthMeta, setCalendarMonthMeta] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [chats, setChats] = useState(initialChats);
  const [activeChatId, setActiveChatId] = useState(initialChats[0].id);
  const [messageDraft, setMessageDraft] = useState("");

  useEffect(() => {
    setSidebarOpen(false);
  }, [activeSection]);

  const loadProviderServices = async (options = {}) => {
    const { silent = false } = options;

    if (!silent) {
      setServicesLoading(true);
    }

    try {
      const response = await getProviderServices();
      setServices(response.services || []);
      if (!silent) {
        setServiceFeedback((current) => (current.type === "error" ? { type: "", text: "" } : current));
      }
    } catch (error) {
      setServiceFeedback({
        type: "error",
        text:
          error.response?.data?.message ||
          "Impossible de charger vos services pour le moment.",
      });
    } finally {
      if (!silent) {
        setServicesLoading(false);
      }
    }
  };

  useEffect(() => {
    loadProviderServices();
  }, []);

  const loadProviderProfile = async () => {
    setProfileLoading(true);
    try {
      const response = await getProviderProfile();
      const user = response.user || initialProfile;
      setProfileForm({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        city: user.city || "",
        category: user.category || "",
        instagram: user.instagram || "",
        website: user.website || "",
        description: user.description || "",
        profilePhoto: user.profilePhoto || "",
        coverPhoto: user.coverPhoto || "",
      });
      setProfilePhotoPreview(resolveAssetUrl(user.profilePhoto));
      setCoverPhotoPreview(resolveAssetUrl(user.coverPhoto));
      setProfileMessage({ type: "", text: "" });
    } catch (error) {
      setProfileMessage({
        type: "error",
        text: error.response?.data?.message || "Impossible de charger votre profil pour le moment.",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    loadProviderProfile();
  }, []);

  const loadCalendar = async (options = {}) => {
    const { silent = false } = options;
    if (!silent) {
      setCalendarLoading(true);
    }

    try {
      const response = await getProviderCalendar(calendarMonthMeta);
      const days = response.days || [];
      setCalendarDates(days);
      setCalendarMonthMeta({
        month: response.month || calendarMonthMeta.month,
        year: response.year || calendarMonthMeta.year,
      });
      setSelectedCalendarDateId((currentId) =>
        currentId && days.some((item) => item.id === currentId) ? currentId : null
      );
      if (!silent) {
        setCalendarMessage((current) => (current.type === "error" ? { type: "", text: "" } : current));
      }
    } catch (error) {
      const message =
        error.response?.data?.message || "Impossible de charger le calendrier.";
      setCalendarMessage({ type: "error", text: message });

      if (error.response?.status === 404 || error.response?.status === 400) {
        try {
          const generated = await generateProviderCalendar(calendarMonthMeta);
          setCalendarDates(generated.days || []);
          setCalendarMessage({
            type: "success",
            text: generated.message || "Creneaux generes avec succes.",
          });
        } catch (generationError) {
          setCalendarMessage({
            type: "error",
            text:
              generationError.response?.data?.message ||
              "La generation du calendrier a echoue.",
          });
        }
      }
    } finally {
      if (!silent) {
        setCalendarLoading(false);
      }
    }
  };

  useEffect(() => {
    loadCalendar();
  }, [calendarMonthMeta.month, calendarMonthMeta.year]);

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
    setProfileErrors((prev) => ({ ...prev, [name]: "" }));
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const replacePreview = (setter, currentValue, nextValue) => {
    if (currentValue?.startsWith("blob:")) {
      URL.revokeObjectURL(currentValue);
    }
    setter(nextValue);
  };

  const onProfileImageChange = (fieldName, file) => {
    if (fieldName === "profilePhoto") {
      setProfileErrors((prev) => ({ ...prev, profilePhoto: "" }));
      setProfileImageFile(file);
      replacePreview(
        setProfilePhotoPreview,
        profilePhotoPreview,
        file ? URL.createObjectURL(file) : resolveAssetUrl(profileForm.profilePhoto)
      );
    } else {
      setProfileErrors((prev) => ({ ...prev, coverPhoto: "" }));
      setCoverImageFile(file);
      replacePreview(
        setCoverPhotoPreview,
        coverPhotoPreview,
        file ? URL.createObjectURL(file) : resolveAssetUrl(profileForm.coverPhoto)
      );
    }

    if (file) {
      setProfileMessage({ type: "success", text: "Image chargee avec succes." });
    }
  };

  useEffect(() => {
    return () => {
      if (profilePhotoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(profilePhotoPreview);
      }
      if (coverPhotoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(coverPhotoPreview);
      }
    };
  }, [profilePhotoPreview, coverPhotoPreview]);

  const saveProfile = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!profileForm.name.trim()) {
      nextErrors.name = "Le nom est obligatoire.";
    }
    if (!profileForm.email.trim()) {
      nextErrors.email = "L'email est obligatoire.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setProfileErrors(nextErrors);
      setProfileMessage({ type: "error", text: "Merci de corriger les champs obligatoires." });
      return;
    }

    setProfileSubmitting(true);
    setProfileMessage({ type: "", text: "" });

    const formData = new FormData();
    formData.append("name", profileForm.name.trim());
    formData.append("email", profileForm.email.trim());
    formData.append("phone", profileForm.phone.trim());
    formData.append("city", profileForm.city.trim());
    formData.append("category", profileForm.category.trim());
    formData.append("instagram", profileForm.instagram.trim());
    formData.append("website", profileForm.website.trim());
    formData.append("description", profileForm.description.trim());
    if (profileImageFile) {
      formData.append("profilePhoto", profileImageFile);
    }
    if (coverImageFile) {
      formData.append("coverPhoto", coverImageFile);
    }

    try {
      const response = await updateProviderProfile(formData);
      const user = response.user || {};
      setProfileForm({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        city: user.city || "",
        category: user.category || "",
        instagram: user.instagram || "",
        website: user.website || "",
        description: user.description || "",
        profilePhoto: user.profilePhoto || "",
        coverPhoto: user.coverPhoto || "",
      });
      setProfileImageFile(null);
      setCoverImageFile(null);
      replacePreview(setProfilePhotoPreview, profilePhotoPreview, resolveAssetUrl(user.profilePhoto));
      replacePreview(setCoverPhotoPreview, coverPhotoPreview, resolveAssetUrl(user.coverPhoto));
      setProfileImageInputKey((prev) => prev + 1);
      setCoverImageInputKey((prev) => prev + 1);
      setProfileMessage({
        type: "success",
        text: response.message || "Profil mis a jour avec succes.",
      });

      const session = getStoredSession();
      if (session?.token) {
        saveStoredUser({
          token: session.token,
          user: {
            ...session.user,
            ...user,
          },
        });
      }
    } catch (error) {
      setProfileErrors(error.response?.data?.errors || {});
      setProfileMessage({
        type: "error",
        text: error.response?.data?.message || "La mise a jour du profil a echoue.",
      });
    } finally {
      setProfileSubmitting(false);
    }
  };

  const onServiceChange = (event) => {
    const { name, value } = event.target;
    setServiceFormErrors((prev) => ({ ...prev, [name]: "" }));
    setServiceForm((prev) => ({ ...prev, [name]: value }));
  };

  const onServiceImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    setServiceFormErrors((prev) => ({ ...prev, image: "" }));

    if (!file) {
      setServiceImageFile(null);
      setServiceImagePreview(editingServiceId ? serviceForm.image || "" : "");
      return;
    }

    setServiceImageFile(file);
    setServiceImagePreview(URL.createObjectURL(file));
    setServiceFeedback({ type: "success", text: "Image chargee avec succes." });
  };

  useEffect(() => {
    return () => {
      if (serviceImagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(serviceImagePreview);
      }
    };
  }, [serviceImagePreview]);

  const resetServiceEditing = () => {
    if (serviceImagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(serviceImagePreview);
    }
    setEditingServiceId(null);
    setServiceFormErrors({});
    setServiceImageFile(null);
    setServiceImagePreview("");
    setImageInputKey((prev) => prev + 1);
    setServiceForm(emptyServiceForm);
  };

  const submitService = async (event) => {
    event.preventDefault();

    const validationErrors = validateServiceForm(serviceForm, {
      imageFile: serviceImageFile,
      hasExistingImage: Boolean(serviceForm.image),
    });
    if (Object.keys(validationErrors).length > 0) {
      setServiceFormErrors(validationErrors);
      setServiceFeedback({
        type: "error",
        text: "Merci de corriger les champs obligatoires du formulaire.",
      });
      return;
    }

    setServiceSubmitting(true);
    setServiceFeedback({ type: "", text: "" });

    const payload = new FormData();
    payload.append("title", serviceForm.title.trim());
    payload.append("price", String(Number(serviceForm.price)));
    payload.append("category", serviceForm.category.trim());
    payload.append("description", serviceForm.description.trim());
    payload.append("status", serviceForm.status?.trim() || "Actif");
    if (serviceImageFile) {
      payload.append("image", serviceImageFile);
    }

    try {
      if (editingServiceId) {
        const response = await updateProviderService(editingServiceId, payload);
        setServiceFeedback({
          type: "success",
          text: response.message || "Service mis a jour avec succes.",
        });
      } else {
        const response = await createProviderService(payload);
        setServiceFeedback({
          type: "success",
          text: response.message || "Service ajoute avec succes.",
        });
      }

      resetServiceEditing();
      await loadProviderServices({ silent: true });
    } catch (error) {
      setServiceFeedback({
        type: "error",
        text:
          error.response?.data?.message ||
          "Une erreur est survenue lors de l'enregistrement du service.",
      });
    } finally {
      setServiceSubmitting(false);
    }
  };

  const editService = (service) => {
    if (serviceImagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(serviceImagePreview);
    }
    setServiceForm({
      title: service.title,
      price: String(service.price),
      description: service.description,
      image: service.image || "",
      category: service.category,
      status: service.status || "Actif",
    });
    setServiceFormErrors({});
    setServiceImageFile(null);
    setServiceImagePreview(resolveAssetUrl(service.image));
    setImageInputKey((prev) => prev + 1);
    setServiceFeedback({ type: "", text: "" });
    setEditingServiceId(service.id);
    setActiveSection("services");
  };

  const deleteService = async (serviceId) => {
    const confirmed = window.confirm("Voulez-vous vraiment supprimer ce service ?");
    if (!confirmed) {
      return;
    }

    setServiceSubmitting(true);
    setServiceFeedback({ type: "", text: "" });

    try {
      const response = await deleteProviderService(serviceId);
      if (editingServiceId === serviceId) {
        resetServiceEditing();
      }
      await loadProviderServices({ silent: true });
      setServiceFeedback({
        type: "success",
        text: response.message || "Service supprime avec succes.",
      });
    } catch (error) {
      setServiceFeedback({
        type: "error",
        text:
          error.response?.data?.message ||
          "La suppression du service a echoue.",
      });
    } finally {
      setServiceSubmitting(false);
    }
  };

  const onSelectCalendarDate = (id) => {
    setSelectedCalendarDateId(id);
    setCalendarFilterMode("all");
  };

  const toggleCalendarSlot = async (slotId) => {
    if (!selectedCalendarDateId) {
      return;
    }

    const slot = selectedCalendarDate?.slots.find((item) => item.id === slotId);
    if (!slot || slot.status === "reserved") {
      setCalendarMessage({
        type: "error",
        text: "Un creneau reserve ne peut pas etre modifie manuellement.",
      });
      return;
    }

    setUpdatingSlotIds((prev) => [...prev, slotId]);
    setCalendarMessage({ type: "", text: "" });

    try {
      const response = await toggleProviderCalendarSlot(slotId);
      await loadCalendar({ silent: true });
      setCalendarMessage({
        type: "success",
        text: response.message || "Creneau mis a jour.",
      });
    } catch (error) {
      setCalendarMessage({
        type: "error",
        text: error.response?.data?.message || "Impossible de mettre a jour ce creneau.",
      });
    } finally {
      setUpdatingSlotIds((prev) => prev.filter((id) => id !== slotId));
    }
  };

  const markEntireDayOccupied = async () => {
    if (!selectedCalendarDateId) {
      return;
    }

    setCalendarUpdating(true);
    setCalendarMessage({ type: "", text: "" });

    try {
      const response = await occupyProviderCalendarDay(selectedCalendarDateId);
      await loadCalendar({ silent: true });
      setCalendarMessage({
        type: "success",
        text: response.message || "Journee marquee comme occupee.",
      });
    } catch (error) {
      setCalendarMessage({
        type: "error",
        text: error.response?.data?.message || "Impossible de bloquer cette journee.",
      });
    } finally {
      setCalendarUpdating(false);
    }
  };

  const freeEntireDay = async () => {
    if (!selectedCalendarDateId) {
      return;
    }

    setCalendarUpdating(true);
    setCalendarMessage({ type: "", text: "" });

    try {
      const response = await freeProviderCalendarDay(selectedCalendarDateId);
      await loadCalendar({ silent: true });
      setCalendarMessage({
        type: "success",
        text: response.message || "Journee liberee.",
      });
    } catch (error) {
      setCalendarMessage({
        type: "error",
        text: error.response?.data?.message || "Impossible de liberer cette journee.",
      });
    } finally {
      setCalendarUpdating(false);
    }
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
            profileErrors={profileErrors}
            profileMessage={profileMessage}
            profileLoading={profileLoading}
            profileSubmitting={profileSubmitting}
            profilePhotoPreview={profilePhotoPreview}
            coverPhotoPreview={coverPhotoPreview}
            profileImageInputKey={profileImageInputKey}
            coverImageInputKey={coverImageInputKey}
            onProfileChange={onProfileChange}
            onProfileImageChange={onProfileImageChange}
            onSaveProfile={saveProfile}
          />
        );
      case "services":
        return (
          <ProviderServices
            editingServiceId={editingServiceId}
            serviceForm={serviceForm}
            serviceFormErrors={serviceFormErrors}
            serviceFeedback={serviceFeedback}
            servicesLoading={servicesLoading}
            serviceSubmitting={serviceSubmitting}
            imagePreviewUrl={serviceImagePreview}
            imageInputKey={imageInputKey}
            onServiceChange={onServiceChange}
            onServiceImageChange={onServiceImageChange}
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
            onSelectDate={onSelectCalendarDate}
            onToggleSlot={toggleCalendarSlot}
            onMarkDayOccupied={markEntireDayOccupied}
            onFreeDay={freeEntireDay}
            filterMode={calendarFilterMode}
            onFilterChange={setCalendarFilterMode}
            currentHour={currentHour}
            loadingCalendar={calendarLoading}
            calendarMessage={calendarMessage}
            calendarUpdating={calendarUpdating}
            updatingSlotIds={updatingSlotIds}
            monthMeta={calendarMonthMeta}
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
            onCalendarToggle={onSelectCalendarDate}
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
