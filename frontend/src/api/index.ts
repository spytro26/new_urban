import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Don't redirect for auth endpoints – let the component show the error toast
      const url = err.config?.url || "";
      if (!url.includes("/auth/")) {
        const role = localStorage.getItem("role");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        window.location.href = role === "ADMIN" ? "/admin/login" : "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
