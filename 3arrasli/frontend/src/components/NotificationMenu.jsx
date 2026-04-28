import React, { useEffect, useMemo, useRef, useState } from "react";

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 4.25a4.75 4.75 0 0 0-4.75 4.75v2.04c0 .82-.24 1.63-.69 2.32l-1.12 1.69a1.75 1.75 0 0 0 1.46 2.71h10.18a1.75 1.75 0 0 0 1.46-2.71l-1.12-1.69a4.25 4.25 0 0 1-.69-2.32V9A4.75 4.75 0 0 0 12 4.25Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.75 18.25a2.25 2.25 0 0 0 4.5 0"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const formatNotificationDate = (value) => {
  if (!value) {
    return "A l'instant";
  }

  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const NotificationMenu = ({
  notifications = [],
  loading = false,
  error = "",
  title = "Notifications",
  emptyText = "Aucune notification pour le moment.",
  isNotificationRead = (notification) => Boolean(notification.isRead || notification.seen),
  getNotificationDate = (notification) =>
    notification.dateLabel || formatNotificationDate(notification.createdAt || notification.created_at),
  onNotificationClick,
  onDismissNotification,
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const unreadCount = notifications.filter((notification) => !isNotificationRead(notification)).length;
  const notificationLabel = useMemo(() => {
    if (unreadCount === 0) {
      return "Aucune notification non lue";
    }
    return unreadCount === 1 ? "1 notification non lue" : `${unreadCount} notifications non lues`;
  }, [unreadCount]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const openNotification = (notification) => {
    onNotificationClick?.(notification);
    setOpen(false);
  };

  return (
    <div className="notification-menu" ref={wrapperRef}>
      <button
        type="button"
        className={`notification-menu-trigger ${open ? "active" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-label={notificationLabel}
        aria-expanded={open}
      >
        <span className="notification-menu-bell" aria-hidden="true">
          <BellIcon />
        </span>
        {unreadCount > 0 ? <span className="notification-menu-count">{unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="notification-menu-panel">
          <div className="notification-menu-head">
            <strong>{title}</strong>
            <span>{notificationLabel}</span>
          </div>

          {error ? <p className="notification-menu-empty error">{error}</p> : null}
          {loading ? <p className="notification-menu-empty">Chargement...</p> : null}
          {!loading && notifications.length === 0 ? (
            <p className="notification-menu-empty">{emptyText}</p>
          ) : null}

          {!loading && notifications.length > 0 ? (
            <div className="notification-menu-list">
              {notifications.map((notification) => {
                const isRead = isNotificationRead(notification);
                return (
                  <button
                    key={notification.id}
                    type="button"
                    className={`notification-menu-item ${isRead ? "read" : "unread"} ${notification.type || ""}`}
                    onClick={() => openNotification(notification)}
                  >
                    <span className="notification-menu-accent" aria-hidden="true" />
                    <span className="notification-menu-body">
                      <span className="notification-menu-meta">
                        <span>{isRead ? "Lu" : "Non lu"}</span>
                        <time>{getNotificationDate(notification)}</time>
                      </span>
                      <strong>{notification.title || title}</strong>
                      <span>{notification.message}</span>
                    </span>
                    {onDismissNotification ? (
                      <span
                        className="notification-menu-close"
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          onDismissNotification(notification.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            onDismissNotification(notification.id);
                          }
                        }}
                      >
                        Fermer
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default NotificationMenu;
