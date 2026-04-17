import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";
import "../Home.css";
import "./client.css";

const emptyFilters = {
  city: "",
  min_price: "",
  max_price: "",
  type: "",
};

const ClientDashboard = () => {
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
    loadServices(filters);
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

  return (
    <div className="client-page">
      <Navbar />
      <div className="client-shell client-top">
        <div className="client-panel">
          <h2>Client Dashboard</h2>
          <p>Explorez les services, ajoutez vos favoris, reservez et payez depuis le meme espace.</p>
          <div className="client-actions">
            <Link className="client-btn client-btn-soft" to="/favorites">
              Aller aux favoris
            </Link>
            <Link className="client-btn client-btn-soft" to="/chat">
              Ouvrir le chat
            </Link>
            <Link className="client-btn client-btn-soft" to="/planner">
              Ouvrir planner
            </Link>
          </div>
          {message ? <p className="client-message">{message}</p> : null}
          {error ? <p className="client-error">{error}</p> : null}
        </div>

        <div className="client-grid">
          <section className="client-panel">
            <h2>Advanced Search</h2>
            <div className="client-filters">
              <input className="client-input" name="city" placeholder="City" value={filters.city} onChange={onFilterChange} />
              <input className="client-input" name="min_price" placeholder="Min price" value={filters.min_price} onChange={onFilterChange} />
              <input className="client-input" name="max_price" placeholder="Max price" value={filters.max_price} onChange={onFilterChange} />
              <select className="client-select" name="type" value={filters.type} onChange={onFilterChange}>
                <option value="">Type</option>
                <option value="photographer">Photographer</option>
                <option value="salle">Salle</option>
                <option value="traiteur">Traiteur</option>
                <option value="decoration">Decoration</option>
              </select>
            </div>
            <div className="client-actions" style={{ marginTop: 12 }}>
              <button type="button" className="client-btn client-btn-primary" onClick={applyFilters}>
                Rechercher
              </button>
              <button type="button" className="client-btn client-btn-soft" onClick={resetFilters}>
                Reset
              </button>
            </div>
          </section>

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
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
