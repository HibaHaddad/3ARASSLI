export const validateServiceForm = (values, options = {}) => {
  const { imageFile = null, hasExistingImage = false } = options;
  const errors = {};

  if (!String(values.title || "").trim()) {
    errors.title = "Le titre est obligatoire.";
  }

  if (!String(values.price || "").trim()) {
    errors.price = "Le prix est obligatoire.";
  } else if (Number(values.price) <= 0 || Number.isNaN(Number(values.price))) {
    errors.price = "Le prix doit etre un nombre positif.";
  }

  if (!String(values.category || "").trim()) {
    errors.category = "La categorie est obligatoire.";
  }

  if (!imageFile && !hasExistingImage) {
    errors.image = "L'image est obligatoire.";
  }

  if (!String(values.description || "").trim()) {
    errors.description = "La description est obligatoire.";
  }

  return errors;
};
