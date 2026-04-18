import api from "./api";

export const getProviderProfile = async () => {
  const response = await api.get("/api/provider/profile");
  return response.data;
};

export const updateProviderProfile = async (payload) => {
  const response = await api.put("/api/provider/profile", payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};
