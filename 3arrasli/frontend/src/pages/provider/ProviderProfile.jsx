import React from "react";

const ProviderProfile = ({ profileForm, onProfileChange, onSaveProfile, profileMessage }) => {
  return (
    <article className="provider-panel">
      <div className="provider-panel-head">
        <h3>Mon profil</h3>
        <p>Affinez votre image de marque avec une presentation elegante et rassurante.</p>
      </div>

      <div className="provider-profile-cover">
        <img src={profileForm.coverPhoto} alt="Couverture prestataire" />
        <div className="provider-profile-overlay" />
        <div className="provider-profile-badge">
          <img src={profileForm.profilePhoto} alt="Profil prestataire" />
          <div>
            <strong>{profileForm.name}</strong>
            <span>{profileForm.category}</span>
          </div>
        </div>
      </div>

      <form className="provider-form" onSubmit={onSaveProfile}>
        <div className="provider-form-grid">
          <label>
            Nom
            <input name="name" value={profileForm.name} onChange={onProfileChange} />
          </label>
          <label>
            Email
            <input name="email" type="email" value={profileForm.email} onChange={onProfileChange} />
          </label>
          <label>
            Telephone
            <input name="phone" value={profileForm.phone} onChange={onProfileChange} />
          </label>
          <label>
            Ville
            <input name="city" value={profileForm.city} onChange={onProfileChange} />
          </label>
          <label>
            Categorie
            <input name="category" value={profileForm.category} onChange={onProfileChange} />
          </label>
          <label>
            Instagram
            <input name="instagram" value={profileForm.instagram} onChange={onProfileChange} />
          </label>
          <label>
            Site web
            <input name="website" value={profileForm.website} onChange={onProfileChange} />
          </label>
          <label>
            Photo de profil
            <input name="profilePhoto" value={profileForm.profilePhoto} onChange={onProfileChange} />
          </label>
          <label className="provider-field-full">
            Photo de couverture
            <input name="coverPhoto" value={profileForm.coverPhoto} onChange={onProfileChange} />
          </label>
          <label className="provider-field-full">
            Description
            <textarea
              name="description"
              value={profileForm.description}
              onChange={onProfileChange}
              rows="5"
            />
          </label>
        </div>

        <div className="provider-upload-grid">
          <div className="provider-upload-zone">
            <span>Photo de profil</span>
            <strong>Deposez une image ou collez une URL</strong>
            <small>Ideal pour votre avatar et votre image de confiance.</small>
          </div>
          <div className="provider-upload-zone">
            <span>Photo de couverture</span>
            <strong>Ajoutez une scene premium de votre univers</strong>
            <small>Utilisez un visuel lumineux, romantique et tres qualitatif.</small>
          </div>
        </div>

        <div className="provider-inline-actions">
          <button type="submit" className="provider-primary-btn">
            Enregistrer
          </button>
          {profileMessage ? <span className="provider-form-note">{profileMessage}</span> : null}
        </div>
      </form>
    </article>
  );
};

export default ProviderProfile;
