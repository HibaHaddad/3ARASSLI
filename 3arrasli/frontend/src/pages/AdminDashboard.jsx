
import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import DataTable from "../components/admin/DataTable";
import Modal from "../components/admin/Modal";
import api from "../services/api";
import {
  adminSections,
  mockAppointments,
  mockContracts,
  mockConversations,
  mockInvoices,
  mockPacks,
  mockReviews,
} from "./admin/adminData";
import "./provider.css";
import "./admin.css";

const formatCurrency = (value) => `${value} TND`;

const statusLabels = {
  active: "Actif",
  inactive: "Inactif",
  pending: "En attente",
  confirmed: "Confirme",
  cancelled: "Annule",
  "pending-signature": "Signature en attente",
  signed: "Signe",
  paid: "Payee",
  unpaid: "Impayee",
  published: "Publie",
  flagged: "Signale",
  hidden: "Masque",
};

const statusClass = (status) => {
  if (["active", "confirmed", "signed", "paid", "published"].includes(status)) {
    return "ok";
  }

  if (["pending", "pending-signature", "unpaid", "flagged"].includes(status)) {
    return "warn";
  }

  return "neutral";
};

const defaultProviderForm = {
  name: "",
  category: "",
  city: "",
  email: "",
  phone: "",
  description: "",
  instagram: "",
  website: "",
  status: "active",
};

const defaultPackForm = {
  name: "",
  price: "",
  duration: "",
  services: "",
};

const AdminDashboard = () => {
const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const [providers, setProviders] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [packs, setPacks] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);

  const [providerSearch, setProviderSearch] = useState("");
  const [providerStatusFilter, setProviderStatusFilter] = useState("all");
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState("all");

  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [providerForm, setProviderForm] = useState(defaultProviderForm);
  const [providerDetails, setProviderDetails] = useState(null);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providerSaving, setProviderSaving] = useState(false);

  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [appointmentDraft, setAppointmentDraft] = useState(null);

  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [packModalOpen, setPackModalOpen] = useState(false);
  const [editingPackId, setEditingPackId] = useState(null);
  const [packForm, setPackForm] = useState(defaultPackForm);

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirmer",
    action: null,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppointments(mockAppointments);
      setContracts(mockContracts);
      setInvoices(mockInvoices);
      setReviews(mockReviews);
      setPacks(mockPacks);
      setConversations(mockConversations);
      setActiveConversationId(mockConversations[0]?.id || null);
      setInitialLoading(false);
    }, 700);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (initialLoading) {
      return;
    }

    setSidebarOpen(false);
    setSectionLoading(true);
    const timer = setTimeout(() => setSectionLoading(false), 260);

    return () => clearTimeout(timer);
  }, [activeSection, initialLoading]);

  const pushNotification = (type, message) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    }, 3400);
  };

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  };

  const loadProviders = async () => {
    setProvidersLoading(true);

    try {
      const response = await api.get("/api/admin/providers");
      setProviders(response.data.providers || []);
    } catch (error) {
      pushNotification("error", error.response?.data?.message || "Impossible de charger les prestataires.");
      setProviders([]);
    } finally {
      setProvidersLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
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

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) ||
    conversations[0] ||
    null;

  const kpis = useMemo(
    () => [
      {
        id: "providers-active",
        label: "Prestataires actifs",
        value: providers.filter((item) => item.status === "active").length,
      },
      {
        id: "providers-total",
        label: "Total prestataires",
        value: providers.length,
      },
      {
        id: "appointments-pending",
        label: "Rdv en attente",
        value: appointments.filter((item) => item.status === "pending").length,
      },
      {
        id: "appointments-total",
        label: "Total rdv",
        value: appointments.length,
      },
      {
        id: "contracts-pending",
        label: "Contrats à signer",
        value: contracts.filter((item) => item.status === "pending-signature").length,
      },
      {
        id: "invoices-unpaid",
        label: "Factures impayées",
        value: invoices.filter((item) => item.status === "unpaid").length,
      },
      {
        id: "revenue",
        label: "Chiffre d'affaires",
        value: invoices
          .filter((item) => item.status === "paid")
          .reduce((sum, item) => sum + item.amount, 0),
      },
      {
        id: "reviews-total",
        label: "Total avis",
        value: reviews.length,
      },
      {
        id: "packs-active",
        label: "Packs actifs",
        value: packs.filter((item) => item.status === "active").length,
      },
    ],
    [appointments, contracts, invoices, providers, reviews, packs]
  );

  const openProviderDetailsModal = (provider) => {
    setProviderDetails(provider);
    setProviderForm({
      name: provider.name || "",
      category: provider.category || "",
      city: provider.city || "",
      email: provider.email || "",
      phone: provider.phone || "",
      description: provider.description || "",
      instagram: provider.instagram || "",
      website: provider.website || "",
      status: provider.status || "active",
    });
    setProviderModalOpen(true);
  };

  const submitProvider = async (event) => {
    event.preventDefault();

    if (!providerForm.name || !providerForm.category || !providerForm.city || !providerForm.email) {
      pushNotification("error", "Tous les champs prestataire sont obligatoires.");
      return;
    }

    if (!providerDetails?.id) {
      pushNotification("error", "Prestataire introuvable.");
      return;
    }

    setProviderSaving(true);

    try {
      const response = await api.put(`/api/admin/providers/${providerDetails.id}`, providerForm);
      const updatedProvider = response.data.provider;

      setProviders((prev) =>
        prev.map((item) => (item.id === updatedProvider.id ? updatedProvider : item))
      );
      setProviderDetails(updatedProvider);
      setProviderModalOpen(false);
      pushNotification("success", response.data.message || "Prestataire mis a jour avec succes.");
    } catch (error) {
      pushNotification("error", error.response?.data?.message || "La mise a jour du prestataire a echoue.");
    } finally {
      setProviderSaving(false);
    }
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
            setProviderForm({
              name: updatedProvider.name || "",
              category: updatedProvider.category || "",
              city: updatedProvider.city || "",
              email: updatedProvider.email || "",
              phone: updatedProvider.phone || "",
              description: updatedProvider.description || "",
              instagram: updatedProvider.instagram || "",
              website: updatedProvider.website || "",
              status: updatedProvider.status || "active",
            });
          }
          pushNotification("success", `Compte ${activating ? "active" : "desactive"} avec succes.`);
        } catch (error) {
          pushNotification("error", error.response?.data?.message || "Impossible de modifier le statut.");
        }
      }
    );
  };

  const openAppointmentEditModal = (appointment) => {
    setAppointmentDraft({ ...appointment });
    setAppointmentModalOpen(true);
  };

  const saveAppointment = (event) => {
    event.preventDefault();

    if (!appointmentDraft.client || !appointmentDraft.provider || !appointmentDraft.date) {
      pushNotification("error", "Veuillez completer les champs du rendez-vous.");
      return;
    }

    setAppointments((prev) =>
      prev.map((item) => (item.id === appointmentDraft.id ? appointmentDraft : item))
    );
    setAppointmentModalOpen(false);
    pushNotification("success", "Rendez-vous modifie avec succes.");
  };

  const deleteAppointment = (appointment) => {
    openConfirm(
      "Supprimer le rendez-vous",
      `Supprimer le rendez-vous de ${appointment.client} avec ${appointment.provider} ?`,
      "Supprimer",
      () => {
        setAppointments((prev) => prev.filter((item) => item.id !== appointment.id));
        pushNotification("success", "Rendez-vous supprime.");
      }
    );
  };

  const openContractModal = (contract) => {
    setSelectedContract(contract);
    setContractModalOpen(true);
  };

  const signContractUi = (contract) => {
    setContracts((prev) =>
      prev.map((item) => (item.id === contract.id ? { ...item, status: "signed" } : item))
    );
    setSelectedContract((prev) => (prev ? { ...prev, status: "signed" } : prev));
    pushNotification("success", "Signature numerique (UI) enregistree.");
  };

  const openInvoiceModal = (invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceModalOpen(true);
  };

  const generateInvoice = () => {
    const pendingAppointment = appointments.find(
      (appointment) => !invoices.some((invoice) => invoice.appointmentId === appointment.id)
    );

    if (!pendingAppointment) {
      pushNotification("error", "Aucun rendez-vous disponible pour generer une facture.");
      return;
    }

    const newInvoice = {
      id: `INV-2026-${String(invoices.length + 1).padStart(3, "0")}`,
      appointmentId: pendingAppointment.id,
      client: pendingAppointment.client,
      amount: pendingAppointment.amount,
      status: "unpaid",
      issuedAt: new Date().toISOString().slice(0, 10),
    };

    setInvoices((prev) => [newInvoice, ...prev]);
    pushNotification("success", "Facture generee avec succes.");
  };

  const moderateReview = (review, nextStatus) => {
    setReviews((prev) =>
      prev.map((item) => (item.id === review.id ? { ...item, status: nextStatus } : item))
    );
    pushNotification("success", "Avis modere avec succes.");
  };

  const deleteReview = (review) => {
    openConfirm(
      "Supprimer cet avis",
      `Supprimer l'avis de ${review.author} sur ${review.target} ?`,
      "Supprimer",
      () => {
        setReviews((prev) => prev.filter((item) => item.id !== review.id));
        pushNotification("success", "Avis supprime.");
      }
    );
  };

  const openCreatePackModal = () => {
    setEditingPackId(null);
    setPackForm(defaultPackForm);
    setPackModalOpen(true);
  };

  const openEditPackModal = (pack) => {
    setEditingPackId(pack.id);
    setPackForm({
      name: pack.name,
      price: String(pack.price),
      duration: pack.duration,
      services: pack.services,
    });
    setPackModalOpen(true);
  };

  const submitPack = (event) => {
    event.preventDefault();

    if (!packForm.name || !packForm.price || !packForm.duration || !packForm.services) {
      pushNotification("error", "Veuillez renseigner tous les champs du pack.");
      return;
    }

    if (editingPackId) {
      setPacks((prev) =>
        prev.map((item) =>
          item.id === editingPackId
            ? {
                ...item,
                ...packForm,
                price: Number(packForm.price),
              }
            : item
        )
      );
      pushNotification("success", "Pack modifie avec succes.");
    } else {
      setPacks((prev) => [
        {
          id: Date.now(),
          ...packForm,
          price: Number(packForm.price),
          status: "active",
        },
        ...prev,
      ]);
      pushNotification("success", "Pack cree avec succes.");
    }

    setPackModalOpen(false);
    setEditingPackId(null);
    setPackForm(defaultPackForm);
  };

  const togglePackStatus = (pack) => {
    const nextStatus = pack.status === "active" ? "inactive" : "active";
    setPacks((prev) => prev.map((item) => (item.id === pack.id ? { ...item, status: nextStatus } : item)));
    pushNotification("success", `Pack ${nextStatus === "active" ? "active" : "desactive"}.`);
  };

  const providerColumns = [
    {
      key: "name",
      header: "Prestataire",
      render: (_, row) => (
        <div className="admin-cell-stack">
          <strong>{row.name}</strong>
          <small>{row.email}</small>
        </div>
      ),
    },
    { key: "category", header: "Service" },
    { key: "city", header: "Ville" },
    {
      key: "rating",
      header: "Note",
      render: (value) => `${value}/5`,
    },
    {
      key: "status",
      header: "Statut",
      render: (value) => (
        <span className={`admin-chip ${statusClass(value)}`}>{statusLabels[value] || value}</span>
      ),
    },
  ];

  const appointmentColumns = [
    { key: "client", header: "Client" },
    { key: "provider", header: "Prestataire" },
    { key: "date", header: "Date" },
    {
      key: "amount",
      header: "Montant",
      render: (value) => formatCurrency(value),
    },
    {
      key: "status",
      header: "Statut",
      render: (value) => (
        <span className={`admin-chip ${statusClass(value)}`}>{statusLabels[value] || value}</span>
      ),
    },
  ];

  const contractColumns = [
    { key: "id", header: "Ref" },
    { key: "title", header: "Contrat" },
    { key: "client", header: "Client" },
    { key: "provider", header: "Prestataire" },
    {
      key: "status",
      header: "Statut",
      render: (value) => (
        <span className={`admin-chip ${statusClass(value)}`}>{statusLabels[value] || value}</span>
      ),
    },
  ];

  const invoiceColumns = [
    { key: "id", header: "Facture" },
    { key: "client", header: "Client" },
    {
      key: "amount",
      header: "Montant",
      render: (value) => formatCurrency(value),
    },
    { key: "issuedAt", header: "Date emission" },
    {
      key: "status",
      header: "Statut",
      render: (value) => (
        <span className={`admin-chip ${statusClass(value)}`}>{statusLabels[value] || value}</span>
      ),
    },
  ];

  const reviewColumns = [
    {
      key: "author",
      header: "Auteur",
      render: (_, row) => (
        <div className="admin-cell-stack">
          <strong>{row.author}</strong>
          <small>{row.target}</small>
        </div>
      ),
    },
    {
      key: "rating",
      header: "Note",
      render: (value) => `${value}/5`,
    },
    { key: "comment", header: "Commentaire" },
    {
      key: "status",
      header: "Statut",
      render: (value) => (
        <span className={`admin-chip ${statusClass(value)}`}>{statusLabels[value] || value}</span>
      ),
    },
  ];

  const packColumns = [
    { key: "name", header: "Nom" },
    {
      key: "price",
      header: "Prix",
      render: (value) => formatCurrency(value),
    },
    { key: "duration", header: "Duree" },
    { key: "services", header: "Services inclus" },
    {
      key: "status",
      header: "Statut",
      render: (value) => (
        <span className={`admin-chip ${statusClass(value)}`}>{statusLabels[value] || value}</span>
      ),
    },
  ];

  const renderSection = () => {
    if (sectionLoading || initialLoading) {
      return <div className="admin-status-card">Chargement de la section...</div>;
    }

    if (activeSection === "dashboard") {
      return (
        <section className="provider-panel">
          <div className="provider-panel-head">
            <h3>Tableau de bord administrateur</h3>
            <p>Indicateurs clés en temps réel de votre plateforme.</p>
          </div>
          <section className="admin-kpi-grid admin-kpi-grid-dashboard">
            {kpis.map((item) => (
              <article key={item.id} className="provider-stat-card cream">
                <div className="provider-stat-topline">
                  <span>{item.label}</span>
                  <div className="provider-stat-icon">ADM</div>
                </div>
                <strong>{item.value}</strong>
              </article>
            ))}
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
            renderActions={(row) => (
              <>
                <button type="button" className="provider-ghost-btn" onClick={() => openProviderDetailsModal(row)}>
                  Details
                </button>
                <button type="button" className="provider-secondary-btn" onClick={() => toggleProviderStatus(row)}>
                  {row.status === "active" ? "Desactiver" : "Activer"}
                </button>
              </>
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
              <h3>Appointment Management</h3>
              <p>Filtrez par statut et modifiez les rendez-vous.</p>
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

          <DataTable
            columns={appointmentColumns}
            rows={filteredAppointments}
            keyField="id"
            loading={false}
            emptyMessage="Aucun rendez-vous disponible pour ce statut."
            renderActions={(row) => (
              <>
                <button type="button" className="provider-ghost-btn" onClick={() => openAppointmentEditModal(row)}>
                  Modifier
                </button>
                <button type="button" className="provider-secondary-btn" onClick={() => deleteAppointment(row)}>
                  Supprimer
                </button>
              </>
            )}
          />
        </section>
      );
    }

    if (activeSection === "contracts") {
      return (
        <section className="provider-panel">
          <div className="provider-panel-head provider-panel-head-inline">
            <div>
              <h3>Contracts</h3>
              <p>Suivi complet des contrats et support de signature numerique (UI).</p>
            </div>
          </div>

          <DataTable
            columns={contractColumns}
            rows={contracts}
            keyField="id"
            loading={false}
            emptyMessage="Aucun contrat disponible."
            renderActions={(row) => (
              <>
                <button type="button" className="provider-ghost-btn" onClick={() => openContractModal(row)}>
                  Voir
                </button>
                <button
                  type="button"
                  className="provider-secondary-btn"
                  onClick={() => signContractUi(row)}
                  disabled={row.status === "signed"}
                >
                  {row.status === "signed" ? "Signe" : "Signer (UI)"}
                </button>
              </>
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
              <p>Statuts payee/impayee, generation et consultation des factures.</p>
            </div>
            <button type="button" className="provider-primary-btn" onClick={generateInvoice}>
              Generer une facture
            </button>
          </div>

          <DataTable
            columns={invoiceColumns}
            rows={invoices}
            keyField="id"
            loading={false}
            emptyMessage="Aucune facture trouvee."
            renderActions={(row) => (
              <button type="button" className="provider-ghost-btn" onClick={() => openInvoiceModal(row)}>
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
              <p>Moderation des retours utilisateurs.</p>
            </div>
          </div>

          <DataTable
            columns={reviewColumns}
            rows={reviews}
            keyField="id"
            loading={false}
            emptyMessage="Aucun avis disponible."
            renderActions={(row) => (
              <>
                <button
                  type="button"
                  className="provider-ghost-btn"
                  onClick={() => moderateReview(row, row.status === "hidden" ? "published" : "hidden")}
                >
                  {row.status === "hidden" ? "Publier" : "Masquer"}
                </button>
                <button type="button" className="provider-secondary-btn" onClick={() => deleteReview(row)}>
                  Supprimer
                </button>
              </>
            )}
          />
        </section>
      );
    }

    if (activeSection === "packs") {
      return (
        <section className="provider-panel">
          <div className="provider-panel-head provider-panel-head-inline">
            <div>
              <h3>Packs / Promotions</h3>
              <p>Creation et gestion des offres promotionnelles.</p>
            </div>
            <button type="button" className="provider-primary-btn" onClick={openCreatePackModal}>
              Creer un pack
            </button>
          </div>

          <DataTable
            columns={packColumns}
            rows={packs}
            keyField="id"
            loading={false}
            emptyMessage="Aucun pack promo configure."
            renderActions={(row) => (
              <>
                <button type="button" className="provider-ghost-btn" onClick={() => openEditPackModal(row)}>
                  Modifier
                </button>
                <button type="button" className="provider-secondary-btn" onClick={() => togglePackStatus(row)}>
                  {row.status === "active" ? "Desactiver" : "Activer"}
                </button>
              </>
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
        </div>

        {conversations.length === 0 ? (
          <div className="admin-status-card">Aucune conversation a superviser.</div>
        ) : (
          <div className="admin-chat-supervision">
            <div className="admin-chat-list">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  className={`provider-chat-item ${activeConversation?.id === conversation.id ? "active" : ""}`}
                  onClick={() => setActiveConversationId(conversation.id)}
                >
                  <div>
                    <strong>{conversation.client}</strong>
                    <p>{conversation.provider}</p>
                    <small>{conversation.excerpt}</small>
                  </div>
                  <em>{conversation.lastAt}</em>
                </button>
              ))}
            </div>

            <div className="provider-chat-window admin-readonly-chat">
              <div className="provider-chat-window-head">
                <h3>
                  {activeConversation?.client} x {activeConversation?.provider}
                </h3>
                <p>Mode supervision: lecture seule</p>
              </div>
              <div className="provider-chat-messages">
                {activeConversation?.messages.map((message) => (
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
                ))}
              </div>
            </div>
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
        onSectionChange={setActiveSection}
        isSidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        currentSection={currentSection}
        notifications={notifications}
        onDismissNotification={dismissNotification}
      >
        <div className="provider-stack provider-stack-simple">
          {renderSection()}
        </div>
      </AdminLayout>

      <Modal
        open={providerModalOpen}
        title="Modifier prestataire"
        onClose={() => setProviderModalOpen(false)}
        actions={
          <>
            <button type="button" className="provider-ghost-btn" onClick={() => setProviderModalOpen(false)}>
              Annuler
            </button>
            <button type="button" className="provider-primary-btn" onClick={submitProvider} disabled={providerSaving}>
              {providerSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </>
        }
      >
        <form className="admin-form-grid" onSubmit={submitProvider}>
          <input
            className="provider-input"
            placeholder="Nom"
            value={providerForm.name}
            onChange={(event) => setProviderForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <input
            className="provider-input"
            placeholder="Categorie"
            value={providerForm.category}
            onChange={(event) => setProviderForm((prev) => ({ ...prev, category: event.target.value }))}
          />
          <input
            className="provider-input"
            placeholder="Ville"
            value={providerForm.city}
            onChange={(event) => setProviderForm((prev) => ({ ...prev, city: event.target.value }))}
          />
          <input
            className="provider-input"
            placeholder="Email"
            value={providerForm.email}
            onChange={(event) => setProviderForm((prev) => ({ ...prev, email: event.target.value }))}
          />
          <input
            className="provider-input"
            placeholder="Telephone"
            value={providerForm.phone}
            onChange={(event) => setProviderForm((prev) => ({ ...prev, phone: event.target.value }))}
          />
          <input
            className="provider-input"
            placeholder="Instagram"
            value={providerForm.instagram}
            onChange={(event) => setProviderForm((prev) => ({ ...prev, instagram: event.target.value }))}
          />
          <input
            className="provider-input"
            placeholder="Site web"
            value={providerForm.website}
            onChange={(event) => setProviderForm((prev) => ({ ...prev, website: event.target.value }))}
          />
          <select
            className="provider-select"
            value={providerForm.status}
            onChange={(event) => setProviderForm((prev) => ({ ...prev, status: event.target.value }))}
          >
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
          </select>
          <textarea
            className="provider-input"
            placeholder="Description"
            value={providerForm.description}
            onChange={(event) => setProviderForm((prev) => ({ ...prev, description: event.target.value }))}
            rows={4}
          />
          <div className="admin-detail-grid">
            <div><strong>Note</strong><p>{providerDetails?.rating}/5</p></div>
            <div><strong>Inscription</strong><p>{providerDetails?.joinedAt}</p></div>
          </div>
        </form>
      </Modal>

      <Modal
        open={appointmentModalOpen}
        title="Modifier un rendez-vous"
        onClose={() => setAppointmentModalOpen(false)}
        actions={
          <>
            <button type="button" className="provider-ghost-btn" onClick={() => setAppointmentModalOpen(false)}>
              Annuler
            </button>
            <button type="button" className="provider-primary-btn" onClick={saveAppointment}>
              Enregistrer
            </button>
          </>
        }
      >
        <form className="admin-form-grid" onSubmit={saveAppointment}>
          <input className="provider-input" value={appointmentDraft?.client || ""} onChange={(event) => setAppointmentDraft((prev) => ({ ...prev, client: event.target.value }))} placeholder="Client" />
          <input className="provider-input" value={appointmentDraft?.provider || ""} onChange={(event) => setAppointmentDraft((prev) => ({ ...prev, provider: event.target.value }))} placeholder="Prestataire" />
          <input className="provider-input" type="date" value={appointmentDraft?.date || ""} onChange={(event) => setAppointmentDraft((prev) => ({ ...prev, date: event.target.value }))} />
          <select className="provider-select" value={appointmentDraft?.status || "pending"} onChange={(event) => setAppointmentDraft((prev) => ({ ...prev, status: event.target.value }))}>
            <option value="pending">En attente</option>
            <option value="confirmed">Confirme</option>
            <option value="cancelled">Annule</option>
          </select>
        </form>
      </Modal>

      <Modal
        open={contractModalOpen}
        title="Details du contrat"
        onClose={() => setContractModalOpen(false)}
        actions={
          <>
            <button type="button" className="provider-ghost-btn" onClick={() => setContractModalOpen(false)}>Fermer</button>
            <button type="button" className="provider-primary-btn" disabled={selectedContract?.status === "signed"} onClick={() => selectedContract && signContractUi(selectedContract)}>
              {selectedContract?.status === "signed" ? "Deja signe" : "Signer numeriquement (UI)"}
            </button>
          </>
        }
      >
        <div className="admin-detail-grid">
          <div><strong>Reference</strong><p>{selectedContract?.id}</p></div>
          <div><strong>Contrat</strong><p>{selectedContract?.title}</p></div>
          <div><strong>Client</strong><p>{selectedContract?.client}</p></div>
          <div><strong>Prestataire</strong><p>{selectedContract?.provider}</p></div>
          <div><strong>Statut</strong><p>{selectedContract ? statusLabels[selectedContract.status] : "-"}</p></div>
        </div>
        <div className="admin-signature-box">
          <p>{selectedContract?.details}</p>
          <div className="admin-signature-placeholder">Zone de signature numerique (UI)</div>
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
        open={packModalOpen}
        title={editingPackId ? "Modifier un pack" : "Creer un pack"}
        onClose={() => setPackModalOpen(false)}
        actions={
          <>
            <button type="button" className="provider-ghost-btn" onClick={() => setPackModalOpen(false)}>Annuler</button>
            <button type="button" className="provider-primary-btn" onClick={submitPack}>Enregistrer</button>
          </>
        }
      >
        <form className="admin-form-grid" onSubmit={submitPack}>
          <input className="provider-input" placeholder="Nom du pack" value={packForm.name} onChange={(event) => setPackForm((prev) => ({ ...prev, name: event.target.value }))} />
          <input className="provider-input" type="number" placeholder="Prix" value={packForm.price} onChange={(event) => setPackForm((prev) => ({ ...prev, price: event.target.value }))} />
          <input className="provider-input" placeholder="Duree" value={packForm.duration} onChange={(event) => setPackForm((prev) => ({ ...prev, duration: event.target.value }))} />
          <input className="provider-input" placeholder="Services inclus" value={packForm.services} onChange={(event) => setPackForm((prev) => ({ ...prev, services: event.target.value }))} />
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
