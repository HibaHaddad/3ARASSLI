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
  const safeReservations = Array.isArray(upcomingReservations) ? upcomingReservations : [];
  const safeCalendarDates = Array.isArray(calendarDates) ? calendarDates : [];
  const safeChats = Array.isArray(recentChats) ? recentChats : [];
  const nextHighlight = safeReservations[0];
  const visibleDates = safeCalendarDates.slice(0, 6);
  const nextDateLabel = nextHighlight?.date
    ? new Date(nextHighlight.date).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
      })
    : "A planifier";

  return (
    <div className="provider-stack provider-stack-simple">
      <section className="provider-hero-card provider-hero-card-simple provider-dashboard-hero-premium">
        <div className="provider-wedding-particles" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="provider-hero-copy">
          <span className="provider-section-label provider-section-label-light">Dashboard</span>
          <h3>Bonjour {providerName || "Prestataire"} ✨</h3>
          <p>Un cockpit mariage premium pour transformer chaque demande en experience memorable.</p>
          <p className="provider-hero-summary">{heroSummary}</p>

          <div className="provider-hero-chip-row">
            <span>💍 Scenario clair</span>
            <span>🌸 Ambiance premium</span>
            <span>🥂 Execution fluide</span>
          </div>

          <div className="provider-inline-actions">
            <button
              type="button"
              className="provider-primary-btn"
              onClick={() => onGoToSection("reservations")}
            >
              💌 Voir mes demandes
            </button>
            <button
              type="button"
              className="provider-ghost-btn"
              onClick={() => onGoToSection("calendar")}
            >
              🗓️ Mes disponibilites
            </button>
          </div>

          {nextHighlight ? (
            <div className="provider-dashboard-next-focus">
              <span>🎬 Prochaine scene</span>
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
            <div className="provider-hero-image-overlay">
              <span>💒 Studio du jour</span>
              <strong>{nextHighlight ? nextDateLabel : "Pret pour la prochaine demande"}</strong>
            </div>
          </div>
          <div className="provider-hero-floating-note">
            <span>Wow effect</span>
            <strong>💫</strong>
          </div>
        </div>
      </section>

      <section className="provider-dashboard-stats-grid">
        {dashboardStats.map((stat) => (
          <article key={stat.id} className={`provider-dashboard-stat ${stat.tone}`}>
            <div className="provider-dashboard-stat-head">
              <span>{stat.label}</span>
              <em>{stat.icon || "STAT"}</em>
            </div>
            <strong>{stat.value}</strong>
            <p>{stat.detail}</p>
            <small>{stat.trend || "A suivre cette semaine"}</small>
            <div className="provider-stat-progress" aria-hidden="true">
              <i style={{ width: `${Math.min(Number(stat.progress || 62), 100)}%` }} />
            </div>
          </article>
        ))}
      </section>

      <section className="provider-dashboard-signature-strip">
        <div className="provider-signature-copy">
          <span className="provider-section-label provider-section-label-light">Signature</span>
          <h3>Une vue plus clean, plus luxe, plus directe.</h3>
          <p>
            Les informations importantes restent visibles, le reste devient une ambiance: image,
            lumiere, mouvement et actions rapides.
          </p>
          <div className="provider-signature-tags">
            <span>💌 Clients</span>
            <span>✨ Vitrine</span>
            <span>🗓️ Planning</span>
            <span>🥂 Jour J</span>
          </div>
        </div>
        <button
          type="button"
          className="provider-signature-action"
          onClick={() => onGoToSection("services")}
        >
          <span>Ameliorer ma vitrine</span>
          <strong>✨</strong>
        </button>
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
            <h3>💍 Prochaines reservations</h3>
            <p>Les prochaines prestations a preparer.</p>
          </div>
          <button type="button" className="provider-ghost-btn" onClick={() => onGoToSection("reservations")}>
            Tout voir
          </button>
        </div>

        <div className="provider-booking-simple-list">
          {safeReservations.map((booking) => (
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
              <h3>💬 Messages recents</h3>
              <p>Vos derniers echanges clients.</p>
            </div>
            <button type="button" className="provider-ghost-btn" onClick={() => onGoToSection("chat")}>
              Voir tout
            </button>
          </div>

          <div className="provider-message-list">
            {safeChats.map((chat) => (
              <MessageItem key={chat.id} chat={chat} onClick={() => onOpenChat(chat.id)} />
            ))}
          </div>
        </article>

        <article className="provider-panel">
          <div className="provider-panel-head provider-panel-head-inline">
            <div>
              <h3>🗓️ Calendrier simple</h3>
              <p>Vos prochaines dates libres et occupees.</p>
            </div>
            <button type="button" className="provider-ghost-btn" onClick={() => onGoToSection("calendar")}>
              Gerer
            </button>
          </div>

          <div className="provider-mini-calendar provider-mini-calendar-simple">
            {visibleDates.map((item) => (
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
