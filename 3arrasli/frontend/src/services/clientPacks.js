import api from "./api";

export const getClientPacks = async () => {
  const response = await api.get("/api/client/packs");
  return response.data;
};

export const reserveClientPack = async (packId, payload) => {
  const response = await api.post(`/api/client/packs/${packId}/reserve`, payload);
  return response.data;
};

export const getClientStripeConfig = async () => {
  const response = await api.get("/api/client/stripe-config");
  return response.data;
};
