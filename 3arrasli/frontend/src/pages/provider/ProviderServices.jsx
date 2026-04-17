import React from "react";

const ProviderServices = ({
  editingServiceId,
  serviceForm,
  onServiceChange,
  onSubmitService,
  onResetEditing,
  services,
  onEditService,
  onDeleteService,
}) => {
  return (
    <div className="provider-stack">
      <article className="provider-panel">
        <div className="provider-panel-head provider-panel-head-inline">
          <div>
            <h3>{editingServiceId ? "Modifier un service" : "Ajouter un service"}</h3>
            <p>Prix, description, image reelle et categorie pour chaque prestation.</p>
          </div>
          <button type="button" className="provider-primary-btn" onClick={onResetEditing}>
            + Ajouter
          </button>
        </div>

        <form className="provider-form" onSubmit={onSubmitService}>
          <div className="provider-form-grid">
            <label>
              Titre
              <input
                name="title"
                value={serviceForm.title}
                onChange={onServiceChange}
                placeholder="Nom de la prestation"
              />
            </label>
            <label>
              Prix
              <input
                name="price"
                value={serviceForm.price}
                onChange={onServiceChange}
                placeholder="A partir de 1500 TND"
              />
            </label>
            <label>
              Categorie
              <select name="category" value={serviceForm.category} onChange={onServiceChange}>
                <option>Photographe</option>
                <option>Decoration</option>
                <option>Traiteur</option>
                <option>Salle</option>
              </select>
            </label>
            <label>
              Image / photo reelle
              <input
                name="image"
                value={serviceForm.image}
                onChange={onServiceChange}
                placeholder="https://..."
              />
            </label>
            <label className="provider-field-full">
              Description
              <textarea
                name="description"
                value={serviceForm.description}
                onChange={onServiceChange}
                rows="4"
              />
            </label>
          </div>

          <div className="provider-inline-actions">
            <button type="submit" className="provider-primary-btn">
              {editingServiceId ? "Mettre a jour" : "Ajouter"}
            </button>
            {editingServiceId ? (
              <button type="button" className="provider-ghost-btn" onClick={onResetEditing}>
                Annuler
              </button>
            ) : null}
          </div>
        </form>
      </article>

      <section className="provider-services-grid">
        {services.map((service) => (
          <article key={service.id} className="provider-service-card">
            <div className="provider-service-media">
              <img src={service.image} alt={service.title} />
              <div className="provider-service-overlay" />
              <span>{service.category}</span>
            </div>
            <div className="provider-service-body">
              <div className="provider-service-topline">
                <h3>{service.title}</h3>
                <strong>{service.price}</strong>
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
                >
                  Modifier
                </button>
                <button
                  type="button"
                  className="provider-secondary-btn"
                  onClick={() => onDeleteService(service.id)}
                >
                  Supprimer
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
};

export default ProviderServices;
