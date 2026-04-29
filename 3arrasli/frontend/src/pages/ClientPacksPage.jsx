import React, { useEffect, useState } from "react";
import ClientPageLayout from "./client/ClientPageLayout";
import { getClientPacks } from "../services/clientPacks";
import { showToast } from "../services/toast";
import "./client.css";

const formatCurrency = (value) => `${Number(value || 0).toFixed(0)} TND`;

const ClientPacksPage = () => {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPacks = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getClientPacks();
        setPacks(response.packs || []);
      } catch (err) {
        setError(err.response?.data?.message || "Impossible de charger les packs.");
      } finally {
        setLoading(false);
      }
    };

    loadPacks();
  }, []);

  useEffect(() => {
    if (error) {
      showToast("error", error);
    }
  }, [error]);

  return (
    <ClientPageLayout
      kicker="Packs client"
      title="Packs valides et prets pour votre mariage."
      description="Consultez uniquement les packs entierement confirmes par tous les prestataires, avec une lecture claire des services inclus et du statut."
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
                    <span className="client-pack-meta-pill">{pack.duration || "Duree flexible"}</span>
                    <span className="client-pack-meta-pill">{pack.items?.length || 0} service(s)</span>
                  </div>

                  <div className="client-pack-services">
                    {(pack.items || []).map((item) => (
                      <div key={item.id} className="client-pack-service-pill">
                        <strong>{item.serviceCategory}</strong>
                        <span>{item.providerName}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </ClientPageLayout>
  );
};

export default ClientPacksPage;
