import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../logo (2).png";
import "../pages/auth.css";
import NotificationMenu from "./NotificationMenu";
import { clearStoredUser, getStoredUser, hasRole } from "../services/auth";

const publicLinks = [
  { to: "/", label: "Home" },
];

const roleLinks = [
  {
    role: "Client",
    to: "/client-dashboard",
    label: "Mon espace",
    variant: "auth-nav-link-primary",
  },
  {
    role: "Admin",
    to: "/admin",
    label: "Admin",
    variant: "auth-nav-link-soft",
  },
  {
    role: "Prestataire",
    to: "/prestataire",
    label: "Espace Prestataire",
    variant: "auth-nav-link-primary",
  },
];

const clientLinks = [
  { to: "/client", label: "Accueil" },
  { to: "/client/profile", label: "Profil" },
  { to: "/client/search", label: "Recherche" },
  { to: "/client/reservations", label: "Reservations" },
  { to: "/client/favorites", label: "Favoris" },
  { to: "/client/packs", label: "Packs" },
  { to: "/client/planner", label: "Planner" },
  { to: "/client/chat", label: "Chat" },
];

const getLinkVariant = (link) => {
  if (link.variant) {
    return link.variant;
  }

  if (link.label === "Sign Up") {
    return "auth-nav-link-primary";
  }

  if (link.label === "Login") {
    return "auth-nav-link-soft";
  }

  return "";
};

const isLinkActive = (pathname, to) => {
  if (pathname === to) {
    return true;
  }
  if (to === "/client/search" && (pathname.startsWith("/client/provider/") || pathname.startsWith("/client/service/"))) {
    return true;
  }
  return pathname.startsWith(`${to}/`);
};

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

const Navbar = ({
  onLogoClick,
  notifications = [],
  onDismissNotification,
  onNotificationClick,
  providerNotifications = [],
  providerNotificationsLoading = false,
  providerNotificationsError = "",
  onProviderNotificationClick,
}) => {
  const location = useLocation();
  const user = getStoredUser();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  const unreadCount = notifications.filter((notification) => !notification.seen).length;
  const notificationLabel = useMemo(() => {
    if (unreadCount === 0) {
      return "Aucune notification";
    }
    return unreadCount === 1 ? "1 notification" : `${unreadCount} notifications`;
  }, [unreadCount]);

  const links = [
    ...(hasRole(user, "Client") ? [] : publicLinks),
    ...(hasRole(user, "Client") ? clientLinks : roleLinks.filter((link) => hasRole(user, link.role))),
    ...(user ? [] : [{ to: "/login", label: "Login" }, { to: "/signup", label: "Sign Up" }]),
  ];

  useEffect(() => {
    const onScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollYRef.current;
      const shouldHide = scrollingDown && currentScrollY > 140;
      setIsHidden(shouldHide);
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogoClick = (event) => {
    if (onLogoClick) {
      onLogoClick(event);
    }

    if (!event.defaultPrevented) {
      window.dispatchEvent(new Event("arrasli:show-splash"));
    }
  };

  const homeTarget = hasRole(user, "Client") ? "/client" : "/";

  return (
    <header className={`auth-navbar ${isHidden ? "auth-navbar-hidden" : ""}`}>
      <div className="auth-container auth-navbar-content">
        <Link className="auth-logo" to={homeTarget} onClick={handleLogoClick}>
          <span className="auth-logo-mark">
            <img src={logo} alt="logo" className="auth-logo-image" />
          </span>
          <span className="auth-logo-copy">
            <strong>3arrasli.tn</strong>
            <span>Wedding marketplace</span>
          </span>
        </Link>

        <nav className="auth-nav-shell">
          {hasRole(user, "Prestataire") ? (
            <NotificationMenu
              notifications={providerNotifications}
              loading={providerNotificationsLoading}
              error={providerNotificationsError}
              title="Notifications prestataire"
              emptyText="Aucune notification prestataire."
              onNotificationClick={onProviderNotificationClick}
            />
          ) : null}

          {hasRole(user, "Admin") ? (
            <div className="admin-notifications auth-admin-notifications">
              <button
                type="button"
                className={`admin-notification-trigger ${notificationsOpen ? "active" : ""}`}
                onClick={() => {
                  setNotificationsOpen((prev) => !prev);
                }}
                aria-label={notificationLabel}
                aria-expanded={notificationsOpen}
              >
                <span className="admin-notification-bell" aria-hidden="true">
                  <BellIcon />
                </span>
                {unreadCount > 0 ? (
                  <span className="admin-notification-count">{unreadCount}</span>
                ) : null}
              </button>

              {notificationsOpen ? (
                <div className="admin-notification-panel">
                  <div className="admin-notification-panel-head">
                    <strong>Notifications</strong>
                    <span>{notificationLabel}</span>
                  </div>

                  {notifications.length === 0 ? (
                    <p className="admin-notification-empty">Aucune notification pour le moment.</p>
                  ) : (
                    <div className="admin-notification-list">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`admin-notification-item ${notification.type} ${notification.seen ? "" : "unread"}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            onNotificationClick?.(notification);
                            setNotificationsOpen(false);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onNotificationClick?.(notification);
                              setNotificationsOpen(false);
                            }
                          }}
                        >
                          <div className="admin-notification-item-accent" aria-hidden="true" />
                          <div className="admin-notification-item-body">
                            <div className="admin-notification-item-meta">
                              <span className="admin-notification-item-tag">
                                {notification.seen ? "Lu" : "Non lu"}
                              </span>
                              <time>{notification.dateLabel || "A l'instant"}</time>
                            </div>
                            <strong>{notification.title || "Notification admin"}</strong>
                            <p>{notification.message}</p>
                          </div>
                          <button
                            type="button"
                            className="provider-ghost-btn admin-toast-close"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDismissNotification?.(notification.id);
                            }}
                          >
                            Fermer
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="auth-nav-links">
            {links.map((link) => (
              link.to ? (
                <Link
                  key={link.label}
                  className={`auth-nav-link ${getLinkVariant(link)} ${isLinkActive(location.pathname, link.to) ? "active" : ""}`}
                  to={link.to}
                >
                  {link.label}
                </Link>
              ) : (
                <a key={link.label} className={`auth-nav-link ${getLinkVariant(link)}`} href={link.href}>
                  {link.label}
                </a>
              )
            ))}
            {user && (
              <button
                type="button"
                className="auth-nav-link auth-nav-button auth-nav-link-soft"
                onClick={() => {
                  clearStoredUser();
                  window.location.href = "/";
                }}
              >
                Logout
              </button>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
