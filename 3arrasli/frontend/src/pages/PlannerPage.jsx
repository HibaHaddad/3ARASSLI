import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";
import "./client.css";

const defaultItems = [
  "Robe de mariee",
  "Salle de fete",
  "Traiteur",
  "Decoration",
];

const PlannerPage = () => {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadItems = async () => {
    try {
      const response = await api.get("/api/planner");
      const nextItems = response.data.items || [];
      if (nextItems.length === 0) {
        for (const defaultTitle of defaultItems) {
          // Seed defaults only once for a new client workspace.
          // eslint-disable-next-line no-await-in-loop
          await api.post("/api/planner", { title: defaultTitle });
        }
        const seeded = await api.get("/api/planner");
        setItems(seeded.data.items || []);
      } else {
        setItems(nextItems);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de charger le planner.");
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const addItem = async () => {
    if (!title.trim()) {
      return;
    }
    try {
      await api.post("/api/planner", { title: title.trim() });
      setTitle("");
      setMessage("Tache ajoutee avec succes.");
      loadItems();
    } catch (err) {
      setError(err.response?.data?.message || "Ajout impossible.");
    }
  };

  const toggleItem = async (item) => {
    try {
      await api.put(`/api/planner/${item.id}`, { completed: !item.completed });
      setMessage(item.completed ? "Tache marquee a faire." : "Tache terminee.");
      loadItems();
    } catch (err) {
      setError(err.response?.data?.message || "Mise a jour impossible.");
    }
  };

  return (
    <div className="client-page">
      <Navbar />
      <main className="client-main">
        <section className="client-shell">
          <aside className="client-sidebar">
            <div className="client-sidebar-brand">
              <p className="client-eyebrow">Client</p>
              <h1>Planner</h1>
              <span>Construisez votre checklist mariage dans un espace epure.</span>
            </div>

            <nav className="client-sidebar-nav">
              <Link className="client-sidebar-link" to="/client-dashboard">
                <strong>Dashboard</strong>
                <small>Recherche, services, reservation</small>
              </Link>
              <Link className="client-sidebar-link" to="/favorites">
                <strong>Favoris</strong>
                <small>Prestataires sauvegardes</small>
              </Link>
              <Link className="client-sidebar-link active" to="/planner">
                <strong>Planner</strong>
                <small>Checklist mariage</small>
              </Link>
              <Link className="client-sidebar-link" to="/chat">
                <strong>Chat</strong>
                <small>Conversation en direct</small>
              </Link>
            </nav>
          </aside>

          <section className="client-content">
            <header className="client-content-header">
              <div>
                <p className="client-section-label">Wedding planner</p>
                <h2>Vos taches, votre rythme</h2>
                <p>Ajoutez, suivez et finalisez les etapes de preparation en toute clarte.</p>
              </div>
            </header>

            {message ? <p className="client-message">{message}</p> : null}
            {error ? <p className="client-error">{error}</p> : null}

            <div className="client-grid">
              <section className="client-panel">
                <h2>Ajouter une tache</h2>
                <div className="client-filters">
                  <input className="client-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nouvelle tache" />
                  <button type="button" className="client-btn client-btn-primary" onClick={addItem}>
                    Ajouter
                  </button>
                </div>
              </section>

              <section className="client-panel">
                <h2>Checklist</h2>
                <div className="client-chat-list">
                  {items.map((item) => (
                    <div key={item.id} className="client-planner-item">
                      <span>{item.title}</span>
                      <button type="button" className="client-btn client-btn-soft" onClick={() => toggleItem(item)}>
                        {item.completed ? "Termine" : "Marquer complete"}
                      </button>
                    </div>
                  ))}
                  {items.length === 0 ? <p>Aucune tache pour le moment.</p> : null}
                </div>
              </section>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
};

export default PlannerPage;
