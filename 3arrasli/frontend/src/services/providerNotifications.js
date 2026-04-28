import api from "./api";

export const getProviderNotifications = async () => {
  const response = await api.get("/api/provider/notifications");
  return response.data;
};

export const markProviderNotificationRead = async (notificationId) => {
  const response = await api.patch(`/api/provider/notifications/${notificationId}/read`);
  return response.data;
};
