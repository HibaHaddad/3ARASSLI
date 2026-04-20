import React, { useEffect, useState } from "react";
import { resolveAssetUrl } from "../../services/assets";

const ProviderServices = ({
  editingServiceId,
  serviceForm,
  serviceFormErrors,
  serviceFeedback,
  servicesLoading,
  serviceSubmitting,
  imagePreviewUrl,
  imageInputKey,
  onServiceChange,
  onServiceImageChange,
  onSubmitService,
  onResetEditing,
  services,
  onEditService,
  onDeleteService,
}) => {
  const [showServiceForm, setShowServiceForm] = useState(false);

  useEffect(() => {
    if (editingServiceId) {
      setShowServiceForm(true);
    }
  }, [editingServiceId]);

  useEffect(() => {
    if (serviceFeedback?.type === "success" && !editingServiceId) {
      setShowServiceForm(false);
    }
  }, [editingServiceId, serviceFeedback?.type, serviceFeedback?.text]);

  const renderFieldError = (fieldName) =>
    serviceFormErrors?.[fieldName] ? (
      <span className="provider-field-error">{serviceFormErrors[fieldName]}</span>
    ) : null;

  return (
    <div className="provider-stack provider-services-premium">
      <article className="provider-panel provider-services-command">
        <div className="provider-panel-head provider-panel-head-inline">
          <div>
            <span className="provider-section-label">Catalogue</span>
            <h3>Vos prestations signature</h3>
            <p>Commencez par parcourir vos services, puis ajoutez ou modifiez une offre au bon moment.</p>
          </div>
          <button
            type="button"
            className="provider-primary-btn provider-add-service-btn"
            onClick={() => {
              onResetEditing();
              setShowServiceForm(true);
            }}
          >
            Ajouter un service
          </button>
        </div>
      </article>

      {showServiceForm ? (
        <article className="provider-panel provider-service-form-panel">
          <div className="provider-panel-head provider-panel-head-inline">
            <div>
              <h3>{editingServiceId ? "Modifier un service" : "Nouvelle prestation"}</h3>
              <p>Prix, description, image reelle et categorie pour chaque prestation.</p>
            </div>
            <button
              type="button"
              className="provider-ghost-btn"
              onClick={() => {
                onResetEditing();
                setShowServiceForm(false);
              }}
            >
              Fermer
            </button>
          </div>

        <form className="provider-form provider-service-edit-form" onSubmit={onSubmitService}>
          {serviceFeedback?.text ? (
            <div
              className={`provider-alert ${
                serviceFeedback.type === "success" ? "provider-alert-success" : "provider-alert-error"
              }`}
            >
              {serviceFeedback.text}
            </div>
          ) : null}

          <div className="provider-form-grid">
            <label>
              Titre
              <input
                name="title"
                value={serviceForm.title}
                onChange={onServiceChange}
                placeholder="Nom de la prestation"
              />
              {renderFieldError("title")}
            </label>
            <label>
              Prix
              <input
                type="number"
                min="0"
                step="0.01"
                name="price"
                value={serviceForm.price}
                onChange={onServiceChange}
                placeholder="1500"
              />
              {renderFieldError("price")}
            </label>
            <label>
              Categorie
              <select name="category" value={serviceForm.category} onChange={onServiceChange}>
                <option value="">Selectionner</option>
                <option>Photographe</option>
                <option>Decoration</option>
                <option>Traiteur</option>
                <option>Salle</option>
              </select>
              {renderFieldError("category")}
            </label>
            <div>
              <span>Image / photo reelle</span>
              <label className="provider-upload-trigger">
                {imagePreviewUrl ? "Changer l'image" : "Choisir une image"}
                <input
                  key={imageInputKey}
                  type="file"
                  name="image"
                  accept="image/*"
                  onChange={onServiceImageChange}
                />
              </label>
              {renderFieldError("image")}
              <span className="provider-form-note">
                JPG, JPEG ou PNG, 2 MB maximum.
              </span>
            </div>
            <label>
              Statut
              <select name="status" value={serviceForm.status} onChange={onServiceChange}>
                <option>Actif</option>
                <option>Inactif</option>
              </select>
            </label>
            <label className="provider-field-full">
              Description
              <textarea
                name="description"
                value={serviceForm.description}
                onChange={onServiceChange}
                rows="4"
              />
              {renderFieldError("description")}
            </label>
            {imagePreviewUrl ? (
              <div className="provider-field-full provider-image-preview-card">
                <div className="provider-image-preview-head">
                  <strong>Apercu de l'image</strong>
                  <span>Image chargee avec succes.</span>
                </div>
                <img src={imagePreviewUrl} alt="Apercu du service" className="provider-image-preview" />
                <span className="provider-form-note">
                  {editingServiceId ? "Choisissez un autre fichier pour changer l'image." : "L'image sera envoyee avec le service."}
                </span>
              </div>
            ) : null}
          </div>

          <div className="provider-inline-actions">
            <button type="submit" className="provider-primary-btn" disabled={serviceSubmitting}>
              {serviceSubmitting
                ? "Enregistrement..."
                : editingServiceId
                  ? "Mettre a jour"
                  : "Ajouter"}
            </button>
            {editingServiceId ? (
              <button
                type="button"
                className="provider-ghost-btn"
                onClick={() => {
                  onResetEditing();
                  setShowServiceForm(false);
                }}
              >
                Annuler
              </button>
            ) : null}
          </div>
        </form>
        </article>
      ) : null}

      <section className="provider-services-grid">
        {servicesLoading ? (
          <article className="provider-panel provider-empty-state">
            <h3>Chargement des services...</h3>
            <p>Nous recuperons vos prestations depuis l'API.</p>
          </article>
        ) : services.length === 0 ? (
          <article className="provider-panel provider-empty-state">
            <h3>Aucun service pour le moment</h3>
            <p>Ajoutez votre premiere prestation pour la partager sur la plateforme.</p>
          </article>
        ) : (
          services.map((service) => (
            <article key={service.id} className="provider-service-card">
              <div className="provider-service-media">
                <img src={resolveAssetUrl(service.image)} alt={service.title} />
                <div className="provider-service-overlay" />
                <span>{service.category}</span>
              </div>
              <div className="provider-service-body">
                <div className="provider-service-topline">
                  <h3>{service.title}</h3>
                  <strong>{Number(service.price).toFixed(2)} TND</strong>
                </div>
                <p>{service.description}</p>
                <div className="provider-service-footer">
                  <em>{service.status}</em>
                </div>
                <div className="provider-inline-actions">
                  <button
                    type="button"
                    className="provider-primary-btn"
                    onClick={() => onEditService(service)}
                    disabled={serviceSubmitting}
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="provider-secondary-btn"
                    onClick={() => onDeleteService(service.id)}
                    disabled={serviceSubmitting}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
};

export default ProviderServices;
