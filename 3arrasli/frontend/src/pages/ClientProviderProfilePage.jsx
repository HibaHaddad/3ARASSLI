import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import { resolveAssetUrl } from "../services/assets";
import { showToast } from "../services/toast";
import ClientPageLayout from "./client/ClientPageLayout";
import StarRating from "./client/StarRating";

const ClientProviderProfilePage = () => {
  const { id } = useParams();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const loadProvider = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get(`/api/providers/${id}`);
        setProvider(response.data.provider || null);
      } catch (err) {
        setError(err.response?.data?.message || "Impossible de charger ce prestataire.");
      } finally {
        setLoading(false);
      }
    };

    loadProvider();
  }, [id]);

  useEffect(() => {
    if (error) {
      showToast("error", error);
    }
  }, [error]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [provider?.id]);

  const gallery = useMemo(() => {
    const baseGallery = Array.isArray(provider?.gallery) ? provider.gallery : [];
    if (baseGallery.length > 0) {
      return baseGallery.map((item) => resolveAssetUrl(item.image_path || item.url || item));
    }
    if (provider?.cover) {
      return [resolveAssetUrl(provider.cover)];
    }
    if (provider?.image) {
      return [resolveAssetUrl(provider.image)];
    }
    return [];
  }, [provider]);

  const canSlideGallery = gallery.length > 1;

  return (
    <ClientPageLayout
      kicker="Prestataire"
      title={provider?.name || "Decouvrez ce prestataire"}
      description="Une vue dediee au prestataire, avec tous ses services visibles, ses informations utiles et ses galeries."
    >
      <section className="client-section client-detail-section">
        <div className="client-shell">
          {loading ? <p className="client-loading">Chargement du prestataire...</p> : null}

          {!loading && !provider ? (
            <div className="client-empty-state">
              <h3>Prestataire indisponible.</h3>
              <p>Ce profil n'est pas accessible pour le moment.</p>
              <Link className="client-btn client-btn-primary" to="/client/search">
                Retour a la recherche
              </Link>
            </div>
          ) : null}

          {provider ? (
            <>
              <div className="client-detail-layout client-provider-layout">
                <div className="client-detail-gallery client-provider-gallery">
                  <div className="client-provider-gallery-stage">
                    {gallery.length > 0 ? <img src={gallery[activeImageIndex]} alt={provider.name} /> : null}
                    {canSlideGallery ? (
                      <>
                        <button
                          type="button"
                          className="client-gallery-nav prev"
                          onClick={() => setActiveImageIndex((prev) => (prev - 1 + gallery.length) % gallery.length)}
                          aria-label="Photo precedente"
                        >
                          &#10094;
                        </button>
                        <button
                          type="button"
                          className="client-gallery-nav next"
                          onClick={() => setActiveImageIndex((prev) => (prev + 1) % gallery.length)}
                          aria-label="Photo suivante"
                        >
                          &#10095;
                        </button>
                      </>
                    ) : null}
                  </div>

                  {canSlideGallery ? (
                    <div className="client-gallery-strip client-provider-gallery-strip">
                      {gallery.map((image, index) => (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          className={index === activeImageIndex ? "active" : ""}
                          onClick={() => setActiveImageIndex(index)}
                          aria-label={`Afficher la photo ${index + 1}`}
                        >
                          <img src={image} alt={`${provider.name} miniature ${index + 1}`} />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="client-detail-card client-provider-detail-card">
                  <div className="client-provider-identity">
                    {provider.image ? <img src={resolveAssetUrl(provider.image)} alt={provider.name} /> : null}
                    <div>
                      <span className="section-kicker">{provider.category || "Prestataire"}</span>
                      <h2>{provider.name}</h2>
                      <p className="client-provider-subtitle">{provider.city || "Tunisie"}</p>
                    </div>
                  </div>

                  <p>{provider.description || "Aucune description fournie."}</p>

                  <div className="client-rating-summary">
                    <StarRating value={Math.round(Number(provider.rating || 0))} readOnly />
                    <strong>{Number(provider.rating || 0).toFixed(1)}/5</strong>
                    <span>{provider.review_count || 0} avis</span>
                  </div>

                  <dl className="client-detail-list">
                    <div>
                      <dt>Services</dt>
                      <dd>{provider.services_count || 0}</dd>
                    </div>
                    <div>
                      <dt>Ville</dt>
                      <dd>{provider.city || "Tunisie"}</dd>
                    </div>
                    <div>
                      <dt>Categorie</dt>
                      <dd>{provider.category || "Service"}</dd>
                    </div>
                    <div>
                      <dt>Note</dt>
                      <dd>{Number(provider.rating || 0).toFixed(1)}/5</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <section className="client-provider-services-section">
                <div className="client-section-head">
                  <div>
                    <span className="section-kicker">Catalogue</span>
                    <h2>Services proposes par {provider.name}</h2>
                  </div>
                  <p>{provider.services_count || 0} prestation(s) visible(s)</p>
                </div>

                <div className="client-provider-services-grid">
                  {(provider.services || []).map((service) => (
                    <article key={service.id} className="client-provider-service-card">
                      <div className="client-provider-service-head">
                        <div>
                          <span className="client-status">{service.category || service.type}</span>
                          <h3>{service.title}</h3>
                        </div>
                        <strong>{service.price} TND</strong>
                      </div>

                      <p>{service.description}</p>

                      <div className="client-provider-service-meta">
                        <span>{service.city || provider.city || "Tunisie"}</span>
                        <span>{service.review_count || 0} avis</span>
                      </div>

                      <div className="client-provider-service-gallery">
                        {(service.images || []).slice(0, 4).map((image, index) => (
                          <img
                            key={`${service.id}-${image.image_path || image.url || index}`}
                            src={resolveAssetUrl(image.image_path || image.url || image)}
                            alt={`${service.title} photo ${index + 1}`}
                          />
                        ))}
                      </div>

                      <div className="client-detail-actions">
                        <Link className="client-btn client-btn-primary" to={`/client/service/${service.id}`}>
                          Voir le service
                        </Link>
                        <Link className="client-btn client-btn-soft" to={`/client/chat?provider=${service.provider_id}`}>
                          Contacter
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </section>
    </ClientPageLayout>
  );
};

export default ClientProviderProfilePage;
