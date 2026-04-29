import React, { useEffect, useMemo, useState } from "react";
import api, { API_BASE_URL } from "../../services/api";
import { showToast } from "../../services/toast";

const PAGE_SIZE = 8;

const formatBookingDate = (date) => {
  if (!date) {
    return "--";
  }
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMoney = (value) => `${new Intl.NumberFormat("fr-FR").format(Number(value || 0))} TND`;
const normalizeContractStatus = (reservation) => {
  if (!reservation) return "pending_provider_signature";
  if (reservation.clientSignedAt) return "fully_signed";
  if (reservation.providerSignedAt) return "signed_by_provider";
  const raw = String(reservation.contractStatus || "").trim();
  if (raw) return raw;
  return "pending_provider_signature";
};

const formatContractStatus = (status) => {
  const value = String(status || "").trim();
  if (value === "signed_by_provider") return "Signe par prestataire";
  if (value === "fully_signed") return "Signe par client et prestataire";
  if (value === "refused_by_provider") return "Refuse par prestataire";
  return "En attente signature prestataire";
};
const buildDocumentUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `${API_BASE_URL}${raw.startsWith("/") ? raw : `/${raw}`}`;
};

const ProviderBookings = ({
  searchTerm,
  onSearchChange,
  reservations,
  selectedReservation,
  selectedReservationId,
  loadingBookings = false,
  onSelectReservation,
  onViewInCalendar,
  onContactClient,
  onRefreshBookings,
}) => {
  const [dateFilter, setDateFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalReservation, setModalReservation] = useState(null);
  const [contractBusy, setContractBusy] = useState(false);
  const [providerSignatureQr, setProviderSignatureQr] = useState("");
  const [providerSignatureLink, setProviderSignatureLink] = useState("");

  const filteredBookings = useMemo(() => {
    const clientQuery = clientFilter.trim().toLowerCase();
    const serviceQuery = serviceFilter.trim().toLowerCase();

    return reservations.filter((reservation) => {
      const dateMatch = !dateFilter || reservation.date === dateFilter;
      const clientMatch =
        !clientQuery || String(reservation.client || "").toLowerCase().includes(clientQuery);
      const serviceMatch =
        !serviceQuery || String(reservation.service || "").toLowerCase().includes(serviceQuery);
      return dateMatch && clientMatch && serviceMatch;
    });
  }, [clientFilter, dateFilter, reservations, serviceFilter]);

  const totalPages = Math.max(Math.ceil(filteredBookings.length / PAGE_SIZE), 1);
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, clientFilter, serviceFilter, searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const openReservationModal = (reservation) => {
    onSelectReservation(reservation.id);
    setProviderSignatureQr("");
    setProviderSignatureLink("");
    setModalReservation(reservation);
  };

  const activeReservation =
    modalReservation ||
    (modalReservation?.id ? reservations.find((item) => item.id === modalReservation.id) : null) ||
    (selectedReservationId ? reservations.find((item) => item.id === selectedReservationId) : null) ||
    selectedReservation;
  const canUseContract = Boolean(activeReservation?.contractUrl);
  const canUseInvoice = Boolean(activeReservation?.invoiceUrl);
  const normalizedContractStatus = normalizeContractStatus(activeReservation);
  const canSignProviderContract = Boolean(
    activeReservation?.id &&
    String(activeReservation?.paymentStatus || "").trim().toUpperCase() === "PAID" &&
    normalizedContractStatus === "pending_provider_signature"
  );
  const contractHref = buildDocumentUrl(activeReservation?.contractUrl);
  const invoiceHref = buildDocumentUrl(activeReservation?.invoiceUrl);

  const refuseProviderContract = async () => {
    if (!activeReservation?.id || contractBusy) {
      return;
    }
    setContractBusy(true);
    try {
      await api.post(`/api/provider/contracts/${activeReservation.id}/refuse`, {});
      setModalReservation(null);
      if (onRefreshBookings) {
        await onRefreshBookings();
      }
    } finally {
      setContractBusy(false);
    }
  };

  const createProviderSignatureQr = async () => {
    if (!activeReservation?.id || contractBusy) {
      return;
    }
    setContractBusy(true);
    try {
      const response = await api.post(`/api/provider/contracts/${activeReservation.id}/signature-link`);
      const token = response.data?.token;
      if (token) {
        const url = `${window.location.origin}/public/sign-contract?token=${encodeURIComponent(token)}`;
        setProviderSignatureLink(url);
        setProviderSignatureQr(`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`);
      } else {
        throw new Error("Token de signature introuvable.");
      }
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message || "Impossible de generer le QR de signature.");
    } finally {
      setContractBusy(false);
    }
  };

  useEffect(() => {
    if (!modalReservation?.id || !providerSignatureLink || !onRefreshBookings) {
      return undefined;
    }

    const refreshTimer = window.setInterval(async () => {
      try {
        const response = await api.get(`/api/provider/bookings/${modalReservation.id}`);
        const latestBooking = response.data?.booking;
        if (latestBooking) {
          setModalReservation(latestBooking);
        }
        await onRefreshBookings();
      } catch (_error) {
        // no-op: soft refresh loop
      }
    }, 3000);

    return () => window.clearInterval(refreshTimer);
  }, [modalReservation?.id, providerSignatureLink, onRefreshBookings]);

  useEffect(() => {
    if (!providerSignatureLink || !activeReservation) {
      return;
    }
    if (!activeReservation.canProviderSignContract) {
      setProviderSignatureQr("");
      setProviderSignatureLink("");
      showToast("success", "Signature prestataire validee. Le contrat est mis a jour.");
    }
  }, [providerSignatureLink, activeReservation]);

  return (
    <div className="provider-bookings-page provider-bookings-modern">
      <section className="provider-bookings-panel">
        <div className="provider-bookings-toolbar">
          <div className="provider-bookings-toolbar-copy">
            <span>Carnet des reservations</span>
            <strong>{filteredBookings.length} reservation(s)</strong>
          </div>

        </div>

        <section className="provider-bookings-sticky-filters">
          <label className="provider-bookings-search">
            <span>Client</span>
            <input
              type="text"
              value={clientFilter}
              onChange={(event) => setClientFilter(event.target.value)}
              placeholder="Nom client"
            />
          </label>
          <label className="provider-bookings-search">
            <span>Service</span>
            <input
              type="text"
              value={serviceFilter}
              onChange={(event) => setServiceFilter(event.target.value)}
              placeholder="Service reserve"
            />
          </label>
          <label className="provider-bookings-search">
            <span>Date</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
            />
          </label>
          <label className="provider-bookings-search provider-bookings-search-wide">
            <span>Recherche</span>
            <input
              type="text"
              value={searchTerm}
              onChange={onSearchChange}
              placeholder="Client, service ou lieu"
            />
          </label>
        </section>

        <section className="provider-bookings-list-shell">
          {loadingBookings ? (
            <div className="provider-empty-state provider-booking-empty">
              <strong>Chargement...</strong>
              <p>Les reservations sont en cours de recuperation.</p>
            </div>
          ) : null}

          {!loadingBookings && filteredBookings.length === 0 ? (
            <div className="provider-empty-state provider-booking-empty">
              <span className="provider-booking-empty-icon">Reservation</span>
              <strong>Aucune reservation trouvee</strong>
              <p>Modifiez les filtres pour retrouver une reservation.</p>
            </div>
          ) : null}

          {!loadingBookings && filteredBookings.length > 0 ? (
            <div className="provider-bookings-table" role="list">
              {paginatedBookings.map((reservation) => (
                <button
                  key={reservation.id}
                  type="button"
                  className={`provider-bookings-row ${
                    selectedReservationId === reservation.id ? "active" : ""
                  }`}
                  onClick={() => openReservationModal(reservation)}
                  role="listitem"
                >
                  <span className="provider-booking-avatar">{reservation.client?.slice(0, 2) || "CL"}</span>
                  <span className="provider-booking-client">
                    <strong>{reservation.client}</strong>
                    <small>{reservation.location || "--"}</small>
                  </span>
                  <span className="provider-booking-service">{reservation.service}</span>
                  <span className="provider-booking-date">
                    <strong>{formatBookingDate(reservation.date)}</strong>
                    <small>{reservation.time || "--"}</small>
                  </span>
                  <span className="provider-booking-amount">{formatMoney(reservation.amount)}</span>
                </button>
              ))}
            </div>
          ) : null}
        </section>

        {!loadingBookings && filteredBookings.length > PAGE_SIZE ? (
          <div className="provider-bookings-pagination">
            <button
              type="button"
              className="provider-ghost-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
            >
              Precedent
            </button>
            <span>
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              className="provider-ghost-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
            >
              Suivant
            </button>
          </div>
        ) : null}
      </section>

      {modalReservation ? (
        <div
          className="provider-booking-modal-overlay"
          role="presentation"
          onMouseDown={() => setModalReservation(null)}
        >
          <section
            className="provider-booking-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="provider-booking-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="provider-modal-close"
              aria-label="Fermer"
              onClick={() => setModalReservation(null)}
            >
              <span />
              <span />
            </button>

            <header className="provider-booking-modal-head">
              <span className="provider-bookings-eyebrow">Reservation mariage</span>
              <h3 id="provider-booking-modal-title">{activeReservation.service}</h3>
              <p>
                {activeReservation.client} - {formatBookingDate(activeReservation.date)} a{" "}
                {activeReservation.time || "--"}
              </p>
            </header>

            <div className="provider-booking-modal-grid">
              <div>
                <span>Statut signature prestataire</span>
                <strong>{formatContractStatus(normalizedContractStatus)}</strong>
              </div>
              <div>
                <span>Client</span>
                <strong>{activeReservation.client}</strong>
              </div>
              <div>
                <span>Service reserve</span>
                <strong>{activeReservation.service}</strong>
              </div>
              <div>
                <span>Date</span>
                <strong>{formatBookingDate(activeReservation.date)}</strong>
              </div>
              <div>
                <span>Heure</span>
                <strong>{activeReservation.time || "--"}</strong>
              </div>
              <div>
                <span>Montant total</span>
                <strong>{formatMoney(activeReservation.totalAmount ?? activeReservation.amount)}</strong>
              </div>
              <div>
                <span>Montant paye</span>
                <strong>{formatMoney(activeReservation.paidAmount)}</strong>
              </div>
              <div>
                <span>Montant restant</span>
                <strong>{formatMoney(activeReservation.remainingAmount)}</strong>
              </div>
            </div>

            {activeReservation.calendarSlotLocked ? (
              <div className="provider-alert provider-alert-success provider-bookings-alert">
                Cette reservation est liee a un creneau calendrier reserve. Vous pouvez la consulter
                et contacter le client.
              </div>
            ) : null}

            <div className="provider-booking-modal-notes">
              <article>
                <span>Notes du client</span>
                <p>{activeReservation.notes || "Aucune note client."}</p>
              </article>
              <article>
                <span>Details de la reservation</span>
                <p>{activeReservation.details || "Aucun detail supplementaire."}</p>
              </article>
            </div>

            <footer className="provider-booking-modal-actions">
              <button
                type="button"
                className="provider-primary-btn"
                onClick={() => {
                  setModalReservation(null);
                  onContactClient(activeReservation);
                }}
              >
                Contacter client
              </button>
              <button
                type="button"
                className="provider-ghost-btn"
                onClick={() => {
                  setModalReservation(null);
                  onViewInCalendar(activeReservation);
                }}
              >
                Voir calendrier
              </button>
              <a
                className={`provider-ghost-btn ${canUseContract ? "" : "disabled"}`}
                href={canUseContract ? contractHref : undefined}
                target="_blank"
                rel="noreferrer"
                aria-disabled={!canUseContract}
              >
                Contrat
              </a>
              <a
                className={`provider-ghost-btn ${canUseInvoice ? "" : "disabled"}`}
                href={canUseInvoice ? invoiceHref : undefined}
                target="_blank"
                rel="noreferrer"
                aria-disabled={!canUseInvoice}
              >
                Facture
              </a>
              <button
                type="button"
                className="provider-primary-btn"
                disabled={!canSignProviderContract || contractBusy}
                onClick={createProviderSignatureQr}
              >
                Signer
              </button>
              <button
                type="button"
                className="provider-ghost-btn"
                disabled={!canSignProviderContract || contractBusy}
                onClick={refuseProviderContract}
              >
                Refuser
              </button>
            </footer>
            {providerSignatureQr ? (
              <div className="client-signature-qr">
                <img src={providerSignatureQr} alt="QR code signature prestataire" width="180" height="180" />
                <p>Scannez ce QR avec votre telephone pour signer sans vous reconnecter.</p>
                {providerSignatureLink ? (
                  <a className="provider-ghost-btn" href={providerSignatureLink} target="_blank" rel="noreferrer">
                    Ouvrir le lien de signature
                  </a>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default ProviderBookings;
