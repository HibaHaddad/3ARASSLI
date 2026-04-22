import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { clearStoredUser } from "../../services/auth";

const links = [
  { to: "/client", label: "Accueil" },
  { to: "/client/search", label: "Recherche" },
  { to: "/client/reservations", label: "Reservations" },
  { to: "/client/favorites", label: "Favoris" },
  { to: "/client/planner", label: "Planner" },
  { to: "/client/chat", label: "Chat" },
];

const ClientNav = ({ light = false }) => {
  const navigate = useNavigate();

  const logout = () => {
    clearStoredUser();
    navigate("/login");
  };

  return (
    <nav className={`client-site-nav ${light ? "light" : ""}`} aria-label="Navigation client">
      {links.map((link) => (
        <NavLink key={link.to} to={link.to} end={link.to === "/client"}>
          {link.label}
        </NavLink>
      ))}
      <button type="button" onClick={logout}>
        Logout
      </button>
    </nav>
  );
};

export default ClientNav;
