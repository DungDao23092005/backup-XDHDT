import axiosClient from "./axiosClient";

const authApi = {
  // [FIX] Sửa để nhận vào 1 object data = { email, password }
  login: (data) => {
    return axiosClient.post("/identity/api/auth/login", data);
  },

  register: (data) => {
    return axiosClient.post("/identity/api/auth/register", data);
  },

  getMe: () => {
    return axiosClient.get("/identity/api/auth/me");
  },
};

export default authApi;