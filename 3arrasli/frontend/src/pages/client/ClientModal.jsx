import React, { useEffect } from "react";

const ClientModal = ({ open, title, children, onClose, className = "" }) => {
  useEffect(() => {
    if (!open) {
      document.body.classList.remove("client-modal-open");
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
      document.body.classList.remove("client-modal-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="client-modal-overlay" role="presentation" onMouseDown={onClose}>
      <article
        className={`client-service-modal client-modal-shell ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
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
    </div>
  );
};

export default ClientModal;
