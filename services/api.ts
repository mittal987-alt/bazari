import axios from "axios";

const api = axios.create({
  baseURL: "/api",          // 👈 IMPORTANT
  withCredentials: true,   // 👈 REQUIRED for JWT cookie
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: global error logging
api.interceptors.response.use(
  (res) => res,
  (error) => {
    console.error("API ERROR:", error?.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
