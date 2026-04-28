import React, { useEffect, useState } from "react";
import ClientPageLayout from "./client/ClientPageLayout";
import api from "../services/api";
import { resolveAssetUrl } from "../services/assets";
import { getStoredSession, saveStoredUser } from "../services/auth";
import { IMAGE_TOO_LARGE_MESSAGE, showToast, validateImageFileSize } from "../services/toast";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  city: "",
  instagram: "",
  description: "",
  profilePhoto: "",
};

const ClientProfilePage = () => {
  const profileFileInputId = "client-profile-photo-input";
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/client/profile");
      const user = response.data.user || {};
      setForm({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        city: user.city || "",
        instagram: user.instagram || "",
        description: user.description || "",
        profilePhoto: user.profilePhoto || "",
      });
      setProfilePreview(resolveAssetUrl(user.profilePhoto));
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de charger votre profil.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

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

  useEffect(() => {
    if (!profileFile) {
      return undefined;
    }

    const objectUrl = URL.createObjectURL(profileFile);
    setProfilePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [profileFile]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null;

    if (nextFile && !validateImageFileSize(nextFile)) {
      event.target.value = "";
      setProfileFile(null);
      setError(IMAGE_TOO_LARGE_MESSAGE);
      return;
    }

    setProfileFile(nextFile);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = new FormData();
      payload.append("name", form.name);
      payload.append("email", form.email);
      payload.append("phone", form.phone);
      payload.append("city", form.city);
      payload.append("instagram", form.instagram);
      payload.append("description", form.description);
      if (profileFile) {
        payload.append("profilePhoto", profileFile);
      }

      const response = await api.put("/api/client/profile", payload, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const updatedUser = response.data.user;
      const session = getStoredSession();
      saveStoredUser({
        user: updatedUser,
        token: session?.token || "",
      });

      setForm({
        name: updatedUser.name || "",
        email: updatedUser.email || "",
        phone: updatedUser.phone || "",
        city: updatedUser.city || "",
        instagram: updatedUser.instagram || "",
        description: updatedUser.description || "",
        profilePhoto: updatedUser.profilePhoto || "",
      });
      setProfileFile(null);
      setProfilePreview(resolveAssetUrl(updatedUser.profilePhoto));
      setMessage(response.data.message || "Profil mis a jour.");
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de mettre a jour le profil.");
    } finally {
      setSaving(false);
    }
  };

  const firstName = form.name?.split(" ")?.[0] || "Votre";

  return (
    <ClientPageLayout
      kicker="Profil client"
      title={`${firstName} espace personnel`}
      description="Mettez a jour vos coordonnees, votre photo et votre univers pour garder un compte client plus complet et plus elegant."
    >
      <section className="client-section client-profile-section">
        <div className="client-shell">
          {loading ? <p className="client-loading">Chargement du profil...</p> : null}

          {!loading ? (
            <div className="client-profile-layout">
              <aside className="client-profile-showcase">
                <div className="client-profile-avatar-frame">
                  {profilePreview ? (
                    <img src={profilePreview} alt={form.name || "Photo profil client"} />
                  ) : (
                    <div className="client-profile-avatar-empty">
                      {(form.name || "C").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="client-section-label">Compte client</span>
                <h2>{form.name || "Client 3arrasli"}</h2>
                <p>{form.description || "Ajoutez une petite presentation pour personnaliser votre profil client."}</p>

                <div className="client-profile-pills">
                  <span>{form.city || "Ville a renseigner"}</span>
                  <span>{form.phone || "Telephone a renseigner"}</span>
                  <span>{form.instagram || "Instagram a renseigner"}</span>
                </div>
              </aside>

              <form className="client-panel client-profile-form" onSubmit={onSubmit}>
                <div className="client-section-head client-profile-head">
                  <div>
                    <span className="section-kicker">Edition</span>
                    <h2>Modifier mon profil</h2>
                  </div>
                  
                </div>

                <div className="client-profile-grid">
                  <label className="client-field">
                    <span>Nom complet</span>
                    <input className="client-input" name="name" value={form.name} onChange={onChange} />
                  </label>

                  <label className="client-field">
                    <span>Email</span>
                    <input className="client-input" type="email" name="email" value={form.email} onChange={onChange} />
                  </label>

                  <label className="client-field">
                    <span>Telephone</span>
                    <input className="client-input" name="phone" value={form.phone} onChange={onChange} />
                  </label>

                  <label className="client-field">
                    <span>Ville</span>
                    <input className="client-input" name="city" value={form.city} onChange={onChange} />
                  </label>

                  <label className="client-field">
                    <span>Instagram</span>
                    <input className="client-input" name="instagram" value={form.instagram} onChange={onChange} />
                  </label>
                </div>

                <label className="client-field">
                  <span>Photo de profil</span>
                  <div className="client-file-upload">
                    <input
                      id={profileFileInputId}
                      className="client-file-input"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={onFileChange}
                    />
                    <label htmlFor={profileFileInputId} className="client-file-trigger">
                      Choisir une image
                    </label>
                    <span className="client-file-name">{profileFile?.name || "Aucun fichier selectionne"}</span>
                  </div>
                </label>

                <label className="client-field">
                  <span>Description</span>
                  <textarea className="client-textarea" name="description" value={form.description} onChange={onChange} />
                </label>

                <div className="client-profile-actions">
                  <button type="submit" className="client-btn client-btn-primary" disabled={saving}>
                    {saving ? "Enregistrement..." : "Sauvegarder"}
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </section>
    </ClientPageLayout>
  );
};

export default ClientProfilePage;
