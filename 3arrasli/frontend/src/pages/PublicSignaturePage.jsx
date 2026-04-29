import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../services/api";
import { showToast } from "../services/toast";
import SignaturePad from "./client/SignaturePad";
import "./PublicSignaturePage.css";

const PublicSignaturePage = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reservation, setReservation] = useState(null);
  const [signatureData, setSignatureData] = useState("");
  const token = (searchParams.get("token") || "").trim();

  useEffect(() => {
    const loadSession = async () => {
      if (!token) {
        setError("Lien de signature invalide.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/api/public/signature-session?token=${encodeURIComponent(token)}`);
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Session de signature invalide.");
        }
        setReservation(payload.reservation || null);
      } catch (err) {
        setError(err.message || "Impossible de charger la session de signature.");
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [token]);

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

  const submitSignature = async (event) => {
    event.preventDefault();
    if (!signatureData) {
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/public/signature-session/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, signature_data: signatureData }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Signature impossible.");
      }
      setMessage(payload.message || "Signature enregistree.");
    } catch (err) {
      setError(err.message || "Signature impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="public-signature-page">
      <h1 className="public-signature-title">Signature du contrat</h1>
      {loading ? <p>Chargement...</p> : null}
      {!loading && !reservation && !message ? <p>Cette session de signature n'est pas disponible.</p> : null}
      {message ? <p>La signature a ete enregistree. Vous pouvez fermer cette page.</p> : null}
      {reservation && !message ? (
        <form className="public-signature-form" onSubmit={submitSignature}>
          <p>Reservation #{reservation.id}</p>
          <p>Service: {reservation.service_title}</p>
          <p>Prestataire: {reservation.provider_name}</p>
          <p>Date: {reservation.date}</p>
          <SignaturePad onChange={setSignatureData} />
          <button type="submit" className="public-signature-submit" disabled={submitting || !signatureData}>
            {submitting ? "Signature..." : "Valider la signature"}
          </button>
        </form>
      ) : null}
    </main>
  );
};

export default PublicSignaturePage;
