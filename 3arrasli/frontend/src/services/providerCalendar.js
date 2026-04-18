import api from "./api";

export const getProviderCalendar = async (params) => {
  const response = await api.get("/api/provider/calendar", { params });
  return response.data;
};

export const generateProviderCalendar = async (payload) => {
  const response = await api.post("/api/provider/calendar/generate", payload);
  return response.data;
};

export const toggleProviderCalendarSlot = async (slotId) => {
  const response = await api.patch(`/api/provider/calendar/slots/${slotId}/toggle`);
  return response.data;
};

export const occupyProviderCalendarDay = async (date) => {
  const response = await api.patch(`/api/provider/calendar/days/${date}/occupy`);
  return response.data;
};

export const freeProviderCalendarDay = async (date) => {
  const response = await api.patch(`/api/provider/calendar/days/${date}/free`);
  return response.data;
};
