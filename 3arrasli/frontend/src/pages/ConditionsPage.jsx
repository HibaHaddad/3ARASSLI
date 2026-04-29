import React from "react";
import InfoPage from "./InfoPage";

const ConditionsPage = () => (
  <InfoPage
    title="Conditions d'utilisation"
    intro="En utilisant 3arrasli, vous acceptez les conditions suivantes."
  >
    <p>Les utilisateurs s'engagent a fournir des informations exactes lors des reservations et paiements.</p>
    <p>Les prestataires sont responsables des services proposes et de leur execution.</p>
    <p>La plateforme peut mettre a jour ces conditions a tout moment pour ameliorer le service.</p>
  </InfoPage>
);

export default ConditionsPage;
