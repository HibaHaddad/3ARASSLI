import api from "./api";

export const getAdminPacks = async () => {
  const response = await api.get("/api/admin/packs");
  return response.data;
};

export const createAdminPack = async (payload) => {
  const response = await api.post("/api/admin/packs", payload);
  return response.data;
};

export const updateAdminPack = async (packId, payload) => {
  const response = await api.put(`/api/admin/packs/${packId}`, payload);
  return response.data;
};

export const replaceAdminPackProvider = async (packId, itemId, payload) => {
  const response = await api.patch(`/api/admin/packs/${packId}/items/${itemId}/replace`, payload);
  return response.data;
};
