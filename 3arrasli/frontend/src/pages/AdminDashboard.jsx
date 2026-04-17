import React from "react";

const metrics = [
  { label: "Prestataires verifies", value: "124" },
  { label: "Reservations aujourd'hui", value: "18" },
  { label: "Paiements securises", value: "32" },
  { label: "Messages en attente", value: "9" },
];

const modules = [
  "Validation des comptes prestataires",
  "Suivi des reservations et paiements",
  "Moderation des avis et signalements",
  "Supervision des conversations sensibles",
];

const AdminDashboard = () => {
  return (
    <div className="page-stack">
      <section className="page-hero page-hero-admin">
        <div>
          <p className="section-label">Espace administration</p>
          <h1>Un tableau de bord plus elegant et plus cohherent avec le theme mariage</h1>
          <p className="muted">
            Cette page reprend la nouvelle palette ivoire, champagne, rose poudré et sauge pour
            garder une experience uniforme sur l'ensemble du projet.
          </p>
        </div>
      </section>

      <section className="admin-preview-grid">
        {metrics.map((metric) => (
          <article key={metric.label} className="surface-card stat-card-soft">
            <p className="section-label">KPI</p>
            <strong className="metric-value">{metric.value}</strong>
            <span className="muted">{metric.label}</span>
          </article>
        ))}
      </section>

      <section className="content-section two-columns">
        <article className="surface-card">
          <p className="section-label">Modules admin</p>
          <h2>Sections conseillees</h2>
          <ul className="feature-list">
            {modules.map((module) => (
              <li key={module}>{module}</li>
            ))}
          </ul>
        </article>

        <article className="surface-card warm-card">
          <p className="section-label">Direction visuelle</p>
          <h2>Palette retenue</h2>
          <div className="palette-row">
            <span className="palette-swatch blush">Rose poudre</span>
            <span className="palette-swatch champagne">Champagne</span>
            <span className="palette-swatch sage">Vert sauge</span>
            <span className="palette-swatch ivory">Ivoire</span>
          </div>
        </article>
      </section>
    </div>
  );
};

export default AdminDashboard;
