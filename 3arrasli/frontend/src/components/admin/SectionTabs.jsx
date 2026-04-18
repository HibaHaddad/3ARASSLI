import React from "react";

const SectionTabs = ({ sections, activeSection, onSectionChange }) => {
  return (
    <nav className="admin-tabs" aria-label="Navigation des sections admin">
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          className={`provider-filter-chip ${activeSection === section.id ? "active" : ""}`}
          onClick={() => onSectionChange(section.id)}
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
};

export default SectionTabs;
