import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api from "../services/api";
import "../Home.css";
import "./client.css";
import ClientNav from "./client/ClientNav";

const ClientReservationsPage = () => {
  const [reservations, setReservations] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadReservations = async () => {
    try {
      const response = await api.get("/api/reservations");
      setReservations(response.data.reservations || []);
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de charger les reservations.");
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  const payReservation = async (reservationId) => {
    try {
      await api.post("/api/payment", { reservation_id: reservationId });
      setMessage("Paiement simule avec succes.");
      await loadReservations();
    } catch (err) {
      setError(err.response?.data?.message || "Paiement impossible.");
    }
  };

  const paidCount = reservations.filter((reservation) => reservation.status === "paid").length;

  return (
    <div className="client-page">
      <Navbar />
      <main className="client-page-main">
        <section className="client-page-hero compact">
          <div className="client-shell">
            <ClientNav />
            <div className="client-page-heading">
              <span className="section-kicker">Reservations & paiement</span>
              <h1>Suivez vos confirmations dans un parcours clair et rassurant.</h1>
              <p>{paidCount} reservation(s) payee(s), {reservations.length} reservation(s) au total.</p>
            </div>
          </div>
        </section>

        <section className="client-section">
          <div className="client-shell">
            {message ? <p className="client-message">{message}</p> : null}
            {error ? <p className="client-error">{error}</p> : null}

            <div className="client-reservation-grid">
              {reservations.map((reservation) => (
                <article key={reservation.id} className="client-reservation-card">
                  <div>
                    <span className="client-status">{reservation.status}</span>
                    <h3>{reservation.service_title}</h3>
                    <p>Date: {reservation.date}</p>
                  </div>
                  <button
                    type="button"
                    className="client-btn client-btn-primary"
                    disabled={reservation.status === "paid"}
                    onClick={() => payReservation(reservation.id)}
                  >
                    {reservation.status === "paid" ? "Payee" : "Payer"}
                  </button>
                </article>
              ))}
            </div>

            {reservations.length === 0 ? (
              <div className="client-empty-state">
                <h3>Aucune reservation pour le moment.</h3>
                <p>Ouvrez une fiche service depuis la recherche pour choisir une date.</p>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ClientReservationsPage;
