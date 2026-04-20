import api from "./api";

export const getProviderChats = async () => {
  const response = await api.get("/api/provider/chats");
  return response.data;
};

export const getProviderChat = async (chatId) => {
  const response = await api.get(`/api/provider/chats/${chatId}`);
  return response.data;
};

export const sendProviderChatMessage = async (chatId, content) => {
  const response = await api.post(`/api/provider/chats/${chatId}/messages`, { content });
  return response.data;
};

export const markProviderChatRead = async (chatId) => {
  const response = await api.patch(`/api/provider/chats/${chatId}/read`);
  return response.data;
};
