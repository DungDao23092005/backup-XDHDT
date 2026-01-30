// Gắn Token tự động và xử lý lỗi chung về đăng nhập
import axios from 'axios';
import { getToken, removeToken } from '../utils/auth';
import { extractErrorMessage } from "../utils/errorUtils";

const axiosClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://127.0.0.1:8080',
});


axiosClient.interceptors.request.use(
  (config) => {
    const token = getToken();

    console.log(`🚀 Request to: ${(config.baseURL || '')}${config.url || ''}`);

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
      console.log("🔑 Token attached: YES");
    } else {
      console.log("🔑 Token attached: NO");
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response?.data ?? response,
  (error) => {
    const { response } = error;

    error.userMessage = extractErrorMessage(error);

    if (response && response.status === 401) {
      console.error("⛔ 401: Token hết hạn/không hợp lệ → logout");
      removeToken();

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
