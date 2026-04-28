import React, { useEffect } from "react";
import { createPortal } from "react-dom";

const ClientModal = ({ open, title, children, onClose, className = "" }) => {
  useEffect(() => {
    const clearBodyLock = () => {
      document.body.classList.remove("client-modal-open");
    };

    if (!open) {
      clearBodyLock();
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.body.classList.add("client-modal-open");
    window.addEventListener("keydown", onKeyDown);

    return () => {
      clearBodyLock();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="client-modal-overlay" role="presentation" onClick={onClose}>
      <article
        className={`client-service-modal client-modal-shell ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="client-modal-close" aria-label="Fermer" onClick={onClose}>
          x
        </button>
        <div className="client-modal-panel">
          <div className="client-modal-panel-head">
            <span className="section-kicker">Action</span>
            <h2>{title}</h2>
          </div>
          <div className="client-modal-panel-body">{children}</div>
        </div>
      </article>
    </div>,
    document.body
  );
};

export default ClientModal;
