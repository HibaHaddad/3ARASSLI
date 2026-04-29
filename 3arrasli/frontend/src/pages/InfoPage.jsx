import React from "react";
import { Link } from "react-router-dom";
import "../Home.css";

const InfoPage = ({ title, intro, children }) => (
  <main className="legal-page">
    <section className="legal-card">
      <h1>{title}</h1>
      <p className="legal-intro">{intro}</p>
      <div className="legal-content">{children}</div>
      <Link className="legal-back" to="/">Retour a l'accueil</Link>
    </section>
  </main>
);

export default InfoPage;
