import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api from "../services/api";
import "./client.css";
import ClientNav from "./client/ClientNav";

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
      <main className="client-page-main">
        <section className="client-page-hero compact">
          <div className="client-shell">
            <ClientNav />
            <div className="client-page-heading">
              <span className="section-kicker">Wedding planner</span>
              <h1>Votre carnet d'organisation.</h1>
              <p>Ajoutez, suivez et finalisez les etapes de preparation dans une page simple et douce.</p>
            </div>
          </div>
        </section>

        <section className="client-section client-planner-section">
          <div className="client-shell client-planner-layout">
            <div className="client-planner-copy">
              <span className="section-kicker">Checklist</span>
              <h2>Vos taches, votre rythme.</h2>
              <p>Un outil d'organisation mariage clair, sans logique de tableau de bord.</p>
            </div>

            <div className="client-planner-card">
            {message ? <p className="client-message">{message}</p> : null}
            {error ? <p className="client-error">{error}</p> : null}

              <div className="client-planner-form">
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nouvelle tache mariage" />
                <button type="button" className="client-btn client-btn-primary" onClick={addItem}>
                  Ajouter
                </button>
              </div>

              <div className="client-planner-list">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={item.completed ? "completed" : ""}
                      onClick={() => toggleItem(item)}
                    >
                      <span>{item.title}</span>
                      <small>{item.completed ? "Terminee" : "A faire"}</small>
                    </button>
                  ))}
                  {items.length === 0 ? <p>Aucune tache pour le moment.</p> : null}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default PlannerPage;
