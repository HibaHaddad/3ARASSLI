export const emptyFilters = {
  q: "",
  city: "",
  budget: "",
  min_price: "",
  max_price: "",
  type: "",
};

export const budgetMap = {
  less1000: { min: "", max: "1000" },
  from1000to3000: { min: "1000", max: "3000" },
  from3000to5000: { min: "3000", max: "5000" },
  plus5000: { min: "5000", max: "" },
};

export const serviceTypes = [
  { value: "photographer", label: "Photographe" },
  { value: "salle", label: "Salle" },
  { value: "traiteur", label: "Traiteur" },
  { value: "decoration", label: "Decoration" },
];

export const cities = ["Tunis", "Sousse", "Sfax", "Monastir"];

export const buildServiceParams = (filters) => {
  const params = { ...filters };
  const selectedBudget = budgetMap[filters.budget];

  if (selectedBudget) {
    params.min_price = selectedBudget.min;
    params.max_price = selectedBudget.max;
  }

  delete params.budget;
  return params;
};

export const getFiltersFromSearch = (searchParams) => ({
  q: searchParams.get("q") || "",
  city: searchParams.get("city") || "",
  budget: searchParams.get("budget") || "",
  min_price: "",
  max_price: "",
  type: searchParams.get("type") || "",
});

export const toSearchQuery = (filters) => {
  const next = new URLSearchParams();

  ["q", "city", "budget", "type"].forEach((key) => {
    if (filters[key]) {
      next.set(key, filters[key]);
    }
  });

  return next.toString();
};
