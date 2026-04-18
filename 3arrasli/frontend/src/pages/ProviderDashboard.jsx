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
  deleteProviderCalendarBlock,
  getProviderCalendarWeek,
  occupyProviderCalendarWeekSlot,
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

const getWeekStartDate = (value = new Date()) => {
  const nextDate = new Date(value);
  const day = nextDate.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  nextDate.setDate(nextDate.getDate() + diff);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const toIsoDate = (value) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const [calendarDays, setCalendarDays] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarMessage, setCalendarMessage] = useState({ type: "", text: "" });
  const [calendarUpdatingSlotKeys, setCalendarUpdatingSlotKeys] = useState([]);
  const [calendarWeekStart, setCalendarWeekStart] = useState(() => toIsoDate(getWeekStartDate()));
  const [calendarWeekMeta, setCalendarWeekMeta] = useState({
    weekLabel: "",
    startDate: toIsoDate(getWeekStartDate()),
    endDate: toIsoDate(new Date(getWeekStartDate().getTime() + 6 * 24 * 60 * 60 * 1000)),
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
      const response = await getProviderCalendarWeek(calendarWeekStart);
      setCalendarDays(response.days || []);
      setCalendarWeekMeta({
        weekLabel: response.weekLabel || "",
        startDate: response.startDate || calendarWeekStart,
        endDate: response.endDate || calendarWeekStart,
      });
      if (!silent) {
        setCalendarMessage((current) => (current.type === "error" ? { type: "", text: "" } : current));
      }
    } catch (error) {
      const message = error.response?.data?.message || "Impossible de charger le calendrier hebdomadaire.";
      setCalendarMessage({ type: "error", text: message });
    } finally {
      if (!silent) {
        setCalendarLoading(false);
      }
    }
  };

  useEffect(() => {
    loadCalendar();
  }, [calendarWeekStart]);

  const selectedReservation =
    reservations.find((item) => item.id === selectedReservationId) || reservations[0];
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

  const goToPreviousWeek = () => {
    const currentStart = getWeekStartDate(new Date(calendarWeekStart));
    currentStart.setDate(currentStart.getDate() - 7);
    setCalendarWeekStart(toIsoDate(currentStart));
  };

  const goToNextWeek = () => {
    const currentStart = getWeekStartDate(new Date(calendarWeekStart));
    currentStart.setDate(currentStart.getDate() + 7);
    setCalendarWeekStart(toIsoDate(currentStart));
  };

  const toggleCalendarSlot = async (slot) => {
    if (!slot) {
      return;
    }

    if (slot.status === "reserved") {
      setCalendarMessage({
        type: "error",
        text: "Un creneau reserve ne peut pas etre modifie manuellement.",
      });
      return;
    }

    const slotKey = `${slot.date}-${slot.start_time}`;
    setCalendarUpdatingSlotKeys((prev) => [...prev, slotKey]);
    setCalendarMessage({ type: "", text: "" });

    try {
      let response;
      if (slot.status === "free") {
        response = await occupyProviderCalendarWeekSlot({
          date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
        });
      } else {
        response = await deleteProviderCalendarBlock(slot.blockId);
      }
      await loadCalendar({ silent: true });
      setCalendarMessage({
        type: "success",
        text: response.message || (slot.status === "free" ? "Creneau bloque avec succes." : "Creneau libere avec succes."),
      });
    } catch (error) {
      setCalendarMessage({
        type: "error",
        text: error.response?.data?.message || "Impossible de mettre a jour ce creneau.",
      });
    } finally {
      setCalendarUpdatingSlotKeys((prev) => prev.filter((key) => key !== slotKey));
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
            calendarDays={calendarDays}
            onToggleSlot={toggleCalendarSlot}
            loadingCalendar={calendarLoading}
            calendarMessage={calendarMessage}
            updatingSlotKeys={calendarUpdatingSlotKeys}
            weekMeta={calendarWeekMeta}
            onPreviousWeek={goToPreviousWeek}
            onNextWeek={goToNextWeek}
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
            calendarDates={calendarDays}
            recentChats={recentChats}
            onCalendarToggle={() => setActiveSection("calendar")}
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
