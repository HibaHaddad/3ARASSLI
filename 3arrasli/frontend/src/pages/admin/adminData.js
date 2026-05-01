export const adminSections = [
  {
    id: "dashboard",
    icon: "dashboard",
    label: "Dashboard",
    title: "Statistiques",
    description: "Vue d'ensemble et indicateurs clés de la plateforme.",
  },
  {
    id: "providers",
    icon: "providers",
    label: "Prestataires",
    title: "Gestion des prestataires",
    description: "Liste, activation et suivi des comptes prestataires.",
  },
  {
    id: "appointments",
    icon: "appointments",
    label: "Rendez-vous",
    title: "Consultation des rendez-vous",
    description: "Consultez les rendez-vous en lecture seule.",
  },
  {
    id: "contracts",
    icon: "contracts",
    label: "Contrats",
    title: "Signature numerique",
    description: "Suivez les contrats et preparez la signature digitale.",
  },
  {
    id: "billing",
    icon: "billing",
    label: "Facturation",
    title: "Factures & paiements",
    description: "Visualisez le statut des factures et generez les documents.",
  },
  {
    id: "reviews",
    icon: "reviews",
    label: "Avis",
    title: "Moderation des avis",
    description: "Controlez les commentaires et la qualite des retours.",
  },
  {
    id: "services",
    icon: "services",
    label: "Services",
    title: "Catalogue prestataires",
    description: "Consultez les services publies par chaque prestataire.",
  },
  {
    id: "packs",
    icon: "packs",
    label: "Packs",
    title: "Promotions & packs",
    description: "Creez des offres speciales avec prix et services inclus.",
  },
  {
    id: "chat",
    icon: "chat",
    label: "Supervision chat",
    title: "Conversations client-prestataire",
    description: "Consultez les echanges en mode lecture seule.",
  },
];

export const mockProviders = [
  {
    id: 1,
    name: "Studio Lumiere",
    category: "Photographie",
    city: "Tunis",
    email: "contact@studiolumiere.tn",
    rating: 4.9,
    status: "active",
    joinedAt: "2025-09-12",
  },
  {
    id: 2,
    name: "Floral Moments",
    category: "Decoration",
    city: "Sousse",
    email: "hello@floralmoments.tn",
    rating: 4.7,
    status: "inactive",
    joinedAt: "2025-11-05",
  },
  {
    id: 3,
    name: "Gourmet Event",
    category: "Traiteur",
    city: "Sfax",
    email: "booking@gourmetevent.tn",
    rating: 4.8,
    status: "active",
    joinedAt: "2026-01-08",
  },
  {
    id: 4,
    name: "Salle Jasmine",
    category: "Salle",
    city: "Monastir",
    email: "team@sallejasmine.tn",
    rating: 4.6,
    status: "active",
    joinedAt: "2026-02-17",
  },
];

export const mockAppointments = [
  {
    id: 101,
    client: "Amira Ben Salem",
    provider: "Studio Lumiere",
    date: "2026-05-20",
    status: "pending",
    amount: 1800,
  },
  {
    id: 102,
    client: "Yasmine Trabelsi",
    provider: "Floral Moments",
    date: "2026-05-22",
    status: "confirmed",
    amount: 2400,
  },
  {
    id: 103,
    client: "Maya Khelifi",
    provider: "Gourmet Event",
    date: "2026-05-26",
    status: "cancelled",
    amount: 3200,
  },
];

export const mockContracts = [
  {
    id: "CTR-001",
    title: "Contrat prestation photo",
    client: "Amira Ben Salem",
    provider: "Studio Lumiere",
    status: "pending-signature",
    signatureEnabled: true,
    details: "Couvre ceremonie, reception et album premium.",
  },
  {
    id: "CTR-002",
    title: "Contrat decoration florale",
    client: "Yasmine Trabelsi",
    provider: "Floral Moments",
    status: "signed",
    signatureEnabled: true,
    details: "Arche florale, table d'honneur, centre de table.",
  },
];

export const mockInvoices = [
  {
    id: "INV-2026-001",
    appointmentId: 101,
    client: "Amira Ben Salem",
    amount: 1800,
    status: "paid",
    issuedAt: "2026-04-15",
  },
  {
    id: "INV-2026-002",
    appointmentId: 102,
    client: "Yasmine Trabelsi",
    amount: 2400,
    status: "paid",
    issuedAt: "2026-04-10",
  },
];

export const mockReviews = [
  {
    id: 1,
    author: "Sarra Chaabane",
    target: "Studio Lumiere",
    rating: 5,
    comment: "Equipe tres professionnelle et resultat magnifique.",
    status: "published",
    createdAt: "2026-04-07",
  },
  {
    id: 2,
    author: "Hedi Gharbi",
    target: "Gourmet Event",
    rating: 2,
    comment: "Retard de service le soir de l'evenement.",
    status: "flagged",
    createdAt: "2026-04-11",
  },
];

export const mockPacks = [
  {
    id: 1,
    name: "Pack Gold",
    price: 3500,
    services: "Photo, video, decoration",
    status: "active",
  },
  {
    id: 2,
    name: "Pack Flash Promo",
    price: 1900,
    services: "Photo + teaser",
    status: "inactive",
  },
];

export const mockConversations = [
  {
    id: 1,
    client: "Amira Ben Salem",
    provider: "Studio Lumiere",
    lastAt: "Aujourd'hui, 10:12",
    excerpt: "Pouvez-vous confirmer la livraison de l'album ?",
    messages: [
      { id: 1, author: "client", text: "Bonjour, l'album sera pret cette semaine ?", time: "09:48" },
      { id: 2, author: "provider", text: "Oui, livraison prevue vendredi matin.", time: "09:55" },
      { id: 3, author: "client", text: "Parfait merci beaucoup.", time: "10:12" },
    ],
  },
  {
    id: 2,
    client: "Yasmine Trabelsi",
    provider: "Floral Moments",
    lastAt: "Hier, 18:22",
    excerpt: "Validation du moodboard floral.",
    messages: [
      { id: 1, author: "provider", text: "Je vous ai envoye les variantes en PDF.", time: "18:05" },
      { id: 2, author: "client", text: "La variante 2 est parfaite.", time: "18:22" },
    ],
  },
];
