import api from "./api";

export const getClientPacks = async () => {
  const response = await api.get("/api/client/packs");
  return response.data;
};
