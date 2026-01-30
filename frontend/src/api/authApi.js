// frontend/src/api/authApi.js
import axiosClient from "./axiosClient";

const authApi = {
  
  login: (data) => {
    return axiosClient.post("/identity/api/auth/login", data);
  },

  // --- BỔ SUNG HÀM NÀY ĐỂ LOGIN GOOGLE ---
  loginWithFirebase: (firebaseToken) => {
    // Gửi token của Firebase lên backend để đổi lấy token của hệ thống
    return axiosClient.post("/identity/api/auth/login/firebase", { token: firebaseToken });
  },
  // --------------------------------------

  register: (data) => {
    return axiosClient.post("/identity/api/auth/register", data);
  },

  getMe: () => {
    return axiosClient.get("/identity/api/users/me");
  },

  forgotPassword: (email) => {
    return axiosClient.post("/identity/api/auth/forgot-password", { email });
  },

  verifyOtp: (data) => {
    return axiosClient.post("/identity/api/auth/verify-otp", data);
  },

  resetPassword: (data) => {
    return axiosClient.post("/identity/api/auth/reset-password", data);
  },
};

export default authApi;