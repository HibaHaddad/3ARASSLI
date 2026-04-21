import React from "react";
import Navbar from "../../components/Navbar";
import AdminSidebar from "./AdminSidebar";
import SectionTabs from "./SectionTabs";

const AdminLayout = ({
  sections,
  activeSection,
  onSectionChange,
  isSidebarOpen,
  onToggleSidebar,
  currentSection,
  children,
  notifications,
  onDismissNotification,
  onOpenNotifications,
}) => {
  return (
    <div className="provider-page admin-page-unified">
      <Navbar
        notifications={notifications}
        onDismissNotification={onDismissNotification}
        onOpenNotifications={onOpenNotifications}
      />

      <main className="provider-main">
        <section className="provider-shell">
          <button
            type="button"
            className="provider-hamburger"
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? "Fermer le menu admin" : "Ouvrir le menu admin"}
            aria-expanded={isSidebarOpen}
          >
            <span />
            <span />
            <span />
          </button>

          {isSidebarOpen ? (
            <button
              type="button"
              className="provider-sidebar-backdrop"
              onClick={onToggleSidebar}
              aria-label="Fermer la navigation admin"
            />
          ) : null}

          <AdminSidebar
            sections={sections}
            activeSection={activeSection}
            onSectionChange={onSectionChange}
            isOpen={isSidebarOpen}
          />

          <section className="provider-content admin-content-unified">
            <header className="provider-content-header">
              <div>
                <p className="provider-section-label">{currentSection.label}</p>
                <h2>{currentSection.title}</h2>
                <p>{currentSection.description}</p>
              </div>
            </header>

{children}
          </section>
        </section>
      </main>
    </div>
  );
};

export default AdminLayout;
