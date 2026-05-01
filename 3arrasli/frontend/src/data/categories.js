export const serviceCategories = [
  { value: "Photographe", label: "Photographe" },
  { value: "Decoration", label: "Decoration" },
  { value: "Traiteur", label: "Traiteur" },
  { value: "Salle", label: "Salle" },
  { value: "Beaute & preparation", label: "Beaute & preparation" },
  { value: "Tenues & accessoires", label: "Tenues & accessoires" },
  { value: "Animation & ambiance", label: "Animation & ambiance" },
  { value: "Medias & souvenirs", label: "Medias & souvenirs" },
  { value: "Logistique & transport", label: "Logistique & transport" },
  { value: "Gastronomie & extras", label: "Gastronomie & extras" },
];

export const normalizeServiceCategoryKey = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s&-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export const mergeServiceCategoryOptions = (categories) => {
  const seen = new Set();

  return (categories || []).reduce((accumulator, category) => {
    const label = typeof category === "string" ? category : category?.label || category?.value || "";
    const value = typeof category === "string" ? category : category?.value || category?.label || "";
    const normalizedKey = normalizeServiceCategoryKey(value);

    if (!normalizedKey || seen.has(normalizedKey)) {
      return accumulator;
    }

    seen.add(normalizedKey);
    accumulator.push({ value: String(value).trim(), label: String(label).trim() });
    return accumulator;
  }, []);
};
