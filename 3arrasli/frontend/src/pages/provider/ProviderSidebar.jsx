import React from "react";

const ProviderSidebar = ({ sections, activeSection, onSectionChange, isOpen }) => {
  return (
    <aside className={`provider-sidebar ${isOpen ? "open" : ""}`}>
      <div className="provider-sidebar-brand">
        <p className="provider-eyebrow">Prestataire</p>
        <h1>Studio Lumiere</h1>
        <span>Dashboard mariage premium</span>
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

export default ProviderSidebar;
