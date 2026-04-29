import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api, { API_BASE_URL } from "../services/api";
import { showToast } from "../services/toast";
import ClientPageLayout from "./client/ClientPageLayout";
import ClientModal from "./client/ClientModal";

const ClientReservationsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [reservations, setReservations] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [signatureToken, setSignatureToken] = useState("");

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

  useEffect(() => {
    if (message) {
      showToast("success", message);
    }
  }, [message]);

  useEffect(() => {
    if (error) {
      showToast("error", error);
    }
  }, [error]);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");
    if (checkout !== "success" || !sessionId) {
      return;
    }

    const confirmPayment = async () => {
      try {
        const response = await api.get("/api/payments/confirm", { params: { session_id: sessionId } });
        setMessage(response.data.message || "Paiement confirme.");
        await loadReservations();
      } catch (err) {
        setError(err.response?.data?.message || "Impossible de confirmer le paiement.");
      } finally {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("checkout");
        nextParams.delete("session_id");
        nextParams.delete("reservation_id");
        setSearchParams(nextParams, { replace: true });
      }
    };

    confirmPayment();
  }, [searchParams, setSearchParams]);

  const payReservation = async (reservationId) => {
    try {
      const response = await api.post(`/api/reservations/${reservationId}/payment/session`);
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
        return;
      }
      setError("Impossible de lancer le paiement.");
    } catch (err) {
      setError(err.response?.data?.message || "Paiement impossible.");
    }
  };

  const openSignatureModal = (reservation) => {
    setSelectedReservation(reservation);
    setShowQr(false);
    setSignatureToken("");
    setSignatureOpen(true);
  };

  const prepareSignatureQr = async () => {
    if (!selectedReservation) {
      return;
    }
    try {
      const response = await api.post(`/api/reservations/${selectedReservation.id}/signature-link`);
      setSignatureToken(response.data.token || "");
      setShowQr(true);
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de generer le lien de signature.");
    }
  };

  const paidCount = reservations.filter((reservation) => reservation.payment_status === "PAID").length;
  const mobileSignUrl = signatureToken
    ? `${window.location.origin}/public/sign-contract?token=${encodeURIComponent(signatureToken)}`
    : "";
  const mobileQrUrl = mobileSignUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(mobileSignUrl)}`
    : "";

  return (
    <ClientPageLayout
      kicker="Reservations & paiement"
      title="Suivez vos confirmations, paiements et documents en un seul endroit."
      description={`${paidCount} reservation(s) payee(s), ${reservations.length} reservation(s) au total.`}
    >
      <section className="client-section">
        <div className="client-shell">
          <div className="client-reservation-grid client-reservation-grid-rich">
            {reservations.map((reservation) => (
              <article key={reservation.id} className="client-reservation-card client-reservation-card-rich">
                <div className="client-reservation-head">
                  <span className={`client-status ${reservation.payment_status === "PAID" ? "paid" : "unpaid"}`}>
                    {reservation.payment_status}
                  </span>
                  <strong>{reservation.amount} TND</strong>
                </div>

                <div>
                  <h3>{reservation.service_title}</h3>
                  <p>Prestataire: {reservation.provider_name}</p>
                  <p>Date: {reservation.date}</p>
                  <p>Option: {reservation.payment_option === "partial" ? "Avance" : "Montant total"}</p>
                </div>

                <div className="client-reservation-actions">
                  <button
                    type="button"
                    className="client-btn client-btn-primary"
                    disabled={reservation.payment_status === "PAID"}
                    onClick={() => payReservation(reservation.id)}
                  >
                    {reservation.payment_status === "PAID" ? "Payee" : "Payer"}
                  </button>

                  {reservation.invoice_url ? (
                    <a className="client-btn client-btn-ghost" href={`${API_BASE_URL}${reservation.invoice_url}`} target="_blank" rel="noreferrer">
                      Facture PDF
                    </a>
                  ) : null}

                  {reservation.contract_url ? (
                    <a className="client-btn client-btn-soft" href={`${API_BASE_URL}${reservation.contract_url}`} target="_blank" rel="noreferrer">
                      Contrat PDF
                    </a>
                  ) : null}

                  {reservation.payment_status === "PAID" && !reservation.has_signature ? (
                    <button type="button" className="client-btn client-btn-soft" onClick={() => openSignatureModal(reservation)}>
                      Signer
                    </button>
                  ) : null}
                </div>
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

      <ClientModal open={signatureOpen} title="Signer le contrat" onClose={() => setSignatureOpen(false)}>
        <div className="client-modal-form">
          <p>La signature sur ordinateur est desactivee. Utilisez le telephone via QR.</p>
          <button type="button" className="client-btn client-btn-ghost" onClick={prepareSignatureQr}>
            Generer QR de signature
          </button>
          {showQr && mobileQrUrl ? (
            <div className="client-signature-qr">
              <img src={mobileQrUrl} alt="QR code signature mobile" width="180" height="180" />
              <p>Scannez ce QR pour signer sans vous reconnecter.</p>
            </div>
          ) : null}
        </div>
      </ClientModal>
    </ClientPageLayout>
  );
};

export default ClientReservationsPage;
