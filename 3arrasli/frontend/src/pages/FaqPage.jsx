import React from "react";
import InfoPage from "./InfoPage";

const FaqPage = () => (
  <InfoPage
    title="FAQ"
    intro="Les reponses aux questions les plus frequentes."
  >
    <p><strong>Comment reserver un service ?</strong><br />Choisissez un prestataire, selectionnez date/creneau, puis confirmez le paiement.</p>
    <p><strong>Comment signer le contrat ?</strong><br />Apres paiement, le contrat est disponible dans vos reservations avec option de signature.</p>
    <p><strong>Le paiement est-il securise ?</strong><br />Oui, les paiements sont traites via une integration Stripe securisee.</p>
  </InfoPage>
);

export default FaqPage;
