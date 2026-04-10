import axios from "axios";

const api = axios.create({
  baseURL: "/api",          // ✅ REQUIRED
  withCredentials: true,    // ✅ for auth
});

export default api;