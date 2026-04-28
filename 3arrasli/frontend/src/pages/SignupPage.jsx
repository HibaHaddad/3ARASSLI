import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Spinner from "../components/Spinner";
import api from "../services/api";
import { getDashboardPathForUser, saveStoredUser } from "../services/auth";
import { IMAGE_TOO_LARGE_MESSAGE, showToast, validateImageFileSize } from "../services/toast";
import { serviceCategories } from "../data/categories";
import "./auth.css";

const SignupPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "Client",
    category: "",
    city: "",
    website: "",
  });
  const [providerFiles, setProviderFiles] = useState({
    profilePhoto: null,
    coverPhoto: null,
  });
  const [providerPreviews, setProviderPreviews] = useState({
    profilePhoto: "",
    coverPhoto: "",
  });
  const [providerRequestPopup, setProviderRequestPopup] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isProviderRole = form.role === "Prestataire";

  useEffect(() => {
    const profilePhotoPreview = providerFiles.profilePhoto
      ? URL.createObjectURL(providerFiles.profilePhoto)
      : "";
    const coverPhotoPreview = providerFiles.coverPhoto
      ? URL.createObjectURL(providerFiles.coverPhoto)
      : "";

    setProviderPreviews({
      profilePhoto: profilePhotoPreview,
      coverPhoto: coverPhotoPreview,
    });

    return () => {
      if (profilePhotoPreview) {
        URL.revokeObjectURL(profilePhotoPreview);
      }
      if (coverPhotoPreview) {
        URL.revokeObjectURL(coverPhotoPreview);
      }
    };
  }, [providerFiles.coverPhoto, providerFiles.profilePhoto]);

  useEffect(() => {
    if (isProviderRole) {
      return;
    }

    setForm((prev) => ({ ...prev, website: "", category: "", city: "" }));
    setProviderFiles({
      profilePhoto: null,
      coverPhoto: null,
    });
  }, [isProviderRole]);

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

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onFileChange = (event) => {
    const { name, files } = event.target;
    const nextFile = files?.[0] || null;

    if (nextFile && !validateImageFileSize(nextFile)) {
      setProviderFiles((prev) => ({
        ...prev,
        [name]: null,
      }));
      event.target.value = "";
      setError(IMAGE_TOO_LARGE_MESSAGE);
      return;
    }

    setProviderFiles((prev) => ({
      ...prev,
      [name]: nextFile,
    }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (
      isProviderRole &&
      (!form.category || !form.city || !form.website || !providerFiles.profilePhoto || !providerFiles.coverPhoto)
    ) {
      setError("Veuillez remplir le service, la ville, le lien et ajouter les deux photos avant de demander l'acces.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Les deux mots de passe doivent etre identiques.");
      return;
    }

    setLoading(true);
    try {
      const payload = new FormData();
      payload.append("name", form.name);
      payload.append("email", form.email);
      payload.append("password", form.password);
      payload.append("role", form.role);

      if (isProviderRole) {
        payload.append("category", form.category);
        payload.append("city", form.city);
        payload.append("website", form.website);
        if (providerFiles.profilePhoto) {
          payload.append("profilePhoto", providerFiles.profilePhoto);
        }
        if (providerFiles.coverPhoto) {
          payload.append("coverPhoto", providerFiles.coverPhoto);
        }
      }

      const response = await api.post("/register", payload, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      const signedUser = response.data.user;
      if (!isProviderRole) {
        setMessage(response.data.message || "Inscription reussie.");
      }

      if (isProviderRole) {
        setForm({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: "Prestataire",
          category: "",
          city: "",
          website: "",
        });
        setProviderFiles({
          profilePhoto: null,
          coverPhoto: null,
        });
        setProviderRequestPopup(true);
        return;
      }

      if (signedUser?.role === "Client") {
        window.setTimeout(() => navigate("/login"), 900);
      } else {
        const token = response.data.token || "";
        saveStoredUser({ user: signedUser, token });
        window.setTimeout(() => navigate(getDashboardPathForUser(signedUser)), 700);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Inscription impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Navbar />
      <main className="auth-main">
        <section className="auth-shell">
          <div className="auth-visual-panel">
            <div className="auth-visual-backdrop auth-visual-signup" />
            <div className="auth-visual-overlay" />
            <div className="auth-visual-content">
              <span className="auth-kicker">Inscription</span>
              <h1>Creez votre compte et commencez votre organisation mariage.</h1>
            </div>
          </div>

          <section className="auth-card auth-card-signup">
            <div className="auth-card-top">
              <span className="auth-eyebrow">Nouveau compte</span>
              <h2>Rejoignez 3arrasli</h2>
            </div>

            <form onSubmit={onSubmit} className="auth-form">
              <div className="auth-field">
                <label htmlFor="name">Nom complet</label>
                <input id="name" name="name" value={form.name} onChange={onChange} />
              </div>
              <div className="auth-field">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" value={form.email} onChange={onChange} />
              </div>
              <div className="auth-field-split">
                <div className="auth-field">
                  <label htmlFor="password">Mot de passe</label>
                  <input id="password" name="password" type="password" value={form.password} onChange={onChange} />
                </div>
                <div className="auth-field">
                  <label htmlFor="confirmPassword">Confirmer mot de passe</label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={onChange}
                  />
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="role">Role</label>
                <select id="role" name="role" value={form.role} onChange={onChange}>
                  <option value="Client">Client</option>
                  <option value="Prestataire">Prestataire</option>
                </select>
              </div>

              {isProviderRole ? (
                <section className="auth-provider-panel">
                  <div className="auth-provider-head">
                    <span className="auth-provider-badge">Acces prestataire</span>
                    <h3>Presentez rapidement votre univers</h3>
                    <p>Ajoutez un lien et quelques visuels pour renforcer votre demande d'acces.</p>
                  </div>

                  <div className="auth-field">
                    <label htmlFor="category">Service du prestataire</label>
                    <select
                      id="category"
                      name="category"
                      value={form.category}
                      onChange={onChange}
                    >
                      <option value="">Selectionner un service</option>
                      {serviceCategories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="auth-field">
                    <label htmlFor="city">Ville</label>
                    <input
                      id="city"
                      name="city"
                      placeholder="Tunis, Sousse, Sfax..."
                      value={form.city}
                      onChange={onChange}
                    />
                  </div>

                  <div className="auth-field">
                    <label htmlFor="website">Site web / Instagram / Facebook</label>
                    <input
                      id="website"
                      name="website"
                      type="url"
                      placeholder="https://instagram.com/moncompte"
                      value={form.website}
                      onChange={onChange}
                    />
                  </div>

                  <div className="auth-provider-upload-grid">
                    <label className="auth-upload-card" htmlFor="profilePhoto">
                      <span className="auth-upload-label">Photo principale du service</span>
                      <span className="auth-upload-copy">
                        {providerFiles.profilePhoto ? providerFiles.profilePhoto.name : "Choisir une image JPG ou PNG"}
                      </span>
                      <input
                        id="profilePhoto"
                        name="profilePhoto"
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={onFileChange}
                      />
                      <div className="auth-upload-preview">
                        {providerPreviews.profilePhoto ? (
                          <img src={providerPreviews.profilePhoto} alt="Apercu photo principale" />
                        ) : (
                          <span className="auth-upload-empty">Apercu principal</span>
                        )}
                      </div>
                    </label>

                    <label className="auth-upload-card" htmlFor="coverPhoto">
                      <span className="auth-upload-label">Photo supplementaire du service</span>
                      <span className="auth-upload-copy">
                        {providerFiles.coverPhoto ? providerFiles.coverPhoto.name : "Ajouter une seconde image inspirante"}
                      </span>
                      <input
                        id="coverPhoto"
                        name="coverPhoto"
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={onFileChange}
                      />
                      <div className="auth-upload-preview">
                        {providerPreviews.coverPhoto ? (
                          <img src={providerPreviews.coverPhoto} alt="Apercu photo supplementaire" />
                        ) : (
                          <span className="auth-upload-empty">Apercu secondaire</span>
                        )}
                      </div>
                    </label>
                  </div>
                </section>
              ) : null}

              <button
                type="submit"
                className={`auth-btn ${isProviderRole ? "auth-btn-request" : ""}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner /> {isProviderRole ? "Envoi de la demande..." : "Inscription..."}
                  </>
                ) : (
                  isProviderRole ? "Demander l'accés" : "Creer mon compte"
                )}
              </button>
            </form>

            <p className="auth-link-text">
              Vous avez deja un compte ? <Link to="/login">Se connecter</Link>
            </p>
          </section>
        </section>
      </main>

      {providerRequestPopup ? (
        <div className="auth-popup-overlay" role="dialog" aria-modal="true" aria-label="Demande envoyée">
          <div className="auth-popup-card">
            <span className="auth-provider-badge">Demande envoyée</span>
            <h3>Votre demande d'accés a bien été envoyée</h3>
            <p>
              Merci. Votre profil prestataire est maintenant en attente d'approbation par
              l'administrateur. Vous recevrez l'accés après validation.
            </p>
            <div className="auth-popup-actions">
              <button type="button" className="auth-btn auth-btn-request" onClick={() => setProviderRequestPopup(false)}>
                Compris
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SignupPage;
