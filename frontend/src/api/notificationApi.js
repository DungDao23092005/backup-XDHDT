import axiosClient from "./axiosClient";

// Prefix URL cho Notification Service (thường là /notification nếu qua Gateway)
const NOTI_PREFIX = process.env.REACT_APP_NOTIFICATION_PREFIX || "/notification";

// (Tùy chọn) Interceptor để đảm bảo luôn gửi kèm Token
// Nếu axiosClient gốc đã có logic này thì bạn có thể bỏ đoạn này đi để tránh trùng lặp.
axiosClient.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken");

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const notificationApi = {
  // --- 1. Inbox (Hộp thư thông báo) ---
  getMyInbox: async () => {
    const res = await axiosClient.get(`${NOTI_PREFIX}/api/notifications/me`);
    return res?.data ?? res;
  },

  markRead: async (id) => {
    const res = await axiosClient.put(`${NOTI_PREFIX}/api/notifications/${id}/read`);
    return res?.data ?? res;
  },



  

  getUnreadCount: async () => {
    try {
      const items = await notificationApi.getMyInbox();
      return Array.isArray(items) ? items.filter((x) => !x.is_read).length : 0;
    } catch (error) {
      console.error("Error fetching unread count:", error);
      return 0;
    }
  },


  // ✅ prefs
  getMyPrefs: async () => {
    const res = await axiosClient.get(`${NOTI_PREFIX}/api/notifications/prefs/me`);
    return res?.data ?? res;
  },

  updateMyPrefs: async (payload) => {
    const res = await axiosClient.put(`${NOTI_PREFIX}/api/notifications/prefs/me`, payload);
    return res?.data ?? res;
  },

  // --- 3. [MỚI] FCM Device (Web Push) ---
  
  // Gửi Token FCM lên server để đăng ký nhận thông báo
  registerDevice: (fcmToken) => {
    return axiosClient.post(`${NOTI_PREFIX}/api/notifications/devices/register`, {
      fcm_token: fcmToken,
      device_type: "web"
    });
  },
  
  // Xóa Token khi user đăng xuất để tránh gửi nhầm
  unregisterDevice: (fcmToken) => {
    return axiosClient.delete(`${NOTI_PREFIX}/api/notifications/devices/unregister`, {
        params: { token: fcmToken } 
    });
  }
};

export default notificationApi;
