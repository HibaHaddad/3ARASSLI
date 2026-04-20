import React, { useState } from "react";

const UploadZone = ({
  fieldName,
  title,
  subtitle,
  note,
  preview,
  inputKey,
  disabled,
  error,
  onFileSelect,
}) => {
  const handleDrop = (event) => {
    event.preventDefault();
    if (disabled) {
      return;
    }
    const file = event.dataTransfer.files?.[0] || null;
    onFileSelect(fieldName, file);
  };

  const handleChange = (event) => {
    const file = event.target.files?.[0] || null;
    onFileSelect(fieldName, file);
  };

  return (
    <div
      className={`provider-upload-zone ${preview ? "has-preview" : ""}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <span>{title}</span>
      <strong>{subtitle}</strong>
      <small>{note}</small>

      {preview ? (
        <div className="provider-profile-upload-preview">
          <img src={preview} alt={title} />
        </div>
      ) : (
        <div className="provider-profile-upload-empty">Aucune image pour le moment</div>
      )}

      <label className="provider-upload-trigger">
        {preview ? "Changer la photo" : "Choisir une image"}
        <input
          key={inputKey}
          type="file"
          name={fieldName}
          accept="image/*"
          disabled={disabled}
          onChange={handleChange}
        />
      </label>

      {error ? <span className="provider-field-error">{error}</span> : null}
    </div>
  );
};

const ProviderProfile = ({
  profileForm,
  profileErrors,
  profileMessage,
  profileLoading,
  profileSubmitting,
  profilePhotoPreview,
  coverPhotoPreview,
  profileImageInputKey,
  coverImageInputKey,
  onProfileChange,
  onProfileImageChange,
  onSaveProfile,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const hasSocial = profileForm.instagram || profileForm.website || profileForm.phone || profileForm.email;

  return (
    <article className="provider-panel provider-profile-premium-panel">
      <div className="provider-panel-head provider-panel-head-inline">
        <div>
          <h3>Mon profil</h3>
          <p>Affinez votre image de marque avec une presentation elegante et rassurante.</p>
        </div>
        <button
          type="button"
          className={isEditing ? "provider-ghost-btn" : "provider-primary-btn"}
          onClick={() => setIsEditing((current) => !current)}
        >
          {isEditing ? "Voir la fiche" : "Modifier le profil"}
        </button>
      </div>

      {profileMessage?.text ? (
        <div
          className={`provider-alert ${
            profileMessage.type === "success" ? "provider-alert-success" : "provider-alert-error"
          }`}
        >
          {profileMessage.text}
        </div>
      ) : null}

      {!isEditing ? (
        <section className="provider-profile-showcase">
          <div className="provider-profile-showcase-cover">
            {coverPhotoPreview ? (
              <img src={coverPhotoPreview} alt="Couverture prestataire" />
            ) : (
              <div className="provider-profile-cover-empty">
                <strong>Ajoutez votre photo de couverture</strong>
                <span>Un visuel immersif aide les couples a se projeter dans votre univers.</span>
              </div>
            )}
            <div className="provider-profile-overlay" />
          </div>

          <div className="provider-profile-showcase-body">
            <div className="provider-profile-showcase-avatar">
              {profilePhotoPreview ? (
                <img src={profilePhotoPreview} alt="Profil prestataire" />
              ) : (
                <div className="provider-profile-avatar-empty">
                  {(profileForm.name || "P").trim().charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="provider-profile-showcase-copy">
              <span className="provider-section-label">Fiche prestataire</span>
              <h3>{profileForm.name || "Votre nom prestataire"}</h3>
              <div className="provider-profile-showcase-tags">
                <span>{profileForm.category || "Categorie a definir"}</span>
                <span>{profileForm.city || "Ville a renseigner"}</span>
              </div>
              <p>
                {profileForm.description ||
                  "Ajoutez une description elegante pour raconter votre univers, vos prestations et votre signature mariage."}
              </p>

              {hasSocial ? (
                <div className="provider-profile-contact-grid">
                  {profileForm.phone ? <span>Tel: {profileForm.phone}</span> : null}
                  {profileForm.email ? <span>Email: {profileForm.email}</span> : null}
                  {profileForm.instagram ? <span>Instagram: {profileForm.instagram}</span> : null}
                  {profileForm.website ? <span>Site: {profileForm.website}</span> : null}
                </div>
              ) : null}

              <button type="button" className="provider-primary-btn" onClick={() => setIsEditing(true)}>
                Modifier le profil
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="provider-profile-edit-shell">
          <div className="provider-profile-cover">
            {coverPhotoPreview ? (
              <img src={coverPhotoPreview} alt="Couverture prestataire" />
            ) : (
              <div className="provider-profile-cover-empty">
                <strong>Ajoutez votre photo de couverture</strong>
                <span>Un visuel immersif aide les couples a se projeter dans votre univers.</span>
              </div>
            )}
            <div className="provider-profile-overlay" />
            <div className="provider-profile-badge">
              {profilePhotoPreview ? (
                <img src={profilePhotoPreview} alt="Profil prestataire" />
              ) : (
                <div className="provider-profile-avatar-empty">
                  {(profileForm.name || "P").trim().charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <strong>{profileForm.name || "Votre nom prestataire"}</strong>
                <span>{profileForm.category || "Categorie a definir"}</span>
              </div>
            </div>
          </div>

      <form className="provider-form provider-profile-edit-form" onSubmit={onSaveProfile}>
        <div className="provider-form-grid">
          <label>
            Nom
            <input name="name" value={profileForm.name} onChange={onProfileChange} />
            {profileErrors?.name ? <span className="provider-field-error">{profileErrors.name}</span> : null}
          </label>
          <label>
            Email
            <input name="email" type="email" value={profileForm.email} onChange={onProfileChange} />
            {profileErrors?.email ? <span className="provider-field-error">{profileErrors.email}</span> : null}
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
          <UploadZone
            fieldName="profilePhoto"
            title="Photo de profil"
            subtitle="Deposez une image premium ou cliquez pour choisir"
            note="Ideal pour votre avatar, votre image de confiance et votre signature visuelle."
            preview={profilePhotoPreview}
            inputKey={profileImageInputKey}
            disabled={profileSubmitting}
            error={profileErrors?.profilePhoto}
            onFileSelect={onProfileImageChange}
          />
          <UploadZone
            fieldName="coverPhoto"
            title="Photo de couverture"
            subtitle="Ajoutez une scene premium de votre univers"
            note="Utilisez un visuel lumineux, romantique et qualitatif. JPG, JPEG ou PNG, 2 MB max."
            preview={coverPhotoPreview}
            inputKey={coverImageInputKey}
            disabled={profileSubmitting}
            error={profileErrors?.coverPhoto}
            onFileSelect={onProfileImageChange}
          />
        </div>

        <div className="provider-inline-actions">
          <button type="submit" className="provider-primary-btn" disabled={profileSubmitting || profileLoading}>
            {profileSubmitting ? "Enregistrement..." : profileLoading ? "Chargement..." : "Enregistrer"}
          </button>
          <button type="button" className="provider-ghost-btn" onClick={() => setIsEditing(false)}>
            Annuler
          </button>
          {profileLoading ? <span className="provider-form-note">Chargement de votre profil...</span> : null}
        </div>
      </form>
        </section>
      )}
    </article>
  );
};

export default ProviderProfile;
