import api from "./api";

export const getProviderBookings = async (params = {}) => {
  const response = await api.get("/api/provider/bookings", { params });
  return response.data;
};

export const getProviderBooking = async (bookingId) => {
  const response = await api.get(`/api/provider/bookings/${bookingId}`);
  return response.data;
};
