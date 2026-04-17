import React from "react";

const ActionCard = ({ icon, title, description, action, onClick }) => {
  return (
    <article className="provider-action-card">
      <span className="provider-action-icon">{icon}</span>
      <h4>{title}</h4>
      <p>{description}</p>
      <button type="button" className="provider-link-btn" onClick={onClick}>
        {action}
      </button>
    </article>
  );
};

export default ActionCard;
