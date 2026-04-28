import React from "react";
import ClientPageLayout from "./client/ClientPageLayout";
import { getStoredUser } from "../services/auth";

const profileFields = [
  { label: "Nom", valueKey: "name", fallback: "Client 3arrasli" },
  { label: "Email", valueKey: "email", fallback: "Non renseigne" },
  { label: "Telephone", valueKey: "phone", fallback: "Non renseigne" },
  { label: "Ville", valueKey: "city", fallback: "Non renseignee" },
  { label: "Role", valueKey: "role", fallback: "Client" },
];

const ClientProfilePage = () => {
  const user = getStoredUser() || {};
  const firstName = user?.name?.split(" ")?.[0] || "Votre";

  return (
    <ClientPageLayout
      kicker="Profil client"
      title={`${firstName} profil mariage`}
      description="Retrouvez vos informations de compte dans un espace dedie, sans les melanger aux autres outils client."
    >
      <section className="client-section">
        <div className="client-shell">
          <article className="client-search-card">
            <div className="client-search-heading">
              <span className="section-kicker">Compte</span>
              <h2>Informations de votre espace client.</h2>
            </div>

            <dl className="client-detail-list">
              {profileFields.map((field) => (
                <div key={field.label}>
                  <dt>{field.label}</dt>
                  <dd>{user[field.valueKey] || field.fallback}</dd>
                </div>
              ))}
            </dl>
          </article>
        </div>
      </section>
    </ClientPageLayout>
  );
};

export default ClientProfilePage;
