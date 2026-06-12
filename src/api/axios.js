import axios from "axios";

const AUTH_TOKEN_KEY = "kab_auth_token";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS || 30000)
});

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      window.localStorage.removeItem("kab_auth_user");
    }

    return Promise.reject(error);
  }
);

export default api;
