import React from "react";

const BookingItem = ({ booking, onClick }) => {
  return (
    <div className="provider-booking-simple">
      <div className="provider-booking-simple-icon">📅</div>
      <div className="provider-booking-simple-content">
        <strong>{booking.client}</strong>
        <p>{booking.service}</p>
        <small>
          {new Date(booking.date).toLocaleDateString("fr-FR")} - {booking.location}
        </small>
      </div>
      <button type="button" className="provider-link-btn" onClick={onClick}>
        Voir
      </button>
    </div>
  );
};

export default BookingItem;
