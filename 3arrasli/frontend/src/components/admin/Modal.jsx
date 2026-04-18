import React from "react";

const Modal = ({ open, title, children, actions, onClose }) => {
  if (!open) {
    return null;
  }

  return (
    <div className="provider-modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="provider-modal-shell admin-modal-shell">
        <button type="button" className="provider-modal-close" onClick={onClose} aria-label="Fermer la fenetre">
          <span />
          <span />
        </button>

        <div className="provider-panel-head">
          <h3>{title}</h3>
        </div>

        <div className="admin-modal-content">{children}</div>

        <div className="admin-modal-actions">{actions}</div>
      </div>
    </div>
  );
};

export default Modal;
