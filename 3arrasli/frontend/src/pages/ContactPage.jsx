import React from "react";
import InfoPage from "./InfoPage";

const ContactPage = () => (
  <InfoPage
    title="Contact"
    intro="Une question, un retour ou une demande d'assistance ?"
  >
    <p>Email: support@3arrasli.com</p>
    <p>Horaires: Lundi - Vendredi, 09:00 - 18:00</p>
    <p>Nous repondons generalement sous 24h ouvrables.</p>
  </InfoPage>
);

export default ContactPage;
