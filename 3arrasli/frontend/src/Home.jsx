import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import PremiumCarousel from "./components/PremiumCarousel";
import api from "./services/api";
import "./Home.css";

const footerLinks = [
  { label: "A propos", to: "/a-propos" },
  { label: "Contact", to: "/contact" },
  { label: "FAQ", to: "/faq" },
  { label: "Conditions", to: "/conditions" },
];

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
  const [featuredServices, setFeaturedServices] = useState([]);
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

  useEffect(() => {
    const loadTopRatedServices = async () => {
      try {
        const response = await api.get("/api/public/services");
        const services = Array.isArray(response.data?.services) ? response.data.services : [];
        const topRated = services
          .slice()
          .sort((a, b) => Number(b?.rating || 0) - Number(a?.rating || 0))
          .slice(0, 8)
          .map((service) => ({
            id: service.id,
            title: `${service.prestataire_name || service.provider_name || "Prestataire"} - ${service.title || "Service"}`,
            price: `A partir de ${Number(service.price || 0).toFixed(0)} TND`,
            rating: Number(service.rating || 0).toFixed(1),
            image: service.image,
          }));

        if (topRated.length > 0) {
          setFeaturedServices(topRated);
        }
      } catch {
        setFeaturedServices([]);
      }
    };

    loadTopRatedServices();
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
                romantique et donnez à votre grand jour un rendu elegant, fluide et memorablement
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
                  Des inspirations douces, un rythme plus fluide et une interface pensée comme une
                  vraie landing page luxe.
                </p>
              </div>
            </aside>
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
          </div>

          {featuredServices.length > 0 ? (
            <PremiumCarousel services={featuredServices} />
          ) : (
            <p style={{ textAlign: "center", color: "rgba(77, 46, 57, 0.72)" }}>
              Aucun service disponible pour le moment.
            </p>
          )}
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
              Chaque étape est mise en scene comme un bloc fort pour guider l'utilisateur avec
              clarté et sophistication.
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
              <h2>Transformez vos idées en une célébration elegante et parfaitement rythmée.</h2>
              <p>
                Lancez votre recherche, composez votre sélection et donnez à votre mariage une
                signature plus premium dés le premier clic.
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
              <h3>3arrasli</h3>
              <p>
                Votre marketplace mariage en Tunisie, imaginée pour les couples à la recherche
                d'une experience plus chic, plus contemporaine et plus rassurante.
              </p>
            </div>
          </div>

          <div className="footer-links">
            {footerLinks.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
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
        <p className="footer-copy">(c) {new Date().getFullYear()} 3arrasli - Tous droits reserves</p>
      </footer>
    </div>
  );
};

export default Home;
