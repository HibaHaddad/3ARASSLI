import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./provider.css";
import ProviderBookings from "./provider/ProviderBookings";
import ProviderCalendar from "./provider/ProviderCalendar";
import ProviderChat from "./provider/ProviderChat";
import ProviderDashboardHome from "./provider/ProviderDashboardHome";
import ProviderLayout from "./provider/ProviderLayout";
import ProviderProfile from "./provider/ProviderProfile";
import ProviderServices from "./provider/ProviderServices";
import { resolveAssetUrl } from "../services/assets";
import { getStoredSession, getStoredToken, saveStoredUser } from "../services/auth";
import {
  deleteProviderCalendarBlock,
  getProviderCalendarWeek,
  occupyProviderCalendarWeekSlot,
} from "../services/providerCalendar";
import {
  getProviderChat,
  getProviderChats,
  markProviderChatRead,
  sendProviderChatMessage,
} from "../services/providerChats";
import { connectChatSocket, emitRealtimeMessage, emitTypingStatus, joinConversationRoom } from "../services/socket";
import { getProviderBookings, updateProviderBookingStatus } from "../services/providerBookings";
import { getProviderProfile, updateProviderProfile } from "../services/providerProfile";
import { validateServiceForm } from "./provider/serviceForm";
import {
  emptyServiceForm,
  initialProfile,
  initialPriorityActions,
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

const mergeProviderChat = (items, nextChat) => {
  if (!nextChat?.id) {
    return items;
  }

  const withoutChat = items.filter((chat) => chat.id !== nextChat.id);
  return [nextChat, ...withoutChat].sort((left, right) =>
    String(right.lastTimestamp || "").localeCompare(String(left.lastTimestamp || ""))
  );
};

const ProviderDashboard = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [reservationFilter, setReservationFilter] = useState("Tous");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReservationId, setSelectedReservationId] = useState(null);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingsMessage, setBookingsMessage] = useState({ type: "", text: "" });
  const [updatingBookingId, setUpdatingBookingId] = useState(null);
  const [profileForm, setProfileForm] = useState(initialProfile);
  const [profileMessage, setProfileMessage] = useState({ type: "", text: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [profileCompletionDismissed, setProfileCompletionDismissed] = useState(false);
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
  const [serviceImageFiles, setServiceImageFiles] = useState([]);
  const [serviceImagePreviews, setServiceImagePreviews] = useState([]);
  const [serviceRemovedImageIds, setServiceRemovedImageIds] = useState([]);
  const serviceImagePreviewsRef = useRef([]);
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
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [loadingChats, setLoadingChats] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatFeedback, setChatFeedback] = useState({ type: "", text: "" });
  const [typingLabel, setTypingLabel] = useState("");
  const [activeClientOnline, setActiveClientOnline] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);
  const joinedChatIdsRef = useRef(new Set());
  const typingTimeoutRef = useRef(null);
  const stopTypingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeChatIdRef = useRef(null);

  useEffect(() => {
    setSidebarOpen(false);
  }, [activeSection]);

  const loadBookings = async () => {
    setLoadingBookings(true);
    setBookingsMessage({ type: "", text: "" });

    try {
      const response = await getProviderBookings();
      const nextBookings = response.bookings || [];
      setReservations(nextBookings);
      setSelectedReservationId((currentId) => {
        if (nextBookings.some((booking) => booking.id === currentId)) {
          return currentId;
        }
        return nextBookings[0]?.id ?? null;
      });
    } catch (error) {
      setBookingsMessage({
        type: "error",
        text: error.response?.data?.message || "Impossible de charger vos reservations.",
      });
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

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
      setProfileLoaded(true);
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

  const loadChats = useCallback(async () => {
    setLoadingChats(true);
    setChatFeedback({ type: "", text: "" });

    try {
      const response = await getProviderChats();
      const nextChats = response.chats || [];
      setChats(nextChats);
      setActiveChatId((currentId) => {
        if (nextChats.some((chat) => chat.id === currentId)) {
          return currentId;
        }
        return null;
      });
    } catch (error) {
      setChatFeedback({
        type: "error",
        text: error.response?.data?.message || "Impossible de charger vos conversations.",
      });
      setChats([]);
      setActiveChatId(null);
    } finally {
      setLoadingChats(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const activeChat = chats.find((chat) => chat.id === activeChatId) || null;

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
    setActiveClientOnline(false);
  }, [activeChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeChat?.messages, typingLabel]);

  useEffect(() => {
    if (!activeChatId || !activeChat?.unread) {
      return;
    }

    markProviderChatRead(activeChatId)
      .then((response) => {
        if (response.chat) {
          setChats((prev) =>
            prev.map((chat) => (chat.id === response.chat.id ? response.chat : chat))
          );
        }
      })
      .catch(() => {
        setChats((prev) =>
          prev.map((chat) => (chat.id === activeChatId ? { ...chat, unread: 0 } : chat))
        );
      });
  }, [activeChatId, activeChat?.unread]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      return undefined;
    }

    const socket = connectChatSocket(token);
    socketRef.current = socket;

    socket.on("socket:ready", () => {
      joinedChatIdsRef.current.clear();
      setSocketConnected(true);
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("provider_chat_updated", ({ chat }) => {
      if (!chat) {
        return;
      }

      setChats((prev) => mergeProviderChat(prev, chat));
      if (chat.id === activeChatIdRef.current) {
        setTypingLabel("");
      }
    });

    socket.on("typing_status", ({ user_id, is_typing }) => {
      if (String(user_id) !== String(activeChatIdRef.current)) {
        return;
      }

      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }

      setTypingLabel(is_typing ? "Le client ecrit..." : "");
      if (is_typing) {
        typingTimeoutRef.current = window.setTimeout(() => setTypingLabel(""), 1600);
      }
    });

    socket.on("presence:update", ({ client_id, client_online }) => {
      if (String(client_id) === String(activeChatIdRef.current)) {
        setActiveClientOnline(Boolean(client_online));
      }
    });

    socket.on("socket:error", ({ message }) => {
      if (message) {
        setChatFeedback({ type: "error", text: message });
      }
    });

    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      if (stopTypingTimeoutRef.current) {
        window.clearTimeout(stopTypingTimeoutRef.current);
      }
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
      joinedChatIdsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!socketRef.current || !socketConnected || !activeChatId) {
      return;
    }

    if (!joinedChatIdsRef.current.has(activeChatId)) {
      joinConversationRoom(socketRef.current, activeChatId);
      joinedChatIdsRef.current.add(activeChatId);
    }
  }, [activeChatId, socketConnected]);

  const filteredReservations = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return reservations.filter((item) => {
      const filterMatch = reservationFilter === "Tous" || item.status === reservationFilter;
      const searchMatch =
        !normalized ||
        String(item.client || "").toLowerCase().includes(normalized) ||
        String(item.service || "").toLowerCase().includes(normalized) ||
        String(item.location || "").toLowerCase().includes(normalized);
      return filterMatch && searchMatch;
    });
  }, [reservationFilter, reservations, searchTerm]);

  const selectedReservation =
    filteredReservations.find((item) => item.id === selectedReservationId) ||
    filteredReservations[0] ||
    null;

  useEffect(() => {
    if (filteredReservations.length === 0) {
      setSelectedReservationId(null);
      return;
    }

    if (!filteredReservations.some((item) => item.id === selectedReservationId)) {
      setSelectedReservationId(filteredReservations[0].id);
    }
  }, [filteredReservations, selectedReservationId]);

  const upcomingReservations = useMemo(
    () =>
      [...reservations]
        .filter((item) => item.status !== "Refusee")
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 3),
    [reservations]
  );

  const recentChats = useMemo(() => chats.slice(0, 3), [chats]);

  const dashboardStats = useMemo(() => {
    const pending = reservations.filter((item) => item.status === "En attente").length;
    const validated = reservations.filter((item) => item.status === "Validee").length;
    const unread = chats.reduce((total, chat) => total + Number(chat.unread || 0), 0);
    const activeServices = services.filter((service) => service.status !== "Inactif").length;
    const freeDates = calendarDays.filter((day) => day.status === "free").length;
    const totalRevenue = reservations
      .filter((item) => item.status !== "Refusee")
      .reduce((total, item) => total + Number(item.amount || 0), 0);
    const totalDemand = Math.max(pending + validated, 1);
    const totalCalendarDays = Math.max(calendarDays.length, 1);
    const availabilityProgress = Math.round((freeDates / totalCalendarDays) * 100);
    const revenueProgress = Math.min(Math.round(totalRevenue / 80), 100);

    return [
      {
        id: "revenue",
        label: "CA estime",
        value: `${new Intl.NumberFormat("fr-FR").format(totalRevenue)} TND`,
        detail: "potentiel des evenements actifs",
        tone: "burgundy",
        icon: "💎",
        trend: "Signature premium",
        progress: revenueProgress,
      },
      {
        id: "requests",
        label: "Demandes",
        value: pending,
        detail: "couples a confirmer",
        tone: "rose",
        icon: "💌",
        trend: pending > 0 ? "A traiter aujourd'hui" : "Aucune urgence",
        progress: Math.round((pending / totalDemand) * 100),
      },
      {
        id: "availability",
        label: "Disponibilite",
        value: `${availabilityProgress}%`,
        detail: "dates encore ouvertes",
        tone: "gold",
        icon: "🗓️",
        trend: `${freeDates} jour(s) libres`,
        progress: availabilityProgress,
      },
      {
        id: "unread",
        label: "Messages",
        value: unread,
        detail: "reponses client en attente",
        tone: "champagne",
        icon: "💬",
        trend: unread > 0 ? "Reponse conseillee" : "Inbox maitrisee",
        progress: unread > 0 ? Math.min(unread * 22, 100) : 100,
      },
      {
        id: "services",
        label: "Vitrine",
        value: activeServices,
        detail: "prestations visibles",
        tone: "soft",
        icon: "✨",
        trend: "Catalogue public",
        progress: Math.min(activeServices * 24, 100),
      },
    ];
  }, [calendarDays, chats, reservations, services]);

  const heroSummary = useMemo(() => {
    const pending = reservations.filter((item) => item.status === "En attente").length;
    const weekBookings = reservations.filter((item) => item.status === "Validee").slice(0, 2).length;
    return `Vous avez ${pending} demande(s) en attente et ${weekBookings} prestation(s) deja validee(s) sur les prochaines semaines.`;
  }, [reservations]);

  const currentHour = useMemo(() => `${String(new Date().getHours()).padStart(2, "0")}:`, []);

  const profileCompletion = useMemo(() => {
    const requiredFields = [
      { key: "name", label: "Nom de l'entreprise" },
      { key: "email", label: "Email professionnel" },
      { key: "phone", label: "Telephone" },
      { key: "city", label: "Ville" },
      { key: "category", label: "Categorie" },
      { key: "description", label: "Presentation" },
      { key: "profilePhoto", label: "Photo de profil" },
      { key: "coverPhoto", label: "Photo de couverture" },
    ];

    const missingFields = requiredFields.filter(({ key }) => {
      const value = profileForm[key];
      return !String(value || "").trim();
    });

    const completed = requiredFields.length - missingFields.length;
    return {
      missingFields,
      progress: Math.round((completed / requiredFields.length) * 100),
    };
  }, [profileForm]);

  const shouldShowProfileCompletionPopup =
    profileLoaded &&
    !profileLoading &&
    !profileCompletionDismissed &&
    activeSection !== "profile" &&
    profileCompletion.missingFields.length > 0;

  const goToProfileCompletion = () => {
    setActiveSection("profile");
    setSidebarOpen(false);
    setProfileCompletionDismissed(true);
  };

  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
    setSidebarOpen(false);
  };

  const updateReservationStatus = async (id, status) => {
    if (!id || updatingBookingId) {
      return;
    }

    setUpdatingBookingId(id);
    setBookingsMessage({ type: "", text: "" });

    try {
      const response = await updateProviderBookingStatus(id, status);
      const updatedBooking = response.booking;
      setReservations((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updatedBooking } : item))
      );
      setSelectedReservationId(id);
      setBookingsMessage({
        type: "success",
        text: response.message || "Statut de la reservation mis a jour avec succes.",
      });
      await loadCalendar({ silent: true });
    } catch (error) {
      setBookingsMessage({
        type: "error",
        text: error.response?.data?.message || "Impossible de mettre a jour cette reservation.",
      });
    } finally {
      setUpdatingBookingId(null);
    }
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
    const files = Array.from(event.target.files || []);
    setServiceFormErrors((prev) => ({ ...prev, image: "" }));

    if (files.length === 0) {
      return;
    }

    const nextPreviews = files.map((file) => ({
      key: `${file.name}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
      url: URL.createObjectURL(file),
      name: file.name,
      isNew: true,
    }));

    setServiceImageFiles((prev) => [...prev, ...files]);
    setServiceImagePreviews((prev) => [...prev, ...nextPreviews]);
    setImageInputKey((prev) => prev + 1);
    setServiceFeedback({
      type: "success",
      text: files.length > 1 ? "Images chargees avec succes." : "Image chargee avec succes.",
    });
  };

  useEffect(() => {
    serviceImagePreviewsRef.current = serviceImagePreviews;
  }, [serviceImagePreviews]);

  useEffect(() => {
    return () => {
      serviceImagePreviewsRef.current.forEach((preview) => {
        if (preview.url?.startsWith("blob:")) {
          URL.revokeObjectURL(preview.url);
        }
      });
    };
  }, []);

  const removeServiceImagePreview = (preview) => {
    if (preview.url?.startsWith("blob:")) {
      URL.revokeObjectURL(preview.url);
    }

    setServiceImagePreviews((prev) => prev.filter((item) => item.key !== preview.key));

    if (preview.isNew) {
      setServiceImageFiles((prev) => {
        const nextFiles = [...prev];
        const previewIndex = serviceImagePreviews.filter((item) => item.isNew).findIndex((item) => item.key === preview.key);
        if (previewIndex >= 0) {
          nextFiles.splice(previewIndex, 1);
        }
        return nextFiles;
      });
    } else if (preview.id) {
      setServiceRemovedImageIds((prev) => [...new Set([...prev, preview.id])]);
    }
  };

  const resetServiceEditing = () => {
    serviceImagePreviews.forEach((preview) => {
      if (preview.url?.startsWith("blob:")) {
        URL.revokeObjectURL(preview.url);
      }
    });
    setEditingServiceId(null);
    setServiceFormErrors({});
    setServiceImageFiles([]);
    setServiceImagePreviews([]);
    setServiceRemovedImageIds([]);
    setImageInputKey((prev) => prev + 1);
    setServiceForm(emptyServiceForm);
  };

  const submitService = async (event) => {
    event.preventDefault();

    const validationErrors = validateServiceForm(serviceForm, {
      imageFiles: serviceImageFiles,
      hasExistingImages: serviceImagePreviews.some((preview) => !preview.isNew),
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
    serviceImageFiles.forEach((file) => {
      payload.append("images[]", file);
    });
    serviceRemovedImageIds.forEach((imageId) => {
      payload.append("removed_image_ids[]", String(imageId));
    });

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
    serviceImagePreviews.forEach((preview) => {
      if (preview.url?.startsWith("blob:")) {
        URL.revokeObjectURL(preview.url);
      }
    });
    const savedImages = Array.isArray(service.images) && service.images.length > 0
      ? service.images
      : service.image
        ? [{ id: null, image_path: service.image, url: service.image }]
        : [];
    setServiceForm({
      title: service.title,
      price: String(service.price),
      description: service.description,
      image: service.image || "",
      category: service.category,
      status: service.status || "Actif",
    });
    setServiceFormErrors({});
    setServiceImageFiles([]);
    setServiceImagePreviews(
      savedImages.map((image, index) => ({
        key: `saved-${image.id || index}`,
        id: image.id,
        url: resolveAssetUrl(image.image_path || image.url || image),
        name: `Image ${index + 1}`,
        isNew: false,
      }))
    );
    setServiceRemovedImageIds([]);
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

  const sendMessage = async (event) => {
    event.preventDefault();

    const content = messageDraft.trim();
    if (!content || !activeChatId || sendingMessage) {
      return;
    }

    setSendingMessage(true);
    setChatFeedback({ type: "", text: "" });
    setMessageDraft("");
    emitTypingStatus(socketRef.current, activeChatId, false);

    try {
      const socketResponse = await emitRealtimeMessage(socketRef.current, activeChatId, content);
      if (!socketResponse?.success) {
        throw new Error(socketResponse?.message || "Impossible d'envoyer ce message.");
      }

      setChatFeedback({
        type: "success",
        text: socketResponse.message || "Message envoye avec succes.",
      });
    } catch (socketError) {
      try {
        const response = await sendProviderChatMessage(activeChatId, content);
        if (response.chat) {
          setChats((prev) => mergeProviderChat(prev, response.chat));
        }
        setChatFeedback({
          type: "success",
          text: response.message || "Message envoye avec succes.",
        });
      } catch (error) {
        setMessageDraft(content);
        setChatFeedback({
          type: "error",
          text: error.response?.data?.message || socketError.message || "Impossible d'envoyer ce message.",
        });
      }
    } finally {
      setSendingMessage(false);
    }
  };

  const handleMessageDraftChange = (event) => {
    const nextValue = event.target.value;
    setMessageDraft(nextValue);

    if (!activeChatId) {
      return;
    }

    emitTypingStatus(socketRef.current, activeChatId, Boolean(nextValue.trim()));
    if (stopTypingTimeoutRef.current) {
      window.clearTimeout(stopTypingTimeoutRef.current);
    }
    stopTypingTimeoutRef.current = window.setTimeout(() => {
      emitTypingStatus(socketRef.current, activeChatId, false);
    }, 1100);
  };

  const openChat = async (chatId) => {
    if (!chatId || chatId === activeChatId) {
      return;
    }

    setActiveChatId(chatId);
    setTypingLabel("");
    setChatFeedback({ type: "", text: "" });
    setChats((prev) =>
      prev.map((chat) => (chat.id === chatId ? { ...chat, unread: 0 } : chat))
    );

    if (socketRef.current && !joinedChatIdsRef.current.has(chatId)) {
      joinConversationRoom(socketRef.current, chatId);
      joinedChatIdsRef.current.add(chatId);
    }

    try {
      const [chatResponse, readResponse] = await Promise.all([
        getProviderChat(chatId),
        markProviderChatRead(chatId),
      ]);
      const updatedChat = readResponse.chat || chatResponse.chat;
      if (updatedChat) {
        setChats((prev) => mergeProviderChat(prev, updatedChat));
      }
    } catch (error) {
      setChatFeedback({
        type: "error",
        text: error.response?.data?.message || "Impossible d'ouvrir cette conversation.",
      });
    }
  };

  const goToReservation = (reservationId) => {
    if (reservationId) {
      setSelectedReservationId(reservationId);
    }
    setActiveSection("reservations");
  };

  const goToCalendarForReservation = (reservation) => {
    if (reservation?.id) {
      setSelectedReservationId(reservation.id);
    }
    if (reservation?.date) {
      setCalendarWeekStart(toIsoDate(getWeekStartDate(new Date(reservation.date))));
    }
    setActiveSection("calendar");
  };

  const goToChat = async (chatId) => {
    setActiveSection("chat");
    if (chatId) {
      await openChat(chatId);
    }
  };

  const contactReservationClient = async (reservation) => {
    if (reservation?.id) {
      setSelectedReservationId(reservation.id);
    }
    if (!reservation?.clientId) {
      setActiveSection("chat");
      setChatFeedback({
        type: "error",
        text: "Client introuvable pour cette reservation.",
      });
      return;
    }
    await goToChat(reservation.clientId);
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
            loadingBookings={loadingBookings}
            bookingsMessage={bookingsMessage}
            updatingBookingId={updatingBookingId}
            onSelectReservation={setSelectedReservationId}
            onUpdateStatus={updateReservationStatus}
            onViewInCalendar={goToCalendarForReservation}
            onContactClient={contactReservationClient}
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
            imagePreviews={serviceImagePreviews}
            imageInputKey={imageInputKey}
            onServiceChange={onServiceChange}
            onServiceImageChange={onServiceImageChange}
            onRemoveServiceImage={removeServiceImagePreview}
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
            onOpenChat={goToChat}
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
            onMessageDraftChange={handleMessageDraftChange}
            onSendMessage={sendMessage}
            loadingChats={loadingChats}
            sendingMessage={sendingMessage}
            chatFeedback={chatFeedback}
            typingLabel={typingLabel}
            activePresenceLabel={activeClientOnline ? "En ligne" : "Hors ligne"}
            messagesEndRef={messagesEndRef}
            onMessageDraftBlur={() => emitTypingStatus(socketRef.current, activeChatId, false)}
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
            dashboardStats={dashboardStats}
            onCalendarToggle={(day) => {
              if (day?.date) {
                setCalendarWeekStart(toIsoDate(getWeekStartDate(new Date(day.date))));
              }
              setActiveSection("calendar");
            }}
            onGoToSection={setActiveSection}
            onOpenReservation={goToReservation}
            onOpenChat={goToChat}
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
      {shouldShowProfileCompletionPopup ? (
        <div className="provider-modal-overlay provider-profile-task-overlay" role="presentation">
          <section
            className="provider-profile-task-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="provider-profile-task-title"
            style={{ "--provider-profile-progress": `${profileCompletion.progress}%` }}
          >
            <button
              type="button"
              className="provider-modal-close provider-profile-task-close"
              onClick={() => setProfileCompletionDismissed(true)}
              aria-label="Fermer"
            >
              <span />
              <span />
            </button>

            <div className="provider-profile-task-visual" aria-hidden="true">
              <div className="provider-profile-task-ring">
                <strong>{profileCompletion.progress}%</strong>
                <span>Profil</span>
              </div>
            </div>

            <div className="provider-profile-task-content">
              <span className="provider-section-label">Action recommandee</span>
              <h3 id="provider-profile-task-title">Votre vitrine merite quelques details de plus</h3>
              <p>
                Les clients reservent plus facilement quand votre profil presente clairement votre
                style, votre ville, vos contacts et vos photos principales.
              </p>

              <div className="provider-profile-task-missing">
                {profileCompletion.missingFields.slice(0, 5).map((field) => (
                  <span key={field.key}>{field.label}</span>
                ))}
                {profileCompletion.missingFields.length > 5 ? (
                  <span>+{profileCompletion.missingFields.length - 5} autre(s)</span>
                ) : null}
              </div>

              <div className="provider-profile-task-actions">
                <button type="button" className="provider-primary-btn" onClick={goToProfileCompletion}>
                  Completer mon profil
                </button>
                <button
                  type="button"
                  className="provider-ghost-btn"
                  onClick={() => setProfileCompletionDismissed(true)}
                >
                  Plus tard
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </ProviderLayout>
  );
};

export default ProviderDashboard;
