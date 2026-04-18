import { API_BASE_URL } from "./api";

export const resolveAssetUrl = (path) => {
  const value = String(path || "").trim();

  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${API_BASE_URL}/${value.replace(/^\/+/, "")}`;
};
