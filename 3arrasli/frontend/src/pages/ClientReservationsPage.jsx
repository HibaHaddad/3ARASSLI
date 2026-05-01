import React, { useEffect, useMemo, useState } from "react";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useSearchParams } from "react-router-dom";
import api, { API_BASE_URL } from "../services/api";
import { showToast } from "../services/toast";
import ClientPageLayout from "./client/ClientPageLayout";
import ClientModal from "./client/ClientModal";

const cardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "#4a2735",
      fontFamily: "inherit",
      "::placeholder": { color: "rgba(82, 49, 61, 0.56)" },
    },
    invalid: { color: "#a33f58" },
  },
};

const splitReservationDateTime = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return { date: "--", slot: "--" };
  const [datePart, timePart] = raw.split(" ");
  return {
    date: datePart || raw,
    slot: timePart || "--",
  };
};

const ReservationPaymentForm = ({ reservation, onClose, onSuccess, setError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [cardholderName, setCardholderName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!reservation) return;
    setSubmitting(true);
    try {
      const paymentResponse = await api.post(`/api/reservations/${reservation.id}/payment/intent`);
      const clientSecret = paymentResponse.data.client_secret;
      const paymentIntentId = paymentResponse.data.payment_intent_id;
      if (!clientSecret) {
        throw new Error("Impossible d'initialiser le paiement.");
      }
      if (!stripe || !elements) {
        throw new Error("Le formulaire de paiement n'est pas pret.");
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Les informations de carte sont introuvables.");
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: cardholderName || "Client",
          },
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message || "Le paiement a echoue.");
      }

      await api.post(`/api/reservations/${reservation.id}/payment/confirm-intent`, {
        payment_intent_id: paymentIntent?.id || paymentIntentId,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Paiement impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const { date, slot } = splitReservationDateTime(reservation?.date);
  const isPartial = reservation?.payment_option === "partial";
  const amountNow = isPartial ? Number(Number(reservation?.amount || 0).toFixed(2)) : Number(reservation?.amount || 0);

  return (
    <form className="client-modal-form" onSubmit={handleSubmit}>
      <div className="client-payment-summary">
        <div>
          <span className="client-section-label">Service</span>
          <strong>{reservation?.service_title || "--"}</strong>
        </div>
        <div>
          <span className="client-section-label">Montant a payer</span>
          <strong>{amountNow} TND</strong>
        </div>
      </div>

      <div className="client-pack-booking-pills">
        <span>Prestataire: {reservation?.provider_name || "--"}</span>
        <span>Date: {date}</span>
        <span>Creneau: {slot}</span>
        <span>Option: {isPartial ? "Avance" : "Montant total"}</span>
      </div>

      <label className="client-field">
        <span>Nom sur la carte</span>
        <input
          className="client-input"
          value={cardholderName}
          onChange={(event) => setCardholderName(event.target.value)}
          placeholder="Nom du titulaire"
        />
      </label>
      <label className="client-field">
        <span>Informations carte</span>
        <div className="client-card-element-wrap">
          <CardElement options={cardElementOptions} />
        </div>
      </label>
      <button type="submit" className="client-btn client-btn-primary" disabled={submitting}>
        {submitting ? "Traitement..." : "Payer"}
      </button>
    </form>
  );
};

const ClientReservationsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [reservations, setReservations] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [signatureToken, setSignatureToken] = useState("");
  const [stripeConfig, setStripeConfig] = useState({ enabled: false, publishable_key: "" });
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentReservation, setPaymentReservation] = useState(null);

  const loadReservations = async () => {
    try {
      const response = await api.get("/api/reservations");
      const rawReservations = Array.isArray(response.data.reservations) ? response.data.reservations : [];
      const visibleReservations = rawReservations.filter(
        (reservation) =>
          reservation &&
          Number(reservation.id) > 0 &&
          Number(reservation.service_id) > 0 &&
          String(reservation.service_title || "").trim() !== ""
      );
      setReservations(visibleReservations);
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de charger les reservations.");
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  useEffect(() => {
    const loadStripeConfig = async () => {
      try {
        const response = await api.get("/api/client/stripe-config");
        setStripeConfig(response.data?.stripe || { enabled: false, publishable_key: "" });
      } catch (_err) {
        setStripeConfig({ enabled: false, publishable_key: "" });
      }
    };
    loadStripeConfig();
  }, []);

  useEffect(() => {
    const refreshInterval = window.setInterval(() => {
      loadReservations();
    }, 10000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadReservations();
      }
    };

    window.addEventListener("focus", loadReservations);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", loadReservations);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
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

  const payReservation = (reservation) => {
    if (!stripeConfig.enabled || !stripeConfig.publishable_key) {
      setError("Le paiement carte n'est pas disponible.");
      return;
    }
    setPaymentReservation(reservation);
    setPaymentModalOpen(true);
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
  const stripePromise = useMemo(
    () => (stripeConfig.publishable_key ? loadStripe(stripeConfig.publishable_key) : null),
    [stripeConfig.publishable_key]
  );

  return (
    <ClientPageLayout
      kicker="Reservations & paiement"
      title="Suivez vos confirmations, paiements et documents en un seul endroit."
      description={`${paidCount} réservation(s) payee(s), ${reservations.length} réservation(s) au total.`}
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
                    onClick={() => payReservation(reservation)}
                  >
                    {reservation.payment_status === "PAID" ? "Payee" : "Payer"}
                  </button>

                  {reservation.invoice_url ? (
                    <a className="client-btn client-btn-ghost" href={`${API_BASE_URL}${reservation.invoice_url}`} target="_blank" rel="noreferrer">
                      Facture PDF
                    </a>
                  ) : null}

                  {reservation.can_view_contract && reservation.contract_url ? (
                    <a className="client-btn client-btn-soft" href={`${API_BASE_URL}${reservation.contract_url}`} target="_blank" rel="noreferrer">
                      Contrat PDF
                    </a>
                  ) : null}

                  {reservation.can_sign_contract ? (
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

      <ClientModal open={paymentModalOpen} title="Paiement de la reservation" onClose={() => setPaymentModalOpen(false)}>
        {stripePromise && paymentReservation ? (
          <Elements stripe={stripePromise}>
            <ReservationPaymentForm
              reservation={paymentReservation}
              onClose={() => setPaymentModalOpen(false)}
              onSuccess={async () => {
                setMessage("Paiement confirme.");
                await loadReservations();
              }}
              setError={setError}
            />
          </Elements>
        ) : (
          <p>Paiement carte indisponible.</p>
        )}
      </ClientModal>
    </ClientPageLayout>
  );
};

export default ClientReservationsPage;
