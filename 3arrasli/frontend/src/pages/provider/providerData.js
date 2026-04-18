export const providerSections = [
  {
    id: "dashboard",
    label: "Dashboard",
    title: "Vue d'ensemble",
    description:
      "Pilotez rapidement vos reservations, vos services, vos disponibilites et vos messages.",
  },
  {
    id: "reservations",
    label: "Reservations",
    title: "Validation des reservations",
    description:
      "Consultez les demandes, acceptez ou refusez et gardez une vue claire sur les statuts.",
  },
  {
    id: "profile",
    label: "Profil",
    title: "Mon profil",
    description:
      "Mettez a jour votre presentation, vos informations et votre univers de marque.",
  },
  {
    id: "services",
    label: "Services",
    title: "Gestion des services",
    description:
      "Ajoutez, modifiez et valorisez vos prestations avec prix, photos et descriptions.",
  },
  {
    id: "calendar",
    label: "Calendrier",
    title: "Disponibilites",
    description:
      "Bloquez vos dates, liberez des creneaux et gardez un planning lisible.",
  },
  {
    id: "chat",
    label: "Chat",
    title: "Messages clients",
    description:
      "Echangez avec les clients dans une interface simple, elegante et moderne.",
  },
];

export const initialReservations = [
  {
    id: 1,
    client: "Amira Ben Salem",
    service: "Shooting couple premium",
    date: "2026-05-12",
    time: "16:30",
    location: "Sidi Bou Said",
    amount: 1800,
    status: "En attente",
    details:
      "Seance photo ceremonie et couple au coucher du soleil a Sidi Bou Said.",
  },
  {
    id: 2,
    client: "Yasmine Trabelsi",
    service: "Decoration florale complete",
    date: "2026-05-19",
    time: "10:00",
    location: "La Marsa",
    amount: 2400,
    status: "Validee",
    details:
      "Decoration florale pour salle, allee ceremonie et table d'honneur.",
  },
  {
    id: 3,
    client: "Hedi Gharbi",
    service: "Buffet raffine 160 invites",
    date: "2026-06-02",
    time: "18:00",
    location: "Gammarth",
    amount: 5200,
    status: "En attente",
    details: "Menu signature, atelier desserts et service raffine sur place.",
  },
  {
    id: 4,
    client: "Sarra Chaabane",
    service: "Salle de reception Jasmine",
    date: "2026-06-09",
    time: "20:00",
    location: "Sousse",
    amount: 6900,
    status: "Refusee",
    details:
      "Reception de 220 invites avec mise en scene lumineuse et piste centrale.",
  },
  {
    id: 5,
    client: "Maya Khelifi",
    service: "Pack photo + teaser video",
    date: "2026-06-21",
    time: "14:00",
    location: "Tunis",
    amount: 3200,
    status: "Validee",
    details: "Couverture journee complete avec teaser livre sous 72h.",
  },
];

export const initialServices = [
  {
    id: 1,
    title: "Shooting mariage editorial",
    price: "A partir de 1800 TND",
    description:
      "Couverture photographique elegante avec direction artistique douce et lumineuse.",
    category: "Photographe",
    status: "Pret a vendre",
    image:
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1400&q=90",
  },
  {
    id: 2,
    title: "Decoration florale signature",
    price: "A partir de 1400 TND",
    description:
      "Arches, compositions florales et details romantiques pour une ambiance premium.",
    category: "Decoration",
    status: "Visibilite forte",
    image:
      "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1400&q=90",
  },
  {
    id: 3,
    title: "Table d'hotes raffinee",
    price: "A partir de 2500 TND",
    description:
      "Cuisine elegante, dressage moderne et experience gastronomique pour vos invites.",
    category: "Traiteur",
    status: "A mettre a jour",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=90",
  },
];

const defaultTimeSlots = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

const buildSlots = (date, overrides = {}) =>
  defaultTimeSlots.map((time) => ({
    id: `${date}-${time}`,
    time,
    status: overrides[time]?.status || "free",
    client: overrides[time]?.client || "",
    service: overrides[time]?.service || "",
  }));

export const initialCalendarDates = [
  {
    id: 1,
    date: "2026-05-12",
    day: "12",
    weekDay: "Lun",
    month: "Mai",
    slots: buildSlots("2026-05-12", {
      "10:00": { status: "reserved", client: "Amira Ben Salem", service: "Shooting couple premium" },
      "11:00": { status: "reserved", client: "Amira Ben Salem", service: "Shooting couple premium" },
      "16:00": { status: "occupied" },
      "17:00": { status: "occupied" },
    }),
  },
  {
    id: 2,
    date: "2026-05-19",
    day: "19",
    weekDay: "Lun",
    month: "Mai",
    slots: buildSlots("2026-05-19", {
      "09:00": { status: "reserved", client: "Yasmine Trabelsi", service: "Decoration florale complete" },
      "10:00": { status: "reserved", client: "Yasmine Trabelsi", service: "Decoration florale complete" },
      "11:00": { status: "reserved", client: "Yasmine Trabelsi", service: "Decoration florale complete" },
      "15:00": { status: "occupied" },
    }),
  },
  {
    id: 3,
    date: "2026-05-24",
    day: "24",
    weekDay: "Sam",
    month: "Mai",
    slots: buildSlots("2026-05-24", {
      "13:00": { status: "occupied" },
      "14:00": { status: "occupied" },
    }),
  },
  {
    id: 4,
    date: "2026-05-31",
    day: "31",
    weekDay: "Sam",
    month: "Mai",
    slots: buildSlots("2026-05-31"),
  },
  {
    id: 5,
    date: "2026-06-02",
    day: "02",
    weekDay: "Mar",
    month: "Juin",
    slots: buildSlots("2026-06-02", {
      "18:00": { status: "reserved", client: "Hedi Gharbi", service: "Buffet raffine 160 invites" },
      "19:00": { status: "reserved", client: "Hedi Gharbi", service: "Buffet raffine 160 invites" },
      "20:00": { status: "reserved", client: "Hedi Gharbi", service: "Buffet raffine 160 invites" },
    }),
  },
  {
    id: 6,
    date: "2026-06-09",
    day: "09",
    weekDay: "Mar",
    month: "Juin",
    slots: buildSlots("2026-06-09", {
      "09:00": { status: "occupied" },
      "10:00": { status: "occupied" },
      "11:00": { status: "occupied" },
      "12:00": { status: "occupied" },
      "13:00": { status: "occupied" },
      "14:00": { status: "occupied" },
      "15:00": { status: "occupied" },
      "16:00": { status: "occupied" },
      "17:00": { status: "occupied" },
      "18:00": { status: "occupied" },
      "19:00": { status: "occupied" },
      "20:00": { status: "occupied" },
    }),
  },
  {
    id: 7,
    date: "2026-06-14",
    day: "14",
    weekDay: "Dim",
    month: "Juin",
    slots: buildSlots("2026-06-14"),
  },
  {
    id: 8,
    date: "2026-06-21",
    day: "21",
    weekDay: "Dim",
    month: "Juin",
    slots: buildSlots("2026-06-21", {
      "14:00": { status: "reserved", client: "Maya Khelifi", service: "Pack photo + teaser video" },
      "15:00": { status: "reserved", client: "Maya Khelifi", service: "Pack photo + teaser video" },
      "16:00": { status: "reserved", client: "Maya Khelifi", service: "Pack photo + teaser video" },
      "17:00": { status: "occupied" },
    }),
  },
  {
    id: 9,
    date: "2026-06-28",
    day: "28",
    weekDay: "Dim",
    month: "Juin",
    slots: buildSlots("2026-06-28"),
  },
  {
    id: 10,
    date: "2026-07-05",
    day: "05",
    weekDay: "Dim",
    month: "Juil",
    slots: buildSlots("2026-07-05", {
      "12:00": { status: "occupied" },
      "13:00": { status: "occupied" },
    }),
  },
  {
    id: 11,
    date: "2026-07-11",
    day: "11",
    weekDay: "Sam",
    month: "Juil",
    slots: buildSlots("2026-07-11", {
      "10:00": { status: "reserved", client: "Sarra Chaabane", service: "Salle de reception Jasmine" },
      "11:00": { status: "reserved", client: "Sarra Chaabane", service: "Salle de reception Jasmine" },
      "12:00": { status: "reserved", client: "Sarra Chaabane", service: "Salle de reception Jasmine" },
      "13:00": { status: "reserved", client: "Sarra Chaabane", service: "Salle de reception Jasmine" },
      "14:00": { status: "reserved", client: "Sarra Chaabane", service: "Salle de reception Jasmine" },
      "15:00": { status: "reserved", client: "Sarra Chaabane", service: "Salle de reception Jasmine" },
      "16:00": { status: "reserved", client: "Sarra Chaabane", service: "Salle de reception Jasmine" },
      "17:00": { status: "reserved", client: "Sarra Chaabane", service: "Salle de reception Jasmine" },
      "18:00": { status: "reserved", client: "Sarra Chaabane", service: "Salle de reception Jasmine" },
      "19:00": { status: "reserved", client: "Sarra Chaabane", service: "Salle de reception Jasmine" },
    }),
  },
  {
    id: 12,
    date: "2026-07-18",
    day: "18",
    weekDay: "Sam",
    month: "Juil",
    slots: buildSlots("2026-07-18"),
  },
];

export const initialChats = [
  {
    id: 1,
    client: "Amira Ben Salem",
    subject: "Shooting couple premium",
    unread: 2,
    avatar: "AB",
    excerpt: "Pouvez-vous partager les options de livraison des photos ?",
    time: "Il y a 12 min",
    messages: [
      {
        id: 1,
        author: "client",
        text: "Bonjour, est-ce que vous etes disponible le 12 mai pour notre ceremonie ?",
      },
      {
        id: 2,
        author: "provider",
        text: "Bonjour Amira, oui je suis disponible sur cette date.",
      },
      {
        id: 3,
        author: "client",
        text: "Parfait, pouvez-vous partager les options de livraison des photos ?",
      },
    ],
  },
  {
    id: 2,
    client: "Yasmine Trabelsi",
    subject: "Decoration florale complete",
    unread: 0,
    avatar: "YT",
    excerpt: "Peut-on ajouter des pivoines creme a la table d'honneur ?",
    time: "Hier",
    messages: [
      {
        id: 1,
        author: "client",
        text: "J'adore votre palette poudree. Peut-on ajouter des pivoines creme ?",
      },
      {
        id: 2,
        author: "provider",
        text: "Oui, c'est possible. Je peux vous proposer deux variantes florales demain.",
      },
    ],
  },
  {
    id: 3,
    client: "Maya Khelifi",
    subject: "Pack photo + teaser video",
    unread: 1,
    avatar: "MK",
    excerpt: "Merci, c'est exactement ce que nous recherchions.",
    time: "09:40",
    messages: [
      {
        id: 1,
        author: "provider",
        text: "Le teaser peut etre livre sous 72h apres validation de la selection.",
      },
      {
        id: 2,
        author: "client",
        text: "Merci, c'est exactement ce que nous recherchions.",
      },
    ],
  },
];

export const initialProfile = {
  name: "Studio Lumiere",
  email: "contact@studiolumiere.tn",
  phone: "+216 55 123 456",
  city: "Tunis",
  category: "Photographe",
  instagram: "@studio.lumiere.weddings",
  website: "www.studiolumiere.tn",
  description:
    "Prestataire mariage premium specialise dans les reportages editoriaux, les portraits lumineux et les histoires visuelles elegantes.",
  profilePhoto:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=90",
  coverPhoto:
    "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=90",
};

export const emptyServiceForm = {
  title: "",
  price: "",
  description: "",
  image: "",
  category: "Photographe",
  status: "Actif",
};

export const initialPriorityActions = [
  {
    id: 1,
    icon: "RESA",
    title: "3 reservations a valider",
    description: "Des couples attendent votre confirmation cette semaine.",
    action: "Voir les demandes",
    target: "reservations",
  },
  {
    id: 2,
    icon: "MSG",
    title: "2 messages non lus",
    description: "Gardez une communication rapide avec vos clients.",
    action: "Ouvrir le chat",
    target: "chat",
  },
  {
    id: 3,
    icon: "SERV",
    title: "1 service a enrichir",
    description: "Ajoutez de nouvelles photos pour renforcer votre visibilite.",
    action: "Modifier mes services",
    target: "services",
  },
  {
    id: 4,
    icon: "CAL",
    title: "4 dates a confirmer",
    description: "Mettez a jour votre planning pour eviter les conflits.",
    action: "Gerer le calendrier",
    target: "calendar",
  },
];
