import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";
import { clearStoredUser } from "../services/auth";
import "../Home.css";
import "./client.css";

const emptyFilters = {
  city: "",
  budget: "",
  min_price: "",
  max_price: "",
  type: "",
};

const budgetMap = {
  less1000: { min: "", max: "1000" },
  from1000to3000: { min: "1000", max: "3000" },
  from3000to5000: { min: "3000", max: "5000" },
  plus5000: { min: "5000", max: "" },
};

const sidebarSections = [
  { id: "search", label: "Recherche", title: "Trouver un prestataire" },
  { id: "services", label: "Services", title: "Explorer les offres" },
  { id: "reservation", label: "Reservation", title: "Planifier votre date" },
  { id: "payment", label: "Paiement", title: "Finaliser la reservation" },
];

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("search");
  const [filters, setFilters] = useState(emptyFilters);
  const [services, setServices] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [booking, setBooking] = useState({ service_id: "", date: "", notes: "" });
  const [reservations, setReservations] = useState([]);

  const loadServices = async (params = emptyFilters) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/services", { params });
      setServices(response.data.services || []);
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de charger les services.");
    } finally {
      setLoading(false);
    }
  };

  const loadReservations = async () => {
    try {
      const response = await api.get("/api/reservations");
      setReservations(response.data.reservations || []);
    } catch {
      setReservations([]);
    }
  };

  useEffect(() => {
    loadServices();
    loadReservations();
  }, []);

  const onFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    const params = { ...filters };
    const selectedBudget = budgetMap[filters.budget];

    if (selectedBudget) {
      params.min_price = selectedBudget.min;
      params.max_price = selectedBudget.max;
    }

    delete params.budget;
    loadServices(params);
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
    loadServices(emptyFilters);
  };

  const toggleFavorite = async (service) => {
    setError("");
    setMessage("");
    try {
      if (service.is_favorite && service.favorite_id) {
        await api.delete(`/api/favorites/${service.favorite_id}`);
        setMessage("Retire des favoris.");
      } else {
        await api.post("/api/favorites", { prestataire_id: service.prestataire_id });
        setMessage("Ajoute aux favoris.");
      }
      loadServices(filters);
    } catch (err) {
      setError(err.response?.data?.message || "Action favoris impossible.");
    }
  };

  const startBooking = (service) => {
    setBooking({ service_id: String(service.id), date: "", notes: "" });
    setMessage("");
    setError("");
  };

  const createReservation = async () => {
    if (!booking.service_id || !booking.date) {
      setError("Choisissez un service et une date.");
      return;
    }
    try {
      await api.post("/api/reservations", {
        service_id: Number(booking.service_id),
        date: booking.date,
        notes: booking.notes,
      });
      setMessage("Reservation enregistree.");
      setBooking({ service_id: "", date: "", notes: "" });
      loadReservations();
    } catch (err) {
      setError(err.response?.data?.message || "Reservation impossible.");
    }
  };

  const payReservation = async (reservationId) => {
    try {
      await api.post("/api/payment", { reservation_id: reservationId });
      setMessage("Paiement simule avec succes.");
      loadReservations();
    } catch (err) {
      setError(err.response?.data?.message || "Paiement impossible.");
    }
  };

  const activeService = useMemo(
    () => services.find((item) => String(item.id) === String(booking.service_id)),
    [booking.service_id, services]
  );

  const goToSection = (sectionId) => {
    setActiveSection(sectionId);
  };

  const logout = () => {
    clearStoredUser();
    navigate("/login");
  };

  const renderActiveSection = () => {
    if (activeSection === "services") {
      return (
        <section className="client-panel">
          <h2>Services & Prestataires</h2>
          {loading ? <p>Chargement...</p> : null}
          <div className="services-grid">
            {services.map((service) => (
              <article key={service.id} className="service-card client-service-card">
                <div className="service-media">
                  <img src={service.image} alt={service.title} />
                  <div className="service-media-overlay" />
                  <div className="service-badges">
                    <span className="service-badge">Selection premium</span>
                    <span className="service-score">Note {service.rating}</span>
                  </div>
                </div>

                <div className="service-body">
                  <div className="service-topline">
                    <span className="service-category">{service.type}</span>
                    <span className="service-price">{service.price} TND</span>
                  </div>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <div className="client-service-buttons">
                    <button type="button" className="client-btn client-btn-soft" onClick={() => toggleFavorite(service)}>
                      {service.is_favorite ? "Retirer favori" : "Add to favorites"}
                    </button>
                    <button type="button" className="client-btn client-btn-primary" onClick={() => startBooking(service)}>
                      Book now
                    </button>
                    <button type="button" className="client-btn client-btn-soft" onClick={() => setMessage(`Profil: ${service.prestataire_name}`)}>
                      View profile
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      );
    }

    if (activeSection === "reservation") {
      return (
        <section className="client-panel">
          <h2>Reservation</h2>
          <div className="client-filters">
            <select
              className="client-select"
              value={booking.service_id}
              onChange={(event) => setBooking((prev) => ({ ...prev, service_id: event.target.value }))}
            >
              <option value="">Service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.title}
                </option>
              ))}
            </select>
            <input
              className="client-input"
              type="date"
              value={booking.date}
              onChange={(event) => setBooking((prev) => ({ ...prev, date: event.target.value }))}
            />
            <input className="client-input" value={activeService?.price || ""} readOnly placeholder="Price" />
            <button type="button" className="client-btn client-btn-primary" onClick={createReservation}>
              Confirmer
            </button>
          </div>
          <textarea
            className="client-textarea"
            placeholder="Notes"
            value={booking.notes}
            onChange={(event) => setBooking((prev) => ({ ...prev, notes: event.target.value }))}
          />
        </section>
      );
    }

    if (activeSection === "payment") {
      return (
        <section className="client-panel">
          <h2>Payment (simulation)</h2>
          {reservations.length === 0 ? <p>Aucune reservation.</p> : null}
          <div className="client-chat-list">
            {reservations.map((reservation) => (
              <div key={reservation.id} className="client-chat-item">
                <div className="client-chat-meta">
                  <span>{reservation.service_title}</span>
                  <span>{reservation.status}</span>
                </div>
                <p>Date: {reservation.date}</p>
                <div className="client-actions">
                  <button
                    type="button"
                    className="client-btn client-btn-primary"
                    disabled={reservation.status === "paid"}
                    onClick={() => payReservation(reservation.id)}
                  >
                    Pay
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    return (
      <section className="hero-search-wrap client-search-wrap">
        <div className="hero-search-intro">
          <span className="section-kicker">Recherche inspiree</span>
          <h2>Trouvez vos prestataires en quelques instants</h2>
        </div>

        <div className="search-box">
          <div className="search-field">
            <label htmlFor="client-city">Ville</label>
            <select id="client-city" name="city" aria-label="Ville" value={filters.city} onChange={onFilterChange}>
              <option value="">Ville</option>
              <option value="tunis">Tunis</option>
              <option value="sousse">Sousse</option>
              <option value="sfax">Sfax</option>
              <option value="monastir">Monastir</option>
            </select>
          </div>

          <div className="search-field">
            <label htmlFor="client-budget">Budget</label>
            <select
              id="client-budget"
              name="budget"
              aria-label="Budget"
              value={filters.budget}
              onChange={onFilterChange}
            >
              <option value="">Budget</option>
              <option value="less1000">Moins de 1000 TND</option>
              <option value="from1000to3000">1000 - 3000 TND</option>
              <option value="from3000to5000">3000 - 5000 TND</option>
              <option value="plus5000">Plus de 5000 TND</option>
            </select>
          </div>

          <div className="search-field">
            <label htmlFor="client-service-type">Type de service</label>
            <select
              id="client-service-type"
              name="type"
              aria-label="Type de service"
              value={filters.type}
              onChange={onFilterChange}
            >
              <option value="">Type de service</option>
              <option value="photographer">Photographe</option>
              <option value="salle">Salle</option>
              <option value="traiteur">Traiteur</option>
              <option value="decoration">Decoration</option>
            </select>
          </div>

          <button type="button" className="search-action" onClick={applyFilters}>
            Rechercher
          </button>
        </div>

        <div className="client-actions" style={{ marginTop: 12 }}>
          <button type="button" className="client-btn client-btn-soft" onClick={resetFilters}>
            Reset
          </button>
        </div>
      </section>
    );
  };

  return (
    <div className="client-page">
      <Navbar />
      <main className="client-main">
        <section className="client-shell">
          <aside className="client-sidebar">
            <div className="client-sidebar-brand">
              <p className="client-eyebrow">Client</p>
              <h1>Mon espace mariage</h1>
              <span>Toutes vos actions reunies dans un tableau de bord premium.</span>
            </div>

            <nav className="client-sidebar-nav">
              {sidebarSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={`client-sidebar-link ${activeSection === section.id ? "active" : ""}`}
                  onClick={() => goToSection(section.id)}
                >
                  <strong>{section.label}</strong>
                  <small>{section.title}</small>
                </button>
              ))}
            </nav>

            <div className="client-sidebar-shortcuts">
              <Link className="client-btn client-btn-soft" to="/favorites">
                Favoris
              </Link>
              <Link className="client-btn client-btn-soft" to="/chat">
                Chat
              </Link>
              <Link className="client-btn client-btn-soft" to="/planner">
                Planner
              </Link>
            </div>
          </aside>

          <section className="client-content">
            <header className="client-content-header">
              <div>
                <p className="client-section-label">Dashboard client</p>
                <h2>Organisez votre mariage avec fluidite</h2>
                <p>
                  Recherchez, reservez et payez dans le meme espace, avec une navigation claire
                  sur la gauche.
                </p>
              </div>
              <button type="button" className="client-btn client-btn-primary client-logout" onClick={logout}>
                Logout
              </button>
            </header>

            {message ? <p className="client-message">{message}</p> : null}
            {error ? <p className="client-error">{error}</p> : null}

            <div className="client-grid">{renderActiveSection()}</div>
          </section>
        </section>
      </main>
    </div>
  );
};

export default ClientDashboard;
