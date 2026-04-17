import React from "react";

const DaySummaryCard = ({ label, value, tone }) => {
  return (
    <article className={`provider-day-stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
};

export default DaySummaryCard;
