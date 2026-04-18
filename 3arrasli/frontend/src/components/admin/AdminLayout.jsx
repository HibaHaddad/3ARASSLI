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
}) => {
  return (
    <div className="provider-page admin-page-unified">
      <Navbar />

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

            <SectionTabs
              sections={sections}
              activeSection={activeSection}
              onSectionChange={onSectionChange}
            />

            {children}
          </section>
        </section>
      </main>

      <div className="admin-toast-stack" role="status" aria-live="polite">
        {notifications.map((notification) => (
          <div key={notification.id} className={`admin-toast ${notification.type}`}>
            <span>{notification.message}</span>
            <button
              type="button"
              className="provider-ghost-btn admin-toast-close"
              onClick={() => onDismissNotification(notification.id)}
              aria-label="Fermer la notification"
            >
              Fermer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminLayout;
