import axios from "axios";
import {
  AUTH_TOKEN_KEY,
  clearSession
} from "../utils/auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS || 30000)
});

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  const isAuthenticationRequest = ["/auth/login", "/auth/bootstrap"].some(
    (path) => String(config.url || "").includes(path)
  );

  if (token && !isAuthenticationRequest) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error?.response?.status === 401 &&
      window.localStorage.getItem(AUTH_TOKEN_KEY)
    ) {
      clearSession();
    }

    return Promise.reject(error);
  }
);

export default api;
