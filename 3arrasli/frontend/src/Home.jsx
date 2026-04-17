import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import PremiumCarousel from "./components/PremiumCarousel";
import "./Home.css";

const featuredServices = [
  {
    id: 1,
    title: "Studio Lumiere - Photographe",
    price: "A partir de 1200 TND",
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1400&q=90",
  },
  {
    id: 2,
    title: "Palais Jasmine - Salle de fete",
    price: "A partir de 3500 TND",
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=90",
  },
  {
    id: 3,
    title: "Saveurs Royales - Traiteur",
    price: "A partir de 1800 TND",
    rating: 4.7,
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=90",
  },
  {
    id: 4,
    title: "Elegance Deco - Decoration",
    price: "A partir de 900 TND",
    rating: 4.6,
    image:
      "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1400&q=90",
  },
];

const footerLinks = ["A propos", "Contact", "FAQ", "Conditions"];

const steps = [
  {
    id: 1,
    label: "Inspiration",
    title: "Rechercher",
    description:
      "Filtrez les prestataires qui correspondent a votre ville, a votre budget et a l'atmosphere souhaitee.",
  },
  {
    id: 2,
    label: "Selection",
    title: "Reserver",
    description:
      "Comparez les offres, affinez votre selection et contactez les profils les plus alignes avec votre vision.",
  },
  {
    id: 3,
    label: "Celebration",
    title: "Profiter",
    description:
      "Composez un mariage harmonieux avec des partenaires verifies et une experience plus sereine.",
  },
];

const heroHighlights = [
  "Prestataires verifies",
  "Ambiance luxe et romantique",
  "Reservation plus simple",
];

const useReveal = () => {
  const [visibleIds, setVisibleIds] = useState({});

  useEffect(() => {
    const elements = document.querySelectorAll("[data-reveal-id]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const { revealId } = entry.target.dataset;
          setVisibleIds((prev) => ({ ...prev, [revealId]: true }));
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return visibleIds;
};

const Home = ({ onLogoClick }) => {
  const [heroOffset, setHeroOffset] = useState(0);
  const visibleIds = useReveal();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setHeroOffset(Math.min(window.scrollY * 0.18, 90));
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isVisible = (id) => (visibleIds[id] ? "is-visible" : "");

  return (
    <div className="home-page">
      <Navbar onLogoClick={onLogoClick} />

      <section className="home-hero">
        <div
          className="hero-backdrop"
          style={{ transform: `translate3d(0, ${heroOffset}px, 0) scale(1.09)` }}
        />
        <div className="hero-mesh" />
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <div className="hero-grain" />

        <div className="home-shell hero-shell">
          <div className="hero-grid">
            <div className="hero-copy">
              <span className="hero-pill">Edition mariage premium</span>
              <h1 className="hero-title">Le plus beau debut pour imaginer un mariage inoubliable.</h1>
              <p className="hero-text">
                Explorez une selection de prestataires raffines, composez une experience
                romantique et donnez a votre grand jour un rendu elegant, fluide et memorablement
                moderne.
              </p>

              <div className="hero-highlights">
                {heroHighlights.map((item, index) => (
                  <span
                    key={item}
                    className={`hero-highlight reveal reveal-delay-${index + 1} ${isVisible("hero-main")}`}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <aside className={`hero-editorial reveal ${isVisible("hero-main")}`} data-reveal-id="hero-main">
              <div className="hero-editorial-card mini-card">
                <span className="mini-card-label">Wedding mood</span>
                <p>
                  Des inspirations douces, un rythme plus fluide et une interface pensee comme une
                  vraie landing page luxe.
                </p>
              </div>
            </aside>
          </div>

          <div
            className={`hero-search-wrap reveal reveal-delay-2 ${isVisible("hero-search")}`}
            data-reveal-id="hero-search"
          >
            <div className="hero-search-intro">
              <span className="section-kicker">Recherche inspiree</span>
              <h2>Trouvez vos prestataires en quelques instants</h2>
            </div>

            <div className="search-box">
              <div className="search-field">
                <label htmlFor="city">Ville</label>
                <select id="city" aria-label="Ville">
                  <option>Ville</option>
                  <option>Tunis</option>
                  <option>Sousse</option>
                  <option>Sfax</option>
                  <option>Monastir</option>
                </select>
              </div>

              <div className="search-field">
                <label htmlFor="budget">Budget</label>
                <select id="budget" aria-label="Budget">
                  <option>Budget</option>
                  <option>Moins de 1000 TND</option>
                  <option>1000 - 3000 TND</option>
                  <option>3000 - 5000 TND</option>
                  <option>Plus de 5000 TND</option>
                </select>
              </div>

              <div className="search-field">
                <label htmlFor="service-type">Type de service</label>
                <select id="service-type" aria-label="Type de service">
                  <option>Type de service</option>
                  <option>Photographe</option>
                  <option>Salle</option>
                  <option>Traiteur</option>
                  <option>Decoration</option>
                </select>
              </div>

              <button type="button" className="search-action">
                Rechercher
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section featured-section">
        <div className="home-shell">
          <div
            className={`section-heading reveal ${isVisible("featured-heading")}`}
            data-reveal-id="featured-heading"
          >
            <span className="section-kicker">Prestataires a la une</span>
            <h2>Une marketplace pensee comme une selection couture</h2>
            <p>
              Des cartes plus editoriales, plus riches et plus luxueuses pour valoriser chaque
              prestation avec une vraie presence visuelle.
            </p>
          </div>

          <PremiumCarousel services={featuredServices} />
        </div>
      </section>

      <section className="home-section process-section">
        <div className="home-shell">
          <div
            className={`section-heading reveal ${isVisible("process-heading")}`}
            data-reveal-id="process-heading"
          >
            <span className="section-kicker">Comment ca marche</span>
            <h2>Un parcours plus visuel, plus rassurant et plus vivant</h2>
            <p>
              Chaque etape est mise en scene comme un bloc fort pour guider l'utilisateur avec
              clarte et sophistication.
            </p>
          </div>

          <div className="process-grid">
            {steps.map((step, index) => (
              <article
                key={step.id}
                className={`process-card reveal ${isVisible(`step-${step.id}`)}`}
                data-reveal-id={`step-${step.id}`}
                style={{ transitionDelay: `${index * 140}ms` }}
              >
                <div className="process-header">
                  <span className="process-number">0{step.id}</span>
                  <span className="process-label">{step.label}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section cta-section">
        <div className={`home-shell cta-shell reveal ${isVisible("cta-section")}`} data-reveal-id="cta-section">
          <div className="cta-panel">
            <div className="cta-copy">
              <span className="section-kicker section-kicker-light">Grand jour, grande allure</span>
              <h2>Transformez vos idees en une celebration elegante et parfaitement rythmee.</h2>
              <p>
                Lancez votre recherche, composez votre selection et donnez a votre mariage une
                signature plus premium des le premier clic.
              </p>
            </div>

            <div className="cta-actions">
              <button type="button" className="cta-primary" onClick={() => navigate("/signup")}>
                Commencer maintenant
              </button>
              <span className="cta-note">
                Des centaines d'inspirations pour une experience plus douce et plus exclusive.
              </span>
            </div>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <div className="footer-glow" />
        <div className="home-shell footer-shell">
          <div className="footer-brand">
            <span className="footer-mark">3A</span>
            <div>
              <h3>3arrasli.tn</h3>
              <p>
                Votre marketplace mariage en Tunisie, imaginee pour les couples a la recherche
                d'une experience plus chic, plus contemporaine et plus rassurante.
              </p>
            </div>
          </div>

          <div className="footer-links">
            {footerLinks.map((link) => (
              <a key={link} href="#!">
                {link}
              </a>
            ))}
          </div>

          <div className="footer-socials">
            <a href="#!" aria-label="Facebook">
              Fb
            </a>
            <a href="#!" aria-label="Instagram">
              Ig
            </a>
            <a href="#!" aria-label="TikTok">
              Tk
            </a>
          </div>
        </div>
        <p className="footer-copy">(c) {new Date().getFullYear()} 3arrasli.tn - Tous droits reserves</p>
      </footer>
    </div>
  );
};

export default Home;
