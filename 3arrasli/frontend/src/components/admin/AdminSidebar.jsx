import React from "react";

const AdminSidebar = ({ sections, activeSection, onSectionChange, isOpen }) => {
  return (
    <aside className={`provider-sidebar ${isOpen ? "open" : ""}`}>
      <div className="provider-sidebar-brand">
        <p className="provider-eyebrow">Admin</p>
        <h1>Control Center</h1>
        <span>Gestion complete de la plateforme mariage</span>
      </div>

      <nav className="provider-sidebar-nav">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`provider-sidebar-link ${activeSection === section.id ? "active" : ""}`}
            onClick={() => onSectionChange(section.id)}
          >
            <strong>{section.label}</strong>
            <small>{section.title}</small>
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
