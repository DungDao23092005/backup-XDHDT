// src/api/notificationApi.js
import axiosClient from "./axiosClient";

const NOTI_PREFIX = process.env.REACT_APP_NOTIFICATION_PREFIX || "/notification";

axiosClient.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken");

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const notificationApi = {
  getMyInbox: async () => {
    const res = await axiosClient.get(`${NOTI_PREFIX}/api/notifications/me`);
    return res?.data ?? res;
  },

  markRead: async (id) => {
    const res = await axiosClient.put(`${NOTI_PREFIX}/api/notifications/${id}/read`);
    return res?.data ?? res;
  },
  getUnreadCount: async () => {
    const items = await notificationApi.getMyInbox();
    return Array.isArray(items) ? items.filter((x) => !x.is_read).length : 0;
  },
};

export default notificationApi;
