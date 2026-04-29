import React from "react";

const SidebarIcon = ({ name }) => {
  switch (name) {
    case "reservations":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4.75h10a2.25 2.25 0 0 1 2.25 2.25v10A2.25 2.25 0 0 1 17 19.25H7A2.25 2.25 0 0 1 4.75 17V7A2.25 2.25 0 0 1 7 4.75Z" fill="none" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M8 9.25h8M8 13h8M8 16.75h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      );
    case "profile":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M6.25 18.25a5.75 5.75 0 0 1 11.5 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      );
    case "services":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5.25 7.25h13.5v9.5H5.25Z" fill="none" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M9 7.25V5.5h6v1.75M8.5 11.25h7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      );
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.25 5.75h11.5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6.25a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M8 4.75v3M16 4.75v3M4.75 9.25h14.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      );
    case "chat":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.25 6.25h11.5a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H11l-4.75 3v-3H6.25a2 2 0 0 1-2-2v-6.5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
        </svg>
      );
    case "packs":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4.75 19 8.5v7L12 19.25 5 15.5v-7L12 4.75Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
          <path d="M12 12.25 19 8.5M12 12.25 5 8.5M12 12.25v7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case "dashboard":
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5.25 5.25h5.5v5.5h-5.5ZM13.25 5.25h5.5v8h-5.5ZM5.25 13.25h5.5v5.5h-5.5ZM13.25 15.75h5.5v3h-5.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
        </svg>
      );
  }
};

const ProviderSidebar = ({ sections, activeSection, onSectionChange, isOpen, sidebarAddon }) => {
  return (
    <aside className={`provider-sidebar ${isOpen ? "open" : "hidden"}`}>
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
              aria-label={section.label}
              title={section.label}
            >
              <span className="provider-sidebar-link-icon">
                <SidebarIcon name={section.icon || section.id} />
              </span>
              <strong>{section.label}</strong>
            </button>
          ))}
        </nav>
      </div>

      {sidebarAddon ? <div className="provider-sidebar-addon">{sidebarAddon}</div> : null}
    </aside>
  );
};

export default ProviderSidebar;
