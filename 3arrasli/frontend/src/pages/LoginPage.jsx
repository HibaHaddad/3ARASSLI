import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Spinner from "../components/Spinner";
import api from "../services/api";
import { getDashboardPathForUser, saveStoredUser } from "../services/auth";
import { showToast } from "../services/toast";
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

const LoginPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetForm, setResetForm] = useState({ email: "", code: "", newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingApprovalPopup, setPendingApprovalPopup] = useState("");
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetStep, setResetStep] = useState("request");
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openForgotPassword = () => {
    setError("");
    setMessage("");
    setPendingApprovalPopup("");
    setForgotEmail(form.email || "");
    setResetForm({
      email: form.email || "",
      code: "",
      newPassword: "",
      confirmPassword: "",
    });
    setResetStep("request");
    setForgotPasswordOpen(true);
  };

  const closeForgotPassword = () => {
    setForgotPasswordOpen(false);
    setForgotLoading(false);
    setResetLoading(false);
    setResetStep("request");
  };

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

  const onSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setPendingApprovalPopup("");

    if (!form.email || !form.password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/login", form);
      const loggedUser = response.data.user;
      const token = response.data.token || "";
      saveStoredUser({ user: loggedUser, token });
      setMessage(`${response.data.message} Bienvenue ${loggedUser.name}.`);

      window.setTimeout(() => {
        navigate(getDashboardPathForUser(loggedUser));
      }, 700);
    } catch (err) {
      const apiMessage = err.response?.data?.message || "Echec de la connexion.";
      if (err.response?.status === 403) {
        setPendingApprovalPopup(apiMessage);
      } else {
        setError(apiMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRequestResetCode = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!forgotEmail.trim()) {
      setError("Veuillez saisir votre email.");
      return;
    }

    setForgotLoading(true);
    try {
      const response = await api.post("/forgot-password", { email: forgotEmail.trim() });
      setMessage(response.data.message);
      setResetForm((prev) => ({ ...prev, email: forgotEmail.trim() }));
      setResetStep("reset");
    } catch (err) {
      setError(err.response?.data?.message || "Impossible d'envoyer le code de reinitialisation.");
    } finally {
      setForgotLoading(false);
    }
  };

  const onResetPassword = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!resetForm.email.trim() || !resetForm.code.trim() || !resetForm.newPassword || !resetForm.confirmPassword) {
      setError("Veuillez remplir tous les champs de reinitialisation.");
      return;
    }

    if (resetForm.newPassword.length < 6) {
      setError("Le nouveau mot de passe doit contenir au moins 6 caracteres.");
      return;
    }

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setError("La confirmation du mot de passe ne correspond pas.");
      return;
    }

    setResetLoading(true);
    try {
      const response = await api.post("/reset-password", {
        email: resetForm.email.trim(),
        code: resetForm.code.trim(),
        newPassword: resetForm.newPassword,
      });
      setMessage(response.data.message);
      setForm((prev) => ({ ...prev, email: resetForm.email.trim(), password: "" }));
      closeForgotPassword();
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de reinitialiser le mot de passe.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {pendingApprovalPopup ? (
        <div className="auth-popup-overlay" role="dialog" aria-modal="true" aria-label="Compte en attente">
          <div className="auth-popup-card auth-pending-popup-card">
            <h3>Compte en attente d'approbation</h3>
            <p>{pendingApprovalPopup}</p>
            <p>
              Votre espace prestataire sera accessible apres validation de votre compte par l'administrateur.
              Merci de reessayer plus tard.
            </p>
            <div className="auth-popup-actions">
              <button
                type="button"
                className="auth-btn auth-btn-request"
                onClick={() => setPendingApprovalPopup("")}
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {forgotPasswordOpen ? (
        <div className="auth-popup-overlay" role="dialog" aria-modal="true" aria-label="Mot de passe oublie">
          <div className="auth-popup-card auth-forgot-popup-card">
            <h3>Mot de passe oublie</h3>
            <p>
              Recevez un code par email puis choisissez un nouveau mot de passe pour retrouver votre acces.
            </p>

            {resetStep === "request" ? (
              <form className="auth-form auth-popup-form" onSubmit={onRequestResetCode}>
                <div className="auth-field">
                  <label htmlFor="forgot-email">Email</label>
                  <input
                    id="forgot-email"
                    name="forgotEmail"
                    type="email"
                    placeholder="votre@email.com"
                    value={forgotEmail}
                    onChange={(event) => setForgotEmail(event.target.value)}
                  />
                </div>

                <div className="auth-popup-actions auth-popup-actions-split">
                  <button type="button" className="auth-btn auth-btn-ghost" onClick={closeForgotPassword}>
                    Annuler
                  </button>
                  <button type="submit" className="auth-btn auth-btn-request" disabled={forgotLoading}>
                    {forgotLoading ? (
                      <>
                        <Spinner /> Envoi...
                      </>
                    ) : (
                      "Envoyer le code"
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form className="auth-form auth-popup-form" onSubmit={onResetPassword}>
                <div className="auth-field">
                  <label htmlFor="reset-email">Email</label>
                  <input
                    id="reset-email"
                    name="email"
                    type="email"
                    value={resetForm.email}
                    onChange={(event) => setResetForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="reset-code">Code de reinitialisation</label>
                  <input
                    id="reset-code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={resetForm.code}
                    onChange={(event) => setResetForm((prev) => ({ ...prev, code: event.target.value }))}
                  />
                </div>

                <div className="auth-field-split">
                  <div className="auth-field">
                    <label htmlFor="new-password">Nouveau mot de passe</label>
                    <div className="auth-password-field">
                      <input
                        id="new-password"
                        name="newPassword"
                        type={showResetNewPassword ? "text" : "password"}
                        placeholder="Minimum 6 caracteres"
                        value={resetForm.newPassword}
                        onChange={(event) => setResetForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                      />
                      <PasswordToggleButton
                        visible={showResetNewPassword}
                        onClick={() => setShowResetNewPassword((prev) => !prev)}
                        controlsId="new-password"
                      />
                    </div>
                  </div>

                  <div className="auth-field">
                    <label htmlFor="confirm-new-password">Confirmer le mot de passe</label>
                    <div className="auth-password-field">
                      <input
                        id="confirm-new-password"
                        name="confirmPassword"
                        type={showResetConfirmPassword ? "text" : "password"}
                        placeholder="Retapez le mot de passe"
                        value={resetForm.confirmPassword}
                        onChange={(event) => setResetForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                      />
                      <PasswordToggleButton
                        visible={showResetConfirmPassword}
                        onClick={() => setShowResetConfirmPassword((prev) => !prev)}
                        controlsId="confirm-new-password"
                      />
                    </div>
                  </div>
                </div>

                <div className="auth-popup-actions auth-popup-actions-split">
                  <button
                    type="button"
                    className="auth-btn auth-btn-ghost"
                    onClick={() => setResetStep("request")}
                  >
                    Retour
                  </button>
                  <button type="submit" className="auth-btn auth-btn-request" disabled={resetLoading}>
                    {resetLoading ? (
                      <>
                        <Spinner /> Reinitialisation...
                      </>
                    ) : (
                      "Mettre a jour le mot de passe"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      <Navbar />

      <main className="auth-main">
        <section className="auth-shell">
          <div className="auth-visual-panel">
            <div className="auth-visual-backdrop auth-visual-login" />
            <div className="auth-visual-overlay" />
            <div className="auth-visual-glow auth-visual-glow-one" />
            <div className="auth-visual-glow auth-visual-glow-two" />

            <div className="auth-visual-content">
              <span className="auth-kicker">Espace prive mariage</span>
              <h1>Retrouvez votre espace 3arrasli avec une experience plus douce et plus elegante.</h1>
              <p>
                Accedez a vos inspirations, vos selections et vos demarches depuis une interface
                premium pensee pour les couples et les prestataires du mariage.
              </p>

              <div className="auth-visual-points">
                <span>Connexion rapide et securisee</span>
                <span>Univers romantique et premium</span>
                <span>Navigation fluide vers votre espace</span>
              </div>
            </div>
          </div>

          <section className="auth-card auth-card-login">
            <div className="auth-card-top">
              <span className="auth-eyebrow">Connexion</span>
              <h2>Heureux de vous revoir</h2>
              <p className="auth-subtitle">
                Accedez a votre espace 3arrasli.tn avec une experience plus chic et rassurante.
              </p>
            </div>

            <form onSubmit={onSubmit} className="auth-form">
              <div className="auth-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={form.email}
                  onChange={onChange}
                />
              </div>

              <div className="auth-field">
                <label htmlFor="password">Mot de passe</label>
                <div className="auth-password-field">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
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

              <div className="auth-inline-action">
                <button type="button" className="auth-text-button" onClick={openForgotPassword}>
                  Mot de passe oublie ?
                </button>
              </div>

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner /> Connexion...
                  </>
                ) : (
                  "Se connecter"
                )}
              </button>
            </form>
            <p className="auth-link-text">
              Vous n'avez pas de compte ? <Link to="/signup">Creer un compte</Link>
            </p>
          </section>
        </section>
      </main>
    </div>
  );
};

export default LoginPage;
