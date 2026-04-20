import React from "react";
import ActionCard from "./ActionCard";
import BookingItem from "./BookingItem";
import MessageItem from "./MessageItem";

const ProviderDashboardHome = ({
  providerName,
  heroSummary,
  priorityActions,
  upcomingReservations,
  calendarDates,
  recentChats,
  dashboardStats = [],
  onCalendarToggle,
  onGoToSection,
  onOpenReservation,
  onOpenChat,
}) => {
  const nextHighlight = upcomingReservations[0];

  return (
    <div className="provider-stack provider-stack-simple">
      <section className="provider-hero-card provider-hero-card-simple provider-dashboard-hero-premium">
        <div className="provider-hero-copy">
          <span className="provider-section-label">Dashboard</span>
          <h3>Bonjour {providerName || "Prestataire"} </h3>
          <p>Votre atelier du jour, pense pour piloter chaque detail avec calme et elegance.</p>
          <p className="provider-hero-summary">{heroSummary}</p>

          <div className="provider-inline-actions">
            <button
              type="button"
              className="provider-primary-btn"
              onClick={() => onGoToSection("reservations")}
            >
              Voir mes demandes
            </button>
            <button
              type="button"
              className="provider-ghost-btn"
              onClick={() => onGoToSection("calendar")}
            >
            Mes disponibilites
            </button>
          </div>

          {nextHighlight ? (
            <div className="provider-dashboard-next-focus">
              <span>Prochaine scene</span>
              <strong>{nextHighlight.service}</strong>
              <small>
                {nextHighlight.client} - {new Date(nextHighlight.date).toLocaleDateString("fr-FR")}
              </small>
            </div>
          ) : null}
        </div>

        <div className="provider-hero-visual provider-hero-visual-image">
          <div className="provider-hero-glow" />
          <div className="provider-hero-image-card">
            <img
              src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=90"
              alt="Ambiance mariage romantique"
            />
          </div>
        </div>
      </section>

      <section className="provider-dashboard-stats-grid">
        {dashboardStats.map((stat) => (
          <article key={stat.id} className={`provider-dashboard-stat ${stat.tone}`}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <p>{stat.detail}</p>
          </article>
        ))}
      </section>

      <section className="provider-actions-grid">
        {priorityActions.map((item) => (
          <ActionCard
            key={item.id}
            icon={item.icon}
            title={item.title}
            description={item.description}
            action={item.action}
            onClick={() => onGoToSection(item.target)}
          />
        ))}
      </section>

      <section className="provider-panel">
        <div className="provider-panel-head provider-panel-head-inline">
          <div>
            <h3>Prochaines reservations</h3>
            <p>Les prochaines prestations a preparer.</p>
          </div>
          <button type="button" className="provider-ghost-btn" onClick={() => onGoToSection("reservations")}>
            Tout voir
          </button>
        </div>

        <div className="provider-booking-simple-list">
          {upcomingReservations.map((booking) => (
            <BookingItem
              key={booking.id}
              booking={booking}
              onClick={() => onOpenReservation(booking.id)}
            />
          ))}
        </div>
      </section>

      <section className="provider-dashboard-bottom">
        <article className="provider-panel">
          <div className="provider-panel-head provider-panel-head-inline">
            <div>
              <h3>Messages recents</h3>
              <p>Vos derniers echanges clients.</p>
            </div>
            <button type="button" className="provider-ghost-btn" onClick={() => onGoToSection("chat")}>
              Voir tout
            </button>
          </div>

          <div className="provider-message-list">
            {recentChats.map((chat) => (
              <MessageItem key={chat.id} chat={chat} onClick={() => onOpenChat(chat.id)} />
            ))}
          </div>
        </article>

        <article className="provider-panel">
          <div className="provider-panel-head provider-panel-head-inline">
            <div>
              <h3>Calendrier simple</h3>
              <p>Vos prochaines dates libres et occupees.</p>
            </div>
            <button type="button" className="provider-ghost-btn" onClick={() => onGoToSection("calendar")}>
              Gerer
            </button>
          </div>

          <div className="provider-mini-calendar provider-mini-calendar-simple">
            {calendarDates.slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`provider-date-pill ${item.status}`}
                onClick={() => onCalendarToggle(item)}
              >
                <span>
                  {item.weekDay} {item.day} {item.month}
                </span>
                <strong>
                  {item.status === "occupied"
                    ? "Complete"
                    : item.status === "partial"
                      ? "Partielle"
                      : "Libre"}
                </strong>
              </button>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
};

export default ProviderDashboardHome;
