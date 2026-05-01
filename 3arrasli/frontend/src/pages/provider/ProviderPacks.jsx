import React from "react";

const formatCurrency = (value) => `${Number(value || 0).toFixed(0)} TND`;
const formatPackEndDate = (value) => {
  if (!value) {
    return "Date non definie";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
};

const ProviderPacks = ({ packs, activePack, loading, onSelectPack, onRespond, responding }) => {
  const packLocked = ["validated", "expired"].includes(activePack?.status);
  const getPackStatusLabel = (status) => {
    if (status === "validated") {
      return "Valide";
    }
    if (status === "needs-replacement") {
      return "A revoir";
    }
    if (status === "expired") {
      return "Expire";
    }
    return "En attente";
  };

  return (
  <article className="provider-panel provider-chat-shell provider-pack-shell">
    <div className="provider-chat-sidebar provider-pack-sidebar">
      <div className="provider-panel-head">
        <span className="provider-chat-kicker">Invitations pack</span>
        <h3>Packs proposes</h3>
        <p>Selectionnez une invitation pour consulter votre role et repondre rapidement.</p>
      </div>

      <div className="provider-chat-list">
        {loading ? <div className="provider-chat-state">Chargement des invitations...</div> : null}

        {!loading && packs.length === 0 ? (
          <div className="provider-empty-state provider-chat-empty">
            <span>Pack</span>
            <strong>Aucune invitation pour le moment</strong>
            <p>Les invitations admin apparaitront ici des qu'un pack vous sera propose.</p>
          </div>
        ) : null}

        {!loading
          ? packs.map((pack) => (
              <button
                key={pack.id}
                type="button"
                className={`provider-chat-item ${activePack?.id === pack.id ? "active" : ""}`}
                onClick={() => onSelectPack(pack.id)}
              >
                <span className="provider-chat-avatar">{pack.name?.slice(0, 2).toUpperCase() || "PK"}</span>
                <div className="provider-chat-item-copy">
                  <strong>{pack.name}</strong>
                  <p>{pack.items?.length || 0} service(s)</p>
                </div>
                <span className="provider-chat-meta">
                  <em>{getPackStatusLabel(pack.status)}</em>
                </span>
              </button>
            ))
          : null}
      </div>
    </div>

    <div className="provider-chat-window provider-pack-window">
      {!activePack ? (
        <div className="provider-empty-state provider-chat-window-empty">
          <span>Packs</span>
          <strong>Choisissez un pack</strong>
          <p>Retrouvez ici les details du pack, votre place dans la composition et la decision a prendre.</p>
        </div>
      ) : (
        <>
          <div className="provider-chat-window-head">
            <span className="provider-chat-avatar large">{activePack.name?.slice(0, 2).toUpperCase() || "PK"}</span>
            <div>
              <small>Pack multi-prestataires</small>
              <h3>{activePack.name}</h3>
              <p>{activePack.description || "Invitation a rejoindre un pack admin structure autour de plusieurs services."}</p>
            </div>
            <span className={`provider-status ${activePack.status === "validated" ? "validated" : ""}`}>
              {activePack.status === "needs-replacement" ? "Refus detecte" : getPackStatusLabel(activePack.status)}
            </span>
          </div>

          <div className="provider-chat-messages provider-pack-details">
            <section className="provider-pack-summary">
              <div className="provider-pack-summary-card">
                <span>Prix pack</span>
                <strong>{formatCurrency(activePack.price)}</strong>
              </div>
              <div className="provider-pack-summary-card">
                <span>Fin du pack</span>
                <strong>{formatPackEndDate(activePack.expiresAt)}</strong>
              </div>
            </section>

            <div className="provider-pack-role-list">
              {activePack.items?.map((item) => (
                <article
                  key={item.id}
                  className={`provider-pack-role-card ${
                    item.providerStatus === "accepted"
                      ? "accepted"
                      : item.providerStatus === "refused"
                        ? "refused"
                        : ""
                  }`}
                >
                  <div>
                    <strong>{item.serviceCategory}</strong>
                    <p>{item.providerName}</p>
                  </div>
                  <span>
                    {item.providerStatus === "accepted"
                      ? "Accepte"
                      : item.providerStatus === "refused"
                        ? "Refuse"
                        : "En attente"}
                  </span>
                </article>
              ))}
            </div>
          </div>

          <div className="provider-pack-actions">
            {packLocked ? (
              <p className="provider-form-note">{activePack?.status === "expired" ? "Ce pack a expire. Les reponses des prestataires sont maintenant verrouillees." : "Ce pack est valide. Les reponses des prestataires sont maintenant verrouillees."}</p>
            ) : null}
            <button
              type="button"
              className="provider-primary-btn"
              disabled={responding || packLocked}
              onClick={() => onRespond(activePack.id, "accepted")}
            >
              {responding ? "Traitement..." : "Accepter"}
            </button>
            <button
              type="button"
              className="provider-secondary-btn"
              disabled={responding || packLocked}
              onClick={() => onRespond(activePack.id, "refused")}
            >
              Refuser
            </button>
          </div>
        </>
      )}
    </div>
  </article>
  );
};

export default ProviderPacks;
