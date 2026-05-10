import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("dp_token");
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("dp_token");
      localStorage.removeItem("dp_user_id");
      localStorage.removeItem("dp_org_id");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);
