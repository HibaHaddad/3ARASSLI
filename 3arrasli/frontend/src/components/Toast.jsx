import React, { useEffect, useState } from "react";
import { TOAST_EVENT_NAME } from "../services/toast";

const TOAST_DURATION_MS = 3800;

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const onToast = (event) => {
      const toast = event.detail;

      setToasts((current) => [...current, toast]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, TOAST_DURATION_MS);
    };

    window.addEventListener(TOAST_EVENT_NAME, onToast);
    return () => window.removeEventListener(TOAST_EVENT_NAME, onToast);
  }, []);

  const closeToast = (toastId) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  };

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div className={`toast toast-${toast.type}`} key={toast.id} role="status">
          <span>{toast.message}</span>
          <button type="button" onClick={() => closeToast(toast.id)} aria-label="Fermer l'alerte">
            x
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
