import React from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../logo (2).png";
import "../pages/auth.css";
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

const Navbar = ({ onLogoClick }) => {
  const location = useLocation();
  const user = getStoredUser();

  const links = [
    ...publicLinks,
    ...roleLinks.filter((link) => hasRole(user, link.role)),
    ...(user ? [] : [{ to: "/login", label: "Login" }, { to: "/signup", label: "Sign Up" }]),
  ];

  const handleLogoClick = (event) => {
    if (onLogoClick) {
      onLogoClick(event);
    }

    if (!event.defaultPrevented) {
      window.dispatchEvent(new Event("arrasli:show-splash"));
    }
  };

  return (
    <header className="auth-navbar">
      <div className="auth-container auth-navbar-content">
        <Link className="auth-logo" to="/" onClick={handleLogoClick}>
          <span className="auth-logo-mark">
            <img src={logo} alt="logo" className="auth-logo-image" />
          </span>
          <span className="auth-logo-copy">
            <strong>3arrasli.tn</strong>
            <span>Wedding marketplace</span>
          </span>
        </Link>

        <nav className="auth-nav-shell">
          <div className="auth-nav-links">
            {links.map((link) => (
              link.to ? (
                <Link
                  key={link.label}
                  className={`auth-nav-link ${getLinkVariant(link)} ${location.pathname === link.to ? "active" : ""}`}
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
          </div>

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
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
