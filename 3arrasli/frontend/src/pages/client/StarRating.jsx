import React from "react";

const StarRating = ({ value = 0, onChange, size = "md", readOnly = false }) => {
  const className = `client-star-rating ${size} ${readOnly ? "readonly" : ""}`.trim();

  return (
    <div className={className} aria-label={`Note ${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={star <= value ? "active" : ""}
          onClick={() => onChange?.(star)}
          disabled={readOnly}
          aria-label={`${star} etoile${star > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
};

export default StarRating;
