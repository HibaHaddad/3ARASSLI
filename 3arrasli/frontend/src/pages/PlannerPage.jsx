import React, { useEffect, useState } from "react";
import api from "../services/api";
import ClientPageLayout from "./client/ClientPageLayout";

const defaultItems = [
  "Robe de mariee",
  "Salle de fete",
  "Traiteur",
  "Decoration",
];

const PlannerPage = () => {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
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

  const addSuggestedItem = async (suggestion) => {
    try {
      await api.post("/api/planner", { title: suggestion });
      setMessage("Suggestion ajoutee au planner.");
      setError("");
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

  const normalizedSearch = search.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    const matchesSearch = !normalizedSearch || item.title.toLowerCase().includes(normalizedSearch);
    const matchesFilter =
      filter === "all" ||
      (filter === "todo" && !item.completed) ||
      (filter === "done" && item.completed);
    return matchesSearch && matchesFilter;
  });

  const completedCount = items.filter((item) => item.completed).length;
  const remainingCount = Math.max(items.length - completedCount, 0);
  const progress = items.length ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <ClientPageLayout
      kicker="Wedding planner"
      title="Votre planner mariage"
      description="Suivez vos priorites, cochez les etapes importantes et gardez une vue claire sur l'avancement de votre organisation."
    >
      <section className="client-section client-planner-section">
        <div className="client-shell client-planner-layout">
          <div className="client-planner-copy">
            <span className="section-kicker">Checklist</span>
            <h2>Une preparation plus claire et plus elegante.</h2>
            <p>Ajoutez vos taches, filtrez l'avancement et gardez toujours sous les yeux ce qu'il reste a boucler.</p>

            <div className="client-planner-stats">
              <article className="client-planner-stat-card">
                <span>Progression</span>
                <strong>{progress}%</strong>
                <small>{completedCount} tache(s) terminee(s)</small>
              </article>
              <article className="client-planner-stat-card">
                <span>En cours</span>
                <strong>{remainingCount}</strong>
                <small>reste(s) a finaliser</small>
              </article>
            </div>

            <div className="client-planner-suggestions">
              {defaultItems.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => addSuggestedItem(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
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

            <div className="client-planner-toolbar">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher une tache"
              />
              <div className="client-planner-filter-group">
                <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
                  Tout
                </button>
                <button type="button" className={filter === "todo" ? "active" : ""} onClick={() => setFilter("todo")}>
                  A faire
                </button>
                <button type="button" className={filter === "done" ? "active" : ""} onClick={() => setFilter("done")}>
                  Termine
                </button>
              </div>
            </div>

            <div className="client-planner-list">
              {filteredItems.map((item) => (
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
              {filteredItems.length === 0 ? <p>Aucune tache pour ce filtre.</p> : null}
            </div>
          </div>
        </div>
      </section>
    </ClientPageLayout>
  );
};

export default PlannerPage;
