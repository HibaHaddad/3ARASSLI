import React, { useEffect, useMemo, useState } from "react";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { resolveAssetUrl } from "../services/assets";
import ClientPageLayout from "./client/ClientPageLayout";
import { getClientPacks, getClientStripeConfig, reserveClientPack } from "../services/clientPacks";
import { showToast } from "../services/toast";
import ClientModal from "./client/ClientModal";
import "./client.css";

const formatCurrency = (value) => `${Number(value || 0).toFixed(0)} TND`;
const formatPackEndDate = (value) => {
  if (!value) {
    return "Date flexible";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return `Jusqu'au ${new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed)}`;
};
const WORKING_HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];
const SERVICE_PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=85";

const cardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "#4a2735",
      fontFamily: "inherit",
      "::placeholder": {
        color: "rgba(82, 49, 61, 0.56)",
      },
    },
    invalid: {
      color: "#a33f58",
    },
  },
};

const PackPaymentForm = ({
  selectedPack,
  reservationForm,
  setReservationForm,
  stripeConfig,
  closeReserveModal,
  navigate,
  setError,
  setMessage,
  setSubmitting,
  submitting,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedPack) return;

    if (!reservationForm.payment_option) {
      setError("Choisissez d'abord le mode de paiement: avance (50%) ou total (100%).");
      return;
    }

    if (reservationForm.pay_now && !stripeConfig.enabled) {
      setError("Le paiement carte n'est pas disponible pour le moment.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        ...reservationForm,
        payment_method: reservationForm.pay_now ? "intent" : "checkout",
      };

      const response = await reserveClientPack(selectedPack.id, payload);

      if (reservationForm.pay_now) {
        if (!response?.client_secret) {
          throw new Error("Le paiement n'a pas pu etre initialise.");
        }
        if (!stripe || !elements) {
          throw new Error("Le formulaire de paiement n'est pas encore pret.");
        }

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error("Les informations de carte sont introuvables.");
        }

        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(response.client_secret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: reservationForm.cardholder_name || "Client",
            },
          },
        });

        if (stripeError) {
          throw new Error(`Reservation creee, mais le paiement a echoue: ${stripeError.message}`);
        }

        const paymentIntentId = paymentIntent?.id || response.payment_intent_id;
        const firstReservationId = response.reservations?.[0]?.id;
        if (!firstReservationId) {
          throw new Error("Impossible de confirmer le paiement: reservation introuvable.");
        }

        const confirmResponse = await api.post(`/api/reservations/${firstReservationId}/payment/confirm-intent`, {
          payment_intent_id: paymentIntentId,
        });

        setMessage(confirmResponse.data.message || "Paiement du pack confirme avec succes.");
        closeReserveModal();
        navigate("/client/reservations");
        return;
      }

      const resultMessage = response?.message || "Pack reserve avec succes.";
      setMessage(resultMessage);
      closeReserveModal();
      if (response?.checkout_url) {
        window.location.href = response.checkout_url;
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Impossible de reserver ce pack.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="client-modal-form client-pack-booking-form" onSubmit={handleSubmit}>
      <div className="client-pack-booking-summary">
        <span className="client-section-label">Pack selectionne</span>
        <strong>{selectedPack?.name || "--"}</strong>
        <p>{selectedPack?.description || "Composez une experience complete avec des prestataires valides."}</p>
        <div className="client-pack-booking-pills">
          <span>{formatCurrency(selectedPack?.price || 0)}</span>
          <span>{selectedPack?.items?.length || 0} service(s)</span>
        </div>
      </div>

      <div className="client-booking-fields">
        <label className="client-field">
          <span>Date</span>
          <input
            type="date"
            required
            value={reservationForm.date}
            onChange={(event) => setReservationForm((prev) => ({ ...prev, date: event.target.value }))}
          />
        </label>
        <label className="client-field">
          <span>Heure</span>
          <select
            required
            value={reservationForm.start_time}
            onChange={(event) => setReservationForm((prev) => ({ ...prev, start_time: event.target.value }))}
          >
            <option value="">Selectionner</option>
            {WORKING_HOURS.map((hour) => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="client-payment-options">
        <button
          type="button"
          className={`client-payment-option ${reservationForm.payment_option === "full" ? "active" : ""}`}
          onClick={() => setReservationForm((prev) => ({ ...prev, payment_option: "full" }))}
        >
          Payer le montant total (100%)
        </button>
        <button
          type="button"
          className={`client-payment-option ${reservationForm.payment_option === "partial" ? "active" : ""}`}
          onClick={() => setReservationForm((prev) => ({ ...prev, payment_option: "partial" }))}
        >
          Payer une avance (50%)
        </button>
      </div>

      {reservationForm.pay_now && ["full", "partial"].includes(reservationForm.payment_option) ? (
        <div className="client-card-payment-box">
          <div className="client-pack-booking-pills">
            <span>
              A payer maintenant: {formatCurrency(reservationForm.payment_option === "partial" ? Number((Number(selectedPack?.price || 0) * 0.5).toFixed(2)) : Number(selectedPack?.price || 0))}
            </span>
          </div>
          <label className="client-field">
            <span>Nom sur la carte</span>
            <input
              className="client-input"
              placeholder="Nom du titulaire"
              value={reservationForm.cardholder_name}
              onChange={(event) => setReservationForm((prev) => ({ ...prev, cardholder_name: event.target.value }))}
            />
          </label>
          <label className="client-field">
            <span>Informations carte</span>
            <div className="client-card-element-wrap">
              {stripeConfig.enabled && stripe ? <CardElement options={cardElementOptions} /> : <div className="client-pack-stripe-placeholder">Stripe non configure pour ce projet.</div>}
            </div>
          </label>
        </div>
      ) : null}

      <label className="client-field">
        <span>Notes</span>
        <textarea
          className="client-textarea"
          rows={3}
          placeholder="Informations utiles pour les prestataires..."
          value={reservationForm.notes}
          onChange={(event) => setReservationForm((prev) => ({ ...prev, notes: event.target.value }))}
        />
      </label>

      <label className="client-pack-booking-check">
        <input
          type="checkbox"
          checked={reservationForm.pay_now}
          onChange={(event) => setReservationForm((prev) => ({ ...prev, pay_now: event.target.checked }))}
        />
        <span>Valider et marquer le pack comme paye maintenant</span>
      </label>

      <button type="submit" className="client-btn client-btn-primary" disabled={submitting}>
        {submitting ? "Traitement..." : "Confirmer la reservation"}
      </button>
    </form>
  );
};

const PackServiceDetails = ({ item, onViewMore }) => {
  const service = item?.serviceDetails || {};
  const title = service.title || item?.serviceTitle || item?.serviceCategory || "Service mariage";
  const category = service.category || service.type || item?.serviceCategory || "Service";
  const image = resolveAssetUrl(service.image || service.images?.[0]?.url || SERVICE_PLACEHOLDER_IMAGE);
  const serviceId = service.id || item?.serviceId;

  return (
    <div className="client-pack-service-details">
      <div className="client-pack-service-hero">
        <img src={image || SERVICE_PLACEHOLDER_IMAGE} alt={title} />
        <div className="client-pack-service-hero-overlay">
          <span>{category}</span>
          <strong>{title}</strong>
        </div>
      </div>

      <div className="client-pack-service-detail-content">
        <div className="client-pack-service-detail-meta">
          <span>{formatCurrency(service.price || 0)}</span>
          <span>{service.city || item?.providerCity || "Tunisie"}</span>
          <span>Note {service.rating || "4.8"}</span>
        </div>

        <p>{service.description || "Prestation selectionnee pour composer une experience mariage harmonieuse et elegante."}</p>

        <div className="client-pack-service-provider-box">
          <span>Prestataire</span>
          <strong>{item?.providerName || service.provider_name || service.prestataire_name || "Prestataire"}</strong>
          <p>{service.provider_description || item?.providerRole || category}</p>
        </div>

        {serviceId ? (
          <button type="button" className="client-btn client-btn-primary client-pack-service-more-btn" onClick={() => onViewMore(serviceId)}>
            Voir plus
          </button>
        ) : null}
      </div>
    </div>
  );
};

const ClientPacksPage = () => {
  const navigate = useNavigate();
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [stripeConfig, setStripeConfig] = useState({ enabled: false, publishable_key: "" });
  const [selectedPack, setSelectedPack] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedServiceItem, setSelectedServiceItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [reservationForm, setReservationForm] = useState({
    date: "",
    start_time: "",
    payment_option: "",
    notes: "",
    pay_now: true,
    cardholder_name: "",
  });

  useEffect(() => {
    const loadPacks = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getClientPacks();
        setPacks(response.packs || []);
        const stripeResponse = await getClientStripeConfig();
        setStripeConfig(stripeResponse.stripe || { enabled: false, publishable_key: "" });
      } catch (err) {
        setError(err.response?.data?.message || "Impossible de charger les packs.");
      } finally {
        setLoading(false);
      }
    };

    loadPacks();
  }, []);

  useEffect(() => {
    if (error) showToast("error", error);
  }, [error]);

  useEffect(() => {
    if (message) showToast("success", message);
  }, [message]);

  const openReserveModal = (pack) => {
    setSelectedPack(pack);
    setReservationForm({
      date: "",
      start_time: "",
      payment_option: "",
      notes: "",
      pay_now: true,
      cardholder_name: "",
    });
    setModalOpen(true);
  };

  const closeReserveModal = () => {
    setModalOpen(false);
    setSelectedPack(null);
  };

  const openServiceModal = (item) => {
    setSelectedServiceItem(item);
  };

  const closeServiceModal = () => {
    setSelectedServiceItem(null);
  };

  const openServiceDetailsPage = (serviceId) => {
    closeServiceModal();
    navigate(`/client/service/${serviceId}`);
  };

  const stripePromise = useMemo(
    () => (stripeConfig.publishable_key ? loadStripe(stripeConfig.publishable_key) : null),
    [stripeConfig.publishable_key]
  );

  return (
    <ClientPageLayout
      kicker="Packs client"
      title="Packs valides et prets pour votre mariage"
      description="Consultez les packs offertes par notre plateforme."
    >
      <section className="client-section">
        <div className="client-shell">
          {loading ? <div className="client-loading">Chargement des packs...</div> : null}

          {!loading && packs.length === 0 ? (
            <div className="client-empty-state">
              <h3>Aucun pack valide pour le moment</h3>
              <p>Les packs apparaitront ici des qu'ils auront ete acceptes par tous les prestataires.</p>
            </div>
          ) : null}

          {!loading && packs.length > 0 ? (
            <div className="client-pack-grid">
              {packs.map((pack) => (
                <article key={pack.id} className="client-pack-card">
                  <div className="client-pack-card-head">
                    <div>
                      <span className="client-section-label">Pack valide</span>
                      <h2>{pack.name}</h2>
                      <p>{pack.description || "Pack multi-prestataires concu pour une experience mariage harmonieuse."}</p>
                    </div>
                    <span className="client-pack-price">{formatCurrency(pack.price)}</span>
                  </div>

                  <div className="client-pack-meta">
                    <span className="client-pack-status">Valide</span>
                    <span className="client-pack-meta-pill">{formatPackEndDate(pack.expiresAt)}</span>
                    <span className="client-pack-meta-pill">{pack.items?.length || 0} service(s)</span>
                  </div>

                  <div className="client-pack-services">
                    {(pack.items || []).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="client-pack-service-pill"
                        onClick={() => openServiceModal(item)}
                      >
                        <strong>{item.serviceTitle || item.serviceCategory}</strong>
                        <span>{item.providerName}</span>
                      </button>
                    ))}
                  </div>

                  <div className="client-pack-card-actions">
                    <button type="button" className="client-btn client-btn-primary" onClick={() => openReserveModal(pack)}>
                      Reserver et payer
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <ClientModal open={modalOpen} title={selectedPack ? `Reserver ${selectedPack.name}` : "Reserver un pack"} onClose={closeReserveModal}>
        <Elements stripe={stripePromise}>
          <PackPaymentForm
            selectedPack={selectedPack}
            reservationForm={reservationForm}
            setReservationForm={setReservationForm}
            stripeConfig={stripeConfig}
            closeReserveModal={closeReserveModal}
            navigate={navigate}
            setError={setError}
            setMessage={setMessage}
            setSubmitting={setSubmitting}
            submitting={submitting}
          />
        </Elements>
      </ClientModal>

      <ClientModal
        open={Boolean(selectedServiceItem)}
        title={selectedServiceItem?.serviceTitle || selectedServiceItem?.serviceCategory || "Detail du service"}
        onClose={closeServiceModal}
        className="client-pack-service-modal"
      >
        <PackServiceDetails item={selectedServiceItem} onViewMore={openServiceDetailsPage} />
      </ClientModal>
    </ClientPageLayout>
  );
};

export default ClientPacksPage;
