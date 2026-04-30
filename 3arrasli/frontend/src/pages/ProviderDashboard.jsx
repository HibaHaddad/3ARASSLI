import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./provider.css";
import ProviderBookings from "./provider/ProviderBookings";
import ProviderCalendar from "./provider/ProviderCalendar";
import ProviderChat from "./provider/ProviderChat";
import ProviderDashboardHome from "./provider/ProviderDashboardHome";
import ProviderLayout from "./provider/ProviderLayout";
import ProviderPacks from "./provider/ProviderPacks";
import ProviderProfile from "./provider/ProviderProfile";
import ProviderServices from "./provider/ProviderServices";
import { resolveAssetUrl } from "../services/assets";
import { getStoredSession, getStoredToken, saveStoredUser } from "../services/auth";
import { IMAGE_TOO_LARGE_MESSAGE, showToast, validateImageFileSize } from "../services/toast";
import {
  deleteProviderCalendarBlock,
  getProviderCalendarWeek,
  occupyProviderCalendarWeekSlot,
  updateProviderAppointmentStatus,
} from "../services/providerCalendar";
import {
  getProviderChat,
  getProviderChats,
  markProviderChatRead,
  sendProviderChatMessage,
} from "../services/providerChats";
import { connectChatSocket, emitRealtimeMessage, emitTypingStatus, joinConversationRoom } from "../services/socket";
import { getProviderBookings } from "../services/providerBookings";
import {
  getProviderNotifications,
  markProviderNotificationRead,
} from "../services/providerNotifications";
import {
  getProviderPack,
  getProviderPacks,
  respondProviderPack,
} from "../services/providerPacks";
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

const isMobileSidebarViewport = () => window.innerWidth <= 980;

const mergeProviderChat = (items, nextChat) => {
  if (!nextChat?.id) {
    return items;
  }

  const withoutChat = items.filter((chat) => chat.id !== nextChat.id);
  return [nextChat, ...withoutChat].sort((left, right) =>
    String(right.lastTimestamp || "").localeCompare(String(left.lastTimestamp || ""))
  );
};

const upsertProviderRealtimeMessage = (chat, message, providerId, isActiveChat) => {
  const nextMessage = {
    id: message.id,
    author: Number(message.sender_id) === Number(providerId) ? "provider" : "client",
    text: message.content,
    time: message.timestamp
      ? new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "--",
    timestamp: message.timestamp,
  };

  const alreadyExists = Array.isArray(chat.messages) && chat.messages.some((item) => item.id === nextMessage.id);
  const messages = alreadyExists ? chat.messages : [...(chat.messages || []), nextMessage];

  return {
    ...chat,
    messages,
    excerpt: message.content,
    time: nextMessage.time,
    lastTimestamp: message.timestamp || chat.lastTimestamp,
    unread:
      Number(message.sender_id) === Number(providerId) || isActiveChat
        ? 0
        : Number(chat.unread || 0) + 1,
  };
};

const ProviderDashboard = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobileSidebarViewport());
  const [reservations, setReservations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReservationId, setSelectedReservationId] = useState(null);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingsMessage, setBookingsMessage] = useState({ type: "", text: "" });
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
  const [calendarTargetSlot, setCalendarTargetSlot] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState(null);
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
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsMessage, setNotificationsMessage] = useState("");
  const [packs, setPacks] = useState([]);
  const [packsLoading, setPacksLoading] = useState(false);
  const [activePackId, setActivePackId] = useState(null);
  const [respondingPack, setRespondingPack] = useState(false);
  const currentProviderId = Number(getStoredSession()?.user?.id || 0);
  const socketRef = useRef(null);
  const joinedChatIdsRef = useRef(new Set());
  const typingTimeoutRef = useRef(null);
  const stopTypingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeChatIdRef = useRef(null);

  useEffect(() => {
    [bookingsMessage, profileMessage, serviceFeedback, calendarMessage, chatFeedback].forEach((feedback) => {
      if (feedback?.type && feedback?.text) {
        showToast(feedback.type, feedback.text);
      }
    });
  }, [bookingsMessage, profileMessage, serviceFeedback, calendarMessage, chatFeedback]);

  useEffect(() => {
    if (notificationsMessage) {
      showToast("error", notificationsMessage);
    }
  }, [notificationsMessage]);

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

  const loadNotifications = async (options = {}) => {
    const { silent = false } = options;
    if (!silent) {
      setNotificationsLoading(true);
    }
    setNotificationsMessage("");

    try {
      const response = await getProviderNotifications();
      setNotifications(response.notifications || []);
    } catch (error) {
      setNotificationsMessage(
        error.response?.data?.message || "Impossible de charger les notifications."
      );
    } finally {
      if (!silent) {
        setNotificationsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadProviderPacksData = async (options = {}) => {
    const { silent = false } = options;
    if (!silent) {
      setPacksLoading(true);
    }

    try {
      const response = await getProviderPacks();
      const nextPacks = response.packs || [];
      setPacks(nextPacks);
      setActivePackId((currentId) => {
        if (nextPacks.some((pack) => pack.id === currentId)) {
          return currentId;
        }
        return nextPacks[0]?.id || null;
      });
    } catch (error) {
      setNotificationsMessage(error.response?.data?.message || "Impossible de charger les invitations pack.");
    } finally {
      if (!silent) {
        setPacksLoading(false);
      }
    }
  };

  useEffect(() => {
    loadProviderPacksData();
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

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(!isMobileSidebarViewport());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const activeChat = chats.find((chat) => chat.id === activeChatId) || null;
  const activePack = packs.find((pack) => pack.id === activePackId) || null;

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
      console.log("[provider-chat] socket:ready");
      joinedChatIdsRef.current.clear();
      setSocketConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("[provider-chat] disconnect");
      setSocketConnected(false);
    });

    socket.on("provider_chat_updated", ({ chat }) => {
      if (!chat) {
        return;
      }

      console.log("[provider-chat] provider_chat_updated", { chatId: chat.id });
      setChats((prev) => mergeProviderChat(prev, chat));
      if (chat.id === activeChatIdRef.current) {
        setTypingLabel("");
      }
    });

    socket.on("receive_message", ({ message, room, client_id, provider_id }) => {
      if (!message) {
        return;
      }

      const chatId =
        Number(message.sender_id) === Number(currentProviderId)
          ? Number(message.receiver_id)
          : Number(message.sender_id);

      console.log("[provider-chat] receive_message", {
        room,
        client_id,
        provider_id,
        messageId: message.id,
        chatId,
      });

      setChats((prev) => {
        const existingChat = prev.find((chat) => chat.id === chatId);
        if (!existingChat) {
          return prev;
        }

        return mergeProviderChat(
          prev,
          upsertProviderRealtimeMessage(
            existingChat,
            message,
            currentProviderId,
            existingChat.id === activeChatIdRef.current
          )
        );
      });
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
    if (!socketRef.current || !socketConnected) {
      return;
    }

    chats.forEach((chat) => {
      if (joinedChatIdsRef.current.has(chat.id)) {
        return;
      }
      console.log("[provider-chat] join_conversation", { chatId: chat.id });
      joinConversationRoom(socketRef.current, chat.id);
      joinedChatIdsRef.current.add(chat.id);
    });
  }, [chats, socketConnected]);

  const filteredReservations = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return reservations.filter((item) => {
      const searchMatch =
        !normalized ||
        String(item.client || "").toLowerCase().includes(normalized) ||
        String(item.service || "").toLowerCase().includes(normalized) ||
        String(item.location || "").toLowerCase().includes(normalized);
      return searchMatch;
    });
  }, [reservations, searchTerm]);

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

  useEffect(() => {
    if (activeSection !== "calendar" || !calendarTargetSlot) {
      return;
    }

    const target = window.document.querySelector(
      `[data-slot-date="${calendarTargetSlot.date}"][data-slot-time="${calendarTargetSlot.time}"]`
    );
    target?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  }, [activeSection, calendarDays, calendarTargetSlot]);

  const upcomingReservations = useMemo(
    () =>
      [...reservations]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 3),
    [reservations]
  );

  const recentChats = useMemo(() => chats.slice(0, 3), [chats]);

  const dashboardStats = useMemo(() => {
    const reservationCount = reservations.length;
    const unread = chats.reduce((total, chat) => total + Number(chat.unread || 0), 0);
    const activeServices = services.filter((service) => service.status !== "Inactif").length;
    const freeDates = calendarDays.filter((day) => day.status === "free").length;
    const totalRevenue = reservations.reduce((total, item) => total + Number(item.amount || 0), 0);
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
        label: "Reservations",
        value: reservationCount,
        detail: "creneaux affectes",
        tone: "rose",
        icon: "💌",
        trend: reservationCount > 0 ? "Planning actif" : "Aucune reservation",
        progress: Math.min(reservationCount * 20, 100),
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
    const nextBookings = reservations.slice(0, 3).length;
    return `Vous avez ${reservations.length} reservation(s) enregistree(s), dont ${nextBookings} a suivre en priorite sur les prochaines semaines.`;
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
    if (isMobileSidebarViewport()) {
      setSidebarOpen(false);
    }
    setProfileCompletionDismissed(true);
  };

  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
    if (isMobileSidebarViewport()) {
      setSidebarOpen(false);
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
    const errorField = fieldName === "profilePhoto" ? "profilePhoto" : "coverPhoto";

    if (file && !validateImageFileSize(file)) {
      setProfileErrors((prev) => ({ ...prev, [errorField]: IMAGE_TOO_LARGE_MESSAGE }));
      setProfileMessage({ type: "error", text: IMAGE_TOO_LARGE_MESSAGE });
      return;
    }

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

    if (!validateImageFileSize(files)) {
      setServiceFormErrors((prev) => ({ ...prev, image: IMAGE_TOO_LARGE_MESSAGE }));
      setServiceFeedback({ type: "error", text: IMAGE_TOO_LARGE_MESSAGE });
      setImageInputKey((prev) => prev + 1);
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

    if (slot.eventType === "appointment") {
      setSelectedAppointment(slot);
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

  const updateAppointmentStatus = async (appointment, status) => {
    if (!appointment?.appointmentId || updatingAppointmentId) {
      return;
    }

    setUpdatingAppointmentId(appointment.appointmentId);
    setCalendarMessage({ type: "", text: "" });

    try {
      const response = await updateProviderAppointmentStatus(appointment.appointmentId, status);
      setCalendarMessage({
        type: "success",
        text: response.message || "Rendez-vous mis a jour avec succes.",
      });
      setSelectedAppointment(null);
      await loadCalendar({ silent: true });
      await loadNotifications({ silent: true });
    } catch (error) {
      setCalendarMessage({
        type: "error",
        text: error.response?.data?.message || "Impossible de mettre a jour ce rendez-vous.",
      });
    } finally {
      setUpdatingAppointmentId(null);
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
      console.log("[provider-chat] send_message", {
        receiverId: activeChatId,
        success: socketResponse?.success,
      });
      if (!socketResponse?.success) {
        throw new Error(socketResponse?.message || "Impossible d'envoyer ce message.");
      }
    } catch (socketError) {
      try {
        const response = await sendProviderChatMessage(activeChatId, content);
        if (response.chat) {
          setChats((prev) => mergeProviderChat(prev, response.chat));
        }
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

    if (socketRef.current) {
      // Re-join to trigger an immediate presence:update for accurate online status.
      joinConversationRoom(socketRef.current, chatId);
      if (!joinedChatIdsRef.current.has(chatId)) {
        joinedChatIdsRef.current.add(chatId);
      }
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
    if (reservation?.date && reservation?.time && reservation.time !== "--") {
      setCalendarTargetSlot({
        reservationId: reservation.id,
        date: reservation.date,
        time: reservation.time,
      });
    }
    setActiveSection("calendar");
  };

  const openNotification = async (notification) => {
    if (!notification) {
      return;
    }

    if (!notification.isRead) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item))
      );
      markProviderNotificationRead(notification.id).catch(() => {
        setNotifications((prev) =>
          prev.map((item) => (item.id === notification.id ? { ...item, isRead: false } : item))
        );
      });
    }

    const target = notification.target || notification.reservation;
    if (notification.type === "contract_provider_signature_required") {
      if (notification.reservationId) {
        setSelectedReservationId(notification.reservationId);
      }
      setActiveSection("reservations");
      return;
    }

    if (target?.kind === "pack" || notification.packId) {
      setActiveSection("packs");
      const packId = notification.packId || target?.packId || target?.id;
      if (packId) {
        try {
          const response = await getProviderPack(packId);
          const pack = response.pack;
          setPacks((prev) => {
            const withoutPack = prev.filter((item) => item.id !== pack.id);
            return [pack, ...withoutPack];
          });
          setActivePackId(pack.id);
        } catch (error) {
          setNotificationsMessage(error.response?.data?.message || "Impossible d'ouvrir ce pack.");
        }
      }
      return;
    }
    if (target?.date) {
      setCalendarWeekStart(toIsoDate(getWeekStartDate(new Date(target.date))));
      setCalendarTargetSlot({
        reservationId: notification.reservationId || null,
        appointmentId: notification.appointmentId || null,
        date: target.date,
        time: target.time,
      });
    }
    if (notification.reservationId) {
      setSelectedReservationId(notification.reservationId);
    }
    setActiveSection("calendar");
  };

  const goToChat = async (chatId) => {
    setActiveSection("chat");
    if (chatId) {
      await openChat(chatId);
    }
  };

  const openPack = async (packId) => {
    if (!packId) {
      return;
    }
    setActiveSection("packs");
    setActivePackId(packId);
    try {
      const response = await getProviderPack(packId);
      const pack = response.pack;
      setPacks((prev) => {
        const withoutPack = prev.filter((item) => item.id !== pack.id);
        return [pack, ...withoutPack];
      });
    } catch (error) {
      setNotificationsMessage(error.response?.data?.message || "Impossible d'ouvrir ce pack.");
    }
  };

  const handlePackResponse = async (packId, decision) => {
    if (!packId || respondingPack) {
      return;
    }

    setRespondingPack(true);
    try {
      const response = await respondProviderPack(packId, decision);
      const pack = response.pack;
      setPacks((prev) => {
        const withoutPack = prev.filter((item) => item.id !== pack.id);
        return [pack, ...withoutPack];
      });
      setActivePackId(pack.id);
      await loadNotifications({ silent: true });
      showToast("success", response.message || "Votre reponse a ete enregistree.");
    } catch (error) {
      showToast("error", error.response?.data?.message || "Impossible de repondre a cette invitation.");
    } finally {
      setRespondingPack(false);
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
            searchTerm={searchTerm}
            onSearchChange={(event) => setSearchTerm(event.target.value)}
            reservations={filteredReservations}
            selectedReservation={selectedReservation}
            selectedReservationId={selectedReservationId}
            loadingBookings={loadingBookings}
            onSelectReservation={setSelectedReservationId}
            onViewInCalendar={goToCalendarForReservation}
            onContactClient={contactReservationClient}
            onRefreshBookings={loadBookings}
          />
        );
      case "profile":
        return (
          <ProviderProfile
            profileForm={profileForm}
            profileErrors={profileErrors}
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
            updatingSlotKeys={calendarUpdatingSlotKeys}
            targetSlot={calendarTargetSlot}
            weekMeta={calendarWeekMeta}
            onPreviousWeek={goToPreviousWeek}
            onNextWeek={goToNextWeek}
            onOpenChat={goToChat}
            selectedAppointment={selectedAppointment}
            updatingAppointmentId={updatingAppointmentId}
            onCloseAppointment={() => setSelectedAppointment(null)}
            onUpdateAppointmentStatus={updateAppointmentStatus}
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
            typingLabel={typingLabel}
            activePresenceLabel={activeClientOnline ? "En ligne" : "Hors ligne"}
            messagesEndRef={messagesEndRef}
            onMessageDraftBlur={() => emitTypingStatus(socketRef.current, activeChatId, false)}
          />
        );
      case "packs":
        return (
          <ProviderPacks
            packs={packs}
            activePack={activePack}
            loading={packsLoading}
            onSelectPack={openPack}
            onRespond={handlePackResponse}
            responding={respondingPack}
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
      notifications={notifications}
      notificationsLoading={notificationsLoading}
      notificationsError={notificationsMessage}
      onNotificationClick={openNotification}
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
