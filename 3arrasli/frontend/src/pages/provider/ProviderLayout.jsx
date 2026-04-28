import React from "react";
import Navbar from "../../components/Navbar";
import ProviderSidebar from "./ProviderSidebar";

const ProviderLayout = ({
  sections,
  activeSection,
  onSectionChange,
  isSidebarOpen,
  onToggleSidebar,
  currentSection,
  sidebarAddon,
  notifications,
  notificationsLoading,
  notificationsError,
  onNotificationClick,
  children,
}) => {
  return (
    <div className="provider-page">
      <Navbar
        providerNotifications={notifications}
        providerNotificationsLoading={notificationsLoading}
        providerNotificationsError={notificationsError}
        onProviderNotificationClick={onNotificationClick}
      />

      <main className="provider-main">
        <section className={`provider-shell ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
          <button
            type="button"
            className="provider-hamburger"
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? "Fermer le menu prestataire" : "Ouvrir le menu prestataire"}
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
              aria-label="Fermer la navigation prestataire"
            />
          ) : null}

          <ProviderSidebar
            sections={sections}
            activeSection={activeSection}
            onSectionChange={onSectionChange}
            isOpen={isSidebarOpen}
            sidebarAddon={sidebarAddon}
          />

          <section className={`provider-content ${isSidebarOpen ? "with-sidebar" : "without-sidebar"}`}>
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

export default ProviderLayout;
