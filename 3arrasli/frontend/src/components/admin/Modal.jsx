import React from "react";
import { createPortal } from "react-dom";

const Modal = ({ open, title, children, actions, onClose }) => {
  if (!open) {
    return null;
  }

  return createPortal(
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
    </div>,
    document.body
  );
};

export default Modal;
