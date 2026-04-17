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
      loadItems();
    } catch (err) {
      setError(err.response?.data?.message || "Ajout impossible.");
    }
  };

  const toggleItem = async (item) => {
    try {
      await api.put(`/api/planner/${item.id}`, { completed: !item.completed });
      loadItems();
    } catch (err) {
      setError(err.response?.data?.message || "Mise a jour impossible.");
    }
  };

  return (
    <div className="client-page">
      <Navbar />
      <div className="client-shell client-top">
        <div className="client-panel">
          <h2>Wedding Planner</h2>
          <p>Checklist client: ajoutez, cochez et suivez vos taches mariage.</p>
          <div className="client-actions">
            <Link className="client-btn client-btn-soft" to="/client-dashboard">
              Retour dashboard
            </Link>
          </div>
          {error ? <p className="client-error">{error}</p> : null}
        </div>

        <div className="client-panel">
          <div className="client-filters">
            <input className="client-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nouvelle tache" />
            <button type="button" className="client-btn client-btn-primary" onClick={addItem}>
              Ajouter
            </button>
          </div>
        </div>

        <div className="client-panel">
          <div className="client-chat-list">
            {items.map((item) => (
              <div key={item.id} className="client-planner-item">
                <span>{item.title}</span>
                <button type="button" className="client-btn client-btn-soft" onClick={() => toggleItem(item)}>
                  {item.completed ? "Termine" : "Marquer complete"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlannerPage;
