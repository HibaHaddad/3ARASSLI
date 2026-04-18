import api from "./api";

export const getProviderCalendarWeek = async (start) => {
  const response = await api.get("/api/provider/calendar/week", {
    params: { start },
  });
  return response.data;
};

export const occupyProviderCalendarWeekSlot = async (payload) => {
  const response = await api.post("/api/provider/calendar/week/occupy", payload);
  return response.data;
};

export const deleteProviderCalendarBlock = async (blockId) => {
  const response = await api.delete(`/api/provider/calendar/blocks/${blockId}`);
  return response.data;
};
