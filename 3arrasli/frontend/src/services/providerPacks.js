import api from "./api";

export const getProviderPacks = async () => {
  const response = await api.get("/api/provider/packs");
  return response.data;
};

export const getProviderPack = async (packId) => {
  const response = await api.get(`/api/provider/packs/${packId}`);
  return response.data;
};

export const respondProviderPack = async (packId, decision) => {
  const response = await api.patch(`/api/provider/packs/${packId}/respond`, { decision });
  return response.data;
};
