import api from "./api";

export const getProviderServices = async () => {
  const response = await api.get("/api/provider/services");
  return response.data;
};

export const createProviderService = async (payload) => {
  const response = await api.post("/api/provider/services", payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const updateProviderService = async (serviceId, payload) => {
  const response = await api.put(`/api/provider/services/${serviceId}`, payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const deleteProviderService = async (serviceId) => {
  const response = await api.delete(`/api/provider/services/${serviceId}`);
  return response.data;
};
