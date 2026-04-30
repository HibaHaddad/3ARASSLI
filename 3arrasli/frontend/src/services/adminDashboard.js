import api from "./api";

export const getAdminContracts = async () => {
  const response = await api.get("/api/admin/contracts");
  return response.data;
};

export const getAdminAppointments = async () => {
  const response = await api.get("/api/admin/appointments");
  return response.data;
};

export const getAdminInvoices = async () => {
  const response = await api.get("/api/admin/invoices");
  return response.data;
};

export const getAdminServices = async () => {
  const response = await api.get("/api/admin/services");
  return response.data;
};

export const updateAdminService = async (serviceId, payload) => {
  const response = await api.patch(`/api/admin/services/${serviceId}`, payload);
  return response.data;
};

export const getAdminReviews = async () => {
  const response = await api.get("/api/admin/reviews");
  return response.data;
};

export const updateAdminReview = async (reviewId, payload) => {
  const response = await api.patch(`/api/admin/reviews/${reviewId}`, payload);
  return response.data;
};

export const deleteAdminReview = async (reviewId) => {
  const response = await api.delete(`/api/admin/reviews/${reviewId}`);
  return response.data;
};

export const getAdminChats = async () => {
  const response = await api.get("/api/admin/chats");
  return response.data;
};

export const getAdminNotifications = async () => {
  const response = await api.get("/api/admin/notifications");
  return response.data;
};

export const markAdminNotificationRead = async (notificationId) => {
  const response = await api.patch(`/api/admin/notifications/${notificationId}/read`);
  return response.data;
};
