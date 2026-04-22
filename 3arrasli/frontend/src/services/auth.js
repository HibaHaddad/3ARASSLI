const STORAGE_KEY = "arrasli_auth_session";

export const ROLE_ROUTES = {
  Client: "/client",
  Admin: "/admin",
  Prestataire: "/prestataire",
};

const normalizeRole = (value) => {
  const role = String(value || "").trim().toLowerCase();
  if (role === "admin") return "Admin";
  if (role === "prestataire") return "Prestataire";
  if (role === "client") return "Client";
  return "";
};

export const getStoredSession = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

export const getStoredUser = () => getStoredSession()?.user || null;
export const getStoredToken = () => getStoredSession()?.token || "";

export const saveStoredUser = (payload) => {
  if (payload?.user && payload?.token !== undefined) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      user: payload || null,
      token: "",
    })
  );
};

export const clearStoredUser = () => {
  window.localStorage.removeItem(STORAGE_KEY);
};

export const hasRole = (user, role) => normalizeRole(user?.role) === normalizeRole(role);

export const getDashboardPathForUser = (user) => ROLE_ROUTES[normalizeRole(user?.role)] || "/";
