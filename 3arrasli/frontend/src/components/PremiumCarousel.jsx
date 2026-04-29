import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStoredUser } from "../services/auth";
import ServiceCard from "./ServiceCard";

const FREE_CARDS_COUNT = 3;

const getVisibleCount = () => {
  if (typeof window === "undefined") {
    return 3;
  }

  if (window.innerWidth <= 900) {
    return 1;
  }
  if (window.innerWidth <= 1240) {
    return 2;
  }
  return 3;
};

const PremiumCarousel = ({ services }) => {
  const navigate = useNavigate();
  const [startIndex, setStartIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(getVisibleCount);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const syncAuthState = () => {
      setIsAuthenticated(Boolean(getStoredUser()));
    };

    syncAuthState();
    window.addEventListener("storage", syncAuthState);
    return () => window.removeEventListener("storage", syncAuthState);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setVisibleCount(getVisibleCount());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const maxStartIndex = useMemo(
    () => Math.max(services.length - visibleCount, 0),
    [services.length, visibleCount]
  );

  const freeMaxStartIndex = useMemo(() => {
    const maxFreeCards = Math.min(FREE_CARDS_COUNT, services.length);
    return Math.max(maxFreeCards - visibleCount, 0);
  }, [services.length, visibleCount]);

  useEffect(() => {
    setStartIndex((prev) => Math.min(prev, maxStartIndex));
  }, [maxStartIndex]);

  const canGoPrev = startIndex > 0;
  const canGoNext = startIndex < maxStartIndex;

  const goToIndex = (nextIndex) => {
    const boundedIndex = Math.max(0, Math.min(nextIndex, maxStartIndex));

    if (!isAuthenticated && boundedIndex > freeMaxStartIndex) {
      navigate("/login");
      return;
    }

    setStartIndex(boundedIndex);
  };

  const handlePrev = () => goToIndex(startIndex - 1);
  const handleNext = () => goToIndex(startIndex + 1);

  const totalPages = maxStartIndex + 1;
  const trackOffset = (startIndex * 100) / visibleCount;

  return (
    <div className="premium-carousel">
      <div className="premium-carousel-viewport">
        <button
          type="button"
          className="carousel-arrow carousel-arrow-prev"
          onClick={handlePrev}
          disabled={!canGoPrev}
          aria-label="Precedent"
        >
          &#10094;
        </button>
        <div
          className="premium-carousel-track"
          style={{ transform: `translate3d(-${trackOffset}%, 0, 0)` }}
        >
          {services.map((service) => (
            <div
              key={service.id}
              className="premium-carousel-slide"
              style={{
                flex: `0 0 ${100 / visibleCount}%`,
                minWidth: `${100 / visibleCount}%`,
              }}
            >
              <ServiceCard service={service} />
            </div>
          ))}
        </div>
        <button
          type="button"
          className="carousel-arrow carousel-arrow-next"
          onClick={handleNext}
          disabled={!canGoNext}
          aria-label="Suivant"
        >
          &#10095;
        </button>
      </div>

      <div className="premium-carousel-dots" role="tablist" aria-label="Pagination services">
        {Array.from({ length: totalPages }).map((_, pageIndex) => (
          <button
            key={pageIndex}
            type="button"
            className={`carousel-dot ${pageIndex === startIndex ? "is-active" : ""}`}
            onClick={() => goToIndex(pageIndex)}
            aria-label={`Aller a la page ${pageIndex + 1}`}
            aria-selected={pageIndex === startIndex}
          />
        ))}
      </div>
    </div>
  );
};

export default PremiumCarousel;
