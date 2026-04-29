import React from "react";

const SidebarIcon = ({ name }) => {
  switch (name) {
    case "providers":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 10a2.75 2.75 0 1 1 0-5.5A2.75 2.75 0 0 1 7 10Zm10 1.25a2.25 2.25 0 1 0-1.59-3.84A2.25 2.25 0 0 0 17 11.25Z" fill="none" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M3.75 18.25a4.25 4.25 0 0 1 6.5-3.62m4.75 3.62a3.5 3.5 0 0 1 5.25-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      );
    case "appointments":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.25 5.75h11.5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6.25a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M8 4.75v3M16 4.75v3M4.75 9.25h14.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      );
    case "contracts":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4.75h7.5l3.75 3.75V17A2.25 2.25 0 0 1 16 19.25H7A2.25 2.25 0 0 1 4.75 17V7A2.25 2.25 0 0 1 7 4.75Z" fill="none" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M14.5 4.75V8.5h3.75M8 13h8M8 16h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      );
    case "billing":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.25 5.25h11.5a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2H6.25a2 2 0 0 1-2-2v-9.5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M4.75 9.5h14.5M8 14h3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      );
    case "reviews":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 4.75 2.16 4.38 4.84.7-3.5 3.41.83 4.81L12 15.8l-4.33 2.25.83-4.81-3.5-3.41 4.84-.7Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
        </svg>
      );
    case "packs":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.75 8.25 12 4.75l7.25 3.5V16L12 19.25 4.75 16Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
          <path d="M4.75 8.25 12 12l7.25-3.75M12 12v7.25" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      );
    case "chat":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.25 6.25h11.5a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H11l-4.75 3v-3H6.25a2 2 0 0 1-2-2v-6.5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
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

const AdminSidebar = ({ sections, activeSection, onSectionChange, isOpen }) => {
  return (
    <aside className={`provider-sidebar ${isOpen ? "open" : "hidden"}`}>
      <div className="provider-sidebar-brand">
        <p className="provider-eyebrow">Admin</p>
        <h1>Control Center</h1>
      </div>

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
    </aside>
  );
};

export default AdminSidebar;
