import React from "react";

const ProviderSidebar = ({ sections, activeSection, onSectionChange, isOpen, sidebarAddon }) => {
  return (
    <aside className={`provider-sidebar ${isOpen ? "open" : ""}`}>
      <div className="provider-sidebar-brand">
        <p className="provider-eyebrow">Prestataire</p>
        <h1>Studio Lumiere</h1>
        <span>Dashboard mariage premium</span>
      </div>

      <div className="provider-sidebar-menu-zone">
        <span className="provider-sidebar-zone-label">Navigation</span>
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
      </div>

      {sidebarAddon ? <div className="provider-sidebar-addon">{sidebarAddon}</div> : null}
    </aside>
  );
};

export default ProviderSidebar;
