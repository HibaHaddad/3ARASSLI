import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Spinner from "../components/Spinner";
import api from "../services/api";
import { getDashboardPathForUser, saveStoredUser } from "../services/auth";
import { showToast } from "../services/toast";
import "./auth.css";

const LoginPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingApprovalPopup, setPendingApprovalPopup] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="********"
                  value={form.password}
                  onChange={onChange}
                />
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
