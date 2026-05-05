import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Spinner from "../components/Spinner";
import api from "../services/api";
import { getDashboardPathForUser, saveStoredUser } from "../services/auth";
import { IMAGE_TOO_LARGE_MESSAGE, showToast, validateImageFileSize } from "../services/toast";
import { mergeServiceCategoryOptions, normalizeServiceCategoryKey, serviceCategories } from "../data/categories";
import "./auth.css";

const PasswordToggleButton = ({ visible, onClick, controlsId }) => (
  <button
    type="button"
    className="auth-password-toggle"
    onClick={onClick}
    aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
    aria-pressed={visible}
    aria-controls={controlsId}
  >
    {visible ? (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 3l18 18" />
        <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
        <path d="M9.9 5.1A10.9 10.9 0 0 1 12 5c5.2 0 9.4 4.1 10 7-.2 1-1 2.5-2.4 3.9" />
        <path d="M14.1 18.9A10.9 10.9 0 0 1 12 19C6.8 19 2.6 14.9 2 12c.2-1 1-2.5 2.4-3.9" />
      </svg>
    ) : (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )}
  </button>
);

const SignupPage = () => {
  const navigate = useNavigate();
  const [providerCategoryOptions, setProviderCategoryOptions] = useState(() => mergeServiceCategoryOptions(serviceCategories));
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
  const [customProviderCategory, setCustomProviderCategory] = useState("");
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isProviderRole = form.role === "Prestataire";

  useEffect(() => {
    let isMounted = true;

    const loadServiceCategories = async () => {
      try {
        const response = await api.get("/api/service-categories");
        if (!isMounted) {
          return;
        }
        setProviderCategoryOptions(
          mergeServiceCategoryOptions([
            ...serviceCategories,
            ...(response.data?.categories || []),
          ])
        );
      } catch (_error) {
        if (!isMounted) {
          return;
        }
        setProviderCategoryOptions(mergeServiceCategoryOptions(serviceCategories));
      }
    };

    loadServiceCategories();

    return () => {
      isMounted = false;
    };
  }, []);

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
    setCustomProviderCategory("");
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
    if (name === "category") {
      setForm((prev) => ({ ...prev, [name]: value }));
      if (value !== "__other__") {
        setCustomProviderCategory("");
      }
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onCustomCategoryChange = (event) => {
    setCustomProviderCategory(event.target.value);
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
    const normalizedCustomCategory = String(customProviderCategory || "").trim();
    let providerCategoryValue = form.category;

    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (isProviderRole && form.category === "__other__") {
      const existingCategory = providerCategoryOptions.find(
        (category) => normalizeServiceCategoryKey(category.value) === normalizeServiceCategoryKey(normalizedCustomCategory)
      );

      if (existingCategory) {
        providerCategoryValue = existingCategory.value;
        setForm((prev) => ({ ...prev, category: existingCategory.value }));
        setCustomProviderCategory("");
      } else {
        providerCategoryValue = normalizedCustomCategory;
        if (providerCategoryValue) {
          setProviderCategoryOptions((prev) =>
            mergeServiceCategoryOptions([...prev, { value: providerCategoryValue, label: providerCategoryValue }])
          );
          setForm((prev) => ({ ...prev, category: providerCategoryValue }));
          setCustomProviderCategory("");
        }
      }
    }

    if (
      isProviderRole &&
      (!providerCategoryValue || !form.city || !form.website || !providerFiles.profilePhoto || !providerFiles.coverPhoto)
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
        payload.append("category", providerCategoryValue);
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
        setCustomProviderCategory("");
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
                  <div className="auth-password-field">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={onChange}
                    />
                    <PasswordToggleButton
                      visible={showPassword}
                      onClick={() => setShowPassword((prev) => !prev)}
                      controlsId="password"
                    />
                  </div>
                </div>
                <div className="auth-field">
                  <label htmlFor="confirmPassword">Confirmer mot de passe</label>
                  <div className="auth-password-field">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={onChange}
                    />
                    <PasswordToggleButton
                      visible={showConfirmPassword}
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      controlsId="confirmPassword"
                    />
                  </div>
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
                      {providerCategoryOptions.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                      <option value="__other__">Autre</option>
                    </select>
                  </div>

                  {form.category === "__other__" ? (
                    <div className="auth-field">
                      <label htmlFor="customCategory">Ajouter votre type de service</label>
                      <input
                        id="customCategory"
                        name="customCategory"
                        placeholder="Ex: Calligraphe, DJ oriental..."
                        value={customProviderCategory}
                        onChange={onCustomCategoryChange}
                      />
                    </div>
                  ) : null}

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
