import React, { useEffect, useMemo, useState } from "react";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import { resolveAssetUrl } from "../services/assets";
import { getStoredSession } from "../services/auth";
import ClientPageLayout from "./client/ClientPageLayout";
import ClientModal from "./client/ClientModal";
import StarRating from "./client/StarRating";

const initialAppointmentForm = {
  date: "",
  start_time: "",
  message: "",
};

const initialReservationForm = {
  date: "",
  start_time: "",
  notes: "",
  payment_option: "full",
  payment_mode: "card",
  cardholder_name: "",
};

const buildAmount = (service, paymentOption) => {
  const price = Number(service?.price || 0);
  return paymentOption === "partial" ? Number((price * 0.3).toFixed(2)) : price;
};

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

const ReservationFormBase = ({
  providerName,
  reservationAmount,
  reservationForm,
  setReservationForm,
  availability,
  reservationSlots,
  stripeEnabled,
  submitting,
  onSubmit,
  cardBlock,
}) => (
  <form className="client-modal-form client-reservation-modal-form" onSubmit={onSubmit}>
    <div className="client-payment-summary">
      <div>
        <span className="client-section-label">Prestataire</span>
        <strong>{providerName}</strong>
      </div>
      <div>
        <span className="client-section-label">Montant</span>
        <strong>{reservationAmount} TND</strong>
      </div>
    </div>

    <label className="client-field">
      <span>Date</span>
      <select
        className="client-select"
        value={reservationForm.date}
        onChange={(event) => setReservationForm((prev) => ({ ...prev, date: event.target.value, start_time: "" }))}
      >
        <option value="">Choisir une date</option>
        {availability.days
          .filter((day) => day.available)
          .map((day) => (
            <option key={day.date} value={day.date}>
              {day.label}
            </option>
          ))}
      </select>
    </label>

    <label className="client-field">
      <span>Creneau</span>
      <select
        className="client-select"
        value={reservationForm.start_time}
        onChange={(event) => setReservationForm((prev) => ({ ...prev, start_time: event.target.value }))}
      >
        <option value="">Choisir un creneau</option>
        {reservationSlots.map((slot) => (
          <option key={slot.time} value={slot.time}>
            {slot.time} - {slot.end_time}
          </option>
        ))}
      </select>
    </label>

    <div className="client-payment-options">
      <button
        type="button"
        className={`client-payment-option ${reservationForm.payment_option === "full" ? "active" : ""}`}
        onClick={() => setReservationForm((prev) => ({ ...prev, payment_option: "full" }))}
      >
        Payer le montant total
      </button>
      <button
        type="button"
        className={`client-payment-option ${reservationForm.payment_option === "partial" ? "active" : ""}`}
        onClick={() => setReservationForm((prev) => ({ ...prev, payment_option: "partial" }))}
      >
        Payer une avance
      </button>
    </div>

    <div className="client-payment-mode-grid">
      <button
        type="button"
        className={`client-payment-mode-card ${reservationForm.payment_mode === "card" ? "active" : ""}`}
        onClick={() => setReservationForm((prev) => ({ ...prev, payment_mode: "card" }))}
        disabled={!stripeEnabled}
      >
        <strong>Paiement par carte</strong>
        <span>{stripeEnabled ? "Visa, Mastercard, 3D Secure" : "Stripe non configure"}</span>
      </button>
      <button
        type="button"
        className={`client-payment-mode-card ${reservationForm.payment_mode === "later" ? "active" : ""}`}
        onClick={() => setReservationForm((prev) => ({ ...prev, payment_mode: "later" }))}
      >
        <strong>Payer plus tard</strong>
        <span>Creation de reservation sans paiement immediat</span>
      </button>
    </div>

    {cardBlock}

    <label className="client-field">
      <span>Details</span>
      <textarea
        className="client-textarea"
        placeholder="Precisions pour la reservation"
        value={reservationForm.notes}
        onChange={(event) => setReservationForm((prev) => ({ ...prev, notes: event.target.value }))}
      />
    </label>

    <button type="submit" className="client-btn client-btn-primary" disabled={submitting}>
      {submitting
        ? "Preparation..."
        : reservationForm.payment_mode === "card"
          ? "Payer et reserver"
          : "Creer la reservation"}
    </button>
  </form>
);

const StripeReservationForm = (props) => {
  const stripe = useStripe();
  const elements = useElements();

  const cardBlock =
    props.reservationForm.payment_mode === "card" ? (
      <div className="client-card-payment-box">
        <label className="client-field">
          <span>Nom sur la carte</span>
          <input
            className="client-input"
            value={props.reservationForm.cardholder_name}
            onChange={(event) =>
              props.setReservationForm((prev) => ({ ...prev, cardholder_name: event.target.value }))
            }
            placeholder="Nom du titulaire"
          />
        </label>

        <label className="client-field">
          <span>Informations carte</span>
          <div className="client-card-element-wrap">
            <CardElement options={cardElementOptions} />
          </div>
        </label>
      </div>
    ) : null;

  return (
    <ReservationFormBase
      {...props}
      cardBlock={cardBlock}
      onSubmit={(event) => props.onSubmit(event, stripe, elements)}
    />
  );
};

const ClientProviderPage = () => {
  const { id } = useParams();
  const sessionUser = getStoredSession()?.user || {};
  const [service, setService] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [availability, setAvailability] = useState({ days: [], next_available: null, availability_label: "" });
  const [stripeConfig, setStripeConfig] = useState({ enabled: false, publishable_key: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [appointmentForm, setAppointmentForm] = useState(initialAppointmentForm);
  const [reservationForm, setReservationForm] = useState(initialReservationForm);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [reservationOpen, setReservationOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadService = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/api/services/${id}`);
      setService(response.data.service || null);
      setReviews(response.data.reviews || []);
      setAvailability(response.data.availability || { days: [] });
      setStripeConfig(response.data.stripe || { enabled: false, publishable_key: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de charger cette fiche.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadService();
  }, [id]);

  const selectedAppointmentDay = useMemo(
    () => availability.days.find((day) => day.date === appointmentForm.date),
    [appointmentForm.date, availability.days]
  );
  const selectedReservationDay = useMemo(
    () => availability.days.find((day) => day.date === reservationForm.date),
    [reservationForm.date, availability.days]
  );

  const appointmentSlots = (selectedAppointmentDay?.slots || []).filter((slot) => slot.available);
  const reservationSlots = (selectedReservationDay?.slots || []).filter((slot) => slot.available);
  const reservationAmount = buildAmount(service, reservationForm.payment_option);
  const averageRating = Number(service?.rating || 0).toFixed(1);
  const stripePromise = useMemo(
    () => (stripeConfig.publishable_key ? loadStripe(stripeConfig.publishable_key) : null),
    [stripeConfig.publishable_key]
  );

  const resetMessages = () => {
    setError("");
    setMessage("");
  };

  useEffect(() => {
    if (!stripeConfig.enabled) {
      setReservationForm((prev) => ({ ...prev, payment_mode: "later" }));
    }
  }, [stripeConfig.enabled]);

  const toggleFavorite = async () => {
    if (!service) {
      return;
    }

    resetMessages();
    try {
      if (service.is_favorite && service.favorite_id) {
        await api.delete(`/api/favorites/${service.favorite_id}`);
        setMessage("Prestataire retire de vos favoris.");
      } else {
        await api.post("/api/favorites", { prestataire_id: service.prestataire_id });
        setMessage("Prestataire ajoute a vos favoris.");
      }
      await loadService();
    } catch (err) {
      setError(err.response?.data?.message || "Action favoris impossible.");
    }
  };

  const submitReview = async (event) => {
    event.preventDefault();
    resetMessages();
    setSubmitting(true);
    try {
      await api.post(`/api/services/${id}/reviews`, reviewForm);
<<<<<<< HEAD
      setMessage("Votre avis a ete enregistre.");
=======
      setMessage("");
>>>>>>> 3f58563a534e5d8e07cf665262a57ce5d850d991
      setReviewForm({ rating: 5, comment: "" });
      await loadService();
    } catch (err) {
      setError(err.response?.data?.message || "Impossible d'enregistrer l'avis.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitAppointment = async (event) => {
    event.preventDefault();
    resetMessages();
    setSubmitting(true);
    try {
      await api.post("/api/appointments", {
        service_id: Number(id),
        date: appointmentForm.date,
        start_time: appointmentForm.start_time,
        message: appointmentForm.message,
      });
      setMessage("Rendez-vous cree avec succes.");
      setAppointmentForm(initialAppointmentForm);
      setAppointmentOpen(false);
      await loadService();
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de creer le rendez-vous.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitReservation = async (event, stripe = null, elements = null) => {
    event.preventDefault();
    resetMessages();
    setSubmitting(true);
    try {
      const createResponse = await api.post("/api/reservations", {
        service_id: Number(id),
        date: reservationForm.date,
        start_time: reservationForm.start_time,
        notes: reservationForm.notes,
        details: reservationForm.notes,
        payment_option: reservationForm.payment_option,
        amount: reservationAmount,
      });

      const reservation = createResponse.data.reservation;

      if (reservationForm.payment_mode === "card") {
        if (!stripeConfig.enabled) {
          throw new Error("Stripe n'est pas configure pour ce projet.");
        }
        if (!stripe || !elements) {
          throw new Error("Le formulaire de carte n'est pas encore pret.");
        }

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error("Les informations carte ne sont pas disponibles.");
        }

        const paymentResponse = await api.post(`/api/reservations/${reservation.id}/payment/intent`);
        const clientSecret = paymentResponse.data.client_secret;
        const paymentIntentId = paymentResponse.data.payment_intent_id;

        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: reservationForm.cardholder_name || sessionUser.name || "",
              email: sessionUser.email || "",
            },
          },
        });

        if (stripeError) {
          throw new Error(`Reservation creee, mais le paiement carte a echoue: ${stripeError.message}`);
        }

        const confirmResponse = await api.post(`/api/reservations/${reservation.id}/payment/confirm-intent`, {
          payment_intent_id: paymentIntent?.id || paymentIntentId,
        });
        setMessage(confirmResponse.data.message || "Reservation payee avec succes.");
      } else {
        setMessage("Reservation creee avec succes. Vous pourrez payer plus tard.");
      }

      setReservationForm(initialReservationForm);
      setReservationOpen(false);
      await loadService();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Impossible de creer la reservation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ClientPageLayout
      kicker="Fiche prestataire"
      title={service?.provider_name || service?.title || "Decouvrez ce prestataire"}
      description="Une fiche detaillee, elegante et orientee action pour reserver, prendre rendez-vous et suivre la confiance client."
    >
      <section className="client-section client-detail-section">
        <div className="client-shell">
          {loading ? <p className="client-loading">Chargement de la fiche...</p> : null}
          {!loading && error && !service ? <p className="client-error">{error}</p> : null}

          {!loading && !service ? (
            <div className="client-empty-state">
              <h3>Fiche indisponible.</h3>
              <p>Ce service n'existe plus ou n'est pas accessible pour le moment.</p>
              <Link className="client-btn client-btn-primary" to="/client/search">
                Retour a la recherche
              </Link>
            </div>
          ) : null}

          {service ? (
            <>
              {message ? <p className="client-message">{message}</p> : null}
              {error ? <p className="client-error">{error}</p> : null}

              <div className="client-detail-layout client-provider-layout">
                <div className="client-detail-gallery client-provider-gallery">
                  <img src={resolveAssetUrl(service.image)} alt={service.title} />
                </div>

                <div className="client-detail-card client-provider-detail-card">
                  <div className="client-provider-topbar">
                    <span className="section-kicker">{service.provider_category || service.type}</span>
                    <button
                      type="button"
                      className={`client-favorite-toggle ${service.is_favorite ? "active" : ""}`}
                      onClick={toggleFavorite}
                      aria-label={service.is_favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                    >
                      ★
                    </button>
                  </div>

                  <div className="client-provider-identity">
                    {service.provider_image ? (
                      <img src={resolveAssetUrl(service.provider_image)} alt={service.provider_name} />
                    ) : null}
                    <div>
                      <h2 id="client-service-modal-title">{service.provider_name}</h2>
                      <p className="client-provider-subtitle">{service.title}</p>
                    </div>
                  </div>

                  <div className="client-detail-price">{service.price} TND</div>
                  <p>{service.provider_description || service.description}</p>

                  <div className="client-rating-summary">
                    <StarRating value={Math.round(Number(service.rating || 0))} readOnly />
                    <strong>{averageRating}/5</strong>
                    <span>{service.review_count || 0} avis</span>
                  </div>

                  <dl className="client-detail-list">
                    <div>
                      <dt>Service</dt>
                      <dd>{service.title}</dd>
                    </div>
                    <div>
                      <dt>Lieu</dt>
                      <dd>{service.provider_city || service.city || "Tunisie"}</dd>
                    </div>
                    <div>
                      <dt>Prix</dt>
                      <dd>{service.price} TND</dd>
                    </div>
                    <div>
                      <dt>Note</dt>
                      <dd>{averageRating}/5</dd>
                    </div>
                  </dl>

                  <div className="client-detail-actions client-provider-actions">
                    <button type="button" className="client-btn client-btn-primary" onClick={() => setReservationOpen(true)}>
                      Reserver
                    </button>
                    <button type="button" className="client-btn client-btn-soft" onClick={() => setAppointmentOpen(true)}>
                      Prendre un rendez-vous
                    </button>
                    <Link className="client-btn client-btn-ghost" to={`/client/chat?provider=${service.prestataire_id}`}>
                      Contacter
                    </Link>
                  </div>

                  <div className="client-provider-notes">
                    <div className="client-provider-note-card">
                      <span className="client-section-label">Paiement</span>
                      <p>
                        {stripeConfig.enabled
                          ? "Paiement carte via Stripe disponible avec redirection securisee."
                          : "Stripe n'est pas encore configure pour ce projet."}
                      </p>
                    </div>
                    <div className="client-provider-note-card">
                      <span className="client-section-label">Documents</span>
                      <p>Facture PDF, contrat PDF et signature electronique apres paiement confirme.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="client-provider-review-grid">
                <section className="client-panel client-review-panel">
                  <div className="client-section-head client-provider-inline-head">
                    <div>
                      <span className="section-kicker">Avis clients</span>
                      <h2>{reviews.length} commentaire(s)</h2>
                    </div>
<<<<<<< HEAD
                    <p>Les retours renforcent la confiance avant la reservation.</p>
=======
                    
>>>>>>> 3f58563a534e5d8e07cf665262a57ce5d850d991
                  </div>

                  <div className="client-review-list">
                    {reviews.map((review) => (
                      <article key={review.id} className="client-review-card">
                        <div className="client-review-head">
                          <div>
                            <strong>{review.client_name}</strong>
                            <span>{new Date(review.created_at).toLocaleDateString()}</span>
                          </div>
                          <StarRating value={review.rating} readOnly size="sm" />
                        </div>
                        <p>{review.comment || "Aucun commentaire ajoute."}</p>
                      </article>
                    ))}

                    {reviews.length === 0 ? (
                      <div className="client-empty-state">
                        <h3>Aucun avis pour le moment.</h3>
                        <p>Soyez le premier a partager votre experience avec ce prestataire.</p>
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="client-panel client-review-form-panel">
                  <span className="section-kicker">Laisser un avis</span>
                  <h3>Notez votre experience</h3>
                  <form className="client-review-form" onSubmit={submitReview}>
                    <StarRating value={reviewForm.rating} onChange={(rating) => setReviewForm((prev) => ({ ...prev, rating }))} />
                    <textarea
                      className="client-textarea"
                      placeholder="Votre commentaire"
                      value={reviewForm.comment}
                      onChange={(event) => setReviewForm((prev) => ({ ...prev, comment: event.target.value }))}
                    />
                    <button type="submit" className="client-btn client-btn-primary" disabled={submitting}>
                      {submitting ? "Enregistrement..." : "Publier l'avis"}
                    </button>
                  </form>
                </section>
              </div>
            </>
          ) : null}
        </div>
      </section>

      <ClientModal open={appointmentOpen} title="Prendre un rendez-vous" onClose={() => setAppointmentOpen(false)}>
        <form className="client-modal-form" onSubmit={submitAppointment}>
          <label className="client-field">
            <span>Date</span>
            <select
              className="client-select"
              value={appointmentForm.date}
              onChange={(event) => setAppointmentForm((prev) => ({ ...prev, date: event.target.value, start_time: "" }))}
            >
              <option value="">Choisir une date</option>
              {availability.days
                .filter((day) => day.available)
                .map((day) => (
                  <option key={day.date} value={day.date}>
                    {day.label}
                  </option>
                ))}
            </select>
          </label>

          <label className="client-field">
            <span>Creneau</span>
            <select
              className="client-select"
              value={appointmentForm.start_time}
              onChange={(event) => setAppointmentForm((prev) => ({ ...prev, start_time: event.target.value }))}
            >
              <option value="">Choisir un creneau</option>
              {appointmentSlots.map((slot) => (
                <option key={slot.time} value={slot.time}>
                  {slot.time} - {slot.end_time}
                </option>
              ))}
            </select>
          </label>

          <label className="client-field">
            <span>Message</span>
            <textarea
              className="client-textarea"
              placeholder="Message optionnel"
              value={appointmentForm.message}
              onChange={(event) => setAppointmentForm((prev) => ({ ...prev, message: event.target.value }))}
            />
          </label>

          <button type="submit" className="client-btn client-btn-primary" disabled={submitting}>
            {submitting ? "Envoi..." : "Confirmer le rendez-vous"}
          </button>
        </form>
      </ClientModal>

      <ClientModal open={reservationOpen} title="Reserver ce prestataire" onClose={() => setReservationOpen(false)}>
        {stripeConfig.enabled && stripePromise ? (
          <Elements stripe={stripePromise}>
            <StripeReservationForm
              providerName={service?.provider_name}
              reservationAmount={reservationAmount}
              reservationForm={reservationForm}
              setReservationForm={setReservationForm}
              availability={availability}
              reservationSlots={reservationSlots}
              stripeEnabled={stripeConfig.enabled}
              submitting={submitting}
              onSubmit={submitReservation}
            />
          </Elements>
        ) : (
          <ReservationFormBase
            providerName={service?.provider_name}
            reservationAmount={reservationAmount}
            reservationForm={reservationForm}
            setReservationForm={setReservationForm}
            availability={availability}
            reservationSlots={reservationSlots}
            stripeEnabled={false}
            submitting={submitting}
            onSubmit={(event) => submitReservation(event)}
            cardBlock={null}
          />
        )}
      </ClientModal>

    </ClientPageLayout>
  );
};

export default ClientProviderPage;
