import axios from "axios";
import { clearStoredUser, getStoredToken } from "./auth";

const runtimeHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
const runtimeProtocol = typeof window !== "undefined" ? window.location.protocol : "http:";
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${runtimeProtocol}//${runtimeHost}:5000`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredUser();
    }
    return Promise.reject(error);
  }
);

export default api;
