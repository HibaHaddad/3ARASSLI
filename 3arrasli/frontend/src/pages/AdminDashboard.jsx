
import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import DataTable from "../components/admin/DataTable";
import Modal from "../components/admin/Modal";
import api, { API_BASE_URL } from "../services/api";
import { resolveAssetUrl } from "../services/assets";
import {
  deleteAdminReview,
  getAdminAppointments,
  getAdminChats,
  getAdminContracts,
  getAdminInvoices,
  getAdminNotifications,
  getAdminReviews,
  getAdminServices,
  markAdminNotificationRead,
  updateAdminService,
  updateAdminReview,
} from "../services/adminDashboard";
import { createAdminPack, deleteAdminPack, getAdminPacks, updateAdminPack } from "../services/adminPacks";
import { adminSections } from "./admin/adminData";
import "./provider.css";
import "./admin.css";

const formatCurrency = (value) => `${value} TND`;
const formatAppointmentDate = (value) => {
  if (!value) {
    return "--";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
};

const formatDateInputValue = (value) => {
  if (!value) {
    return "";
  }
  const normalized = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
};

const getInitials = (value) =>
  String(value || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() || "")
    .join("") || "PR";

const getReviewStatusLabel = (status) => {
  if (status === "flagged") {
    return "A verifier";
  }
  return statusLabels[status] || status;
};

const toAscii = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ");

const escapePdfText = (value) =>
  toAscii(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const buildSimplePdf = (lines) => {
  const safeLines = lines.map((line) => escapePdfText(line));
  const contentStream = [
    "BT",
    "/F1 12 Tf",
    "50 780 Td",
    ...safeLines.flatMap((line, index) => (index === 0 ? [`(${line}) Tj`] : ["0 -20 Td", `(${line}) Tj`])),
    "ET",
  ].join("\n");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += object;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
};

const formatNotificationDate = (value) => {
  if (!value) {
    return "A l'instant";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "A l'instant";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
};

const statusLabels = {
  active: "Actif",
  inactive: "Inactif",
  "pending-approval": "En attente",
  pending: "En attente",
  confirmed: "Confirme",
  cancelled: "Annule",
  "pending-signature": "Signature en attente",
  signed: "Signe",
  pending_provider_signature: "En attente",
  signed_by_provider: "Signe par prestataire",
  fully_signed: "Signe par les deux",
  refused_by_provider: "Refuse par prestataire",
  paid: "Payee",
  unpaid: "Impayee",
  published: "Publie",
  flagged: "Signale",
  hidden: "Masque",
  validated: "Valide",
  "needs-replacement": "A remplacer",
  expired: "Expire",
};

const statusClass = (status) => {
  if (["active", "confirmed", "signed", "signed_by_provider", "fully_signed", "paid", "published", "validated"].includes(status)) {
    return "ok";
  }

  if (["pending", "pending-approval", "pending-signature", "pending_provider_signature", "unpaid", "flagged", "needs-replacement"].includes(status)) {
    return "warn";
  }

  return "neutral";
};

const adminDashboardIcons = {
  users: "US",
  clients: "CL",
  providers: "PR",
  services: "SV",
  pending: "!",
  active: "OK",
  appointments: "RDV",
  contracts: "PDF",
  invoices: "TND",
  revenue: "+",
  reviews: "!",
  packs: "PK",
};

const defaultPackForm = {
  name: "",
  description: "",
  price: "",
  expiresAt: "",
  items: [{ id: null, serviceCategory: "", serviceId: "", providerId: "", providerStatus: "pending" }],
};

const ADMIN_NOTIFICATIONS_STORAGE_KEY = "arrasli_admin_notifications";
const isMobileSidebarViewport = () => window.innerWidth <= 980;
const paginateRows = (rows, page, pageSize) => rows.slice((page - 1) * pageSize, page * pageSize);
const normalizeAdminConversationsPayload = (payload) => {
  const source =
    payload?.conversations ||
    payload?.chats ||
    payload?.items ||
    payload?.data?.conversations ||
    payload?.data?.chats ||
    [];

  return (Array.isArray(source) ? source : []).map((conversation, index) => {
    const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
    return {
      id: conversation?.id || `${conversation?.clientId || "client"}-${conversation?.providerId || index}`,
      clientId: conversation?.clientId ?? null,
      providerId: conversation?.providerId ?? null,
      client: conversation?.client || "Client",
      provider: conversation?.provider || "Prestataire",
      lastAt: conversation?.lastAt || "--",
      excerpt: conversation?.excerpt || "",
      messages: messages.map((message, messageIndex) => ({
        id: message?.id || `${conversation?.id || index}-${messageIndex}`,
        author: message?.author === "provider" ? "provider" : "client",
        text: message?.text || message?.content || "",
        time: message?.time || "--",
      })),
    };
  });
};

const buildPackExpiryNotifications = (packs, previousById) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (packs || [])
    .map((pack) => {
      const rawExpiresAt = pack.expiresAt || pack.expires_at;
      if (!rawExpiresAt) {
        return null;
      }

      const expiresAt = new Date(rawExpiresAt);
      if (Number.isNaN(expiresAt.getTime())) {
        return null;
      }

      expiresAt.setHours(0, 0, 0, 0);
      const diffDays = Math.round((expiresAt.getTime() - today.getTime()) / 86400000);
      if (diffDays > 2) {
        return null;
      }

      const isExpired = diffDays < 0;
      const notificationId = `pack-expiry-${pack.id}-${isExpired ? "expired" : "soon"}`;
      const existing = previousById.get(notificationId);

      return {
        id: notificationId,
        type: isExpired ? "pack-expired" : "pack-expiring",
        seen: existing?.seen ?? false,
        title: isExpired ? "Pack expire a prolonger" : "Pack bientot expire",
        message: isExpired
          ? `${pack.name} a expire le ${formatAppointmentDate(rawExpiresAt)}. Pensez a prolonger sa date de fin.`
          : `${pack.name} expire le ${formatAppointmentDate(rawExpiresAt)}. Pensez a prolonger sa date de fin.`,
        packId: pack.id,
        packName: pack.name,
        dateLabel: formatNotificationDate(rawExpiresAt),
        createdAt: pack.updatedAt || pack.createdAt || rawExpiresAt,
      };
    })
    .filter(Boolean);
};

const mergeAdminNotifications = (systemNotifications, pendingProviders, packs, previousNotifications) => {
  const previousById = new Map((previousNotifications || []).map((item) => [item.id, item]));
  const providerNotifications = pendingProviders.map((provider) => {
    const notificationId = `provider-request-${provider.id}`;
    const existing = previousById.get(notificationId);

    return {
      id: notificationId,
      type: "provider-request",
      seen: existing?.seen ?? false,
      title: "Nouveau prestataire a approuver",
      message: `${provider.name} a soumis son espace prestataire et attend la validation de l'administration.`,
      providerId: provider.id,
      providerName: provider.name,
      dateLabel: formatNotificationDate(provider.joinedAt || provider.updatedAt),
      createdAt: provider.joinedAt || provider.updatedAt || new Date().toISOString(),
    };
  });

  const backendNotifications = (systemNotifications || []).map((notification) => {
    const existing = previousById.get(notification.id);
    return {
      id: notification.id,
      type: notification.type,
      seen: notification.isRead ?? existing?.seen ?? false,
      title: notification.title,
      message: notification.message,
      dateLabel: formatNotificationDate(notification.createdAt),
      createdAt: notification.createdAt,
      target: notification.target,
      appointmentId: notification.appointmentId,
      packId: notification.packId,
      reservationId: notification.reservationId,
    };
  });

  const packExpiryNotifications = buildPackExpiryNotifications(packs, previousById);

  return [...providerNotifications, ...packExpiryNotifications, ...backendNotifications].sort(
    (left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
  );
};

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobileSidebarViewport());
  const [initialLoading, setInitialLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [adminNotifications, setAdminNotifications] = useState(() => {
    try {
      const raw = window.localStorage.getItem(ADMIN_NOTIFICATIONS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      return [];
    }
  });
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const [providers, setProviders] = useState([]);
  const [serviceProviderCards, setServiceProviderCards] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [packs, setPacks] = useState([]);
  const [packProviderOptions, setPackProviderOptions] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);

  const [providerSearch, setProviderSearch] = useState("");
  const [providerStatusFilter, setProviderStatusFilter] = useState("all");
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState("all");
  const [contractSearch, setContractSearch] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");
  const [packSearch, setPackSearch] = useState("");
  const [packStatusFilter, setPackStatusFilter] = useState("all");
  const [chatSearch, setChatSearch] = useState("");
  const [chatProviderFilter, setChatProviderFilter] = useState("all");
  const [contractsPage, setContractsPage] = useState(1);
  const [billingPage, setBillingPage] = useState(1);
  const [packsPage, setPacksPage] = useState(1);

  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [providerDetails, setProviderDetails] = useState(null);
  const [serviceProviderModalOpen, setServiceProviderModalOpen] = useState(false);
  const [selectedServiceProvider, setSelectedServiceProvider] = useState(null);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [packsLoading, setPacksLoading] = useState(false);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [appointmentsModalOpen, setAppointmentsModalOpen] = useState(false);
  const [selectedAppointmentGroup, setSelectedAppointmentGroup] = useState(null);
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const [selectedReviewGroup, setSelectedReviewGroup] = useState(null);

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [packModalOpen, setPackModalOpen] = useState(false);
  const [editingPackId, setEditingPackId] = useState(null);
  const [packForm, setPackForm] = useState(defaultPackForm);
  const [packSubmitting, setPackSubmitting] = useState(false);

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirmer",
    action: null,
  });

  useEffect(() => {
    if (initialLoading) {
      return;
    }

    setSectionLoading(true);
    const timer = setTimeout(() => setSectionLoading(false), 260);

    return () => clearTimeout(timer);
  }, [activeSection, initialLoading]);

  useEffect(() => {
    window.localStorage.setItem(ADMIN_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(adminNotifications));
  }, [adminNotifications]);

  useEffect(() => {
    if (!feedbackMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setFeedbackMessage(null);
    }, 4200);

    return () => window.clearTimeout(timer);
  }, [feedbackMessage]);

  const showFeedback = (type, message) => {
    setFeedbackMessage({
      id: Date.now() + Math.random(),
      type,
      message,
    });
  };

  const syncProviderNotifications = (pendingProviders, nextPacks = packs, systemNotifications = []) => {
    setAdminNotifications((prev) => mergeAdminNotifications(systemNotifications, pendingProviders, nextPacks, prev));
  };

  const dismissNotification = (id) => {
    if (typeof id === "number") {
      markAdminNotificationRead(id).catch(() => undefined);
    }
    setAdminNotifications((prev) => prev.filter((item) => item.id !== id));
  };

  const handleNotificationClick = (notification) => {
    setAdminNotifications((prev) =>
      prev.map((item) => (item.id === notification.id ? { ...item, seen: true } : item))
    );
    if (typeof notification.id === "number") {
      markAdminNotificationRead(notification.id).catch(() => undefined);
    }
    if (notification.type === "provider-request") {
      setActiveSection("providers");
    } else if (String(notification.type || "").startsWith("pack_response")) {
      setActiveSection("packs");
    } else if (notification.appointmentId || notification.target?.kind === "appointment") {
      setActiveSection("appointments");
    } else if (notification.packId || String(notification.type || "").startsWith("pack-")) {
      setActiveSection("packs");
    } else {
      setActiveSection("providers");
    }
    if (isMobileSidebarViewport()) {
      setSidebarOpen(false);
    }
  };

  const loadAdminNotifications = async (options = {}) => {
    const { silent = false, pendingProviders = null, nextPacks = packs } = options;
    try {
      const response = await getAdminNotifications();
      const nextPendingProviders =
        pendingProviders || providers.filter((provider) => provider.status === "pending-approval");
      syncProviderNotifications(nextPendingProviders, nextPacks, response.notifications || []);
      return response.notifications || [];
    } catch (error) {
      if (!silent) {
        showFeedback("error", error.response?.data?.message || "Impossible de charger les notifications admin.");
      }
      return [];
    }
  };

  const loadProviders = async (options = {}) => {
    const { silent = false } = options;
    setProvidersLoading(true);

    try {
      const response = await api.get("/api/admin/providers");
      const nextProviders = response.data.providers || [];
      setProviders(nextProviders);

      const pendingProviders = nextProviders.filter((provider) => provider.status === "pending-approval");
      await loadAdminNotifications({ silent: true, pendingProviders });
    } catch (error) {
      if (!silent) {
        showFeedback("error", error.response?.data?.message || "Impossible de charger les prestataires.");
      }
      setProviders([]);
    } finally {
      setProvidersLoading(false);
    }
  };

  const loadContracts = async (options = {}) => {
    const { silent = false } = options;
    setContractsLoading(true);
    try {
      const response = await getAdminContracts();
      setContracts(Array.isArray(response?.contracts) ? response.contracts : []);
    } catch (error) {
      if (!silent) {
        showFeedback("error", error.response?.data?.message || "Impossible de charger les contrats.");
      }
      setContracts([]);
    } finally {
      setContractsLoading(false);
    }
  };

  const loadAppointments = async (options = {}) => {
    const { silent = false } = options;
    setAppointmentsLoading(true);
    try {
      const response = await getAdminAppointments();
      setAppointments(response.appointments || []);
    } catch (error) {
      if (!silent) {
        showFeedback("error", error.response?.data?.message || "Impossible de charger les rendez-vous.");
      }
      setAppointments([]);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const loadInvoices = async (options = {}) => {
    const { silent = false } = options;
    setInvoicesLoading(true);
    try {
      const response = await getAdminInvoices();
      setInvoices(response.invoices || []);
    } catch (error) {
      if (!silent) {
        showFeedback("error", error.response?.data?.message || "Impossible de charger les factures.");
      }
      setInvoices([]);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const loadServices = async (options = {}) => {
    const { silent = false } = options;
    setServicesLoading(true);
    try {
      const response = await getAdminServices();
      setServiceProviderCards(response.providerCards || []);
      return response;
    } catch (error) {
      if (!silent) {
        showFeedback("error", error.response?.data?.message || "Impossible de charger les services.");
      }
      setServiceProviderCards([]);
      return null;
    } finally {
      setServicesLoading(false);
    }
  };

  const loadReviews = async (options = {}) => {
    const { silent = false } = options;
    setReviewsLoading(true);
    try {
      const response = await getAdminReviews();
      setReviews(response.reviews || []);
    } catch (error) {
      if (!silent) {
        showFeedback("error", error.response?.data?.message || "Impossible de charger les avis.");
      }
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === "contracts") {
      loadContracts({ silent: true });
    }
    if (activeSection === "appointments") {
      loadAppointments({ silent: true });
    }
    if (activeSection === "billing") {
      loadInvoices({ silent: true });
    }
    if (activeSection === "reviews") {
      loadReviews({ silent: true });
    }
    if (activeSection === "services") {
      loadServices({ silent: true });
    }
    if (activeSection === "packs") {
      loadPacks({ silent: true });
    }
    if (activeSection === "chat") {
      loadConversations({ silent: true });
    }
  }, [activeSection]);

  const loadPacks = async (options = {}) => {
    const { silent = false } = options;
    setPacksLoading(true);
    try {
      const response = await getAdminPacks();
      const nextPacks = response.packs || [];
      setPacks(nextPacks);
      setPackProviderOptions(response.providerOptions || []);
      await loadAdminNotifications({ silent: true, nextPacks });
    } catch (error) {
      if (!silent) {
        showFeedback("error", error.response?.data?.message || "Impossible de charger les packs.");
      }
      setPacks([]);
      setPackProviderOptions([]);
    } finally {
      setPacksLoading(false);
    }
  };

  const loadConversations = async (options = {}) => {
    const { silent = false } = options;
    setChatsLoading(true);
    try {
      const response = await getAdminChats();
      const nextConversations = normalizeAdminConversationsPayload(response);
      setConversations(nextConversations);
      setActiveConversationId((currentId) => {
        if (nextConversations.some((conversation) => conversation.id === currentId)) {
          return currentId;
        }
        return nextConversations[0]?.id || null;
      });
    } catch (error) {
      if (!silent) {
        showFeedback("error", error.response?.data?.message || "Impossible de charger les conversations.");
      }
      setConversations([]);
      setActiveConversationId(null);
    } finally {
      setChatsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeDashboard = async () => {
      try {
        await Promise.all([
          loadProviders({ silent: true }),
          loadContracts({ silent: true }),
          loadAppointments({ silent: true }),
          loadInvoices({ silent: true }),
          loadServices({ silent: true }),
          loadReviews({ silent: true }),
          loadPacks({ silent: true }),
          loadConversations({ silent: true }),
        ]);
      } finally {
        if (isMounted) {
          setInitialLoading(false);
        }
      }
    };

    initializeDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadAdminNotifications({ silent: true });
      loadPacks({ silent: true });
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [providers]);

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(!isMobileSidebarViewport());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const openConfirm = (title, message, confirmLabel, action) => {
    setConfirmState({
      open: true,
      title,
      message,
      confirmLabel,
      action,
    });
  };

  const closeConfirm = () => {
    setConfirmState({
      open: false,
      title: "",
      message: "",
      confirmLabel: "Confirmer",
      action: null,
    });
  };

  const filteredProviders = useMemo(() => {
    const normalized = providerSearch.trim().toLowerCase();

    return providers.filter((provider) => {
      const statusMatch = providerStatusFilter === "all" || provider.status === providerStatusFilter;
      const searchMatch =
        !normalized ||
        provider.name.toLowerCase().includes(normalized) ||
        provider.category.toLowerCase().includes(normalized) ||
        provider.city.toLowerCase().includes(normalized);

      return statusMatch && searchMatch;
    });
  }, [providers, providerSearch, providerStatusFilter]);

  const filteredAppointments = useMemo(() => {
    if (appointmentStatusFilter === "all") {
      return appointments;
    }

    return appointments.filter((appointment) => appointment.status === appointmentStatusFilter);
  }, [appointments, appointmentStatusFilter]);

  const filteredContracts = useMemo(() => {
    const normalizedSearch = contractSearch.trim().toLowerCase();

    return contracts.filter((contract) => {
      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        contract.title,
        contract.client,
        contract.provider,
        contract.status,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return haystack.includes(normalizedSearch);
    });
  }, [contractSearch, contracts]);

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = invoiceSearch.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const matchesStatus = invoiceStatusFilter === "all" || invoice.status === invoiceStatusFilter;
      if (!matchesStatus) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        invoice.id,
        invoice.client,
        invoice.status,
        invoice.issuedAt,
        String(invoice.amount || ""),
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return haystack.includes(normalizedSearch);
    });
  }, [invoiceSearch, invoiceStatusFilter, invoices]);

  const filteredPacks = useMemo(() => {
    const normalizedSearch = packSearch.trim().toLowerCase();

    return packs.filter((pack) => {
      const matchesStatus =
        packStatusFilter === "all" ||
        pack.status === packStatusFilter;
      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const servicesLabel =
        pack.items?.map((item) => `${item.serviceCategory} ${item.providerName}`).join(" ") || pack.services || "";

      const haystack = [
        pack.name,
        pack.status,
        pack.price,
        pack.expiresAt,
        servicesLabel,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return haystack.includes(normalizedSearch);
    });
  }, [packSearch, packStatusFilter, packs]);

  const paginatedContracts = useMemo(() => paginateRows(filteredContracts, contractsPage, 5), [filteredContracts, contractsPage]);
  const paginatedInvoices = useMemo(() => paginateRows(filteredInvoices, billingPage, 6), [filteredInvoices, billingPage]);
  const paginatedPacks = useMemo(() => paginateRows(filteredPacks, packsPage, 5), [filteredPacks, packsPage]);

  useEffect(() => {
    setContractsPage(1);
  }, [contractSearch]);

  useEffect(() => {
    setBillingPage(1);
  }, [invoiceSearch, invoiceStatusFilter]);

  useEffect(() => {
    setPacksPage(1);
  }, [packSearch, packStatusFilter]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredContracts.length / 5));
    if (contractsPage > maxPage) {
      setContractsPage(maxPage);
    }
  }, [filteredContracts.length, contractsPage]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredInvoices.length / 6));
    if (billingPage > maxPage) {
      setBillingPage(maxPage);
    }
  }, [filteredInvoices.length, billingPage]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredPacks.length / 5));
    if (packsPage > maxPage) {
      setPacksPage(maxPage);
    }
  }, [filteredPacks.length, packsPage]);

  const appointmentsByProvider = useMemo(() => {
    const grouped = filteredAppointments.reduce((accumulator, appointment) => {
      const providerKey = appointment.provider || "Prestataire inconnu";

      if (!accumulator.has(providerKey)) {
        accumulator.set(providerKey, {
          provider: providerKey,
          appointments: [],
          totalAmount: 0,
          statusCount: {
            pending: 0,
            confirmed: 0,
            cancelled: 0,
          },
        });
      }

      const bucket = accumulator.get(providerKey);
      bucket.appointments.push(appointment);
      bucket.totalAmount += Number(appointment.amount || 0);
      if (bucket.statusCount[appointment.status] !== undefined) {
        bucket.statusCount[appointment.status] += 1;
      }

      return accumulator;
    }, new Map());

    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        appointments: [...group.appointments].sort(
          (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime()
        ),
      }))
      .sort((left, right) => left.provider.localeCompare(right.provider));
  }, [filteredAppointments]);

  const reviewsByProvider = useMemo(() => {
    const grouped = reviews.reduce((accumulator, review) => {
      const providerKey = review.target || "Prestataire inconnu";

      if (!accumulator.has(providerKey)) {
        accumulator.set(providerKey, {
          provider: providerKey,
          reviews: [],
          averageRating: 0,
          statusCount: {
            published: 0,
            hidden: 0,
            flagged: 0,
          },
        });
      }

      const bucket = accumulator.get(providerKey);
      bucket.reviews.push(review);
      if (bucket.statusCount[review.status] !== undefined) {
        bucket.statusCount[review.status] += 1;
      }

      return accumulator;
    }, new Map());

    return Array.from(grouped.values())
      .map((group) => {
        const totalRating = group.reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
        return {
          ...group,
          averageRating: group.reviews.length ? (totalRating / group.reviews.length).toFixed(1) : "0.0",
          reviews: [...group.reviews].sort(
            (left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
          ),
        };
      })
      .sort((left, right) => left.provider.localeCompare(right.provider));
  }, [reviews]);

  const chatProviderOptions = useMemo(
    () =>
      Array.from(
        new Set(
          conversations
            .map((conversation) => String(conversation.provider || "").trim())
            .filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right)),
    [conversations]
  );

  const filteredConversations = useMemo(() => {
    const normalizedSearch = chatSearch.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const matchesProvider =
        chatProviderFilter === "all" || String(conversation.provider || "").trim() === chatProviderFilter;
      if (!matchesProvider) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const haystack = [
        conversation.client,
        conversation.provider,
        conversation.excerpt,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return haystack.includes(normalizedSearch);
    });
  }, [chatProviderFilter, chatSearch, conversations]);

  const activeConversation =
    filteredConversations.find((conversation) => conversation.id === activeConversationId) ||
    filteredConversations[0] ||
    null;

  useEffect(() => {
    if (filteredConversations.length === 0) {
      setActiveConversationId(null);
      return;
    }
    if (!filteredConversations.some((conversation) => conversation.id === activeConversationId)) {
      setActiveConversationId(filteredConversations[0].id);
    }
  }, [activeConversationId, filteredConversations]);

  const dashboardStats = useMemo(() => {
    const activeProviders = providers.filter((item) => item.status === "active").length;
    const pendingProviders = providers.filter((item) => item.status === "pending-approval").length;
    const pendingAppointments = appointments.filter((item) => item.status === "pending").length;
    const contractsToSign = contracts.filter((item) =>
      ["pending-signature", "pending_provider_signature"].includes(item.status)
    ).length;
    const unpaidInvoices = invoices.filter((item) => item.status === "unpaid").length;
    const paidRevenue = invoices
      .filter((item) => item.status === "paid")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const flaggedReviews = reviews.filter((item) => item.status === "flagged").length;
    const activePacks = packs.filter((item) => item.status === "validated").length;
    const totalProviders = providers.length;
    const totalClients = new Set([
      ...appointments.map((item) => item.client).filter(Boolean),
      ...invoices.map((item) => item.client).filter(Boolean),
      ...reviews.map((item) => item.author).filter(Boolean),
    ]).size;

    return [
      { id: "users", label: "Total utilisateurs", value: totalClients + totalProviders, icon: adminDashboardIcons.users, tone: "ink", hint: "Clients + prestataires" },
      { id: "clients", label: "Total clients", value: totalClients, icon: adminDashboardIcons.clients, tone: "blue", hint: "Clients identifies" },
      { id: "providers", label: "Total prestataires", value: totalProviders, icon: adminDashboardIcons.providers, tone: "violet", hint: "Comptes prestataires" },
      { id: "pendingProviders", label: "Prestataires en attente", value: pendingProviders, icon: adminDashboardIcons.pending, tone: "amber", hint: "Validation requise" },
      { id: "activeProviders", label: "Prestataires actifs", value: activeProviders, icon: adminDashboardIcons.active, tone: "green", hint: "Comptes approuves" },
      { id: "pendingAppointments", label: "Rdv en attente", value: pendingAppointments, icon: adminDashboardIcons.appointments, tone: "amber", hint: "A suivre" },
      { id: "contractsToSign", label: "Contrats a signer", value: contractsToSign, icon: adminDashboardIcons.contracts, tone: "rose", hint: "Signatures ouvertes" },
      { id: "unpaidInvoices", label: "Factures impayees", value: unpaidInvoices, icon: adminDashboardIcons.invoices, tone: "red", hint: "Paiements a relancer" },
      { id: "revenue", label: "Chiffre d'affaires", value: formatCurrency(paidRevenue), icon: adminDashboardIcons.revenue, tone: "green", hint: "Factures payees" },
      { id: "flaggedReviews", label: "Avis signales", value: flaggedReviews, icon: adminDashboardIcons.reviews, tone: "red", hint: "Moderation" },
      { id: "activePacks", label: "Packs actifs", value: activePacks, icon: adminDashboardIcons.packs, tone: "blue", hint: "Visibles client" },
    ];
  }, [appointments, contracts, invoices, providers, reviews, packs]);

  const dashboardAlerts = useMemo(
    () => [
      {
        id: "pending-providers",
        title: "Prestataires en attente d'approbation",
        value: providers.filter((item) => item.status === "pending-approval").length,
        section: "providers",
        severity: "warn",
      },
      {
        id: "pending-contracts",
        title: "Contrats en attente",
        value: contracts.filter((item) => ["pending-signature", "pending_provider_signature"].includes(item.status)).length,
        section: "contracts",
        severity: "warn",
      },
      {
        id: "unpaid-invoices",
        title: "Factures impayees",
        value: invoices.filter((item) => item.status === "unpaid").length,
        section: "billing",
        severity: "danger",
      },
      {
        id: "flagged-reviews",
        title: "Avis a verifier",
        value: reviews.filter((item) => item.status === "flagged").length,
        section: "reviews",
        severity: "danger",
      },
    ],
    [contracts, invoices, providers, reviews]
  );

  const recentActivity = useMemo(() => {
    const providerItems = providers.slice(0, 3).map((provider) => ({
      id: `provider-${provider.id}`,
      title: provider.name,
      meta: `Prestataire - ${statusLabels[provider.status] || provider.status}`,
      date: provider.updatedAt || provider.joinedAt,
      section: "providers",
    }));
    const contractItems = contracts.slice(0, 2).map((contract) => ({
      id: `contract-${contract.id}`,
      title: contract.title || contract.id,
      meta: `Contrat - ${statusLabels[contract.status] || contract.status}`,
      date: contract.provider_signed_at || contract.client_signed_at,
      section: "contracts",
    }));
    const packItems = packs.slice(0, 2).map((pack) => ({
      id: `pack-${pack.id}`,
      title: pack.name,
      meta: `Pack - ${statusLabels[pack.status] || pack.status}`,
      date: pack.updatedAt || pack.createdAt,
      section: "packs",
    }));

    return [...providerItems, ...contractItems, ...packItems].slice(0, 6);
  }, [contracts, packs, providers]);

  const dashboardCharts = useMemo(() => {
    const paidRevenue = invoices
      .filter((item) => item.status === "paid")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const monthlyRevenue = [22, 36, 58, 72, 44, 35, 66, 29, 50, 39, 62, 46].map((value, index) => ({
      label: ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"][index],
      value: Math.max(8, value + Math.min(24, Math.round(paidRevenue / 1000))),
    }));
    const maxMonthlyRevenue = Math.max(...monthlyRevenue.map((item) => item.value), 1);
    const totalProviders = providers.length || 1;
    const activeProviders = providers.filter((item) => item.status === "active").length;
    const pendingProviders = providers.filter((item) => item.status === "pending-approval").length;
    const inactiveProviders = Math.max(totalProviders - activeProviders - pendingProviders, 0);
    const providerRatio = Math.round((activeProviders / totalProviders) * 100);
    const activityLine = [18, 34, 28, 52, 41, 68, 57, 82, 64, 76, 70, 92];

    return {
      monthlyRevenue,
      maxMonthlyRevenue,
      providerRatio,
      providerSplit: [
        { label: "Actifs", value: activeProviders, color: "#22c55e" },
        { label: "En attente", value: pendingProviders, color: "#f59e0b" },
        { label: "Inactifs", value: inactiveProviders, color: "#94a3b8" },
      ],
      activityLine,
    };
  }, [invoices, providers]);

  const quickActions = [
    { id: "providers", title: "Gerer les prestataires", text: "Valider, activer ou consulter les profils.", icon: adminDashboardIcons.providers },
    { id: "services", title: "Voir les services", text: "Consulter les offres publiees par prestataire.", icon: adminDashboardIcons.services },
    { id: "appointments", title: "Voir les rendez-vous", text: "Suivre les demandes et rendez-vous clients.", icon: adminDashboardIcons.appointments },
    { id: "contracts", title: "Verifier les contrats", text: "Controler les signatures et documents.", icon: adminDashboardIcons.contracts },
    { id: "billing", title: "Consulter les factures", text: "Surveiller paiements et impayes.", icon: adminDashboardIcons.invoices },
    { id: "packs", title: "Gerer les packs", text: "Composer les offres multi-prestataires.", icon: adminDashboardIcons.packs },
  ];

  const openProviderDetailsModal = (provider) => {
    setProviderDetails(provider);
    setProviderModalOpen(true);
  };

  const openServiceProviderModal = (providerCard) => {
    setSelectedServiceProvider(providerCard);
    setServiceProviderModalOpen(true);
  };

  const toggleProviderStatus = (provider) => {
    const activating = provider.status !== "active";

    openConfirm(
      activating ? "Activer le compte" : "Desactiver le compte",
      activating
        ? `Confirmer l'activation du compte ${provider.name} ?`
        : `Confirmer la desactivation du compte ${provider.name} ?`,
      activating ? "Activer" : "Desactiver",
      async () => {
        try {
          const response = await api.put(`/api/admin/providers/${provider.id}`, {
            ...provider,
            status: activating ? "active" : "inactive",
          });
          const updatedProvider = response.data.provider;

          setProviders((prev) =>
            prev.map((item) => (item.id === updatedProvider.id ? updatedProvider : item))
          );
          if (providerDetails?.id === updatedProvider.id) {
            setProviderDetails(updatedProvider);
          }
          showFeedback(
            "success",
            response.data.message || `Compte ${activating ? "active" : "desactive"} avec succes.`
          );
        } catch (error) {
          showFeedback("error", error.response?.data?.message || "Impossible de modifier le statut.");
        }
      }
    );
  };

  const openAppointmentsModal = (group) => {
    setSelectedAppointmentGroup(group);
    setAppointmentsModalOpen(true);
  };

  const openReviewsModal = (group) => {
    setSelectedReviewGroup(group);
    setReviewsModalOpen(true);
  };

  const openContractPdf = (contract) => {
    if (!contract) {
      return;
    }
    const raw = String(contract.pdf_url || "").trim();
    if (!raw) {
      showFeedback("error", "Aucun PDF disponible pour ce contrat.");
      return;
    }
    const url = raw.startsWith("http://") || raw.startsWith("https://")
      ? raw
      : `${API_BASE_URL}${raw.startsWith("/") ? raw : `/${raw}`}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openInvoiceModal = (invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceModalOpen(true);
  };

  const openInvoicePdf = (invoice) => {
    if (!invoice) {
      return;
    }

    const rawUrl = String(invoice.pdfUrl || "").trim();
    if (rawUrl) {
      const resolvedUrl =
        rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
          ? rawUrl
          : `${API_BASE_URL}${rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`}`;
      window.open(resolvedUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const pdfBlob = buildSimplePdf([
      `Facture: ${invoice.id}`,
      `Client: ${invoice.client}`,
      `Montant: ${formatCurrency(invoice.amount)}`,
      `Date emission: ${invoice.issuedAt}`,
      `Statut: ${statusLabels[invoice.status] || invoice.status}`,
      "",
      "Paiement obligatoire confirme pour cette facture.",
    ]);
    const pdfUrl = window.URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => window.URL.revokeObjectURL(pdfUrl), 60_000);
  };

  const moderateReview = (review, nextStatus) => {
    openConfirm(
      "Mettre a jour cet avis",
      `Confirmer le passage de l'avis de ${review.author} au statut ${nextStatus} ?`,
      "Confirmer",
      async () => {
        try {
          const response = await updateAdminReview(review.id, { status: nextStatus });
          const updatedReview = response.review;
          setReviews((prev) => prev.map((item) => (item.id === updatedReview.id ? updatedReview : item)));
          setSelectedReviewGroup((prev) =>
            prev
              ? {
                  ...prev,
                  reviews: prev.reviews.map((item) => (item.id === updatedReview.id ? updatedReview : item)),
                }
              : prev
          );
          showFeedback("success", response.message || "Avis modere avec succes.");
        } catch (error) {
          showFeedback("error", error.response?.data?.message || "Impossible de moderer cet avis.");
        }
      }
    );
  };

  const moderateServiceVisibility = async (service, isVisible) => {
    try {
      const response = await updateAdminService(service.id, { is_visible: isVisible });
      const nextData = await loadServices({ silent: true });
      if (selectedServiceProvider?.id && nextData?.providerCards) {
        const refreshedProvider = nextData.providerCards.find((item) => item.id === selectedServiceProvider.id) || null;
        setSelectedServiceProvider(refreshedProvider);
        setServiceProviderModalOpen(Boolean(refreshedProvider));
      }
      showFeedback("success", response.message || "Visibilite du service mise a jour.");
    } catch (error) {
      showFeedback("error", error.response?.data?.message || "Impossible de mettre a jour ce service.");
    }
  };

  const deleteReview = (review) => {
    openConfirm(
      "Supprimer cet avis",
      `Supprimer l'avis de ${review.author} sur ${review.target} ?`,
      "Supprimer",
      async () => {
        try {
          const response = await deleteAdminReview(review.id);
          setReviews((prev) => prev.filter((item) => item.id !== review.id));
          setSelectedReviewGroup((prev) =>
            prev
              ? {
                  ...prev,
                  reviews: prev.reviews.filter((item) => item.id !== review.id),
                }
              : prev
          );
          showFeedback("success", response.message || "Avis supprime.");
        } catch (error) {
          showFeedback("error", error.response?.data?.message || "Impossible de supprimer cet avis.");
        }
      }
    );
  };

  const openCreatePackModal = () => {
    setEditingPackId(null);
    setPackForm(defaultPackForm);
    setPackModalOpen(true);
  };

  const getProvidersForServiceCategory = (serviceCategory) =>
    packProviderOptions.find((option) => option.serviceCategory === serviceCategory)?.providers || [];

  const updatePackItemField = (index, field, value) => {
    setPackForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }
        if (field === "serviceCategory") {
          return { ...item, serviceCategory: value, serviceId: "", providerId: "", providerStatus: "pending" };
        }
        if (field === "providerSelection") {
          const [serviceId, providerId] = String(value || "").split(":");
          return {
            ...item,
            serviceId: serviceId || "",
            providerId: providerId || "",
            providerStatus: "pending",
          };
        }
        return { ...item, [field]: value };
      }),
    }));
  };

  const addPackItemRow = () => {
    setPackForm((prev) => ({
      ...prev,
      items: [...prev.items, { id: null, serviceCategory: "", serviceId: "", providerId: "", providerStatus: "pending" }],
    }));
  };

  const removePackItemRow = (index) => {
    setPackForm((prev) => ({
      ...prev,
      items: prev.items.length === 1 ? prev.items : prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const openEditPackModal = (pack) => {
    setEditingPackId(pack.id);
    setPackForm({
      name: pack.name,
      description: pack.description || "",
      price: String(pack.price),
      expiresAt: formatDateInputValue(pack.expiresAt),
      items:
        pack.items?.map((item) => ({
          id: item.id || null,
          serviceCategory: item.serviceCategory || "",
          serviceId: String(item.serviceId || ""),
          providerId: String(item.providerId || ""),
          providerStatus: item.providerStatus || "pending",
        })) || defaultPackForm.items,
    });
    setPackModalOpen(true);
  };

  const submitPack = async (event) => {
    event?.preventDefault?.();

    const normalizedItems = packForm.items
      .map((item) => ({
        id: item.id || null,
        serviceCategory: String(item.serviceCategory || "").trim(),
        serviceId: Number(item.serviceId || 0),
        providerId: Number(item.providerId || 0),
      }))
      .filter((item) => item.serviceCategory && item.serviceId && item.providerId);

    if (!packForm.name || !packForm.price || !packForm.expiresAt || normalizedItems.length === 0) {
      showFeedback("error", "Veuillez renseigner le nom, le prix, la date de fin du pack et choisir au moins un prestataire par service.");
      return;
    }

    const payload = {
      name: packForm.name,
      description: packForm.description,
      price: Number(packForm.price),
      expires_at: packForm.expiresAt,
      items: normalizedItems,
    };

    setPackSubmitting(true);
    try {
      const response = editingPackId
        ? await updateAdminPack(editingPackId, payload)
        : await createAdminPack(payload);
      await loadPacks();
      showFeedback("success", response.message || "Pack enregistre avec succes.");
      setPackModalOpen(false);
      setEditingPackId(null);
      setPackForm(defaultPackForm);
    } catch (error) {
      showFeedback("error", error.response?.data?.message || "Impossible d'enregistrer ce pack.");
    } finally {
      setPackSubmitting(false);
    }
  };

  const removeExpiredPack = (packId) => {
    openConfirm(
      "Supprimer ce pack expire ?",
      "Cette action supprimera definitivement ce pack expire de la base de donnees.",
      "Supprimer",
      async () => {
        setPackSubmitting(true);
        try {
          const response = await deleteAdminPack(packId);
          await loadPacks();
          showFeedback("success", response.message || "Pack supprime avec succes.");
          setPackModalOpen(false);
          setEditingPackId(null);
          setPackForm(defaultPackForm);
        } catch (error) {
          showFeedback("error", error.response?.data?.message || "Impossible de supprimer ce pack.");
        } finally {
          setPackSubmitting(false);
        }
      }
    );
  };

  const togglePackStatus = (pack) => {
    openEditPackModal(pack);
  };

  const providerColumns = [
    {
      key: "name",
      header: "Prestataire",
      width: "30%",
      cellClassName: "admin-cell-tight",
      render: (_, row) => (
        <div className="admin-provider-inline-cell">
          <strong>{row.name}</strong>
          <small>{row.email}</small>
        </div>
      ),
    },
    {
      key: "category",
      header: "Service",
      width: "16%",
      cellClassName: "admin-cell-tight",
      render: (value) => <span className="admin-cell-nowrap">{value}</span>,
    },
    {
      key: "city",
      header: "Ville",
      width: "14%",
      cellClassName: "admin-cell-tight",
      render: (value) => <span className="admin-cell-nowrap">{value}</span>,
    },
    {
      key: "rating",
      header: "Note",
      width: "10%",
      cellClassName: "admin-cell-tight",
      render: (value) => <span className="admin-cell-nowrap">{value}/5</span>,
    },
    {
      key: "status",
      header: "Statut",
      width: "16%",
      cellClassName: "admin-cell-tight",
      render: (value) => (
        <span className={`admin-chip ${statusClass(value)}`}>{statusLabels[value] || value}</span>
      ),
    },
  ];

  const contractColumns = [
    {
      key: "title",
      header: "Contrat",
      width: "30%",
      render: (value) => <span className="admin-cell-wrap">{value || "-"}</span>,
    },
    {
      key: "client",
      header: "Client",
      width: "20%",
      render: (value) => <span className="admin-cell-wrap">{value || "-"}</span>,
    },
    {
      key: "provider",
      header: "Prestataire",
      width: "20%",
      render: (value) => <span className="admin-cell-wrap">{value || "-"}</span>,
    },
    {
      key: "status",
      header: "Statut",
      width: "15%",
      cellClassName: "admin-contract-status-cell",
      render: (value) => (
        <span className={`admin-chip ${statusClass(value)}`}>{statusLabels[value] || value}</span>
      ),
    },
  ];

  const invoiceColumns = [
    {
      key: "id",
      header: "Facture",
      width: "18%",
      cellClassName: "admin-cell-tight",
      render: (value) => <span className="admin-cell-nowrap">{value}</span>,
    },
    {
      key: "client",
      header: "Client",
      width: "24%",
      cellClassName: "admin-cell-tight",
      render: (value) => <span className="admin-cell-nowrap">{value}</span>,
    },
    {
      key: "amount",
      header: "Montant",
      width: "17%",
      cellClassName: "admin-cell-tight",
      render: (value) => <span className="admin-cell-nowrap">{formatCurrency(value)}</span>,
    },
    {
      key: "issuedAt",
      header: "Date emission",
      width: "18%",
      cellClassName: "admin-cell-tight",
      render: (value) => <span className="admin-cell-nowrap">{value}</span>,
    },
    {
      key: "status",
      header: "Statut",
      width: "13%",
      cellClassName: "admin-cell-tight",
      render: (value) => (
        <span className={`admin-chip ${statusClass(value)}`}>{statusLabels[value] || value}</span>
      ),
    },
  ];

  const packColumns = [
    {
      key: "name",
      header: "Pack",
      width: "18%",
      render: (_, row) => (
        <strong className="admin-pack-name-cell">{row.name}</strong>
      ),
    },
    {
      key: "price",
      header: "Prix",
      width: "11%",
      render: (value) => formatCurrency(value),
    },
    {
      key: "expiresAt",
      header: "Fin",
      width: "14%",
      render: (value) => <span className="admin-cell-nowrap">{formatAppointmentDate(value)}</span>,
    },
    {
      key: "services",
      header: "Services inclus",
      width: "36%",
      render: (_, row) => (
        <span className="admin-cell-wrap">
          {row.items?.map((item) => `${item.serviceCategory}: ${item.providerName}`).join(" • ") || row.services}
        </span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      width: "11%",
      cellClassName: "admin-pack-status-cell",
      render: (value) => {
        return (
          <span className={`admin-chip ${statusClass(value)}`}>{statusLabels[value] || value}</span>
        );
      },
    },
  ];

  const renderSection = () => {
    if (sectionLoading || initialLoading) {
      return <div className="admin-status-card">Chargement de la section...</div>;
    }

    if (activeSection === "dashboard") {
      return (
        <section className="admin-analytics-dashboard">
          <div className="admin-analytics-header">
            <div>
              <span>Dashboard</span>
              <h3>Tableau de bord administrateur</h3>
              <p>Vue globale des utilisateurs, revenus, contrats, packs et alertes de la plateforme.</p>
            </div>
            <button
              type="button"
              className="admin-analytics-header-action"
              onClick={() =>
                Promise.all([
                  loadProviders({ silent: true }),
                  loadContracts({ silent: true }),
                  loadAppointments({ silent: true }),
                  loadInvoices({ silent: true }),
                  loadServices({ silent: true }),
                  loadReviews({ silent: true }),
                  loadPacks({ silent: true }),
                  loadConversations({ silent: true }),
                  loadAdminNotifications({ silent: true }),
                ])
              }
            >
              Actualiser
            </button>
          </div>

          <section className="admin-analytics-layout">
            <div className="admin-analytics-main">
              <div className="admin-analytics-kpi-grid">
                {dashboardStats.slice(0, 8).map((item) => (
                  <article key={item.id} className={`admin-analytics-kpi ${item.tone}`}>
                    <div>
                      <span>{item.icon}</span>
                      <small>{item.hint}</small>
                    </div>
                    <strong>{item.value}</strong>
                    <p>{item.label}</p>
                  </article>
                ))}
              </div>

              <div className="admin-analytics-chart-grid">
                <article className="admin-analytics-card admin-analytics-wide">
                  <div className="admin-analytics-card-head">
                    <div>
                      <span>Monthly Revenue</span>
                      <h4>{formatCurrency(invoices.filter((item) => item.status === "paid").reduce((sum, item) => sum + Number(item.amount || 0), 0))}</h4>
                    </div>
                    <small>Factures payees</small>
                  </div>
                  <div className="admin-analytics-bars">
                    {dashboardCharts.monthlyRevenue.map((item) => (
                      <div key={item.label} className="admin-analytics-bar-item">
                        <span style={{ height: `${(item.value / dashboardCharts.maxMonthlyRevenue) * 100}%` }} />
                        <small>{item.label}</small>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="admin-analytics-card">
                  <div className="admin-analytics-card-head">
                    <div>
                      <span>Prestataires</span>
                      <h4>{dashboardCharts.providerRatio}% actifs</h4>
                    </div>
                  </div>
                  <div className="admin-analytics-donut" style={{ "--admin-donut-value": `${dashboardCharts.providerRatio}%` }}>
                    <strong>{dashboardCharts.providerRatio}%</strong>
                    <span>Actifs</span>
                  </div>
                  <div className="admin-analytics-legend">
                    {dashboardCharts.providerSplit.map((item) => (
                      <p key={item.label}>
                        <i style={{ background: item.color }} />
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </p>
                    ))}
                  </div>
                </article>

                <article className="admin-analytics-card">
                  <div className="admin-analytics-card-head">
                    <div>
                      <span>Activite</span>
                      <h4>{appointments.length + contracts.length + packs.length}</h4>
                    </div>
                    <small>Flux global</small>
                  </div>
                  <div className="admin-analytics-line">
                    {dashboardCharts.activityLine.map((value, index) => (
                      <span key={`${value}-${index}`} style={{ height: `${value}%` }} />
                    ))}
                  </div>
                </article>
              </div>

              <article className="admin-analytics-card">
                <div className="admin-analytics-card-head">
                  <div>
                    <span>Actions rapides</span>
                    <h4>Gestion de la plateforme</h4>
                  </div>
                </div>
                <div className="admin-analytics-actions">
                  {quickActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      className="admin-analytics-action"
                      onClick={() => setActiveSection(action.id)}
                    >
                      <span>{action.icon}</span>
                      <div>
                        <strong>{action.title}</strong>
                        <p>{action.text}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </article>
            </div>

            <aside className="admin-analytics-side">
              <article className="admin-analytics-profile">
                <span className="admin-analytics-avatar">AD</span>
                <div>
                  <small>Welcome back</small>
                  <strong>Admin 3arrasli</strong>
                  <p>{dashboardAlerts.reduce((sum, item) => sum + item.value, 0)} priorites aujourd'hui</p>
                </div>
              </article>

              <article className="admin-analytics-card">
                <div className="admin-analytics-card-head">
                  <div>
                    <span>Alertes</span>
                    <h4>Important</h4>
                  </div>
                </div>
                <div className="admin-analytics-alerts">
                {dashboardAlerts.map((alert) => (
                  <button
                    key={alert.id}
                    type="button"
                    className={`admin-analytics-alert ${alert.severity}`}
                    onClick={() => setActiveSection(alert.section)}
                  >
                    <span>{alert.value}</span>
                    <strong>{alert.title}</strong>
                  </button>
                ))}
                </div>
              </article>

              <article className="admin-analytics-card">
                <div className="admin-analytics-card-head">
                  <div>
                    <span>Recent Activity</span>
                    <h4>Derniers mouvements</h4>
                  </div>
                </div>
                <div className="admin-analytics-activity">
              {recentActivity.length ? (
                recentActivity.map((activity) => (
                  <button
                    key={activity.id}
                    type="button"
                        className="admin-analytics-activity-item"
                    onClick={() => setActiveSection(activity.section)}
                  >
                    <span>{getInitials(activity.title)}</span>
                    <div>
                      <strong>{activity.title}</strong>
                      <p>{activity.meta}</p>
                    </div>
                    <small>{formatNotificationDate(activity.date)}</small>
                  </button>
                ))
              ) : (
                <div className="admin-status-card">Aucune activite recente a afficher.</div>
              )}
                </div>
              </article>
            </aside>
          </section>
        </section>
      );
    }

    if (activeSection === "providers") {
      return (
        <section className="provider-panel">
          <div className="provider-panel-head provider-panel-head-inline">
            <div>
              <h3>Provider Management</h3>
              <p>Recherche, filtre et actions sur tous les prestataires.</p>
            </div>
          </div>

          <div className="admin-filter-bar">
            <input
              className="provider-input"
              value={providerSearch}
              onChange={(event) => setProviderSearch(event.target.value)}
              placeholder="Rechercher un prestataire"
            />
            <select
              className="provider-select"
              value={providerStatusFilter}
              onChange={(event) => setProviderStatusFilter(event.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="pending-approval">En attente</option>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>

          <DataTable
            columns={providerColumns}
            rows={filteredProviders}
            keyField="id"
            loading={providersLoading}
            emptyMessage="Aucun prestataire trouve pour ce filtre."
            tableClassName="admin-data-table-providers"
            actionsColumnWidth="320px"
            renderActions={(row) => (
              <div className="admin-provider-actions-row admin-provider-actions-row-shifted">
                <button type="button" className="provider-ghost-btn" onClick={() => openProviderDetailsModal(row)}>
                  Details
                </button>
                <button type="button" className="provider-secondary-btn" onClick={() => toggleProviderStatus(row)}>
                  {row.status === "pending-approval"
                    ? "Approuver"
                    : row.status === "active"
                      ? "Desactiver"
                      : "Activer"}
                </button>
              </div>
            )}
          />
        </section>
      );
    }

    if (activeSection === "appointments") {
      return (
        <section className="provider-panel">
          <div className="provider-panel-head provider-panel-head-inline">
            <div>
              <h3>Consultation des rendez-vous</h3>
              <p>Explorez les rendez-vous par prestataire avec une vue plus claire et 100% lecture seule.</p>
            </div>
          </div>

          <div className="admin-filter-tabs">
            {["all", "pending", "confirmed", "cancelled"].map((status) => (
              <button
                key={status}
                type="button"
                className={`provider-filter-chip ${appointmentStatusFilter === status ? "active" : ""}`}
                onClick={() => setAppointmentStatusFilter(status)}
              >
                {status === "all" ? "Tous" : statusLabels[status]}
              </button>
            ))}
          </div>

          {appointmentsLoading ? (
            <div className="admin-status-card">Chargement des rendez-vous...</div>
          ) : appointmentsByProvider.length === 0 ? (
            <div className="admin-status-card">Aucun rendez-vous disponible pour ce statut.</div>
          ) : (
            <div className="admin-appointments-board">
              {appointmentsByProvider.map((group) => (
                <button
                  key={group.provider}
                  type="button"
                  className="admin-appointment-provider-card"
                  onClick={() => openAppointmentsModal(group)}
                >
                  <div className="admin-appointment-provider-head">
                    <div className="admin-appointment-provider-identity">
                      <span className="admin-appointment-provider-avatar">{getInitials(group.provider)}</span>
                      <div>
                        <strong>{group.provider}</strong>
                        <p>{group.appointments.length} rendez-vous a consulter</p>
                      </div>
                    </div>

                    <div className="admin-appointment-provider-metrics">
                      <span>{formatCurrency(group.totalAmount)}</span>
                      <small>Montant cumule</small>
                    </div>
                  </div>

                  <div className="admin-appointment-provider-summary">
                    <span className="admin-chip neutral">En attente: {group.statusCount.pending}</span>
                    <span className="admin-chip ok">Confirmes: {group.statusCount.confirmed}</span>
                    <span className="admin-chip warn">Annules: {group.statusCount.cancelled}</span>
                  </div>

                  <span className="admin-appointment-provider-cta">Cliquer pour afficher les rendez-vous tries par date</span>
                </button>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (activeSection === "contracts") {
      return (
        <section className="provider-panel">
          <div className="provider-panel-head provider-panel-head-inline">
            <div>
              <h3>Contracts</h3>
              <p>Suivi complet des contrats et support de signature numerique.</p>
            </div>
          </div>

          <div className="admin-filter-bar">
            <input
              className="provider-input"
              type="search"
              value={contractSearch}
              onChange={(event) => setContractSearch(event.target.value)}
              placeholder="Rechercher un contrat, un client ou un prestataire"
            />
          </div>

          <DataTable
            columns={contractColumns}
            rows={paginatedContracts}
            keyField="id"
            loading={contractsLoading}
            emptyMessage="Aucun contrat disponible."
            wrapClassName="admin-contracts-table-wrap"
            tableClassName="admin-data-table-contracts"
            actionsColumnWidth="15%"
            pagination={{
              page: contractsPage,
              totalPages: Math.max(1, Math.ceil(filteredContracts.length / 5)),
              totalItems: filteredContracts.length,
              totalItemsLabel: `${filteredContracts.length} contrat${filteredContracts.length > 1 ? "s" : ""}`,
              onPageChange: setContractsPage,
            }}
            renderActions={(row) => (
              <button
                type="button"
                className="provider-ghost-btn admin-action-btn-nowrap admin-contract-action-btn"
                onClick={() => openContractPdf(row)}
              >
                voir contrat
              </button>
            )}
          />
        </section>
      );
    }

    if (activeSection === "billing") {
      return (
        <section className="provider-panel">
          <div className="provider-panel-head provider-panel-head-inline">
            <div>
              <h3>Billing / Invoicing</h3>
              <p>Consultation des factures payees avec ouverture directe du document PDF.</p>
            </div>
          </div>

          <div className="admin-filter-bar admin-filter-bar-billing">
            <input
              className="provider-input"
              type="search"
              value={invoiceSearch}
              onChange={(event) => setInvoiceSearch(event.target.value)}
              placeholder="Rechercher une facture ou un client"
            />
            <select
              className="provider-select"
              value={invoiceStatusFilter}
              onChange={(event) => setInvoiceStatusFilter(event.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="paid">Payee</option>
              <option value="unpaid">Impayee</option>
            </select>
          </div>

          <DataTable
            columns={invoiceColumns}
            rows={paginatedInvoices}
            keyField="id"
            loading={invoicesLoading}
            emptyMessage="Aucune facture trouvee."
            tableClassName="admin-data-table-billing"
            actionsColumnWidth="190px"
            pagination={{
              page: billingPage,
              totalPages: Math.max(1, Math.ceil(filteredInvoices.length / 6)),
              totalItems: filteredInvoices.length,
              totalItemsLabel: `${filteredInvoices.length} facture${filteredInvoices.length > 1 ? "s" : ""}`,
              onPageChange: setBillingPage,
            }}
            renderActions={(row) => (
              <button
                type="button"
                className="provider-ghost-btn admin-action-btn-nowrap"
                onClick={() => openInvoicePdf(row)}
              >
                Voir facture
              </button>
            )}
          />
        </section>
      );
    }

    if (activeSection === "reviews") {
      return (
        <section className="provider-panel">
          <div className="provider-panel-head provider-panel-head-inline">
            <div>
              <h3>Reviews & Comments</h3>
              <p>Consultez les avis par prestataire puis moderez chaque retour dans une popup detaillee.</p>
            </div>
          </div>

          {reviewsLoading ? (
            <div className="admin-status-card">Chargement des avis...</div>
          ) : reviewsByProvider.length === 0 ? (
            <div className="admin-status-card">Aucun avis disponible.</div>
          ) : (
            <div className="admin-appointments-board">
              {reviewsByProvider.map((group) => (
                <button
                  key={group.provider}
                  type="button"
                  className="admin-appointment-provider-card"
                  onClick={() => openReviewsModal(group)}
                >
                  <div className="admin-appointment-provider-head">
                    <div className="admin-appointment-provider-identity">
                      <span className="admin-appointment-provider-avatar">{getInitials(group.provider)}</span>
                      <div>
                        <strong>{group.provider}</strong>
                        <p>{group.reviews.length} avis a consulter</p>
                      </div>
                    </div>

                    <div className="admin-appointment-provider-metrics">
                      <span>{group.averageRating}/5</span>
                      <small>Note moyenne</small>
                    </div>
                  </div>

                  <div className="admin-appointment-provider-summary">
                    <span className="admin-chip ok">Publies: {group.statusCount.published}</span>
                    <span className="admin-chip neutral">Masques: {group.statusCount.hidden}</span>
                  </div>

                  <span className="admin-appointment-provider-cta">Cliquer pour afficher les avis et conserver les actions</span>
                </button>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (activeSection === "services") {
      return (
        <section className="provider-panel">
          <div className="provider-panel-head provider-panel-head-inline">
            <div>
              <h3>Services des prestataires</h3>
              <p>Chaque prestataire apparait dans une carte. Ouvrez-la pour voir le detail complet de ses services et ses albums photo.</p>
            </div>
          </div>

          {servicesLoading ? (
            <div className="admin-status-card">Chargement des services...</div>
          ) : serviceProviderCards.length === 0 ? (
            <div className="admin-status-card">Aucun service disponible.</div>
          ) : (
            <div className="admin-services-provider-grid">
              {serviceProviderCards.map((providerCard) => (
                <button
                  key={providerCard.id}
                  type="button"
                  className="admin-service-provider-card"
                  onClick={() => openServiceProviderModal(providerCard)}
                >
                  <div className="admin-service-provider-card-head">
                    <div className="admin-service-provider-card-identity">
                      <div className="admin-service-provider-card-avatar">
                        {providerCard.image ? (
                          <img src={resolveAssetUrl(providerCard.image)} alt={providerCard.name} />
                        ) : (
                          <span>{getInitials(providerCard.name)}</span>
                        )}
                      </div>
                      <div>
                        <strong>{providerCard.name}</strong>
                        <p>{providerCard.city || "Ville non renseignee"}</p>
                      </div>
                    </div>

                    <div className="admin-service-provider-card-score">
                      <span>{providerCard.average_rating || 0}/5</span>
                      <small>{providerCard.review_count || 0} avis</small>
                    </div>
                  </div>

                  <p className="admin-service-provider-card-copy">
                    {providerCard.short_description || "Prestataire disponible avec plusieurs services."}
                  </p>

                  <div className="admin-service-provider-card-tags">
                    {(providerCard.service_types || []).slice(0, 4).map((item) => (
                      <span key={`${providerCard.id}-${item}`} className="admin-chip neutral">{item}</span>
                    ))}
                  </div>

                  <div className="admin-service-provider-card-metrics">
                    <span className="admin-chip ok">Services: {providerCard.service_count || 0}</span>
                    <span className="admin-chip ok">Visibles: {providerCard.visible_count || 0}</span>
                    <span className="admin-chip neutral">Masques: {providerCard.hidden_count || 0}</span>
                  </div>

                  <span className="admin-appointment-provider-cta">Cliquer pour ouvrir tous les details, services et photos</span>
                </button>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (activeSection === "packs") {
      return (
        <section className="provider-panel">
          <div className="provider-panel-head provider-panel-head-inline">
            <div>
              <h3>Packs / Promotions</h3>
              <p>Composez un pack par services puis associez un prestataire a chaque ligne pour suivre la validation.</p>
            </div>
            <button type="button" className="provider-primary-btn" onClick={openCreatePackModal}>
              Creer un pack
            </button>
          </div>

          <div className="admin-filter-bar">
            <input
              className="provider-input"
              type="search"
              value={packSearch}
              onChange={(event) => setPackSearch(event.target.value)}
              placeholder="Rechercher un pack, un service ou un prestataire"
            />
            <select
              className="provider-select"
              value={packStatusFilter}
              onChange={(event) => setPackStatusFilter(event.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="validated">Valide</option>
              <option value="expired">Expire</option>
            </select>
          </div>

          <DataTable
            columns={packColumns}
            rows={paginatedPacks}
            keyField="id"
            loading={packsLoading}
            emptyMessage="Aucun pack promo configure."
            wrapClassName="admin-packs-table-wrap"
            tableClassName="admin-data-table-packs"
            actionsColumnWidth="240px"
            pagination={{
              page: packsPage,
              totalPages: Math.max(1, Math.ceil(filteredPacks.length / 5)),
              totalItems: filteredPacks.length,
              totalItemsLabel: `${filteredPacks.length} pack${filteredPacks.length > 1 ? "s" : ""}`,
              onPageChange: setPacksPage,
            }}
            renderActions={(row) => (
              <div className="admin-pack-actions-row">
                <button type="button" className="provider-ghost-btn" onClick={() => openEditPackModal(row)}>
                  Gerer
                </button>
                <button type="button" className="provider-secondary-btn" onClick={() => togglePackStatus(row)}>
                  Reaffecter
                </button>
              </div>
            )}
          />
        </section>
      );
    }

    return (
        <section className="provider-panel">
          <div className="provider-panel-head provider-panel-head-inline">
            <div>
              <h3>Chat Supervision</h3>
              <p>Lecture seule des conversations client-prestataire.</p>
            </div>
            <button type="button" className="provider-ghost-btn" onClick={() => loadConversations()}>
              Actualiser
            </button>
          </div>

        {chatsLoading ? (
          <div className="admin-status-card">Chargement des conversations...</div>
        ) : conversations.length === 0 ? (
          <div className="admin-status-card">Aucune conversation à superviser.</div>
        ) : (
          <div className="admin-chat-supervision">
            <section className="admin-chat-panel admin-chat-conversations-panel">
              <div className="admin-chat-panel-head">
                <strong>Conversations</strong>
                <span>{filteredConversations.length} fil(s)</span>
              </div>
              <div className="admin-chat-filters">
                <input
                  className="provider-input"
                  type="search"
                  placeholder="Rechercher un client ou un prestataire"
                  value={chatSearch}
                  onChange={(event) => setChatSearch(event.target.value)}
                />
                <select
                  className="provider-select"
                  value={chatProviderFilter}
                  onChange={(event) => setChatProviderFilter(event.target.value)}
                >
                  <option value="all">Tous les prestataires</option>
                  {chatProviderOptions.map((providerName) => (
                    <option key={providerName} value={providerName}>
                      {providerName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-chat-list">
                {filteredConversations.length === 0 ? (
                  <div className="admin-chat-empty-state">
                    Aucune conversation ne correspond a votre recherche ou au prestataire selectionne.
                  </div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      className={`provider-chat-item ${activeConversation?.id === conversation.id ? "active" : ""}`}
                      onClick={() => setActiveConversationId(conversation.id)}
                    >
                      <span className="admin-chat-avatar">{getInitials(conversation.client)}</span>
                      <div className="admin-chat-item-copy">
                        <strong>{conversation.client}</strong>
                        <p>{conversation.provider}</p>
                        <small>{conversation.excerpt}</small>
                      </div>
                      <em>{conversation.lastAt}</em>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="provider-chat-window admin-readonly-chat">
              <div className="provider-chat-window-head">
                <div>
                  <h3>
                    {activeConversation?.client || "Aucune conversation"} x {activeConversation?.provider || "--"}
                  </h3>
                  <p>Mode supervision: lecture seule</p>
                </div>
                <span className="admin-chat-readonly-badge">Lecture seule</span>
              </div>
              <div className="provider-chat-messages admin-chat-messages-panel">
                {activeConversation ? (
                  (activeConversation.messages || []).map((message) => (
                    <div
                      key={message.id}
                      className={`provider-message-bubble ${
                        message.author === "provider" ? "provider" : "client"
                      }`}
                    >
                      <strong>{message.author === "provider" ? "Prestataire" : "Client"}</strong>
                      <p>{message.text}</p>
                      <small>{message.time}</small>
                    </div>
                  ))
                ) : (
                  <div className="admin-chat-empty-state">
                    Choisissez un prestataire ou modifiez la recherche pour afficher un fil de discussion.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </section>
    );
  };

  const currentSection = adminSections.find((section) => section.id === activeSection) || adminSections[0];

  return (
    <>
      <AdminLayout
        sections={adminSections}
        activeSection={activeSection}
        onSectionChange={(sectionId) => {
          setActiveSection(sectionId);
          if (isMobileSidebarViewport()) {
            setSidebarOpen(false);
          }
        }}
        isSidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        currentSection={currentSection}
        notifications={adminNotifications}
        onDismissNotification={dismissNotification}
        onNotificationClick={handleNotificationClick}
      >
        <div className="provider-stack provider-stack-simple">
          {feedbackMessage ? (
            <div className={`admin-feedback-banner ${feedbackMessage.type === "error" ? "error" : "success"}`}>
              <span className="admin-feedback-banner-label">
                {feedbackMessage.type === "error" ? "Attention" : "Confirmation"}
              </span>
              <p>{feedbackMessage.message}</p>
            </div>
          ) : null}
          {renderSection()}
        </div>
      </AdminLayout>

      <Modal
        open={appointmentsModalOpen}
        title={selectedAppointmentGroup ? `Rendez-vous de ${selectedAppointmentGroup.provider}` : "Rendez-vous"}
        onClose={() => setAppointmentsModalOpen(false)}
        actions={
          <button type="button" className="provider-primary-btn" onClick={() => setAppointmentsModalOpen(false)}>
            Fermer
          </button>
        }
      >
        <div className="admin-appointment-modal-list">
          {(selectedAppointmentGroup?.appointments || []).map((appointment) => (
            <article key={appointment.id} className="admin-appointment-item">
              <div className="admin-appointment-item-main">
                <div>
                  <span className="admin-appointment-item-label">Client</span>
                  <strong>{appointment.client}</strong>
                </div>
                <div>
                  <span className="admin-appointment-item-label">Date</span>
                  <strong>{formatAppointmentDate(appointment.date)}</strong>
                </div>
              </div>

              <div className="admin-appointment-item-side">
                <span className={`admin-chip ${statusClass(appointment.status)}`}>
                  {statusLabels[appointment.status] || appointment.status}
                </span>
                <strong>{formatCurrency(appointment.amount)}</strong>
              </div>
            </article>
          ))}
          {!selectedAppointmentGroup?.appointments?.length ? (
            <div className="admin-status-card">Aucun rendez-vous a afficher pour ce prestataire.</div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={reviewsModalOpen}
        title={selectedReviewGroup ? `Avis de ${selectedReviewGroup.provider}` : "Avis"}
        onClose={() => setReviewsModalOpen(false)}
        actions={
          <button type="button" className="provider-primary-btn" onClick={() => setReviewsModalOpen(false)}>
            Fermer
          </button>
        }
      >
        <div className="admin-review-modal-list">
          {(selectedReviewGroup?.reviews || []).map((review) => (
            <article key={review.id} className="admin-review-item">
              <div className="admin-review-item-head">
                <div>
                  <strong>{review.author}</strong>
                  <small>{review.createdAt || "Date indisponible"}</small>
                </div>
                <div className="admin-review-item-side">
                  <span className="admin-cell-nowrap">{review.rating}/5</span>
                  <span className={`admin-chip ${statusClass(review.status)}`}>
                    {getReviewStatusLabel(review.status)}
                  </span>
                </div>
              </div>

              <p>{review.comment}</p>

              <div className="admin-review-item-actions">
                <button
                  type="button"
                  className="provider-ghost-btn"
                  onClick={() => moderateReview(review, review.status === "hidden" ? "published" : "hidden")}
                >
                  {review.status === "hidden" ? "Publier" : "Masquer"}
                </button>
                <button type="button" className="provider-secondary-btn" onClick={() => deleteReview(review)}>
                  Supprimer
                </button>
              </div>
            </article>
          ))}
          {!selectedReviewGroup?.reviews?.length ? (
            <div className="admin-status-card">Aucun avis a afficher pour ce prestataire.</div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={providerModalOpen}
        title="Details du prestataire"
        onClose={() => setProviderModalOpen(false)}
        actions={
          <button type="button" className="provider-primary-btn" onClick={() => setProviderModalOpen(false)}>
            Fermer
          </button>
        }
      >
        <div className="admin-provider-details-shell">
          <div className="admin-detail-grid">
            <div><strong>Nom</strong><p>{providerDetails?.name || "-"}</p></div>
            <div><strong>Service</strong><p>{providerDetails?.category || "-"}</p></div>
            <div><strong>Ville</strong><p>{providerDetails?.city || "-"}</p></div>
            <div><strong>Email</strong><p>{providerDetails?.email || "-"}</p></div>
            <div><strong>Telephone</strong><p>{providerDetails?.phone || "-"}</p></div>
            <div><strong>Instagram</strong><p>{providerDetails?.instagram || "-"}</p></div>
            <div><strong>Site web</strong><p>{providerDetails?.website || "-"}</p></div>
            <div><strong>Statut</strong><p>{statusLabels[providerDetails?.status] || providerDetails?.status || "-"}</p></div>
            <div><strong>Note</strong><p>{providerDetails?.rating}/5</p></div>
            <div><strong>Inscription</strong><p>{providerDetails?.joinedAt || "-"}</p></div>
          </div>
          <div className="admin-provider-description-card">
            <strong>Description</strong>
            <p>{providerDetails?.description || "Aucune description fournie."}</p>
          </div>
          <div className="admin-provider-gallery">
            <article className="admin-provider-photo-card">
              <div className="admin-provider-photo-frame">
                {providerDetails?.profilePhoto ? (
                  <img src={resolveAssetUrl(providerDetails.profilePhoto)} alt={`Photo principale de ${providerDetails?.name || "ce prestataire"}`} />
                ) : (
                  <span>Aucune photo principale</span>
                )}
              </div>
              
            </article>
            <article className="admin-provider-photo-card">
              <div className="admin-provider-photo-frame">
                {providerDetails?.coverPhoto ? (
                  <img src={resolveAssetUrl(providerDetails.coverPhoto)} alt={`Photo secondaire de ${providerDetails?.name || "ce prestataire"}`} />
                ) : (
                  <span>Aucune photo secondaire</span>
                )}
              </div>
              
            </article>
          </div>
        </div>
      </Modal>

      <Modal
        open={invoiceModalOpen}
        title="Facture"
        onClose={() => setInvoiceModalOpen(false)}
        actions={<button type="button" className="provider-primary-btn" onClick={() => setInvoiceModalOpen(false)}>Fermer</button>}
      >
        <div className="admin-detail-grid">
          <div><strong>Numero</strong><p>{selectedInvoice?.id}</p></div>
          <div><strong>Client</strong><p>{selectedInvoice?.client}</p></div>
          <div><strong>Montant</strong><p>{selectedInvoice ? formatCurrency(selectedInvoice.amount) : "-"}</p></div>
          <div><strong>Statut</strong><p>{selectedInvoice ? statusLabels[selectedInvoice.status] : "-"}</p></div>
          <div><strong>Date emission</strong><p>{selectedInvoice?.issuedAt}</p></div>
        </div>
      </Modal>

      <Modal
        open={serviceProviderModalOpen}
        title={selectedServiceProvider?.name || "Details prestataire"}
        onClose={() => setServiceProviderModalOpen(false)}
        actions={<button type="button" className="provider-primary-btn" onClick={() => setServiceProviderModalOpen(false)}>Fermer</button>}
      >
        <div className="admin-service-provider-modal">
          <section className="admin-service-provider-modal-hero">
            <div className="admin-service-provider-modal-avatar">
              {selectedServiceProvider?.image ? (
                <img src={resolveAssetUrl(selectedServiceProvider.image)} alt={selectedServiceProvider?.name || "Prestataire"} />
              ) : (
                <span>{getInitials(selectedServiceProvider?.name)}</span>
              )}
            </div>
            <div className="admin-service-provider-modal-copy">
              <strong>{selectedServiceProvider?.name || "-"}</strong>
              <p>{selectedServiceProvider?.short_description || "Aucune presentation disponible."}</p>
              <div className="admin-service-provider-modal-metrics">
                <span className="admin-chip neutral">{selectedServiceProvider?.city || "Ville non renseignee"}</span>
                <span className="admin-chip ok">{selectedServiceProvider?.service_count || 0} service(s)</span>
                <span className="admin-chip ok">{selectedServiceProvider?.visible_count || 0} visible(s)</span>
                <span className="admin-chip neutral">{selectedServiceProvider?.hidden_count || 0} masque(s)</span>
              </div>
            </div>
          </section>

          <div className="admin-service-provider-modal-list">
            {(selectedServiceProvider?.services || []).map((service) => {
              const gallery = Array.isArray(service.images) && service.images.length > 0
                ? service.images
                : service.image
                  ? [{ id: `fallback-${service.id}`, image_path: service.image, url: service.image }]
                  : [];

              return (
                <article key={service.id} className="admin-service-detail-card">
                  <div className="admin-service-detail-head">
                    <div>
                      <strong>{service.title}</strong>
                      <p>{service.category || service.type || "Service"}</p>
                    </div>
                    <div className="admin-service-detail-side">
                      <span className={`admin-chip ${service.is_visible ? "ok" : "neutral"}`}>
                        {service.is_visible ? "Visible" : "Masque"}
                      </span>
                      <small>{formatCurrency(service.price)} • {service.rating || 0}/5</small>
                    </div>
                  </div>

                  <div className="admin-detail-grid">
                    <div><strong>Ville</strong><p>{service.city || "-"}</p></div>
                    <div><strong>Avis</strong><p>{service.review_count || 0}</p></div>
                    <div><strong>Prestataire</strong><p>{service.provider_name || service.prestataire_name || "-"}</p></div>
                    <div><strong>Statut</strong><p>{service.status || "-"}</p></div>
                  </div>

                  <div className="admin-provider-description-card">
                    <strong>Description</strong>
                    <p>{service.description || "Aucune description pour ce service."}</p>
                  </div>

                  <div className="admin-service-album-grid">
                    {gallery.length > 0 ? (
                      gallery.map((image, index) => (
                        <div key={image.id || `${service.id}-${index}`} className="admin-service-album-item">
                          <img
                            src={resolveAssetUrl(image.url || image.image_path)}
                            alt={`${service.title} visuel ${index + 1}`}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="admin-service-album-empty">Aucun album photo pour ce service.</div>
                    )}
                  </div>

                  <div className="admin-service-detail-actions">
                    <button
                      type="button"
                      className={service.is_visible ? "provider-secondary-btn" : "provider-primary-btn"}
                      onClick={() => moderateServiceVisibility(service, !service.is_visible)}
                    >
                      {service.is_visible ? "Masquer ce service" : "Afficher ce service"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </Modal>

      <Modal
        open={packModalOpen}
        title={editingPackId ? "Modifier un pack" : "Creer un pack"}
        onClose={() => setPackModalOpen(false)}
        actions={
          <>
            <button type="button" className="provider-ghost-btn" onClick={() => setPackModalOpen(false)}>Annuler</button>
            {editingPackId && packForm.expiresAt && new Date(`${packForm.expiresAt}T00:00:00`).getTime() < new Date(new Date().setHours(0, 0, 0, 0)) ? (
              <button
                type="button"
                className="provider-secondary-btn"
                onClick={() => removeExpiredPack(editingPackId)}
                disabled={packSubmitting}
              >
                Supprimer le pack
              </button>
            ) : null}
            <button type="button" className="provider-primary-btn" onClick={submitPack} disabled={packSubmitting}>
              {packSubmitting ? "Enregistrement..." : "Enregistrer"}
            </button>
          </>
        }
      >
        <form className="admin-form-grid" onSubmit={submitPack}>
          <input className="provider-input" placeholder="Nom du pack" value={packForm.name} onChange={(event) => setPackForm((prev) => ({ ...prev, name: event.target.value }))} />
          <input className="provider-input" type="number" placeholder="Prix" value={packForm.price} onChange={(event) => setPackForm((prev) => ({ ...prev, price: event.target.value }))} />
          <input className="provider-input" type="date" value={packForm.expiresAt} onChange={(event) => setPackForm((prev) => ({ ...prev, expiresAt: event.target.value }))} />
          <textarea className="provider-textarea" placeholder="Description du pack" value={packForm.description} onChange={(event) => setPackForm((prev) => ({ ...prev, description: event.target.value }))} />

          <div className="admin-pack-builder">
            <div className="admin-pack-builder-head">
              <strong>Services et prestataires</strong>
              <button type="button" className="provider-ghost-btn" onClick={addPackItemRow}>
                Ajouter un service
              </button>
            </div>

            <div className="admin-pack-builder-list">
              {packForm.items.map((item, index) => {
                const providerChoices = getProvidersForServiceCategory(item.serviceCategory);
                const selectionValue =
                  item.serviceId && item.providerId ? `${item.serviceId}:${item.providerId}` : "";
                const requiresReplacement = item.providerStatus === "refused";

                return (
                  <div
                    key={`${item.id || item.serviceCategory}-${index}`}
                    className={`admin-pack-builder-row ${requiresReplacement ? "admin-pack-builder-row-alert" : ""}`}
                  >
                    <select
                      className="provider-select"
                      value={item.serviceCategory}
                      onChange={(event) => updatePackItemField(index, "serviceCategory", event.target.value)}
                    >
                      <option value="">Choisir un type de service</option>
                      {packProviderOptions.map((option) => (
                        <option key={option.serviceCategory} value={option.serviceCategory}>
                          {option.serviceCategory}
                        </option>
                      ))}
                    </select>

                    <select
                      className="provider-select"
                      value={selectionValue}
                      onChange={(event) => updatePackItemField(index, "providerSelection", event.target.value)}
                      disabled={!item.serviceCategory}
                    >
                      <option value="">Choisir un prestataire</option>
                      {providerChoices.map((option) => (
                        <option
                          key={`${option.serviceId}-${option.providerId}`}
                          value={`${option.serviceId}:${option.providerId}`}
                        >
                          {option.providerName} - {option.serviceTitle}
                        </option>
                      ))}
                    </select>

                    <button type="button" className="provider-secondary-btn" onClick={() => removePackItemRow(index)}>
                      Retirer
                    </button>

                    {requiresReplacement ? (
                      <p className="admin-pack-builder-warning">
                        Ce prestataire a refuse le pack. Selectionnez ici le prestataire a remplacer.
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={confirmState.open}
        title={confirmState.title}
        onClose={closeConfirm}
        actions={
          <>
            <button type="button" className="provider-ghost-btn" onClick={closeConfirm}>Annuler</button>
            <button
              type="button"
              className="provider-secondary-btn"
              onClick={() => {
                confirmState.action?.();
                closeConfirm();
              }}
            >
              {confirmState.confirmLabel}
            </button>
          </>
        }
      >
        <p className="admin-confirm-copy">{confirmState.message}</p>
      </Modal>
    </>
  );
};

export default AdminDashboard;
