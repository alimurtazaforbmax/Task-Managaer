import axios from "axios";
import type { ApiResponse } from "../types";
import { API_BASE_URL } from "./config";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post<ApiResponse<{ access: string }>>(
            `${API_BASE_URL}/auth/refresh/`,
            { refresh }
          );
          if (data.success && data.data.access) {
            localStorage.setItem("access_token", data.data.access);
            original.headers.Authorization = `Bearer ${data.data.access}`;
            return api(original);
          }
        } catch {
          localStorage.clear();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export function unwrap<T>(response: { data: ApiResponse<T> }): T {
  return response.data.data;
}

export default api;
