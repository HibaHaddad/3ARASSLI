import React from "react";
import Navbar from "../../components/Navbar";
import "../../Home.css";
import "../client.css";
import ClientNav from "./ClientNav";

const ClientPageLayout = ({ kicker, title, description, children }) => (
  <div className="client-page">
    <Navbar />
    <main className="client-page-main">
      <section className="client-page-hero compact">
        <div className="client-shell">
          <ClientNav />
          <div className="client-page-heading">
            <span className="section-kicker">{kicker}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </div>
      </section>

      {children}
    </main>
  </div>
);

export default ClientPageLayout;
